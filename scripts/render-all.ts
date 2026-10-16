import path from "node:path";
import { mkdir } from "node:fs/promises";
import { labs } from "../src/data/labs";
import { sampleSession } from "../src/data/samples";
import { buildBrief } from "../src/domain/model";
import { renderVideo, renderTour } from "../server/render";
await mkdir("public/videos", { recursive: true });
const demo = process.argv.includes("--demo");
if (demo) {
  await renderTour(path.resolve("public/videos/observatory-demo.mp4"), (p) => {
    if (Math.floor(p * 100) % 10 === 0) process.stdout.write(".");
  });
  console.log("\nProduct tour rendered");
  process.exit(0);
}
const only = process.argv.indexOf("--labs");
const selection =
  only >= 0
    ? labs.filter((l) =>
        (process.argv[only + 1] || "").split(",").includes(l.id),
      )
    : labs;
if (!selection.length) throw Error("Не найдены лаборатории для рендера");
for (const lab of selection) {
  const session = sampleSession(lab);
  const brief = buildBrief(
    session,
    lab.short,
    lab.explanation,
    lab.solution,
    true,
    lab.fixedSource,
  );
  brief.question = lab.question;
  brief.diagram = lab.diagram;
  brief.comparisonEvents = sampleSession(lab, "fixed").events.slice(0, 60);
  brief.conclusion = lab.conclusion;
  if (demo) brief.pace = "slow";
  let last = -1;
  console.log("Рендер:", lab.id);
  await renderVideo(
    brief,
    path.resolve(
      "public/videos",
      demo ? "observatory-demo.mp4" : lab.id + ".mp4",
    ),
    (p) => {
      const n = Math.floor(p * 10);
      if (n > last) {
        last = n;
        console.log(lab.id, n * 10 + "%");
      }
    },
    new AbortController().signal,
  );
  console.log("Готово:", lab.id);
}
