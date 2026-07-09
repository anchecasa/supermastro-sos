#!/usr/bin/env node
/** Verifica piano Workers e tenta upgrade a Paid se possibile. */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT_ID = "ce7125d817d6c6ecd8c765b60ac4e0d0";
const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");

function loadToken() {
  if (!existsSync(ENV_PATH)) throw new Error("Manca web/.env.local");
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^CLOUDFLARE_API_TOKEN=(.+)$/);
    if (m?.[1]) return m[1].trim();
  }
  throw new Error("CLOUDFLARE_API_TOKEN mancante in web/.env.local");
}

async function cfApi(token, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { ok: res.ok && json.success, json };
}

async function main() {
  const token = loadToken();
  console.log("→ Verifica token...");
  const verify = await cfApi(token, "/user/tokens/verify");
  console.log(`   Status: ${verify.json.result?.status ?? "unknown"}`);

  console.log("→ Piano Workers account...");
  const subs = await cfApi(token, `/accounts/${ACCOUNT_ID}/workers/subscriptions`);
  if (!subs.ok) {
    console.log("   Info:", JSON.stringify(subs.json.errors ?? subs.json));
  } else {
    console.log("   Subscriptions:", JSON.stringify(subs.json.result ?? [], null, 2));
  }

  console.log("→ Tentativo upgrade Workers Paid...");
  const upgrade = await cfApi(token, `/accounts/${ACCOUNT_ID}/workers/subscriptions`, {
    method: "POST",
    body: { type: "workers_paid" },
  });
  if (upgrade.ok) {
    console.log("   OK Workers Paid attivato");
    return;
  }
  console.log("   Upgrade non automatico:", JSON.stringify(upgrade.json.errors ?? upgrade.json));
  console.log("\nAttiva manualmente: https://dash.cloudflare.com/?to=/:account/workers/plans");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
