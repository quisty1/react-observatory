import { test } from "node:test";
import assert from "node:assert/strict";
import { labs } from "../src/data/labs";
import { compile } from "../src/runtime/compiler";
test("eight distinct laboratories ship runnable problem and solution TSX", () => {
  assert.equal(labs.length, 8);
  assert.equal(new Set(labs.map((l) => l.id)).size, 8);
  for (const l of labs) {
    assert.notEqual(l.source, l.fixedSource);
    assert.doesNotThrow(() => compile(l.source), l.id);
    assert.doesNotThrow(() => compile(l.fixedSource), l.id + " solution");
    assert.equal(l.tasks.length, 2);
    assert.equal(l.verify.check([]), false);
  }
});
test("key identity verification uses the final edit before the latest reorder", () => {
  const lab = labs.find((l) => l.id === "keys")!;
  const data = [
    { kind: "action", label: "Редактирование", data: { id: "a", value: "М" } },
    {
      kind: "action",
      label: "Редактирование",
      data: { id: "a", value: "Мой дизайн" },
    },
    { kind: "action", label: "Перевернуть", data: {} },
    {
      kind: "snapshot",
      label: "Снимок значений",
      data: { id: "a", value: "Мой дизайн" },
    },
  ].map((e, seq) => ({ ...e, seq, time: seq, scope: "Row:a" })) as any;
  assert.equal(lab.verify.check(data), true);
});
test("three one-step clicks cannot satisfy the three-updates behavior", () => {
  const lab = labs.find((l) => l.id === "batching")!;
  const es = [] as any[];
  for (let n = 0; n < 3; n++) {
    es.push({
      seq: es.length,
      time: es.length,
      kind: "action",
      scope: "Пользователь",
      label: "Три обновления",
      data: { before: n },
    });
    es.push({
      seq: es.length,
      time: es.length,
      kind: "snapshot",
      scope: "Counter",
      label: "Снимок значений",
      data: { count: n + 1 },
    });
  }
  assert.equal(lab.verify.check(es), false);
});
test("bundled videos pair actual problem and corrected recordings with their own source", async () => {
  const { sampleSession } = await import("../src/data/samples");
  for (const lab of labs) {
    const problem = sampleSession(lab);
    const fixed = sampleSession(lab, "fixed");
    assert.equal(problem.source, lab.source);
    assert.equal(fixed.source, lab.fixedSource);
    assert.ok(problem.events.length > 0);
    assert.ok(fixed.events.length > 0);
    assert.equal(lab.verify.check(problem.events), false, lab.id + " problem");
    assert.equal(lab.verify.check(fixed.events), true, lab.id + " fixed");
  }
});
