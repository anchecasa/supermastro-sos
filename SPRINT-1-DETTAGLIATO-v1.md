# Sprint 1 — Priorità dev (dettagliato)

**Progetto:** AncheCasa / SuperMastro  
**Versione:** 1.0-pilot  
**URL target staging:** `anchecasa.it/supermastro` (staging) · alias `/sos`  
**Durata:** 14 giorni  
**Obiettivo sprint:** percorso **artigiano completo** + **SOS end-to-end minimale** in **staging**, con **security blocker P0** risolti — **non** go-live pubblico

**Documenti correlati:** `docs/01-PRODUCT-SPEC-PILOTA-v1.md` · `docs/02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md` · `docs/03-THREAT-MODEL-SECURITY-v1.md` · `docs/SPRINT-2-DETTAGLIATO-v1.md`

---

## 1. Obiettivo e non-obiettivi

### Obiettivo (Definition of Done sprint)

1. Artigiano: registrazione → profilo → verifica admin → trial → `active`
2. Cliente SOS: GPS → foto → consenso AI → diagnosi → conferma → `inviting`
3. ≥1 artigiano riceve push → accetta → unlock bidirezionale → credito −1
4. Secondo artigiano che accetta → rifiutato (race ok)
5. Richiesta scade a 45 min se nessuno accetta
6. Test security S1, S3, S4, S5, S6, S7 pass
7. Zero PII in payload Realtime
8. Demo staging registrata (5 min)

### Non obiettivi Sprint 1

| Item | Slittare a |
|------|------------|
| SMS fallback | Sprint 2 |
| Job rimborso trial fine mese | Sprint 2 |
| Dispute UI completa | Sprint 2 |
| Pacchetto paid (non trial) | Sprint 2 |
| Pagine legali definitive (privacy/ToS) | Sprint 2 (integrazione contenuto legal) |
| PWA install prompt | Sprint 3 |
| Sentry + alerting | Sprint 2 |
| Seconda ondata inviti automatica | Sprint 2 (admin manuale ok) |
| Cancellazione account GDPR self-service | Sprint 2 |
| Go-live pubblico + 50 artigiani reali | Sprint 2 |
| Produzione | Sprint 2 (F1) |

---

## 2. Gate ingresso e uscita

### Prerequisiti (Giorno 0)

- [ ] Repo Next.js + Supabase progetto **staging** EU creati
- [ ] Account Stripe **test mode**
- [ ] Provider push (Firebase o equivalente) progetto dev
- [ ] Provider AI vision — API key staging
- [ ] Product Spec v1.0 letto e accettato dal team
- [ ] 1 `pilot_zone` polygon definita (anche placeholder)

### Gate uscita Sprint 1 (G1–G4)

| # | Criterio | Owner |
|---|----------|-------|
| G1 | Test T1–T5 scenario artigiano in staging | Dev |
| G2 | Test S1, S3, S4, S5, S6, S7 security | Dev |
| G3 | 20 artigiani seed staging (geo distribuita) | Dev |
| G4 | Demo stakeholder registrata | PO |

→ Go-live pubblico: **Sprint 2** (Gate G5–G12)

---

## 3. Backlog ordinato — 14 task

### 🔴 Blocco A — Fondazione (Giorni 1–3)

| # | Task | Perché per primo | DoD |
|---|------|------------------|-----|
| **A1** | Progetto Supabase EU + env staging | Tutto dipende da qui | Project live EU; secrets in Vercel staging; anon key solo frontend |
| **A2** | Schema DB minimo: `users`, `workers`, `worker_skills`, `skills`, `pilot_zones`, `consent_records` | Base dati | Migrazione applicata; 3 skill seed; 1 pilot_zone |
| **A3** | PostGIS: `worker_locations`, indice GIST | Matching impossibile senza | Extension abilitata; insert test ok |
| **A4** | `contact_vault` + RLS deny-all | Blocker security P0 | Artigiano autenticato → 0 rows da vault via REST |
| **A5** | `consent_records` + log consenso registrazione | GDPR base | Insert su registrazione verificato |
| **A6** | Auth separata: route `/supermastro` (cliente) e `/artigiano` (worker) | Due personas | Magic link/OTP funzionante su entrambi |
| **A7** | Next.js App Router + Supabase SSR (cookie httpOnly) | Anti-XSS session | Nessun token in localStorage; login/logout ok |

