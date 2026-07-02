/**
 * Minimal YAML-frontmatter parser tailored to the small subset OKF actually
 * needs (SPEC.md's recommended fields are flat scalars + one list): scalar
 * strings/numbers/booleans, inline `[a, b]` lists, and block `- item` lists.
 * Deliberately hand-rolled instead of pulling in a full YAML library, since
 * this only ever parses bundles we author ourselves and needs to run in the
 * browser (client components fetch + parse the markdown at runtime).
 */

export type FrontmatterValue = string | number | boolean | string[];
export interface Frontmatter {
  [key: string]: FrontmatterValue;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function coerceScalar(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return stripQuotes(value);
}

/** Splits a document into { data, content }, parsing the leading `---` block as frontmatter. */
export function parseFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, yamlBlock, content] = match;
  const lines = yamlBlock.split("\n");
  const data: Frontmatter = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const kv = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const [, key, rest] = kv;

    if (rest === "") {
      // Possible block list on the following indented `- item` lines.
      const items: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s*/.test(lines[j])) {
        items.push(stripQuotes(lines[j].replace(/^\s*-\s*/, "").trim()));
        j++;
      }
      data[key] = items;
      i = j;
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      data[key] = rest
        .slice(1, -1)
        .split(",")
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
      i++;
      continue;
    }

    data[key] = coerceScalar(rest);
    i++;
  }

  return { data, content: content ?? "" };
}
