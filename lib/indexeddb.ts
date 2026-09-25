import type { Folder, Note } from "./types";
import type { StorageAdapter } from "./storage";

const DB_NAME = "journal-db";
const DB_VERSION = 1;
const NOTES = "notes";
const FOLDERS = "folders";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES)) {
        db.createObjectStore(NOTES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(FOLDERS)) {
        db.createObjectStore(FOLDERS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

async function request(
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<any>
): Promise<void> {
  await tx(store, mode, run);
}

function getAll<T>(store: string): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

function getOne<T>(store: string, key: string): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) =>
    s.get(key) as IDBRequest<T | undefined>
  );
}

function put(store: string, value: unknown): Promise<void> {
  return request(store, "readwrite", (s) => s.put(value));
}

function del(store: string, key: string): Promise<void> {
  return request(store, "readwrite", (s) => s.delete(key));
}

export const indexedDbAdapter: StorageAdapter = {
  getAllNotes: () => getAll<Note>(NOTES),
  getAllFolders: () => getAll<Folder>(FOLDERS),

  getNote: async (id) => {
    const note = await getOne<Note>(NOTES, id);
    return note ?? null;
  },

  saveNote: (note) => put(NOTES, note),
  deleteNote: (id) => del(NOTES, id),

  saveFolder: (folder) => put(FOLDERS, folder),
  deleteFolder: (id) => del(FOLDERS, id),
};