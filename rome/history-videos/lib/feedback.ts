import type { FeedbackStore, Manifest } from "./types";

const STORAGE_KEY = "rome-viewer-feedback-v1";

export function loadFeedback(): FeedbackStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFeedback(store: FeedbackStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function setFeedback(
  store: FeedbackStore,
  id: string,
  action: FeedbackStore[string]["action"],
  note?: string
): FeedbackStore {
  const next = {
    ...store,
    [id]: { action, note, updatedAt: new Date().toISOString() },
  };
  saveFeedback(next);
  return next;
}

export function exportFeedback(manifest: Manifest, feedback: FeedbackStore) {
  const payload = {
    exportedAt: new Date().toISOString(),
    decisions: manifest.items.map((item) => ({
      id: item.id,
      filename: item.filename,
      shotNumber: item.shotNumber,
      storyPart: item.storyPart,
      feedback: feedback[item.id] ?? null,
      reviewStatus: item.review?.status ?? "unreviewed",
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `frame-feedback-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyPrompt(prompt: string) {
  return navigator.clipboard.writeText(prompt);
}
