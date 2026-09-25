import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Folder, Note } from "@/lib/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const syncEnabled = Boolean(URL && ANON_KEY);

let client: SupabaseClient | null = null;
let authPromise: Promise<void> | null = null;

function getClient(): SupabaseClient | null {
  if (!syncEnabled || !URL || !ANON_KEY) return null;
  if (!client) {
    client = createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Anonymous sign-in — session persists per browser (single-user model). */
export async function ensureAuth(): Promise<SupabaseClient | null> {
  const supabase = getClient();
  if (!supabase) return null;
  if (authPromise) return authPromise.then(() => supabase);
  authPromise = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) throw anonError;
    }
  })();
  try {
    await authPromise;
  } finally {
    authPromise = null;
  }
  return supabase;
}

export type RemoteRow = Record<string, unknown> & { id: string; updated_at: string };

function rowToNote(r: RemoteRow): Note {
  return {
    id: r.id,
    folderId: (r.folder_id as string | null) ?? null,
    kind: (r.kind as Note["kind"]) ?? "note",
    title: (r.title as string) ?? "",
    content: (r.content as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
    updatedAt: new Date(r.updated_at).toISOString(),
    reviewCount: (r.review_count as number) ?? 0,
    lastReviewedAt: (r.last_reviewed_at as string | null) ?? null,
    pinned: Boolean(r.pinned),
  };
}

function noteToRow(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    folder_id: note.folderId,
    kind: note.kind,
    title: note.title,
    content: note.content,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    review_count: note.reviewCount,
    last_reviewed_at: note.lastReviewedAt,
    pinned: Boolean(note.pinned),
  };
}

function rowToFolder(r: RemoteRow): Folder {
  return {
    id: r.id,
    name: (r.name as string) ?? "Untitled",
    parentId: (r.parent_id as string | null) ?? null,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function folderToRow(folder: Folder): Record<string, unknown> {
  return {
    id: folder.id,
    name: folder.name,
    parent_id: folder.parentId,
    updated_at: folder.updatedAt,
  };
}

export async function upsertNotes(notes: Note[]): Promise<number> {
  const supabase = await ensureAuth();
  if (!supabase) return 0;
  const rows = notes.map(noteToRow);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from("notes")
      .upsert(rows.slice(i, i + 100), { onConflict: "id" });
    if (error) throw error;
    inserted += rows.slice(i, i + 100).length;
  }
  return inserted;
}

export async function upsertFolders(folders: Folder[]): Promise<number> {
  const supabase = await ensureAuth();
  if (!supabase) return 0;
  const rows = folders.map(folderToRow);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from("folders")
      .upsert(rows.slice(i, i + 100), { onConflict: "id" });
    if (error) throw error;
    inserted += rows.slice(i, i + 100).length;
  }
  return inserted;
}

export async function softDeleteNotes(ids: string[]): Promise<void> {
  const supabase = await ensureAuth();
  if (!supabase) return;
  for (const id of ids) {
    const { error } = await supabase
      .from("notes")
      .update({ deleted: true })
      .eq("id", id);
    if (error) throw error;
  }
}

export async function softDeleteFolders(ids: string[]): Promise<void> {
  const supabase = await ensureAuth();
  if (!supabase) return;
  for (const id of ids) {
    const { error } = await supabase
      .from("folders")
      .update({ deleted: true })
      .eq("id", id);
    if (error) throw error;
  }
}

/**
 * Fetches rows with updated_at <= until (delta pull). Tombstones show up as
 * rows with deleted=true.
 */
export async function pullNotes(until: string): Promise<RemoteRow[]> {
  const supabase = await ensureAuth();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .lte("updated_at", until)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RemoteRow[];
}

export async function pullFolders(until: string): Promise<RemoteRow[]> {
  const supabase = await ensureAuth();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .lte("updated_at", until)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RemoteRow[];
}

export async function remoteMaxUpdatedAt(): Promise<string | null> {
  const supabase = await ensureAuth();
  if (!supabase) return null;
  let latest: string | null = null;
  for (const table of ["notes", "folders"]) {
    const { data, error } = await supabase
      .from(table)
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      const ts = (data[0].updated_at as string) ?? "";
      if (ts && (!latest || new Date(ts).getTime() > new Date(latest).getTime())) {
        latest = ts;
      }
    }
  }
  return latest;
}

export async function remoteCounts(): Promise<{
  notes: number;
  folders: number;
}> {
  const supabase = await ensureAuth();
  if (!supabase) return { notes: 0, folders: 0 };
  const { count: notes, error: ne } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("deleted", false);
  if (ne) throw ne;
  const { count: folders, error: fe } = await supabase
    .from("folders")
    .select("id", { count: "exact", head: true })
    .eq("deleted", false);
  if (fe) throw fe;
  return { notes: notes ?? 0, folders: folders ?? 0 };
}

export const remote = {
  upsertNotes,
  upsertFolders,
  softDeleteNotes,
  softDeleteFolders,
  pullNotes,
  pullFolders,
  remoteMaxUpdatedAt,
  remoteCounts,
  rowToNote,
  rowToFolder,
};