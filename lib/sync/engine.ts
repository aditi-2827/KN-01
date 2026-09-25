"use client";

import { useSyncExternalStore } from "react";
import { indexedDbAdapter } from "@/lib/indexeddb";
import type { Folder, Note } from "@/lib/types";
import { remote, syncEnabled, ensureAuth } from "./supabase";
import {
  allOps,
  appendOp,
  clearAppliedOps,
  clearTombstones,
  putTombstones,
  getMeta,
  setMeta,
  allTombstones,
  type SyncOpTable,
} from "./idb";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export interface SyncState {
  enabled: boolean;
  online: boolean;
  status: SyncStatus;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
}

const initial: SyncState = {
  enabled: syncEnabled,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  status: "idle",
  pending: 0,
  lastSyncAt: null,
  error: null,
};

let state: SyncState = initial;
const listeners = new Set<() => void>();

function emit(next: Partial<SyncState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribeSync(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSyncState(): SyncState {
  return state;
}

export const useSyncStatus = () =>
  useSyncExternalStore(subscribeSync, getSyncState, () => state);

let syncing = false;
let chain: Promise<void> = Promise.resolve();

/** Append a mutation to the local op-log and schedule a background sync. */
export function queueOp(
  table: SyncOpTable,
  op: "put" | "del",
  id: string,
  payload?: unknown
): Promise<void> {
  const ts = new Date().toISOString();
  return appendOp({ table, op, id, ts, payload }).then(() => {
    void refreshPending();
    scheduleSync();
  });
}

let scheduleTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(delayMs = 1500) {
  if (scheduleTimer !== null) clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;
    void triggerSync();
  }, delayMs);
}

