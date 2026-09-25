"use client";

import { useEffect } from "react";
import { AppProvider, useApp } from "@/lib/AppContext";
import { ThemeProvider } from "@/lib/theme";
import { ReminderProvider } from "@/lib/reminder";
import { Sidebar } from "./Sidebar";
import { TodayView } from "./TodayView";
import { NoteView } from "./NoteView";
import { FolderView } from "./FolderView";
import { RevisionPanel } from "./RevisionPanel";
import { SearchView } from "./SearchView";
import { BottomNav } from "./BottomNav";
import { X } from "lucide-react";

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="font-serif text-lg text-ink-500">Opening your journal…</p>
    </div>
  );
}

function Main() {
  const { location } = useApp();

  switch (location.type) {
    case "note":
      return <NoteView noteId={location.id} />;
    case "folder":
      return <FolderView folderId={location.id} />;
    case "search":
      return <SearchView query={location.query} />;
    case "review":
      return (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Revision
            </h1>
            <p className="mt-1 font-sans text-sm text-ink-500">
              Entries due for a second look.
            </p>
          </div>
          <section className="card px-5 py-4">
            <RevisionPanel />
          </section>
        </div>
      );
    default:
      return <TodayView />;
  }
}

function Shell() {
  const { ready, drawerOpen, setDrawerOpen } = useApp();

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!ready) return <Loading />;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-paper-300 bg-paper-50/80 backdrop-blur lg:block">
        <Sidebar onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-paper-300 bg-paper-100 shadow-xl">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile drawer close for Android back-gesture clarity */}
      {drawerOpen && (
        <button
          type="button"
          className="fixed top-3 left-3 z-40 rounded-full border border-paper-300 bg-paper-50 p-2 text-ink-700 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close files"
        >
          <X size={16} />
        </button>
      )}

      {/* Main */}
      <main className="px-4 pt-6 pb-24 md:px-8 lg:ml-72 lg:pb-12">
        <div className="mx-auto max-w-4xl">
          <Main />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function JournalApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ReminderProvider>
          <Shell />
        </ReminderProvider>
      </AppProvider>
    </ThemeProvider>
  );
}