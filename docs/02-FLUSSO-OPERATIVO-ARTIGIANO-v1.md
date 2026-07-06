# Flusso operativo artigiano — Pilota SuperMastro v1.0

**Progetto:** AncheCasa.it / SuperMastro  
**Versione:** 1.0-pilot  
**Riferimento:** `01-PRODUCT-SPEC-PILOTA-v1.md`  
**Obiettivo:** descrivere **chi fa cosa, quando e con quale esito** — dall'ingresso dell'artigiano fino a dispute e rimborso crediti

---

## 1. Panoramica del ciclo di vita artigiano

```
Registrazione → Onboarding profilo → Verifica admin → Attivazione billing → Operativo
     → Riceve inviti → Accetta/Rifiuta → Match + unlock → Intervento → Chiusura
```

### Stati account artigiano (congelati)

| Stato | Significato | Può ricevere inviti? | Può accettare? |
|-------|-------------|:--------------------:|:--------------:|
| `registered` | Account creato, profilo incompleto | ❌ | ❌ |
| `pending_verification` | Profilo completo, in coda admin | ❌ | ❌ |
| `verified` | Approvato da admin | ❌ | ❌ |
| `active` | Verificato + billing ok (trial o pacchetto) | ✅ | ✅ |
| `suspended` | Blocco temporaneo (dispute, frode) | ❌ | ❌ |
| `deactivated` | Uscita volontaria o ban | ❌ | ❌ |

**Nota:** `verified` senza crediti: profilo ok ma **non operativo** finché non attiva trial o acquista pacchetto.

---

## 2. Fase 0 — Acquisizione (pre-registrazione)

**Attore:** Ops locale / Community manager  
**Durata tipica:** 1–2 settimane prima del go-live città

| Step | Azione | Output |
|------|--------|--------|
| 0.1 | Identificare 80–120 artigiani target (idraulico, elettricista, fabbro) | Lista prospect |
| 0.2 | Contatto telefonico/WhatsApp: presentazione SuperMastro | Interesse sì/no |
| 0.3 | Spiegare modello: **5 crediti/mese**, privato non paga, trial rimborsato | Consenso a registrarsi |
| 0.4 | Inviare link registrazione dedicato (`/artigiano/iscrizione?ref=pilot_[città]`) | Tracking acquisizione |
| 0.5 | Target pre-launch: **≥ 50 profili `active`** | Pool minimo go-live |

**Regola pilota:** nessun invito SOS reale finché il pool non raggiunge 50 `active`.

---

## 3. Giorno 1 — Registrazione e onboarding profilo

### Step 1 — Registrazione account (5–10 min)

**Attore:** Artigiano · **Canale:** Mobile o desktop

| # | Azione artigiano | Sistema | Validazione |
|---|------------------|---------|-------------|
| 1.1 | Apre link iscrizione artigiano | Landing dedicata (≠ SOS cliente) | — |
| 1.2 | Inserisce email + accetta ToS piattaforma | Crea `users` + `workers` (status: `registered`) | Email univoca |
| 1.3 | Conferma email (magic link / OTP) | Auth completata | — |
| 1.4 | Accetta informativa privacy artigiano | Log in `consent_records` | Obbligatorio |

**Messaggio post-registrazione:**  
*"Completa il profilo per entrare in verifica. Senza verifica non riceverai richieste di lavoro."*

### Step 2 — Profilo operativo (10–15 min)

| # | Campo | Obbligatorio | Note |
|---|-------|:------------:|------|
| 2.1 | Nome e cognome / ragione sociale | ✅ | Visibile al cliente post-match |
| 2.2 | Foto profilo | ✅ | Min 400×400, volto o logo |
| 2.3 | Telefono | ✅ | Va in `contact_vault`, cifrato |
| 2.4 | Email contatto | ✅ | Può coincidere con login |
| 2.5 | Skill (1–3 da catalogo pilota) | ✅ | Almeno 1 tra idraulico/elettricista/fabbro |
| 2.6 | CAP sede + raggio operativo (km) | ✅ | Default 15 km, max 25 km |
| 2.7 | Bio breve | ✅ | Max 300 caratteri |
| 2.8 | Partita IVA | ⏸ Opzionale pilota | Richiesta per fattura Stripe |

