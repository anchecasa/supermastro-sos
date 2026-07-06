/**
 * F5 — RLS audit: verifica rowsecurity su tabelle SuperMastro
 */
import { connectPg } from "./supabase-env.mjs";

const DENY_ALL_TABLES = new Set([
  "contact_vault",
  "notification_outbox",
  "platform_settings",
  "sms_delivery_log",
  "stripe_events",
  "billing_reconciliation_log",
  "supermastro_admin_audit_log",
]);

const SUPERMASTRO_TABLES = new Set([
  "profiles",
  "admin_users",
  "skills",
  "workers",
  "worker_skills",
  "pilot_zones",
  "worker_locations",
  "contact_vault",
  "consent_records",
  "billing_accounts",
  "credit_ledger",
  "stripe_events",
  "service_requests",
  "request_diagnoses",
  "request_media",
  "request_invitations",
  "matches",
  "contact_reveals",
  "notification_outbox",
  "supermastro_admin_audit_log",
  "platform_settings",
  "sms_delivery_log",
  "disputes",
  "billing_reconciliation_log",
]);

const client = await connectPg();

const { rows } = await client.query(`
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    (select count(*) from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as policy_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname
`);

let failed = 0;
console.log("\n=== RLS audit (SuperMastro) ===\n");

for (const row of rows) {
  if (!SUPERMASTRO_TABLES.has(row.table_name)) continue;

  const denyAll =
    DENY_ALL_TABLES.has(row.table_name) &&
    row.rls_enabled &&
    Number(row.policy_count) === 0;
  const ok = denyAll || (row.rls_enabled && Number(row.policy_count) > 0);

  const suffix = denyAll ? " (deny-all)" : "";
  console.log(`${ok ? "✓" : "✗"} ${row.table_name}: RLS=${row.rls_enabled} policies=${row.policy_count}${suffix}`);
  if (!ok) failed++;
}

await client.end();
console.log(failed ? `\n${failed} problemi RLS` : "\nOK: RLS SuperMastro");
process.exit(failed ? 1 : 0);
