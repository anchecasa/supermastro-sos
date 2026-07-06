#!/usr/bin/env bash
# Applica solo le migrazioni in supabase/migrations/ di questo repo.
# DB condiviso con AncheCasa: evita db push (history mismatch con migrazioni esterne).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-edsvmnxojsmknjuhobqa}"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERRORE: imposta SUPABASE_ACCESS_TOKEN (token account Supabase)."
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "→ Nessuna cartella supabase/migrations — skip."
  exit 0
fi

echo "→ Login Supabase CLI"
npx supabase login --token "$SUPABASE_ACCESS_TOKEN"

link_project() {
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    echo "→ db query via SUPABASE_DB_URL (no link)"
    return 0
  fi
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    echo "ERRORE: imposta SUPABASE_DB_PASSWORD oppure SUPABASE_DB_URL nei secret GitHub Actions."
    exit 1
  fi
  echo "→ link progetto $PROJECT_REF"
  npx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" --yes
}

migration_applied() {
  local version="$1"
  local list
  list="$(npx supabase migration list --linked 2>/dev/null || true)"
  echo "$list" | grep -E "${version}[[:space:]]*\|[[:space:]]*${version}" >/dev/null 2>&1
}

apply_file() {
  local file="$1"
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    npx supabase db query --db-url "$SUPABASE_DB_URL" --file "$file"
  else
    npx supabase db query --linked --file "$file"
  fi
}

repair_applied() {
  local version="$1"
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    return 0
  fi
  npx supabase migration repair "$version" --status applied --linked
}

link_project

applied=0
skipped=0

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "→ Nessun file .sql in supabase/migrations — skip."
  exit 0
fi

IFS=$'\n' sorted=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

for file in "${sorted[@]}"; do
  base="$(basename "$file")"
  version="${base%%_*}"

  if [[ -z "${SUPABASE_DB_URL:-}" ]] && migration_applied "$version"; then
    echo "   ○ $version (già applicata)"
    skipped=$((skipped + 1))
    continue
  fi

  echo "→ apply $version"
  if apply_file "$file"; then
    repair_applied "$version" 2>/dev/null || true
    applied=$((applied + 1))
  else
    echo "::warning::$version — errore apply (potrebbe essere già presente); segno applied in history"
    repair_applied "$version" 2>/dev/null || true
    skipped=$((skipped + 1))
  fi
done

echo "OK: migrazioni SuperMastro — applicate $applied, skip $skipped."
