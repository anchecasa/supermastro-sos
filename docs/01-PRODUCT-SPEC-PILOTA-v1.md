# Product Spec congelato v1.0 — Pilota SuperMastro

**Progetto:** AncheCasa.it / SuperMastro  
**URL canonico:** `anchecasa.it/supermastro` · alias `/sos`  
**Versione:** 1.0-pilot  
**Stato:** CONGELATO — modifiche solo via Change Request esplicita  
**Ambito geografico:** 1 città pilota + raggio max 25 km  
**Durata pilota:** 8–12 settimane  
**Obiettivo:** validare match artigiano–privato, monetizzazione pay-per-task, compliance minima ma solida

**Documenti correlati:** `INDICE-MASTER-PILOTA-v1.md` · `02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md` · `03-THREAT-MODEL-SECURITY-v1.md`

---

## 1. Principi vincolanti del pilota

Queste regole non sono negoziabili in v1.0. Ogni eccezione posticipa il go-live.

| # | Principio | Implicazione |
|---|-----------|--------------|
| P1 | **Una città, poche categorie** | Max 3 tipologie intervento SOS |
| P2 | **Supply curato, non scrapato** | Artigiani inseriti/verificati manualmente |
| P3 | **Matching ibrido, non Uber realtime** | Invito async + accettazione entro SLA 45 min |
| P4 | **Privato non paga** | Revenue solo da pacchetti artigiano |
| P5 | **Contatti mediati** | Telefono/email mai pubblici prima del match |
| P6 | **Congelamento funzionale** | Niente feature fuori da questo documento |
| P7 | **GDPR by design** | Consensi granulari, vault PII, retention foto |

---

## 2. Personas e permessi

| Persona | Descrizione | Accesso pilota |
|---------|-------------|----------------|
| **Cliente SOS** | Privato con problema domestico | Crea richiesta, vede stato, riceve contatto artigiano |
| **Artigiano** | Professionista verificato | Riceve inviti, accetta/rifiuta, paga pacchetti |
| **Admin piattaforma** | Operatore AncheCasa | Verifica artigiani, gestisce dispute, override limitato |
| **Org B2B** | Condominio/azienda | **NON ATTIVA** in v1.0 |

---

## 3. Matrice funzionalità — IN / OUT / FUTURO

### 3.1 Autenticazione e account

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| A01 | Registrazione cliente (email + magic link o OTP) | ✅ IN | No social login obbligatorio |
| A02 | Registrazione artigiano | ✅ IN | Flusso separato da cliente |
| A03 | Login unificato cliente/artigiano | ❌ OUT | Due entry point distinti |
| A04 | Social login (Google/Apple) | ⏸ FUTURO | Post-pilota se richiesto |
| A05 | Recupero password | ✅ IN | Standard Supabase Auth |
| A06 | Eliminazione account self-service | ✅ IN | Sprint 2 — workflow anonimizzazione |
| A07 | Multi-device session | ✅ IN | Comportamento auth default |

### 3.2 SuperMastro SOS — flusso cliente

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| S01 | Landing SOS mobile-first | ✅ IN | URL `/supermastro` |
| S02 | Permesso GPS obbligatorio | ✅ IN | Blocco richiesta se negato |
| S03 | Upload 1–3 foto problema | ✅ IN | Max 10 MB/foto, JPG/PNG/HEIC |
| S04 | Upload video | ❌ OUT | v1.1+ |
| S05 | Descrizione testuale opzionale | ✅ IN | Max 500 caratteri |
| S06 | Diagnosi AI da foto | ✅ IN | Consenso esplicito pre-upload |
| S07 | Scelta manuale categoria da cliente | ❌ OUT | Solo override admin in dispute |
| S08 | Anteprima diagnosi + conferma cliente | ✅ IN | Cliente conferma prima invio |
| S09 | Stima urgenza (AI) | ✅ IN | Informativa, non vincolante |
| S10 | Tracking stato richiesta | ✅ IN | Stati definiti §4 |
| S11 | Realtime aggiornamento stato | ✅ IN | Solo sul proprio `request_id` |
| S12 | Lista artigiani invitati visibile al cliente | ❌ OUT | Privacy + anti-gaming |
| S13 | Chat in-app cliente–artigiano | ❌ OUT | Contatto diretto post-match |
| S14 | Pagamento cliente | ❌ OUT | Mai in v1.0 |
| S15 | Rating/recensione post-intervento | ⏸ FUTURO | Solo flag "intervento completato?" in v1.0 |
| S16 | Richiesta fuori zona pilota | ❌ OUT | Messaggio "servizio non ancora disponibile" |
| S17 | Richiesta fuori categorie pilota | ❌ OUT | Stesso messaggio zona |

