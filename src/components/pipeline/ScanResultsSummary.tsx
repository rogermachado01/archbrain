"use client";

import type { SynthesizeSummary } from "@okf-scan/synthesize/synthesize";

interface ScanResultsSummaryProps {
  summary: SynthesizeSummary;
  onProposeMaterialize: () => void;
  onSkipToValidate: () => void;
  onBack: () => void;
}

export default function ScanResultsSummary({ summary, onProposeMaterialize, onSkipToValidate, onBack }: ScanResultsSummaryProps) {
  return (
    <div className="pipeline-summary">
      <p>
        Wrote {summary.written.length}, skipped {summary.skipped.length} concept(s).
      </p>
      {summary.needsReview.length > 0 && (
        <div>
          <h3>{summary.needsReview.length} concept(s) need manual review</h3>
          <ul>
            {summary.needsReview.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong>
                <ul>
                  {item.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.failed.length > 0 && (
        <div>
          <h3>{summary.failed.length} concept(s) failed (will retry next run)</h3>
          <ul>
            {summary.failed.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong>: {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="pipeline-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={onProposeMaterialize}>
          Propose materialization
        </button>
        <button type="button" onClick={onSkipToValidate}>
          Skip to validate
        </button>
      </div>
    </div>
  );
}
