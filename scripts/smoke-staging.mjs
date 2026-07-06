/**
 * E5 — Smoke test checklist staging (manuale + verifiche DB)
 * Usage: npm run smoke:staging
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, "web", ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const map = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || m[2].startsWith("#")) continue;
    map[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return map;
}

const fileEnv = loadEnvFile(envPath);
const projectRef = "edsvmnxojsmknjuhobqa";
const dbUrl =
  process.env.SUPABASE_DB_URL ||
  fileEnv.SUPABASE_DB_URL ||
  (fileEnv.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres.${projectRef}:${encodeURIComponent(fileEnv.SUPABASE_DB_PASSWORD)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
    : null);

console.log(`
=== Smoke test staging SuperMastro (E5) ===

Scenario target: 10 richieste simulate
  · 5 matched
  · 3 expired
  · 2 cancelled

Checklist manuale:
  1. npm run seed:staging
  2. npm run dev — cliente crea 10 richieste SOS in zona Roma
  3. Mastri staging accettano da /artigiano/inviti
  4. Attendi expiry 45 min (o esegui SELECT expire_inviting_requests() in SQL)
  5. Annulla 2 richieste pre-match da UI cliente

`);

if (!dbUrl) {
  console.warn("Verifiche DB skipped — SUPABASE_DB_PASSWORD mancante.\n");
  process.exit(0);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const queries = [
  {
    label: "Mastri active staging",
    sql: `select count(*)::int as n from workers w
          join auth.users u on u.id = w.user_id
          where w.status = 'active' and u.email like 'mastro-staging-%@staging.anchecasa.it'`,
    min: 15,
  },
  {
    label: "Richieste matched",
    sql: `select count(*)::int as n from service_requests where status = 'matched'`,
    min: 0,
  },
  {
    label: "Richieste expired",
    sql: `select count(*)::int as n from service_requests where status = 'expired'`,
    min: 0,
  },
  {
    label: "Richieste cancelled",
    sql: `select count(*)::int as n from service_requests where status = 'cancelled'`,
    min: 0,
  },
  {
    label: "Inviti pending",
    sql: `select count(*)::int as n from request_invitations where status = 'pending'`,
    min: 0,
  },
];

console.log("=== Stato DB attuale ===");
for (const q of queries) {
  const { rows } = await client.query(q.sql);
  const n = rows[0]?.n ?? 0;
  const hint = q.label === "Mastri active staging" && n < q.min ? " ← esegui seed:staging" : "";
  console.log(`  ${q.label}: ${n}${hint}`);
}

await client.end();
console.log("\nGate E5: completa checklist manuale poi rivedi i contatori.\n");
