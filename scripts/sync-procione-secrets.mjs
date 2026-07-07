#!/usr/bin/env node
/**
 * Sincronizza secret Procione: Supabase → .env.local → GitHub → Cloudflare Worker.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pkg from "tweetsodium";
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const { seal } = pkg;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, "web", ".env.local");
const PROJECT_REF = "edsvmnxojsmknjuhobqa";

const PROCIONE_KEYS = ["OPENAI_API_KEY", "GOOGLE_MAPS_API_KEY", "ELEVENLABS_API_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

function loadEnv(path) {
  if (!existsSync(path)) return { text: "", map: {} };
  const text = readFileSync(path, "utf8");
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    map[m[1]] = v;
  }
  return { text, map };
}

function upsertEnv(text, key, value) {
  if (!value) return text;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, `${key}=${value}`);
  return `${text.replace(/\s*$/, "")}\n${key}=${value}\n`;
}

async function fetchSupabaseSecrets(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Supabase secrets → ${res.status}`);
  return await res.json();
}

async function putGithubSecret(pat, repo, name, value) {
  const key = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
    headers: ghHeaders(pat),
  }).then((r) => r.json());
  const encrypted = Buffer.from(seal(Buffer.from(value, "utf8"), Buffer.from(key.key, "base64"))).toString("base64");
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    headers: { ...ghHeaders(pat), "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value: encrypted, key_id: key.key_id }),
  });
  if (!res.ok) throw new Error(`GitHub secret ${name} → ${res.status}`);
  console.log(`   OK GitHub ${name}`);
}

async function main() {
  const { text, map } = loadEnv(ENV_PATH);
  if (!map.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN mancante in web/.env.local");

  console.log("→ Leggo secret da Supabase...");
  const remote = await fetchSupabaseSecrets(map.SUPABASE_ACCESS_TOKEN);
  let envText = text;
  const merged = { ...map };

  for (const name of ["OPENAI_API_KEY"]) {
    const row = remote.find((s) => s.name === name);
    if (row?.value && !merged[name]) {
      envText = upsertEnv(envText, name, row.value);
      merged[name] = row.value;
      console.log(`   aggiunto ${name} da Supabase`);
    }
  }

  writeFileSync(ENV_PATH, envText, "utf8");

  const cfg = loadDeployConfig();
  const pat = getGitHubPat();
  console.log(`→ Sync GitHub ${cfg.github.repo}...`);
  for (const key of ["OPENAI_API_KEY", "GOOGLE_MAPS_API_KEY", "ELEVENLABS_API_KEY", "CLOUDFLARE_API_TOKEN"]) {
    if (merged[key]?.trim()) await putGithubSecret(pat, cfg.github.repo, key, merged[key].trim());
  }

  console.log("→ Upload secret Worker...");
  const upload = spawnSync("node", ["scripts/upload-worker-secrets.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (upload.status !== 0) process.exit(upload.status ?? 1);

  console.log("OK Procione secrets sincronizzati.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
