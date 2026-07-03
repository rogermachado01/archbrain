"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArchModel, ArchNode } from "@/lib/types";
import { getBreadcrumb } from "@/lib/model";

interface SearchPaletteProps {
  archModel: ArchModel | null;
  open: boolean;
  onClose: () => void;
  onNavigate: (node: ArchNode) => void;
}

function matches(node: ArchNode, query: string): boolean {
  const q = query.toLowerCase();
  return (
    node.name.toLowerCase().includes(q) ||
    Boolean(node.technology?.toLowerCase().includes(q)) ||
    Boolean(node.aws?.resourceType.toLowerCase().includes(q))
  );
}

export default function SearchPalette({ archModel, open, onClose, onNavigate }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus after the overlay mounts so the keydown that opened it doesn't get eaten.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    if (!archModel || query.trim().length === 0) return [];
    return archModel.nodes.filter((n) => matches(n, query.trim())).slice(0, 20);
  }, [archModel, query]);

  if (!open) return null;

  // Clearing the query here (rather than via an effect on `open`) means the
  // palette always starts empty next time it's opened, with no setState in
  // an effect body.
  function close() {
    setQuery("");
    onClose();
  }

  function handleSelect(node: ArchNode) {
    onNavigate(node);
    close();
  }

  return (
    <div className="search-palette-overlay" onClick={close}>
      <div className="search-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-palette-input"
          type="text"
          placeholder="Search resources by name, technology, or AWS type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
          }}
        />
        {query.trim().length > 0 && (
          <ul className="search-palette-results">
            {results.length === 0 && <li className="search-palette-empty">No matches</li>}
            {results.map((node) => {
              const breadcrumb = archModel ? getBreadcrumb(archModel, node.parentId ?? null) : [];
              return (
                <li key={node.id}>
                  <button className="search-palette-result" onClick={() => handleSelect(node)}>
                    <span className="search-palette-result-name">{node.name}</span>
                    <span className="search-palette-result-meta">
                      {node.level.toUpperCase()}
                      {node.technology ? ` · ${node.technology}` : ""}
                      {breadcrumb.length > 0 ? ` · ${breadcrumb.map((n) => n.name).join(" / ")}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
