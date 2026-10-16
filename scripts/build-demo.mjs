import { spawnSync } from "node:child_process";
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: { ...process.env, VITE_STATIC_DEMO: "true" },
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
