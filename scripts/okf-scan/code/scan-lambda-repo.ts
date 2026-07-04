import path from "node:path";
import ts from "typescript";
import type { ConceptFacts, FactRelation } from "../types";
import { findDescendants, listSourceFiles, parseSourceFile } from "./ts-source";

const COMMAND_ARG_NAMES: Record<string, string> = {
  PutItemCommand: "TableName",
  GetItemCommand: "TableName",
  UpdateItemCommand: "TableName",
  DeleteItemCommand: "TableName",
  QueryCommand: "TableName",
  SendMessageCommand: "QueueUrl",
  PublishCommand: "TopicArn",
};

const ASYNC_COMMANDS = new Set(["SendMessageCommand", "PublishCommand"]);

type TargetValue =
  | { kind: "literal"; value: string }
  | { kind: "envVar"; name: string }
  | { kind: "unresolved"; raw: string };

interface SdkCall {
  commandName: string;
  argName: string;
  targetValue: TargetValue;
}

function isHandlerExport(node: ts.Node): node is ts.VariableStatement {
  if (!ts.isVariableStatement(node)) return false;
  const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  return isExported && node.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === "handler");
}

function extractObjectLiteralProp(obj: ts.ObjectLiteralExpression, propName: string): TargetValue | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== propName) continue;
    const init = prop.initializer;
    if (ts.isStringLiteral(init)) return { kind: "literal", value: init.text };
    if (
      ts.isPropertyAccessExpression(init) &&
      ts.isPropertyAccessExpression(init.expression) &&
      ts.isIdentifier(init.expression.expression) &&
      init.expression.expression.text === "process" &&
      init.expression.name.text === "env"
    ) {
      return { kind: "envVar", name: init.name.text };
    }
    return { kind: "unresolved", raw: init.getText() };
  }
  return undefined;
}

function findSdkCalls(root: ts.Node): SdkCall[] {
  const calls: SdkCall[] = [];
  for (const call of findDescendants(root, ts.isCallExpression)) {
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "send") continue;
    const [arg] = call.arguments;
    if (!arg || !ts.isNewExpression(arg) || !ts.isIdentifier(arg.expression)) continue;
    const commandName = arg.expression.text;
    const argName = COMMAND_ARG_NAMES[commandName];
    if (!argName) continue;
    const [commandArg] = arg.arguments ?? [];
    if (!commandArg || !ts.isObjectLiteralExpression(commandArg)) continue;
    const targetValue = extractObjectLiteralProp(commandArg, argName);
    if (!targetValue) continue;
    calls.push({ commandName, argName, targetValue });
  }
  return calls;
}

export interface LambdaScanContext {
  repoDir: string;
  /** the Terraform resource name this repo is mapped to, e.g. "orders" */
  containerId: string;
  /** env var name -> "tfType.tfName", from ScanResult.lambdaEnvVarBindings[containerId] */
  envVarBindings: Record<string, string>;
}

export async function scanLambdaRepo(ctx: LambdaScanContext): Promise<ConceptFacts[]> {
  const files = await listSourceFiles(ctx.repoDir);
  const concepts: ConceptFacts[] = [];

  for (const file of files) {
    const source = await parseSourceFile(file);
    if (findDescendants(source, isHandlerExport).length === 0) continue;

    const relations: FactRelation[] = [];
    const needsReview: string[] = [];

    for (const call of findSdkCalls(source)) {
      if (call.targetValue.kind === "envVar") {
        const binding = ctx.envVarBindings[call.targetValue.name];
        if (!binding) {
          needsReview.push(
            `${call.commandName} uses process.env.${call.targetValue.name}, which has no matching Terraform environment.variables binding`
          );
          continue;
        }
        relations.push({
          targetId: binding.split(".")[1],
          kind: ASYNC_COMMANDS.has(call.commandName) ? "async-event" : "sync",
          evidence: `${call.commandName} + env var ${call.targetValue.name} bound in Terraform to ${binding}`,
        });
        continue;
      }
      if (call.targetValue.kind === "literal") {
        needsReview.push(
          `${call.commandName}'s ${call.argName} is a literal value ("${call.targetValue.value}") — not resolved to a concept id automatically`
        );
        continue;
      }
      needsReview.push(`${call.commandName}'s ${call.argName} could not be resolved statically: ${call.targetValue.raw}`);
    }

    concepts.push({
      id: `${ctx.containerId}/${path.basename(file, path.extname(file))}`,
      type: "AWS Lambda Handler",
      level: "component",
      parentId: ctx.containerId,
      relations,
      sourceFiles: [file],
      needsReview: needsReview.length > 0 ? needsReview : undefined,
    });
  }

  return concepts;
}
