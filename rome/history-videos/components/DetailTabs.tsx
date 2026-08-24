"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { ShotItem } from "@/lib/types";
import { moodLabel } from "@/lib/types";

type TabId = "details" | "context" | "physical" | "story" | "prompt" | "review";

interface DetailTabsProps {
  item: ShotItem;
  styleSuffix: string;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "context", label: "Context" },
  { id: "physical", label: "Physical" },
  { id: "story", label: "Story" },
  { id: "prompt", label: "Prompt" },
  { id: "review", label: "Review" },
];

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (children === undefined || children === null || children === "") return null;
  return (
    <div className="grid gap-0.5 border-b border-white/5 py-2.5 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-bone-muted">
        {label}
      </dt>
      <dd className="text-sm leading-snug text-bone">{children}</dd>
    </div>
  );
}

function bytes(n?: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function DetailTabs({ item, styleSuffix }: DetailTabsProps) {
  const [active, setActive] = useState<TabId>("details");

  useEffect(() => {
    setActive("details");
  }, [item.id]);

  const ctx = item.context;
  const phys = item.physical;

  return (
    <div className="rounded-xl border border-white/10 bg-indigo-mid/25">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={clsx(
              "h-9 shrink-0 rounded-lg px-3 text-sm font-medium",
              active === tab.id
                ? "bg-white/10 text-bone"
                : "text-bone-muted active:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-72 overflow-y-auto p-4">
        {active === "details" && (
          <dl>
            <DetailRow label="ID">
              <code className="text-xs">{item.id}</code>
            </DetailRow>
            <DetailRow label="Version">
              <span className="font-semibold text-gold-warm">
                {item.version || "v1"}
              </span>
              {item.versions && item.versions.length > 1
                ? ` · ${item.versions.length} versions on file`
                : null}
            </DetailRow>
            <DetailRow label="Part">{item.storyPart}</DetailRow>
            <DetailRow label="Mood">{moodLabel(item.mood)}</DetailRow>
            <DetailRow label="Register">{item.register}</DetailRow>
            <DetailRow label="Category">{item.category}</DetailRow>
            <DetailRow label="File">
              <code className="break-all text-xs">{item.filename}</code>
            </DetailRow>
            {item.tags?.length ? (
              <DetailRow label="Tags">{item.tags.join(" · ")}</DetailRow>
            ) : null}
            {item.versions && item.versions.length > 0 ? (
              <DetailRow label="History">
                <ul className="space-y-1">
                  {item.versions.map((v) => (
                    <li key={v.label} className="text-xs">
                      <span className="font-mono text-gold-warm">{v.label}</span>
                      {" — "}
                      {v.status}
                      {v.rejectReason ? ` (${v.rejectReason})` : ""}
                      {v.path ? (
                        <>
                          {" · "}
                          <a
                            href={v.url || `/${v.path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-bone-muted underline-offset-2 hover:underline"
                          >
                            open
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </DetailRow>
            ) : null}
          </dl>
        )}

        {active === "context" && (
          <dl>
            <DetailRow label="Era">{ctx?.era}</DetailRow>
            <DetailRow label="Year">{ctx?.yearApprox}</DetailRow>
            <DetailRow label="Location">{ctx?.location}</DetailRow>
            <DetailRow label="Setting">{ctx?.setting}</DetailRow>
            <DetailRow label="Characters">
              {ctx?.characters?.join(", ")}
            </DetailRow>
            <DetailRow label="Factions">{ctx?.factions?.join(", ")}</DetailRow>
            <DetailRow label="Role">{ctx?.narrativeRole}</DetailRow>
            <DetailRow label="Emotion">{ctx?.emotionalDirection}</DetailRow>
            <DetailRow label="Scale">{ctx?.scale}</DetailRow>
            <DetailRow label="Framing">{ctx?.framing}</DetailRow>
            <DetailRow label="Vantage">{ctx?.vantage}</DetailRow>
            <DetailRow label="Light">{ctx?.light}</DetailRow>
            <DetailRow label="Weather">{ctx?.weather}</DetailRow>
            <DetailRow label="Withheld">{ctx?.withheld}</DetailRow>
            <DetailRow label="Material">{ctx?.materialCulture}</DetailRow>
            <DetailRow label="Continuity">{ctx?.continuityNotes}</DetailRow>
            {!ctx && (
              <p className="text-sm text-bone-muted">No context metadata.</p>
            )}
          </dl>
        )}

        {active === "physical" && (
          <dl>
            <DetailRow label="Format">{phys?.format}</DetailRow>
            <DetailRow label="Size">
              {phys?.width && phys?.height
                ? `${phys.width} × ${phys.height}px`
                : "—"}
            </DetailRow>
            <DetailRow label="Aspect">{phys?.aspectRatio}</DetailRow>
            <DetailRow label="Bytes">{bytes(phys?.fileSizeBytes)}</DetailRow>
            <DetailRow label="Hash">
              <code className="text-xs">
                {(phys as { contentHash?: string } | undefined)?.contentHash ||
                  "—"}
              </code>
            </DetailRow>
            <DetailRow label="Medium">{phys?.medium}</DetailRow>
            <DetailRow label="Palette">{phys?.palette}</DetailRow>
            <DetailRow label="Orientation">{phys?.orientation}</DetailRow>
            <DetailRow label="Modified">
              {(phys as { mtime?: string } | undefined)?.mtime || "—"}
            </DetailRow>
          </dl>
        )}

        {active === "story" && (
          <p className="font-serif text-base leading-relaxed text-bone">
            {item.storyBeat}
          </p>
        )}

        {active === "prompt" && (
          <>
            <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-bone/90">
              {item.prompt}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-bone-muted">
                Style suffix
              </summary>
              <p className="mt-2 whitespace-pre-wrap font-mono text-[10px] text-bone-muted">
                {styleSuffix}
              </p>
            </details>
          </>
        )}

        {active === "review" && (
          <dl>
            <DetailRow label="Status">
              <span className="capitalize">
                {item.review?.status ?? "unreviewed"}
              </span>
              {item.review?.flagged ? " · flagged" : ""}
            </DetailRow>
            <DetailRow label="Notes">{item.review?.notes}</DetailRow>
            <DetailRow label="Reason">{item.review?.rejectReason}</DetailRow>
            <DetailRow label="Fix">{item.review?.v2Fix}</DetailRow>
          </dl>
        )}
      </div>
    </div>
  );
}
