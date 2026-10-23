"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { X, Download, Check } from "lucide-react";
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

export function ImageLightbox({
  src,
  alt,
  itemId,
  feedback,
  onFeedback,
  onClose,
}: ImageLightboxProps) {
  const [note, setNote] = useState(feedback?.note || "");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isKept = feedback?.action === "keep";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in textarea
      if (e.target instanceof HTMLTextAreaElement) {
        // Cmd/Ctrl+Enter to save
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          if (onFeedback) {
            onFeedback(feedback?.action ?? null, note || undefined);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }
        }
        return;
      }

      if (e.key === "Escape") onClose();
      
      if (onFeedback) {
        if (e.key === "k" || e.key === "K") {
          onFeedback(isKept ? null : "keep", note || undefined);
        }
        if (e.key === "c" || e.key === "C") {
          textareaRef.current?.focus();
        }
      }
    },
    [onClose, onFeedback, isKept, note, feedback?.action]
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
    setSaved(false);
  }, [itemId, feedback?.note]);

  // Auto-save note on blur
  const handleBlur = () => {
    if (!onFeedback) return;
    if (note !== (feedback?.note || "")) {
      onFeedback(feedback?.action ?? null, note || undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt.replace(/[^a-z0-9]/gi, "-") + ".png";
    link.click();
  };

  const toggleKeep = () => {
    if (!onFeedback) return;
    onFeedback(isKept ? null : "keep", note || undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 bg-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Keep button + Comment input */}
        {onFeedback ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={toggleKeep}
              className={clsx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition shrink-0",
                isKept
                  ? "bg-keep text-bone"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              title="Mark as keep (K)"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Keep</span>
            </button>

            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleBlur}
                placeholder="Comment... (reroll notes, issues, etc.)"
                className="w-full h-9 px-3 py-2 text-sm text-bone bg-white/10 border border-white/10 rounded-lg placeholder:text-white/40 focus:outline-none focus:border-gold-warm/50 focus:bg-white/15 resize-none leading-5"
                rows={1}
              />
              {saved && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-400">
                  Saved
                </span>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
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
            ? "K=Keep · C=Comment · ⌘Enter=Save · ESC=Close"
            : "Press ESC or click image to close"}
        </p>
      </div>
    </div>
  );
}
