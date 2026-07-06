#!/usr/bin/env node
/** Scarica log sintetico dell'ultimo run fallito (o run id passato come argv[2]). */
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const runId = process.argv[2];

async function gh(pat, repo, path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: ghHeaders(pat),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const cfg = loadDeployConfig();
  const repo = cfg.github.repo;
  if (!repo) throw new Error("Repo non configurato in .deploy/project.json");

  const pat = getGitHubPat();
  let id = runId;
  if (!id) {
    const runs = await gh(pat, repo, `/repos/${repo}/actions/runs?per_page=10`);
    const failed = (runs.workflow_runs || []).find((r) => r.conclusion === "failure");
    if (!failed) {
      console.log("Nessun run fallito recente.");
      return;
    }
    id = failed.id;
    console.log(`Run: ${failed.name} ${failed.html_url}`);
  }

  const jobs = await gh(pat, repo, `/repos/${repo}/actions/runs/${id}/jobs`);
  for (const job of jobs.jobs || []) {
    console.log(`\nJob: ${job.name} (${job.conclusion})`);
    for (const step of job.steps || []) {
      if (step.conclusion === "failure") console.log(`  FAIL step: ${step.name}`);
    }
    if (job.conclusion !== "failure") continue;
    const logRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/jobs/${job.id}/logs`,
      { headers: { Authorization: `Bearer ${pat}` } },
    );
    const log = await logRes.text();
    const interesting = log
      .split(/\r?\n/)
      .filter((l) =>
        /error|Error|failed|PATCH|curl:|OK:|mancante|::error|secret|403|401|10000/i.test(l),
      )
      .slice(-40);
    console.log(interesting.join("\n"));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
