import { getVideoMetadata } from "@remotion/renderer";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { labs } from "../src/data/labs";
const results = [];
for (const id of [...labs.map((l) => l.id), "observatory-demo"]) {
  const m = await getVideoMetadata(`public/videos/${id}.mp4`);
  assert.equal(m.width, 1920, id);
  assert.equal(m.height, 1080, id);
  assert.equal(m.fps, 30, id);
  assert.ok(m.durationInSeconds !== null);
  assert.ok(
    Math.abs(m.durationInSeconds - (id === "observatory-demo" ? 60 : 48)) < 0.1,
    id,
  );
  results.push({ id, ...m });
  console.log(
    id,
    m.width + "×" + m.height,
    m.fps + " fps",
    m.durationInSeconds + " sec",
  );
}
await writeFile(
  "docs/video-metadata.json",
  JSON.stringify(results, null, 2) + "\n",
);
