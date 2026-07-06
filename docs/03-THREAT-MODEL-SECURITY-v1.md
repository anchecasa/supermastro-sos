# Threat model security — Pilota SuperMastro v1.0

**Progetto:** AncheCasa.it / SuperMastro  
**Versione:** 1.0-pilot  
**Stack:** Next.js, Supabase (Auth, Postgres, RLS, Realtime, Storage, Edge Functions), Stripe, provider AI vision  
**Metodologia:** STRIDE semplificato + attack tree per flussi critici pilota  
**Assunzione attaccante:** motivazione economica (scraping contatti, evitare crediti, impersonation), non nation-state

**Documenti correlati:** `01-PRODUCT-SPEC-PILOTA-v1.md` · `02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md` · `SPRINT-2-DETTAGLIATO-v1.md`

---

## 1. Asset da proteggere (ordinati per criticità)

| Priorità | Asset | Perché |
|:--------:|-------|--------|
| **P0** | `contact_vault` (telefono, email cliente/artigiano) | Danno GDPR immediato, trust zero |
| **P0** | Service role key Supabase | Accesso totale al DB |
| **P0** | Stripe webhook secret + API keys | Falsi crediti, perdita revenue |
| **P1** | Foto SOS (Storage privato) | Dati casa/famiglia, sensibili |
| **P1** | Ledger crediti | Integrità monetizzazione |
| **P1** | Logica match (RPC transazionale) | Doppio match, crediti non scalati |
| **P2** | JWT/sessioni utenti | Impersonation |
| **P2** | Canali Realtime | Leak metadata richieste |
| **P2** | Prompt/dati inviati a LLM | Sub-processor leak |
| **P3** | Profili artigiano (non-PII) | Scraping concorrenza |

---

## 2. Superficie d'attacco — mappa

```
Client (Next.js + anon key)
    → Auth JWT
    → PostgREST + RLS
    → Realtime channels
    → Storage buckets
    → Edge Functions → Postgres RPC

Esterni:
    → Stripe webhooks → Edge Functions
    → AI provider
    → SMS/Push provider
```

**Regola architetturale pilota:** il client parla con Supabase **solo** via operazioni consentite da RLS; crediti, unlock contatti e match passano da **RPC server-side** o Edge Function controllata.

---

## 3. Threat catalog — STRIDE per componente

| Componente | S | T | R | I | D | E |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Auth / JWT | ✅ | ✅ | ✅ | — | — | ✅ |
| RLS / PostgREST | — | — | ✅ | ✅ | — | ✅ |
| Realtime | — | — | ✅ | ✅ | — | — |
| Storage foto | — | — | ✅ | ✅ | — | ✅ |
| RPC match/crediti | — | ✅ | ✅ | ✅ | ✅ | — |
| Stripe webhook | — | ✅ | — | ✅ | ✅ | — |
| Edge Functions | — | ✅ | — | ✅ | ✅ | ✅ |
| Contact vault | — | — | ✅ | ✅ | — | — |
| Admin panel | ✅ | ✅ | ✅ | ✅ | — | ✅ |

*S=Spoofing, T=Tampering, R=Repudiation, I=Information disclosure, D=Denial of service, E=Elevation of privilege*

---

## 4. Attacchi critici e contromisure

### 4.1 RLS bypass — enumerazione contatti

**Scenario:** artigiano tenta di leggere telefoni clienti fuori dai propri match.

| # | Attacco | Come |
|---|---------|------|
| A1 | Query diretta su `contact_vault` | PostgREST |
| A2 | Join indiretto | Phone in tabella esposta |
| A3 | IDOR su `matches` | Cambio match_id |
| A4 | Policy RLS permissiva | `USING (true)` in prod |
| A5 | Escalation via `user_metadata` | Claim `role: admin` client-side |

**Impatto:** critico — violazione GDPR.

| # | Contromisura |
|---|--------------|
| D1 | RLS **deny-all** su `contact_vault` |
| D2 | Zero PII in tabelle queryabili dal client |
| D3 | RPC `unlock_contact(match_id)` con check: parte del match, stato matched |
| D4 | Test RLS automatizzati (artigiano A vs match B → fail) |
| D5 | Ruolo admin in tabella DB, non metadata client |
| D6 | Artigiano vede solo propri `request_invitations` |

