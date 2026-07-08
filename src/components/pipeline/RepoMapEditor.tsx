"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { RepoMapConfig } from "@okf-scan/types";

interface BranchFields {
  dev: string;
  hml: string;
  prd: string;
}

interface ResourceRow {
  key: string;
  repo: string;
  branch: BranchFields;
}

interface FrontendRow {
  repo: string;
  branch: BranchFields;
}

interface FormState {
  terraformEnabled: boolean;
  terraformPath: string;
  terraformEnvFiles: BranchFields;
  resources: ResourceRow[];
  frontend: FrontendRow[];
}

const EMPTY_BRANCH: BranchFields = { dev: "", hml: "", prd: "" };

const EMPTY_FORM: FormState = {
  terraformEnabled: false,
  terraformPath: "",
  terraformEnvFiles: { dev: "", hml: "", prd: "" },
  resources: [],
  frontend: [],
};

function configToForm(config: RepoMapConfig): FormState {
  return {
    terraformEnabled: Boolean(config.terraform),
    terraformPath: config.terraform?.path ?? "",
    terraformEnvFiles: config.terraform?.envFiles ?? { dev: "", hml: "", prd: "" },
    resources: Object.entries(config.resources ?? {}).map(([key, entry]) => ({ key, repo: entry.repo, branch: entry.branch })),
    frontend: (config.frontend ?? []).map((entry) => ({ repo: entry.repo, branch: entry.branch })),
  };
}

function formToConfig(form: FormState): RepoMapConfig {
  const config: RepoMapConfig = {};
  if (form.terraformEnabled) {
    config.terraform = { path: form.terraformPath, envFiles: form.terraformEnvFiles };
  }
  if (form.resources.length > 0) {
    config.resources = Object.fromEntries(form.resources.map((r) => [r.key, { repo: r.repo, branch: r.branch }]));
  }
  if (form.frontend.length > 0) {
    config.frontend = form.frontend.map((f) => ({ repo: f.repo, branch: f.branch }));
  }
  return config;
}

interface RepoMapEditorProps {
  onSaved: (config: RepoMapConfig) => void;
  onError: (message: string) => void;
}

export default function RepoMapEditor({ onSaved, onError }: RepoMapEditorProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetches once on mount — repo-map.yaml is a single file with no reactive
  // inputs, so there's nothing else this effect needs to depend on.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline/repo-map")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.config) setForm(configToForm(data.config));
      })
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const config = formToConfig(form);
      const res = await fetch("/api/pipeline/repo-map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save repo-map.yaml");
      onSaved(config);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function updateResource(index: number, patch: Partial<ResourceRow>) {
    setForm({ ...form, resources: form.resources.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  }

  function updateFrontend(index: number, patch: Partial<FrontendRow>) {
    setForm({ ...form, frontend: form.frontend.map((f, i) => (i === index ? { ...f, ...patch } : f)) });
  }

  if (loading) return <p className="pipeline-loading">Loading repo-map.yaml…</p>;

  return (
    <form className="pipeline-form" onSubmit={handleSave}>
      <fieldset className="pipeline-fieldset">
        <legend>
          <label>
            <input
              type="checkbox"
              checked={form.terraformEnabled}
              onChange={(e) => setForm({ ...form, terraformEnabled: e.target.checked })}
            />
            Terraform
          </label>
        </legend>
        {form.terraformEnabled && (
          <>
            <label className="pipeline-form-row">
              Path
              <input type="text" value={form.terraformPath} onChange={(e) => setForm({ ...form, terraformPath: e.target.value })} />
            </label>
            {(["dev", "hml", "prd"] as const).map((env) => (
              <label className="pipeline-form-row" key={env}>
                Env file ({env})
                <input
                  type="text"
                  value={form.terraformEnvFiles[env]}
                  onChange={(e) => setForm({ ...form, terraformEnvFiles: { ...form.terraformEnvFiles, [env]: e.target.value } })}
                />
              </label>
            ))}
          </>
        )}
      </fieldset>

      <fieldset className="pipeline-fieldset">
        <legend>Resources (Lambdas)</legend>
        {form.resources.map((row, i) => (
          <div className="pipeline-repo-row" key={i}>
            <input type="text" placeholder="aws_lambda_function.orders" value={row.key} onChange={(e) => updateResource(i, { key: e.target.value })} />
            <input type="text" placeholder="../orders-service" value={row.repo} onChange={(e) => updateResource(i, { repo: e.target.value })} />
            {(["dev", "hml", "prd"] as const).map((env) => (
              <input
                key={env}
                type="text"
                placeholder={env}
                value={row.branch[env]}
                onChange={(e) => updateResource(i, { branch: { ...row.branch, [env]: e.target.value } })}
              />
            ))}
            <button type="button" onClick={() => setForm({ ...form, resources: form.resources.filter((_, idx) => idx !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setForm({ ...form, resources: [...form.resources, { key: "", repo: "", branch: { ...EMPTY_BRANCH } }] })
          }
        >
          Add resource
        </button>
      </fieldset>

      <fieldset className="pipeline-fieldset">
        <legend>Frontend</legend>
        {form.frontend.map((row, i) => (
          <div className="pipeline-repo-row" key={i}>
            <input
              type="text"
              placeholder="../template-marketing-webapp-nextjs"
              value={row.repo}
              onChange={(e) => updateFrontend(i, { repo: e.target.value })}
            />
            {(["dev", "hml", "prd"] as const).map((env) => (
              <input
                key={env}
                type="text"
                placeholder={env}
                value={row.branch[env]}
                onChange={(e) => updateFrontend(i, { branch: { ...row.branch, [env]: e.target.value } })}
              />
            ))}
            <button type="button" onClick={() => setForm({ ...form, frontend: form.frontend.filter((_, idx) => idx !== i) })}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setForm({ ...form, frontend: [...form.frontend, { repo: "", branch: { ...EMPTY_BRANCH } }] })}>
          Add frontend repo
        </button>
      </fieldset>

      <div className="pipeline-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </form>
  );
}
