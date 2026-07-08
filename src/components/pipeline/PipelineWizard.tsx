"use client";

import { useState } from "react";
import type { RepoMapConfig } from "@okf-scan/types";
import type { MaterializationProposal } from "@okf-scan/synthesize/materialize";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";
import RepoMapEditor from "./RepoMapEditor";
import RunForm, { type RunFields } from "./RunForm";
import ScanResultsSummary from "./ScanResultsSummary";
import MaterializeReview from "./MaterializeReview";
import ValidateAndSnippet from "./ValidateAndSnippet";

type WizardStep = "repo-map" | "run" | "results" | "materialize-review" | "validate";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "repo-map", label: "1. Repo Map" },
  { id: "run", label: "2. Run" },
  { id: "results", label: "3. Results" },
  { id: "materialize-review", label: "4. Materialize" },
  { id: "validate", label: "5. Validate" },
];

export default function PipelineWizard() {
  const [step, setStep] = useState<WizardStep>("repo-map");
  const [repoMap, setRepoMap] = useState<RepoMapConfig | null>(null);
  const [runFields, setRunFields] = useState<RunFields | null>(null);
  const [summary, setSummary] = useState<SynthesizeSummary | null>(null);
  const [proposal, setProposal] = useState<MaterializationProposal | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="pipeline-page">
      <h1>OKF Pipeline</h1>
      <ol className="pipeline-steps">
        {STEPS.map((s) => (
          <li key={s.id} className={s.id === step ? "pipeline-step pipeline-step--active" : "pipeline-step"}>
            {s.label}
          </li>
        ))}
      </ol>
      {error && <div className="pipeline-error">{error}</div>}

      {step === "repo-map" && (
        <RepoMapEditor
          onSaved={(config) => {
            setRepoMap(config);
            setError(null);
            setStep("run");
          }}
          onError={setError}
        />
      )}

      {step === "run" && repoMap && (
        <RunForm
          repoMap={repoMap}
          onBack={() => setStep("repo-map")}
          onResult={(fields, result) => {
            setRunFields(fields);
            setSummary(result);
            setError(null);
            setStep("results");
          }}
          onError={setError}
        />
      )}

      {step === "results" && summary && (
        <ScanResultsSummary
          summary={summary}
          onProposeMaterialize={() => setStep("materialize-review")}
          onSkipToValidate={() => setStep("validate")}
          onBack={() => setStep("run")}
        />
      )}

      {step === "materialize-review" && repoMap && runFields && (
        <MaterializeReview
          repoMap={repoMap}
          runFields={runFields}
          proposal={proposal}
          onProposalLoaded={setProposal}
          onApplied={(result) => {
            setSummary(result);
            setError(null);
            setStep("validate");
          }}
          onSkip={() => setStep("validate")}
          onError={setError}
        />
      )}

      {step === "validate" && runFields && <ValidateAndSnippet runFields={runFields} onBack={() => setStep("results")} />}
    </div>
  );
}
