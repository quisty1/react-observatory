import { readFile, writeFile, mkdir } from "node:fs/promises";
import { labs } from "../src/data/labs";
import { sessionSchema, type TraceEvent } from "../src/domain/model";
const recordings: Record<
  string,
  { problem: TraceEvent[]; fixed: TraceEvent[] }
> = {};
await mkdir("examples", { recursive: true });
for (const lab of labs) {
  const s = sessionSchema.parse(
    JSON.parse(await readFile(`work/captures/${lab.id}.json`, "utf8")),
  );
  const problem = sessionSchema.parse(
    JSON.parse(await readFile(`work/captures/${lab.id}-problem.json`, "utf8")),
  );
  if (
    s.source !== lab.fixedSource ||
    !lab.verify.check(s.events) ||
    problem.source !== lab.source ||
    lab.verify.check(problem.events)
  )
    throw Error("Запись не соответствует учебному примеру: " + lab.id);
  recordings[lab.id] = { problem: problem.events, fixed: s.events };
  await writeFile(
    `examples/${lab.id}.json`,
    JSON.stringify(problem, null, 2) + "\n",
  );
  await writeFile(
    `examples/${lab.id}-fixed.json`,
    JSON.stringify(s, null, 2) + "\n",
  );
}
await writeFile(
  "src/data/recordings.json",
  JSON.stringify(recordings, null, 2) + "\n",
);
console.log("Collected eight verified problem/fixed browser recording pairs");
