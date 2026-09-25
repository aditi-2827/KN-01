"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/AppContext";
import type { Note } from "@/lib/types";
import { dateKey } from "@/lib/dates";

const CELL = 12;
const GAP = 3;
const ROWS = 7;

function heatVar(count: number): string {
  const level = count <= 0 ? 0 : Math.min(count, 5);
  return `var(--heat-${level})`;
}

export function Heatmap({ notes }: { notes: Note[] }) {
  const { navigate } = useApp();

  const days = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((n) => {
      if (n.createdAt) {
        counts.set(n.createdAt, (counts.get(n.createdAt) ?? 0) + 1);
      }
    });

    const today = new Date();
    const days: { key: string; count: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      days.push({ key, count: counts.get(key) ?? 0 });
    }
    return days;
  }, [notes]);

  const weeks = useMemo(() => {
    const cols: { key: string; count: number }[][] = [];
    for (let i = 0; i < days.length; i += ROWS) {
      cols.push(days.slice(i, i + ROWS));
    }
    while (cols[cols.length - 1].length < ROWS) {
      cols[cols.length - 1].push({ key: "", count: 0 });
    }
    return cols;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { x: number; text: string }[] = [];
    let lastMonth = "";
    weeks.forEach((col, w) => {
      const first = col.find((c) => c.key);
      if (!first) return;
      const month = first.key.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        labels.push({
          x: w * (CELL + GAP),
          text: new Date(
            Number(first.key.slice(0, 4)),
            Number(first.key.slice(5, 7)) - 1,
            1
          ).toLocaleDateString(undefined, { month: "short" }),
        });
      }
    });
    return labels;
  }, [weeks]);

  const total = useMemo(() => days.reduce((s, d) => s + d.count, 0), [days]);
  const activeDays = useMemo(
    () => days.filter((d) => d.count > 0).length,
    [days]
  );

  function openDay(key: string) {
    const entry = [...notes]
      .reverse()
      .find((n) => n.kind === "journal" && n.createdAt === key);
    if (entry) navigate({ type: "note", id: entry.id });
  }

  const width = weeks.length * (CELL + GAP) - GAP + 1;
  const height = ROWS * (CELL + GAP) - GAP + 1;

  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <div>
          <p className="font-serif text-lg font-bold text-ink-900">
            {total} entries written
          </p>
          <p className="font-sans text-xs text-ink-500">
            over the last year · {activeDays} active days
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <svg
          width={width}
          height={height + 18}
          role="img"
          aria-label="Heatmap of writing activity for the last 365 days"
        >
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={m.x}
              y={10}
              fontSize="9"
              style={{ fill: "var(--color-ink-500)" }}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {m.text}
            </text>
          ))}
          {weeks.map((col, w) =>
            col.map((d, r) => {
              if (!d.key) return null;
              return (
                <rect
                  key={d.key}
                  x={w * (CELL + GAP)}
                  y={16 + r * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  style={{ fill: heatVar(d.count) }}
                  className={d.count > 0 ? "cursor-pointer" : undefined}
                  onClick={() => openDay(d.key)}
                >
                  <title>
                    {d.key}: {d.count} {d.count === 1 ? "entry" : "entries"}
                  </title>
                </rect>
              );
            })
          )}
        </svg>
      </div>

      <div className="flex items-center justify-end gap-1 pt-1 font-sans text-[10px] text-ink-500">
        Less
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: `var(--heat-${level})` }}
          />
        ))}
        More
      </div>
    </div>
  );
}