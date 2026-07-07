import type { CapabilityGroup, MaterializationProposal } from "@okf-scan/synthesize/materialize";

export type MaterializeReviewAction =
  | { type: "renameGroup"; containerId: string; groupContainerId: string; contextName: string }
  | { type: "mergeGroups"; containerId: string; intoGroupContainerId: string; fromGroupContainerId: string }
  | { type: "dropGroup"; containerId: string; groupContainerId: string }
  | { type: "renameActor"; index: number; title: string }
  | { type: "dropActor"; index: number };

/**
 * Pure edit step over a MaterializationProposal, mirroring the review model
 * `.claude/skills/okf-scan-humanize/SKILL.md` already documents as a manual
 * JSON edit: accept (no action needed), rename, merge two groups, or drop an
 * item. Nothing here touches disk — the caller sends the final edited
 * proposal to POST /api/pipeline/materialize/apply once the user is done.
 */
export function applyReviewAction(
  proposal: MaterializationProposal,
  action: MaterializeReviewAction,
): MaterializationProposal {
  switch (action.type) {
    case "renameGroup":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) =>
          plan.containerId !== action.containerId
            ? plan
            : {
                ...plan,
                groups: plan.groups.map((g) =>
                  g.containerId === action.groupContainerId ? { ...g, contextName: action.contextName } : g,
                ),
              },
        ),
      };

    case "dropGroup":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) => {
          if (plan.containerId !== action.containerId) return plan;
          const dropped = plan.groups.find((g) => g.containerId === action.groupContainerId);
          if (!dropped) return plan;
          const idRemap = { ...plan.idRemap };
          for (const memberId of dropped.memberIds) delete idRemap[memberId];
          return { ...plan, groups: plan.groups.filter((g) => g.containerId !== action.groupContainerId), idRemap };
        }),
      };

    case "mergeGroups":
      return {
        ...proposal,
        containerPlans: proposal.containerPlans.map((plan) => {
          if (plan.containerId !== action.containerId) return plan;
          const into = plan.groups.find((g) => g.containerId === action.intoGroupContainerId);
          const from = plan.groups.find((g) => g.containerId === action.fromGroupContainerId);
          if (!into || !from) return plan;
          const mergedInto: CapabilityGroup = { ...into, memberIds: [...into.memberIds, ...from.memberIds] };
          const idRemap = { ...plan.idRemap };
          for (const memberId of from.memberIds) {
            const leafSegment = memberId.split("/").pop()!;
            idRemap[memberId] = `${into.containerId}/${leafSegment}`;
          }
          return {
            ...plan,
            groups: plan.groups
              .filter((g) => g.containerId !== action.fromGroupContainerId && g.containerId !== action.intoGroupContainerId)
              .concat(mergedInto),
            idRemap,
          };
        }),
      };

    case "renameActor":
      return {
        ...proposal,
        actorProposals: proposal.actorProposals.map((a, i) => (i === action.index ? { ...a, title: action.title } : a)),
      };

    case "dropActor":
      return {
        ...proposal,
        actorProposals: proposal.actorProposals.filter((_, i) => i !== action.index),
      };
  }
}
