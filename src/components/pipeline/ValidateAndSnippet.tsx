"use client";

import { useState } from "react";
import { dataSourceSnippet } from "@/lib/pipeline/data-source-snippet";
import type { RunFields } from "./RunForm";

interface ValidateAndSnippetProps {
  runFields: RunFields;
  onBack: () => void;
}

export default function ValidateAndSnippet({ runFields, onBack }: ValidateAndSnippetProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const snippet = dataSourceSnippet(runFields.out);

  async function handleValidate() {
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/pipeline/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ out: runFields.out }),
      });
      setResult(await res.json());
    } finally {
      setChecking(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pipeline-summary">
      <div className="pipeline-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={handleValidate} disabled={checking}>
          {checking ? "Validating…" : "Run validate"}
        </button>
      </div>
      {result && (
        <p className={result.valid ? "pipeline-valid" : "pipeline-error"}>
          {result.valid ? "Bundle is valid." : `Validation failed: ${result.error}`}
        </p>
      )}
      <h3>Add this to DATA_SOURCES in src/lib/data-sources.ts</h3>
      <pre className="pipeline-snippet">{snippet}</pre>
      <button type="button" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy snippet"}
      </button>
    </div>
  );
}
