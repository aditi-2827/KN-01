"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { THEMES, useTheme } from "@/lib/theme";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        title="Choose a color theme"
        aria-label="Choose theme"
        aria-expanded={open}
      >
        <Palette size={17} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute top-11 right-0 z-50 w-60 rounded-2xl border border-paper-300 bg-paper-50 p-1.5 shadow-xl"
            role="menu"
          >
            <p className="px-2.5 pt-1.5 pb-1 font-sans text-[11px] tracking-wide text-ink-500 uppercase">
              Color themes
            </p>
            {THEMES.map((t) => {
              const active = t.id === theme.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={
                    active
                      ? "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors bg-clay-100"
                      : "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-paper-200"
                  }
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                >
                  <span className="flex shrink-0 gap-[3px]">
                    {t.swatches.map((c) => (
                      <span
                        key={t.id + c}
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="font-sans text-sm font-medium text-ink-900">
                    {t.name}
                  </span>
                  {active && (
                    <Check size={15} className="ml-auto shrink-0 text-clay-600" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}