**Test accettazione:** artigiano autenticato → 0 righe da vault · artigiano B → 0 match di A

---

### 4.2 Realtime leak — metadata e canali

**Scenario:** subscribe a canali altrui → eventi richieste SOS in zona.

| # | Attacco |
|---|---------|
| R1 | Broadcast su canale geo ampio |
| R2 | Subscribe a `request_id` altrui |
| R3 | Presence channel artigiani |
| R4 | Payload Realtime con PII |
| R5 | Filtro subscription insufficiente |

| # | Contromisura |
|---|--------------|
| D1 | Canale per entità: `request:{own_id}`, `worker:{own_id}` |
| D2 | Payload minimali: solo `{ status, updated_at }` |
| D3 | **No broadcast regionale** |
| D4 | UUID v4 non enumerabili |
| D5 | Verificare RLS su tabelle Realtime |
| D6 | Alert subscription anomale |

**Payload sicuro:**

| Evento | Consentito | Vietato |
|--------|------------|---------|
| Stato richiesta | `status: "matched"` | indirizzo, telefono |
| Nuovo invito | `urgency`, `distance_km` | nome cliente |

---

### 4.3 Stripe webhook spoof — crediti gratis

| # | Attacco |
|---|---------|
| W1 | POST falso senza firma |
| W2 | Replay webhook catturato |
| W3 | Manipolazione metadata customer |
| W4 | Doppio process stesso evento |
| W5 | Endpoint pubblico senza verifica |

| # | Contromisura |
|---|--------------|
| D1 | `constructEvent(rawBody, sig, secret)` obbligatorio |
| D2 | Raw body non parsato da middleware |
| D3 | Tabella `stripe_events` — `event_id` UNIQUE |
| D4 | Mapping customer→account server-side |
| D5 | Whitelist event types |
| D6 | Webhook secret rotabile |
| D7 | Riconciliazione notturna Stripe ↔ ledger |

---

### 4.4 Match race — doppia accettazione e crediti

| # | Attacco |
|---|---------|
| M1 | Double-click accetta |
| M2 | Bot accetta tutto |
| M3 | Accetta con balance 0 |
| M4 | Accetta su richiesta expired |

| # | Contromisura |
|---|--------------|
| D1 | `SELECT ... FOR UPDATE` su request |
| D2 | Unique partial index: 1 match attivo per request |
| D3 | Check crediti + insert match + ledger −1 in stessa transazione |
| D4 | Gate: status `inviting` AND now < expires_at |
| D5 | Rate limit 10 accettazioni/ora/artigiano |
| D6 | Idempotency key client |

---

### 4.5 Storage foto SOS — accesso non autorizzato

| # | Attacco |
|---|---------|
| F1 | Bucket pubblico |
| F2 | Signed URL TTL lungo condiviso |
| F3 | Path prevedibile |
| F4 | Artigiano non matchato accede foto |
| F5 | AI provider conserva immagine |

| # | Contromisura |
|---|--------------|
| D1 | Bucket **privato** always |
| D2 | Signed URL TTL ≤ 5 min |
| D3 | Path UUID |
| D4 | Storage RLS: owner OR artigiano con match attivo |
| D5 | Foto artigiano solo post-match |
| D6 | DPA AI: no training, retention ≤ 30 gg |
| D7 | Retention 90 gg + purge job |

---

### 4.6 JWT / session hijacking

| # | Attacco |
|---|---------|
| J1 | XSS → steal token |
| J2 | Session fixation |
| J3 | Credential stuffing |
| J4 | Admin cookie scope troppo ampio |

| # | Contromisura |
|---|--------------|
| D1 | httpOnly cookie (Supabase SSR) |
| D2 | CSP strict |
| D3 | Magic link / OTP (pilota) |
| D4 | **MFA admin obbligatorio** (Sprint 2) |
| D5 | Short JWT expiry + refresh |
| D6 | Admin su subdomain separato (futuro) |

---

### 4.7 Edge Functions — secret exposure e logic bypass

| # | Attacco |
|---|---------|
| E1 | Service role in bundle frontend |
| E2 | Edge Function senza auth |
| E3 | `worker_id` nel body ≠ JWT user |
| E4 | Timeout → stato inconsistente |

