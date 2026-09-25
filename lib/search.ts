import type { Note } from "./types";

export function htmlToText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export interface SearchResult {
  note: Note;
  snippet: string;
  score: number;
  matchedTitle: boolean;
}

export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function searchNotes(notes: Note[], query: string): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const note of notes) {
    const title = note.title.toLowerCase();
    const body = htmlToText(note.content).toLowerCase();
    const plain = htmlToText(note.content);

    let score = 0;
    let matchedTitle = false;
    let hitIndex = -1;

    for (const term of terms) {
      const ti = title.indexOf(term);
      if (ti >= 0) {
        score += 10;
        matchedTitle = true;
      }
      const bi = body.indexOf(term);
      if (bi >= 0) {
        score += 3;
        hitIndex = hitIndex === -1 ? bi : Math.min(hitIndex, bi);
      }
    }

    if (score === 0) continue;

    let snippet = "";
    if (hitIndex >= 0 && plain) {
      const start = Math.max(0, hitIndex - 40);
      const end = Math.min(plain.length, hitIndex + 70);
      snippet =
        (start > 0 ? "…" : "") +
        plain.slice(start, end).trim() +
        (end < plain.length ? "…" : "");
    } else if (body) {
      snippet =
        plain.slice(0, 110).trim() + (plain.length > 110 ? "…" : "");
    }

    results.push({ note, snippet, score, matchedTitle });
  }

  return results.sort(
    (a, b) =>
      b.score - a.score ||
      b.note.updatedAt.localeCompare(a.note.updatedAt)
  );
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}