**Al completamento:** `workers.status` → `pending_verification` · email *"Verifica entro 48 ore lavorative"*

### Step 3 — Consensi specifici artigiano

| Consenso | Obbligatorio | Quando |
|----------|:------------:|--------|
| Trattamento dati contrattuali | ✅ | Registrazione |
| Geolocalizzazione sede (CAP) | ✅ | Profilo |
| Notifiche push | ✅ | Prima attivazione |
| Notifiche SMS fallback | ✅ | Profilo (telefono) |
| Marketing AncheCasa | ❌ | Opt-in separato |

---

## 4. Giorni 1–3 — Verifica admin

**Attore:** Admin piattaforma · **SLA interno:** 48 ore lavorative (obiettivo 24h)

### Checklist admin

| # | Controllo | Pass | Fail |
|---|-----------|------|------|
| V1 | Foto profilo adeguata | ✅ | Richiedi nuova foto |
| V2 | Skill coerenti con attività reale | ✅ | Correggi o rifiuta |
| V3 | Zona operativa dentro pilot zone | ✅ | Chiedi modifica raggio |
| V4 | Telefono raggiungibile (chiamata spot 20%) | ✅ | Sospendi finché verificato |
| V5 | Nome non generico / non duplicato | ✅ | Flag possibile frode |
| V6 | Documento identità o visura (opzionale) | ✅ | Richiesto se dubbio |

### Esiti verifica

| Esito | Stato | Prossimo step |
|-------|-------|---------------|
| **Approvato** | `verified` | → Billing |
| **Correzioni** | `registered` | Artigiano corregge → torna in coda |
| **Rifiutato** | `deactivated` | Fine |

**Regola:** admin **non** imposta mai `active` manualmente senza passare dal billing.

---

## 5. Giorno 3–4 — Attivazione billing (trial o pacchetto)

**Prerequisito:** status `verified`

### Percorso A — Trial rimborsato (consigliato pilota)

| # | Step | Esito |
|---|------|-------|
| B1 | Clic "Prova 5 interventi — rimborso se zero lavori" | — |
| B2 | Inserisce carta (Stripe) | Crea `billing_accounts` |
| B3 | Attivazione trial | Ledger: `+5` type `trial_grant` |
| B4 | Status → `active` | ✅ Operativo |

**Condizioni trial:**
- 5 crediti validi per il **mese solare corrente**
- Se a fine mese **zero match accettati** → rimborso automatico importo trial (Sprint 2)
- Se ≥ 1 match → trial utilizzato, nessun rimborso importo
- Crediti non consumati **non** rollano (pilota)

### Percorso B — Acquisto pacchetto diretto

Pagamento Stripe → Ledger `+5` `purchase` → `active`

### Esito negativo pagamento

Resta `verified` · reminder email 24h e 72h · dopo 14 giorni: tag `dormant`

---

## 6. Giorno 5+ — Operatività: ricezione inviti

### 6.1 Quando un artigiano entra nella shortlist

**Trigger:** richiesta SOS → stato `inviting`

**Sistema (automatico):**
1. Query geo + skill → top 15 artigiani `active` con `credit_balance > 0`
2. Esclude ≥ 5 inviti nelle ultime 2 ore (anti-spam)
3. Esclude `suspended`
4. Scrive 15 righe in `request_invitations`
5. Invia notifiche

**Rotazione pilota:** distanza ASC → meno match ultimi 30 gg ASC → tier DESC

### 6.2 Cosa vede l'artigiano (pre-accettazione)

| Visibile | Nascosto |
|----------|----------|
| Categoria, urgenza, distanza, quartiere | Nome, telefono, indirizzo, foto |

### 6.3 Notifiche — sequenza e fallback

```
t=0     → Push invito
t+2 min → Se push non delivered → SMS fallback (Sprint 2)
```

