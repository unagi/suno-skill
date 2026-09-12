#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadKnowledge } from "./check_suno_input.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const RULES_PATH = path.join(SKILL_DIR, "references", "prompt-diagnostic-rules.json");

const GENRE_TERMS = [
  "alternative", "ambient", "blues", "classical", "country", "dance", "drum and bass", "edm", "electronic", "folk", "funk", "gospel", "hip hop", "house", "indie", "jazz", "metal", "pop", "punk", "r&b", "reggae", "rock", "soul", "techno", "trap"
];
const ABSTRACT_TERMS = ["epic", "cinematic", "emotional", "atmospheric", "powerful", "beautiful", "dark", "bright", "dreamy", "energetic", "uplifting", "壮大", "映画的", "感情的", "幻想的"];
const CONCRETE_TERMS = ["drum", "kick", "snare", "guitar", "bass", "piano", "organ", "strings", "violin", "cello", "trumpet", "sax", "flute", "synth", "pad", "lead", "pluck", "percussion", "vocal", "choir", "groove", "bpm", "リズム", "ギター", "ベース", "ピアノ", "シンセ", "ドラム", "声", "弦"];
const PRODUCTION_TERMS = /\b(?:bpm|tempo|genre|instrumentation|production|mix|mixing|reverb|compression|sidechain|mastering|arrangement)\b|テンポ|ジャンル|楽器編成|プロダクション|ミックス|リバーブ|コンプレッション|サイドチェイン|編曲/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function loadDiagnosticKnowledge() {
  return { ...loadKnowledge(), diagnosticRules: readJson(RULES_PATH) };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTerm(text, term) {
  const pattern = term.includes(" ") ? escapeRegex(term) : `\\b${escapeRegex(term)}\\b`;
  return new RegExp(pattern, "i").test(text);
}

function splitTerms(text) {
  return text.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function issueFromRule(ruleMap, ruleId, actual = null, extra = null) {
  const rule = ruleMap.get(ruleId);
  if (!rule) throw new Error(`unknown diagnostic rule: ${ruleId}`);
  return {
    code: rule.id,
    severity: rule.severity,
    status: rule.status,
    message: extra ?? rule.message,
    remediation: rule.remediation,
    actual,
    source_ids: rule.source_ids
  };
}

function inspectTags(lyrics, tagCatalog) {
  const documented = new Set((tagCatalog.documented ?? []).map((tag) => tag.canonical_name.toLowerCase()));
  const matches = [...lyrics.matchAll(/\[([^\]\r\n]{1,120})\]/g)];
  const unofficial = matches.filter((match) => !documented.has(match[1].trim().toLowerCase()));
  const longCues = matches.filter((match) => match[1].trim().length > 80);
  return { matches, unofficial, longCues };
}

export function diagnosePrompt({ style = "", lyrics = "", exclude = "", model = "v6", variety = null, stylePinned = false, instrumental = false, durationSeconds = null, maxMode = false, styleInfluence = null, constraints, tagCatalog, diagnosticRules } = {}) {
  if (!constraints || !tagCatalog || !diagnosticRules) {
    ({ constraints, tagCatalog, diagnosticRules } = loadDiagnosticKnowledge());
  }
  const targetModels = constraints.target_models ?? ["v6"];
  if (!targetModels.includes(model)) throw new Error(`model must be one of ${targetModels.join(", ")}: ${model}`);
  if (!style.trim() && !lyrics.trim()) throw new Error("style or lyrics is required");

  const ruleMap = new Map(diagnosticRules.rules.map((rule) => [rule.id, rule]));
  const issues = [];
  const normalizedStyle = style.toLowerCase();
  const excludeTerms = splitTerms(exclude);
  const includeExcludeConflicts = excludeTerms.filter((term) => hasTerm(style, term.replace(/^[-+]/, "")));
  if (includeExcludeConflicts.length > 0) issues.push(issueFromRule(ruleMap, "prompt.include-exclude-conflict", includeExcludeConflicts));

  const bpmValues = [...style.matchAll(/\b(\d{2,3})\s*(?:bpm|beats?\s*per\s*minute)\b/gi)].map((match) => Number(match[1]));
  const uniqueBpm = [...new Set(bpmValues)];
  if (uniqueBpm.length > 1) issues.push(issueFromRule(ruleMap, "prompt.multiple-tempo-values", uniqueBpm));

  const matchedGenres = GENRE_TERMS.filter((term) => hasTerm(normalizedStyle, term));
  if (matchedGenres.length > 4) issues.push(issueFromRule(ruleMap, "prompt.genre-overload", matchedGenres));

  const abstractMatches = ABSTRACT_TERMS.filter((term) => hasTerm(normalizedStyle, term));
  const concreteMatches = CONCRETE_TERMS.filter((term) => hasTerm(normalizedStyle, term));
  if (style.trim() && abstractMatches.length >= 2 && concreteMatches.length === 0) {
    issues.push(issueFromRule(ruleMap, "prompt.abstract-style-only", { abstract: abstractMatches, concrete: concreteMatches }));
  }

  if (/\[(?:intro|verse|chorus|bridge|outro|hook|pre-chorus|post-chorus|final chorus|instrumental)\b[^\]]*\]/i.test(style)) {
    issues.push(issueFromRule(ruleMap, "prompt.style-contains-lyrics-structure"));
  }
  if (/\b(?:no|without|avoid|exclude|not)\b|禁止|除外|なし/i.test(style)) {
    issues.push(issueFromRule(ruleMap, "prompt.negative-style-instruction"));
  }

  const { unofficial, longCues } = inspectTags(lyrics, tagCatalog);
  if (unofficial.length > 3) issues.push(issueFromRule(ruleMap, "prompt.unofficial-cue-overuse", unofficial.map((match) => match[1].trim())));
  if (longCues.length > 0) issues.push(issueFromRule(ruleMap, "prompt.lyrics-contains-production-instruction", longCues.map((match) => match[1].trim())));
  const productionLines = lyrics.split(/\r?\n/).filter((line) => line.length > 80 && PRODUCTION_TERMS.test(line));
  if (productionLines.length > 0 && !issues.some((item) => item.code === "prompt.lyrics-contains-production-instruction")) {
    issues.push(issueFromRule(ruleMap, "prompt.lyrics-contains-production-instruction", productionLines));
  }

  if (model === "v6-wild" && variety !== null && variety > 0) {
    issues.push(issueFromRule(ruleMap, "prompt.wild-variety-adherence-risk", { model, variety }));
  }
  if (stylePinned && variety !== null && variety > 0) {
    issues.push(issueFromRule(ruleMap, "prompt.variety-style-pinned", { stylePinned, variety }));
  }
  if (instrumental && lyrics.trim()) issues.push(issueFromRule(ruleMap, "prompt.instrumental-lyrics-conflict"));
  if (durationSeconds !== null && durationSeconds > 120 && !maxMode) {
    issues.push(issueFromRule(ruleMap, "prompt.long-form-without-max-mode", { duration_seconds: durationSeconds, max_mode: maxMode }));
  }

  const humanChecks = [
    { code: "listen.genre", message: "生成音声が主ジャンル・ムード・リズムに沿っているか試聴する。" },
    { code: "listen.vocal", message: "声の性別、音域、質感、発音、ハーモニーを試聴する。" },
    { code: "listen.instrument", message: "指定楽器が実際に可聴で、役割と音色が意図どおりか確認する。" },
    { code: "listen.structure", message: "Verse/Chorus/Bridge/Outroの順序、反復、局所cueの実現を確認する。" },
    { code: "listen.lyrics", message: "歌詞の発音、欠落、途中終了、意図しない反復を確認する。" }
  ];

  return {
    model,
    model_basis: model === (constraints.baseline_model ?? "v6") ? "baseline" : "inherited_from_v6_variant; variant-specific differences unverified",
    style_influence: styleInfluence,
    variety,
    issue_count: issues.length,
    issues,
    human_checks: humanChecks
  };
}

