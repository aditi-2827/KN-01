import type { Folder, Note } from "./types";
import { indexedDbAdapter } from "./indexeddb";
import {
  allTombstones,
  clearAppliedOps,
  clearTombstones,
  setMeta,
} from "./sync/idb";

export interface BackupEnvelope {
  app: "KN-01";
  version: 1;
  exportedAt: string;
  counts: { notes: number; folders: number };
  notes: Note[];
  folders: Folder[];
}

const NOTE_KEYS: (keyof Note)[] = [
  "id",
  "folderId",
  "kind",
  "title",
  "content",
  "createdAt",
  "updatedAt",
  "reviewCount",
  "lastReviewedAt",
  "pinned",
];
const FOLDER_KEYS: (keyof Folder)[] = ["id", "name", "parentId", "updatedAt"];

function pick<T>(keys: (keyof T)[], row: unknown): T {
  const out: Record<string, unknown> = {};
  const src = (row ?? {}) as Record<string, unknown>;
  for (const k of keys) out[k as string] = src[k as string];
  return out as T;
}

function isValid(value: unknown): value is BackupEnvelope {
  const b = (value ?? {}) as Partial<BackupEnvelope>;
  return (
    b.app === "KN-01" &&
    b.version === 1 &&
    Array.isArray(b.notes) &&
    Array.isArray(b.folders)
  );
}

export async function createBackup(): Promise<BackupEnvelope> {
  const [notes, folders] = await Promise.all([
    indexedDbAdapter.getAllNotes(),
    indexedDbAdapter.getAllFolders(),
  ]);
  return {
    app: "KN-01",
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: { notes: notes.length, folders: folders.length },
    notes,
    folders,
  };
}

export function downloadBackup(): Promise<void> {
  return createBackup().then((payload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kn-01-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

export function readBackupFile(file: File): Promise<unknown> {
  return file.text().then((text) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("That file isn’t valid JSON.");
    }
    if (!isValid(parsed)) {
      throw new Error("That file isn’t a KN-01 backup.");
    }
    return parsed;
  });
}

export async function restoreBackup(payload: unknown): Promise<BackupEnvelope> {
  if (!isValid(payload)) {
    throw new Error("That file isn’t a KN-01 backup.");
  }
  const backup = payload as BackupEnvelope;

  const [existingNotes, existingFolders] = await Promise.all([
    indexedDbAdapter.getAllNotes(),
    indexedDbAdapter.getAllFolders(),
  ]);
  for (const n of existingNotes) await indexedDbAdapter.deleteNote(n.id);
  for (const f of existingFolders) await indexedDbAdapter.deleteFolder(f.id);

  for (const raw of backup.notes) {
    await indexedDbAdapter.saveNote(pick<Note>(NOTE_KEYS, raw));
  }
  for (const raw of backup.folders) {
    await indexedDbAdapter.saveFolder(pick<Folder>(FOLDER_KEYS, raw));
  }

  const tombstones = await allTombstones();
  await clearTombstones(tombstones.map((t) => t.id));
  await clearAppliedOps(Number.MAX_SAFE_INTEGER);
  await setMeta("seeded", null);

  return {
    app: "KN-01",
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: { notes: backup.notes.length, folders: backup.folders.length },
    notes: backup.notes,
    folders: backup.folders,
  };
}
