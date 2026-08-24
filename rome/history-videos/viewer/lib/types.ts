/**
 * Generic frame catalog — local paths or Vercel Blob URLs.
 * Versioned assets with rich contextual + physical metadata.
 */

export type ReviewStatus = "pass" | "reject" | "flagged" | "unreviewed";
export type FeedbackAction = "keep" | "discard" | "reroll" | null;
export type VersionStatus =
  | "current"
  | "archived"
  | "rejected"
  | "superseded"
  | "flagged";

export interface Mood {
  number: number;
  name: string;
}

export interface ReviewMeta {
  status: ReviewStatus;
  notes?: string;
  rejectReason?: string;
  v2Fix?: string;
  flagged?: boolean;
}

export interface ImageVersion {
  label: string;
  status: VersionStatus;
  path?: string;
  url?: string;
  notes?: string;
  rejectReason?: string;
  createdAt?: string;
}

export interface PhysicalMeta {
  format: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fileSizeBytes?: number;
  medium?: string;
  palette?: string;
  orientation?: string;
}

export interface ContextMeta {
  era?: string;
  yearApprox?: string;
  location?: string;
  setting?: string;
  characters?: string[];
  factions?: string[];
  narrativeRole?: string;
  emotionalDirection?: string;
  scale?: string;
  framing?: string;
  vantage?: string;
  light?: string;
  weather?: string;
  withheld?: string;
  materialCulture?: string;
  continuityNotes?: string;
}

/** One reviewable still. */
export interface ShotItem {
  id: string;
  url: string;
  filename?: string;
  shotNumber?: number;
  storyPart?: string;
  storyBeat?: string;
  mood?: Mood | string;
  register?: string;
  category?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  stanza?: string;
  review?: ReviewMeta;
  archivedUrl?: string;

  /** Current version label, e.g. "v2" */
  version?: string;
  versions?: ImageVersion[];
  physical?: PhysicalMeta;
  context?: ContextMeta;

  /** @deprecated use url */
  imagePath?: string;
  section?: string;
  sectionTitle?: string;
  sectionNarrative?: string;
  archivedPath?: string;
  exists?: boolean;
}

export interface Manifest {
  generatedAt: string;
  title: string;
  styleSuffix?: string;
  totalShots: number;
  items: ShotItem[];
  source?: string;
  schemaVersion?: string;
}

export interface FeedbackEntry {
  action: FeedbackAction;
  note?: string;
  updatedAt: string;
}

export type FeedbackStore = Record<string, FeedbackEntry>;

export function moodLabel(mood?: Mood | string): string {
  if (!mood) return "—";
  if (typeof mood === "string") return mood;
  if (mood.number > 0) return `${mood.number} ${mood.name}`;
  return mood.name || "—";
}

export function shotUrl(item: ShotItem): string {
  return item.url || item.imagePath || "";
}

export function shotPart(item: ShotItem): string {
  return (
    item.storyPart ||
    (item.section && item.sectionTitle
      ? `${item.section}. ${item.sectionTitle}`
      : item.sectionTitle) ||
    "Unsorted"
  );
}

export function shotBeat(item: ShotItem): string {
  return item.storyBeat || item.description || item.id;
}
