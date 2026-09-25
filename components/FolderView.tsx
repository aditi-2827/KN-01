"use client";

import { useEffect } from "react";
import { ArrowLeft, FileText, FolderOpen, NotebookPen } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { formatReadable } from "@/lib/dates";

export function FolderView({ folderId }: { folderId: string }) {
  const { folders, notes, navigate } = useApp();

  const folder = folders.find((f) => f.id === folderId);

  useEffect(() => {
    if (!folder) navigate({ type: "home" });
  }, [folder, navigate]);

  if (!folder) return null;

  const subfolders = folders
    .filter((f) => f.parentId === folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const items = notes
    .filter((n) => n.folderId === folder.id)
    .sort((a, b) => a.title.localeCompare(b.title));

  const parent = folder.parentId
    ? folders.find((f) => f.id === folder.parentId)
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <button
          type="button"
          className="btn-ghost -ml-2"
          onClick={() =>
            parent
              ? navigate({ type: "folder", id: parent.id })
              : navigate({ type: "home" })
          }
        >
          <ArrowLeft size={16} />
          {parent ? parent.name : "Home"}
        </button>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight">
          {folder.name}
        </h1>
        <p className="mt-1 font-sans text-sm text-ink-500">
          {subfolders.length} {subfolders.length === 1 ? "folder" : "folders"} ·{" "}
          {items.length} {items.length === 1 ? "note" : "notes"}
        </p>
      </div>

      {subfolders.length === 0 && items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
          <FolderOpen size={28} className="text-ink-300" />
          <p className="font-serif font-bold">This folder is empty</p>
          <p className="font-sans text-sm text-ink-500">
            Create a note inside it from the sidebar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subfolders.map((f) => (
            <button
              key={f.id}
              type="button"
              className="card flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:border-clay-600/40 hover:shadow-md"
              onClick={() => navigate({ type: "folder", id: f.id })}
            >
              <FolderOpen size={18} className="shrink-0 text-clay-600" />
              <span className="font-serif font-bold text-ink-900">
                {f.name}
              </span>
            </button>
          ))}
          {items.map((n) => {
            const Icon = n.kind === "journal" ? NotebookPen : FileText;
            return (
              <button
                key={n.id}
                type="button"
                className="card flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:border-clay-600/40 hover:shadow-md"
                onClick={() => navigate({ type: "note", id: n.id })}
              >
                <Icon size={17} className="shrink-0 text-ink-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif font-bold text-ink-900">
                    {n.title}
                  </span>
                  <span className="block font-sans text-xs text-ink-500">
                    {n.kind === "journal" ? "Journal" : "Note"} ·{" "}
                    {formatReadable(n.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}