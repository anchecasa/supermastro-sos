#!/usr/bin/env node
/**
 * Usa il token OAuth wrangler (workers write) come CLOUDFLARE_API_TOKEN per CI,
 * quando la creazione di API token dedicati non è autorizzata (9109).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "tweetsodium";
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const { seal } = pkg;
const ACCOUNT_ID = "ce7125d817d6c6ecd8c765b60ac4e0d0";

function wranglerConfigPath() {
  const appData = process.env.APPDATA || resolve(homedir(), "AppData", "Roaming");
  return resolve(appData, "xdg.config", ".wrangler", "config", "default.toml");
}

function readOAuthToken() {
  const path = wranglerConfigPath();
  if (!existsSync(path)) {
    throw new Error("Wrangler non autenticato. Esegui: cd web && npx wrangler login");
  }
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m?.[1]) throw new Error("oauth_token non trovato in wrangler config");
  return m[1];
}

async function verifyToken(token) {
  const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Token non valido: ${JSON.stringify(json.errors || json)}`);
  }
  return json.result;
}

async function putGithubSecret(pat, repo, name, value) {
  const key = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
    headers: ghHeaders(pat),
  }).then((r) => r.json());
  const encrypted = Buffer.from(seal(Buffer.from(value, "utf8"), Buffer.from(key.key, "base64"))).toString(
    "base64",
  );
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    headers: { ...ghHeaders(pat), "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value: encrypted, key_id: key.key_id }),
  });
  if (!res.ok) throw new Error(`GitHub secret ${name} @ ${repo}: ${await res.text()}`);
  console.log(`   OK GitHub ${repo} → ${name}`);
}

async function main() {
  console.log("→ Lettura OAuth wrangler...");
  const token = readOAuthToken();

  console.log("→ Verifica token...");
  const verified = await verifyToken(token);
  console.log(`   Status: ${verified.status}`);

  const ghPat = getGitHubPat();
  console.log("→ Sync GitHub Secrets...");
  for (const repo of ["anchecasa/anchecasa", "anchecasa/supermastro-sos"]) {
    await putGithubSecret(ghPat, repo, "CLOUDFLARE_API_TOKEN", token);
  }

  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, "utf8");
    if (/^#?\s*CLOUDFLARE_API_TOKEN=/m.test(envContent)) {
      envContent = envContent.replace(
        /^#?\s*CLOUDFLARE_API_TOKEN=.*$/m,
        "# CLOUDFLARE_API_TOKEN=sync-github-only (locale: wrangler OAuth)",
      );
    }
    if (!/^CLOUDFLARE_ACCOUNT_ID=/m.test(envContent)) {
      envContent += `\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}\n`;
    }
    writeFileSync(envPath, envContent, "utf8");
  }
  console.log("   OK web/.env.local (token solo su GitHub, locale usa wrangler login)");
  console.log("\nOK. Rilancia deploy Linux:");
  console.log("  node scripts/trigger-github-workflow.mjs deploy --worker main");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
