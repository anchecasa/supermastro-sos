/**
 * Stress test HTTP — route smoke + concurrency
 * Usage: node scripts/stress-routes.mjs [baseUrl] [rounds]
 */
const base = process.argv[2] || process.env.APP_URL || "http://localhost:3000";
const rounds = Number(process.argv[3] || 5);

const routes = [
  { path: "/", expect: [307, 308] },
  { path: "/sos", expect: [301, 308] },
  { path: "/supermastro", expect: [200] },
  { path: "/supermastro/auth/login", expect: [200] },
  { path: "/supermastro/auth/login?next=/supermastro/nuova", expect: [200] },
  { path: "/supermastro/nuova", expect: [307, 308] },
  { path: "/supermastro/privacy", expect: [200] },
  { path: "/supermastro/termini", expect: [200] },
  { path: "/supermastro/cookie", expect: [200] },
  { path: "/artigiano", expect: [200] },
  { path: "/artigiano/iscrizione", expect: [307, 308] },
  { path: "/artigiano/auth/login", expect: [200] },
  { path: "/artigiano/onboarding", expect: [307, 308] },
  { path: "/artigiano/inviti", expect: [307, 308] },
  { path: "/artigiano/privacy", expect: [200] },
  { path: "/admin/monitor", expect: [200, 307, 308, 401, 403] },
  { path: "/api/stripe/webhook", method: "POST", body: "{}", expect: [400, 405] },
];

async function hit(route, round) {
  const url = `${base}${route.path}`;
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: route.method || "GET",
      redirect: "manual",
      headers: route.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: route.body,
    });
    const ms = Math.round(performance.now() - started);
    const ok = route.expect.includes(res.status);
    return { url, status: res.status, ms, ok, round };
  } catch (err) {
    return { url, status: 0, ms: 0, ok: false, round, error: err.message };
  }
}

console.log(`\n=== Stress routes @ ${base} (${rounds} round × ${routes.length} route) ===\n`);

let failed = 0;
const latencies = [];

for (let round = 1; round <= rounds; round++) {
  const batch = routes.flatMap((route) =>
    Array.from({ length: 1 }, () => hit(route, round))
  );
  const results = await Promise.all(batch);

  for (const r of results) {
    latencies.push(r.ms);
    if (!r.ok) {
      failed++;
      console.log(`✗ [R${r.round}] ${r.url} → ${r.status || r.error}`);
    }
  }
}

const p50 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)] ?? 0;
const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] ?? 0;
const max = Math.max(...latencies, 0);
const total = routes.length * rounds;

console.log(`\nRichieste: ${total} | Fallite: ${failed}`);
console.log(`Latenza ms — p50: ${p50} | p95: ${p95} | max: ${max}`);

if (failed === 0) {
  console.log("\n✅ Stress route OK");
} else {
  console.log(`\n❌ ${failed} richieste fuori aspettativa`);
}

process.exit(failed > 0 ? 1 : 0);
