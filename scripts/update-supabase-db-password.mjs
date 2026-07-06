#!/usr/bin/env node
/** Imposta password DB remota via Management API e verifica connessione Postgres. */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, "web", ".env.local");
const PROJECT_REF = "edsvmnxojsmknjuhobqa";

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  let raw = readFileSync(path, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith("#")) continue;
    map[m[1]] = value.replace(/^["']|["']$/g, "");
  }
  return map;
}

function buildDbUrls(password) {
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  ];
}

async function testConnection(password) {
  for (const url of buildDbUrls(password)) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return true;
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

async function main() {
  const env = loadEnvFile(ENV_PATH);
  const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
  const password = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;

  if (!password) throw new Error("SUPABASE_DB_PASSWORD mancante in web/.env.local");
  if (!token?.startsWith("sbp_")) throw new Error("SUPABASE_ACCESS_TOKEN mancante in web/.env.local");

  if (await testConnection(password)) {
    console.log("OK: password DB già valida sul progetto remoto.");
    return;
  }

  console.log("→ Aggiorno password DB remota (Management API)...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/password`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH password → ${res.status}: ${text.slice(0, 300)}`);

  console.log("→ Attendo propagazione password (15s)...");
  await new Promise((r) => setTimeout(r, 15000));

  if (!(await testConnection(password))) {
    throw new Error("Password impostata ma connessione Postgres ancora fallita — riprova tra 1 minuto.");
  }

  console.log("OK: password DB remota aggiornata e verificata.");
}

main().catch((err) => {
  console.error("ERRORE:", err.message || err);
  process.exit(1);
});
