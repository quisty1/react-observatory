import { test } from "node:test";
import assert from "node:assert/strict";
import { createExecutionGuard } from "../src/runtime/guard";
test("budget applies to one synchronous execution, not to a legitimate animation over time", async () => {
  let now = 0;
  const guard = createExecutionGuard(() => now, 800);
  guard();
  now = 900;
  assert.throws(() => guard(), /слишком долгий цикл/);
  await Promise.resolve();
  guard();
  now = 1000;
  guard();
  await Promise.resolve();
  now = 2000;
  assert.doesNotThrow(() => guard());
});
