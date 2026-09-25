"use client";

import { Folder as FolderIcon, Home, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/AppContext";

export function BottomNav() {
  const { location, navigate, drawerOpen, setDrawerOpen } = useApp();

  const items = [
    {
      key: "home",
      label: "Today",
      icon: Home,
      active: location.type === "home",
      onClick: () => navigate({ type: "home" }),
    },
    {
      key: "files",
      label: "Files",
      icon: FolderIcon,
      active: drawerOpen || location.type === "folder",
      onClick: () => setDrawerOpen(!drawerOpen),
    },
    {
      key: "review",
      label: "Review",
      icon: RotateCcw,
      active: location.type === "review",
      onClick: () => navigate({ type: "review" }),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-300 bg-paper-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-sans font-medium transition-colors ${
              item.active ? "text-clay-600" : "text-ink-500"
            }`}
            onClick={item.onClick}
          >
            <item.icon size={19} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}