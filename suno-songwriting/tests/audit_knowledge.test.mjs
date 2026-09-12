import test from "node:test";
import assert from "node:assert/strict";

import { auditKnowledge } from "../scripts/audit_knowledge.mjs";

test("Knowledge references are internally consistent", () => {
  const result = auditKnowledge({ asOf: "2026-09-12", staleDays: 90 });
  assert.equal(result.issues.filter((item) => item.severity === "error").length, 0);
});
