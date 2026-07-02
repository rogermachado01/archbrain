import type { ArchNode } from "@/lib/types";

interface BreadcrumbProps {
  trail: ArchNode[];
  onNavigate: (id: string | null) => void;
}

export default function Breadcrumb({ trail, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb">
      <button onClick={() => onNavigate(null)}>Context</button>
      {trail.map((node) => (
        <span key={node.id}>
          <span className="breadcrumb-sep">/</span>
          <button onClick={() => onNavigate(node.id)}>{node.name}</button>
        </span>
      ))}
    </nav>
  );
}
