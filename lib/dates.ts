export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function addDaysKey(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function daysBetween(aKey: string, bKey: string): number {
  const a = parseKey(aKey).getTime();
  const b = parseKey(bKey).getTime();
  return Math.round((b - a) / 86400000);
}

export function formatReadable(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatFullToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDay(key: string): string {
  const diff = daysBetween(key, todayKey());
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatReadable(key);
}

export function formatAgo(key: string): string {
  const d = parseKey(key);
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  const abs = Math.abs(diff);
  if (abs === 0) return "today";
  if (abs === 1) return diff < 0 ? "yesterday" : "tomorrow";
  if (abs < 30) return `${abs} days ${diff < 0 ? "ago" : "from now"}`;
  return formatReadable(key);
}