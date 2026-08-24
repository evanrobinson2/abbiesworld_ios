"use client";

import { useEffect, useCallback, useState } from "react";
import { X, Download, Check, RotateCcw, Trash2, MessageSquare } from "lucide-react";
import clsx from "clsx";
import type { FeedbackAction, FeedbackEntry } from "@/lib/types";

interface ImageLightboxProps {
  src: string;
  alt: string;
  itemId: string;
  feedback?: FeedbackEntry | null;
  onFeedback?: (action: FeedbackAction, note?: string) => void;
  onClose: () => void;
}

const actions: {
  key: NonNullable<FeedbackAction>;
  label: string;
  icon: typeof Check;
  activeClass: string;
  shortcut: string;
}[] = [
  {
    key: "keep",
    label: "Keep",
    icon: Check,
    activeClass: "bg-keep text-bone",
    shortcut: "K",
  },
  {
    key: "reroll",
    label: "Reroll",
    icon: RotateCcw,
    activeClass: "bg-reroll text-bone",
    shortcut: "R",
  },
  {
    key: "discard",
    label: "Discard",
    icon: Trash2,
    activeClass: "bg-discard text-bone",
    shortcut: "D",
  },
];

export function ImageLightbox({
  src,
  alt,
  itemId,
  feedback,
  onFeedback,
  onClose,
}: ImageLightboxProps) {
  const [note, setNote] = useState(feedback?.note || "");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const currentAction = feedback?.action ?? null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in textarea
      if (e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          setShowNoteInput(false);
        }
        return;
      }

      if (e.key === "Escape") onClose();
      
      if (onFeedback) {
        if (e.key === "k" || e.key === "K") {
          onFeedback(currentAction === "keep" ? null : "keep", note || undefined);
        }
        if (e.key === "r" || e.key === "R") {
          onFeedback(currentAction === "reroll" ? null : "reroll", note || undefined);
        }
        if (e.key === "d" || e.key === "D") {
          onFeedback(currentAction === "discard" ? null : "discard", note || undefined);
        }
        if (e.key === "n" || e.key === "N") {
          setShowNoteInput(true);
        }
      }
    },
    [onClose, onFeedback, currentAction, note]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  // Update note when feedback changes (new image)
  useEffect(() => {
    setNote(feedback?.note || "");
    setNoteSaved(false);
  }, [itemId, feedback?.note]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt.replace(/[^a-z0-9]/gi, "-") + ".png";
    link.click();
  };

  const handleAction = (action: NonNullable<FeedbackAction>) => {
    if (!onFeedback) return;
    onFeedback(currentAction === action ? null : action, note || undefined);
  };

  const handleSaveNote = () => {
    if (!onFeedback) return;
    onFeedback(currentAction, note || undefined);
    setNoteSaved(true);
    setShowNoteInput(false);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 bg-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Review actions */}
        {onFeedback ? (
          <div className="flex items-center gap-2">
            {actions.map(({ key, label, icon: Icon, activeClass, shortcut }) => {
              const active = currentAction === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleAction(key)}
                  className={clsx(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                    active
                      ? activeClass
                      : "bg-white/10 text-white hover:bg-white/20"
                  )}
                  title={`${label} (${shortcut})`}
                >
                  <Icon size={16} strokeWidth={2.25} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}

            {/* Note button */}
            <button
              type="button"
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={clsx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
                showNoteInput || note
                  ? "bg-gold-warm/80 text-bone"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              title="Add note (N)"
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Note</span>
              {note && !showNoteInput && (
                <span className="ml-1 h-2 w-2 rounded-full bg-gold-warm" />
              )}
            </button>

            {noteSaved && (
              <span className="text-xs text-green-400 animate-pulse">Saved</span>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Download"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close (ESC)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Note input panel */}
      {showNoteInput && (
        <div
          className="px-4 py-3 bg-indigo-deep/90 border-b border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-2xl mx-auto">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add review notes... (e.g., 'face looks wrong, too medieval' or 'perfect composition')"
              className="w-full h-20 px-3 py-2 text-sm text-bone bg-black/30 border border-white/20 rounded-lg placeholder:text-bone-muted/50 focus:outline-none focus:border-gold-warm/50 resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-bone-muted">
                Press ESC to cancel · Notes are saved with your feedback
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNoteInput(false)}
                  className="px-3 py-1.5 text-xs text-bone-muted hover:text-bone transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-3 py-1.5 text-xs bg-gold-warm/80 text-bone rounded-md hover:bg-gold-warm transition-colors"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image container */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={onClose}
        />
      </div>

      {/* Bottom caption */}
      <div
        className="px-4 py-3 bg-black/50 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-white/70 truncate">{alt}</p>
        <p className="text-xs text-white/40 mt-1">
          {onFeedback
            ? "K=Keep · R=Reroll · D=Discard · N=Note · ESC=Close"
            : "Press ESC or click image to close"}
        </p>
      </div>
    </div>
  );
}
