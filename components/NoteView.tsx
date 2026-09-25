"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Folder,
  NotebookPen,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import type { Note } from "@/lib/types";
import { formatAgo, formatReadable } from "@/lib/dates";
import { nextReviewDate, REVIEW_INTERVAL_OPTIONS } from "@/lib/review";
import { JournalEditor } from "./JournalEditor";

function EditorShell({ note }: { note: Note }) {
  const { updateNote } = useApp();
  const [title, setTitle] = useState(note.title);

  const latest = useRef(note);
  const pending = useRef<Partial<Note>>({});
  const timer = useRef<number | null>(null);

  useEffect(() => {
    latest.current = note;
    if (note.title !== title) setTitle(note.title);
    // keep local title synced if the note changes elsewhere
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  function flush() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (Object.keys(pending.current).length > 0) {
      const patch = pending.current;
      pending.current = {};
      void updateNote({ ...latest.current, ...patch });
    }
  }

  function schedule(patch: Partial<Note>) {
    pending.current = { ...pending.current, ...patch };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  }

  useEffect(() => () => flush(), []);

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          schedule({ title: e.target.value });
        }}
        placeholder="Entry title…"
        className="w-full border-none bg-transparent font-serif text-2xl font-bold text-ink-900 outline-none placeholder:text-ink-300 sm:text-[1.7rem]"
      />
      <JournalEditor
        initialContent={note.content}
        onChange={(html) => schedule({ content: html })}
      />
    </div>
  );
}

export function NoteView({ noteId }: { noteId: string }) {
  const { notes, folders, navigate, deleteNote, reviewNote, updateNote } =
    useApp();

  const note = notes.find((n) => n.id === noteId);

  useEffect(() => {
    if (!note) navigate({ type: "home" });
  }, [note, navigate]);

  if (!note) return null;

  const folder = note.folderId
    ? folders.find((f) => f.id === note.folderId)
    : null;
  const isJournal = note.kind === "journal";
  const next = nextReviewDate(note);
  const intervalIdx = Math.min(
    note.reviewCount,
    REVIEW_INTERVAL_OPTIONS.length - 1
  );

  return (
    <div className="card mx-auto w-full max-w-3xl px-4 py-5 sm:px-7 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost -ml-2"
          onClick={() =>
            folder ? navigate({ type: "folder", id: folder.id }) : navigate({ type: "home" })
          }
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="tag">
            {isJournal ? <NotebookPen size={12} /> : null}
            {isJournal ? "Journal" : "Note"}
            <span className="opacity-60">·</span>
            {formatReadable(note.createdAt)}
          </span>
          {isJournal && (
            <button
              type="button"
              className="btn-soft px-2.5! py-1! text-xs!"
              onClick={() => void reviewNote(note.id)}
              title="Mark this entry as reviewed today"
            >
              <Check size={13} />
              Reviewed
            </button>
          )}
          <button
            type="button"
            className={
              note.pinned
                ? "icon-btn text-clay-600 hover:bg-paper-200"
                : "icon-btn hover:bg-paper-200"
            }
            title={note.pinned ? "Unpin" : "Pin this entry"}
            onClick={() =>
              void updateNote({ ...note, pinned: !note.pinned })
            }
          >
            {note.pinned ? <Pin size={16} /> : <PinOff size={16} />}
          </button>
          <button
            type="button"
            className="icon-btn hover:bg-red-50! hover:text-red-600!"
            title="Delete entry"
            onClick={() => {
              if (window.confirm(`Delete "${note.title}"? This cannot be undone.`)) {
                deleteNote(note.id);
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-ink-500">
        {folder && (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-ink-700"
            onClick={() => navigate({ type: "folder", id: folder.id })}
          >
            <Folder size={12} />
            {folder.name}
          </button>
        )}
        <span className="flex items-center gap-1">
          <Clock size={12} />
          updated {formatAgo(note.updatedAt.slice(0, 10))}
        </span>
        {isJournal && (
          <span className="flex items-center gap-1">
            next review: {formatReadable(next)} · {REVIEW_INTERVAL_OPTIONS[intervalIdx].label}
          </span>
        )}
      </div>

      <EditorShell key={note.id} note={note} />
    </div>
  );
}