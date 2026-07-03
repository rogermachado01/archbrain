"use client";

import { useEffect, useMemo, useState } from "react";
import ArchitectureGraph from "@/components/ArchitectureGraph";
import DetailsPanel from "@/components/DetailsPanel";
import Breadcrumb from "@/components/Breadcrumb";
import ViewHeader from "@/components/ViewHeader";
import RelationLegend from "@/components/RelationLegend";
import DataSourceSelector from "@/components/DataSourceSelector";
import ViewModeToggle, { type ViewMode } from "@/components/ViewModeToggle";
import OkfWikiViewer from "@/components/OkfWikiViewer";
import { findNode, getBreadcrumb, getChildren, getRelationsForView, hasChildren } from "@/lib/model";
import { DATA_SOURCES } from "@/lib/data-sources";
import type { ArchModel } from "@/lib/types";

interface Loaded {
  sourceId: string;
  model: ArchModel;
}
interface LoadFailed {
  sourceId: string;
  message: string;
}

export default function Home() {
  const [sourceId, setSourceId] = useState(DATA_SOURCES[0].id);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState<LoadFailed | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  const [wikiEntryPath, setWikiEntryPath] = useState("index.md");

  const activeSource = DATA_SOURCES.find((s) => s.id === sourceId);

  useEffect(() => {
    let cancelled = false;
    const source = DATA_SOURCES.find((s) => s.id === sourceId);
    if (!source) return;

    source
      .load()
      .then((model) => {
        if (!cancelled) setLoaded({ sourceId, model });
      })
      .catch((err) => {
        if (!cancelled) setLoadFailed({ sourceId, message: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  // Derived (not reset via setState) so a source switch shows "loading" until
  // its own fetch resolves, without an effect synchronously clearing state.
  const archModel = loaded && loaded.sourceId === sourceId ? loaded.model : null;
  const loadError = loadFailed && loadFailed.sourceId === sourceId ? loadFailed.message : null;

  const visibleNodes = useMemo(
    () => (archModel ? getChildren(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const visibleRelations = useMemo(
    () => (archModel ? getRelationsForView(archModel, new Set(visibleNodes.map((n) => n.id))) : []),
    [archModel, visibleNodes]
  );
  const breadcrumbTrail = useMemo(
    () => (archModel ? getBreadcrumb(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const selectedNode = archModel && selectedNodeId ? findNode(archModel, selectedNodeId) ?? null : null;

  const currentContextNode = archModel && currentParentId ? findNode(archModel, currentParentId) : null;
  const headerTitle = currentContextNode?.name ?? archModel?.title ?? "System Context";
  const headerDescription = currentContextNode?.description ?? archModel?.description;

  function handleSelectSource(id: string) {
    setSourceId(id);
    setCurrentParentId(null);
    setSelectedNodeId(null);
    setViewMode("diagram");
  }

  function handleDrillInto(id: string) {
    setCurrentParentId(id);
    setSelectedNodeId(null);
  }

  function handleNavigate(id: string | null) {
    setCurrentParentId(id);
    setSelectedNodeId(null);
  }

  // Jumping to the wiki always opens the doc page matching whatever the
  // diagram is currently focused on — the selected resource if one is
  // selected, else the container we've drilled into, else the bundle root.
  function handleChangeViewMode(mode: ViewMode) {
    if (mode === "wiki") {
      const focusId = selectedNodeId ?? currentParentId;
      setWikiEntryPath(focusId ? `${focusId}.md` : "index.md");
    }
    setViewMode(mode);
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>ArchViz</h1>
        <DataSourceSelector sources={DATA_SOURCES} selectedId={sourceId} onSelect={handleSelectSource} />
        {viewMode === "diagram" && <Breadcrumb trail={breadcrumbTrail} onNavigate={handleNavigate} />}
        <ViewModeToggle
          mode={viewMode}
          onChange={handleChangeViewMode}
          wikiAvailable={Boolean(activeSource?.okfBasePath)}
        />
        <span className="app-hint">Clique para detalhes · duplo clique em » para navegar</span>
      </header>
      {viewMode === "wiki" && activeSource?.okfBasePath ? (
        <main className="app-body app-body--wiki">
          <OkfWikiViewer key={wikiEntryPath} basePath={activeSource.okfBasePath} initialPath={wikiEntryPath} />
        </main>
      ) : (
        <main className="app-body">
          <div className="graph-column">
            {archModel ? (
              <>
                <ViewHeader title={headerTitle} description={headerDescription} />
                <div className="graph-area">
                  <ArchitectureGraph
                    nodes={visibleNodes}
                    relations={visibleRelations}
                    groups={archModel.groups ?? []}
                    boundary={archModel.boundary}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    onDrillInto={handleDrillInto}
                    isDrillable={(id) => hasChildren(archModel, id)}
                  />
                  <RelationLegend relations={visibleRelations} />
                </div>
              </>
            ) : (
              <div className="app-loading">
                {loadError ? `Failed to load architecture: ${loadError}` : "Loading architecture…"}
              </div>
            )}
          </div>
          <DetailsPanel node={selectedNode} />
        </main>
      )}
    </div>
  );
}
