import type { Folder, Note } from "./types";
import { indexedDbAdapter } from "./indexeddb";
import { queueOp } from "./sync/engine";

/**
 * All data access goes through this interface.
 * The base implementation is IndexedDB (browser-local, offline-first);
 * the sync wrapper mirrors every write into the cloud op-log.
 */
export interface StorageAdapter {
  getAllNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | null>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  getAllFolders(): Promise<Folder[]>;
  saveFolder(folder: Folder): Promise<void>;
  deleteFolder(id: string): Promise<void>;
}

function withSync(base: StorageAdapter): StorageAdapter {
  return {
    ...base,
    saveNote: async (note) => {
      await base.saveNote(note);
      void queueOp("note", "put", note.id, note);
    },
    deleteNote: async (id) => {
      await base.deleteNote(id);
      void queueOp("note", "del", id);
    },
    saveFolder: async (folder) => {
      await base.saveFolder(folder);
      void queueOp("folder", "put", folder.id, folder);
    },
    deleteFolder: async (id) => {
      await base.deleteFolder(id);
      void queueOp("folder", "del", id);
    },
  };
}

export function getStorage(): StorageAdapter {
  return withSync(indexedDbAdapter);
}