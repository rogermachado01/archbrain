import DetailsPanel from "@/components/DetailsPanel";
import OkfWikiViewer from "@/components/OkfWikiViewer";
import type { ArchNode } from "@/lib/types";

export type SidePanelTab = "resource" | "wiki";

interface SidePanelProps {
  node: ArchNode | null;
  /** Resolved member nodes, only set when `node` is a bounded-context cluster pseudo-node. */
  clusterMembers?: ArchNode[];
  wikiAvailable: boolean;
  wikiBasePath?: string;
  /** relative .md path to open, derived from whatever the diagram currently has in focus */
  wikiEntryPath: string;
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
}

/**
 * Right-hand sidebar: a "Resource" tab (the existing DetailsPanel config view) and a
 * "Wiki" tab (OkfWikiViewer, disabled when the active DataSource has no okfBasePath).
 * wikiEntryPath is computed by the caller from selectedNodeId/currentParentId and stays
 * live — switching the diagram selection while the Wiki tab is already open updates its
 * content without needing to re-click the tab.
 */
export default function SidePanel({
  node,
  clusterMembers,
  wikiAvailable,
  wikiBasePath,
  wikiEntryPath,
  activeTab,
  onTabChange,
}: SidePanelProps) {
  const tab: SidePanelTab = activeTab === "wiki" && wikiAvailable ? "wiki" : "resource";

  return (
    <aside className={tab === "wiki" ? "side-panel side-panel--wiki" : "side-panel"}>
      <div className="side-panel-tabs" role="tablist" aria-label="Resource details">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resource"}
          className={tab === "resource" ? "active" : ""}
          onClick={() => onTabChange("resource")}
        >
          Resource
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "wiki"}
          className={tab === "wiki" ? "active" : ""}
          disabled={!wikiAvailable}
          title={wikiAvailable ? "Browse the OKF bundle's markdown docs" : "This source has no OKF docs to browse"}
          onClick={() => onTabChange("wiki")}
        >
          Wiki
        </button>
      </div>
      <div className="side-panel-body">
        {tab === "wiki" && wikiBasePath ? (
          <OkfWikiViewer key={wikiEntryPath} basePath={wikiBasePath} initialPath={wikiEntryPath} />
        ) : (
          <div className="details-panel">
            <DetailsPanel node={node} clusterMembers={clusterMembers} />
          </div>
        )}
      </div>
    </aside>
  );
}
