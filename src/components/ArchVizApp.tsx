"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ArchitectureGraph from "@/components/ArchitectureGraph";
import SidePanel, { type SidePanelTab } from "@/components/SidePanel";
import Breadcrumb from "@/components/Breadcrumb";
import ViewHeader from "@/components/ViewHeader";
import RelationLegend from "@/components/RelationLegend";
import DataSourceSelector from "@/components/DataSourceSelector";
import SearchPalette from "@/components/SearchPalette";
import PathModeControl, { type PathMode } from "@/components/PathModeControl";
import {
  findNode,
  getBreadcrumb,
  getChildren,
  getRelationsForViewWithRollup,
  hasChildren,
  tracePath,
} from "@/lib/model";
import { DATA_SOURCES } from "@/lib/data-sources";
import type { ArchModel, ArchNode, RelationKind } from "@/lib/types";

interface Loaded {
  sourceId: string;
  model: ArchModel;
}
interface LoadFailed {
  sourceId: string;
  message: string;
}

/**
 * All navigation state (source/parent/node/view) lives in the URL, read via
 * useSearchParams — there is no useState mirroring it, so there's nothing to
 * keep in sync (see CLAUDE.md's "Data sources" section on why the project
 * avoids the resync-in-effect pattern). Handlers below just push/replace a
 * new URL; the next render picks up the change from searchParams directly.
 * currentParentId/selectedNodeId are additionally validated against the
 * loaded model (once it resolves) so a stale/invalid id in the URL falls
 * back to the root instead of erroring.
 */
export default function ArchVizApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sourceIdParam = searchParams.get("source");
  const sourceId =
    sourceIdParam && DATA_SOURCES.some((s) => s.id === sourceIdParam) ? sourceIdParam : DATA_SOURCES[0].id;
  const rawParentId = searchParams.get("parent");
  const rawSelectedId = searchParams.get("node");
  const activeTab: SidePanelTab = searchParams.get("panel") === "wiki" ? "wiki" : "resource";

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState<LoadFailed | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pathMode, setPathMode] = useState<PathMode>("off");
  const [kindFilter, setKindFilter] = useState<RelationKind | null>(null);

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

  const currentParentId = archModel && rawParentId && findNode(archModel, rawParentId) ? rawParentId : null;
  const selectedNodeId = archModel && rawSelectedId && findNode(archModel, rawSelectedId) ? rawSelectedId : null;

  const visibleNodes = useMemo(
    () => (archModel ? getChildren(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const visibleRelations = useMemo(
    () => (archModel ? getRelationsForViewWithRollup(archModel, new Set(visibleNodes.map((n) => n.id))) : []),
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

  // Whatever the diagram currently has in focus — the selected resource if one is
  // selected, else the container we've drilled into, else the bundle root — kept live
  // (not computed only when switching to the Wiki tab) so it tracks the diagram selection
  // even while the tab is already open.
  const wikiFocusId = selectedNodeId ?? currentParentId;
  const wikiEntryPath = wikiFocusId ? `${wikiFocusId}.md` : "index.md";

  const { highlightedNodeIds, highlightedRelationIds } = useMemo(() => {
    if (pathMode === "off" || !selectedNodeId) {
      return { highlightedNodeIds: null as Set<string> | null, highlightedRelationIds: null as Set<string> | null };
    }
    const directions: ("upstream" | "downstream")[] = pathMode === "both" ? ["upstream", "downstream"] : [pathMode];
    const nodeIds = new Set<string>();
    const relationIds = new Set<string>();
    directions.forEach((dir) => {
      const traced = tracePath(visibleRelations, selectedNodeId, dir, kindFilter ?? undefined);
      traced.nodeIds.forEach((id) => nodeIds.add(id));
      traced.relationIds.forEach((id) => relationIds.add(id));
    });
    return { highlightedNodeIds: nodeIds, highlightedRelationIds: relationIds };
  }, [pathMode, selectedNodeId, visibleRelations, kindFilter]);

  function updateUrl(
    patch: { source?: string; parent?: string | null; node?: string | null; panel?: SidePanelTab | null },
    push = false
  ) {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.source !== undefined) params.set("source", patch.source);
    if (patch.parent !== undefined) {
      if (patch.parent === null) params.delete("parent");
      else params.set("parent", patch.parent);
    }
    if (patch.node !== undefined) {
      if (patch.node === null) params.delete("node");
      else params.set("node", patch.node);
    }
    if (patch.panel !== undefined) {
      if (patch.panel === null || patch.panel === "resource") params.delete("panel");
      else params.set("panel", patch.panel);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    (push ? router.push : router.replace)(url, { scroll: false });
  }

  function handleSelectSource(id: string) {
    updateUrl({ source: id, parent: null, node: null, panel: null }, true);
  }

  function handleDrillInto(id: string) {
    updateUrl({ parent: id, node: null });
  }

  function handleNavigate(id: string | null) {
    updateUrl({ parent: id, node: null });
  }

  function handleSelectNode(id: string) {
    updateUrl({ node: id });
  }

  function handleSearchNavigate(node: ArchNode) {
    updateUrl({ parent: node.parentId ?? null, node: node.id });
  }

  function handleTabChange(tab: SidePanelTab) {
    updateUrl({ panel: tab });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>ArchViz</h1>
        <DataSourceSelector sources={DATA_SOURCES} selectedId={sourceId} onSelect={handleSelectSource} />
        <Breadcrumb trail={breadcrumbTrail} onNavigate={handleNavigate} />
        <button className="search-trigger" onClick={() => setSearchOpen(true)}>
          Search <kbd>Ctrl K</kbd>
        </button>
        <span className="app-hint">Clique para detalhes · duplo clique em » para navegar</span>
      </header>
      <SearchPalette
        archModel={archModel}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />
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
                  onSelectNode={handleSelectNode}
                  onDrillInto={handleDrillInto}
                  isDrillable={(id) => hasChildren(archModel, id)}
                  exportFileName={`${sourceId}-${currentParentId ?? "context"}`}
                  highlightedNodeIds={highlightedNodeIds}
                  highlightedRelationIds={highlightedRelationIds}
                />
                <RelationLegend relations={visibleRelations} />
                <PathModeControl
                  mode={pathMode}
                  onModeChange={setPathMode}
                  kindFilter={kindFilter}
                  onKindFilterChange={setKindFilter}
                  disabled={!selectedNodeId}
                />
              </div>
            </>
          ) : (
            <div className="app-loading">
              {loadError ? `Failed to load architecture: ${loadError}` : "Loading architecture…"}
            </div>
          )}
        </div>
        <SidePanel
          node={selectedNode}
          wikiAvailable={Boolean(activeSource?.okfBasePath)}
          wikiBasePath={activeSource?.okfBasePath}
          wikiEntryPath={wikiEntryPath}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </main>
    </div>
  );
}
