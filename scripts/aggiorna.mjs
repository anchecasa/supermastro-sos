#!/usr/bin/env node
/**
 * Comando "aggiorna": commit (se serve) → push → attende CI → report.
 * Uso: node scripts/aggiorna.mjs [--message "testo commit"]
 */
import { spawnSync } from "node:child_process";
import { loadDeployConfig, getGitHubPat, ghHeaders } from "./deploy-config.mjs";

const COMMIT_MSG = process.argv.includes("--message")
  ? process.argv[process.argv.indexOf("--message") + 1]
  : "chore: aggiorna";

function git(args, opts = {}) {
  const res = spawnSync("git", args, {
    cwd: opts.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return res;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRun(pat, repo, sha) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs?head_sha=${sha}&per_page=5`,
    { headers: ghHeaders(pat) },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return (json.workflow_runs || []).find((r) => r.name?.includes("Deploy")) || json.workflow_runs?.[0];
}

async function fetchJobs(pat, repo, runId) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`,
    { headers: ghHeaders(pat) },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.jobs || [];
}

async function waitForRun(pat, repo, sha, maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const run = await fetchRun(pat, repo, sha);
    if (run && run.status === "completed") return run;
    process.stdout.write(".");
    await sleep(15000);
  }
  return await fetchRun(pat, repo, sha);
}

async function main() {
  const cfg = loadDeployConfig();
  const { repo, branch } = cfg.github;
  if (!repo) throw new Error("Repo GitHub non configurato. Crea .deploy/project.json");

  console.log(`→ Progetto: ${cfg.name}`);
  console.log(`→ Repo: ${repo} (${branch})`);

  const status = git(["status", "--porcelain"], { cwd: cfg.root });
  if (status.stdout.trim()) {
    console.log("→ Commit modifiche pendenti...");
    git(["add", "-A"], { cwd: cfg.root });
    const commit = git(["commit", "-m", COMMIT_MSG], { cwd: cfg.root });
    if (commit.status !== 0 && !commit.stderr?.includes("nothing to commit")) {
      throw new Error(commit.stderr || commit.stdout || "commit fallito");
    }
    console.log(`   ${COMMIT_MSG}`);
  } else {
    console.log("→ Nessuna modifica locale da committare");
  }

  console.log(`→ Push origin ${branch}...`);
  const push = git(["push", "origin", branch], { cwd: cfg.root });
  if (push.status !== 0) {
    throw new Error(push.stderr || push.stdout || "push fallito");
  }

  const head = git(["rev-parse", "HEAD"], { cwd: cfg.root }).stdout.trim();
  console.log(`→ Commit pushato: ${head.slice(0, 8)}`);
  console.log("→ Attendo workflow GitHub Actions (max 5 min)...");

  const pat = getGitHubPat();
  await sleep(8000);
  const run = await waitForRun(pat, repo, head);
  if (!run) {
    console.log("\n⚠ Workflow non trovato. Controlla GitHub Actions manualmente.");
    return;
  }

  console.log(`\n→ Workflow: ${run.name} — ${run.conclusion || run.status}`);
  console.log(`  ${run.html_url}`);

  const jobs = await fetchJobs(pat, repo, run.id);
  for (const job of jobs) {
    const icon = job.conclusion === "success" ? "✓" : job.conclusion === "skipped" ? "○" : job.conclusion === "failure" ? "✗" : "…";
    console.log(`  ${icon} ${job.name}: ${job.conclusion || job.status}`);
  }

  if (cfg.cloudflare.siteUrl) {
    console.log(`\n→ Sito: ${cfg.cloudflare.siteUrl}`);
  }

  if (run.conclusion === "failure") {
    console.log(`\nPer i log: node scripts/github-actions-logs.mjs ${run.id}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
