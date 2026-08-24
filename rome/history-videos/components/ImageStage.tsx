"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { ShotItem } from "@/lib/types";
import { moodLabel, shotUrl } from "@/lib/types";

interface ImageStageProps {
  item: ShotItem;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function ImageStage({
  item,
  index,
  total,
  onPrev,
  onNext,
}: ImageStageProps) {
  const touchX = useRef<number | null>(null);

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-xs text-bone-muted">
            {String(item.shotNumber).padStart(2, "0")} / {total}
            <span className="mx-1.5 text-white/20">·</span>
            {moodLabel(item.mood)}
          </p>
          <p className="truncate text-sm text-bone/80">{item.storyPart}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <NavButton onClick={onPrev} label="Previous" disabled={index === 0}>
            <ChevronLeft size={22} />
          </NavButton>
          <NavButton
            onClick={onNext}
            label="Next"
            disabled={index === total - 1}
          >
            <ChevronRight size={22} />
          </NavButton>
        </div>
      </div>

      <div
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40 touch-pan-y"
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) < 48) return;
          if (dx < 0) onNext();
          else onPrev();
        }}
      >
        {shotUrl(item) ? (
          <Image
            src={shotUrl(item)}
            alt={item.description || item.id}
            fill
            className="object-contain"
            sizes="100vw"
            priority
            draggable={false}
          />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-bone-muted">
            Missing: {item.filename || item.id}
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-indigo-mid/60 text-bone active:bg-white/10 disabled:opacity-25"
    >
      {children}
    </button>
  );
}
