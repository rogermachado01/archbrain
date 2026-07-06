import path from "node:path";
import ts from "typescript";
import { ROOT_CONTEXT_ID, type ConceptFacts, type FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";
import { buildRouteTable, isReservedPageFile, matchRoute, pagesRelativePath } from "./next-routes";
import { loadCompilerOptions, resolveImportedFile } from "./module-resolution";

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

/**
 * Matches Next.js's default-export page convention: `export default function Foo() {}`,
 * or `const Foo = () => {...}; export default Foo;` (the shape actual Next.js pages use
 * — see e.g. `pages/index.tsx` in `template-marketing-webapp-nextjs` — which
 * `isExportedComponent` above deliberately does not match, since that page-specific
 * shape would also match ordinary default-exported non-component modules).
 */
function isDefaultExportedComponent(source: ts.SourceFile): boolean {
  for (const fn of findDescendants(source, ts.isFunctionDeclaration)) {
    const isDefaultExport =
      (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false) &&
      (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false);
    if (isDefaultExport && fn.name && /^[A-Z]/.test(fn.name.text)) return true;
  }

  const defaultExportedNames = new Set<string>();
  for (const exportAssignment of findDescendants(source, ts.isExportAssignment)) {
    if (exportAssignment.isExportEquals) continue;
    if (ts.isIdentifier(exportAssignment.expression)) defaultExportedNames.add(exportAssignment.expression.text);
  }
  if (defaultExportedNames.size === 0) return false;

  for (const varStmt of findDescendants(source, ts.isVariableStatement)) {
    for (const decl of varStmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text) && defaultExportedNames.has(decl.name.text)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * A concept id ending in "/index" would collide with okf-import.ts's own reserved
 * meaning for that suffix: `pathToId` strips a trailing "/index" segment, treating
 * "<dir>/index.md" as that directory's own child-listing navigation file (written by
 * synthesize.ts's writeChildIndexes), never a real concept — so a page literally named
 * "index.tsx" (the home page of virtually every Next.js repo) needs a different file
 * name to avoid silently colliding with, and being overwritten by, that listing file.
 */
function conceptIdForFile(containerId: string, file: string): string {
  const base = path.basename(file, path.extname(file));
  const safeBase = base === "index" ? "index-page" : base;
  return `${containerId}/${safeBase}`;
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

function extractStringLiteral(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isJsxExpression(node) && node.expression) return extractStringLiteral(node.expression);
  return null;
}

interface NavigationTarget {
  /** The literal path, or null when a Link/router.push was found but its target isn't a static string (e.g. a template literal with interpolation). */
  literal: string | null;
  description: string;
}

/** Finds `<Link href="...">` and `router.push("...")`/`Router.push("...")` call sites. Matches purely on tag/identifier name, not import provenance — see the design doc's "Navigation relations" section for why that's an acceptable simplification. */
function findNavigationTargets(root: ts.Node): NavigationTarget[] {
  const targets: NavigationTarget[] = [];

  for (const jsx of findDescendants(
    root,
    (n): n is ts.JsxOpeningElement | ts.JsxSelfClosingElement => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n),
  )) {
    if (!ts.isIdentifier(jsx.tagName) || jsx.tagName.text !== "Link") continue;
    const hrefAttr = jsx.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === "href",
    );
    if (!hrefAttr) continue;
    const literal = extractStringLiteral(hrefAttr.initializer);
    targets.push({
      literal,
      description: literal ? `<Link href="${literal}">` : `<Link href={...}> with a non-literal value`,
    });
  }

  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "push") continue;
    if (!ts.isIdentifier(call.expression.expression)) continue;
    if (!["router", "Router"].includes(call.expression.expression.text)) continue;
    const [arg] = call.arguments;
    const literal = extractStringLiteral(arg);
    targets.push({
      literal,
      description: literal ? `router.push("${literal}")` : "router.push(...) with a non-literal value",
    });
  }

  return targets;
}

function importedNameFor(importClause: ts.ImportClause | undefined, specifier: string): string {
  if (!importClause) return specifier;
  if (importClause.name) return importClause.name.text;
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    return importClause.namedBindings.elements.map((e) => e.name.text).join(", ");
  }
  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    return importClause.namedBindings.name.text;
  }
  return specifier;
}

/**
 * Static import → "composition" relation: does file A import a component/page that's
 * also a scanned concept in this same repo? Type-only imports and imports that don't
 * resolve to another scanned concept (external packages, non-component files) are
 * silently skipped — see the design doc's "Composition relations" section.
 *
 * Two separate import declarations can resolve to the same target concept (e.g.
 * GraphQL-codegen files commonly get imported once for a value binding and once more
 * for a type-only or differently-named binding) — those are merged into a single
 * relation per targetId, combining the imported names into one evidence string,
 * rather than emitting duplicate overlapping edges for the same (source, target) pair.
 */
