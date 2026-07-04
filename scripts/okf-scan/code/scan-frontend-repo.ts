import path from "node:path";
import ts from "typescript";
import type { ConceptFacts, FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

function isExportedComponent(node: ts.Node): node is ts.FunctionDeclaration | ts.VariableStatement {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
    return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }
  if (ts.isVariableStatement(node)) {
    const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    return isExported && node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text));
  }
  return false;
}

function findFetchUrls(root: ts.Node): string[] {
  const urls: string[] = [];
  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isIdentifier(call.expression) || call.expression.text !== "fetch") continue;
    const [arg] = call.arguments;
    if (arg && ts.isStringLiteral(arg)) urls.push(arg.text);
  }
  return urls;
}

export interface FrontendScanContext {
  repoDir: string;
  containerId: string;
  /** URL prefix -> target concept id, e.g. { "https://api.example.com/orders": "orders_api" } */
  apiBaseUrls: Record<string, string>;
}

export async function scanFrontendRepo(ctx: FrontendScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);
  const concepts: ConceptFacts[] = [];

  for (const file of files) {
    const source = await parseSourceFile(file);
    if (findDescendants(source, isExportedComponent).length === 0) continue;

    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const url of findFetchUrls(source)) {
      const baseUrl = Object.keys(ctx.apiBaseUrls).find((prefix) => url.startsWith(prefix));
      if (!baseUrl) {
        needsReview.push(`fetch("${url}") does not match any known API base URL`);
        continue;
      }
      relations.push({
        targetId: ctx.apiBaseUrls[baseUrl],
        kind: "sync",
        evidence: `fetch("${url}") matches configured API base URL "${baseUrl}"`,
      });
    }

    concepts.push({
      id: `${ctx.containerId}/${path.basename(file, path.extname(file))}`,
      type: "React Component",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
