"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

function ToolBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        active
          ? "flex h-9 min-w-9 items-center justify-center rounded-lg bg-clay-600 text-onaccent transition-colors"
          : "flex h-9 min-w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-paper-200 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-paper-300" />;
}

export function EditorToolbar({
  editor,
  onInsertImage,
}: {
  editor: Editor | null;
  onInsertImage: () => void;
}) {
  const bold = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("bold"),
  });
  const italic = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("italic"),
  });
  const underline = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("underline"),
  });
  const strike = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("strike"),
  });
  const h1 = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("heading", { level: 1 }),
  });
  const h2 = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("heading", { level: 2 }),
  });
  const h3 = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("heading", { level: 3 }),
  });
  const bullet = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("bulletList"),
  });
  const ordered = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("orderedList"),
  });
  const quote = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("blockquote"),
  });
  const codeBlock = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("codeBlock"),
  });
  const highlight = useEditorState({
    editor,
    selector: ({ editor: e }) => !!e && e.isActive("highlight"),
  });

  if (!editor) {
    return (
      <div className="h-11 shrink-0 rounded-xl border border-paper-300 bg-paper-100" />
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-xl border border-paper-300 bg-paper-100 px-1.5 py-1">
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={17} />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={17} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        title="Bold (Ctrl+B)"
        active={!!bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={17} />
      </ToolBtn>
      <ToolBtn
        title="Italic (Ctrl+I)"
        active={!!italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={17} />
      </ToolBtn>
      <ToolBtn
        title="Underline (Ctrl+U)"
        active={!!underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={17} />
      </ToolBtn>
      <ToolBtn
        title="Strikethrough"
        active={!!strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={17} />
      </ToolBtn>
      <ToolBtn
        title="Highlight"
        active={!!highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={17} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        title="Heading 1"
        active={!!h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={17} />
      </ToolBtn>
      <ToolBtn
        title="Heading 2"
        active={!!h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={17} />
      </ToolBtn>
      <ToolBtn
        title="Heading 3"
        active={!!h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={17} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        title="Bullet list"
        active={!!bullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={17} />
      </ToolBtn>
      <ToolBtn
        title="Numbered list"
        active={!!ordered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={17} />
      </ToolBtn>
      <ToolBtn
        title="Quote"
        active={!!quote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={17} />
      </ToolBtn>
      <ToolBtn
        title="Code block"
        active={!!codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code size={17} />
      </ToolBtn>
      <Divider />
      <ToolBtn title="Insert image" onClick={onInsertImage}>
        <ImagePlus size={17} />
      </ToolBtn>
    </div>
  );
}