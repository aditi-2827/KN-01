export type NoteKind = "journal" | "note";

export interface Note {
  id: string;
  folderId: string | null;
  kind: NoteKind;
  title: string;
  content: string; // HTML produced by TipTap
  createdAt: string; // date key YYYY-MM-DD (drives heatmap + revision)
  updatedAt: string; // ISO timestamp
  reviewCount: number;
  lastReviewedAt: string | null; // date key YYYY-MM-DD
  pinned?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: string; // ISO timestamp (drives last-write-wins sync)
}

export type Location =
  | { type: "home" }
  | { type: "review" }
  | { type: "search"; query: string }
  | { type: "folder"; id: string }
  | { type: "note"; id: string };