#!/usr/bin/env node
/** Avvia un workflow GitHub Actions (workflow_dispatch). */
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

async function main() {
  const cfg = loadDeployConfig();
  const repo = cfg.github.repo;
  if (!repo) throw new Error("Repo non configurato in .deploy/project.json");

  const workflowArg = process.argv[2];
  const WORKFLOW =
    workflowArg === "setup"
      ? cfg.workflows.setup
      : workflowArg === "deploy"
        ? cfg.workflows.deploy
        : workflowArg || cfg.workflows.setup;
  const deployWorker = process.argv.includes("--worker");
  const REF =
    process.argv.find((arg, i) => i >= 3 && !arg.startsWith("-")) ||
    cfg.github.branch ||
    "main";

  const body = { ref: REF };
  if (deployWorker && WORKFLOW === cfg.workflows.deploy) {
    body.inputs = {
      deploy_worker: "true",
      run_migrations: "false",
      deploy_all_functions: "false",
    };
  }

  const pat = getGitHubPat();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(pat), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`dispatch ${WORKFLOW} → ${res.status}: ${text}`);
  }
  console.log(`OK: workflow ${WORKFLOW} avviato su ${REF}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
