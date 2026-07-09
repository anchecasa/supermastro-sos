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
const DEFAULT_ACCOUNT_ID = "ce7125d817d6c6ecd8c765b60ac4e0d0";

function loadEnv() {
  const path = resolve(WEB, ".env.local");
  if (!existsSync(path)) throw new Error("Manca web/.env.local");
  const map = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

function wranglerEnv(env) {
  const out = {
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
  };
  if (env.CLOUDFLARE_API_TOKEN?.trim()) {
    out.CLOUDFLARE_API_TOKEN = env.CLOUDFLARE_API_TOKEN.trim();
  }
  return out;
}

function run(cmd, args, env = {}) {
  const childEnv = { ...process.env, ...env };
  if (!env.CLOUDFLARE_API_TOKEN) {
    delete childEnv.CLOUDFLARE_API_TOKEN;
  }
  const res = spawnSync(cmd, args, {
    cwd: WEB,
    stdio: "inherit",
    env: childEnv,
    shell: process.platform === "win32",
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const env = loadEnv();
const cfEnv = wranglerEnv(env);

if (!cfEnv.CLOUDFLARE_API_TOKEN) {
  console.log("→ Auth: sessione wrangler OAuth (senza CLOUDFLARE_API_TOKEN)");
}

console.log("→ Pulizia .open-next...");
if (existsSync(OPEN_NEXT)) rmSync(OPEN_NEXT, { recursive: true, force: true });

console.log("→ Build OpenNext...");
run("npx", ["opennextjs-cloudflare", "build"], cfEnv);

console.log("→ Deploy Worker...");
run("npx", ["opennextjs-cloudflare", "deploy"], cfEnv);

console.log("→ Upload secret runtime...");
const upload = spawnSync("node", ["scripts/upload-worker-secrets.mjs"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, ...cfEnv },
});
if (upload.status !== 0) process.exit(upload.status ?? 1);

console.log("OK: deploy completato. Verifica https://supermastro.anchecasa.it/supermastro");