| Canale | Contenuto | Divieto |
|--------|-----------|---------|
| Push | Categoria + distanza + urgenza | No telefono, no indirizzo |
| SMS | "Intervento [cat] vicino a te. Apri app entro 45 min." | No dati cliente |

**SLA:** push entro 30 sec dall'invito (NFR03)

### 6.4 Azioni artigiano su invito

| Azione | Credito |
|--------|:-------:|
| Ignora | — |
| Rifiuta | — |
| **Accetta** | **−1** |

**First-accept-wins:** transazione atomica; secondo artigiano → *"Intervento già assegnato"*

---

## 7. Momento match — accettazione e sblocco contatto

| # | Evento | Artigiano vede | Cliente vede |
|---|--------|----------------|--------------|
| 7.1 | Accetta | — | — |
| 7.2 | Match creato | Conferma | "Mastro trovato!" |
| 7.3 | Consumo credito | Balance −1 | — |
| 7.4 | Unlock contatti | Tel, indirizzo, foto | Nome, tel artigiano |
| 7.5 | Audit | — | `contact_reveals` log |

**Messaggio in-app artigiano:**  
*"Contatta il cliente entro 15 minuti. Il credito è stato scalato. Segnala entro 2 ore in caso di errore."*

**Altri 14 invitati:** invito `expired`/`superseded` · nessun consumo credito

---

## 8. Esecuzione intervento — fase offline

Fuori piattaforma: chiamata, sopralluogo, preventivo, pagamento diretto.

**Unico touchpoint post-match:** cliente conferma "L'artigiano si è presentato?" entro 24h · auto-complete a 7 gg

---

## 9. Chiusura richiesta

| Scenario | Stato | Credito |
|----------|-------|:-------:|
| Intervento ok | `completed` | Consumato |
| Auto-complete 7 gg | `completed` | Consumato |
| Dispute favore artigiano | `completed` | Consumato |
| Dispute favore cliente | `completed`/`cancelled` | **+1 refund** |
| Bug sistema entro 2h | `cancelled` | **+1 refund** |

---

## 10. Dispute — flusso operativo completo

### 10.1 Chi può aprire dispute

| Tipo | Apertura | Finestra |
|------|----------|----------|
| **D1 — No-show artigiano** | Cliente | 48h post-match |
| **D2 — Errore categoria** | Cliente o artigiano | 2h post-accettazione |
| **D3 — Contatto errato / doppio match** | Artigiano | 2h post-accettazione |
| **D4 — Frode / abuso** | Admin | Anytime |

### 10.2 Flusso

```
Apertura → under_review → Admin valuta entro 72h
  → Favore cliente: rimborso credito artigiano
  → Favore artigiano: chiusura senza rimborso
  → Inconcluso: richiesta evidenze → rivalutazione
```

### 10.3 Matrice decisioni admin (congelata)

| Caso | Esito | Credito |
|------|-------|:-------:|
| No-show, artigiano non risponde | Favore cliente | +1 refund |
| No-show, artigiano prova contatto | Favore artigiano | Nessun refund |
| Categoria AI sbagliata | Favore artigiano | +1 refund |
| Accetta per errore entro 5 min | Favore artigiano | +1 refund (max 1/mese) |
| Cliente annulla post-unlock senza motivo | Favore artigiano | Nessun refund |
| Bug doppio match | Favore artigiano | +1 refund auto |

**Limite:** max **2 refund** `dispute_refund` / artigiano / mese

### 10.4 Comunicazioni dispute

| Evento | Destinatario |
|--------|--------------|
| Apertura | Artigiano + admin |
| Risoluzione | Entrambi + log admin (motivazione ≥ 50 char) |

---

## 11. Rimborso trial — fine mese (Sprint 2)

**Trigger:** job automatico **giorno 1** mese successivo, ore 06:00

Per ogni trial mese M:
- Match accettati = 0 → Stripe refund + email
- Match ≥ 1 → nessun rimborso importo

Crediti trial non usati **scadono** a fine mese.

---

## 12. Rinnovo pacchetto — ciclo mensile