### 3.3 Matching e inviti

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| M01 | Shortlist geo max 15 artigiani | ✅ IN | Query PostGIS + skill |
| M02 | Ranking AI su shortlist | ❌ OUT | Solo distanza + tier + rotazione |
| M03 | Invito simultaneo a tutti i 15 | ✅ IN | First-accept-wins |
| M04 | Invito sequenziale (uno alla volta) | ❌ OUT | v1.1 se spam problem |
| M05 | Timeout invito 45 min | ✅ IN | Poi stato `expired` |
| M06 | Re-invio automatico seconda ondata | ⏸ FUTURO | Manuale admin in pilota |
| M07 | Artigiano "online now" obbligatorio | ❌ OUT | Notifica push/SMS sufficiente |
| M08 | Rifiuto esplicito artigiano | ✅ IN | Non penalizza, ma loggato |
| M09 | Accettazione artigiano | ✅ IN | Blocca altri inviti |
| M10 | Sblocco contatto bidirezionale | ✅ IN | Cliente↔artigiano |
| M11 | Sblocco indirizzo preciso pre-match | ❌ OUT | Solo città/zona approssimativa agli invitati |
| M12 | Match multipli per richiesta | ❌ OUT | 1 match attivo max |

### 3.4 Artigiano — profilo e operatività

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| W01 | Profilo base (nome, foto, bio) | ✅ IN | |
| W02 | Skill da catalogo fisso (max 3) | ✅ IN | Allineate a categorie SOS |
| W03 | Zona operativa (CAP + raggio km) | ✅ IN | |
| W04 | GPS live posizione | ❌ OUT | Solo sede/zona dichiarata |
| W05 | Calendario disponibilità | ❌ OUT | Sempre "potenzialmente disponibile" |
| W06 | Portfolio lavori | ⏸ FUTURO | |
| W07 | Verifica identità manuale admin | ✅ IN | Gate obbligatorio pre-attivazione |
| W08 | Badge "verificato AncheCasa" | ✅ IN | Visibile post-verifica |
| W09 | Dashboard inviti ricevuti | ✅ IN | |
| W10 | Notifica push nuovo invito | ✅ IN | |
| W11 | Notifica SMS fallback | ✅ IN | Sprint 2 — se push non consegnata entro 2 min |
| W12 | Storico match e crediti consumati | ✅ IN | |
| W13 | Profilo pubblico ricercabile | ❌ OUT | Nessun marketplace browsing |

### 3.5 Billing artigiano

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| B01 | Pacchetto 5 crediti/mese | ✅ IN | Un solo SKU pilota |
| B02 | Trial 5 crediti rimborsabili | ✅ IN | Rimborso auto se 0 match/mese — Sprint 2 |
| B03 | Abbonamento ricorrente auto | ❌ OUT | Solo acquisto one-shot pilota |
| B04 | Consumo credito su accettazione match | ✅ IN | Non su invito, non su unlock |
| B05 | Ledger movimenti visibile | ✅ IN | |
| B06 | Fattura/ricevuta Stripe | ✅ IN | |
| B07 | Rimborso manuale dispute | ✅ IN | Admin → ledger `dispute_refund` |
| B08 | Pacchetti multi-tier (10, 20 crediti) | ⏸ FUTURO | |
| B09 | Pagamento bonifico | ❌ OUT | |

### 3.6 Admin piattaforma

| ID | Funzione | v1.0 Pilota | Note |
|----|----------|:-----------:|------|
| D01 | Dashboard richieste live | ✅ IN | |
| D02 | Approva/sospendi artigiano | ✅ IN | |
| D03 | Override diagnosi AI | ✅ IN | Solo in dispute |
| D04 | Re-invia inviti (seconda ondata) | ✅ IN | Manuale |
| D05 | Annulla match + refund credito | ✅ IN | Con motivazione obbligatoria |
| D06 | Export GDPR su richiesta | ✅ IN | Entro 30 giorni |
| D07 | Analytics avanzate / BI | ❌ OUT | Solo metriche §8 |
| D08 | Gestione multi-città | ❌ OUT | |
| D09 | CMS contenuti marketing | ❌ OUT | Landing statica |