| # | Contromisura |
|---|--------------|
| D1 | Service role solo server env |
| D2 | Verifica JWT in ogni Function |
| D3 | `worker_id` sempre derivato da `auth.uid()` |
| D4 | Logica critica in Postgres RPC |
| E5 | Retry idempotenti |

---

### 4.8 Admin panel — insider e account takeover

| # | Attacco |
|---|---------|
| A1 | Export bulk PII |
| A2 | Admin condiviso |
| A3 | Override match senza log |
| A4 | Social engineering support |

| # | Contromisura |
|---|--------------|
| D1 | Audit log immutabile |
| D2 | No export PII self-service |
| D3 | MFA + IP allowlist opzionale |
| D4 | Vault read admin solo via RPC loggato |
| D5 | Refund > 3 crediti/mese → 4-eyes |
| D6 | Runbook: mai telefono via email/chat |

---

### 4.9 Abuso business logic — artigiano fraudolento

| # | Attacco |
|---|---------|
| B1 | Accetta e no-show |
| B2 | Contatta cliente pre-match |
| B3 | Collusione cliente–artigiano fake match |
| B4 | Multi-account stesso trial |
| B5 | Rifiuta tutto tranne clienti suoi |

| # | Contromisura |
|---|--------------|
| D1 | No-show tracking + sospensione |
| D2 | Moderazione note (futuro) |
| D3 | Fingerprint carta / telefono |
| D4 | 1 trial per P.IVA / tel / device |
| D5 | Rotazione shortlist |
| D6 | Alert stesso cliente+artigiano >3 match/mese |

---

### 4.10 Denial of Service

| # | Attacco |
|---|---------|
| D1 | Bot richieste SOS flood |
| D2 | Spam inviti |
| D3 | Upload foto enormi |
| D4 | LLM prompt injection |

| # | Contromisura |
|---|--------------|
| D1 | Max 3 SOS/giorno/cliente; 50 concurrent/città |
| D2 | CAPTCHA su submit |
| D3 | Max 10 MB + resize |
| D4 | Max 500 char descrizione |
| D5 | Throttle 5 inviti/2h/artigiano |
| D6 | Cloudflare/WAF rate limit |

---

## 5. Attack trees — flussi critici

### 5.1 Obiettivo: telefono cliente senza match

```
Telefono cliente
├── Bypass RLS vault ──► FAIL D1-D6 §4.1
├── Realtime leak ─────► FAIL D1-D6 §4.2
├── Storage metadata ──► FAIL bucket privato
├── Social eng. ───────► Mitigato dispute + ban
└── Admin compromise ──► Mitigato MFA + audit §4.8
```

**Rischio residuo pilota:** medio-basso con vault + Realtime minimal + Storage RLS.

### 5.2 Obiettivo: crediti gratis infiniti

```
Crediti infiniti
├── Webhook spoof ──► FAIL firma + idempotenza §4.3
├── Race match ─────► FAIL transazione §4.4
├── Trial multi-account ► Fingerprint §4.9
├── Dispute abuse ──► Max 2 refund/mese
└── SQL injection ──► RPC parametrizzate + RLS
```

**Rischio residuo:** basso con webhook hardening + ledger append-only.

### 5.3 Obiettivo: intelligence domanda zona

```
Intelligence zona
├── Canale Realtime geo ► FAIL no broadcast §4.2
├── Enumerazione request ► FAIL UUID v4
└── Scraping API ───────► Rate limit + auth
```

**Rischio residuo:** basso; artigiano vede solo propri inviti.

---

## 6. Matrice rischio — priorità remediation

| ID | Threat | Prob. | Impatto | Rischio | Priorità |
|----|--------|:-----:|:-------:|:-------:|:--------:|
| T01 | RLS vault esposto | Media | Critico | **P0** | Blocker |
| T02 | Webhook Stripe non verificato | Media | Critico | **P0** | Blocker |
| T03 | Match race doppio | Media | Alto | **P0** | Blocker |
| T04 | Realtime payload PII | Bassa | Alto | **P1** | Pre-launch |
| T05 | Storage bucket pubblico | Bassa | Critico | **P0** | Blocker |
| T06 | Service role in frontend | Bassa | Critico | **P0** | Blocker |
| T07 | XSS session steal | Media | Alto | **P1** | Pre-launch |
| T08 | Trial abuse multi-account | Alta | Medio | **P1** | Pre-launch |
| T09 | SOS flood bot | Media | Medio | **P2** | Launch+1 sett |
| T10 | Admin no MFA | Media | Alto | **P1** | Sprint 2 |

