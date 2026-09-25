"use client";

import { Check, NotebookPen, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { dueEntries, nextReviewDate, REVIEW_INTERVAL_OPTIONS } from "@/lib/review";
import { daysBetween, formatReadable } from "@/lib/dates";

export function RevisionPanel() {
  const { notes, navigate, reviewNote } = useApp();
  const due = dueEntries(notes);

  if (due.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-200 text-clay-600">
          <RotateCcw size={20} />
        </span>
        <p className="font-serif font-bold">Nothing due for revision</p>
        <p className="max-w-xs font-sans text-sm text-ink-500">
          Entries you wrote 2, 7 and 30 days ago will appear here when it&apos;s
          time to revisit them.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-paper-300">
      {due.map((note) => {
        const next = nextReviewDate(note);
        const age = daysBetween(note.createdAt, new Date().toISOString().slice(0, 10));
        const intervalIdx = Math.min(
          note.reviewCount,
          REVIEW_INTERVAL_OPTIONS.length - 1
        );
        return (
          <li key={note.id} className="flex items-center gap-3 px-1 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper-200 text-clay-600">
              <NotebookPen size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif font-bold text-ink-900">
                {note.title}
              </p>
              <p className="truncate font-sans text-xs text-ink-500">
                learned {formatReadable(note.createdAt)} Â· {age} days ago Â· next
                interval {REVIEW_INTERVAL_OPTIONS[intervalIdx].label}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="btn-soft px-2.5! py-1.5! text-xs!"
                onClick={() => navigate({ type: "note", id: note.id })}
              >
                Review
              </button>
              <button
                type="button"
                className="btn-ghost h-8! w-8!"
                title={`Done â€” next review ${formatReadable(next)}`}
                onClick={() => void reviewNote(note.id)}
              >
                <Check size={15} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}