#!/usr/bin/env node
/** Carica secret runtime sul Worker da web/.env.local via wrangler. */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDeployConfig } from "./deploy-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = resolve(ROOT, "web");
const WORKER = loadDeployConfig().cloudflare.workerName || "supermastro-sos";

const SECRETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "GOOGLE_MAPS_API_KEY",
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
];

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function putSecret(name, value, wranglerEnv) {
  const res = spawnSync("npx", ["wrangler", "secret", "put", name, "--name", WORKER], {
    cwd: WEB,
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...wranglerEnv },
    shell: process.platform === "win32",
  });
  const err = (res.stderr || res.stdout || "").trim();
  if (res.status !== 0) {
    throw new Error(`wrangler secret put ${name}: ${err || "exit " + res.status}`);
  }
  console.log(`   OK ${name}`);
}

async function main() {
  const env = loadEnv(resolve(WEB, ".env.local"));
  const wranglerEnv = {
    CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "",
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "",
  };
  if (!wranglerEnv.CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_API_TOKEN mancante in web/.env.local");
  }
  console.log(`→ Secret Worker ${WORKER}...`);
  for (const key of SECRETS) {
    if (!env[key]?.trim()) {
      console.log(`   skip ${key}`);
      continue;
    }
    putSecret(key, env[key].trim(), wranglerEnv);
  }
  console.log("OK");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
