#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadEnv(resolve(__dirname, "..", "web", ".env.local"));
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;

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

if (!token) {
  console.error("Manca SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const res = await fetch("https://api.supabase.com/v1/projects/edsvmnxojsmknjuhobqa/config/auth", {
  headers: { Authorization: `Bearer ${token}` },
});
const j = await res.json();
console.log("site_url:", j.site_url);
console.log("magic_link uses RedirectTo:", (j.mailer_templates_magic_link_content || "").includes("RedirectTo"));
console.log("magic_link preview:", (j.mailer_templates_magic_link_content || "MISSING").slice(0, 280));
