# Deploy & Rollback — SuperMastro (K6)

## Ambienti

| Ambiente | URL | Supabase | Note |
|----------|-----|----------|------|
| Staging | localhost / preview CF | edsvmnxojsmknjuhobqa | Seed + test |
| Produzione | anchecasa.it/supermastro | Progetto prod dedicato (F1) | Secrets separati |

## Deploy

1. `npm run db:push` — migrazioni su target DB
2. `npm run build` — verifica build Next.js
3. `npm run test:security` — S1–S7 + webhook
4. Deploy Cloudflare Pages / Vercel con env prod
5. Deploy Edge Functions Supabase (`diagnose-request`, `process-notifications`)
6. Attiva cron: `POST /api/cron/sms-fallback`, `/api/cron/nightly`, `/api/cron/trial-refund` con header `Authorization: Bearer $CRON_SECRET`

## Rollback applicazione

1. Revert commit su branch deploy e redeploy build precedente
2. Non rollback migrazioni DB destructive senza backup
3. Se bug P0 vault/RLS: `pilot_public=false` da `/admin/impostazioni` + pausa matching

## Rollback database

- Supabase Dashboard → Database → Backups (PITR se abilitato)
- Migrazioni additive only: rollback = deploy codice compatibile con schema precedente

## Checklist post-rollback

- [ ] `npm run test:security`
- [ ] Smoke login cliente + mastro
- [ ] Webhook Stripe delivery OK
- [ ] Admin monitor richieste visibile