**Gate A (fine giorno 3):** test **S1** threat model — artigiano non legge vault.

---

### 🟠 Blocco B — Artigiano (Giorni 4–6)

| # | Task | Dipende da | DoD |
|---|------|------------|-----|
| **B1** | UI onboarding profilo artigiano (campi § Doc 2 step 2) | A2, A4 | Submit → `pending_verification` |
| **B2** | Admin minimo: coda verifica approve/reject | B1 | Cambio stato → notifica/email interna |
| **B3** | `billing_accounts` + `credit_ledger` + view balance | A2 | Ledger append-only; unique constraint su consume |
| **B4** | Stripe Checkout trial + webhook firmato | B3, A1 | Webhook fake → 400; event_id idempotente; +5 trial |
| **B5** | Transizione `verified` → `active` post-trial | B2, B4 | Solo con billing ok entra in pool |
| **B6** | Dashboard artigiano: saldo crediti + stato account | B3 | UI mostra balance da ledger |

**Gate B (fine giorno 6):** scenario **T1** — registrazione → verifica → trial → active.

---

### 🟡 Blocco C — SOS cliente (Giorni 7–9)

| # | Task | Dipende da | DoD |
|---|------|------------|-----|
| **C1** | Landing SOS mobile-first + check `pilot_zone` | A2, A3 | Fuori zona → messaggio blocco |
| **C2** | Upload foto → Storage bucket **privato** + path UUID | A1, A7 | URL pubblico → 403; signed URL ≤ 5 min |
| **C3** | Consenso AI esplicito pre-upload (checkbox separata) | A5 | Obbligatorio; loggato in `consent_records` |
| **C4** | Edge Function diagnosi AI (categoria + urgenza) | C2 | p95 ≤ 15 sec; fallback errore → messaggio utente |
| **C5** | `service_requests` + stati (draft→submitted→diagnosing→inviting) | A2 | Macchina stati Product Spec §4 |
| **C6** | UI conferma diagnosi + invio richiesta | C4, C5 | Cliente conferma categoria prima di `inviting` |
| **C7** | Realtime canale `request:{own_id}` — payload minimal | C5 | Solo `{status}`; no PII in payload |

**Gate C (fine giorno 9):** cliente crea richiesta in staging; foto privata; diagnosi ok.

---

### 🟢 Blocco D — Matching + monetizzazione (Giorni 10–12)

| # | Task | Dipende da | DoD |
|---|------|------------|-----|
| **D1** | Query geo shortlist (skill + ST_DWithin + balance > 0) | A3, B5 | ≤ 15 artigiani; p95 query < 200 ms su seed |
| **D2** | `request_invitations` + notifica push | D1 | Artigiano active riceve push entro 30 sec |
| **D3** | RPC `accept_invitation` transazionale | D2, B3 | FOR UPDATE + unique match; credito −1 atomico |
| **D4** | RPC `unlock_contact` + `contact_reveals` audit | D3, A4 | Cliente↔artigiano vedono telefono solo post-match |
| **D5** | UI artigiano: lista inviti + accetta/rifiuta | D2, D3 | Dettaglio senza indirizzo preciso pre-match |
| **D6** | UI cliente: attesa match + schermata matched | D4, C7 | Realtime aggiorna stato; countdown 45 min |
| **D7** | Timer expiry 45 min → stato `expired` | C5 | pg_cron o scheduled function |
| **D8** | Storage policy: artigiano vede foto solo post-match | D4, C2 | Test **S7** pass |