### 3.7 Moduli esplicitamente congelati (FUTURO)

| Modulo | Stato v1.0 |
|--------|------------|
| Dashboard B2B condominio/azienda | ❌ Non sviluppare |
| Capitolati e gare B2B | ❌ Non sviluppare |
| Scraping/parsing CV nazionale | ❌ Non sviluppare |
| Archivio manodopera pubblico | ❌ Non sviluppare |
| Video diagnosis AI | ❌ Non sviluppare |
| Chat in-app | ❌ Non sviluppare |
| App nativa iOS/Android | ❌ Non sviluppare (PWA ok Sprint 3) |
| Multi-lingua | ❌ Solo italiano |
| Integrazione gestionali artigiano | ❌ Non sviluppare |

---

## 4. Macchina a stati — Richiesta SOS

Stati **congelati**. Nessuno stato aggiuntivo senza CR.

```
draft → submitted → diagnosing → inviting → matched → completed
                              ↘ expired (nessuna accettazione)
                              ↘ cancelled (cliente, solo pre-match)
```

### Regole transizione

| Da | A | Trigger | Chi |
|----|---|---------|-----|
| draft | submitted | Cliente invia | Cliente |
| submitted | diagnosing | Sistema | Auto |
| diagnosing | inviting | AI ok + crediti artigiani disponibili | Auto |
| diagnosing | cancelled | AI fallita + cliente esce | Cliente |
| inviting | matched | Primo artigiano accetta | Artigiano |
| inviting | expired | Timer 45 min scaduto | Auto |
| matched | completed | Cliente conferma o auto dopo 7 gg | Cliente/Auto |
| * | cancelled | Cliente annulla | Solo pre-matched |

Transizioni **solo via RPC** server-side, mai da client diretto.

---

## 5. Catalogo skill pilota (congelato)

| slug | Label UI | SOS attivo |
|------|----------|:----------:|
| `idraulico` | Idraulico | ✅ |
| `elettricista` | Elettricista | ✅ |
| `fabbro` | Fabbro / serrature | ✅ |

**Max skill per artigiano:** 3 (devono includere almeno 1 skill SOS attiva).

---

## 6. UX — schermate minime obbligatorie

### Cliente SOS (7 schermate)

1. Landing + spiegazione servizio gratuito  
2. Login/registrazione  
3. Permesso GPS + verifica zona pilota  
4. Upload foto + consenso AI  
5. Conferma diagnosi (categoria + urgenza)  
6. Attesa match (stato realtime + countdown 45 min)  
7. Match confermato (contatto artigiano + riepilogo)

### Artigiano (8 schermate)

1. Registrazione + dati base  
2. Selezione skill + zona  
3. Attesa verifica admin  
4. Acquisto pacchetto / attivazione trial  
5. Home inviti (lista + dettaglio)  
6. Dettaglio invito (zona, categoria, urgenza, **no indirizzo preciso**)  
7. Accetta → vedi contatto cliente + indirizzo  
8. Storico + saldo crediti

### Admin (5 schermate)

1. Coda verifica artigiani  
2. Monitor richieste attive  
3. Dettaglio richiesta + log inviti  
4. Gestione dispute  
5. Metriche pilota (§8)

---

## 7. Requisiti non funzionali (NFR)

| ID | Requisito | Target pilota |
|----|-----------|---------------|
| NFR01 | Tempo diagnosi AI | ≤ 15 sec p95 |
| NFR02 | Tempo query geo shortlist | ≤ 200 ms p95 |
| NFR03 | Consegna notifica push | ≤ 30 sec dall'invito |
| NFR04 | Uptime piattaforma | ≥ 99,5% (escl. manutenzioni annunciate) |
| NFR05 | Retention foto SOS | 90 giorni post-completamento |
| NFR06 | Lingua | Italiano only |
| NFR07 | Browser support | Chrome/Safari mobile ultimi 2 major |
| NFR08 | Accessibilità | WCAG 2.1 AA su flusso SOS critico |
| NFR09 | Max richieste concurrent per città | 50 (throttle oltre) |

