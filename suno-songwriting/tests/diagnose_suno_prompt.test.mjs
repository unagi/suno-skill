import test from "node:test";
import assert from "node:assert/strict";

import { diagnosePrompt, loadDiagnosticKnowledge } from "../scripts/diagnose_suno_prompt.mjs";

const knowledge = loadDiagnosticKnowledge();

function codes(result) {
  return result.issues.map((item) => item.code);
}

test("StyleとExcludeの重複を検出する", () => {
  const result = diagnosePrompt({
    style: "warm piano, intimate pop",
    exclude: "piano",
    ...knowledge
  });
  assert.ok(codes(result).includes("prompt.include-exclude-conflict"));
});

test("複数BPMと抽象語だけのStyleを検出する", () => {
  const tempoResult = diagnosePrompt({
    style: "epic cinematic emotional, 90 BPM, 120 BPM",
    ...knowledge
  });
  const abstractResult = diagnosePrompt({
    style: "epic cinematic emotional",
    ...knowledge
  });
  assert.ok(codes(tempoResult).includes("prompt.multiple-tempo-values"));
  assert.ok(codes(abstractResult).includes("prompt.abstract-style-only"));
});

test("公式構造タグは過剰な非公式cueとして扱わない", () => {
  const result = diagnosePrompt({
    style: "indie pop with piano and tight drums",
    lyrics: "[Verse]\n夜明け前\n\n[Chorus]\n光へ",
    ...knowledge
  });
  assert.ok(!codes(result).includes("prompt.unofficial-cue-overuse"));
  assert.ok(!codes(result).includes("prompt.lyrics-contains-production-instruction"));
});

test("非公式cueが多すぎる場合だけ警告する", () => {
  const result = diagnosePrompt({
    style: "indie pop with piano",
    lyrics: "[Drop]\nA\n[Build]\nB\n[Whisper]\nC\n[Instrumental Break]\nD",
    ...knowledge
  });
  assert.ok(codes(result).includes("prompt.unofficial-cue-overuse"));
});

test("抽象語に具体的な楽器を足すとabstract-onlyを避けられる", () => {
  const result = diagnosePrompt({
    style: "dark verses, bright chorus with fingerstyle acoustic guitar",
    ...knowledge
  });
  assert.ok(!codes(result).includes("prompt.abstract-style-only"));
});

test("v6-wildとVarietyの組み合わせ、固定StyleとVarietyを検出する", () => {
  const result = diagnosePrompt({
    style: "ambient synth pad",
    model: "v6-wild",
    variety: 80,
    stylePinned: true,
    ...knowledge
  });
  assert.equal(result.model_basis, "inherited_from_v6_variant; variant-specific differences unverified");
  assert.ok(codes(result).includes("prompt.wild-variety-adherence-risk"));
  assert.ok(codes(result).includes("prompt.variety-style-pinned"));
});

test("InstrumentalとLyrics本文の同時指定を検出する", () => {
  const result = diagnosePrompt({
    style: "cinematic strings",
    lyrics: "[Verse]\n歌詞",
    instrumental: true,
    ...knowledge
  });
  assert.ok(codes(result).includes("prompt.instrumental-lyrics-conflict"));
});

test("長尺でMax Modeなしを検出し、Max Modeありでは警告しない", () => {
  const withoutMaxMode = diagnosePrompt({
    style: "ambient piano",
    durationSeconds: 180,
    ...knowledge
  });
  const withMaxMode = diagnosePrompt({
    style: "ambient piano",
    durationSeconds: 180,
    maxMode: true,
    ...knowledge
  });
  assert.ok(codes(withoutMaxMode).includes("prompt.long-form-without-max-mode"));
  assert.ok(!codes(withMaxMode).includes("prompt.long-form-without-max-mode"));
});
