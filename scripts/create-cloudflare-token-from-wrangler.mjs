#!/usr/bin/env node
/**
 * Crea API Token Cloudflare (Workers Edit) usando la sessione wrangler OAuth
 * e lo sincronizza su GitHub Secrets anchecasa/anchecasa + anchecasa/supermastro-sos.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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

async function cfApi(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`${method} ${path}: ${JSON.stringify(json.errors || json)}`);
  }
  return json;
}

async function createWorkersToken(oauthToken) {
  const name = `supermastro-sos-ci-${new Date().toISOString().slice(0, 10)}`;

  // Lista permission groups per Workers Scripts Edit
  const groups = await cfApi(oauthToken, "/user/tokens/permission_groups");
  const find = (namePart) =>
    groups.result.find((g) => g.name.toLowerCase().includes(namePart.toLowerCase()));

  const workersScripts = find("Workers Scripts") || find("workers scripts");
  const workersRoutes = find("Workers Routes") || find("workers routes");
  const accountRead = find("Account Settings Read") || find("account read");

  if (!workersScripts) {
    throw new Error("Permission group Workers Scripts non trovato");
  }

  const permissionGroups = [workersScripts.id];
  if (workersRoutes) permissionGroups.push(workersRoutes.id);
  if (accountRead) permissionGroups.push(accountRead.id);

  const create = await cfApi(oauthToken, "/user/tokens", {
    method: "POST",
    body: {
      name,
      policies: [
        {
          effect: "allow",
          resources: { [`com.cloudflare.api.account.${ACCOUNT_ID}`]: "*" },
          permission_groups: permissionGroups.map((id) => ({ id })),
        },
      ],
    },
  });

  return create.result.value;
}

async function putGithubSecret(pat, repo, name, value) {
  const key = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
    headers: ghHeaders(pat),
  }).then((r) => r.json());
  const encrypted = Buffer.from(seal(Buffer.from(value, "utf8"), Buffer.from(key.key, "base64"))).toString(
    "base64"
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
  console.log("→ Lettura sessione wrangler OAuth...");
  const oauth = readOAuthToken();

  console.log("→ Creazione API Token Cloudflare (Workers)...");
  const apiToken = await createWorkersToken(oauth);
  console.log("   Token creato.");

  const ghPat = getGitHubPat();
  console.log("→ Sync secret GitHub...");
  for (const repo of ["anchecasa/anchecasa", "anchecasa/supermastro-sos"]) {
    await putGithubSecret(ghPat, repo, "CLOUDFLARE_API_TOKEN", apiToken);
  }

  // Salva in locale (non committare)
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^CLOUDFLARE_API_TOKEN=/m.test(envContent)) {
    envContent = envContent.replace(/^CLOUDFLARE_API_TOKEN=.*$/m, `CLOUDFLARE_API_TOKEN=${apiToken}`);
  } else {
    envContent += `\nCLOUDFLARE_API_TOKEN=${apiToken}\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}\n`;
  }
  writeFileSync(envPath, envContent, "utf8");
  console.log(`   OK web/.env.local aggiornato`);

  console.log("\nOK. Rilancia deploy Linux:");
  console.log("  node scripts/trigger-github-workflow.mjs deploy-supermastro-sos.yml main");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
