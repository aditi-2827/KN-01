import type { Note } from "./types";
import { addDaysKey, todayKey } from "./dates";

export interface Streak {
  current: number;
  best: number;
}

export function computeStreak(notes: Note[], today: string = todayKey()): Streak {
  const days = new Set(
    notes.filter((n) => n.kind === "journal").map((n) => n.createdAt)
  );
  if (days.size === 0) return { current: 0, best: 0 };

  const keys = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === addDaysKey(keys[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  let cursor = days.has(today) ? today : addDaysKey(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDaysKey(cursor, -1);
  }

  return { current, best: Math.max(best, current) };
}