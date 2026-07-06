import type { ArchNode } from "@/lib/types";

interface BreadcrumbProps {
  trail: ArchNode[];
  onNavigate: (id: string | null) => void;
  /** Display name of the active bounded-context cluster, if one is drilled into (e.g. "Navigation Content"). */
  activeClusterLabel?: string;
  /** Clears the active cluster, staying on the same parent container. */
  onNavigateCluster?: () => void;
}

export default function Breadcrumb({ trail, onNavigate, activeClusterLabel, onNavigateCluster }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb">
      <button onClick={() => onNavigate(null)}>Context</button>
      {trail.map((node) => (
        <span key={node.id}>
          <span className="breadcrumb-sep">/</span>
          <button onClick={() => onNavigate(node.id)}>{node.name}</button>
        </span>
      ))}
      {activeClusterLabel && (
        <span>
          <span className="breadcrumb-sep">/</span>
          <button onClick={() => onNavigateCluster?.()}>{activeClusterLabel}</button>
        </span>
      )}
    </nav>
  );
}
