"use client";

import { useState, type FormEvent } from "react";
import type { Environment, RepoMapConfig } from "@okf-scan/types";
import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";

export interface RunFields {
  env: Environment;
  out: string;
  force: boolean;
  concurrencyGit: number;
  concurrencyScan: number;
  concurrencyLlm: number;
}

interface RunFormProps {
  repoMap: RepoMapConfig;
  onBack: () => void;
  onResult: (fields: RunFields, summary: SynthesizeSummary) => void;
  onError: (message: string) => void;
}

const DEFAULT_FIELDS: RunFields = {
  env: "dev",
  out: "",
  force: false,
  concurrencyGit: 20,
  concurrencyScan: 4,
  concurrencyLlm: 6,
};

export default function RunForm({ repoMap, onBack, onResult, onError }: RunFormProps) {
  const [fields, setFields] = useState<RunFields>(DEFAULT_FIELDS);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await fetch("/api/pipeline/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoMap, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      onResult(fields, data.summary);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <form className="pipeline-form" onSubmit={handleSubmit}>
      <label className="pipeline-form-row">
        Environment
        <select value={fields.env} onChange={(e) => setFields({ ...fields, env: e.target.value as Environment })}>
          <option value="dev">dev</option>
          <option value="hml">hml</option>
          <option value="prd">prd</option>
        </select>
      </label>
      <label className="pipeline-form-row">
        Output bundle directory
        <input
          type="text"
          placeholder="public/okf-bundles/my-bundle"
          value={fields.out}
          onChange={(e) => setFields({ ...fields, out: e.target.value })}
          required
        />
      </label>
      <label className="pipeline-form-row pipeline-form-row--checkbox">
        <input type="checkbox" checked={fields.force} onChange={(e) => setFields({ ...fields, force: e.target.checked })} />
        Force (ignore manifest cache, rescan everything)
      </label>
      <button type="button" className="pipeline-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? "Hide" : "Show"} advanced options
      </button>
      {showAdvanced && (
        <>
          <label className="pipeline-form-row">
            Concurrency — git
            <input
              type="number"
              min={1}
              value={fields.concurrencyGit}
              onChange={(e) => setFields({ ...fields, concurrencyGit: Number(e.target.value) })}
            />
          </label>
          <label className="pipeline-form-row">
            Concurrency — scan
            <input
              type="number"
              min={1}
              value={fields.concurrencyScan}
              onChange={(e) => setFields({ ...fields, concurrencyScan: Number(e.target.value) })}
            />
          </label>
          <label className="pipeline-form-row">
            Concurrency — LLM
            <input
              type="number"
              min={1}
              value={fields.concurrencyLlm}
              onChange={(e) => setFields({ ...fields, concurrencyLlm: Number(e.target.value) })}
            />
          </label>
        </>
      )}
      <div className="pipeline-actions">
        <button type="button" onClick={onBack} disabled={running}>
          Back
        </button>
        <button type="submit" disabled={running}>
          {running ? "Running…" : "Run scan"}
        </button>
      </div>
    </form>
  );
}
