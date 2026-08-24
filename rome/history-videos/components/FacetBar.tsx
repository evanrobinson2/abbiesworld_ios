"use client";

import clsx from "clsx";

interface FacetBarProps {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function FacetBar({ label, options, value, onChange }: FacetBarProps) {
  if (options.length <= 1) return null;
  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-1">
      <span className="mt-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-bone-muted">
        {label}
      </span>
      <div className="flex gap-1.5">
        <Chip active={!value} onClick={() => onChange(undefined)}>
          All
        </Chip>
        {options.map((opt) => (
          <Chip key={opt} active={value === opt} onClick={() => onChange(opt)}>
            {opt}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-8 shrink-0 rounded-full px-3 text-xs font-medium",
        active
          ? "bg-gold-warm text-indigo-deep"
          : "border border-white/15 bg-indigo-mid/40 text-bone-muted active:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}
