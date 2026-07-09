#!/usr/bin/env node
/** Build Next.js: webpack su CI Linux (bundle Worker), Turbopack in locale. */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web");
const useWebpack = process.env.CI === "true" || process.argv.includes("--webpack");
const args = useWebpack ? ["build", "--webpack"] : ["build"];

console.log(`→ next ${args.join(" ")}`);
const res = spawnSync("npx", ["next", ...args], {
  cwd: WEB,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(res.status ?? 1);
