#!/usr/bin/env node
/**
 * Configura progetto Supabase remoto SuperMastro:
 * - verifica schema
 * - migrazioni DB (se SUPABASE_DB_PASSWORD)
 * - redirect Auth SuperMastro (se SUPABASE_ACCESS_TOKEN)
 * - deploy Edge Functions (se token)
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, execSync } from "node:child_process";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROJECT_REF = "edsvmnxojsmknjuhobqa";
const ENV_PATH = resolve(ROOT, "web", ".env.local");
const SECRETS_PATH = resolve(ROOT, "web", ".env.secrets.local");

const SUPERMASTRO_REDIRECTS = [
  "http://localhost:3000/supermastro/auth/callback",
  "http://localhost:3000/artigiano/auth/callback",
  "http://127.0.0.1:3000/supermastro/auth/callback",
  "http://127.0.0.1:3000/artigiano/auth/callback",
  "https://anchecasa.it/supermastro/auth/callback",
  "https://anchecasa.it/artigiano/auth/callback",
  "https://www.anchecasa.it/supermastro/auth/callback",
  "https://www.anchecasa.it/artigiano/auth/callback",
  "https://supermastro-sos.anchecasa.workers.dev/supermastro/auth/callback",
  "https://supermastro-sos.anchecasa.workers.dev/artigiano/auth/callback",
];

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
    value = value.replace(/^["']|["']$/g, "");
    map[m[1]] = value;
  }
  return map;
}

function loadServiceRoleKey(fileEnv) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  if (fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return fileEnv.SUPABASE_SERVICE_ROLE_KEY.trim();
  }
  const siblingE2e = resolve(ROOT, "..", "anchecasa-pulita-2026", ".env.e2e.local");
  const e2e = loadEnvFile(siblingE2e);
  return e2e.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function trySupabaseTokenFromCli() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  for (const p of [
    resolve(home, ".supabase", "access-token"),
    resolve(process.env.APPDATA || "", "supabase", "access-token"),
  ]) {
    if (!existsSync(p)) continue;
    const t = readFileSync(p, "utf8").trim();
    if (t.startsWith("sbp_")) return t;
  }
  return "";
}

function trySupabaseTokenFromCredentialManager() {
  if (process.platform !== "win32") return "";
  const ps = `
    try {
      if (-not (Get-Module -ListAvailable -Name CredentialManager)) { exit 2 }
      Import-Module CredentialManager -ErrorAction Stop
      $c = Get-StoredCredential -Target "Supabase CLI:supabase" -ErrorAction Stop
      if ($c.Password) {
        $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($c.Password)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
        if ($plain -match '^sbp_') { Write-Output $plain }
      }
    } catch { exit 3 }
  `;
  const res = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const token = (res.stdout || "").trim();
  return token.startsWith("sbp_") ? token : "";
}

function getAccessToken(fileEnv) {
  const secrets = loadEnvFile(SECRETS_PATH);
  return (
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    fileEnv.SUPABASE_ACCESS_TOKEN?.trim() ||
    secrets.SUPABASE_ACCESS_TOKEN?.trim() ||
    trySupabaseTokenFromCli() ||
    trySupabaseTokenFromCredentialManager() ||
    ""
  );
}

async function mgmt(method, path, token, body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function checkSchema(serviceKey, supabaseUrl) {
  let res;
  try {
    res = await fetch(`${supabaseUrl}/rest/v1/workers?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
  } catch (err) {
    throw new Error(`Connessione Supabase fallita: ${err.cause?.message || err.message}`);
  }
  if (res.ok) return { applied: true };
  const body = await res.text();
  if (res.status === 404 || /Could not find the table|schema cache|PGRST205/i.test(body)) {
    return { applied: false };
  }
  throw new Error(`Verifica schema fallita (${res.status}): ${body.slice(0, 200)}`);
}

async function queryViaApi(token, sql, readOnly = false) {
  const path = readOnly
    ? `/projects/${PROJECT_REF}/database/query/read-only`
    : `/projects/${PROJECT_REF}/database/query`;
  return mgmt("POST", path, token, { query: sql });
}

async function ensureMigrationTracker(token) {
  await queryViaApi(
    token,
    `create table if not exists public._supermastro_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )`,
  );
}

async function listAppliedMigrations(token) {
  await ensureMigrationTracker(token);
  try {
    const rows = await queryViaApi(
      token,
      "select filename from public._supermastro_migrations order by filename",
      true,
    );
    if (Array.isArray(rows)) return new Set(rows.map((r) => r.filename));
  } catch {
    /* first run */
  }
  return new Set();
}

