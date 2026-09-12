import test from "node:test";
import assert from "node:assert/strict";

import { loadKnowledge, validateText } from "../scripts/check_suno_input.mjs";

const knowledge = loadKnowledge();

test("Style is within the provisional v6 limit at the boundary", () => {
  const result = validateText({
    field: "style",
    text: "a".repeat(1000),
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.limit_status, "within_limit");
  assert.equal(result.issues.length, 0);
});

test("Lyrics over the provisional v6 limit is reported", () => {
  const result = validateText({
    field: "lyrics",
    text: "あ".repeat(5001),
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.limit_status, "over_limit");
  assert.ok(result.issues.some((item) => item.code === "MAX_LENGTH_EXCEEDED"));
});

test("Documented tags on their own lines pass", () => {
  const result = validateText({
    field: "lyrics",
    text: "[Verse]\n夜明け前\n\n[Chorus]\n光へ",
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.issues.length, 0);
});

test("Community and unbalanced tags are warnings, not false official claims", () => {
  const result = validateText({
    field: "lyrics",
    text: "[Drop]\n声\n[未閉じ",
    profile: "v6-create",
    ...knowledge
  });
  assert.ok(result.issues.some((item) => item.code === "COMMUNITY_TAG"));
  assert.ok(result.issues.some((item) => item.code === "UNBALANCED_BRACKETS"));
});

test("Emoji exposes the difference between UTF-16 units and code points", () => {
  const result = validateText({
    field: "style",
    text: "🎵",
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.characters, 2);
  assert.equal(result.code_points, 1);
});

test("Empty input is measurable and does not crash the validator", () => {
  const result = validateText({
    field: "lyrics",
    text: "",
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.characters, 0);
  assert.equal(result.lines, 0);
  assert.equal(result.issues.length, 0);
});

test("v6 variants inherit the v6 baseline and expose that uncertainty", () => {
  const result = validateText({
    field: "style",
    model: "v6-wild",
    text: "experimental texture",
    profile: "v6-create",
    ...knowledge
  });
  assert.equal(result.model, "v6-wild");
  assert.match(result.model_basis, /inherited_from_v6_variant/);
  assert.equal(result.limit, 1000);
});
