#!/usr/bin/env node
/**
 * Collega supermastro.anchecasa.it al Worker supermastro-sos (custom domain Cloudflare).
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { loadDeployConfig } from "./deploy-config.mjs";

const HOSTNAME = "supermastro.anchecasa.it";
const ZONE_NAME = "anchecasa.it";

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

  console.log(`→ Zona ${ZONE_NAME}...`);
  const zones = await cfApi(token, `/zones?name=${ZONE_NAME}`);
  const zone = zones.result?.[0];
  if (!zone) {
    throw new Error(`Zona ${ZONE_NAME} non trovata su questo account Cloudflare`);
  }
  console.log(`   OK zone ${zone.id}`);

  console.log(`→ DNS ${HOSTNAME}...`);
  try {
    const existing = await cfApi(
      token,
      `/zones/${zone.id}/dns_records?type=CNAME&name=supermastro`,
    );
    if (existing.result?.length) {
      console.log("   OK record DNS già presente");
    } else {
      await cfApi(token, `/zones/${zone.id}/dns_records`, {
        method: "POST",
        body: {
          type: "CNAME",
          name: "supermastro",
          content: "supermastro-sos.palumbofernando12.workers.dev",
          proxied: true,
          ttl: 1,
        },
      });
      console.log("   OK record DNS CNAME creato");
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("81057") || msg.includes("already exists")) {
      console.log("   OK record DNS già presente");
    } else {
      throw e;
    }
  }

  console.log(`→ Route Worker ${HOSTNAME} → ${workerName}...`);
  try {
    await cfApi(token, `/accounts/${accountId}/workers/domains`, {
      method: "POST",
      body: {
        hostname: HOSTNAME,
        service: workerName,
        environment: "production",
        zone_id: zone.id,
      },
    });
    console.log("   OK custom domain creato");
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes("already exists") || msg.includes("1061") || msg.includes("81053")) {
      console.log("   OK custom domain già presente");
    } else if (msg.includes("10405")) {
      console.log("   skip custom domain API (wrangler route gestisce il routing)");
    } else {
      throw e;
    }
  }

  console.log(`\nOK — ${HOSTNAME} → Worker ${workerName}`);
  console.log(`   Admin: https://${HOSTNAME}/admin`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
