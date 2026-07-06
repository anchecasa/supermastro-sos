#!/usr/bin/env node
/** Config deploy condivisa: .deploy/project.json + git remote. */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = resolve(ROOT, ".deploy/project.json");

function git(args) {
  const res = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (res.status !== 0) return null;
  return (res.stdout || "").trim() || null;
}

function repoFromRemote() {
  const url = git(["remote", "get-url", "origin"]);
  if (!url) return null;
  const m =
    url.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i) ||
    url.match(/github\.com[:/]([^/]+\/[^/]+)/i);
  return m?.[1] || null;
}

export function loadDeployConfig() {
  let config = {};
  if (existsSync(CONFIG_PATH)) {
    config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  }

  const repo = config.github?.repo || repoFromRemote();
  const branch = config.github?.branch || git(["rev-parse", "--abbrev-ref", "HEAD"]) || "main";

  return {
    root: ROOT,
    configPath: CONFIG_PATH,
    name: config.name || repo?.split("/")[1] || "project",
    github: {
      repo: repo || null,
      branch,
    },
    cloudflare: {
      accountId: config.cloudflare?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || null,
      workerName: config.cloudflare?.workerName || process.env.CLOUDFLARE_WORKER_NAME || null,
      siteUrl: config.cloudflare?.siteUrl || config.urls?.canonical || null,
      stagingUrl: config.cloudflare?.stagingUrl || null,
    },
    supabase: {
      projectRef: config.supabase?.projectRef || process.env.SUPABASE_PROJECT_REF || null,
      url: config.supabase?.url || null,
    },
    workflows: {
      deploy: config.workflows?.deploy || "deploy.yml",
      setup: config.workflows?.setup || "setup-integrazioni.yml",
    },
  };
}

export function getGitHubPat() {
  const input = "protocol=https\nhost=github.com\n\n";
  const res = spawnSync("git", ["credential", "fill"], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (res.status !== 0) throw new Error("git credential fill fallito — accedi a GitHub (GitHub Desktop o git login)");
  const pw = res.stdout.match(/^password=(.+)$/m);
  if (!pw?.[1]) throw new Error("Nessun PAT da git credential");
  return pw[1].trim();
}

export function ghHeaders(pat) {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = loadDeployConfig();
  console.log(JSON.stringify(cfg, null, 2));
  if (!cfg.github.repo) {
    console.error("ERRORE: repo GitHub non trovato. Crea .deploy/project.json o configura git remote origin.");
    process.exit(1);
  }
}
