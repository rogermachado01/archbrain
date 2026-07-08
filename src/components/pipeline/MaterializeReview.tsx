"use client";

import { useEffect, useState } from "react";
import type { RepoMapConfig } from "@okf-scan/types";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";
import { applyReviewAction } from "@/lib/pipeline/materialize-review";
import type { RunFields } from "./RunForm";

interface MaterializeReviewProps {
  repoMap: RepoMapConfig;
  runFields: RunFields;
  proposal: MaterializationProposal | null;
  onProposalLoaded: (proposal: MaterializationProposal) => void;
  onApplied: (summary: SynthesizeSummary) => void;
  onSkip: () => void;
  onError: (message: string) => void;
}

export default function MaterializeReview({
  repoMap,
  runFields,
  proposal,
  onProposalLoaded,
  onApplied,
  onSkip,
  onError,
}: MaterializeReviewProps) {
  const [working, setWorking] = useState<MaterializationProposal | null>(proposal);
  const [loading, setLoading] = useState(proposal === null);
  const [applying, setApplying] = useState(false);

  // Fetches the proposal once, only if the parent hasn't already cached one
  // (e.g. from a previous visit to this step) — see the `[proposal]` dep below.
  useEffect(() => {
    if (proposal !== null) {
      setWorking(proposal);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/pipeline/materialize/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoMap, ...runFields }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        onProposalLoaded(data.proposal);
        setWorking(data.proposal);
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal]);

  async function handleApply() {
    if (!working) return;
    setApplying(true);
    try {
      const res = await fetch("/api/pipeline/materialize/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoMap, ...runFields, proposal: working }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Apply failed");
      onApplied(data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <p className="pipeline-loading">Proposing materialization…</p>;
  if (!working) return null;

  if (working.containerPlans.length === 0 && working.actorProposals.length === 0) {
    return (
      <div className="pipeline-summary">
        <p>No materialization proposed — no container was large enough, and no missing actors were inferred.</p>
        <div className="pipeline-actions">
          <button type="button" onClick={onSkip}>
            Continue to validate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-materialize-review">
      {working.containerPlans.map((plan) => (
        <div className="pipeline-card" key={plan.containerId}>
          <h3>Splitting {plan.containerId}</h3>
          {plan.groups.map((group) => (
            <div className="pipeline-card-row" key={group.containerId}>
              <input
                type="text"
                value={group.contextName}
                onChange={(e) =>
                  setWorking(
                    applyReviewAction(working, {
                      type: "renameGroup",
                      containerId: plan.containerId,
                      groupContainerId: group.containerId,
                      contextName: e.target.value,
                    }),
                  )
                }
              />
              <span>{group.memberIds.length} member(s)</span>
              {group.promoted && <span className="pipeline-badge">Pulled out because other groups depend on it</span>}
              <select
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setWorking(
                    applyReviewAction(working, {
                      type: "mergeGroups",
                      containerId: plan.containerId,
                      intoGroupContainerId: group.containerId,
                      fromGroupContainerId: e.target.value,
                    }),
                  );
                  e.target.value = "";
                }}
              >
                <option value="">Merge with…</option>
                {plan.groups
                  .filter((g) => g.containerId !== group.containerId)
                  .map((g) => (
                    <option key={g.containerId} value={g.containerId}>
                      {g.contextName}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setWorking(
                    applyReviewAction(working, {
                      type: "dropGroup",
                      containerId: plan.containerId,
                      groupContainerId: group.containerId,
                    }),
                  )
                }
              >
                Drop
              </button>
            </div>
          ))}
        </div>
      ))}

      {working.actorProposals.map((actor, i) => (
        <div className="pipeline-card" key={i}>
          <h3>{actor.type}</h3>
          <input
            type="text"
            value={actor.title}
            onChange={(e) => setWorking(applyReviewAction(working, { type: "renameActor", index: i, title: e.target.value }))}
          />
          <p>{actor.description}</p>
          <p>Relation: {actor.relationLabel}</p>
          <button type="button" onClick={() => setWorking(applyReviewAction(working, { type: "dropActor", index: i }))}>
            Drop
          </button>
        </div>
      ))}

      <div className="pipeline-actions">
        <button type="button" onClick={onSkip} disabled={applying}>
          Skip (don&apos;t apply)
        </button>
        <button type="button" onClick={handleApply} disabled={applying}>
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
