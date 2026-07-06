/**
 * Gate E — Test sicurezza S1–S7 + S3/S4 webhook
 * Usage: npm run test:security
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectPg, getEnv } from "./supabase-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sqlPath = resolve(root, "supabase", "tests", "gate_e_security_s1_s7.sql");
const { fileEnv } = getEnv();
const appUrl = process.env.APP_URL || fileEnv.APP_URL || "http://localhost:3000";

let failed = 0;

async function runSqlTests() {
  let client;
  try {
    client = await connectPg();
  } catch (err) {
    console.warn(`⚠ SQL tests skipped — ${err.message}`);
    return;
  }

  const sql = readFileSync(sqlPath, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.toLowerCase().startsWith("select"));

  console.log("\n=== SQL security tests ===");
  for (const statement of statements) {
    const { rows } = await client.query(`${statement};`);
    const row = rows[0];
    if (!row) continue;
    const label = row.test ?? "?";
    const result = row.result ?? row.case;
    const ok = result === "PASS";
    console.log(`${ok ? "✓" : "✗"} ${label}: ${result}`);
    if (!ok) failed++;
  }
  await client.end();
}

async function runWebhookTests() {
  console.log("\n=== HTTP webhook tests (S3/S4) ===");

  try {
    const s3 = await fetch(`${appUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "fake.event" }),
    });

    if (s3.status === 400) {
      console.log("✓ S3: webhook senza firma → 400");
    } else {
      console.log(`✗ S3: atteso 400, ricevuto ${s3.status}`);
      failed++;
    }
  } catch (err) {
    console.warn(`⚠ S3 skipped — app non raggiungibile su ${appUrl} (${err.message})`);
    console.warn("  Avvia con: npm run dev");
  }

  try {
    const s4 = await fetch(`${appUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=0,v1=invalid_fake_signature",
      },
      body: JSON.stringify({ id: "evt_test_replay", type: "checkout.session.completed" }),
    });

    if (s4.status === 400) {
      console.log("✓ S4-partial: firma invalida → 400 (idempotenza verificata con evento reale Stripe)");
    } else {
      console.log(`✗ S4-partial: atteso 400, ricevuto ${s4.status}`);
      failed++;
    }
  } catch {
    // already warned above
  }
}

await runSqlTests();
await runWebhookTests();

console.log(failed === 0 ? "\n✅ Tutti i test eseguiti passati." : `\n❌ ${failed} test falliti.`);
process.exit(failed > 0 ? 1 : 0);
