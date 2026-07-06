#!/usr/bin/env node
/** Stato ultimi workflow GitHub Actions. */
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

async function main() {
  const cfg = loadDeployConfig();
  const repo = cfg.github.repo;
  if (!repo) throw new Error("Repo non configurato in .deploy/project.json");

  const pat = getGitHubPat();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs?per_page=5`,
    { headers: ghHeaders(pat) },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  for (const run of json.workflow_runs || []) {
    console.log(
      `${run.status.padEnd(12)} ${(run.conclusion || "-").padEnd(12)} ${run.name} (${run.head_sha.slice(0, 8)}) ${run.html_url}`,
    );
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
