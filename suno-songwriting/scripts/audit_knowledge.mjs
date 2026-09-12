#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const REFERENCES_DIR = path.join(SKILL_DIR, "references");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(REFERENCES_DIR, name), "utf8"));
}

function issue(code, severity, message) {
  return { code, severity, message };
}

export function auditKnowledge({ asOf = new Date().toISOString().slice(0, 10), staleDays = 90 } = {}) {
  const issues = [];
  let sources;
  let constraints;
  let tagCatalog;
  let musicVocabulary;
  let diagnosticRules;
  let genreArrangements;
  let styleTradeoffs;
  try {
    sources = readJson("sources.json");
    constraints = readJson("constraints.json");
    tagCatalog = readJson("tag-catalog.json");
    musicVocabulary = readJson("music-vocabulary.json");
    diagnosticRules = readJson("prompt-diagnostic-rules.json");
    genreArrangements = readJson("genre-arrangements.json");
    styleTradeoffs = readJson("style-tradeoffs.json");
  } catch (error) {
    return { as_of: asOf, issues: [issue("INVALID_JSON_OR_MISSING_FILE", "error", error.message)] };
  }

  const sourceIds = new Set();
  for (const source of sources) {
    if (!source.source_id || sourceIds.has(source.source_id)) {
      issues.push(issue("DUPLICATE_OR_EMPTY_SOURCE_ID", "error", `invalid source_id: ${source.source_id ?? ""}`));
    }
    sourceIds.add(source.source_id);
    for (const required of ["url", "title", "publisher", "source_type", "accessed_at", "claim_summary"]) {
      if (!source[required]) issues.push(issue("SOURCE_FIELD_MISSING", "error", `${source.source_id}: missing ${required}`));
    }
  }

  const ruleIds = new Set();
  for (const rule of constraints.rules ?? []) {
    if (!rule.id || ruleIds.has(rule.id)) issues.push(issue("DUPLICATE_OR_EMPTY_RULE_ID", "error", `invalid rule id: ${rule.id ?? ""}`));
    ruleIds.add(rule.id);
    for (const sourceId of rule.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_SOURCE_REFERENCE", "error", `${rule.id}: ${sourceId}`));
    }
    if (rule.parameters?.max !== undefined && (!Number.isInteger(rule.parameters.max) || rule.parameters.max < 1)) {
      issues.push(issue("INVALID_LIMIT", "error", `${rule.id}: max must be a positive integer`));
    }
    if (rule.review_by && rule.review_by < asOf) {
      issues.push(issue("STALE_RULE", "warning", `${rule.id}: review_by ${rule.review_by} is before ${asOf}`));
    }
  }

  for (const tag of tagCatalog.documented ?? []) {
    for (const sourceId of tag.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_TAG_SOURCE_REFERENCE", "error", `${tag.syntax}: ${sourceId}`));
    }
  }

  for (const entry of musicVocabulary.entries ?? []) {
    for (const sourceId of entry.evidence?.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_VOCABULARY_SOURCE_REFERENCE", "error", `${entry.id}: ${sourceId}`));
    }
  }

  for (const rule of diagnosticRules.rules ?? []) {
    for (const sourceId of rule.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_DIAGNOSTIC_SOURCE_REFERENCE", "error", `${rule.id}: ${sourceId}`));
    }
  }

  for (const sourceId of genreArrangements.selection_source_ids ?? []) {
    if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_GENRE_SELECTION_SOURCE_REFERENCE", "error", `selection: ${sourceId}`));
  }
  for (const genre of genreArrangements.genres ?? []) {
    for (const sourceId of genre.evidence?.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_GENRE_SOURCE_REFERENCE", "error", `${genre.id}: ${sourceId}`));
    }
  }

  const tradeoffIds = new Set();
  for (const tradeoff of styleTradeoffs.tradeoffs ?? []) {
    if (!tradeoff.id || tradeoffIds.has(tradeoff.id)) {
      issues.push(issue("DUPLICATE_OR_EMPTY_TRADEOFF_ID", "error", `invalid tradeoff id: ${tradeoff.id ?? ""}`));
    }
    tradeoffIds.add(tradeoff.id);
    for (const required of ["operation_family", "dimensions", "primary_effects", "side_effects", "confirmation_level"]) {
      if (!tradeoff[required] || (Array.isArray(tradeoff[required]) && tradeoff[required].length === 0)) {
        issues.push(issue("TRADEOFF_FIELD_MISSING", "error", `${tradeoff.id ?? ""}: missing ${required}`));
      }
    }
    for (const sourceId of tradeoff.source_ids ?? []) {
      if (!sourceIds.has(sourceId)) issues.push(issue("MISSING_TRADEOFF_SOURCE_REFERENCE", "error", `${tradeoff.id}: ${sourceId}`));
    }
  }

  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  for (const source of sources) {
    const accessed = new Date(`${source.accessed_at}T00:00:00Z`);
    if (Number.isNaN(accessed.getTime())) {
      issues.push(issue("INVALID_ACCESS_DATE", "error", `${source.source_id}: ${source.accessed_at}`));
    } else if ((asOfDate - accessed) / 86400000 > staleDays) {
      issues.push(issue("STALE_SOURCE_REVIEW", "warning", `${source.source_id}: accessed_at ${source.accessed_at}`));
    }
  }

  return { as_of: asOf, stale_days: staleDays, issues };
}

function parseArgs(argv) {
  const args = { asOf: new Date().toISOString().slice(0, 10), staleDays: 90, format: "text", strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--strict") args.strict = true;
    else if (token === "--json") args.format = "json";
    else if (["--as-of", "--stale-days"].includes(token)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${token} requires a value`);
      if (token === "--as-of") args.asOf = value;
      else args.staleDays = Number(value);
    } else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write("Usage: node audit_knowledge.mjs [--as-of YYYY-MM-DD] [--stale-days N] [--strict] [--json]\n");
    return 0;
  }
  if (!Number.isInteger(args.staleDays) || args.staleDays < 1) throw new Error("--stale-days must be a positive integer");
  const result = auditKnowledge({ asOf: args.asOf, staleDays: args.staleDays });
  if (args.format === "json") process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else if (result.issues.length === 0) process.stdout.write(`Knowledge audit: PASS (${args.asOf})\n`);
  else process.stdout.write([`Knowledge audit: ${result.issues.some((item) => item.severity === "error") ? "ERROR" : "WARN"} (${args.asOf})`, ...result.issues.map((item) => `- [${item.severity}] ${item.code}: ${item.message}`)].join("\n") + "\n");
  const hasError = result.issues.some((item) => item.severity === "error");
  const hasWarning = result.issues.some((item) => item.severity === "warning");
  return hasError || (args.strict && hasWarning) ? 1 : 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`知識監査エラー: ${error.message}\n`);
    process.exitCode = 2;
  }
}
