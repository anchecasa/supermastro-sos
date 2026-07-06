/**
 * E4 — Seed 20 artigiani fake staging (geo distribuita Roma pilota)
 * Usage: npm run seed:staging
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const env = { ...loadEnvFile(envPath), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SKILLS = ["idraulico", "elettricista", "fabbro"];
const ROMA_POINTS = [
  [12.45, 41.9], [12.48, 41.91], [12.51, 41.89], [12.54, 41.92],
  [12.42, 41.88], [12.47, 41.87], [12.5, 41.93], [12.53, 41.86],
  [12.44, 41.94], [12.49, 41.85], [12.52, 41.91], [12.46, 41.92],
  [12.55, 41.9], [12.43, 41.91], [12.5, 41.88], [12.48, 41.93],
  [12.41, 41.89], [12.56, 41.91], [12.47, 41.94], [12.52, 41.87],
];

const { data: skillRows } = await admin.from("skills").select("id, slug");
const skillBySlug = new Map(skillRows?.map((s) => [s.slug, s.id]) ?? []);

let ready = 0;

for (let i = 1; i <= 20; i++) {
  const email = `mastro-staging-${String(i).padStart(2, "0")}@staging.anchecasa.it`;
  const [lng, lat] = ROMA_POINTS[i - 1];
  const skillSlug = SKILLS[i % SKILLS.length];
  const phone = `+39320${String(1000000 + i).slice(-7)}`;

  let userId;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: "worker", display_name: `Mastro Staging ${i}` },
  });

  if (createErr) {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = listed?.users?.find((u) => u.email === email)?.id;
    if (!userId) {
      console.error(`Skip ${email}:`, createErr.message);
      continue;
    }
  } else {
    userId = created.user.id;
  }

  let { data: worker } = await admin.from("workers").select("id").eq("user_id", userId).maybeSingle();

  if (!worker) {
    const { data: wRow, error: wErr } = await admin
      .from("workers")
      .insert({
        user_id: userId,
        status: "active",
        bio: `Artigiano staging ${i} per test matching.`,
        cap: "00100",
        service_radius_km: 20,
        tier: 1 + (i % 3),
      })
      .select("id")
      .single();
    if (wErr) {
      console.error(`Worker ${email}:`, wErr.message);
      continue;
    }
    worker = wRow;
  } else {
    await admin.from("workers").update({ status: "active" }).eq("id", worker.id);
  }

  const skillId = skillBySlug.get(skillSlug);
  if (skillId) {
    await admin.from("worker_skills").upsert(
      { worker_id: worker.id, skill_id: skillId },
      { onConflict: "worker_id,skill_id" }
    );
  }

  await admin.from("contact_vault").upsert(
    { owner_type: "worker", owner_id: worker.id, phone, email },
    { onConflict: "owner_type,owner_id" }
  );

  await admin.rpc("admin_set_worker_location", {
    p_worker_id: worker.id,
    p_lng: lng,
    p_lat: lat,
  });

  await admin.rpc("grant_trial_credits", {
    p_worker_id: worker.id,
    p_reference: `staging-seed-${i}`,
  });

  ready++;
  console.log(`✓ ${email} · ${skillSlug} · ${lng},${lat}`);
}

console.log(`\nSeed completato: ${ready}/20 mastri active con crediti.`);
