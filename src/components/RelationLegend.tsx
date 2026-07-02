import type { ArchRelation } from "@/lib/types";
import { getVisibleRelationKinds } from "@/lib/relation-style";

interface RelationLegendProps {
  relations: ArchRelation[];
}

export default function RelationLegend({ relations }: RelationLegendProps) {
  const styles = getVisibleRelationKinds(relations);
  if (styles.length === 0) return null;

  return (
    <div className="relation-legend">
      {styles.map((s) => (
        <div key={s.kind} className="relation-legend-row">
          <svg width="28" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="28" y2="5" stroke={s.stroke} strokeWidth="2" strokeDasharray={s.dash} />
          </svg>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
