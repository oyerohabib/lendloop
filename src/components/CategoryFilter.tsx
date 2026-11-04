"use client";

import { CATEGORY_LABELS } from "@/lib/labels";

const ALL = "all";

export default function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="filter-row" role="group" aria-label="Filter by category">
      <button
        type="button"
        className={value === ALL ? "chip chip--active" : "chip"}
        onClick={() => onChange(ALL)}
      >
        All
      </button>
      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={value === key ? "chip chip--active" : "chip"}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
