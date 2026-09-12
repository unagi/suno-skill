#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const CONSTRAINTS_PATH = path.join(SKILL_DIR, "references", "constraints.json");
const TAG_CATALOG_PATH = path.join(SKILL_DIR, "references", "tag-catalog.json");

export function normalizeInput(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

export function loadKnowledge({ constraintsPath = CONSTRAINTS_PATH, tagCatalogPath = TAG_CATALOG_PATH } = {}) {
  const constraints = JSON.parse(fs.readFileSync(constraintsPath, "utf8"));
  const tagCatalog = JSON.parse(fs.readFileSync(tagCatalogPath, "utf8"));
  return { constraints, tagCatalog };
}

function makeIssue({ code, severity = "warning", message, ruleId = null, sourceIds = [], actual = null, expected = null }) {
  return { code, severity, message, rule_id: ruleId, source_ids: sourceIds, actual, expected };
}

function findRule(constraints, field, profile) {
  const profileKey = profile.replace(/-create$/, "");
  return constraints.rules.find((rule) => rule.target === field && rule.id.includes(`.${profileKey}.`)) ?? null;
}

function lineHasOnlyTag(text, match) {
  const lineStart = text.lastIndexOf("\n", match.index - 1) + 1;
  const lineEndIndex = text.indexOf("\n", match.index);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const line = text.slice(lineStart, lineEnd).trim();
  return line === match[0];
}

function inspectLyricsTags(text, tagCatalog) {
  const issues = [];
  const matches = [...text.matchAll(/\[([^\]\r\n]{1,80})\]/g)];
  const documented = new Set((tagCatalog.documented ?? []).map((tag) => tag.canonical_name.toLowerCase()));
  const community = new Set((tagCatalog.community_observed ?? []).map((tag) => tag.toLowerCase()));
  const opening = (text.match(/\[/g) ?? []).length;
  const closing = (text.match(/\]/g) ?? []).length;

  if (opening !== closing || opening !== matches.length) {
    issues.push(makeIssue({
      code: "UNBALANCED_BRACKETS",
      message: "角括弧の開閉数が一致しません。未閉じのcueは歌詞として解釈される可能性があります。",
      actual: { opening, closing, parsed_tags: matches.length },
      expected: "opening === closing === parsed_tags"
    }));
  }

  for (const match of matches) {
    const label = match[1].trim();
    const normalized = label.toLowerCase();
    if (documented.has(normalized)) {
      if (!lineHasOnlyTag(text, match)) {
        issues.push(makeIssue({
          code: "TAG_NOT_STANDALONE",
          message: `[${label}] は独立行に置くと解釈が安定しやすくなります。`,
          actual: label,
          expected: "tag on its own line"
        }));
      }
      continue;
    }

    if (community.has(normalized)) {
      issues.push(makeIssue({
        code: "COMMUNITY_TAG",
        message: `[${label}] はコミュニティ観測のcueです。公式の固定コマンドとは断定せず、生成結果で確認してください。`,
        actual: label,
        expected: "model-dependent cue"
      }));
    } else {
      issues.push(makeIssue({
        code: "UNKNOWN_TAG",
        message: `[${label}] はローカル台帳にないタグです。公式タグと断定せず、必要なら実生成で検証してください。`,
        actual: label,
        expected: "documented or observed tag"
      }));
    }
  }

  return issues;
}

export function validateText({ field, text, profile = "v6-create", model = "v6", max = null, constraints, tagCatalog }) {
  if (!constraints || !tagCatalog) {
    ({ constraints, tagCatalog } = loadKnowledge());
  }
  if (!new Set(["style", "lyrics"]).has(field)) {
    throw new Error(`field must be style or lyrics: ${field}`);
  }
  const targetModels = constraints.target_models ?? ["v6"];
  if (!targetModels.includes(model)) {
    throw new Error(`model must be one of ${targetModels.join(", ")}: ${model}`);
  }

  const normalized = normalizeInput(text);
  const rule = findRule(constraints, field, profile);
  const limit = max ?? rule?.parameters?.max ?? null;
  if (!limit) {
    throw new Error(`No limit is configured for field=${field}, profile=${profile}; pass --max.`);
  }

  const issues = [];
  if (normalized.length > limit) {
    issues.push(makeIssue({
      code: "MAX_LENGTH_EXCEEDED",
      message: `${field}が暫定上限を超えています。対象画面のカウンターを最終確認してください。`,
      ruleId: rule?.id ?? null,
      sourceIds: rule?.source_ids ?? [],
      actual: normalized.length,
      expected: limit
    }));
  }

  if (field === "lyrics") {
    issues.push(...inspectLyricsTags(normalized, tagCatalog));
  }

  return {
    field,
    model,
    model_basis: model === (constraints.baseline_model ?? "v6") ? "baseline" : "inherited_from_v6_variant; variant-specific differences unverified",
    profile,
    characters: normalized.length,
    code_points: [...normalized].length,
    lines: normalized.length === 0 ? 0 : normalized.split("\n").length,
    limit,
    remaining: limit - normalized.length,
    limit_status: normalized.length <= limit ? "within_limit" : "over_limit",
    limit_confidence: rule?.status ?? "custom",
    issues,
    paste_ready: normalized.length <= limit && issues.length === 0
  };
}

function parseArgs(argv) {
  const args = { profile: "v6-create", model: "v6", format: "text", strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--strict") args.strict = true;
    else if (token === "--json") args.format = "json";
    else if (["--field", "--file", "--text", "--profile", "--model", "--max"].includes(token)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${token} requires a value`);
      args[token.slice(2)] = value;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown argument: ${token}`);
    }
  }
  return args;
}

function help() {
  return `Usage:
  node check_suno_input.mjs --field style|lyrics (--file PATH | --text TEXT) [--model v6|v6-wild|v6-mini] [--profile v6-create] [--strict] [--json]
  node check_suno_input.mjs --field style --text "dreamy synth-pop" --max 1000

Default limits are provisional knowledge rules. Without --strict, warnings are reported but exit code remains 0.
`;
}

export function formatHuman(result) {
  const headline = result.paste_ready ? "PASS" : "WARN";
  const lines = [
    `Suno ${result.field} check: ${headline}`,
    `対象モデル: ${result.model} (${result.model_basis})`,
    `文字数: ${result.characters} UTF-16 code units / Unicode code points ${result.code_points} / 暫定上限 ${result.limit} / 残余 ${result.remaining}`,
    `上限の確度: ${result.limit_confidence}`
  ];
  for (const issue of result.issues) {
    lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  }
  return lines.join("\n");
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(help());
    return 0;
  }
  if (!args.field) throw new Error("--field is required");
  if ((args.file === undefined) === (args.text === undefined)) {
    throw new Error("provide exactly one of --file or --text");
  }
  const text = args.file === undefined ? args.text : fs.readFileSync(path.resolve(args.file), "utf8");
  const customMax = args.max === undefined ? null : Number(args.max);
  if (customMax !== null && (!Number.isInteger(customMax) || customMax < 1)) {
    throw new Error("--max must be a positive integer");
  }
  const { constraints, tagCatalog } = loadKnowledge();
  const result = validateText({ field: args.field, text, profile: args.profile, model: args.model, max: customMax, constraints, tagCatalog });
  process.stdout.write(args.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : `${formatHuman(result)}\n`);
  return args.strict && result.issues.length > 0 ? 1 : 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`入力検証エラー: ${error.message}\n`);
    process.stderr.write(help());
    process.exitCode = 2;
  }
}
