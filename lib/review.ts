import type { Note } from "./types";
import { addDaysKey, daysBetween, todayKey } from "./dates";

export const REVIEW_INTERVALS_DAYS = [2, 7, 30] as const;

export const REVIEW_INTERVAL_OPTIONS = [
  { label: "2 days", value: "2" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
];

// Base = last review (or creation if never reviewed).
// Interval grows: 2d -> 7d -> 30d -> stays 30d after the 3rd review.
export function nextReviewDate(note: Note): string {
  const base = note.lastReviewedAt ?? note.createdAt;
  const idx = Math.min(
    note.reviewCount,
    REVIEW_INTERVALS_DAYS.length - 1
  );
  return addDaysKey(base, REVIEW_INTERVALS_DAYS[idx]);
}

export function isDue(note: Note, today: string = todayKey()): boolean {
  return today >= nextReviewDate(note);
}

export function dueEntries(
  notes: Note[],
  today: string = todayKey()
): Note[] {
  return notes
    .filter((n) => n.kind === "journal" && isDue(n, today))
    .sort(
      (a, b) =>
        daysBetween(nextReviewDate(a), today) -
        daysBetween(nextReviewDate(b), today)
    );
}

export function markReviewed(note: Note, today: string = todayKey()): Note {
  return {
    ...note,
    reviewCount: note.reviewCount + 1,
    lastReviewedAt: today,
    updatedAt: new Date().toISOString(),
  };
}