function parseArgs(argv) {
  const args = { model: "v6", format: "text", strict: false, variety: null, durationSeconds: null, stylePinned: false, instrumental: false, maxMode: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--strict") args.strict = true;
    else if (token === "--json") args.format = "json";
    else if (token === "--style-pinned") args.stylePinned = true;
    else if (token === "--instrumental") args.instrumental = true;
    else if (token === "--max-mode") args.maxMode = true;
    else if (["--style", "--lyrics", "--exclude", "--model", "--variety", "--style-influence", "--duration-seconds"].includes(token)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${token} requires a value`);
      if (token === "--style") args.styleFile = value;
      else if (token === "--lyrics") args.lyricsFile = value;
      else if (token === "--exclude") args.excludeFile = value;
      else if (token === "--model") args.model = value;
      else if (token === "--variety") args.variety = Number(value);
      else if (token === "--style-influence") args.styleInfluence = value;
      else if (token === "--duration-seconds") args.durationSeconds = Number(value);
    } else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

function formatHuman(result) {
  const headline = result.issue_count === 0 ? "PASS" : "WARN";
  const lines = [`Suno prompt diagnosis: ${headline}`, `対象モデル: ${result.model} (${result.model_basis})`, `指摘数: ${result.issue_count}`];
  for (const item of result.issues) lines.push(`- [${item.severity}] ${item.code}: ${item.message} 対処: ${item.remediation}`);
  lines.push("人手確認:");
  for (const item of result.human_checks) lines.push(`- ${item.message}`);
  return lines.join("\n");
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write("Usage: node diagnose_suno_prompt.mjs --style PATH [--lyrics PATH] [--exclude PATH] [--model v6|v6-wild|v6-mini] [--variety N] [--style-pinned] [--instrumental] [--duration-seconds N] [--max-mode] [--strict] [--json]\n");
    return 0;
  }
  const readOptional = (filePath) => filePath ? fs.readFileSync(path.resolve(filePath), "utf8") : "";
  const result = diagnosePrompt({ style: readOptional(args.styleFile), lyrics: readOptional(args.lyricsFile), exclude: readOptional(args.excludeFile), model: args.model, variety: args.variety, stylePinned: args.stylePinned, instrumental: args.instrumental, durationSeconds: args.durationSeconds, maxMode: args.maxMode, styleInfluence: args.styleInfluence });
  process.stdout.write(args.format === "json" ? `${JSON.stringify(result, null, 2)}\n` : `${formatHuman(result)}\n`);
  return args.strict && result.issue_count > 0 ? 1 : 0;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`プロンプト診断エラー: ${error.message}\n`);
    process.exitCode = 2;
  }
}
