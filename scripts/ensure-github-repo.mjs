#!/usr/bin/env node
/**
 * Crea il repo GitHub se mancante e collega i secret org (se presenti).
 */
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

async function ghApi(pat, path, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      ...ghHeaders(pat),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const cfg = loadDeployConfig();
  const pat = getGitHubPat();
  const repo = cfg.github.repo;
  if (!repo) throw new Error("Repo non configurato in .deploy/project.json");

  const [owner, name] = repo.split("/");
  console.log(`→ Verifica repo ${repo}...`);

  const existing = await ghApi(pat, `/repos/${repo}`);
  if (existing.ok) {
    console.log("   Repo già presente.");
  } else if (existing.status === 404) {
    console.log("   Repo assente — creazione...");
    const create = await ghApi(pat, `/orgs/${owner}/repos`, {
      method: "POST",
      body: {
        name,
        private: true,
        description: "SuperMastro SOS — Next.js on Cloudflare Workers",
        auto_init: false,
      },
    });
    if (!create.ok) {
      const userCreate = await ghApi(pat, "/user/repos", {
        method: "POST",
        body: { name, private: true, description: "SuperMastro SOS" },
      });
      if (!userCreate.ok) {
        throw new Error(`Creazione repo fallita: ${JSON.stringify(create.json)} / ${JSON.stringify(userCreate.json)}`);
      }
      console.log(`   Creato sotto account utente: ${userCreate.json.full_name}`);
    } else {
      console.log("   Creato sotto org anchecasa.");
    }
  } else {
    throw new Error(`GET /repos/${repo} → ${existing.status}: ${JSON.stringify(existing.json)}`);
  }

  const repoInfo = await ghApi(pat, `/repos/${repo}`);
  if (!repoInfo.ok) throw new Error("Impossibile leggere repo dopo creazione");
  const repoId = repoInfo.json.id;

  const orgSecrets = [
    "CLOUDFLARE_API_TOKEN",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
  ];

  for (const secretName of orgSecrets) {
    const sel = await ghApi(pat, `/orgs/${owner}/actions/secrets/${secretName}/repositories`);
    if (!sel.ok) continue;

    const selected = sel.json.repositories || [];
    const already = selected.some((r) => r.id === repoId);
    if (already) {
      console.log(`   Secret org ${secretName}: già collegato`);
      continue;
    }

    const patch = await ghApi(pat, `/orgs/${owner}/actions/secrets/${secretName}/repositories`, {
      method: "PUT",
      body: {
        selected_repository_ids: [...selected.map((r) => r.id), repoId],
      },
    });
    if (patch.ok) {
      console.log(`   Secret org ${secretName}: collegato al repo`);
    }
  }

  console.log("OK: repo pronto per push e deploy CI.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