function findCompositionRelations(
  source: ts.SourceFile,
  containingFile: string,
  compilerOptions: ts.CompilerOptions,
  fileToConceptId: Map<string, string>
): FactRelation[] {
  const byTarget = new Map<string, { specifier: string; names: string[] }>();
  for (const imp of findDescendants(source, ts.isImportDeclaration)) {
    if (imp.importClause?.isTypeOnly) continue;
    if (!ts.isStringLiteral(imp.moduleSpecifier)) continue;
    const specifier = imp.moduleSpecifier.text;
    const resolved = resolveImportedFile(specifier, containingFile, compilerOptions);
    if (!resolved) continue;
    const targetId = fileToConceptId.get(path.resolve(resolved));
    if (!targetId) continue;
    const name = importedNameFor(imp.importClause, specifier);
    const existing = byTarget.get(targetId);
    if (existing) existing.names.push(name);
    else byTarget.set(targetId, { specifier, names: [name] });
  }
  return Array.from(byTarget, ([targetId, { specifier, names }]) => ({
    targetId,
    kind: "sync" as const,
    evidence: `imports ${names.join(", ")} from "${specifier}"`,
  }));
}

export interface FrontendScanContext {
  repoDir: string;
  containerId: string;
  /** URL prefix -> target concept id, e.g. { "https://api.example.com/orders": "orders_api" } */
  apiBaseUrls: Record<string, string>;
}

interface ParsedFile {
  file: string;
  source: ts.SourceFile;
  conceptId: string;
  isPage: boolean;
}

export async function scanFrontendRepo(ctx: FrontendScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);

  // Pass 1: discover every concept file (page or component) before computing any
  // relations, so pass 2 can tell whether an import/link target is actually one of
  // this repo's own scanned concepts.
  const parsedFiles: ParsedFile[] = [];
  for (const file of files) {
    const source = await parseSourceFile(file);
    const pagesRelative = pagesRelativePath(file, ctx.repoDir);
    const isReservedPage = pagesRelative !== undefined && isReservedPageFile(pagesRelative);
    const isPage = pagesRelative !== undefined && !isReservedPage && isDefaultExportedComponent(source);
    const isComponent = !isPage && findDescendants(source, isExportedComponent).length > 0;
    if (!isPage && !isComponent) continue;

    parsedFiles.push({
      file,
      source,
      conceptId: conceptIdForFile(ctx.containerId, file),
      isPage,
    });
  }

  // Unlike a Lambda repo (whose container concept comes from the matching Terraform
  // resource, see scan-terraform.ts), a frontend repo has no backing AWS resource to
  // synthesize this from — without it, the components below would all declare a
  // parentId that no concept ever defines, leaving them unreachable from the bundle's
  // index.md link graph (okf-import.ts only discovers concepts by walking index.md
  // links, never by listing a directory directly).
  const compilerOptions = loadCompilerOptions(ctx.repoDir);
  const fileToConceptId = new Map<string, string>(
    parsedFiles.map((p) => [path.resolve(p.file), p.conceptId]),
  );
  const routeTable = buildRouteTable(
    parsedFiles
      .filter((p) => p.isPage)
      .map((p) => ({ conceptId: p.conceptId, pagesRelative: pagesRelativePath(p.file, ctx.repoDir)! })),
  );

  const concepts: ConceptFacts[] = [
    { id: ctx.containerId, type: "Frontend Application", level: "container", parentId: ROOT_CONTEXT_ID, sourceFiles: [ctx.repoDir] },
  ];

  for (const parsed of parsedFiles) {
    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const url of findFetchUrls(parsed.source)) {
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

    relations.push(...findCompositionRelations(parsed.source, parsed.file, compilerOptions, fileToConceptId));

    for (const nav of findNavigationTargets(parsed.source)) {
      if (nav.literal === null) {
        needsReview.push(`${nav.description} does not resolve to a static path`);
        continue;
      }
      const targetId = matchRoute(nav.literal, routeTable);
      if (!targetId) {
        needsReview.push(`${nav.description} does not match any known page route`);
        continue;
      }
      relations.push({ targetId, kind: "sync", evidence: `${nav.description} resolves to page "${targetId}"` });
    }

    concepts.push({
      id: parsed.conceptId,
      type: parsed.isPage ? "Next.js Page" : "React Component",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [parsed.file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
