#!/usr/bin/env node
/** Aggiorna solo i template email Supabase Auth (logo SuperMastro). */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUPABASE_EMPLOYER_CONFIRMATION_TEMPLATE,
  SUPABASE_EMPLOYER_CONFIRMATION_SUBJECT,
  SUPABASE_MAGIC_LINK_TEMPLATE,
  SUPABASE_MAGIC_LINK_SUBJECT,
} from "./email-templates.mjs";

const PROJECT_REF = "edsvmnxojsmknjuhobqa";
const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "web", ".env.local");

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.startsWith("sbp_")) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }
  if (!existsSync(ENV_PATH)) return "";
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*SUPABASE_ACCESS_TOKEN=(.*)$/);
    if (m?.[1]?.startsWith("sbp_")) return m[1].trim();
  }
  return "";
}

async function main() {
  const token = loadToken();
  if (!token) throw new Error("Manca SUPABASE_ACCESS_TOKEN");

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mailer_subjects_magic_link: SUPABASE_EMPLOYER_CONFIRMATION_SUBJECT,
      mailer_templates_magic_link_content: SUPABASE_EMPLOYER_CONFIRMATION_TEMPLATE,
      mailer_subjects_confirmation: SUPABASE_MAGIC_LINK_SUBJECT,
      mailer_templates_confirmation_content: SUPABASE_MAGIC_LINK_TEMPLATE,
    }),
  });

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  console.log("OK: template email Supabase aggiornati (logo SuperMastro)");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
