import type { Manifest, ShotItem } from "./types";
import { moodLabel, shotPart, shotUrl } from "./types";

/** Normalize legacy local-manifest items into the generic shape. */
export function normalizeItem(raw: ShotItem): ShotItem {
  const url = shotUrl(raw);
  return {
    ...raw,
    url,
    storyPart: shotPart(raw),
    storyBeat: raw.storyBeat || raw.description || raw.id,
    exists: raw.exists ?? Boolean(url),
  };
}

export function normalizeManifest(data: Manifest): Manifest {
  const items = (data.items || []).map(normalizeItem);
  return {
    ...data,
    items,
    totalShots: items.length,
  };
}

export function uniqueFacets(
  items: ShotItem[],
  key: "storyPart" | "mood" | "category" | "stanza" | "version" | "arc"
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (key === "mood") set.add(moodLabel(item.mood));
    else if (key === "storyPart") set.add(shotPart(item));
    else if (key === "category" && item.category) set.add(item.category);
    else if (key === "stanza" && item.stanza) set.add(item.stanza);
    else if (key === "version" && item.version) set.add(item.version);
    else if (key === "arc" && item.arc) set.add(item.arc);
  }
  return [...set].filter((v) => v && v !== "—").sort((a, b) => a.localeCompare(b));
}

export function filterItems(
  items: ShotItem[],
  filters: Partial<
    Record<"storyPart" | "mood" | "category" | "stanza" | "version" | "arc", string>
  >
): ShotItem[] {
  return items.filter((item) => {
    if (filters.storyPart && shotPart(item) !== filters.storyPart) return false;
    if (filters.mood && moodLabel(item.mood) !== filters.mood) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.stanza && item.stanza !== filters.stanza) return false;
    if (filters.version && item.version !== filters.version) return false;
    if (filters.arc && item.arc !== filters.arc) return false;
    return true;
  });
}

export async function loadCatalog(): Promise<Manifest> {
  const remote = process.env.NEXT_PUBLIC_CATALOG_URL;
  if (remote) {
    const res = await fetch(remote, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    return normalizeManifest(await res.json());
  }
  // Local fallback (bundled at build time)
  const local = await import("@/public/data/manifest.json");
  return normalizeManifest(local.default as Manifest);
}
