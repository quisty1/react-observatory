import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createApp } from "../server/app";
import { buildBrief } from "../src/domain/model";
const brief = buildBrief(
  {
    version: 1,
    id: "x",
    labId: "batching",
    source: "export default function App(){}",
    strict: false,
    events: [],
    createdAt: 1,
    title: "Тест",
  },
  "Тест",
  "Объяснение",
  "Решение",
  true,
);
test("render API validates payloads, sequences jobs and cancels pending work", async () => {
  let started = 0;
  const gates: (() => void)[] = [];
  const app = createApp(async (_brief, _file, progress, signal) => {
    started++;
    progress(0.5);
    await new Promise<void>((r) => {
      gates.push(r);
      signal.addEventListener("abort", () => r(), { once: true });
    });
    await writeFile(_file, "test-video");
  });
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address() as any;
  const url = "http://127.0.0.1:" + address.port;
  const post = (data: any) =>
    fetch(url + "/api/renders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  try {
    assert.equal((await fetch(url + "/api/health")).status, 200);
    assert.equal((await post({ brief: {} })).status, 400);
    assert.equal(
      (
        await fetch(url + "/api/renders", {
          method: "POST",
          headers: {
            Origin: "https://evil.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ brief }),
        })
      ).status,
      403,
    );
    const first = await (await post({ brief })).json();
    const second = await (await post({ brief })).json();
    assert.equal(started, 1);
    assert.equal(second.status, "queued");
    const cancelled = await (
      await fetch(url + "/api/renders/" + second.id, { method: "DELETE" })
    ).json();
    assert.equal(cancelled.status, "cancelled");
    gates[0]();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(started, 1);
    assert.equal(
      (await (await fetch(url + "/api/renders/" + first.id)).json()).status,
      "done",
    );
    const file = await fetch(url + "/renders/" + first.id + ".mp4");
    assert.equal(file.status, 200);
    assert.equal(await file.text(), "test-video");
    assert.equal((await fetch(url + "/api/renders/not-found")).status, 404);
  } finally {
    gates.forEach((g) => g());
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
