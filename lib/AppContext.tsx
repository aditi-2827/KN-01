"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Folder, Location, Note, NoteKind } from "./types";
import { getStorage, type StorageAdapter } from "./storage";
import { initSync, triggerSync } from "./sync/engine";
import { todayKey } from "./dates";
import { markReviewed } from "./review";

interface AppContextValue {
  ready: boolean;
  notes: Note[];
  folders: Folder[];
  location: Location;
  refresh: () => Promise<void>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  navigate: (loc: Location) => void;
  createFolder: (
    name: string,
    parentId: string | null
  ) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => void;
  createNote: (
    kind: NoteKind,
    folderId: string | null,
    title?: string
  ) => Promise<Note>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => void;
  reviewNote: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const storage: StorageAdapter = getStorage();

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [location, setLocation] = useState<Location>({ type: "home" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [storedNotes, storedFolders] = await Promise.all([
      storage.getAllNotes(),
      storage.getAllFolders(),
    ]);
    setNotes(storedNotes);
    setFolders(storedFolders);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([storage.getAllNotes(), storage.getAllFolders()])
      .then(([storedNotes, storedFolders]) => {
        if (cancelled) return;
        setNotes(storedNotes);
        setFolders(storedFolders);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => initSync(), []);

  useEffect(() => {
    if (ready) void triggerSync();
  }, [ready]);

  const navigate = useCallback((loc: Location) => {
    setLocation(loc);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      const folder: Folder = {
        id: newId(),
        name: name.trim() || "Untitled",
        parentId,
        updatedAt: new Date().toISOString(),
      };
      await storage.saveFolder(folder);
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    []
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, name: name.trim() || f.name, updatedAt: new Date().toISOString() }
          : f
      )
    );
    const folder = folders.find((f) => f.id === id);
    if (folder)
      await storage.saveFolder({
        ...folder,
        name: name.trim() || folder.name,
        updatedAt: new Date().toISOString(),
      });
  }, []);

  const deleteFolder = useCallback(
    (id: string) => {
      const toDelete = new Set<string>([id]);
      const collect = (fid: string) => {
        folders.forEach((f) => {
          if (f.parentId === fid && !toDelete.has(f.id)) {
            toDelete.add(f.id);
            collect(f.id);
          }
        });
      };
      collect(id);

      const notesToDelete = notes.filter(
        (n) => n.folderId !== null && toDelete.has(n.folderId)
      );
      const foldersToDelete = folders.filter((f) => toDelete.has(f.id));

      notesToDelete.forEach((n) => void storage.deleteNote(n.id));
      foldersToDelete.forEach((f) => void storage.deleteFolder(f.id));

      setNotes((prev) =>
        prev.filter((n) => !notesToDelete.includes(n))
      );
      setFolders((prev) => prev.filter((f) => !toDelete.has(f.id)));
      setLocation((loc) =>
        loc.type === "folder" && toDelete.has(loc.id)
          ? { type: "home" }
          : loc
      );
    },
    [folders, notes]
  );

  const createNote = useCallback(
    async (kind: NoteKind, folderId: string | null, title?: string) => {
      const note: Note = {
        id: newId(),
        folderId,
        kind,
        title:
          title?.trim() ||
          (kind === "journal"
            ? `${todayKey()} — entry`
            : "Untitled note"),
        content: "",
        createdAt: todayKey(),
        updatedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewedAt: null,
      };
      await storage.saveNote(note);
      setNotes((prev) => [...prev, note]);
      return note;
    },
    []
  );

  const updateNote = useCallback(async (note: Note) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? { ...note, updatedAt: new Date().toISOString() }
          : n
      )
    );
    await storage.saveNote({ ...note, updatedAt: new Date().toISOString() });
  }, []);

  const deleteNote = useCallback((id: string) => {
    void storage.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setLocation((loc) =>
      loc.type === "note" && loc.id === id ? { type: "home" } : loc
    );
  }, []);

  const reviewNote = useCallback(async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? markReviewed(n) : n))
    );
    const note = notes.find((n) => n.id === id);
    if (note) await storage.saveNote(markReviewed(note));
  }, [notes]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      notes,
      folders,
      location,
      refresh,
      drawerOpen,
      setDrawerOpen,
      navigate,
      createFolder,
      renameFolder,
      deleteFolder,
      createNote,
      updateNote,
      deleteNote,
      reviewNote,
    }),
    [
      ready,
      notes,
      folders,
      location,
      refresh,
      drawerOpen,
      navigate,
      createFolder,
      renameFolder,
      deleteFolder,
      createNote,
      updateNote,
      deleteNote,
      reviewNote,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}