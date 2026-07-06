import type { ArchNode } from "@/lib/types";

interface DetailsPanelProps {
  node: ArchNode | null;
  /** Resolved member nodes, only set when `node` is a bounded-context cluster pseudo-node. */
  clusterMembers?: ArchNode[];
}

/** Just the "Resource" tab's content — SidePanel owns the surrounding <aside>/tabs. */
export default function DetailsPanel({ node, clusterMembers }: DetailsPanelProps) {
  if (!node) {
    return <p className="details-empty">Select a resource to see its configuration.</p>;
  }

  if (node.synthetic) {
    return (
      <>
        <h2>{node.name}</h2>
        <p className="details-meta">BOUNDED CONTEXT CLUSTER</p>
        <p>This is a collapsed group of {node.synthetic.memberIds.length} component(s). Double-click it on the diagram to see its members.</p>
        {clusterMembers && clusterMembers.length > 0 && (
          <>
            <h3>Members</h3>
            <ul className="details-links">
              {clusterMembers.map((member) => (
                <li key={member.id}>
                  {member.name}
                  {member.technology ? ` — ${member.technology}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <h2>{node.name}</h2>
      <p className="details-meta">
        {node.level.toUpperCase()}
        {node.technology ? ` · ${node.technology}` : ""}
        {node.external ? " · external" : ""}
      </p>
      {node.description && <p>{node.description}</p>}

      {node.ddd && (
        <>
          <h3>Domain-Driven Design</h3>
          {node.ddd.subdomain && (
            <p className={`details-ddd-subdomain details-ddd-subdomain--${node.ddd.subdomain}`}>
              {node.ddd.subdomain.toUpperCase()}
            </p>
          )}
          <dl className="details-config">
            {node.ddd.context && (
              <div className="details-config-row">
                <dt>Bounded context</dt>
                <dd>{node.ddd.context}</dd>
              </div>
            )}
            {node.ddd.role && (
              <div className="details-config-row">
                <dt>Building block</dt>
                <dd>{node.ddd.role}</dd>
              </div>
            )}
          </dl>
        </>
      )}

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

      {(node.owner || (node.links && node.links.length > 0)) && (
        <>
          <h3>Ownership &amp; Links</h3>
          {node.owner && <p className="details-owner">{node.owner}</p>}
          {node.links && node.links.length > 0 && (
            <ul className="details-links">
              {node.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
