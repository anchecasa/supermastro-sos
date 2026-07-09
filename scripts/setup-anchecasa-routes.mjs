#!/usr/bin/env node
/**
 * Aggiunge route Workers su anchecasa.it (supermastro, sos, artigiano, admin, agenda).
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { loadDeployConfig } from "./deploy-config.mjs";

const ZONE_NAME = "anchecasa.it";
const ROUTES = [
  "anchecasa.it/sos*",
  "anchecasa.it/artigiano*",
  "anchecasa.it/admin*",
  "anchecasa.it/agenda*",
];

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

async function main() {
  const cfg = loadDeployConfig();
  const accountId = cfg.cloudflare.accountId;
  const workerName = cfg.cloudflare.workerName || "supermastro-sos";
  const token = readOAuthToken();

  const zones = await cfApi(token, `/zones?name=${ZONE_NAME}`);
  const zone = zones.result?.[0];
  if (!zone) throw new Error(`Zona ${ZONE_NAME} non trovata`);

  const existing = await cfApi(token, `/zones/${zone.id}/workers/routes`);
  const patterns = new Set((existing.result ?? []).map((r) => r.pattern));

  for (const pattern of ROUTES) {
    if (patterns.has(pattern)) {
      console.log(`   OK già presente: ${pattern}`);
      continue;
    }
    await cfApi(token, `/zones/${zone.id}/workers/routes`, {
      method: "POST",
      body: { pattern, script: workerName },
    });
    console.log(`   OK route creata: ${pattern}`);
  }

  console.log("\nOK — route anchecasa.it →", workerName);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
