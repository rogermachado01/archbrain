import type { RelationKind } from "@/lib/types";
import { RELATION_STYLES } from "@/lib/relation-style";

export type PathMode = "off" | "upstream" | "downstream" | "both";

interface PathModeControlProps {
  mode: PathMode;
  onModeChange: (mode: PathMode) => void;
  kindFilter: RelationKind | null;
  onKindFilterChange: (kind: RelationKind | null) => void;
  disabled: boolean;
}

const MODES: { value: PathMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "upstream", label: "Upstream" },
  { value: "downstream", label: "Downstream" },
  { value: "both", label: "Both" },
];

export default function PathModeControl({
  mode,
  onModeChange,
  kindFilter,
  onKindFilterChange,
  disabled,
}: PathModeControlProps) {
  return (
    <div className="path-mode-control">
      <div className="path-mode-buttons">
        {MODES.map((m) => (
          <button
            key={m.value}
            className={mode === m.value ? "active" : ""}
            disabled={disabled && m.value !== "off"}
            onClick={() => onModeChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode !== "off" && (
        <select
          className="path-mode-kind-filter"
          value={kindFilter ?? ""}
          onChange={(e) => onKindFilterChange((e.target.value || null) as RelationKind | null)}
          aria-label="Filter traced path by relation kind"
        >
          <option value="">All relation kinds</option>
          {(Object.keys(RELATION_STYLES) as RelationKind[]).map((k) => (
            <option key={k} value={k}>
              {RELATION_STYLES[k].label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
