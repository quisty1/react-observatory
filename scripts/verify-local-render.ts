import { labs } from "../src/data/labs";
import { sampleSession } from "../src/data/samples";
import { buildBrief } from "../src/domain/model";
import { getVideoMetadata } from "@remotion/renderer";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const lab = labs[0],
  brief = buildBrief(
    sampleSession(lab),
    lab.short,
    lab.explanation,
    lab.solution,
    true,
    lab.fixedSource,
  );
brief.question = lab.question;
brief.diagram = lab.diagram;
brief.comparisonEvents = sampleSession(lab, "fixed").events;
const response = await fetch("http://127.0.0.1:3002/api/renders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ brief }),
});
assert.equal(response.status, 202);
let job = await response.json();
console.log("HTTP render accepted:", job.id);
let last = "";
const started = Date.now();
while (!["done", "error", "cancelled"].includes(job.status)) {
  assert.ok(Date.now() - started < 180000, "Render timeout");
  await new Promise((r) => setTimeout(r, 1000));
  job = await (
    await fetch("http://127.0.0.1:3002/api/renders/" + job.id)
  ).json();
  const state = job.status + " " + Math.floor(job.progress * 5) * 20 + "%";
  if (state !== last) {
    console.log(state);
    last = state;
  }
}
assert.equal(job.status, "done", job.error);
const file = await fetch("http://127.0.0.1:3002/renders/" + job.id + ".mp4");
assert.equal(file.status, 200);
const metadata = await getVideoMetadata(".renders/" + job.id + ".mp4");
assert.equal(metadata.width, 1920);
assert.equal(metadata.height, 1080);
assert.equal(metadata.fps, 30);
await writeFile(
  "docs/http-render-verification.json",
  JSON.stringify({ job, metadata, httpStatus: file.status }, null, 2) + "\n",
);
console.log("HTTP export + download + metadata verified");
