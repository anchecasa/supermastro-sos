#!/usr/bin/env bash
# Applica migrazioni Supabase su progetto remoto (CI o locale).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-edsvmnxojsmknjuhobqa}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERRORE: imposta SUPABASE_ACCESS_TOKEN (token account Supabase)."
  exit 1
fi

echo "→ Login Supabase CLI"
npx supabase login --token "$SUPABASE_ACCESS_TOKEN"

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "→ db push via SUPABASE_DB_URL"
  npx supabase db push --db-url "$SUPABASE_DB_URL" --include-all --yes
elif [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "→ link progetto $PROJECT_REF"
  npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" --yes
  echo "→ db push (linked)"
  npx supabase db push --linked --include-all --yes
else
  echo "ERRORE: imposta SUPABASE_DB_PASSWORD oppure SUPABASE_DB_URL nei secret GitHub Actions."
  exit 1
fi

echo "OK: migrazioni applicate."
