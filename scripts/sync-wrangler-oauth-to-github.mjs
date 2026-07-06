#!/usr/bin/env node
/**
 * Propaga il token OAuth wrangler (Workers write) su GitHub Secrets per CI Linux.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "tweetsodium";
import { getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const { seal } = pkg;
const ACCOUNT_ID = "ce7125d817d6c6ecd8c765b60ac4e0d0";

function readOAuthToken() {
  const appData = process.env.APPDATA || resolve(homedir(), "AppData", "Roaming");
  const path = resolve(appData, "xdg.config", ".wrangler", "config", "default.toml");
  if (!existsSync(path)) {
    throw new Error("Wrangler non autenticato. Esegui: cd web && npx wrangler login");
  }
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m?.[1]) throw new Error("oauth_token non trovato");
  return m[1];
}

async function putGithubSecret(pat, repo, name, value) {
  const key = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
    headers: ghHeaders(pat),
  }).then((r) => r.json());
  const encrypted = Buffer.from(
    seal(Buffer.from(value, "utf8"), Buffer.from(key.key, "base64"))
  ).toString("base64");
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    headers: { ...ghHeaders(pat), "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value: encrypted, key_id: key.key_id }),
  });
  if (!res.ok) throw new Error(`GitHub secret ${name} @ ${repo}: ${await res.text()}`);
  console.log(`   OK ${repo} → ${name}`);
}

async function main() {
  console.log("→ Token OAuth wrangler (Workers write)...");
  const token = readOAuthToken();

  const ghPat = getGitHubPat();
  console.log("→ Sync GitHub Secrets...");
  for (const repo of ["anchecasa/anchecasa", "anchecasa/supermastro-sos"]) {
    await putGithubSecret(ghPat, repo, "CLOUDFLARE_API_TOKEN", token);
  }

  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^CLOUDFLARE_API_TOKEN=/m.test(envContent)) {
    envContent = envContent.replace(/^CLOUDFLARE_API_TOKEN=.*$/m, `CLOUDFLARE_API_TOKEN=${token}`);
  } else {
    envContent += `\nCLOUDFLARE_API_TOKEN=${token}\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}\n`;
  }
  writeFileSync(envPath, envContent, "utf8");
  console.log("   OK web/.env.local");
  console.log("\nOK — usa deploy CI Linux (OpenNext non supporta build Windows).");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
