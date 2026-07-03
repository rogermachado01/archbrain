"use client";

import { useEffect, useRef } from "react";
import { Export, Graph, MiniMap } from "@antv/x6";
import type { ArchNode, ArchRelation, AwsGroup, AwsGroupKind } from "@/lib/types";
import { computeLayeredPositions } from "@/lib/layout";
import { computeGroupBoxes } from "@/lib/groups";
import { getRelationStyle } from "@/lib/relation-style";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 88;
const H_GAP = 130;
const V_GAP = 90;
const BOUNDARY_PADDING = 48;
const BOUNDARY_ID = "__aws-cloud-boundary__";
const DEFAULT_BOUNDARY_LABEL = "AWS Cloud";
const DEFAULT_BOUNDARY_ICON = "aws-cloud-badge.svg";
// Detour lane below the whole diagram for edges that skip more than one
// layer — drawing them straight would cut across unrelated nodes sitting
// in the layers in between.
const DETOUR_MARGIN = 60;
const DETOUR_LANE_GAP = 16;
// X6's textWrap computes maxLines = floor(height / lineHeight), where
// lineHeight = ceil(fontSize * 1.4). If height ends up smaller than a single
// lineHeight, maxLines is 0 and the label silently renders as "" instead of
// truncating — so these must stay comfortably above fontSize * 1.4.
const LABEL_WRAP_HEIGHT = 40; // 2 lines at fontSize 13 (lineHeight 19)
const SUBLABEL_WRAP_HEIGHT = 18; // 1 line at fontSize 11 (lineHeight 16)

const GROUP_BOX_PADDING = 20;
const GROUP_BOX_LABEL_BAND = 26;

// Minimap is only useful once a view has enough nodes that panning around
// loses context; the container is always mounted (see render below) so the
// plugin only needs registering once, at graph creation.
const MINIMAP_NODE_THRESHOLD = 15;
const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;

// Opacity applied to cells outside the traced path when path-highlight mode
// (see tracePath in src/lib/model.ts) is active.
const DIMMED_NODE_OPACITY = 0.25;
const DIMMED_EDGE_OPACITY = 0.15;

const GROUP_STYLE: Record<
  AwsGroupKind,
  { stroke: string; dash?: string; icon?: string; labelPrefix: string }
> = {
  region: { stroke: "#232f3e", icon: "/aws-icons/aws-region-badge.svg", labelPrefix: "Region — " },
  vpc: { stroke: "#248814", icon: "/aws-icons/aws-vpc-badge.svg", labelPrefix: "VPC: " },
  "availability-zone": { stroke: "#5a6b82", dash: "6,4", labelPrefix: "Availability Zone: " },
  subnet: { stroke: "#527fff", labelPrefix: "Subnet: " }, // overridden per subnetType below
};

let shapesRegistered = false;

/** Registers the AWS-styled node shapes once per page load. */
function registerShapes() {
  if (shapesRegistered) return;
  shapesRegistered = true;

  Graph.registerNode(
    "arch-node",
    {
      inherit: "rect",
      markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "image", selector: "icon" },
        { tagName: "text", selector: "label" },
        { tagName: "text", selector: "sublabel" },
        { tagName: "text", selector: "badge" },
      ],
      attrs: {
        body: { fill: "#ffffff", stroke: "#aab7c4", strokeWidth: 1, rx: 8, ry: 8 },
        icon: { width: 40, height: 40, x: 12, y: 24 },
        // refY values below leave enough vertical room for the label to wrap
        // to 2 lines (see LABEL_WRAP_HEIGHT) before the sublabel starts.
        label: {
          refX: 0,
          refY: 12,
          textAnchor: "start",
          textVerticalAnchor: "top",
          fontSize: 13,
          fontWeight: 700,
          fill: "#16191f",
        },
        sublabel: {
          refX: 0,
          refY: 58,
          textAnchor: "start",
          textVerticalAnchor: "top",
          fontSize: 11,
          fill: "#5a6b82",
        },
        badge: {
          refX: NODE_WIDTH - 10,
          refY: 8,
          textAnchor: "end",
          textVerticalAnchor: "top",
          fontSize: 13,
          fill: "#ec7211",
          fontWeight: 700,
        },
      },
    },
    true
  );

  // The dashed "AWS Cloud" boundary box AWS's diagramming guidelines recommend
  // drawing around resources that live inside an AWS account/region.
  Graph.registerNode(
    "arch-boundary",
    {
      inherit: "rect",
      markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "image", selector: "icon" },
        { tagName: "text", selector: "label" },
      ],
      attrs: {
        body: {
          fill: "rgba(35,47,62,0.03)",
          stroke: "#232f3e",
          strokeWidth: 1.5,
          strokeDasharray: "6,4",
          rx: 12,
          ry: 12,
        },
        icon: { x: 16, y: 14, width: 20, height: 20 },
        label: {
          refX: 44,
          refY: 14,
          textAnchor: "start",
          textVerticalAnchor: "top",
          fontSize: 12,
          fontWeight: 700,
          fill: "#232f3e",
        },
      },
    },
    true
  );

  // Nested AWS network-boundary boxes (Region > VPC > Availability Zone > Subnet).
  // Style (stroke/dash/icon) is set per-instance from GROUP_STYLE, not here.
  Graph.registerNode(
    "arch-group",
    {
      inherit: "rect",
      markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "image", selector: "icon" },
        { tagName: "text", selector: "label" },
      ],
      attrs: {
        body: { fill: "none", strokeWidth: 1.5, rx: 8, ry: 8 },
        icon: { width: 20, height: 20, x: 12, y: 10 },
        label: {
          refX: 40,
          refY: 10,
          textAnchor: "start",
          textVerticalAnchor: "top",
          fontSize: 12,
          fontWeight: 700,
        },
      },
    },
    true
  );
}

