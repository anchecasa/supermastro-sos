#!/usr/bin/env bash
# Deploy Edge Functions SuperMastro su Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-edsvmnxojsmknjuhobqa}"
DEPLOY_ALL="${DEPLOY_ALL_FUNCTIONS:-0}"
BASE_SHA="${DEPLOY_BASE_SHA:-}"
HEAD_SHA="${DEPLOY_HEAD_SHA:-HEAD}"

deploy_one() {
  local fn="$1"
  echo "→ Deploy $fn"
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --use-api
}

collect_changed_functions() {
  local base="$1"
  local head="$2"
  if [[ -z "$base" || "$base" == "0000000000000000000000000000000000000000" ]]; then
    echo "__DEPLOY_ALL__"
    return
  fi
  if git diff --name-only "$base" "$head" | grep -qE '^(supabase/functions/_shared/|scripts/deploy-supabase-functions\.sh|\.github/workflows/deploy\.yml)'; then
    echo "__DEPLOY_ALL__"
    return
  fi
  git diff --name-only "$base" "$head" \
    | grep '^supabase/functions/' \
    | cut -d/ -f3 \
    | grep -v '^_shared$' \
    | sort -u || true
}

if [[ "$DEPLOY_ALL" == "1" ]]; then
  echo "Deploy di tutte le Edge Functions..."
  for dir in supabase/functions/*/; do
    fn="$(basename "$dir")"
    [[ "$fn" == "_shared" ]] && continue
    [[ -f "$dir/index.ts" ]] || continue
    deploy_one "$fn"
  done
  echo "OK: tutte le funzioni deployate."
  exit 0
fi

mapfile -t CHANGED < <(collect_changed_functions "$BASE_SHA" "$HEAD_SHA")

if [[ "${CHANGED[0]:-}" == "__DEPLOY_ALL__" ]]; then
  for dir in supabase/functions/*/; do
    fn="$(basename "$dir")"
    [[ "$fn" == "_shared" ]] && continue
    [[ -f "$dir/index.ts" ]] || continue
    deploy_one "$fn"
  done
  echo "OK: tutte le funzioni deployate."
  exit 0
fi

if [[ ${#CHANGED[@]} -eq 0 ]]; then
  echo "Nessuna Edge Function modificata — skip deploy."
  exit 0
fi

echo "Deploy funzioni modificate: ${CHANGED[*]}"
for fn in "${CHANGED[@]}"; do
  [[ -f "supabase/functions/$fn/index.ts" ]] || continue
  deploy_one "$fn"
done

echo "OK: ${#CHANGED[@]} funzione/i deployate."
