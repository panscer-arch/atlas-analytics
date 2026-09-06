import assert from "node:assert/strict";
import { existsSync } from "node:fs";
const path = "../src/modules/analytics/data/departmentsModel.js";
assert.ok(
  existsSync(new URL(path, import.meta.url)),
  "Departments model must exist",
);
const { buildDepartmentPlan, validatePlan, selectRows, savePlanSafely } =
  await import(path);
const graph = {
  nodes: [
    {
      id: "person-renamed",
      type: "member",
      data: { label: "Новое имя", role: "SMM" },
    },
    {
      id: "project-social",
      type: "project",
      data: { label: "Соц сети", category: "content" },
    },
  ],
  edges: [{ source: "person-renamed", target: "project-social" }],
};
const before = JSON.stringify(graph);
const plan = buildDepartmentPlan(graph);
assert.equal(
  JSON.stringify(graph),
  before,
  "Seeding must not mutate team assignments",
);
assert.ok(
  plan.departments
    .find((d) => d.id === "marketing")
    .memberIds.includes("person-renamed"),
  "Use actual team IDs through project links, not copied names",
);
assert.ok(
  plan.departments.every((d) => d.status === "proposed" && !d.ownerId),
  "Suggested structure must not claim confirmed leaders",
);
assert.ok(
  plan.automations.every((a) => a.status !== "running"),
  "Candidates must not claim working integrations",
);
assert.equal(validatePlan(plan), "");
assert.notEqual(validatePlan({ ...plan, processes: null }), "");
const malformed = structuredClone(plan);
malformed.departments[0].memberIds = [{ id: "bad" }];
assert.notEqual(
  validatePlan(malformed),
  "",
  "Reject malformed member references before rendering",
);
const invalidField = structuredClone(plan);
invalidField.processes[0].flow = { unsafe: "object" };
assert.notEqual(
  validatePlan(invalidField),
  "",
  "Reject non-text fields before React rendering",
);
const broken = structuredClone(plan);
broken.automations[0].status = "running";
assert.match(validatePlan(broken), /ответственный|подтверждение/);
assert.ok(selectRows(plan.processes, "контент", "marketing").length > 0);
assert.equal(
  selectRows(plan.processes, "несуществующееслово", "marketing").length,
  0,
);
let writes = 0;
const failed = await savePlanSafely(plan, null, {
  load: async () => ({ ok: false }),
  save: async () => {
    writes++;
    return true;
  },
});
assert.equal(failed.ok, false);
assert.equal(writes, 0, "Read failure cannot cause a write");
const conflicting = await savePlanSafely(plan, null, {
  load: async () => ({ ok: true, exists: true, value: { changed: true } }),
  save: async () => {
    writes++;
    return true;
  },
});
assert.equal(conflicting.ok, false);
assert.equal(writes, 0, "Existing changed data cannot be overwritten");
let stored = null;
const saved = await savePlanSafely(plan, null, {
  load: async () => ({ ok: true, exists: stored !== null, value: stored }),
  save: async (value) => {
    stored = structuredClone(value);
    return true;
  },
});
assert.equal(saved.ok, true);
assert.deepEqual(stored, plan);
const unverified = await savePlanSafely(plan, null, {
  load: async () => ({ ok: true, exists: false, value: null }),
  save: async () => true,
});
assert.equal(
  unverified.ok,
  false,
  "PUT success without readable persisted result is not saved",
);
console.log(
  "Departments: seed isolation, live member binding, validation, filtering, save failures, conflict and read-back passed",
);
