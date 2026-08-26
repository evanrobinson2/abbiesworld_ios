"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedbackAction, FeedbackStore, Manifest } from "@/lib/types";
import { shotBeat, shotPart, shotUrl } from "@/lib/types";
import {
  filterItems,
  normalizeManifest,
  uniqueFacets,
} from "@/lib/catalog";
import {
  copyPrompt,
  exportFeedback,
  loadFeedback,
  setFeedback,
} from "@/lib/feedback";
import { DetailTabs } from "./DetailTabs";
import { FacetBar } from "./FacetBar";
import { FeedbackToolbar } from "./FeedbackToolbar";
import { ImageStage } from "./ImageStage";
import { ThumbnailStrip, type ThumbSize } from "./ThumbnailStrip";

const THUMB_SIZE_KEY = "rome-viewer-thumb-size-v1";

interface ViewerShellProps {
  /** Optional SSR/local seed; if NEXT_PUBLIC_CATALOG_URL is set, client refetches. */
  initialManifest: Manifest;
}

function loadThumbSize(): ThumbSize {
  if (typeof window === "undefined") return "M";
  const raw = localStorage.getItem(THUMB_SIZE_KEY);
  if (raw === "S" || raw === "M" || raw === "L" || raw === "XL") return raw;
  return "M";
}

export function ViewerShell({ initialManifest }: ViewerShellProps) {
  const [manifest, setManifest] = useState(() =>
    normalizeManifest(initialManifest)
  );
  const [index, setIndex] = useState(0);
  const [feedback, setFeedbackState] = useState<FeedbackStore>({});
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [thumbSize, setThumbSize] = useState<ThumbSize>("M");
  const [arcFilter, setArcFilter] = useState<string>();

  useEffect(() => {
    setFeedbackState(loadFeedback());
    setThumbSize(loadThumbSize());
    setMounted(true);

    const remote = process.env.NEXT_PUBLIC_CATALOG_URL;
    if (!remote) return;
    fetch(remote, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setManifest(normalizeManifest(data)))
      .catch(() => {
        /* keep initial */
      });
  }, []);

  const handleThumbSize = useCallback((size: ThumbSize) => {
    setThumbSize(size);
    localStorage.setItem(THUMB_SIZE_KEY, size);
  }, []);

  const filtered = useMemo(
    () =>
      filterItems(manifest.items, { arc: arcFilter }),
    [manifest.items, arcFilter]
  );

  // Clamp index when filters change
  useEffect(() => {
    setIndex(0);
  }, [arcFilter]);

  const item = filtered[index];
  const currentAction = item ? feedback[item.id]?.action ?? null : null;

  const arcOptions = useMemo(
    () => uniqueFacets(manifest.items, "arc"),
    [manifest.items]
  );

  const stats = useMemo(() => {
    let keep = 0;
    let discard = 0;
    let reroll = 0;
    for (const entry of Object.values(feedback)) {
      if (entry.action === "keep") keep++;
      if (entry.action === "discard") discard++;
      if (entry.action === "reroll") reroll++;
    }
    return {
      keep,
      discard,
      reroll,
      pending: filtered.length - filtered.filter((i) => feedback[i.id]?.action).length,
    };
  }, [feedback, filtered]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(filtered.length - 1, i + 1));
  }, [filtered.length]);

  const handleAction = useCallback(
    (action: FeedbackAction, note?: string) => {
      if (!item) return;
      const next = setFeedback(feedback, item.id, action, note);
      setFeedbackState(next);
      if (action === "reroll" && item.prompt) {
        copyPrompt(item.prompt);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
      if (action === "keep" || action === "discard") {
        window.setTimeout(() => {
          setIndex((i) => Math.min(filtered.length - 1, i + 1));
        }, 120);
      }
    },
    [feedback, item, filtered.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "k" || e.key === "K")
        handleAction(currentAction === "keep" ? null : "keep");
      if (e.key === "d" || e.key === "D")
        handleAction(currentAction === "discard" ? null : "discard");
      if (e.key === "r" || e.key === "R")
        handleAction(currentAction === "reroll" ? null : "reroll");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, handleAction, currentAction]);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-bone-muted">
        Loading…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-bone-muted">
        No frames match these filters.
        <button
          type="button"
          className="ml-3 text-gold-warm"
          onClick={() => setArcFilter(undefined)}
        >
          Clear
        </button>
      </div>
    );
  }

  // Adapt for child components still expecting imagePath
  const viewItem = {
    ...item,
    imagePath: shotUrl(item),
    url: shotUrl(item),
    exists: Boolean(shotUrl(item)),
    storyPart: shotPart(item),
    storyBeat: shotBeat(item),
    description: shotBeat(item),
    mood:
      typeof item.mood === "string"
        ? { number: 0, name: item.mood }
        : item.mood || { number: 0, name: "—" },
    review: item.review || { status: "unreviewed" as const },
    filename: item.filename || `${item.id}.png`,
    shotNumber: item.shotNumber ?? index + 1,
    section: item.section || "",
    sectionTitle: item.sectionTitle || shotPart(item),
    sectionNarrative: item.sectionNarrative || "",
    category: item.category || "scene",
    register: item.register || "R1",
    prompt: item.prompt || "",
    version: item.version,
    versions: item.versions,
    physical: item.physical,
    context: item.context,
    tags: item.tags,
  };

  const viewItems = filtered.map((f, i) => ({
    ...f,
    imagePath: shotUrl(f),
    url: shotUrl(f),
    exists: Boolean(shotUrl(f)),
    storyPart: shotPart(f),
    storyBeat: shotBeat(f),
    description: shotBeat(f),
    mood:
      typeof f.mood === "string"
        ? { number: 0, name: f.mood }
        : f.mood || { number: 0, name: "—" },
    review: f.review || { status: "unreviewed" as const },
    filename: f.filename || `${f.id}.png`,
    shotNumber: f.shotNumber ?? i + 1,
    section: f.section || "",
    sectionTitle: f.sectionTitle || shotPart(f),
    sectionNarrative: f.sectionNarrative || "",
    category: f.category || "scene",
    register: f.register || "R1",
    prompt: f.prompt || "",
    version: f.version,
    versions: f.versions,
    physical: f.physical,
    context: f.context,
    tags: f.tags,
  }));

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-lg text-bone sm:text-xl">
            {manifest.title || "Frame review"}
          </h1>
          <p className="text-xs text-bone-muted">
            {index + 1}/{filtered.length}
            {manifest.source === "vercel-blob" ? " · blob" : ""}
          </p>
        </header>

        <FacetBar
          label="Arc"
          options={arcOptions}
          value={arcFilter}
          onChange={setArcFilter}
        />

        <ImageStage
          item={viewItem}
          index={index}
          total={filtered.length}
          onPrev={goPrev}
          onNext={goNext}
          feedback={feedback[item.id] ?? null}
          onFeedback={handleAction}
        />

        <ThumbnailStrip
          items={viewItems}
          currentIndex={index}
          feedback={feedback}
          onSelect={setIndex}
          size={thumbSize}
          onSizeChange={handleThumbSize}
        />

        <DetailTabs
          item={viewItem}
          styleSuffix={manifest.styleSuffix || ""}
        />
      </main>

      <FeedbackToolbar
        currentAction={currentAction}
        onAction={handleAction}
        onExport={() => exportFeedback(manifest, feedback)}
        onCopyPrompt={() => {
          if (!item.prompt) return;
          copyPrompt(item.prompt);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        copied={copied}
        stats={stats}
      />
    </div>
  );
}
