#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledge, validateText } from "./check_suno_input.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const TRADEOFFS_PATH = path.join(SKILL_DIR, "references", "style-tradeoffs.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function canonicalizeStyle(value) {
  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/^\s*,\s*|\s*,\s*$/g, "")
    .trim();
}

function styleElements(value) {
  return canonicalizeStyle(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function joinStyleElements(elements) {
  return canonicalizeStyle(elements.filter(Boolean).join(", "));
}

function applyOperation(style, operation) {
  const current = canonicalizeStyle(style);
  const elements = styleElements(current);
  if (["append", "prepend", "remove", "replace"].includes(operation.type) === false) {
    throw new Error(`unknown operation type: ${operation.type}`);
  }
  if (operation.type === "append") {
    if (!operation.text?.trim()) throw new Error("append operation requires text");
    if (operation.text.includes(",")) throw new Error("append operation must contain one Style element");
    return joinStyleElements([...elements, operation.text]);
  }
  if (operation.type === "prepend") {
    if (!operation.text?.trim()) throw new Error("prepend operation requires text");
    if (operation.text.includes(",")) throw new Error("prepend operation must contain one Style element");
    return joinStyleElements([operation.text, ...elements]);
  }
  if (operation.type === "remove") {
    if (!operation.text?.trim()) throw new Error("remove operation requires text");
    const target = canonicalizeStyle(operation.text);
    const matches = elements.filter((element) => element === target).length;
    if (matches === 0) throw new Error(`remove target not found as a complete Style element: ${operation.text}`);
    if (matches > 1) throw new Error(`remove target is ambiguous because it appears more than once: ${operation.text}`);
    return joinStyleElements(elements.filter((element) => element !== target));
  }
  if (!operation.from?.trim() || operation.to === undefined) throw new Error("replace operation requires from and to");
  const from = canonicalizeStyle(operation.from);
  const matches = elements.filter((element) => element === from).length;
  if (matches === 0) throw new Error(`replace target not found as a complete Style element: ${operation.from}`);
  if (matches > 1) throw new Error(`replace target is ambiguous because it appears more than once: ${operation.from}`);
  if (String(operation.to).includes(",")) {
    const replacements = styleElements(operation.to);
    return joinStyleElements(elements.flatMap((element) => (element === from ? replacements : [element])));
  }
  return joinStyleElements(elements.map((element) => (element === from ? operation.to : element)));
}

export function loadStyleChangeKnowledge() {
  return readJson(TRADEOFFS_PATH);
}

function addIssue(issues, code, severity, message, actual = null, expected = null) {
  issues.push({ code, severity, message, actual, expected });
}

export function applyOperations(style, operations = []) {
  return operations.reduce((current, operation) => applyOperation(current, operation), canonicalizeStyle(style));
}

export function validateStyleChange({ before, after, plan, tradeoffs = loadStyleChangeKnowledge(), inputKnowledge = loadKnowledge() } = {}) {
  const issues = [];
  const baselineStyle = canonicalizeStyle(before);
  const candidateStyle = canonicalizeStyle(after);
  const baseline = plan?.baseline ?? {};
  const intent = plan?.intent ?? {};
  const proposal = plan?.proposal ?? {};
  const operations = Array.isArray(proposal.exact_operations) ? proposal.exact_operations : [];
  const tradeoffMap = new Map((tradeoffs.tradeoffs ?? []).map((item) => [item.id, item]));
  const model = baseline.model ?? "v6";
  const baselineLength = validateText({ field: "style", text: before ?? "", profile: "v6-create", model, ...inputKnowledge });
  const candidateLength = validateText({ field: "style", text: after ?? "", profile: "v6-create", model, ...inputKnowledge });

  if (!baselineStyle) addIssue(issues, "BASELINE_STYLE_REQUIRED", "error", "基準Style全文が必要です。");
  if (!candidateStyle) addIssue(issues, "CANDIDATE_STYLE_REQUIRED", "error", "候補Style全文が必要です。");
  if (baseline.status !== "accepted") addIssue(issues, "BASELINE_NOT_ACCEPTED", "error", "基準版は最後に承認されたStyleでなければなりません。", baseline.status, "accepted");
  if (canonicalizeStyle(baseline.style ?? "") !== baselineStyle) addIssue(issues, "BASELINE_MISMATCH", "error", "planの基準Styleとbefore入力が一致しません。", baseline.style, before);
  if (!intent.verbatim_request || !intent.normalized_goal) addIssue(issues, "INTENT_CONTEXT_REQUIRED", "error", "ユーザー原文と正規化した目的が必要です。");
  if (!Array.isArray(plan?.preserve) || plan.preserve.length === 0) addIssue(issues, "PRESERVE_LIST_REQUIRED", "error", "維持事項を少なくとも1つ宣言してください。");
  if (!Array.isArray(plan?.constraints) || plan.constraints.length === 0) addIssue(issues, "CONSTRAINTS_LIST_REQUIRED", "error", "制約を少なくとも1つ宣言してください。");
  if (!Array.isArray(plan?.acceptable_side_effects)) addIssue(issues, "ACCEPTABLE_SIDE_EFFECTS_REQUIRED", "error", "許容する副作用の配列が必要です。");
  if (!Array.isArray(proposal.exact_operations) || proposal.exact_operations.length === 0) addIssue(issues, "EXACT_OPERATIONS_REQUIRED", "error", "宣言したStyle操作が少なくとも1つ必要です。");
  if (!Array.isArray(proposal.expected_effects) || proposal.expected_effects.length === 0) addIssue(issues, "EXPECTED_EFFECTS_REQUIRED", "error", "期待効果を少なくとも1つ宣言してください。");
  if (!Array.isArray(proposal.risks) || proposal.risks.length === 0) addIssue(issues, "RISKS_REQUIRED", "error", "副作用・リスクを少なくとも1つ宣言してください。");
  if (!Array.isArray(proposal.affected_dimensions) || proposal.affected_dimensions.length === 0) addIssue(issues, "AFFECTED_DIMENSIONS_REQUIRED", "error", "影響軸を少なくとも1つ宣言してください。");
  if (!["pending", "confirmed", "rejected"].includes(proposal.confirmation_state)) addIssue(issues, "CONFIRMATION_STATE_REQUIRED", "error", "confirmation_stateはpending、confirmed、rejectedのいずれかが必要です。");
  if (proposal.confirmation_state === "rejected") addIssue(issues, "REJECTED_PROPOSAL", "error", "却下された候補を適用してはいけません。");

  if (baselineLength.characters > baselineLength.limit) {
    addIssue(issues, "BASELINE_STYLE_OVER_LIMIT", "warning", "基準Styleは暫定文字数上限を超えています。候補は基準版より短くし、最終Style全体を上限内にしてください。", baselineLength.characters, baselineLength.limit);
  }
  if (candidateLength.characters > candidateLength.limit) {
    addIssue(issues, "CANDIDATE_STYLE_OVER_LIMIT", "error", "候補Style全体が暫定文字数上限を超えています。追加分だけでなく基準Styleとの合計で調整してください。", candidateLength.characters, candidateLength.limit);
  }

  const baselineElements = styleElements(baselineStyle);
  const candidateElements = styleElements(candidateStyle);
  for (const term of plan?.preserve ?? []) {
    const normalizedTerm = canonicalizeStyle(term);
    if (!baselineElements.includes(normalizedTerm)) addIssue(issues, "PRESERVE_NOT_IN_BASELINE", "warning", `維持事項が基準Styleに見つかりません: ${term}`, term, baselineStyle);
    else if (!candidateElements.includes(normalizedTerm)) addIssue(issues, "PRESERVED_TERM_REMOVED", "error", `維持事項が候補Styleから消えています: ${term}`, term, candidateStyle);
  }

  for (const operation of operations) {
    if (!operation || typeof operation !== "object") {
      addIssue(issues, "INVALID_STYLE_OPERATION", "error", "Style操作はオブジェクトで指定してください。", operation, "object");
      continue;
    }
    if (!["low", "medium", "high"].includes(operation.impact)) {
      addIssue(issues, "OPERATION_IMPACT_REQUIRED", "error", "各Style操作にimpact（low、medium、high）を宣言してください。", operation.impact, ["low", "medium", "high"]);
    }
    if (operation.impact === "high" && (!Array.isArray(operation.tradeoff_ids) || operation.tradeoff_ids.length === 0)) {
      addIssue(issues, "HIGH_IMPACT_TRADEOFF_REQUIRED", "error", "高影響操作には対応するtradeoff_idが必要です。");
    }
    if (operation.tradeoff_ids !== undefined && !Array.isArray(operation.tradeoff_ids)) {
      addIssue(issues, "INVALID_TRADEOFF_IDS", "error", "tradeoff_idsは配列で指定してください。", operation.tradeoff_ids, []);
    }
    for (const tradeoffId of Array.isArray(operation.tradeoff_ids) ? operation.tradeoff_ids : []) {
      if (!tradeoffMap.has(tradeoffId)) addIssue(issues, "UNKNOWN_TRADEOFF_ID", "error", `未知のtradeoff_idです: ${tradeoffId}`);
    }
  }

  let expectedCandidate = baselineStyle;
  try {
    expectedCandidate = applyOperations(baselineStyle, operations);
    if (expectedCandidate !== candidateStyle) {
      addIssue(issues, "UNDECLARED_OR_MISAPPLIED_CHANGE", "error", "候補Styleの差分がexact_operationsと一致しません。", candidateStyle, expectedCandidate);
    }
  } catch (error) {
    addIssue(issues, "INVALID_STYLE_OPERATION", "error", error.message);
  }

  const highImpact = operations.some((operation) => {
    if (!operation || typeof operation !== "object") return true;
    const tradeoffIds = Array.isArray(operation.tradeoff_ids) ? operation.tradeoff_ids : [];
    return tradeoffIds.some((id) => tradeoffMap.get(id)?.confirmation_level === "confirm_before_apply") || operation.impact === "high";
  });
  if (proposal.confirmation_state !== "confirmed") {
    addIssue(issues, highImpact ? "HIGH_IMPACT_CONFIRMATION_REQUIRED" : "USER_SELECTION_REQUIRED", "error", "ユーザーが候補を選択・確認してからStyleを確定してください。", proposal.confirmation_state, "confirmed");
  }

  return {
    baseline_style: baselineStyle,
    candidate_style: candidateStyle,
    length_gate: {
      model,
      limit: candidateLength.limit,
      baseline_characters: baselineLength.characters,
      baseline_remaining: baselineLength.limit - baselineLength.characters,
      candidate_characters: candidateLength.characters,
      candidate_remaining: candidateLength.limit - candidateLength.characters,
      added_characters: candidateLength.characters - baselineLength.characters,
      status: candidateLength.characters <= candidateLength.limit ? "within_limit" : "over_limit"
    },
    issue_count: issues.length,
    issues,
    high_impact: highImpact,
    expected_candidate: expectedCandidate,
    ready_to_apply: issues.every((item) => item.severity !== "error")
  };
}

function parseArgs(argv) {
  const args = { json: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--json") args.json = true;
    else if (token === "--strict") args.strict = true;
    else if (["--before", "--after", "--plan"].includes(token)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${token} requires a value`);
      args[token.slice(2)] = value;
    } else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

function formatHuman(result) {
  const headline = result.ready_to_apply ? "PASS" : "BLOCK";
  const length = result.length_gate;
  return [
    `Style change check: ${headline}`,
    `高影響変更: ${result.high_impact ? "yes" : "no"}`,
    `文字数: 基準 ${length.baseline_characters} / 候補 ${length.candidate_characters} / 上限 ${length.limit} / 候補残余 ${length.candidate_remaining}`,
    `指摘数: ${result.issue_count}`,
    ...result.issues.map((item) => `- [${item.severity}] ${item.code}: ${item.message}`)
  ].join("\n");
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write("Usage: node check_style_change.mjs --before PATH --after PATH --plan PATH [--strict] [--json]\n");
    return 0;
  }
  for (const required of ["before", "after", "plan"]) if (!args[required]) throw new Error(`--${required} is required`);
  const result = validateStyleChange({
    before: fs.readFileSync(path.resolve(args.before), "utf8"),
    after: fs.readFileSync(path.resolve(args.after), "utf8"),
    plan: readJson(path.resolve(args.plan))
  });
  process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : `${formatHuman(result)}\n`);
  return args.strict && !result.ready_to_apply ? 1 : 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`Style変更検査エラー: ${error.message}\n`);
    process.exitCode = 2;
  }
}
