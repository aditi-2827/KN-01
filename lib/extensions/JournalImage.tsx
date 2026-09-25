"use client";

import { useRef, useState } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import Image from "@tiptap/extension-image";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";

const MIN_W = 48;

type Align = "none" | "left" | "right" | "center";

function JournalImageNode(props: NodeViewProps) {
  const { node, selected, updateAttributes, getPos, editor } = props;
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const align = (node.attrs.align as Align) ?? "none";
  const width = liveWidth ?? (node.attrs.width as number | null);

  function startResize(e: React.PointerEvent) {
    if (!e.currentTarget.setPointerCapture) return;
    const img = imgRef.current;
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth =
      (node.attrs.width as number | null) ?? img.getBoundingClientRect().width;
    const container = img.closest(".tiptap");
    const maxWidth = Math.max(
      MIN_W + 1,
      ((container as HTMLElement | null)?.clientWidth ?? 800) - 8
    );

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const next = Math.round(
        Math.max(MIN_W, Math.min(maxWidth, startWidth + ev.clientX - startX))
      );
      setLiveWidth(next);
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      setDragging(false);
      const next = Math.max(
        MIN_W,
        Math.min(maxWidth, startWidth + ev.clientX - startX)
      );
      setLiveWidth(null);
      updateAttributes({ width: Math.round(next) });
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  }

  const alignBtn = (value: Align) => (
    <button
      type="button"
      title={`Align ${value === "center" ? "center" : `wrap ${value}`}`}
      className={align === value ? "ji-active" : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        updateAttributes({ align: value });
      }}
    >
      {value === "left" ? (
        <AlignLeft size={13} style={{ pointerEvents: "none" }} />
      ) : value === "center" ? (
        <AlignCenter size={13} style={{ pointerEvents: "none" }} />
      ) : (
        <AlignRight size={13} style={{ pointerEvents: "none" }} />
      )}
    </button>
  );

  return (
    <NodeViewWrapper
      as="span"
      className="journal-image"
      data-align={align}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={node.attrs.src as string}
        alt={(node.attrs.alt as string | null) ?? ""}
        width={width ?? undefined}
        style={width ? { width: `${width}px`, height: "auto" } : undefined}
      />
      {selected && (
        <>
          <span
            className="ji-controls"
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
          >
            {alignBtn("left")}
            {alignBtn("center")}
            {alignBtn("right")}
            <span className="ji-sep" />
            <button
              type="button"
              title="Remove image"
              className="ji-danger"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const view = editor.view;
                const pos = getPos();
                if (typeof pos === "number") {
                  view.dispatch(
                    view.state.tr.delete(pos, pos + node.nodeSize)
                  );
                }
                view.focus();
              }}
            >
              <Trash2 size={13} style={{ pointerEvents: "none" }} />
            </button>
          </span>
          <span
            className="ji-resize"
            contentEditable={false}
            onPointerDown={startResize}
            style={{ cursor: dragging ? "se-resize" : undefined }}
          />
        </>
      )}
    </NodeViewWrapper>
  );
}

export const JournalImage = Image.extend({
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const style = el.getAttribute("style") ?? "";
          const m = style.match(/width:\s*(\d+(?:\.\d+)?)px/);
          if (m) return parseFloat(m[1]);
          const w = el.getAttribute("width");
          return w ? parseFloat(w) : null;
        },
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}px` } : {},
      },
      align: {
        default: "none",
        parseHTML: (el) => (el as HTMLElement).dataset.align ?? "none",
        renderHTML: (attrs) =>
          attrs.align && attrs.align !== "none"
            ? { "data-align": attrs.align }
            : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(JournalImageNode);
  },
});