"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "./AppContext";
import { dateKey, todayKey } from "./dates";

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM", 24h
}

interface ReminderContextValue {
  reminder: ReminderSettings;
  setReminder: (next: ReminderSettings) => void;
  now: Date;
  overdue: boolean;
  permission: string;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

const REMINDER_KEY = "journal-reminder";
const FIRED_PREFIX = "journal-notified:";
const DEFAULT_TIME = "21:00";

function loadReminder(): ReminderSettings {
  if (typeof window === "undefined") return { enabled: false, time: DEFAULT_TIME };
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      enabled: !!parsed?.enabled,
      time: typeof parsed?.time === "string" ? parsed.time : DEFAULT_TIME,
    };
  } catch {
    return { enabled: false, time: DEFAULT_TIME };
  }
}

function saveReminder(reminder: ReminderSettings) {
  try {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
  } catch {
    /* ignore */
  }
}

function parseTime(time: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function isPastTarget(now: Date, time: string): boolean {
  const target = parseTime(time);
  if (!target) return false;
  return (
    now.getHours() > target.h ||
    (now.getHours() === target.h && now.getMinutes() >= target.m)
  );
}

function formatTime(time: string): string {
  const t = parseTime(time);
  if (!t) return time;
  const h12 = t.h % 12 || 12;
  const ampm = t.h < 12 ? "AM" : "PM";
  return `${h12}:${String(t.m).padStart(2, "0")} ${ampm}`;
}

export function ReminderProvider({ children }: { children: ReactNode }) {
  const [reminder, setReminderState] = useState<ReminderSettings>(() =>
    loadReminder()
  );
  const [now, setNow] = useState<Date>(() => new Date());
  const [permission, setPermission] = useState<string>("unsupported");
  const reminderRef = useRef(reminder);
  reminderRef.current = reminder;

  const todayEntries = useApp().notes.filter(
    (n) => n.kind === "journal" && n.createdAt === todayKey()
  ).length;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!reminder.enabled) return;
    if (typeof Notification === "undefined") return;
    if (!isPastTarget(now, reminder.time)) return;
    if (todayEntries > 0) return;
    if (Notification.permission !== "granted") return;
    const key = FIRED_PREFIX + dateKey(now);
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* ignore */
    }
    try {
      new Notification("Today's entry is waiting", {
        body: "You haven't written yet — what did you learn today?",
        tag: "journal-daily",
      });
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }, [reminder.enabled, reminder.time, now, todayEntries]);

  const setReminder = useCallback((next: ReminderSettings) => {
    setReminderState(next);
    saveReminder(next);
    if (next.enabled && typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        void Notification.requestPermission()
          .then((p) => {
            setPermission(p);
            setNow(new Date());
          })
          .catch(() => {});
      }
      try {
        localStorage.removeItem(FIRED_PREFIX + dateKey(new Date()));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const overdue =
    reminder.enabled && isPastTarget(now, reminder.time) && todayEntries === 0;

  return (
    <ReminderContext.Provider
      value={{ reminder, setReminder, now, overdue, permission }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminder(): ReminderContextValue {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error("useReminder must be used inside <ReminderProvider>");
  return ctx;
}

export { formatTime };