---

## 8. Metriche pilota (KPI congelati)

| KPI | Formula | Target | Frequenza review |
|-----|---------|--------|------------------|
| Richieste SOS | count submitted | ≥ 80/mese | Settimanale |
| Match rate | matched / submitted | ≥ 60% | Settimanale |
| Time to match | mediana minuti inviting→matched | ≤ 30 min | Settimanale |
| Accettazioni/artigiano | match / artigiano attivo | ≥ 1,5/mese | Mensile |
| Conversion trial→paid | paid / trial_started | ≥ 25% | Mensile |
| Churn artigiani | non_rinnovano / totale | ≤ 35% | Mensile |
| Credit utilization | consumati / venduti | ≥ 0,5 | Mensile |
| Dispute rate | dispute / matched | ≤ 5% | Mensile |
| GDPR requests | count | tracciato | Mensile |

**Decision gate settimana 12:**

- **GO scale:** match rate ≥ 60% AND conversion trial ≥ 25% AND dispute ≤ 5%  
- **ITERATE:** match rate 40–60% → ottimizzare pool/notifiche, non aggiungere feature  
- **STOP/Pivot:** match rate < 40% OR conversion trial < 15%

---

## 9. Integrazioni esterne (pilota)

| Servizio | Scopo | v1.0 |
|----------|-------|:----:|
| Supabase | Auth, DB, Storage, Realtime, Edge Functions | ✅ |
| Stripe | Pagamento pacchetti artigiano | ✅ |
| Provider AI vision | Diagnosi foto | ✅ |
| Firebase/APNs o equivalente | Push notification | ✅ |
| Twilio o equivalente | SMS fallback | ✅ Sprint 2 |
| Sentry | Error tracking | ✅ Sprint 2 |
| Google Analytics / ads | ❌ OUT | No tracker marketing pilota |

---

## 10. Compliance minima go-live

Checklist **bloccante** — nessun go-live senza:

- [ ] Informativa privacy pubblicata (cliente + artigiano)
- [ ] Consenso AI foto implementato e loggato
- [ ] Consenso GPS implementato e loggato
- [ ] Registro trattamenti Art. 30 compilato
- [ ] DPA Supabase + Stripe + AI provider
- [ ] RLS attivo su tutte le tabelle PII
- [ ] Contact vault isolato
- [ ] Procedura cancellazione testata
- [ ] Retention foto configurata (90 gg)
- [ ] Admin access auditato

→ Dettaglio legal: `BRIEF-CONSULENTE-GDPR-v1.md`

---

## 11. Change Request (CR) — come modificare il congelamento

Qualsiasi funzione marcata ❌ OUT o ⏸ FUTURO richiede:

1. **CR document** con: motivazione business, impatto GDPR, impatto timeline, owner  
2. **Approvazione** product owner  
3. **Aggiornamento** versione spec (es. v1.0 → v1.1)  
4. **Mai** scope creep silenzioso durante sprint

### Template CR minimo

```
CR-XXX: [Titolo]
Richiedente: ...
Motivazione: ...
Funzioni aggiunte: [ID da matrice §3]
Funzioni rimosse/posticipate: ...
Impatto GDPR: sì/no — dettaglio
Impatto KPI pilota: ...
Approvato: sì/no — data
```

---

## 12. Definition of Done — pilota go-live

Il pilota è **live** quando:

1. Tutte le funzioni ✅ IN di §3 operative end-to-end  
2. Checklist §10 completata  
3. Pool ≥ 50 artigiani verificati in città pilota  
4. Test di 10 richieste simulate (5 match ok, 3 expired, 2 cancelled) superati  
5. Test rimborso trial automatico superato  
6. Test export/cancellazione GDPR superato  
7. Runbook incidenti documentato (chi chiama chi)

→ Sprint planning: [`SPRINT-1-DETTAGLIATO-v1.md`](../SPRINT-1-DETTAGLIATO-v1.md) · [`docs/SPRINT-2-DETTAGLIATO-v1.md`](SPRINT-2-DETTAGLIATO-v1.md)

---

*Versione 1.0-pilot — CONGELATO*
