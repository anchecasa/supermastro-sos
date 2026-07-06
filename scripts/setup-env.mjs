/**
 * Genera web/.env.local dal progetto AncheCasa collegato (edsvmnxojsmknjuhobqa).
 * Legge chiavi da ../anchecasa-pulita-2026/.env e .env.e2e.local (non committare).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const siblingEnv = resolve(root, "..", "anchecasa-pulita-2026", ".env");
const siblingE2e = resolve(root, "..", "anchecasa-pulita-2026", ".env.e2e.local");
const target = resolve(root, "web", ".env.local");
const devVarsTarget = resolve(root, "web", ".dev.vars");

function parseEnv(path) {
  const map = {};
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return map;
}

const env = parseEnv(siblingEnv);
const e2e = parseEnv(siblingE2e);

const url = env.VITE_SUPABASE_URL || "https://edsvmnxojsmknjuhobqa.supabase.co";
const publishable =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceRole =
  e2e.E2E_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!publishable) {
  console.error("Manca VITE_SUPABASE_PUBLISHABLE_KEY in anchecasa-pulita-2026/.env");
  process.exit(1);
}

const lines = [
  "# Generato da scripts/setup-env.mjs — non committare",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${publishable}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000`,
  "",
];

if (serviceRole) {
  lines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`);
} else {
  lines.push("# SUPABASE_SERVICE_ROLE_KEY=  # da .env.e2e.local");
}

lines.push(
  "# Admin pilota (virgola separata)",
  "ADMIN_EMAILS=anchecasa@anchecasa.it,amministrazione@anchecasa.it",
  "",
  "# Stripe test mode — https://dashboard.stripe.com/test/apikeys",
  "STRIPE_SECRET_KEY=",
  "STRIPE_WEBHOOK_SECRET=",
  "STRIPE_TRIAL_PRICE_ID=",
  "STRIPE_PAID_PRICE_ID=",
  "",
  "# Admin MFA (prod: true)",
  "ADMIN_REQUIRE_MFA=false",
  "",
  "# Cron + SMS + Sentry — vedi web/.env.example",
  "CRON_SECRET=",
  ""
);

if (process.env.SUPABASE_DB_PASSWORD) {
  lines.push(`SUPABASE_DB_PASSWORD=${process.env.SUPABASE_DB_PASSWORD}`);
}

const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (cloudflareToken) {
  lines.push("", "# Cloudflare Workers deploy (wrangler / npm run deploy)", `CLOUDFLARE_API_TOKEN=${cloudflareToken}`);
  lines.push("CLOUDFLARE_ACCOUNT_ID=ce7125d817d6c6ecd8c765b60ac4e0d0");
}

writeFileSync(target, lines.join("\n"), "utf8");
console.log(`OK: scritto ${target}`);

const devVarsLines = [
  "# Generato da scripts/setup-env.mjs — usato da wrangler preview/deploy",
  "NEXTJS_ENV=development",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${publishable}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
  "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
];

if (serviceRole) {
  devVarsLines.push(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`);
}

if (cloudflareToken) {
  devVarsLines.push(`CLOUDFLARE_API_TOKEN=${cloudflareToken}`);
  devVarsLines.push("CLOUDFLARE_ACCOUNT_ID=ce7125d817d6c6ecd8c765b60ac4e0d0");
}

writeFileSync(devVarsTarget, `${devVarsLines.join("\n")}\n`, "utf8");
console.log(`OK: scritto ${devVarsTarget}`);
