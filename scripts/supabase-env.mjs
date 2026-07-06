import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const PROJECT_REF = "edsvmnxojsmknjuhobqa";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ENV_PATH = resolve(ROOT, "web", ".env.local");
export const SECRETS_PATH = resolve(ROOT, "web", ".env.secrets.local");

export function loadEnvFile(path) {
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

export function getEnv() {
  const fileEnv = loadEnvFile(ENV_PATH);
  const secrets = loadEnvFile(SECRETS_PATH);
  return {
    fileEnv,
    secrets,
    supabaseUrl:
      fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      `https://${PROJECT_REF}.supabase.co`,
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      fileEnv.SUPABASE_SERVICE_ROLE_KEY ||
      secrets.SUPABASE_SERVICE_ROLE_KEY ||
      "",
    dbPassword:
      process.env.SUPABASE_DB_PASSWORD ||
      fileEnv.SUPABASE_DB_PASSWORD ||
      secrets.SUPABASE_DB_PASSWORD ||
      "",
    dbUrl: process.env.SUPABASE_DB_URL || fileEnv.SUPABASE_DB_URL || secrets.SUPABASE_DB_URL || "",
    accessToken:
      process.env.SUPABASE_ACCESS_TOKEN ||
      fileEnv.SUPABASE_ACCESS_TOKEN ||
      secrets.SUPABASE_ACCESS_TOKEN ||
      "",
  };
}

export function buildDbUrls(password, dbUrlOverride) {
  const urls = [];
  if (dbUrlOverride) urls.push(dbUrlOverride);
  if (password) {
    const enc = encodeURIComponent(password);
    urls.push(`postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres`);
    urls.push(
      `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
    );
    urls.push(
      `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
    );
  }
  return urls;
}

export async function connectPg(options = {}) {
  const env = getEnv();
  const password = options.password ?? env.dbPassword;
  const dbUrlOverride = options.dbUrl ?? env.dbUrl;
  if (!password && !dbUrlOverride) {
    throw new Error("SUPABASE_DB_PASSWORD o SUPABASE_DB_URL mancante in web/.env.local");
  }

  let lastErr;
  for (const dbUrl of buildDbUrls(password, dbUrlOverride)) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastErr;
}

export async function ensureMigrationTracker(client) {
  await client.query(`
    create table if not exists public._supermastro_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

export async function listAppliedMigrations(client) {
  await ensureMigrationTracker(client);
  const { rows } = await client.query("select filename from public._supermastro_migrations");
  return new Set(rows.map((r) => r.filename));
}

export async function markMigrationApplied(client, file) {
  await client.query(
    "insert into public._supermastro_migrations (filename) values ($1) on conflict (filename) do nothing",
    [file],
  );
}

export async function bootstrapAppliedMigrations(client, files) {
  const applied = await listAppliedMigrations(client);
  if (applied.size > 0) return applied;

  const { rows } = await client.query(
    "select to_regclass('public.workers') is not null as exists",
  );
  if (!rows[0]?.exists) return applied;

  const throughD = files.filter((f) =>
    [
      "20260705100000_blocco_a_foundation.sql",
      "20260705110000_blocco_b_billing_admin.sql",
      "20260705120000_blocco_c_service_requests.sql",
      "20260705130000_blocco_d_matching.sql",
    ].includes(f),
  );

  for (const file of throughD) {
    await markMigrationApplied(client, file);
    applied.add(file);
  }
  return applied;
}
