import test from "node:test";
import assert from "node:assert/strict";

import { applyOperations, loadStyleChangeKnowledge, validateStyleChange } from "../scripts/check_style_change.mjs";

const tradeoffs = loadStyleChangeKnowledge();
const before = "J-Rock, bright electric guitars, present lead vocal";

function plan(overrides = {}) {
  return {
    baseline: { id: "accepted-001", status: "accepted", style: before, model: "v6", settings: { variety: 0 } },
    intent: { verbatim_request: "低音を増やしたい", normalized_goal: "低域の土台を増やす", priority: "must", origin: "user_explicit" },
    preserve: ["J-Rock", "present lead vocal"],
    constraints: ["ジャンルを維持する"],
    acceptable_side_effects: [],
    proposal: {
      hypothesis: "ベースギターの土台が不足している",
      exact_operations: [{ type: "append", text: "clearly audible electric bass locked with the kick", tradeoff_ids: ["electric-bass-foundation"], impact: "high" }],
      expected_effects: ["低域の土台"],
      risks: ["キックとのマスキング"],
      affected_dimensions: ["spectral.low", "arrangement.roles"],
      confirmation_state: "confirmed"
    },
    ...overrides
  };
}

test("承認済み基準版から宣言した単一変更だけを適用できる", () => {
  const after = applyOperations(before, plan().proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: plan(), tradeoffs });
  assert.equal(result.ready_to_apply, true);
  assert.equal(result.issue_count, 0);
});

test("候補Styleに未申告の変更がある場合はブロックする", () => {
  const after = `${applyOperations(before, plan().proposal.exact_operations)}, sub bass`;
  const result = validateStyleChange({ before, after, plan: plan(), tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "UNDECLARED_OR_MISAPPLIED_CHANGE"));
  assert.equal(result.ready_to_apply, false);
});

test("維持事項を候補から削除した場合はブロックする", () => {
  const after = applyOperations(before, plan().proposal.exact_operations).replace(", present lead vocal", "");
  const result = validateStyleChange({ before, after, plan: plan(), tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "PRESERVED_TERM_REMOVED"));
});

test("高影響変更はユーザー確認前には適用できない", () => {
  const pendingPlan = plan({ proposal: { ...plan().proposal, confirmation_state: "pending" } });
  const after = applyOperations(before, pendingPlan.proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: pendingPlan, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "HIGH_IMPACT_CONFIRMATION_REQUIRED"));
});

test("低影響候補でもユーザー選択前には適用できない", () => {
  const pendingPlan = plan({ proposal: { ...plan().proposal, confirmation_state: "pending", exact_operations: [{ type: "append", text: "tight kick punch", tradeoff_ids: ["kick-punch"], impact: "low" }] } });
  const after = applyOperations(before, pendingPlan.proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: pendingPlan, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "USER_SELECTION_REQUIRED"));
  assert.equal(result.ready_to_apply, false);
});

test("維持事項と制約を省略した変更契約は通過できない", () => {
  const incompletePlan = plan({ preserve: [], constraints: [] });
  const after = applyOperations(before, incompletePlan.proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: incompletePlan, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "PRESERVE_LIST_REQUIRED"));
  assert.ok(result.issues.some((item) => item.code === "CONSTRAINTS_LIST_REQUIRED"));
  assert.equal(result.ready_to_apply, false);
});

test("高影響操作をtradeoffなしで隠して適用できない", () => {
  const hiddenHighImpactPlan = plan({ proposal: { ...plan().proposal, exact_operations: [{ type: "append", text: "sub bass", impact: "high", tradeoff_ids: [] }] } });
  const after = applyOperations(before, hiddenHighImpactPlan.proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: hiddenHighImpactPlan, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "HIGH_IMPACT_TRADEOFF_REQUIRED"));
  assert.equal(result.ready_to_apply, false);
});

test("却下された候補を基準版にできない", () => {
  const rejectedPlan = plan({ baseline: { ...plan().baseline, status: "rejected" } });
  const after = applyOperations(before, rejectedPlan.proposal.exact_operations);
  const result = validateStyleChange({ before, after, plan: rejectedPlan, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "BASELINE_NOT_ACCEPTED"));
});

test("Style要素の部分文字列を削除する操作は受け付けない", () => {
  const partialPlan = plan({ proposal: { ...plan().proposal, exact_operations: [{ type: "remove", text: "bass", tradeoff_ids: ["electric-bass-foundation"], impact: "high" }] } });
  const partialBefore = "J-Rock, bass guitar, present lead vocal";
  const partialAfter = "J-Rock, guitar, present lead vocal";
  const result = validateStyleChange({ before: partialBefore, after: partialAfter, plan: { ...partialPlan, baseline: { ...partialPlan.baseline, style: partialBefore }, preserve: ["J-Rock", "bass guitar", "present lead vocal"] }, tradeoffs });
  assert.ok(result.issues.some((item) => item.code === "INVALID_STYLE_OPERATION"));
  assert.equal(result.ready_to_apply, false);
});

test("Style変更は追加断片ではなく基準Styleとの合計文字数で判定する", () => {
  const longBefore = `J-Rock, ${"a".repeat(792)}`;
  const addition = "b".repeat(300);
  const longPlan = plan({
    baseline: { ...plan().baseline, style: longBefore },
    preserve: ["J-Rock"],
    proposal: { ...plan().proposal, exact_operations: [{ type: "append", text: addition, tradeoff_ids: ["electric-bass-foundation"], impact: "high" }] }
  });
  const after = applyOperations(longBefore, longPlan.proposal.exact_operations);
  const result = validateStyleChange({ before: longBefore, after, plan: longPlan, tradeoffs });
  assert.equal(result.length_gate.baseline_remaining, 200);
  assert.ok(result.length_gate.added_characters > 200);
  assert.equal(result.length_gate.status, "over_limit");
  assert.ok(result.issues.some((item) => item.code === "CANDIDATE_STYLE_OVER_LIMIT"));
  assert.equal(result.ready_to_apply, false);
});
