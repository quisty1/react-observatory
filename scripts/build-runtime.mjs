import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("public", { recursive: true });
await build({
  entryPoints: ["src/runtime/sandbox.tsx"],
  outfile: "public/sandbox-runtime.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"development"' },
  minify: false,
  jsx: "automatic",
  logLevel: "warning",
});
console.log("Sandbox: development React + Remotion bundled locally");
