"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { FeedbackAction, ShotItem } from "@/lib/types";
import { shotUrl } from "@/lib/types";

export type ThumbSize = "S" | "M" | "L" | "XL";

export const THUMB_SIZES: {
  id: ThumbSize;
  label: string;
  width: string;
  sizesAttr: string;
}[] = [
  { id: "S", label: "S", width: "4.25rem", sizesAttr: "68px" },
  { id: "M", label: "M", width: "6.5rem", sizesAttr: "104px" },
  { id: "L", label: "L", width: "9rem", sizesAttr: "144px" },
  { id: "XL", label: "XL", width: "12rem", sizesAttr: "192px" },
];

interface ThumbnailStripProps {
  items: ShotItem[];
  currentIndex: number;
  feedback: Record<string, { action: FeedbackAction }>;
  onSelect: (index: number) => void;
  size: ThumbSize;
  onSizeChange: (size: ThumbSize) => void;
}

function ringFor(action?: FeedbackAction, active?: boolean) {
  if (active) return "ring-2 ring-gold-warm";
  if (action === "keep") return "ring-2 ring-keep";
  if (action === "discard") return "ring-2 ring-discard opacity-45";
  if (action === "reroll") return "ring-2 ring-reroll";
  return "ring-1 ring-white/10";
}

export function ThumbnailStrip({
  items,
  currentIndex,
  feedback,
  onSelect,
  size,
  onSizeChange,
}: ThumbnailStripProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const sizeMeta = THUMB_SIZES.find((s) => s.id === size) ?? THUMB_SIZES[1];

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentIndex, size]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs text-bone-muted">{items.length} frames</p>
        <div
          className="inline-flex rounded-full border border-white/10 bg-indigo-mid/40 p-0.5"
          role="group"
          aria-label="Thumbnail size"
        >
          {THUMB_SIZES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSizeChange(option.id)}
              className={clsx(
                "h-8 min-w-8 rounded-full px-2 text-xs font-semibold",
                size === option.id
                  ? "bg-gold-warm text-indigo-deep"
                  : "text-bone-muted active:bg-white/5"
              )}
              aria-pressed={size === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="thumb-scroller -mx-4 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
        <div className="flex w-max gap-2">
          {items.map((item, index) => {
            const action = feedback[item.id]?.action;
            const isActive = currentIndex === index;
            return (
              <button
                key={item.id}
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(index)}
                style={{ width: sizeMeta.width }}
                className={clsx(
                  "relative shrink-0 snap-center overflow-hidden rounded-md",
                  ringFor(action, isActive)
                )}
                aria-current={isActive ? "true" : undefined}
                aria-label={`Shot ${item.shotNumber}`}
              >
                <div className="relative aspect-video w-full bg-indigo-mid/40">
                  {shotUrl(item) ? (
                    <Image
                      src={shotUrl(item)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes={sizeMeta.sizesAttr}
                      loading={index < 10 ? "eager" : "lazy"}
                    />
                  ) : null}
                </div>
                <span className="absolute bottom-0.5 left-1 font-mono text-[10px] text-white/90 drop-shadow">
                  {String(item.shotNumber).padStart(2, "0")}
                </span>
                {action ? (
                  <span
                    className={clsx(
                      "absolute right-0.5 top-0.5 rounded px-1 text-[9px] font-bold uppercase",
                      action === "keep" && "bg-keep text-bone",
                      action === "discard" && "bg-discard text-bone",
                      action === "reroll" && "bg-gold-warm text-indigo-deep"
                    )}
                  >
                    {action[0]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
