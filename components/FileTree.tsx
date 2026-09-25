"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  NotebookPen,
  Pencil,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import type { Folder as FolderType } from "@/lib/types";
import { Modal } from "./Modal";

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

const byTitle = (a: { title: string }, b: { title: string }) =>
  a.title.localeCompare(b.title);

export type FileTreeAction = Action;

type Action =
  | { kind: "create-folder"; parentId: string | null; parentName: string }
  | { kind: "create-note"; folderId: string | null; parentName: string }
  | { kind: "rename-folder"; id: string; current: string }
  | { kind: "rename-note"; id: string; current: string };

export function ActionModal({
  action,
  onClose,
  onConfirm,
}: {
  action: Action | null;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(
    action && "current" in action ? action.current ?? "" : ""
  );

  if (!action) return null;

  const config: Record<Action["kind"], { title: string; label: string; placeholder: string }> = {
    "create-folder": {
      title: "New folder",
      label: "Folder name",
      placeholder: "e.g. React",
    },
    "create-note": {
      title: "New note",
      label: "Note title",
      placeholder: "e.g. State management",
    },
    "rename-folder": {
      title: "Rename folder",
      label: "Folder name",
      placeholder: "Folder name",
    },
    "rename-note": {
      title: "Rename note",
      label: "Note title",
      placeholder: "Note title",
    },
  };

  const c = config[action.kind];
  const parentName =
    action.kind === "create-folder" || action.kind === "create-note"
      ? action.parentName
      : null;

  return (
    <Modal open title={c.title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) {
            onConfirm(value);
            onClose();
          }
        }}
      >
        {parentName && (
          <p className="mb-3 font-sans text-xs text-ink-500">
            Inside: <span className="font-medium text-ink-700">{parentName || "Root"}</span>
          </p>
        )}
        <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
          {c.label}
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={c.placeholder}
          className="input"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function IconBtn({
  title,
  danger,
  children,
  onClick,
}: {
  title: string;
  danger?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={
        danger
          ? "icon-btn h-6! w-6! hover:bg-red-50! hover:text-red-600!"
          : "icon-btn h-6! w-6!"
      }
    >
      {children}
    </button>
  );
}

function NoteRow({
  id,
  kind,
  title,
  depth,
  onAction,
}: {
  id: string;
  kind: "journal" | "note";
  title: string;
  depth: number;
  onAction: (a: Action) => void;
}) {
  const { navigate, location, deleteNote } = useApp();
  const active = location.type === "note" && location.id === id;
  const Icon = kind === "journal" ? NotebookPen : FileText;

  return (
    <div
      style={{ paddingLeft: depth * 16 + 36 }}
      className="group my-0.5 flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-0 transition-colors hover:bg-paper-200"
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => navigate({ type: "note", id })}
      >
        <Icon
          size={15}
          className={active ? "shrink-0 text-clay-600" : "shrink-0 text-ink-300"}
        />
        <span
          className={`truncate text-sm ${active ? "font-semibold text-clay-700" : "text-ink-700 hover:text-ink-900"}`}
        >
          {title}
        </span>
      </button>
      <div className="flex items-center gap-0.5 opacity-70">
        <IconBtn title="Rename" onClick={() => onAction({ kind: "rename-note", id, current: title })}>
          <Pencil size={13} />
        </IconBtn>
        <IconBtn
          title="Delete"
          danger
          onClick={() => {
            if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
              deleteNote(id);
            }
          }}
        >
          <Trash2 size={13} />
        </IconBtn>
      </div>
    </div>
  );
}

