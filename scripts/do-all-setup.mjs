#!/usr/bin/env node
/**
 * Setup end-to-end: login Supabase (se serve) → configure → seed opzionale.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, "web", ".env.local");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const map = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return map;
}

function findAccessToken() {
  const env = loadEnv(ENV_PATH);
  if (env.SUPABASE_ACCESS_TOKEN?.startsWith("sbp_")) return env.SUPABASE_ACCESS_TOKEN;
  if (process.env.SUPABASE_ACCESS_TOKEN?.startsWith("sbp_")) return process.env.SUPABASE_ACCESS_TOKEN;

  const home = process.env.USERPROFILE || "";
  for (const p of [
    resolve(home, ".supabase", "access-token"),
    resolve(process.env.APPDATA || "", "supabase", "access-token"),
  ]) {
    if (!existsSync(p)) continue;
    const t = readFileSync(p, "utf8").trim();
    if (t.startsWith("sbp_")) return t;
  }

  if (process.platform === "win32") {
    const ps = `
      try {
        Import-Module CredentialManager -ErrorAction Stop
        $c = Get-StoredCredential -Target "Supabase CLI:supabase" -ErrorAction Stop
        if ($c.Password) {
          $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($c.Password)
          $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
          [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
          if ($plain -match '^sbp_') { Write-Output $plain }
        }
      } catch { exit 1 }
    `;
    const res = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const t = (res.stdout || "").trim();
    if (t.startsWith("sbp_")) return t;
  }
  return "";
}

function persistAccessToken(token) {
  if (!token || !existsSync(ENV_PATH)) return;
  let content = readFileSync(ENV_PATH, "utf8");
  if (/^\s*SUPABASE_ACCESS_TOKEN=/m.test(content)) {
    content = content.replace(/^\s*SUPABASE_ACCESS_TOKEN=.*$/m, `SUPABASE_ACCESS_TOKEN=${token}`);
  } else {
    content += `\nSUPABASE_ACCESS_TOKEN=${token}\n`;
  }
  writeFileSync(ENV_PATH, content, "utf8");
  console.log("→ Token salvato in web/.env.local");
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: opts.inherit ? "inherit" : "pipe",
    encoding: "utf8",
    env: { ...process.env, ...opts.env },
  });
  if (res.status !== 0) {
    throw new Error(
      opts.label || `${cmd} ${args.join(" ")}` + (res.stderr ? `: ${res.stderr}` : ""),
    );
  }
  return res;
}

async function main() {
  console.log("=== SuperMastro — setup completo ===\n");

  let token = findAccessToken();
  if (!token) {
    console.log("→ Login Supabase (si apre il browser)...");
    console.log("  Autorizza l'accesso, poi lo script continua.\n");
    run("npx", ["supabase", "login"], { inherit: true });
    token = findAccessToken();
  }

  if (token) {
    persistAccessToken(token);
    process.env.SUPABASE_ACCESS_TOKEN = token;
  } else {
    console.error("Login Supabase non completato — impossibile configurare il progetto remoto.");
    process.exit(1);
  }

  console.log("\n→ Configurazione Supabase remoto...");
  run("npm", ["run", "configure:supabase"], { inherit: true });

  console.log("\n=== Setup completato ===");
}

main().catch((err) => {
  console.error("ERRORE:", err.message || err);
  process.exit(1);
});