**Blocker = nessun go-live SOS reale finché non risolto e testato.**

---

## 7. Security checklist pre go-live

### Infrastruttura Supabase

- [ ] Progetto in **region EU**
- [ ] RLS **ENABLED** su ogni tabella
- [ ] `contact_vault`: zero policy SELECT client
- [ ] Nessuna colonna phone/email in tabelle permissive
- [ ] Service role key **solo** env server
- [ ] Storage buckets private; policy testate
- [ ] Realtime: canali per-entity; payload auditati
- [ ] Backup automatici; test restore documentato

### Applicazione Next.js

- [ ] Supabase SSR cookie httpOnly
- [ ] CSP headers
- [ ] Audit `NEXT_PUBLIC_*` — nessun secret
- [ ] Route admin con auth guard
- [ ] Rate limiting API custom

### Stripe

- [ ] Webhook signature verification
- [ ] Idempotenza `event_id`
- [ ] Whitelist event types
- [ ] Test mode ≠ prod keys
- [ ] Job riconciliazione schedulato

### Operazioni

- [ ] MFA admin attivo
- [ ] Audit log admin operativo
- [ ] Runbook breach 72h Garante
- [ ] Contatto DPO definito
- [ ] Pen test leggero RLS

---

## 8. Piano test di sicurezza

| # | Test | Pass |
|---|------|:----:|
| S1 | Artigiano A legge vault → 0 rows | ✅ |
| S2 | Artigiano B legge match di A → fail | ✅ |
| S3 | Webhook fake senza signature → 400 | ✅ |
| S4 | Webhook replay stesso event_id → +5 una volta | ✅ |
| S5 | Double accept → 1 match | ✅ |
| S6 | Accept credito 0 → reject | ✅ |
| S7 | Foto URL artigiano non-match → 403 | ✅ |
| S8 | Subscribe canale altrui → 0 payload | ✅ |
| S9 | XSS probe in bio → no exec | ✅ |
| S10 | Admin refund → riga audit_log | ✅ |

**Frequenza:** S1–S8 pre go-live; S1–S4 mensile in pilota.

---

## 9. Incident response — playbook

| Fase | Tempo | Azione |
|------|-------|--------|
| Detect | 0–1h | Alert Sentry/anomaly → triage |
| Contain | 1–4h | Revoca sessioni; rotazione secret; pausa matching se vault leak |
| Assess | 4–24h | Record esposti, tabelle, log access |
| Notify | ≤72h | Garante Art. 33 se rischio diritti |
| Notify interessati | Se alto rischio | Art. 34 |
| Recover | 1–7 gg | Patch RLS/RPC; re-test S1–S8 |
| Learn | 7–14 gg | Aggiorna DPIA e threat model |

### Contatti emergenza (da compilare)

| Ruolo | Nome | Contatto |
|-------|------|----------|
| Tech lead | ___ | ___ |
| DPO / Legal | ___ | ___ |
| Supabase support | ticket | dashboard |
| Stripe support | ticket | dashboard |

---

## 10. Rischio residuo accettabile (pilota)

| Area | Rischio residuo | OK pilota? |
|------|-----------------|:----------:|
| Vault PII | Basso | ✅ |
| Crediti/pagamenti | Basso | ✅ |
| Realtime metadata | Basso-medio | ✅ con payload minimal |
| AI sub-processor | Medio | ✅ con DPA + EU option |
| Abuso no-show | Medio | ✅ con dispute |
| Scraping supply (futuro) | Alto | ❌ non in pilota |

---

## 11. Tre regole d'oro security pilota

1. **PII mai queryabile dal client** — solo RPC `unlock` transazionale con audit.
2. **Soldi mai fidati dal client** — Stripe webhook firmato + ledger append-only + idempotenza.
3. **Realtime mai geografico** — canali per utente/richiesta, payload vuoto di sensibili.

---

*Versione 1.0-pilot — allineato a Product Spec, Flusso artigiano, Sprint 1/2*
