# AncheCasa / SuperMastro — Indice Master Pilota v1.0

**Progetto:** anchecasa.it/supermastro (SuperMastro) · alias `/sos`  
**Versione documentazione:** 1.0-pilot  
**Stato:** CONGELATO — modifiche solo via Change Request  
**Ultimo aggiornamento:** 2026-07-05

---

## Navigazione rapida

| Documento | Riferimento | Uso |
|-----------|-------------|-----|
| [1. Product Spec](01-PRODUCT-SPEC-PILOTA-v1.md) | File completo | Brief dev, preventivi |
| [2. Flusso artigiano](02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md) | File completo | Ops, supporto |
| [5. Flussi utente](05-FLUSSI-UTENTE-CLIENTE-MASTRO-v1.md) | Cliente + mastro | Supporto, UX |
| [Design system](DESIGN-SYSTEM-v1.md) | UI/UX v1 | Dev, design |
| [3. Threat model](03-THREAT-MODEL-SECURITY-v1.md) | File completo | Pre go-live |
| [4. Sprint 1](../SPRINT-1-DETTAGLIATO-v1.md) | File completo | Staging 14 gg |
| [5. Sprint 2](SPRINT-2-DETTAGLIATO-v1.md) | File completo | Go-live |
| [Gantt S1+S2](GANTT-S1-S2-v1.md) | Timeline unificata | Stakeholder, PO |
| [6. Brief GDPR](BRIEF-CONSULENTE-GDPR-v1.md) | File completo | Legale / DPO |
| [7. Naming e copy](NAMING-COPY-SUPERMASTRO-v1.md) | File completo | Marketing, UX |
| Matrice incrociata | [§5](#5-matrice-incrociata) | Triage decisioni |
| Gate go-live | [§6](#6-gate-e-checklist-unificate) | PO, legal, tech |

---

## Visione in 30 secondi

- **Cosa:** marketplace mediato manodopera — privato gratis (SOS), artigiano pay-per-task (5 crediti/mese).
- **Dove:** 1 città pilota, 3 categorie (idraulico, elettricista, fabbro).
- **Come:** matching ibrido (invito async 45 min + accettazione realtime), non Uber puro.
- **Stack:** Next.js + Supabase EU + Stripe + AI vision + push.
- **Principio:** PII in vault, crediti in ledger, Realtime minimal, scope congelato.

---

## 1. Product Spec congelato v1.0

### 1.1 Principi vincolanti

| # | Principio |
|---|-----------|
| P1 | Una città, max 3 categorie |
| P2 | Supply curato (no scraping al pilota) |
| P3 | Matching ibrido, SLA 45 min |
| P4 | Privato non paga |
| P5 | Contatti mediati |
| P6 | Scope congelato (CR obbligatoria) |
| P7 | GDPR by design |

→ Dettaglio: [§1.1 Principi](#11-principi-vincolanti) · Threat: [T01, T04 §3.2](#32-attacchi-p0--blocker-go-live)

### 1.2 Matrice funzionalità — riepilogo

| Area | IN pilota | OUT pilota |
|------|-----------|------------|
| Auth | Magic link cliente + artigiano separati | Social login, login unificato |
| SOS | Foto, GPS, AI, stati, Realtime proprio request | Video, chat, pagamento cliente |
| Matching | Shortlist 15, first-accept, unlock | Ranking AI, invito sequenziale |
| Artigiano | Profilo, verifica admin, push inviti | GPS live, profilo pubblico |
| Billing | Trial 5 crediti, ledger, consumo su match | Abbonamento auto, multi-SKU |
| Admin | Verifica, monitor, dispute manuale | BI, multi-città, CMS |
| Moduli | — | B2B, scraping CV, app nativa |

→ Dettaglio: [§1.2 Matrice](#12-matrice-funzionalità--riepilogo) · Sprint OUT: [§4.2](#42-cosa-non-fare-in-sprint-1)

### 1.3 Stati richiesta SOS

```
draft → submitted → diagnosing → inviting → matched → completed
                              ↘ expired / cancelled
```

→ Stati: [§1.3](#13-stati-richiesta-sos) · Implementazione: [Sprint C, D §4.1](#41-backlog-per-blocco)

### 1.4 Skill pilota (congelate)

| slug | Label |
|------|-------|
| `idraulico` | Idraulico |
| `elettricista` | Elettricista |
| `fabbro` | Fabbro / serrature |

### 1.5 KPI pilota

| KPI | Target |
|-----|--------|
| Richieste SOS/mese | ≥ 80 |
| Match rate | ≥ 60% |
| Time to match (mediana) | ≤ 30 min |
| Conversion trial→paid | ≥ 25% |
| Churn artigiani | ≤ 35% |
| Dispute rate | ≤ 5% |

**Decision gate sett. 12:** GO se match ≥60% AND conversion ≥25% AND dispute ≤5%.

→ KPI: [§1.5](#15-kpi-pilota) · Gate scale: [§6.3](#63-gate-scale-città-2-settimana-12)

### 1.6 Change Request (CR)

Qualsiasi feature ❌ OUT richiede: CR document → approvazione PO → nuova versione spec.

→ Processo CR: [§1.6](#16-change-request-cr)

---

## 2. Flusso operativo artigiano

### 2.1 Stati account artigiano

| Stato | Riceve inviti | Accetta |
|-------|:-------------:|:-------:|
| `registered` | ❌ | ❌ |
| `pending_verification` | ❌ | ❌ |
| `verified` | ❌ | ❌ |
| `active` | ✅ | ✅ |
| `suspended` / `deactivated` | ❌ | ❌ |

→ Sprint: [Blocco B §4.1](#41-backlog-per-blocco)

### 2.2 Timeline prima settimana

| Giorno | Artigiano | Admin |
|--------|-----------|-------|
| L | Registrazione + profilo | — |
| M | — | Verifica |
| M | Trial → `active` | — |
| Go-live | Riceve inviti | Monitor |

→ Timeline: [§2.2](#22-timeline-prima-settimana)

### 2.3 Invito — cosa vede l'artigiano (pre-match)

| Visibile | Nascosto |
|----------|----------|
| Categoria, urgenza, distanza, quartiere | Nome, telefono, indirizzo, foto |

→ Privacy: [§3.3 Regole Realtime](#33-tre-regole-doro)

### 2.4 Accettazione e crediti

| Evento | Credito |
|--------|:-------:|
| Invito ricevuto / rifiutato | — |
| Match accettato | **−1** |
| Dispute favore artigiano | — |
| Dispute favore cliente / bug | **+1 refund** |

→ RPC: [Blocco D §4.1](#41-backlog-per-blocco) · Race: [T03 §3.2](#32-attacchi-p0--blocker-go-live)

### 2.5 Dispute — matrice decisioni

| Caso | Esito tipico |
|------|--------------|
| No-show confermato | Refund cliente (+1 artigiano) |
| Categoria AI errata entro 2h | Refund artigiano |
| Bug doppio match | Refund auto |
| Max refund | 2/mese/artigiano |

→ Matrice: [§2.5](#25-dispute--matrice-decisioni) · Implementazione: Sprint 2

### 2.6 Runbook ops critici

| ID | Scenario | Azione |
|----|----------|--------|
| R1 | Nessuna accettazione 45 min | Seconda ondata admin |
| R3 | Push down | SMS-only mode |
| R4 | Credito scalato senza accettare | Verifica log + refund |
| R6 | Pool < 30 active | Pausa acquisizione clienti |

→ Runbook: [§2.6](#26-runbook-ops-critici)

### 2.7 Test E2E artigiano (pre go-live)

T1 registrazione→active · T2 accetta→−1 · T3 rifiuta · T4 race · T5 dispute · T6 trial refund

→ Test: [§2.7](#27-test-e2e-artigiano-pre-go-live) · Gate: [§6.1](#61-gate-staging-fine-sprint-1)

---

## 3. Threat model security

### 3.1 Asset P0

1. `contact_vault` · 2. Service role key · 3. Stripe webhook secret

### 3.2 Attacchi P0 — blocker go-live

| ID | Attacco | Contromisura chiave | Sprint |
|----|---------|---------------------|--------|
| T01 | RLS bypass vault | deny-all + RPC unlock | A4, D4 |
| T02 | Webhook spoof | firma Stripe + idempotenza | B4 |
| T03 | Match race | transazione FOR UPDATE | D3 |
| T05 | Storage pubblico | bucket private + UUID path | C2, D8 |
| T06 | Service role in frontend | env server only | A1, A7 |

### 3.3 Tre regole d'oro

1. **PII mai queryabile dal client** — solo RPC unlock con audit.
2. **Soldi mai fidati dal client** — webhook firmato + ledger append-only.
3. **Realtime mai geografico** — canale per utente/richiesta, payload vuoto.

### 3.4 Test security obbligatori

S1 vault · S3 webhook fake · S4 replay · S5 double accept · S6 accept credito 0 · S7 foto non-match · S8 canale altrui

→ Test: [§3.4](#34-test-security-obbligatori) · Sprint: [Blocco E §4.1](#41-backlog-per-blocco)

### 3.5 Incident response (sintesi)

Detect → Contain (revoca sessioni) → Assess → Notify ≤72h → Recover → Post-mortem

→ IR: [§3.5](#35-incident-response-sintesi)

---

## 4. Sprint 1 — Priorità dev

**Durata:** 14 giorni · **Output:** staging demo-ready (non go-live pubblico)

### 4.1 Backlog per blocco

| Blocco | Giorni | Task | Gate |
|--------|--------|------|------|
| **A** Fondazione | 1–3 | A1–A7: Supabase, schema, PostGIS, vault, auth, SSR | Test S1 |
| **B** Artigiano | 4–6 | B1–B6: onboarding, admin, ledger, Stripe trial | Test T1 |
| **C** SOS cliente | 7–9 | C1–C7: landing, foto, AI, stati, Realtime minimal | Richiesta E2E |
| **D** Matching | 10–12 | D1–D8: geo, push, accept, unlock, expiry | Test T2–T5 |
| **E** Hardening | 13–14 | E1–E6: security, rate limit, staging | Demo 10 scenari |

### 4.2 Cosa NON fare in Sprint 1

SMS fallback · rimborso trial auto · dispute UI · pacchetto paid · GDPR pages · PWA · Sentry

→ Tutto in **Sprint 2 preview**

### 4.3 Buffer — non tagliare mai

A4 (vault) · B3 (ledger) · D3 (accept RPC) · D4 (unlock)

### 4.4 DoD Sprint 1

- [ ] Percorso artigiano completo in staging
- [ ] SOS foto→diagnosi→invito→match→unlock→−1 credito
- [ ] Race accept ok · expiry 45 min ok
- [ ] Test S1, S3–S7 pass
- [ ] Demo 5 min registrata

---

## 5. Matrice incrociata

Legenda: **Spec** = Doc 1 · **Ops** = Doc 2 · **Sec** = Doc 3 · **S1** = Sprint 1

| Funzione / Evento | Spec | Ops | Sec | S1 |
|-------------------|:----:|:---:|:---:|:--:|
| Registrazione artigiano | A02 | §3 | J1–J3 | B1 |
| Verifica admin | W07, D02 | §4 | A1–A4 admin | B2 |
| Trial Stripe | B02 | §5 | W1–W4 | B4 |
| Upload foto SOS | S03, S06 | — | F1–F5 | C2–C4 |
| Consenso AI | P7 | §3 | — | C3 |
| Geo shortlist | M01 | §6.1 | — | D1 |
| Push invito | W10 | §6.3 | R1–R5 | D2 |
| Accetta match | M09 | §7 | M1–M4 | D3 |
| Unlock contatto | M10, P5 | §7 | T01, A1–A6 | D4 |
| Consumo credito | B04 | §7.3 | T02–T03 | D3 |
| Expiry 45 min | M05 | §6 | — | D7 |
| Dispute | B07, D05 | §10 | B1–B5 | Sprint 2 |
| Realtime stato | S11 | — | R1–R6 | C7 |
| Rate limit SOS | NFR09 | R1 | D1–D6 | E2 |

---

## 6. Gate e checklist unificate

### 6.1 Gate staging (fine Sprint 1)

| # | Criterio | Owner |
|---|----------|-------|
| G1 | Test T1–T5 scenario artigiano | Dev |
| G2 | Test S1, S3–S7 security | Dev |
| G3 | 20 artigiani seed staging | Dev |
| G4 | Demo stakeholder registrata | PO |

### 6.2 Gate go-live pubblico (post Sprint 2)

| # | Criterio | Owner |
|---|----------|-------|
| G5 | Pool ≥ 50 artigiani `active` reali | Ops |
| G6 | Checklist GDPR § Doc 1 §10 completa | Legal |
| G7 | Informativa privacy pubblicata | Legal |
| G8 | DPIA compilata | Legal/DPO |
| G9 | SMS fallback operativo | Dev |
| G10 | Runbook R1–R7 testato | Ops |
| G11 | MFA admin attivo | Dev |
| G12 | Test T6 trial refund | Dev |

### 6.3 Gate scale città #2 (settimana 12)

Match rate ≥ 60% · conversion trial ≥ 25% · dispute ≤ 5%

→ KPI gate: [§1.5](#15-kpi-pilota) · [§6.3](#63-gate-scale-città-2-settimana-12)

---

## 7. Roadmap documentazione

| # | Documento | File | Stato |
|---|-----------|------|:-----:|
| 1 | Product Spec congelato v1.0 | [01-PRODUCT-SPEC-PILOTA-v1.md](01-PRODUCT-SPEC-PILOTA-v1.md) | ✅ |
| 2 | Flusso operativo artigiano | [02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md](02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md) | ✅ |
| 3 | Threat model security | [03-THREAT-MODEL-SECURITY-v1.md](03-THREAT-MODEL-SECURITY-v1.md) | ✅ |
| 4 | Indice master (questo file) | INDICE-MASTER-PILOTA-v1.md | ✅ |
| 5 | Brief consulente GDPR | [BRIEF-CONSULENTE-GDPR-v1.md](BRIEF-CONSULENTE-GDPR-v1.md) | ✅ |
| 6 | Naming e copy SuperMastro | [NAMING-COPY-SUPERMASTRO-v1.md](NAMING-COPY-SUPERMASTRO-v1.md) | ✅ |
| 8 | Sprint 1 dettagliato | [SPRINT-1-DETTAGLIATO-v1.md](../SPRINT-1-DETTAGLIATO-v1.md) | ✅ |
| 10 | Gantt unificato S1+S2 | [GANTT-S1-S2-v1.md](GANTT-S1-S2-v1.md) | ✅ |

---

## 8. Change log documentazione

| Versione | Data | Modifica |
|----------|------|----------|
| 1.0-pilot | 2026-07-05 | Creazione serie completa + indice master |
| 1.0-pilot | 2026-07-05 | Aggiunto brief consulente GDPR |
| 1.0-pilot | 2026-07-05 | Aggiunto naming e copy SuperMastro |
| 1.0-pilot | 2026-07-05 | Aggiunto Sprint 2 dettagliato go-live |
| 1.0-pilot | 2026-07-05 | Estratti Doc 1–3 in file dedicati |
| 1.0-pilot | 2026-07-05 | Aggiunto SPRINT-1-DETTAGLIATO-v1.md |
| 1.0-pilot | 2026-07-05 | Aggiunto Gantt unificato S1+S2 |

---

*Per modifiche allo scope: aprire CR (Doc 1 §11) e aggiornare versione + change log.*
