# Deploy automatico — SuperMastro SOS

Stack: **Next.js 16** su **Cloudflare Workers** (`@opennextjs/cloudflare`) + **Supabase** EU condiviso.

## Prerequisiti

1. Repository GitHub: `anchecasa/supermastro-sos` (branch `main`)
2. Secret GitHub Actions configurati (vedi tabella sotto)
3. Password DB Supabase in `web/.env.local` per deploy locale: `SUPABASE_DB_PASSWORD=...`

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `npm run db:push` | Migrazioni SQL su Supabase remoto (locale) |
| `npm run build` | Build Next.js |
| `npm run deploy` | Build OpenNext + deploy Worker (richiede `wrangler login` o `CLOUDFLARE_API_TOKEN`) |
| `npm run sync:secrets` | Carica secret su GitHub (richiede `CLOUDFLARE_API_TOKEN` in env) |
| `node scripts/aggiorna.mjs` | Commit + push + attende CI |
| `node scripts/trigger-github-workflow.mjs setup` | Primo setup completo (migrazioni + functions + secrets + deploy) |

## Secret GitHub Actions

| Secret | Obbligatorio | Uso |
|--------|:------------:|-----|
| `CLOUDFLARE_API_TOKEN` | Sì | Deploy Worker — serve permesso **Account → Workers Scripts → Edit** (non basta Pages Edit) |
| `SUPABASE_ACCESS_TOKEN` | Sì | Migrazioni + Edge Functions |
| `SUPABASE_DB_PASSWORD` | Sì | `supabase db push` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sì | Build frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Sì | Runtime Worker (secret) |
| `ADMIN_EMAILS` | Sì | Runtime Worker |
| `STRIPE_SECRET_KEY` | Prod | Billing |
| `STRIPE_WEBHOOK_SECRET` | Prod | Webhook |
| `STRIPE_TRIAL_PRICE_ID` | Prod | Checkout trial |
| `STRIPE_PAID_PRICE_ID` | Prod | Checkout pacchetto |
| `CRON_SECRET` | Prod | Cron `/api/cron/*` |
| `TWILIO_*` | Opzionale | SMS fallback |

## Variabili GitHub (Repository variables)

| Variabile | Default | Uso |
|-----------|---------|-----|
| `NEXT_PUBLIC_SITE_URL` | `https://anchecasa.it` | Build |
| `ADMIN_REQUIRE_MFA` | `true` | Produzione admin |

## Configurazione Supabase (automatica)

```powershell
# 1. Aggiungi in web/.env.local (token da https://supabase.com/dashboard/account/tokens):
#    SUPABASE_ACCESS_TOKEN=sbp_...

npm run configure:supabase
```

Lo script esegue in sequenza:
- verifica schema (`workers` table)
- applica le 7 migrazioni in `supabase/migrations/` (via Management API o password DB)
- aggiunge redirect Auth per `/supermastro` e `/artigiano` (localhost + anchecasa.it + workers.dev)
- deploy Edge Functions `diagnose-request` e `process-notifications`

Alternativa senza access token: imposta `SUPABASE_DB_PASSWORD` e riesegui (solo migrazioni via Postgres).


1. Crea repo `anchecasa/supermastro-sos` su GitHub
2. Aggiungi i secret sopra (copia da progetto AncheCasa dove possibile)
3. Push su `main`:
   ```powershell
   git init
   git remote add origin https://github.com/anchecasa/supermastro-sos.git
   git add -A
   git commit -m "chore: bootstrap deploy SuperMastro"
   git push -u origin main
   ```
4. Avvia setup completo:
   ```powershell
   node scripts/trigger-github-workflow.mjs setup-integrazioni.yml
   ```
5. Configura route produzione su Cloudflare (Workers → supermastro-sos → Triggers):
   - `anchecasa.it/supermastro*`
   - `anchecasa.it/sos*`
   - `anchecasa.it/artigiano*`
   - `anchecasa.it/admin*`

## Staging

URL Worker: `https://supermastro-sos.<account>.workers.dev`

Dopo deploy, esegui smoke test:
```powershell
$env:NEXT_PUBLIC_SITE_URL="https://supermastro-sos.<account>.workers.dev"
npm run smoke:staging
```

## Rollback

Vedi `docs/DEPLOY-ROLLBACK-v1.md`.
