#!/usr/bin/env node
/**
 * Sincronizza secret GitHub Actions per supermastro-sos.
 * Uso: $env:CLOUDFLARE_API_TOKEN="..."; node scripts/sync-github-secrets.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "tweetsodium";
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const { seal } = pkg;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SECRET_KEYS = [
  "CLOUDFLARE_API_TOKEN",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_DB_URL",
  "NEXT_PUBLIC_SENTRY_DSN",
];

function loadDotEnv(path) {
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

function loadSiblingAnchecasaEnv() {
  const path = resolve(ROOT, "..", "anchecasa-pulita-2026", ".env");
  return loadDotEnv(path);
}

async function ghApi(pat, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      ...ghHeaders(pat),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

function sealSecret(publicKeyB64, secretValue) {
  const messageBytes = Buffer.from(secretValue, "utf8");
  const keyBytes = Buffer.from(publicKeyB64, "base64");
  return Buffer.from(seal(messageBytes, keyBytes)).toString("base64");
}

async function putSecret(pat, repo, name, value) {
  const key = await ghApi(pat, `/repos/${repo}/actions/secrets/public-key`);
  const encrypted = sealSecret(key.key, value);
  await ghApi(pat, `/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    body: { encrypted_value: encrypted, key_id: key.key_id },
  });
  console.log(`   OK ${name}`);
}

async function main() {
  const cfg = loadDeployConfig();
  const repo = cfg.github.repo;
  if (!repo) throw new Error("Repo non configurato");

  const sibling = loadSiblingAnchecasaEnv();
  const values = { ...sibling };

  for (const k of SECRET_KEYS) {
    if (process.env[k]?.trim()) values[k] = process.env[k].trim();
  }

  if (!values.NEXT_PUBLIC_SUPABASE_ANON_KEY && values.VITE_SUPABASE_PUBLISHABLE_KEY) {
    values.NEXT_PUBLIC_SUPABASE_ANON_KEY = values.VITE_SUPABASE_PUBLISHABLE_KEY;
  }

  if (!values.CLOUDFLARE_API_TOKEN) {
    console.error(
      "CLOUDFLARE_API_TOKEN mancante.\n" +
        "Crea su https://dash.cloudflare.com/profile/api-tokens (Workers Scripts Edit)\n" +
        'Poi: $env:CLOUDFLARE_API_TOKEN="..."; node scripts/sync-github-secrets.mjs'
    );
    process.exit(1);
  }

  const pat = getGitHubPat();
  console.log(`→ Secret su ${repo}...`);

  for (const key of SECRET_KEYS) {
    if (!values[key]) continue;
    await putSecret(pat, repo, key, values[key]);
  }

  console.log("OK: secret sincronizzati. Rilancia: node scripts/trigger-github-workflow.mjs deploy.yml main");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
