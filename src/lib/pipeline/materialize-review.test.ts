import { describe, expect, it } from "vitest";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import { applyReviewAction } from "./materialize-review";

function baseProposal(): MaterializationProposal {
  return {
    containerPlans: [
      {
        containerId: "app/shared-ui",
        groups: [
          {
            containerId: "app/shared-ui/layout-navigation",
            memberIds: ["app/shared-ui/header", "app/shared-ui/footer"],
            contextName: "Layout & Navigation",
            promoted: false,
          },
          {
            containerId: "app/shared-ui/contentful-media",
            memberIds: ["app/shared-ui/ctf-image"],
            contextName: "Contentful Media",
            promoted: false,
          },
        ],
        idRemap: {
          "app/shared-ui/header": "app/shared-ui/layout-navigation/header",
          "app/shared-ui/footer": "app/shared-ui/layout-navigation/footer",
          "app/shared-ui/ctf-image": "app/shared-ui/contentful-media/ctf-image",
        },
      },
    ],
    actorProposals: [
      { type: "Person", title: "Visitor", description: "A person browsing the site", relationLabel: "browses" },
    ],
  };
}

describe("applyReviewAction", () => {
  it("renameGroup renames only the targeted group", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "renameGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/layout-navigation",
      contextName: "Nav & Footer",
    });
    expect(result.containerPlans[0].groups[0].contextName).toBe("Nav & Footer");
    expect(result.containerPlans[0].groups[1].contextName).toBe("Contentful Media");
  });

  it("dropGroup removes the group and its idRemap entries", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "dropGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/contentful-media",
    });
    expect(result.containerPlans[0].groups.map((g) => g.containerId)).toEqual(["app/shared-ui/layout-navigation"]);
    expect(result.containerPlans[0].idRemap).toEqual({
      "app/shared-ui/header": "app/shared-ui/layout-navigation/header",
      "app/shared-ui/footer": "app/shared-ui/layout-navigation/footer",
    });
  });

  it("mergeGroups folds the 'from' group into the 'into' group and remaps only its members", () => {
    const result = applyReviewAction(baseProposal(), {
      type: "mergeGroups",
      containerId: "app/shared-ui",
      intoGroupContainerId: "app/shared-ui/layout-navigation",
      fromGroupContainerId: "app/shared-ui/contentful-media",
    });
    const plan = result.containerPlans[0];
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].memberIds).toEqual(["app/shared-ui/header", "app/shared-ui/footer", "app/shared-ui/ctf-image"]);
    expect(plan.idRemap["app/shared-ui/ctf-image"]).toBe("app/shared-ui/layout-navigation/ctf-image");
    expect(plan.idRemap["app/shared-ui/header"]).toBe("app/shared-ui/layout-navigation/header");
  });

  it("renameActor and dropActor operate on actorProposals independently of containerPlans", () => {
    const renamed = applyReviewAction(baseProposal(), { type: "renameActor", index: 0, title: "Site Visitor" });
    expect(renamed.actorProposals[0].title).toBe("Site Visitor");
    expect(renamed.containerPlans).toEqual(baseProposal().containerPlans);

    const dropped = applyReviewAction(baseProposal(), { type: "dropActor", index: 0 });
    expect(dropped.actorProposals).toEqual([]);
  });

  it("only affects the targeted container plan when multiple plans exist", () => {
    const proposal: MaterializationProposal = {
      ...baseProposal(),
      containerPlans: [
        ...baseProposal().containerPlans,
        {
          containerId: "app/other",
          groups: [{ containerId: "app/other/g1", memberIds: ["app/other/x"], contextName: "G1", promoted: false }],
          idRemap: { "app/other/x": "app/other/g1/x" },
        },
      ],
    };
    const result = applyReviewAction(proposal, {
      type: "dropGroup",
      containerId: "app/shared-ui",
      groupContainerId: "app/shared-ui/contentful-media",
    });
    expect(result.containerPlans[1]).toEqual(proposal.containerPlans[1]);
  });
});
