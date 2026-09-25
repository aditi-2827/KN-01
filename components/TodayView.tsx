"use client";

import { useMemo } from "react";
import { Bell, Flame, NotebookPen, Pin, PinOff, Plus, Sun } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { formatFullToday, formatShortDay, todayKey } from "@/lib/dates";
import { computeStreak } from "@/lib/streak";
import { useReminder, formatTime } from "@/lib/reminder";
import { Heatmap } from "./Heatmap";
import { RevisionPanel } from "./RevisionPanel";

export function TodayView() {
  const { notes, navigate, createNote, updateNote, ready } = useApp();
  const { overdue, reminder } = useReminder();

  const today = todayKey();
  const todayEntries = notes.filter(
    (n) => n.kind === "journal" && n.createdAt === today
  );
  const journalCount = notes.filter((n) => n.kind === "journal").length;
  const streak = useMemo(() => computeStreak(notes), [notes]);

  const pinned = useMemo(
    () =>
      notes
        .filter((n) => n.pinned)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes]
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            {formatFullToday()}
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-500">
            {journalCount === 0
              ? "A fresh page. Choose a topic, learn it, and write it down."
              : `You've written ${journalCount} ${journalCount === 1 ? "entry" : "entries"} so far. Keep the streak alive.`}
          </p>
        </div>
        {streak.current > 0 && (
          <span className="tag gap-1.5 py-1 text-sm">
            <Flame size={14} className="text-clay-600" />
            {streak.current}-day streak
            {streak.best > streak.current && (
              <span className="opacity-70">· best {streak.best}</span>
            )}
          </span>
        )}
      </header>

      {overdue && todayEntries.length === 0 && (
        <div className="card flex flex-wrap items-center gap-3 border-clay-600/30 bg-clay-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-600 text-onaccent">
            <Bell size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif font-bold">Today&apos;s entry is still waiting</p>
            <p className="font-sans text-sm text-ink-500">
              Reminder set for {formatTime(reminder.time)} — don&apos;t let the
              day end empty.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={!ready}
            onClick={() =>
              void createNote("journal", null).then((note) =>
                navigate({ type: "note", id: note.id })
              )
            }
          >
            <Plus size={16} />
            Write it now
          </button>
        </div>
      )}

      {todayEntries.length === 0 ? (
        <button
          type="button"
          disabled={!ready}
          onClick={() =>
            void createNote("journal", null).then((note) =>
              navigate({ type: "note", id: note.id })
            )
          }
          className="card group flex w-full flex-col items-center gap-3 px-5 py-10 text-center transition-all hover:border-clay-600/40 hover:shadow-lg disabled:cursor-not-allowed"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-200 text-clay-600 transition-colors group-hover:bg-clay-600 group-hover:text-onaccent">
            <Sun size={26} />
          </span>
          <span>
            <span className="block font-serif text-xl font-bold">
              Write today&apos;s entry
            </span>
            <span className="mt-1 block font-sans text-sm text-ink-500">
              One topic a day, captured before the day ends.
            </span>
          </span>
          <span className="btn-primary pointer-events-none mt-1">
            <Plus size={16} />
            Start writing
          </span>
        </button>
      ) : (
        <div className="card px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-bold">
              Today&apos;s entries
            </h2>
            <button
              type="button"
              className="btn-soft px-2.5! py-1! text-xs!"
              onClick={() =>
                void createNote("journal", null).then((note) =>
                  navigate({ type: "note", id: note.id })
                )
              }
            >
              <Plus size={13} />
              Add another
            </button>
          </div>
          <ul className="mt-2 divide-y divide-paper-300">
            {todayEntries.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                  onClick={() => navigate({ type: "note", id: n.id })}
                >
                  <NotebookPen size={15} className="shrink-0 text-ink-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif font-bold text-ink-900">
                      {n.title}
                    </span>
                    <span className="block font-sans text-xs text-ink-500">
                      {formatShortDay(n.updatedAt.slice(0, 10))} · written today
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pinned.length > 0 && (
        <section className="card px-5 py-4">
          <h2 className="mb-2 font-serif text-lg font-bold">Pinned</h2>
          <ul className="divide-y divide-paper-300">
            {pinned.map((n) => {
              const Icon = n.kind === "journal" ? NotebookPen : Pin;
              return (
                <li key={n.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => navigate({ type: "note", id: n.id })}
                  >
                    <Icon size={15} className="shrink-0 text-clay-600" />
                    <span className="min-w-0">
                      <span className="block truncate font-serif font-bold text-ink-900">
                        {n.title}
                      </span>
                      <span className="block font-sans text-xs text-ink-500">
                        {n.kind === "journal" ? "Journal" : "Note"} ·{" "}
                        {formatShortDay(n.createdAt)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-8! w-8!"
                    title="Unpin"
                    onClick={() => void updateNote({ ...n, pinned: false })}
                  >
                    <PinOff size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold">Due for revision</h2>
          <span className="tag">spaced repetition</span>
        </div>
        <RevisionPanel />
      </section>

      <section className="card px-5 py-4">
        <h2 className="mb-3 font-serif text-lg font-bold">Activity</h2>
        <Heatmap notes={notes.filter((n) => n.kind === "journal")} />
      </section>
    </div>
  );
}