**Gate D (fine giorno 12):** scenari **T2–T5** in staging.

---

### 🔵 Blocco E — Hardening + staging (Giorni 13–14)

| # | Task | Dipende da | DoD |
|---|------|------------|-----|
| **E1** | Test security S1–S7 (Doc 3 §8) | Tutto | Tutti pass; bug P0 fixati |
| **E2** | Rate limit base: 3 SOS/giorno/cliente; 10 accept/ora/artigiano | C5, D3 | 429 su superamento |
| **E3** | Admin monitor: lista richieste attive + log inviti | D2 | Ops può vedere stato live |
| **E4** | Seed 20 artigiani fake staging (geo distribuita) | D1 | Test matching ripetibile |
| **E5** | Deploy staging + smoke test 10 richieste simulate | E1 | 5 match, 3 expired, 2 cancelled |
| **E6** | Documentazione runbook R1–R3 (bozza interna) | E3 | File per ops |

**Gate E (fine giorno 14):** staging demo-ready · **non** go-live pubblico.

---

## 4. Schema DB minimo Sprint 1

Entità da creare in Blocco A (concettuale — implementazione in migrazioni):

| Schema / tabella | Sprint 1 |
|------------------|:--------:|
| `skills` (seed 3) | ✅ |
| `pilot_zones` | ✅ |
| `workers`, `worker_skills`, `worker_locations` | ✅ |
| `contact_vault` | ✅ |
| `consent_records` | ✅ |
| `billing_accounts`, `credit_ledger` | ✅ |
| `service_requests`, `request_diagnoses`, `request_media` | ✅ |
| `request_invitations`, `matches` | ✅ |
| `contact_reveals` | ✅ |
| `stripe_events` (idempotenza webhook) | ✅ |
| `admin_users` | ✅ |
| Dispute tables | ❌ Sprint 2 |
| SMS delivery log | ❌ Sprint 2 |

---

## 5. Dipendenze critiche

```
A1 Supabase → A2 Schema → A3 PostGIS + A4 Vault
A1 → A6 Auth → A7 SSR
A4 → B1 Onboarding → B2 Admin
A2 → B3 Ledger → B4 Stripe → B5 active
B5 + A3 → D1 Geo → D2 Inviti → D3 Accept
A4 + B3 → D4 Unlock
C1–C7 → D1 (richiesta inviting)
D* + E1 → Gate E
```

**Non iniziare matching prima che ledger e vault esistano.**

---

## 6. Allocazione giorno per giorno (1 dev)

| Giorno | Blocco | Output atteso |
|--------|--------|---------------|
| **1** | A1, A2, A6 | Supabase + schema + auth scaffold |
| **2** | A3, A4, A5, A7 | PostGIS, vault, SSR |
| **3** | Gate A + B1 inizio | Test S1 RLS; form profilo |
| **4** | B1, B2 | Onboarding + admin verify |
| **5** | B3, B4 | Ledger + Stripe webhook |
| **6** | B5, B6, Gate B | Trial → active · test T1 |
| **7** | C1, C2, C3 | SOS landing + upload + consenso AI |
| **8** | C4, C5 | AI + stati richiesta |
| **9** | C6, C7, Gate C | Flusso cliente fino a inviting |
| **10** | D1, D2 | Geo + inviti + push |
| **11** | D3, D4, D8 | Accept + unlock + foto policy |
| **12** | D5, D6, D7, Gate D | UI entrambe parti · T2–T5 |
| **13** | E1, E2, E3 | Security + rate limit + admin |
| **14** | E4, E5, E6 | Seed + deploy staging · demo G4 |

---

## 7. Test obbligatori Sprint 1