function FolderRow({
  folder,
  depth,
  onAction,
}: {
  folder: FolderType;
  depth: number;
  onAction: (a: Action) => void;
}) {
  const { folders, notes, navigate, location, deleteFolder } = useApp();
  const [open, setOpen] = useState(true);

  const childrenFolders = useMemo(
    () => folders.filter((f) => f.parentId === folder.id).sort(byName),
    [folders, folder.id]
  );
  const childNotes = useMemo(
    () => notes.filter((n) => n.folderId === folder.id).sort(byTitle),
    [notes, folder.id]
  );

  const active = location.type === "folder" && location.id === folder.id;

  return (
    <div>
      <div
        style={{ paddingLeft: depth * 16 + 8 }}
        className="group my-0.5 flex items-center gap-1 rounded-lg py-1 pr-2 transition-colors hover:bg-paper-200"
      >
        <button
          type="button"
          className="icon-btn h-6! w-6!"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => navigate({ type: "folder", id: folder.id })}
        >
          {open ? (
            <FolderOpen size={16} className={`shrink-0 ${active ? "text-clay-600" : "text-ink-500"}`} />
          ) : (
            <Folder size={16} className={`shrink-0 ${active ? "text-clay-600" : "text-ink-500"}`} />
          )}
          <span
            className={`truncate text-sm ${active ? "font-semibold text-clay-700" : "text-ink-700"}`}
          >
            {folder.name}
          </span>
        </button>
        <div className="flex items-center gap-0.5 opacity-70">
          <IconBtn
            title="Add folder here"
            onClick={() => onAction({ kind: "create-folder", parentId: folder.id, parentName: folder.name })}
          >
            <FolderPlus size={13} />
          </IconBtn>
          <IconBtn
            title="Add note here"
            onClick={() => onAction({ kind: "create-note", folderId: folder.id, parentName: folder.name })}
          >
            <FilePlus2 size={13} />
          </IconBtn>
          <IconBtn
            title="Rename"
            onClick={() => onAction({ kind: "rename-folder", id: folder.id, current: folder.name })}
          >
            <Pencil size={13} />
          </IconBtn>
          <IconBtn
            title="Delete"
            danger
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${folder.name}" and everything inside it? This cannot be undone.`
                )
              ) {
                deleteFolder(folder.id);
              }
            }}
          >
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>

      {open && (
        <>
          {childrenFolders.map((child) => (
            <FolderRow key={child.id} folder={child} depth={depth + 1} onAction={onAction} />
          ))}
          {childNotes.map((n) => (
            <NoteRow
              key={n.id}
              id={n.id}
              kind={n.kind}
              title={n.title}
              depth={depth + 1}
              onAction={onAction}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function FileTree() {
  const { folders, notes } = useApp();
  const [action, setAction] = useState<Action | null>(null);

  const {
    createFolder,
    createNote,
    renameFolder,
    updateNote,
    navigate,
  } = useApp();

  const rootFolders = useMemo(
    () => folders.filter((f) => f.parentId === null).sort(byName),
    [folders]
  );
  const rootNotes = useMemo(
    () => notes.filter((n) => n.folderId === null).sort(byTitle),
    [notes]
  );

  const empty = rootFolders.length === 0 && rootNotes.length === 0;

  return (
    <>
      <div className="space-y-0.5">
        {rootFolders.map((f) => (
          <FolderRow key={f.id} folder={f} depth={0} onAction={setAction} />
        ))}
        {rootNotes.map((n) => (
          <NoteRow
            key={n.id}
            id={n.id}
            kind={n.kind}
            title={n.title}
            depth={0}
            onAction={setAction}
          />
        ))}
        {empty && (
          <p className="px-2 py-3 font-sans text-xs leading-relaxed text-ink-500">
            Nothing here yet.
            <br />
            Create a folder or a note to begin your journal.
          </p>
        )}
      </div>

      <ActionModal
        action={action}
        onClose={() => setAction(null)}
        onConfirm={(value) => {
          if (!action) return;
          switch (action.kind) {
            case "create-folder":
              void createFolder(value, action.parentId);
              break;
            case "create-note":
              void createNote("note", action.folderId, value).then((note) =>
                navigate({ type: "note", id: note.id })
              );
              break;
            case "rename-folder":
              void renameFolder(action.id, value);
              break;
            case "rename-note": {
              const note = notes.find((n) => n.id === action.id);
              if (note) void updateNote({ ...note, title: value });
              break;
            }
          }
        }}
      />
    </>
  );
}