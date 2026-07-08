#!/usr/bin/env node
/**
 * Build pulito OpenNext + deploy Cloudflare Worker (senza rollback).
 * Uso: node scripts/redeploy-worker.mjs
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = resolve(ROOT, "web");
const OPEN_NEXT = resolve(WEB, ".open-next");

function loadEnv() {
  const path = resolve(WEB, ".env.local");
  if (!existsSync(path)) throw new Error("Manca web/.env.local");
  const map = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, {
    cwd: WEB,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const env = loadEnv();
if (!env.CLOUDFLARE_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN mancante in web/.env.local");

console.log("→ Pulizia .open-next...");
if (existsSync(OPEN_NEXT)) rmSync(OPEN_NEXT, { recursive: true, force: true });

console.log("→ Build OpenNext...");
run("npx", ["opennextjs-cloudflare", "build"], {
  CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ?? "",
});

console.log("→ Deploy Worker...");
run("npx", ["opennextjs-cloudflare", "deploy"], {
  CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID ?? "",
});

console.log("→ Upload secret runtime...");
const upload = spawnSync("node", ["scripts/upload-worker-secrets.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
});
if (upload.status !== 0) process.exit(upload.status ?? 1);

console.log("OK: deploy completato. Verifica https://supermastro.anchecasa.it/supermastro");
