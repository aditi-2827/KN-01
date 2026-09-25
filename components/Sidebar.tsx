"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Cloud,
  Download,
  FilePlus2,
  Flame,
  FolderPlus,
  NotebookPen,
  RefreshCw,
  Search,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { useReminder, formatTime } from "@/lib/reminder";
import { computeStreak } from "@/lib/streak";
import { triggerSync, useSyncStatus } from "@/lib/sync/engine";
import { downloadBackup, readBackupFile, restoreBackup } from "@/lib/backup";
import { ActionModal, FileTree, type FileTreeAction } from "./FileTree";
import { ProfileAvatar } from "./ProfileAvatar";
import { ThemePicker } from "./ThemePicker";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={
        on
          ? "relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-clay-600 transition-colors"
          : "relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-paper-300 transition-colors"
      }
    >
      <span
        className={
          on
            ? "absolute top-0.5 left-[18px] h-4 w-4 rounded-full bg-paper-50 shadow transition-all"
            : "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-paper-50 shadow transition-all"
        }
      />
    </button>
  );
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { navigate, createNote, createFolder, ready, notes, location, refresh } =
    useApp();
  const { reminder, setReminder, permission } = useReminder();
  const sync = useSyncStatus();
  const [action, setAction] = useState<FileTreeAction | null>(null);
  const [query, setQuery] = useState("");
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (location.type !== "search") setQuery("");
  }, [location]);

  const streak = useMemo(() => computeStreak(notes), [notes]);

  function handleQuery(value: string) {
    setQuery(value);
    if (value.trim()) {
      navigate({ type: "search", query: value });
      onNavigate();
    } else {
      navigate({ type: "home" });
    }
  }

  function handleBackup() {
    setBackupMsg(null);
    void downloadBackup()
      .then(() => setBackupMsg("Backup saved to your downloads"))
      .catch(() => setBackupMsg("Couldn’t create the backup"));
  }

  function handleRestoreFile(file: File | undefined) {
    if (!file) return;
    setBackupMsg(null);
    void readBackupFile(file)
      .then(restoreBackup)
      .then(async (result) => {
        await refresh();
        setBackupMsg(
          `Restored ${result.counts.notes} notes and ${result.counts.folders} folders`
        );
      })
      .catch((err: unknown) => {
        setBackupMsg(
          err instanceof Error ? err.message : "Couldn’t restore that backup"
        );
      });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <ProfileAvatar showRemove={false} />
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              setQuery("");
              navigate({ type: "home" });
              onNavigate();
            }}
          >
            <span className="block truncate font-serif text-lg leading-tight font-bold">
              My Journal
            </span>
            <span className="block truncate font-sans text-[11px] text-ink-500">
              daily knowledge log
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <ThemePicker />
          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={onNavigate}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-2 px-4 pb-4">
        <div className="relative">
          <Search
            size={15}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-300"
          />
          <input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Search notes…"
            className="input pl-9"
          />
        </div>

        <button
          type="button"
          className="btn-primary w-full justify-start"
          disabled={!ready}
          onClick={() =>
            void createNote("journal", null).then((note) => {
              navigate({ type: "note", id: note.id });
              onNavigate();
            })
          }
        >
          <NotebookPen size={16} />
          New journal entry
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn-soft w-full"
            disabled={!ready}
            onClick={() => setAction({ kind: "create-note", folderId: null, parentName: "Root" })}
          >
            <FilePlus2 size={16} />
            Note
          </button>
          <button
            type="button"
            className="btn-soft w-full"
            disabled={!ready}
            onClick={() => setAction({ kind: "create-folder", parentId: null, parentName: "Root" })}
          >
            <FolderPlus size={16} />
            Folder
          </button>
        </div>

        {streak.current > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2">
            <Flame size={15} className="shrink-0 text-clay-600" />
            <span className="font-sans text-xs text-ink-700">
              {streak.current}-day streak
            </span>
            {streak.best > streak.current && (
              <span className="ml-auto font-sans text-[11px] text-ink-300">
                best {streak.best}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2.5">
          <Bell size={15} className="shrink-0 text-clay-600" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-xs font-medium text-ink-700">
              {reminder.enabled ? `Reminder ${formatTime(reminder.time)}` : "Daily reminder"}
            </p>
            {reminder.enabled && (
              <p className="truncate font-sans text-[11px] text-ink-300">
                {permission === "granted"
                  ? "notifications on"
                  : permission === "default"
                    ? "allow notifications to be notified"
                    : permission === "denied"
                      ? "notifications blocked in browser"
                      : "notifications unavailable here"}
              </p>
            )}
          </div>
          <input
            type="time"
            value={reminder.time}
            disabled={!reminder.enabled}
            onChange={(e) => {
              if (e.target.value) setReminder({ ...reminder, time: e.target.value });
            }}
            className="w-24 shrink-0 rounded-lg border border-paper-300 bg-paper-100 px-2 py-1 font-sans text-xs text-ink-700 outline-none focus:ring-2 focus:ring-clay-600/15 disabled:opacity-50"
          />
          <Toggle
            on={reminder.enabled}
            onToggle={() => setReminder({ ...reminder, enabled: !reminder.enabled })}
          />
        </div>
      </div>

      <div className="mx-4 flex items-center gap-2 px-1 pb-2">
        <span className="font-sans text-[11px] tracking-wide text-ink-500 uppercase">
          Storage
        </span>
        <span className="h-px flex-1 bg-paper-300" />
      </div>

      <div className="mx-4 mb-2 flex items-center gap-2.5 rounded-xl border border-paper-300 bg-paper-50 px-3 py-2">
        <span
          className={`shrink-0 ${
            sync.status === "offline"
              ? "text-ink-300"
              : sync.status === "error"
                ? "text-red-600"
                : "text-clay-600"
          }`}
        >
          {sync.status === "offline" ? (
            <WifiOff size={15} />
          ) : sync.status === "syncing" ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Cloud size={15} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-xs font-medium text-ink-700">
            {!sync.enabled
              ? "This device only"
              : sync.status === "syncing"
                ? "Syncing…"
                : sync.status === "offline"
                  ? `Offline — ${sync.pending} pending`
                  : sync.status === "error"
                    ? "Sync failed"
                    : "Synced"}
          </p>
          <p className="truncate font-sans text-[11px] text-ink-300">
            {sync.error ??
              (sync.lastSyncAt
                ? `last ${new Date(sync.lastSyncAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "your data lives on this device")}
          </p>
        </div>
        {sync.enabled && (
          <button
            type="button"
            className="icon-btn shrink-0"
            title="Sync now"
            aria-label="Sync now"
            onClick={() => void triggerSync()}
          >
            <RefreshCw
              size={14}
              className={sync.status === "syncing" ? "animate-spin" : ""}
            />
          </button>
        )}
      </div>

      <div className="mx-4 mb-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-soft w-full"
          onClick={handleBackup}
          title="Download all notes and folders as a JSON file"
        >
          <Download size={16} />
          Backup
        </button>
        <button
          type="button"
          className="btn-soft w-full"
          onClick={() => fileRef.current?.click()}
          title="Replace this device's data with a backup file"
        >
          <Upload size={16} />
          Restore
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            handleRestoreFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {backupMsg && (
        <p className="mx-4 mb-2 font-sans text-[11px] text-ink-500">
          {backupMsg}
        </p>
      )}

      <div className="mx-4 flex items-center gap-2 px-1 pb-2">
        <span className="font-sans text-[11px] tracking-wide text-ink-500 uppercase">
          Files
        </span>
        <span className="h-px flex-1 bg-paper-300" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <FileTree />
      </nav>

      <ActionModal
        action={action}
        onClose={() => setAction(null)}
        onConfirm={(value) => {
          if (!action) return;
          if (action.kind === "create-note") {
            void createNote("note", action.folderId, value).then((note) => {
              navigate({ type: "note", id: note.id });
              onNavigate();
            });
          } else if (action.kind === "create-folder") {
            void createFolder(value, action.parentId);
          } else {
            setAction(action);
          }
        }}
      />
    </div>
  );
}