interface ArchitectureGraphProps {
  nodes: ArchNode[];
  relations: ArchRelation[];
  groups: AwsGroup[];
  /** custom boundary box; omit for the default "AWS Cloud" box, false to disable it */
  boundary?: { label: string; icon?: string } | false;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onDrillInto: (id: string) => void;
  isDrillable: (id: string) => boolean;
  /** base file name (no extension) used when exporting the current view */
  exportFileName: string;
  /** node ids to keep at full opacity; everything else dims. null = highlight off */
  highlightedNodeIds: Set<string> | null;
  /** relation ids to keep at full opacity; everything else dims. null = highlight off */
  highlightedRelationIds: Set<string> | null;
}

export default function ArchitectureGraph({
  nodes,
  relations,
  groups,
  boundary,
  selectedNodeId,
  onSelectNode,
  onDrillInto,
  isDrillable,
  exportFileName,
  highlightedNodeIds,
  highlightedRelationIds,
}: ArchitectureGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapContainerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  // Boundary/group cells aren't real ArchNodes, so click handling and the
  // highlight effect both need to skip them; populated at the end of the
  // rebuild effect below and read by the separate highlight effect, which
  // doesn't recompute the graph and so has no other way to know about them.
  const structuralIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    registerShapes();
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      panning: true,
      mousewheel: { enabled: true, modifiers: ["ctrl", "meta"] },
      interacting: { nodeMovable: false },
    });
    graph.use(new Export());
    if (minimapContainerRef.current) {
      graph.use(
        new MiniMap({
          container: minimapContainerRef.current,
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          padding: 10,
        })
      );
    }
    graphRef.current = graph;

    return () => {
      graph.dispose();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const positions = computeLayeredPositions(nodes, relations, {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      columnGap: H_GAP,
      rowGap: V_GAP,
    });

    const cells = [];
    const positionById = new Map(positions.map((p) => [p.node.id, p]));
    const maxContentY = positions.length > 0 ? Math.max(...positions.map((p) => p.y + NODE_HEIGHT)) : 0;

    // A direct line between layers more than 1 apart would cut straight
    // through whatever nodes sit in the intervening columns, so route those
    // edges through a detour lane below all the content instead. Precomputed
    // up front so the AWS Cloud boundary below can size itself to include it.
    const detourLaneYByRelationId = new Map<string, number>();
    relations.forEach((rel) => {
      const sourcePos = positionById.get(rel.source);
      const targetPos = positionById.get(rel.target);
      if (!sourcePos || !targetPos) return;
      if (Math.abs(targetPos.layer - sourcePos.layer) > 1) {
        const laneY = maxContentY + DETOUR_MARGIN + detourLaneYByRelationId.size * DETOUR_LANE_GAP;
        detourLaneYByRelationId.set(rel.id, laneY);
      }
    });
    const maxDetourY = detourLaneYByRelationId.size > 0 ? Math.max(...detourLaneYByRelationId.values()) : maxContentY;

    const boundaryConfig =
      boundary === false
        ? null
        : { label: boundary?.label ?? DEFAULT_BOUNDARY_LABEL, icon: boundary?.icon ?? DEFAULT_BOUNDARY_ICON };

    // A view is "inside AWS" once every visible node is a container-level AWS resource.
    const isAwsBoundaryView =
      boundaryConfig !== null && positions.length > 0 && positions.every(({ node }) => node.level === "container");
    const groupBoxes = isAwsBoundaryView
      ? computeGroupBoxes(nodes, positions, groups, {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          padding: GROUP_BOX_PADDING,
          labelBand: GROUP_BOX_LABEL_BAND,
        })
      : [];

    if (isAwsBoundaryView && boundaryConfig) {
      const minX = Math.min(...positions.map((p) => p.x), ...groupBoxes.map((b) => b.x));
      const minY = Math.min(...positions.map((p) => p.y), ...groupBoxes.map((b) => b.y));
      const maxX = Math.max(...positions.map((p) => p.x + NODE_WIDTH), ...groupBoxes.map((b) => b.x + b.width));
      const boundaryMaxY = Math.max(maxDetourY, ...groupBoxes.map((b) => b.y + b.height));

      // zIndex is derived from the deepest group present so the boundary always
      // stays furthest back, however many nesting levels a dataset defines; with
      // no groups (groupBoxes empty), this reduces to today's fixed -1.
      const maxGroupDepth = groupBoxes.length > 0 ? Math.max(...groupBoxes.map((b) => b.depth)) : -1;

      cells.push(
        graph.createNode({
          id: BOUNDARY_ID,
          shape: "arch-boundary",
          x: minX - BOUNDARY_PADDING,
          y: minY - BOUNDARY_PADDING,
          width: maxX - minX + BOUNDARY_PADDING * 2,
          height: boundaryMaxY - minY + BOUNDARY_PADDING * 2,
          zIndex: -(maxGroupDepth + 2),
          attrs: {
            icon: { "xlink:href": `/aws-icons/${boundaryConfig.icon}` },
            label: { text: boundaryConfig.label },
          },
        })
      );

      groupBoxes.forEach((box) => {
        const style = GROUP_STYLE[box.group.kind];
        const icon =
          box.group.kind === "subnet"
            ? box.group.subnetType === "public"
              ? "/aws-icons/aws-public-subnet-badge.svg"
              : "/aws-icons/aws-private-subnet-badge.svg"
            : style.icon;
        const labelPrefix =
          box.group.kind === "subnet"
            ? `${box.group.subnetType === "public" ? "Public" : "Private"} subnet: `
            : style.labelPrefix;

        cells.push(
          graph.createNode({
            id: box.group.id,
            shape: "arch-group",
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            zIndex: -(maxGroupDepth + 1 - box.depth),
            attrs: {
              body: { stroke: style.stroke, ...(style.dash ? { strokeDasharray: style.dash } : {}) },
              icon: icon ? { "xlink:href": icon, display: "inline" } : { display: "none" },
              label: {
                refX: icon ? 40 : 12,
                fill: style.stroke,
                text: `${labelPrefix}${box.group.name}`,
              },
            },
          })
        );
      });
    }

    positions.forEach(({ node, x, y }) => {
      const drillable = isDrillable(node.id);
      const isSelected = node.id === selectedNodeId;
      const isSystemBoundary = node.level === "context" && !node.external;
      const hasIcon = Boolean(node.icon);
      const textX = hasIcon ? 62 : NODE_WIDTH / 2;
      const textAnchor = hasIcon ? "start" : "middle";
      const textWidth = (hasIcon ? NODE_WIDTH - textX - 12 : NODE_WIDTH - 24);

      cells.push(
        graph.createNode({
          id: node.id,
          shape: "arch-node",
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          zIndex: 2,
          attrs: {
            body: {
              fill: isSystemBoundary ? "#f0f5ff" : "#ffffff",
              stroke: isSelected ? "#ec7211" : isSystemBoundary ? "#1168bd" : node.external ? "#8b96a5" : "#aab7c4",
              strokeWidth: isSelected ? 2.5 : isSystemBoundary ? 2 : 1,
              ...(node.external ? { strokeDasharray: "5,3" } : {}),
            },
            icon: hasIcon ? { "xlink:href": `/aws-icons/${node.icon}`, display: "inline" } : { display: "none" },
            label: {
              refX: textX,
              textAnchor,
              text: node.name,
              textWrap: { width: textWidth, height: LABEL_WRAP_HEIGHT, ellipsis: true },
            },
            sublabel: {
              refX: textX,
              textAnchor,
              text: node.technology ?? (isSystemBoundary ? "Software System" : node.level.toUpperCase()),
              textWrap: { width: textWidth, height: SUBLABEL_WRAP_HEIGHT, ellipsis: true },
            },
            badge: { text: drillable ? "»" : "" },
          },
        })
      );
    });

    // Edges leaving the same source often share their initial path segment
    // before diverging; push later siblings' labels further toward their own
    // target so they land past the shared segment instead of stacking on it.
    const seenFromSource = new Map<string, number>();

    relations.forEach((rel) => {
      const siblingIndex = seenFromSource.get(rel.source) ?? 0;
      seenFromSource.set(rel.source, siblingIndex + 1);
      const labelDistance = siblingIndex === 0 ? 0.5 : 0.8;

      const sourcePos = positionById.get(rel.source);
      const targetPos = positionById.get(rel.target);
      const laneY = detourLaneYByRelationId.get(rel.id);
      const vertices =
        laneY !== undefined && sourcePos && targetPos
          ? [
              { x: sourcePos.x + NODE_WIDTH / 2, y: laneY },
              { x: targetPos.x + NODE_WIDTH / 2, y: laneY },
            ]
          : undefined;
      const style = getRelationStyle(rel);

      cells.push(
        graph.createEdge({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          zIndex: 1,
          vertices,
          data: { baseOpacity: style.opacity ?? 1 },
          attrs: {
            line: {
              stroke: style.stroke,
              strokeWidth: 1.5,
              opacity: style.opacity ?? 1,
              targetMarker: { name: "block", width: 8, height: 6 },
              ...(style.dash ? { strokeDasharray: style.dash } : {}),
            },
          },
          labels: rel.label
            ? [
                {
                  position: { distance: labelDistance },
                  attrs: {
                    text: { text: rel.label, fontSize: 11, fill: "#3b4553" },
                    rect: {
                      fill: "#ffffff",
                      stroke: "#d8dee6",
                      strokeWidth: 1,
                      refWidth: "100%",
                      refHeight: "100%",
                      refX: "0%",
                      refY: "0%",
                    },
                  },
                },
              ]
            : [],
          router: { name: "manhattan", args: { padding: 12 } },
          connector: "rounded",
        })
      );
    });

    graph.resetCells(cells);
    graph.zoomToFit({ padding: 40, maxScale: 1 });

    // Group boxes aren't real ArchNodes (findNode(archModel, group.id) would find
    // nothing), so clicks on them must be ignored the same way the boundary is.
    const structuralIds = new Set([BOUNDARY_ID, ...groupBoxes.map((b) => b.group.id)]);
    structuralIdsRef.current = structuralIds;
    const clickHandler = ({ node }: { node: { id: string } }) => {
      if (structuralIds.has(node.id)) return;
      onSelectNode(node.id);
    };
    const dblClickHandler = ({ node }: { node: { id: string } }) => {
      if (structuralIds.has(node.id)) return;
      if (isDrillable(node.id)) onDrillInto(node.id);
    };

    graph.on("node:click", clickHandler);
    graph.on("node:dblclick", dblClickHandler);

    return () => {
      graph.off("node:click", clickHandler);
      graph.off("node:dblclick", dblClickHandler);
    };
  }, [nodes, relations, groups, boundary, selectedNodeId, onSelectNode, onDrillInto, isDrillable]);

  // Deliberately separate from the rebuild effect above: path-highlight mode
  // (see tracePath in src/lib/model.ts) toggles frequently as the user
  // explores, and only needs to tweak opacity attrs on already-existing
  // cells — resetCells is the expensive path reserved for actual data
  // changes, not selection/highlight state.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const dimming = highlightedNodeIds !== null;

    graph.getNodes().forEach((cell) => {
      if (structuralIdsRef.current.has(cell.id)) return;
      const opacity = dimming && !highlightedNodeIds!.has(String(cell.id)) ? DIMMED_NODE_OPACITY : 1;
      cell.attr("body/opacity", opacity);
      cell.attr("icon/opacity", opacity);
      cell.attr("label/opacity", opacity);
      cell.attr("sublabel/opacity", opacity);
      cell.attr("badge/opacity", opacity);
    });

    graph.getEdges().forEach((cell) => {
      const baseOpacity = (cell.getData() as { baseOpacity?: number } | undefined)?.baseOpacity ?? 1;
      const dim = dimming && !highlightedRelationIds!.has(String(cell.id));
      cell.attr("line/opacity", dim ? DIMMED_EDGE_OPACITY : baseOpacity);
    });
  }, [highlightedNodeIds, highlightedRelationIds]);

  function handleExport(format: "png" | "svg") {
    const graph = graphRef.current;
    if (!graph) return;
    if (format === "png") {
      graph.exportPNG(exportFileName, { serializeImages: true, backgroundColor: "#ffffff", padding: 20 });
    } else {
      graph.exportSVG(exportFileName, { serializeImages: true, preserveDimensions: true });
    }
  }

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div className="graph-toolbar">
        <button onClick={() => handleExport("png")}>Export PNG</button>
        <button onClick={() => handleExport("svg")}>Export SVG</button>
      </div>
      <div
        ref={minimapContainerRef}
        className="graph-minimap"
        style={{ display: nodes.length > MINIMAP_NODE_THRESHOLD ? "block" : "none" }}
      />
    </>
  );
}