| Evento | Azione |
|--------|--------|
| Crediti = 0 | Escluso da shortlist · push "Crediti esauriti" |
| Acquisto nuovo pacchetto | Ledger +5 · operativo |
| 7 gg senza crediti | Tag `inactive_billing` · email win-back |
| 30 gg senza crediti | Status → `verified` (non active) |

---

## 13. Sospensione e uscita

### Motivi sospensione

| Motivo | Durata |
|--------|--------|
| 3 dispute perse in 30 gg | 14 gg |
| No-show confermati ≥ 2 | 30 gg |
| Contatto cliente pre-match | 60 gg / ban |
| Frode pagamento | Permanente |

### Uscita volontaria

1. Richiesta cancellazione  
2. Completa match aperti  
3. Anonimizza profilo · revoca consensi  
4. Ledger conservato anonimizzato (fiscale)  
5. Conferma entro 30 giorni (GDPR)

---

## 14. Calendario operativo

### Prima settimana artigiano

| Giorno | Artigiano | Admin |
|--------|-----------|-------|
| L | Registrazione + profilo | — |
| M | — | Verifica |
| M | Trial → `active` | — |
| Go-live | Riceve inviti | Monitor |

### Settimana tipo operativo

| Fascia | Comportamento |
|--------|---------------|
| 08:00–20:00 | Rispondere inviti entro 15 min |
| Post-match | Chiamare cliente entro 15 min |
| Fine giornata | Verificare saldo crediti |

---

## 15. Runbook ops — scenari critici

| # | Scenario | Azione | Owner |
|---|----------|--------|-------|
| R1 | Nessuna accettazione 45 min | Seconda ondata manuale 10 artigiani | Ops |
| R2 | Stripe webhook down | Riconciliazione manuale entro 4h | Tech |
| R3 | Push non funzionano | SMS-only mode | Tech |
| R4 | Credito scalato senza accettare | Verifica log; refund se bug | Admin + Tech |
| R5 | Cliente riceve 2 call artigiani | Sospendi matching; refund auto | Tech |
| R6 | Pool < 30 active | Pausa acquisizione clienti SOS | Ops |
| R7 | Diagnosi AI down | Admin classifica o pausa SOS | Tech |

---

## 16. KPI operativi artigiano

| KPI | Target | Azione se sotto |
|-----|--------|-----------------|
| Tempo risposta invito | ≤ 10 min mediana | Training + reminder |
| Tasso accettazione inviti | 20–40% | Normale |
| Tasso rifiuto esplicito | < 30% | Review skill/geo |
| No-show rate | < 5% | Warning → sospensione |
| Dispute rate | < 5% | Review AI categoria |
| Churn post-trial | < 35% | Win-back |
| Credit utilization | ≥ 0,5 | << 0,3 → poco lavoro reale |

---

## 17. Template comunicazioni (copy congelato)

### Push — nuovo invito
> **SuperMastro** — Intervento *{categoria}* a *{distanza} km* · Urgenza *{alta|media}*. Hai 45 min per accettare.

### Push — match confermato (artigiano)
> **Match confermato.** Contatta il cliente entro 15 min. Tel: *{telefono}*. Indirizzo in app.

### Push — credito esaurito
> I tuoi crediti sono finiti. Acquista un pacchetto per ricevere nuovi interventi.

### Email — trial rimborsato
> Ciao *{nome}*, nel mese scorso non hai ricevuto interventi. Abbiamo rimborsato il trial.

→ Copy completo: `NAMING-COPY-SUPERMASTRO-v1.md`

---

## 18. Definition of Done — flusso artigiano testato

| # | Scenario | Esito |
|---|----------|-------|
| T1 | Registrazione → verifica → trial → active | ✅ |
| T2 | Invito → accetta → unlock → credito −1 | ✅ |
| T3 | Invito → rifiuta → credito invariato | ✅ |
| T4 | Due accettazioni simultanee → uno solo match | ✅ |
| T5 | Dispute no-show → refund credito | ✅ |
| T6 | Fine mese zero match trial → refund Stripe | ✅ Sprint 2 |

---

*Versione 1.0-pilot — allineato a Product Spec e Threat Model*
