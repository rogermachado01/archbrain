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
import { computeClusterView, CLUSTER_ID_PREFIX } from "@/lib/clusters";
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

  const rawChildren = useMemo(
    () => (archModel ? getChildren(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const clusterView = useMemo(() => computeClusterView(rawChildren), [rawChildren]);

  // A selected id is valid if it's either a real ArchNode or one of the current
  // view's synthetic cluster ids — the latter never appears in archModel.nodes,
  // so findNode alone would incorrectly invalidate a cluster selection.
  const selectedNodeId =
    archModel &&
    rawSelectedId &&
    (findNode(archModel, rawSelectedId) || clusterView?.clusterNodes.some((c) => c.id === rawSelectedId))
      ? rawSelectedId
      : null;

  // Explicit ?cluster= (set by double-clicking a cluster node) wins; otherwise fall
  // back to the selected node's own cluster membership, so a deep link straight to
  // ?node=<id> (e.g. from search) auto-expands the right cluster without needing its
  // own ?cluster= param.
  const rawClusterParam = searchParams.get("cluster");
  const explicitClusterId =
    clusterView && rawClusterParam
      ? clusterView.clusterNodes.find((c) => c.id === `${CLUSTER_ID_PREFIX}${rawClusterParam}`)?.id
      : undefined;
  const selectedChildClusterId =
    clusterView && selectedNodeId ? clusterView.membershipByChildId.get(selectedNodeId) : undefined;
  const effectiveClusterId = explicitClusterId ?? selectedChildClusterId;

  const visibleNodes = useMemo(() => {
    if (!clusterView) return rawChildren;
    if (!effectiveClusterId) return clusterView.clusterNodes;
    return rawChildren.filter((c) => clusterView.membershipByChildId.get(c.id) === effectiveClusterId);
  }, [clusterView, rawChildren, effectiveClusterId]);

  const visibleRelations = useMemo(() => {
    if (!archModel) return [];
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    // Only pass the override while showing the cluster list itself (no single
    // cluster drilled into yet) — once inside one cluster, relations to a
    // sibling cluster's member are dropped, matching the existing
    // sibling-container behavior.
    const override = clusterView && !effectiveClusterId ? clusterView.membershipByChildId : undefined;
    return getRelationsForViewWithRollup(archModel, visibleIds, override);
  }, [archModel, visibleNodes, clusterView, effectiveClusterId]);

  const breadcrumbTrail = useMemo(
    () => (archModel ? getBreadcrumb(archModel, currentParentId) : []),
    [archModel, currentParentId]
  );
  const selectedNode =
    archModel && selectedNodeId
      ? findNode(archModel, selectedNodeId) ?? visibleNodes.find((n) => n.id === selectedNodeId) ?? null
      : null;
  const isSelectedNodeCluster = Boolean(selectedNode?.synthetic);

  const currentContextNode = archModel && currentParentId ? findNode(archModel, currentParentId) : null;
  const headerTitle = currentContextNode?.name ?? archModel?.title ?? "System Context";
  const headerDescription = currentContextNode?.description ?? archModel?.description;

  // Whatever the diagram currently has in focus — the selected resource if one is
  // selected, else the container we've drilled into, else the bundle root — kept live
  // (not computed only when switching to the Wiki tab) so it tracks the diagram selection
  // even while the tab is already open.
  const wikiFocusId = selectedNodeId && !isSelectedNodeCluster ? selectedNodeId : currentParentId;
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
    patch: {
      source?: string;
      parent?: string | null;
      node?: string | null;
      panel?: SidePanelTab | null;
      cluster?: string | null;
    },
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
    if (patch.cluster !== undefined) {
      if (patch.cluster === null) params.delete("cluster");
      else params.set("cluster", patch.cluster);
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    (push ? router.push : router.replace)(url, { scroll: false });
  }

  function handleSelectSource(id: string) {
    updateUrl({ source: id, parent: null, node: null, panel: null, cluster: null }, true);
  }

  function handleDrillInto(id: string) {
    const target = visibleNodes.find((n) => n.id === id);
    if (target?.synthetic) {
      updateUrl({ cluster: id.slice(CLUSTER_ID_PREFIX.length), node: null });
      return;
    }
    updateUrl({ parent: id, node: null, cluster: null });
  }

  function handleNavigate(id: string | null) {
    updateUrl({ parent: id, node: null, cluster: null });
  }

  function handleNavigateCluster() {
    updateUrl({ cluster: null, node: null });
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
        <Breadcrumb
          trail={breadcrumbTrail}
          onNavigate={handleNavigate}
          activeClusterLabel={
            effectiveClusterId ? clusterView?.clusterNodes.find((c) => c.id === effectiveClusterId)?.name : undefined
          }
          onNavigateCluster={handleNavigateCluster}
        />
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
                  isDrillable={(id) => {
                    const target = visibleNodes.find((n) => n.id === id);
                    if (target?.synthetic) return true;
                    return hasChildren(archModel, id);
                  }}
                  exportFileName={`${sourceId}-${currentParentId ?? "context"}${
                    effectiveClusterId ? `-${effectiveClusterId.slice(CLUSTER_ID_PREFIX.length)}` : ""
                  }`}
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
          clusterMembers={
            isSelectedNodeCluster && archModel
              ? selectedNode!.synthetic!.memberIds
                  .map((id) => findNode(archModel, id))
                  .filter((n): n is ArchNode => Boolean(n))
              : undefined
          }
          wikiAvailable={Boolean(activeSource?.okfBasePath) && !isSelectedNodeCluster}
          wikiBasePath={activeSource?.okfBasePath}
          wikiEntryPath={wikiEntryPath}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </main>
    </div>
  );
}