export function triggerSync(): Promise<void> {
  if (!syncEnabled) {
    emit({ status: "idle", online: navigator.onLine });
    return Promise.resolve();
  }
  if (syncing) return chain;
  chain = chain
    .then(syncNow)
    .catch((err: unknown) => {
      emit({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    });
  return chain;
}

function refreshPending(): Promise<void> {
  return allOps().then((ops) => emit({ pending: ops.length }));
}

async function syncNow(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    if (!navigator.onLine) {
      emit({ status: "offline", online: false });
      return;
    }
    emit({ status: "syncing", online: true, error: null });

    const supabase = await ensureAuth();
    if (!supabase) throw new Error("Supabase not configured");

    await maybeSeed();
    await pushOps();
    await pullDelta();
    await refreshPending();

    emit({ status: "synced", lastSyncAt: new Date().toISOString() });
  } finally {
    syncing = false;
  }
}

/** First-ever sync: seed the cloud from local data (or mark as done). */
async function maybeSeed(): Promise<void> {
  if ((await getMeta("seeded")) === 1) return;

  const [counts, localNotes, localFolders, tombstones] = await Promise.all([
    remote.remoteCounts(),
    indexedDbAdapter.getAllNotes(),
    indexedDbAdapter.getAllFolders(),
    allTombstones(),
  ]);

  if (counts.notes === 0 && counts.folders === 0) {
    if (localNotes.length > 0 || localFolders.length > 0) {
      await Promise.all([
        remote.upsertNotes(localNotes),
        remote.upsertFolders(localFolders),
      ]);
    }
    if (tombstones.length > 0) {
      const noteIds = tombstones.filter((t) => t.table === "note").map((t) => t.id);
      const folderIds = tombstones.filter((t) => t.table === "folder").map((t) => t.id);
      await Promise.all([
        remote.softDeleteNotes(noteIds),
        remote.softDeleteFolders(folderIds),
      ]);
    }
  }

  await setMeta("seeded", 1);
}

async function pushOps(): Promise<void> {
  const ops = await allOps();
  if (ops.length === 0) return;

  const putNotes: Note[] = [];
  const putFolders: Folder[] = [];
  const delNoteIds: string[] = [];
  const delFolderIds: string[] = [];
  let maxSeq = 0;

  for (const op of ops) {
    maxSeq = Math.max(maxSeq, op.seq ?? 0);
    if (op.op === "put") {
      if (op.table === "note") putNotes.push(op.payload as Note);
      else putFolders.push(op.payload as Folder);
      void clearTombstones([op.id]);
    } else {
      if (op.table === "note") delNoteIds.push(op.id);
      else delFolderIds.push(op.id);
    }
  }

  const tombstones = [
    ...delNoteIds.map((id) => ({ id, table: "note" as const, at: new Date().toISOString() })),
    ...delFolderIds.map((id) => ({ id, table: "folder" as const, at: new Date().toISOString() })),
  ];

  await Promise.all([
    putNotes.length > 0 ? remote.upsertNotes(putNotes) : Promise.resolve(),
    putFolders.length > 0 ? remote.upsertFolders(putFolders) : Promise.resolve(),
    delNoteIds.length > 0 ? remote.softDeleteNotes(delNoteIds) : Promise.resolve(),
    delFolderIds.length > 0 ? remote.softDeleteFolders(delFolderIds) : Promise.resolve(),
  ]);

  if (tombstones.length > 0) await putTombstones(tombstones);
  await clearAppliedOps(maxSeq);
}

/** Last-write-wins delta merge from the cloud into local IndexedDB. */
async function pullDelta(): Promise<void> {
  const until = await remote.remoteMaxUpdatedAt();
  if (!until) {
    await setMeta("lastPulledAt", new Date().toISOString());
    return;
  }

  const [remoteNotes, remoteFolders, localNotes, localFolders, localTombstones] =
    await Promise.all([
      remote.pullNotes(until),
      remote.pullFolders(until),
      indexedDbAdapter.getAllNotes(),
      indexedDbAdapter.getAllFolders(),
      allTombstones(),
    ]);

  const localNotesById = new Map(localNotes.map((n) => [n.id, n]));
  const localFoldersById = new Map(localFolders.map((f) => [f.id, f]));
  const tombstoneIds = new Set(localTombstones.map((t) => `${t.table}:${t.id}`));

  const saveNotes: Note[] = [];
  const delNoteIds: string[] = [];
  const saveFolders: Folder[] = [];
  const delFolderIds: string[] = [];

  for (const row of remoteNotes) {
    const key = `note:${row.id}`;
    if (row.deleted) {
      if (!tombstoneIds.has(key)) {
        delNoteIds.push(row.id);
        void putTombstones([{ id: row.id, table: "note", at: new Date().toISOString() }]);
      }
      continue;
    }
    if (tombstoneIds.has(key)) continue; // deleted locally + not yet re-created
    const note = remote.rowToNote(row);
    const local = localNotesById.get(note.id);
    if (!local || new Date(note.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
      saveNotes.push(note);
    }
  }

  for (const row of remoteFolders) {
    const key = `folder:${row.id}`;
    if (row.deleted) {
      if (!tombstoneIds.has(key)) {
        delFolderIds.push(row.id);
        void putTombstones([{ id: row.id, table: "folder", at: new Date().toISOString() }]);
      }
      continue;
    }
    if (tombstoneIds.has(key)) continue;
    const folder = remote.rowToFolder(row);
    const local = localFoldersById.get(folder.id);
    if (!local || new Date(folder.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
      saveFolders.push(folder);
    }
  }

  await Promise.all([
    ...saveNotes.map((n) => indexedDbAdapter.saveNote(n)),
    ...delNoteIds.map((id) => indexedDbAdapter.deleteNote(id)),
    ...saveFolders.map((f) => indexedDbAdapter.saveFolder(f)),
    ...delFolderIds.map((id) => indexedDbAdapter.deleteFolder(id)),
    setMeta("lastPulledAt", until),
  ]);
}

/** Attach the ambient sync triggers (online/visibility). Call once. */
export function initSync(): () => void {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => {
    emit({ online: true });
    void triggerSync();
  };
  const onOffline = () => emit({ online: false, status: "offline" });
  const onVisibility = () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      void triggerSync();
    }
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}