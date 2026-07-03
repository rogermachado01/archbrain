import type { ArchNode } from "@/lib/types";

interface DetailsPanelProps {
  node: ArchNode | null;
}

export default function DetailsPanel({ node }: DetailsPanelProps) {
  if (!node) {
    return (
      <aside className="details-panel">
        <p className="details-empty">Select a resource to see its configuration.</p>
      </aside>
    );
  }

  return (
    <aside className="details-panel">
      <h2>{node.name}</h2>
      <p className="details-meta">
        {node.level.toUpperCase()}
        {node.technology ? ` · ${node.technology}` : ""}
        {node.external ? " · external" : ""}
      </p>
      {node.description && <p>{node.description}</p>}

      {node.aws && (
        <>
          <h3>Configuration</h3>
          <p className="details-meta">{node.aws.resourceType}</p>
          <dl className="details-config">
            {Object.entries(node.aws.properties).map(([key, value]) => (
              <div key={key} className="details-config-row">
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </aside>
  );
}
