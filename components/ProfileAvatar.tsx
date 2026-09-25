"use client";

import { useRef, useState } from "react";
import { Camera, UserRound, X } from "lucide-react";
import { fileToAvatarDataUrl, isSafeImage } from "@/lib/media";

const STORAGE_KEY = "journal-avatar";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function ProfileAvatar() {
  const [src, setSrc] = useState<string | null>(readStored);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(await isSafeImage(file))) {
      window.alert("Choose a JPG, PNG, or WebP image under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setSrc(dataUrl);
      try {
        localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch {
        /* storage full — keep in memory only */
      }
    } catch {
      window.alert("That image could not be used as a profile picture.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setSrc(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="group relative block h-10 w-10 cursor-pointer overflow-hidden rounded-2xl border border-paper-300 bg-paper-100 shadow-sm"
        onClick={() => inputRef.current?.click()}
        title="Click to set your profile picture"
        aria-label="Set profile picture"
      >
        {src ? (
          <img
            src={src}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-clay-600">
            <UserRound size={22} />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera size={16} />
        </span>
      </button>

      {src && (
        <button
          type="button"
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-paper-300 bg-paper-50 text-ink-500 shadow hover:text-red-600"
          title="Remove profile picture"
          aria-label="Remove profile picture"
          onClick={clear}
        >
          <X size={10} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        disabled={busy}
      />
    </div>
  );
}