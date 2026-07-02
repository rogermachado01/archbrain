import manifest from "@/data/aws-icon-manifest.json";

export interface AwsIconEntry {
  /** filename without extension, e.g. "amazon-dynamodb" */
  key: string;
  /** official AWS service name, e.g. "Amazon DynamoDB" */
  service: string;
  /** AWS Architecture Icons category, e.g. "Databases" */
  category: string;
  /** filename under /public/aws-icons, e.g. "amazon-dynamodb.svg" — use directly as node.icon */
  file: string;
}

export const awsIconManifest: AwsIconEntry[] = manifest;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Looks up an AWS Architecture Icon by service name or key, tolerant of case,
 * spacing and punctuation differences (e.g. "amazon dynamodb", "DynamoDB",
 * "amazon-dynamodb" all match "Amazon DynamoDB"). Returns the filename to use
 * as `ArchNode.icon`, or undefined if no service matches.
 */
export function findAwsIcon(serviceNameOrKey: string): string | undefined {
  const target = normalize(serviceNameOrKey);
  const exact = awsIconManifest.find(
    (entry) => normalize(entry.service) === target || normalize(entry.key) === target
  );
  if (exact) return exact.file;

  const partial = awsIconManifest.find(
    (entry) => normalize(entry.service).includes(target) || target.includes(normalize(entry.key))
  );
  return partial?.file;
}

/** All icon entries for a given AWS Architecture Icons category (e.g. "Compute", "Databases"). */
export function listAwsIconsByCategory(category: string): AwsIconEntry[] {
  return awsIconManifest.filter((entry) => entry.category.toLowerCase() === category.toLowerCase());
}
