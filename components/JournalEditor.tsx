"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { JournalImage } from "@/lib/extensions/JournalImage";
import {
  fileToDataUrl,
  isSafeImage,
  MAX_EDITOR_IMAGE_BYTES,
} from "@/lib/media";
import { EditorToolbar } from "./EditorToolbar";

async function insertImageAt(view: EditorView, file: File, pos: number) {
  if (!(await isSafeImage(file, MAX_EDITOR_IMAGE_BYTES))) {
    window.alert("Choose a JPG, PNG, or WebP image under 10 MB.");
    return;
  }
  const src = await fileToDataUrl(file);
  const schema = view.state.schema;
  const node = schema.nodes.image.create({ src });
  view.dispatch(view.state.tr.replaceWith(pos, pos, node));
  view.focus();
}

const PasteImage = Extension.create({
  name: "pasteImage",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            paste(view, event) {
              const files = Array.from(
                (event as ClipboardEvent).clipboardData?.files ?? []
              );
              const file = files.find((f) => f.type.startsWith("image/"));
              if (!file) return false;
              event.preventDefault();
              void insertImageAt(view, file, view.state.selection.from);
              return true;
            },
          },
        },
      }),
    ];
  },
});

export function JournalEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      JournalImage.configure({ allowBase64: true, inline: true }),
      Placeholder.configure({
        placeholder:
          "Write here before the day ends — what did you learn today? ✍️",
      }),
      PasteImage,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  function draggedImageFile(e: React.DragEvent): File | null {
    const files = Array.from(e.dataTransfer?.files ?? []);
    return files.find((f) => f.type.startsWith("image/")) ?? null;
  }

  function handleDrop(e: React.DragEvent) {
    const file = draggedImageFile(e);
    if (!file || !editor) return;
    e.preventDefault();
    setDragOver(false);
    const coords = editor.view.posAtCoords({
      left: e.clientX,
      top: e.clientY,
    });
    const pos = coords?.pos ?? editor.state.selection.from;
    void insertImageAt(editor.view, file, pos);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOver(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    if (!(await isSafeImage(file, MAX_EDITOR_IMAGE_BYTES))) {
      window.alert("Choose a JPG, PNG, or WebP image under 10 MB.");
      return;
    }
    try {
      const src = await fileToDataUrl(file);
      editor.chain().focus().setImage({ src }).run();
    } catch {
      window.alert("That image could not be loaded.");
    }
  }

  return (
    <div
      className={`space-y-3 rounded-xl transition-colors ${
        dragOver
          ? "bg-paper-200/50 ring-2 ring-clay-600/40"
          : ""
      }`}
      onDragEnter={(e) => {
        if (draggedImageFile(e)) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragOver={(e) => {
        if (draggedImageFile(e)) e.preventDefault();
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <EditorToolbar
        editor={editor}
        onInsertImage={() => fileRef.current?.click()}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}