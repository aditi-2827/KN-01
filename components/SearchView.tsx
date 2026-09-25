"use client";

import { useMemo } from "react";
import { FileText, NotebookPen, SearchX } from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { escapeRegExp, searchNotes, tokenize } from "@/lib/search";
import { formatReadable } from "@/lib/dates";

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const pattern = new RegExp(
    `(${terms.map((t) => escapeRegExp(t)).join("|")})`,
    "gi"
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => part && part.toLowerCase() === t) ? (
          <mark key={i} className="rounded-sm bg-amber-300/80 px-0.5 text-black/80">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function SearchView({ query }: { query: string }) {
  const { notes, folders, navigate } = useApp();

  const terms = tokenize(query);
  const results = useMemo(() => searchNotes(notes, query), [notes, query]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {results.length} {results.length === 1 ? "result" : "results"}
        </h1>
        <p className="mt-1 font-sans text-sm text-ink-500">
          for &ldquo;
          <span className="font-medium text-ink-700">{query}</span>
          &rdquo;
        </p>
      </div>

      {results.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
          <SearchX size={28} className="text-ink-300" />
          <p className="font-serif font-bold">No matches</p>
          <p className="max-w-xs font-sans text-sm text-ink-500">
            Try a different word, or search on a topic name — titles and note
            contents are both searched.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map(({ note, snippet, matchedTitle }) => {
            const Icon = note.kind === "journal" ? NotebookPen : FileText;
            const folder = note.folderId
              ? folders.find((f) => f.id === note.folderId)
              : null;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  className="card flex w-full items-start gap-3 px-4 py-3 text-left transition-all hover:border-clay-600/40 hover:shadow-md"
                  onClick={() => navigate({ type: "note", id: note.id })}
                >
                  <Icon size={17} className="mt-0.5 shrink-0 text-ink-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif font-bold text-ink-900">
                      {matchedTitle && terms.length > 0 ? (
                        <Highlight text={note.title} terms={terms} />
                      ) : (
                        note.title
                      )}
                    </span>
                    {snippet && (
                      <span className="mt-0.5 block font-sans text-sm leading-relaxed text-ink-500">
                        <Highlight text={snippet} terms={terms} />
                      </span>
                    )}
                    <span className="mt-1 block font-sans text-xs text-ink-300">
                      {note.kind === "journal" ? "Journal" : "Note"}
                      {folder ? ` · ${folder.name}` : ""} ·{" "}
                      {formatReadable(note.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}