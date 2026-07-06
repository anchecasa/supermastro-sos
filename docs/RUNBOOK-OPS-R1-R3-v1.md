# Runbook Ops — SuperMastro Pilota (R1–R3)

**Versione:** 1.0 · Sprint 1 Blocco E  
**Owner:** Ops + Tech  
**Staging:** anchecasa.it/supermastro (non go-live pubblico)

---

## R1 — Nessuna accettazione entro 45 minuti

### Sintomi
- Richiesta SOS in stato `inviting` scaduta o prossima a scadere
- Cliente in attesa senza match
- 0 inviti `accepted` sulla richiesta

### Diagnosi (Admin Monitor)
1. Accedi a `/admin/monitor` con email admin (`ADMIN_EMAILS`)
2. Verifica richiesta: `pending_invites`, `expires_at`
3. Controlla log inviti: artigiani `rejected` / nessuna risposta

### Azione
1. **Seconda ondata** — da Admin Monitor, pulsante "Seconda ondata" sulla richiesta  
   → RPC `admin_redispatch_invitations` (max 10 nuovi mastri, esclusi già invitati)
2. Esegui `POST /api/notifications/process` per inviare push stub
3. Se ancora nessun match entro 15 min: contatto telefonico 3–5 mastri active in zona (lista da seed o dashboard)
4. Comunicazione cliente: copy `expired` da NAMING-COPY — invita a riprovare

### Escalation
- Pool mastri active < 30 in zona → attiva **R6** (pausa acquisizione clienti)

---

## R2 — Stripe webhook down

### Sintomi
- Artigiano pagato trial ma resta `verified` senza crediti
- Nessuna riga in `credit_ledger` tipo `trial_grant`
- Errori 4xx/5xx su `/api/stripe/webhook` in log hosting

### Diagnosi
1. Stripe Dashboard → Webhooks → ultimi delivery
2. Verifica `STRIPE_WEBHOOK_SECRET` in env produzione/staging
3. Query: `select * from stripe_events order by processed_at desc limit 20`

### Azione (entro 4h)
1. Ripristina endpoint webhook (deploy, secret corretto)
2. **Riconciliazione manuale:** identifica `worker_id` da Stripe session metadata
3. Esegui via service role:
   ```sql
   select grant_trial_credits('<worker_uuid>', 'manual-r2-recovery');
   ```
4. Log in `admin_audit_log` con action `r2_manual_trial_grant`

### Prevenzione
- Test **S3/S4** mensile: `npm run test:security`
- Job riconciliazione notturna Stripe ↔ ledger (Sprint 2)

---

## R3 — Push non funzionano

### Sintomi
- Mastri active non vedono inviti in tempo reale
- `notification_outbox` con `sent_at` null o push stub senza delivery reale
- Mastri segnalano "non ricevo notifiche"

### Diagnosi
1. Query: `select count(*) from notification_outbox where sent_at is null`
2. Verifica Edge Function `process-notifications` deployata
3. Test: `curl -X POST https://<app>/api/notifications/process`

### Azione immediata
1. **Workaround Sprint 1:** mastri devono controllare `/artigiano/inviti` manualmente ogni 5–10 min durante pilota
2. Processa outbox: `POST /api/notifications/process`
3. Comunicazione ops ai mastri active via email/WhatsApp broadcast: "Controllate Area Mastri → Inviti SOS"

### Sprint 2 (SMS-only mode)
- Flag admin `sms_only_mode` disabilita push e forza SMS fallback (Doc Sprint 2 G6)
- Copy SMS: *"Intervento [cat] vicino a te. Apri app entro 45 min."* — no dati cliente

---

## Contatti emergenza

| Ruolo | Azione |
|-------|--------|
| Tech lead | Patch deploy, RPC, RLS |
| Ops | Seconda ondata R1, comunicazione mastri/clienti |
| Admin | `/admin/monitor`, `/admin/verifica` |
| Supabase | Dashboard → logs, SQL editor |
| Stripe | Dashboard → webhooks, payments |

---

## Riferimenti

- Threat model test S1–S7: `npm run test:security`
- Seed staging: `npm run seed:staging`
- Smoke E5: `npm run smoke:staging`
- Doc completo R4–R7: `docs/02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md` §15
