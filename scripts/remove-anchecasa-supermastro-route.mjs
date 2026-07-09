#!/usr/bin/env node
/**
 * Rimuove route Worker su anchecasa.it/supermastro* e /artigiano* così Cloudflare Pages
 * gestisce i path via middleware (URL canonici anchecasa.it/...).
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { loadDeployConfig } from "./deploy-config.mjs";

const ZONE_NAME = "anchecasa.it";
const REMOVE_PATTERNS = [
  "anchecasa.it/supermastro*",
  "anchecasa.it/artigiano*",
  "anchecasa.it/agenda*",
  "anchecasa.it/admin*",
];

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN?.trim()) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const appData = process.env.APPDATA || resolve(homedir(), "AppData", "Roaming");
  const path = resolve(appData, "xdg.config", ".wrangler", "config", "default.toml");
  if (!existsSync(path)) throw new Error("Wrangler non autenticato o CLOUDFLARE_API_TOKEN mancante");
  const raw = readFileSync(path, "utf8");
  const m = raw.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m?.[1]) throw new Error("oauth_token non trovato");
  return m[1];
}

async function cfApi(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${method} ${path}: ${JSON.stringify(json.errors || json)}`);
  return json;
}

async function main() {
  const token = readToken();
  const zones = await cfApi(token, `/zones?name=${ZONE_NAME}`);
  const zone = zones.result?.[0];
  if (!zone) throw new Error(`Zona ${ZONE_NAME} non trovata`);

  const existing = await cfApi(token, `/zones/${zone.id}/workers/routes`);
  const toRemove = (existing.result ?? []).filter((r) => REMOVE_PATTERNS.includes(r.pattern));

  if (!toRemove.length) {
    console.log("OK — nessuna route supermastro/artigiano sul Worker (già gestite da Pages)");
    return;
  }

  for (const route of toRemove) {
    await cfApi(token, `/zones/${zone.id}/workers/routes/${route.id}`, { method: "DELETE" });
    console.log(`   rimossa: ${route.pattern} → ${route.script}`);
  }

  console.log("\nOK — anchecasa.it/supermastro e /artigiano passano a Cloudflare Pages + middleware");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