| ID | Scenario | Blocco | Riferimento |
|----|----------|--------|-------------|
| T1 | Registrazione → verifica → trial → active | B | Doc 2 §18 |
| T2 | Invito → accetta → unlock → credito −1 | D | Doc 2 §18 |
| T3 | Invito → rifiuta → credito invariato | D | Doc 2 §18 |
| T4 | Due accettazioni simultanee → 1 match | D | Doc 3 §4.4 |
| T5 | Dispute no-show → refund | — | **Sprint 2** (non blocker S1) |
| S1 | Artigiano non legge vault | A | Doc 3 §8 |
| S3 | Webhook fake → 400 | B | Doc 3 §8 |
| S4 | Webhook replay → +5 una volta | B | Doc 3 §8 |
| S5 | Double accept → 1 match | D | Doc 3 §8 |
| S6 | Accept credito 0 → reject | D | Doc 3 §8 |
| S7 | Foto non-match → 403 | D | Doc 3 §8 |
| E2E | 10 scenari smoke (5/3/2) | E | §1 DoD |

---

## 8. Buffer — cosa tagliare se slitti

**Tagliabili (ordine):** C7 Realtime fancy · E2 rate limit · E6 runbook · copy landing polish

**Mai tagliare:**

| Task | Motivo |
|------|--------|
| A4 vault | P0 GDPR / security |
| B3 ledger | Integrità monetizzazione |
| B4 webhook firmato | P0 revenue |
| D3 accept RPC | Race + crediti |
| D4 unlock | Core prodotto |
| D8 storage policy | P0 privacy foto |

---

## 9. Rischio sprint e mitigazione

| Rischio | Segnale | Mitigazione |
|---------|---------|-------------|
| Stripe webhook in locale | Crediti non si attivano | Stripe CLI + tunnel giorno 5 |
| Push non configurate | Inviti silenti | Firebase setup giorno 4–5, non giorno 10 |
| AI lenta/costosa | UX bloccata | Mock diagnosi in dev; provider scelto giorno 7 |
| RLS troppo complesso | Dev bloccato | RPC centralizzate; policy semplici per tabella |
| Scope creep | "Aggiungiamo chat" | CR form Product Spec §11 |

---

## 10. Parallelo ops (non bloccante S1)

| Settimana | Ops locale |
|-----------|------------|
| S1 sett. 1 | Lista 80 prospect; primi 20 contattati |
| S1 sett. 2 | 10 artigiani registrati in **staging**; feedback UX onboarding |
| Post S1 | Scalare a 50 `active` in **prod** — Sprint 2 |

---

## 11. Definition of Done — checklist finale

### Dev

- [ ] Percorso artigiano completo in staging (T1)
- [ ] SOS foto → diagnosi → invito → match → unlock → −1 credito (T2)
- [ ] Race accept ok (T4) · expiry 45 min ok
- [ ] Test S1, S3, S4, S5, S6, S7 pass
- [ ] Realtime payload senza PII
- [ ] 20 artigiani seed geo distribuita
- [ ] Demo 5 min registrata (G4)

### Esplicitamente NON richiesto S1

- [ ] Go-live pubblico
- [ ] 50 artigiani reali
- [ ] SMS fallback
- [ ] Rimborso trial automatico
- [ ] Pagine privacy definitive
- [ ] MFA admin (→ Sprint 2 F4)

---

## 12. Handoff → Sprint 2

Al completamento Sprint 1, consegnare a Sprint 2:

1. URL staging funzionante + credenziali admin
2. Report test S1–S7 + T1–T4
3. Lista bug noti (P1/P2)
4. Schema DB migrato documentato
5. Env vars checklist (Stripe, push, AI, Supabase)
6. Recording demo G4

→ Prossimo sprint: `docs/SPRINT-2-DETTAGLIATO-v1.md`

---

## 13. Change log

| Versione | Data | Nota |
|----------|------|------|
| 1.0-pilot | 2026-07-05 | Creazione Sprint 1 dettagliato |

---

*Allineato a Product Spec v1.0 CONGELATO. Modifiche scope via CR §11.*
