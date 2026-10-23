"use client";

import clsx from "clsx";
import { Check, Copy, Download, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FeedbackAction } from "@/lib/types";

interface FeedbackToolbarProps {
  currentAction: FeedbackAction;
  onAction: (action: FeedbackAction) => void;
  onExport: () => void;
  onCopyPrompt: () => void;
  copied: boolean;
  stats: { keep: number; discard: number; reroll: number; pending: number };
}

const actions: {
  key: NonNullable<FeedbackAction>;
  label: string;
  icon: typeof Check;
  activeClass: string;
}[] = [
  {
    key: "discard",
    label: "Discard",
    icon: Trash2,
    activeClass: "bg-discard text-bone",
  },
  {
    key: "reroll",
    label: "Reroll",
    icon: RotateCcw,
    activeClass: "bg-reroll text-bone",
  },
  {
    key: "keep",
    label: "Keep",
    icon: Check,
    activeClass: "bg-keep text-bone",
  },
];

export function FeedbackToolbar({
  currentAction,
  onAction,
  onExport,
  onCopyPrompt,
  copied,
  stats,
}: FeedbackToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-indigo-deep/95 px-3 pt-2 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          {actions.map(({ key, label, icon: Icon, activeClass }) => {
            const active = currentAction === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onAction(active ? null : key)}
                className={clsx(
                  "inline-flex h-12 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition",
                  active
                    ? activeClass
                    : "border border-white/15 bg-indigo-mid/50 text-bone active:bg-white/10"
                )}
              >
                <Icon size={18} strokeWidth={2.25} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-indigo-mid/50 text-bone active:bg-white/10"
          >
            <MoreHorizontal size={20} />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-indigo-mid shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-bone active:bg-white/10"
                  onClick={() => {
                    onCopyPrompt();
                    setMenuOpen(false);
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy prompt"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-3 text-left text-sm text-bone active:bg-white/10"
                  onClick={() => {
                    onExport();
                    setMenuOpen(false);
                  }}
                >
                  <Download size={16} />
                  Export JSON
                </button>
                <p className="border-t border-white/10 px-3 py-2 text-[11px] text-bone-muted">
                  {stats.keep}k · {stats.discard}d · {stats.reroll}r ·{" "}
                  {stats.pending} left
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
