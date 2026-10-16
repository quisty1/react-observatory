import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { compile } from "../src/runtime/compiler";
test("compiles actual TSX and preserves default export", () => {
  const result = compile(
    'import {useState} from "react"; export default function App(){ const n:number=1; return <b>{n}</b>; }',
  );
  assert.match(result, /exports.default/);
  assert.match(result, /jsx/);
});
test("rejects external imports, dynamic imports and direct require", () => {
  for (const source of [
    'import x from "https://bad.test/x";',
    'import("react");',
    'require("react");',
  ])
    assert.throws(() => compile(source));
});
test("loop and function guards stop ordinary infinite execution", () => {
  const result = compile("export default function App(){ while(true){} }");
  let ticks = 0;
  const ctx = {
    exports: {},
    __guard: () => {
      if (++ticks > 10) throw Error("budget");
    },
  };
  vm.runInNewContext(result, ctx);
  assert.throws(() => (ctx.exports as any).default(), /budget/);
});
test("rejects excessive code and reports syntax errors", () => {
  assert.throws(() => compile("x".repeat(70000)), /64/);
  assert.throws(() => compile("export default function {"));
});
test("records source lines for explicit teaching markers", () => {
  const code = compile(
    'import {trace} from "@observatory/lab";\ntrace.action("Click", {});',
  );
  let line = 0;
  vm.runInNewContext(code, {
    exports: {},
    require: () => ({
      trace: {
        action: (_name: string, _data: unknown, n: number) => {
          line = n;
        },
      },
    }),
  });
  assert.equal(line, 2);
});
