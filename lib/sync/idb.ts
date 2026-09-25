const DB_NAME = "journal-sync-db";
const DB_VERSION = 1;
const OPS = "ops";
const TOMBSTONES = "tombstones";
const META = "meta";

export type SyncOpTable = "note" | "folder";
export interface SyncOp {
  seq?: number;
  table: SyncOpTable;
  op: "put" | "del";
  id: string;
  ts: string;
  payload?: unknown;
}
export interface Tombstone {
  id: string;
  table: SyncOpTable;
  at: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OPS)) {
        db.createObjectStore(OPS, { keyPath: "seq", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(TOMBSTONES)) {
        db.createObjectStore(TOMBSTONES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "id" });
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
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function multi(store: string, fn: (s: IDBObjectStore) => void): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(store, "readwrite");
        fn(t.objectStore(store));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      })
  );
}

export function appendOp(op: Omit<SyncOp, "seq">): Promise<void> {
  return tx(OPS, "readwrite", (s) => s.add(op)).then(() => undefined);
}

export function allOps(): Promise<SyncOp[]> {
  return tx<SyncOp[]>(OPS, "readonly", (s) => s.getAll() as IDBRequest<SyncOp[]>);
}

/** Removes ops whose seq <= the highest fully-applied seq. */
export function clearAppliedOps(upToSeq: number): Promise<void> {
  return multi(OPS, (s) => {
    void s.delete(IDBKeyRange.upperBound(upToSeq));
  });
}

export function putTombstones(items: Tombstone[]): Promise<void> {
  if (items.length === 0) return Promise.resolve();
  return multi(TOMBSTONES, (s) => {
    for (const item of items) s.put(item);
  });
}

export function clearTombstones(ids: string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return multi(TOMBSTONES, (s) => {
    for (const id of ids) s.delete(id);
  });
}

export function allTombstones(): Promise<Tombstone[]> {
  return tx<Tombstone[]>(
    TOMBSTONES,
    "readonly",
    (s) => s.getAll() as IDBRequest<Tombstone[]>
  );
}

type MetaValue = string | number | null;
export function getMeta(key: string): Promise<MetaValue | undefined> {
  return tx<{ v: MetaValue } | undefined>(
    META,
    "readonly",
    (s) => s.get(key) as IDBRequest<{ v: MetaValue } | undefined>
  ).then((row) => row?.v);
}

export function setMeta(key: string, value: MetaValue): Promise<void> {
  return tx(META, "readwrite", (s) => s.put({ id: key, v: value })).then(
    () => undefined
  );
}