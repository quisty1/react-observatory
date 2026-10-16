import { format } from "prettier";
import { writeFile } from "node:fs/promises";
import { rawLabs } from "../src/data/labs";
const result: Record<string, { source: string; fixedSource: string }> = {};
async function pretty(code: string) {
  const lines = code.split("\n");
  const body = lines.slice(2).join("\n");
  const react = [
    "useState",
    "useEffect",
    "useMemo",
    "useCallback",
    "useRef",
    "memo",
    "createContext",
    "useContext",
  ].filter((name) => new RegExp("\\b" + name + "\\b").test(body));
  const sdk = ["trace", "useSnapshot", "TraceBoundary"].filter((name) =>
    new RegExp("\\b" + name + "\\b").test(body),
  );
  return format(
    `import {${react.join(",")}} from 'react';\nimport {${sdk.join(",")}} from '@observatory/lab';\n` +
      body,
    { parser: "typescript", singleQuote: true, printWidth: 72, tabWidth: 2 },
  );
}
for (const lab of rawLabs)
  result[lab.id] = {
    source: await pretty(lab.source),
    fixedSource: await pretty(lab.fixedSource),
  };
await writeFile(
  "src/data/lab-code.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log("Prepared 16 readable TSX examples");