async function markMigrationApplied(token, file) {
  const safe = file.replace(/'/g, "''");
  await queryViaApi(
    token,
    `insert into public._supermastro_migrations (filename) values ('${safe}')
     on conflict (filename) do nothing`,
  );
}

async function bootstrapAppliedMigrations(token, files) {
  const applied = await listAppliedMigrations(token);
  if (applied.size > 0) return applied;

  let hasWorkers = false;
  try {
    await queryViaApi(
      token,
      "select 1 from public.workers limit 1",
      true,
    );
    hasWorkers = true;
  } catch {
    return applied;
  }

  if (!hasWorkers) return applied;

  const throughD = files.filter((f) =>
    [
      "20260705100000_blocco_a_foundation.sql",
      "20260705110000_blocco_b_billing_admin.sql",
      "20260705120000_blocco_c_service_requests.sql",
      "20260705130000_blocco_d_matching.sql",
    ].includes(f),
  );

  for (const file of throughD) {
    await markMigrationApplied(token, file);
    applied.add(file);
    console.log(`  bootstrap applied ${file}`);
  }
  return applied;
}

async function applyMigrationsViaApi(token) {
  const migrationsDir = resolve(ROOT, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = await bootstrapAppliedMigrations(token, files);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip ${file} (già applicata)`);
      continue;
    }
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    console.log(`  applying ${file} (Management API)...`);
    await queryViaApi(token, sql);
    await markMigrationApplied(token, file);
    console.log(`  OK ${file}`);
    count++;
  }
  return count;
}

function buildDbUrls(dbPassword) {
  const enc = encodeURIComponent(dbPassword);
  return [
    `postgresql://postgres:${enc}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  ];
}

async function connectPg(dbPassword) {
  let lastErr;
  for (const dbUrl of buildDbUrls(dbPassword)) {
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

async function applyMigrations(dbPassword) {
  const migrationsDir = resolve(ROOT, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await connectPg(dbPassword);

  await client.query(`
    create table if not exists public._supermastro_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const applied = await client.query("select filename from public._supermastro_migrations");
  const done = new Set(applied.rows.map((r) => r.filename));

  let count = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`  skip ${file} (già applicata)`);
      continue;
    }
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    console.log(`  applying ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public._supermastro_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`  OK ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file}: ${err.message}`);
    }
  }

  await client.end();
  return count;
}

function mergeRedirectAllowList(current) {
  const existing = (current || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set(existing);
  for (const url of SUPERMASTRO_REDIRECTS) set.add(url);
  return [...set].join(",");
}

async function configureAuth(token) {
  const current = await mgmt("GET", `/projects/${PROJECT_REF}/config/auth`, token);
  const uri_allow_list = mergeRedirectAllowList(current.uri_allow_list);
  const patch = { uri_allow_list };

  if (!current.site_url) {
    patch.site_url = "https://www.anchecasa.it";
  }

  await mgmt("PATCH", `/projects/${PROJECT_REF}/config/auth`, token, patch);
  return uri_allow_list.split(",").length;
}

async function deployFunctions(token) {
  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: token };
  const fns = ["diagnose-request", "process-notifications"];
  for (const fn of fns) {
    console.log(`→ Deploy function ${fn}`);
    try {
      execSync(
        `npx supabase functions deploy ${fn} --project-ref ${PROJECT_REF} --use-api`,
        { cwd: ROOT, stdio: "inherit", env },
      );
    } catch {
      throw new Error(`Deploy ${fn} fallito`);
    }
  }
}

async function main() {
  const fileEnv = loadEnvFile(ENV_PATH);
  const serviceKey = loadServiceRoleKey(fileEnv);
  const supabaseUrl =
    fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    `https://${PROJECT_REF}.supabase.co`;
  if (!supabaseUrl.includes(PROJECT_REF)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL non valido (${supabaseUrl}). Atteso project ref ${PROJECT_REF}.`,
    );
  }
  const dbPassword =
    process.env.SUPABASE_DB_PASSWORD ||
    fileEnv.SUPABASE_DB_PASSWORD ||
    loadEnvFile(SECRETS_PATH).SUPABASE_DB_PASSWORD ||
    "";
  const accessToken = getAccessToken(fileEnv);

  console.log(`→ Progetto Supabase: ${PROJECT_REF}`);

  if (!serviceKey) {
    throw new Error("Manca SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  }

  const schema = await checkSchema(serviceKey, supabaseUrl);
  console.log(schema.applied ? "→ Schema SuperMastro: presente" : "→ Schema SuperMastro: assente");

  if (accessToken) {
    console.log("→ Applicazione migrazioni (Management API)...");
    const n = await applyMigrationsViaApi(accessToken);
    console.log(`OK: ${n} migrazioni nuove applicate.`);
  } else if (dbPassword) {
    console.log("→ Applicazione migrazioni (connessione Postgres)...");
    const n = await applyMigrations(dbPassword);
    console.log(`OK: ${n} migrazioni nuove applicate.`);
  } else if (!schema.applied) {
    console.error("ERRORE: schema assente. Serve uno tra:");
    console.error("  - SUPABASE_ACCESS_TOKEN in web/.env.local (consigliato)");
    console.error("  - SUPABASE_DB_PASSWORD in web/.env.local");
    process.exit(1);
  } else {
    console.log("→ Migrazioni: skip (nessuna credenziale DB/token)");
  }

  if (accessToken) {
    console.log("→ Configurazione Auth redirect SuperMastro...");
    const total = await configureAuth(accessToken);
    console.log(`OK: uri_allow_list aggiornata (${total} URL totali).`);

    console.log("→ Deploy Edge Functions...");
    await deployFunctions(accessToken);
    console.log("OK: Edge Functions deployate.");
  } else {
    console.log("→ Auth + Functions: skip (SUPABASE_ACCESS_TOKEN non trovato)");
    console.log("  Crea token su https://supabase.com/dashboard/account/tokens");
    console.log("  poi: $env:SUPABASE_ACCESS_TOKEN='sbp_...'; npm run configure:supabase");
  }

  console.log("\nConfigurazione Supabase completata.");
}

main().catch((err) => {
  console.error("ERRORE:", err.message || err);
  process.exit(1);
});
