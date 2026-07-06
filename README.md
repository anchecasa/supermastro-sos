# AncheCasa SOS — SuperMastro Pilota

Monorepo documentazione + app web pilota.

| Path | Contenuto |
|------|-----------|
| `docs/` | Product spec, threat model, sprint, Gantt |
| `web/` | Next.js app (Supabase SSR) |
| `supabase/migrations/` | Schema PostgreSQL + PostGIS |
| `SPRINT-1-DETTAGLIATO-v1.md` | Backlog Sprint 1 |

## Quick start

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

Applica migrazione Supabase (vedi `web/README.md`).

**URL locali:** `/supermastro` · `/artigiano`
