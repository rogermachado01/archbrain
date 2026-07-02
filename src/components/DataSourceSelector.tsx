import type { DataSource } from "@/lib/data-sources";

interface DataSourceSelectorProps {
  sources: DataSource[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function DataSourceSelector({ sources, selectedId, onSelect }: DataSourceSelectorProps) {
  return (
    <select
      className="data-source-selector"
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Architecture data source"
    >
      {sources.map((source) => (
        <option key={source.id} value={source.id}>
          {source.label}
        </option>
      ))}
    </select>
  );
}
