# Brief per consulente GDPR — AncheCasa / SuperMastro (Pilota v1.0)

**Destinatario:** Consulente legale / DPO  
**Mittente:** [Titolare del trattamento — da compilare]  
**Progetto:** anchecasa.it/sos (SuperMastro)  
**Versione:** 1.0-pilot  
**Data:** 2026-07-05  
**Scopo documento:** richiedere parere legale, supporto redazione documentazione privacy e validazione base giuridica prima del go-live pilota.

**Documenti di riferimento interni:**
- `docs/INDICE-MASTER-PILOTA-v1.md` (architettura e scope congelato)
- Product Spec v1.0, Flusso operativo artigiano, Threat model security (sessione progettazione 2026-07-05)

---

## 1. Sintesi del servizio

AncheCasa.it sta lanciando **SuperMastro** (`anchecasa.it/sos`), un servizio B2C gratuito per privati che segnalano problemi domestici (idraulica, elettricità, serrature) tramite foto e geolocalizzazione. Un motore di matching mette in contatto il privato con un artigiano verificato. **Il privato non paga**; gli artigiani pagano un pacchetto a crediti (pay-per-task).

**Modello di intermediazione:** telefono ed email di cliente e artigiano **non sono pubblici**. La piattaforma fa da ponte e sblocca i contatti **solo dopo** accettazione del match da parte dell'artigiano.

**Ambito pilota:**
- 1 città italiana + raggio ~25 km
- 3 categorie intervento
- Supply artigiani **curato manualmente** (no scraping CV al pilota)
- Durata pilota: 8–12 settimane

**Stack tecnico:** Next.js, Supabase (regione EU), Stripe, provider AI vision, push/SMS.

---

## 2. Titolare, ruoli e contatti (da compilare)

| Campo | Valore |
|-------|--------|
| Titolare del trattamento | [Ragione sociale, sede, P.IVA] |
| Rappresentante legale | [Nome] |
| Contatto privacy / DPO | [Email dedicata — es. privacy@anchecasa.it] |
| Responsabile protezione dati (DPO) | [Esterno / interno / non nominato] |
| Settore | Piattaforma digital marketplace servizi / manodopera |

**Domanda al consulente:** confermare struttura titolare/responsabile per eventuale joint controllership con artigiani (professionisti autonomi) in fase di sblocco contatto.

---

## 3. Categorie di interessati

| Categoria | Descrizione | Volume stimato pilota |
|-----------|-------------|----------------------|
| **Clienti SOS** | Privati che inviano richiesta intervento | 80–200/mese |
| **Artigiani** | Professionisti registrati e verificati | 50–150 attivi |
| **Amministratori piattaforma** | Staff verifica, dispute, supporto | 2–5 persone |
| **Interessati futuri (non pilota)** | Scraping CV nazionale, utenti B2B condominio | **Non trattati al pilota** |

---

## 4. Trattamenti svolti — registro sintetico (Art. 30)

### 4.1 Cliente SOS (privato)

| # | Trattamento | Dati trattati | Finalità | Base giuridica proposta | Conservazione proposta |
|---|-------------|---------------|----------|-------------------------|------------------------|
| C1 | Registrazione account | Email, ID auth | Creazione account, accesso servizio | Art. 6.1.b — contratto / misure precontrattuali | Durata account + 24 mesi post-cancellazione (log) |
| C2 | Geolocalizzazione richiesta | Coordinate GPS, indirizzo derivato | Matching artigiani in zona | Art. 6.1.b + consenso Art. 6.1.a (permesso dispositivo) | Durata richiesta + 24 mesi (poi anonimizzazione) |
| C3 | Upload foto problema | Immagini ambiente domestico | Diagnosi tipo intervento, condivisione con artigiano matched | **Consenso esplicito Art. 6.1.a** (checkbox dedicata) | **90 giorni** post-completamento richiesta |
| C4 | Diagnosi AI | Immagine, output categoria/urgenza | Classificazione intervento | Consenso Art. 6.1.a | Output: legato a richiesta; immagine: v. C3 |
| C5 | Matching e mediatioe | Zona, categoria, urgenza; contatti in vault | Intermediazione con artigiano | Art. 6.1.b | Fino a completamento + archivio anonimizzato |
| C6 | Sblocco contatto post-match | Telefono, email, indirizzo preciso → artigiano matched | Esecuzione prestazione | Art. 6.1.b | Audit log reveal: 24 mesi |
| C7 | Comunicazioni servizio | Email, push | Stato richiesta, notifiche match | Art. 6.1.b | Durata servizio |
| C8 | Marketing | Email | Newsletter, promozioni | Art. 6.1.a — **opt-in separato** | Fino a revoca |

### 4.2 Artigiano

| # | Trattamento | Dati trattati | Finalità | Base giuridica proposta | Conservazione proposta |
|---|-------------|---------------|----------|-------------------------|------------------------|
| A1 | Registrazione e profilo | Nome, email, telefono, foto, bio, skill, CAP/zona | Account, matching, presentazione al cliente post-match | Art. 6.1.b | Durata account |
| A2 | Verifica identità (pilota manuale) | Documento identità (se richiesto), note admin | Prevenzione frodi, qualità servizio | Art. 6.1.b + legittimo interesse Art. 6.1.f | Documento: max 12 mesi post-verifica |
| A3 | Geolocalizzazione sede/zona | CAP, raggio km, coordinate sede (no GPS live pilota) | Matching per prossimità | Art. 6.1.b | Durata account |
| A4 | Billing | Dati Stripe, transazioni, ledger crediti | Erogazione servizio a pagamento, obblighi fiscali | Art. 6.1.b + Art. 6.1.c (obbligo legale) | 10 anni (documenti contabili — confermare) |
| A5 | Inviti e match | Log inviti, accettazioni, dispute | Erogazione servizio | Art. 6.1.b | 24 mesi |
| A6 | Sblocco contatto cliente | Telefono/email cliente post-match | Esecuzione intervento | Art. 6.1.b | Audit log: 24 mesi |

### 4.3 Amministratori

| # | Trattamento | Dati | Finalità | Base giuridica proposta |
|---|-------------|------|----------|-------------------------|
| AD1 | Accesso admin panel | Dati cliente/artigiano per verifica e dispute | Gestione piattaforma | Art. 6.1.b (contratto con titolare) / legittimo interesse |
| AD2 | Audit log azioni admin | Chi, cosa, quando, IP hash | Accountability, sicurezza | Art. 6.1.f — legittimo interesse |

---

## 5. Dati particolari e dati sensibili — valutazione preliminare

| Tipo | Presente al pilota? | Rischio | Nota per consulente |
|------|:-------------------:|---------|---------------------|
| Dati sanitari (Art. 9) | No intenzionale | Basso | Foto domestiche potrebbero incidentalmente mostrarli |
| Dati biometrici | No | — | Non previsto |
| Dati che rivelano abitazione/vita privata | **Sì** | **Alto** | Foto interni casa, indirizzo, GPS |
| Dati minori | Non target | Medio | Età non verificata al pilota — serve autodichiarazione 18+? |
| Dati giudiziari | No | — | — |

**Domande al consulente:**
1. Le foto domestiche richiedono trattamento DPIA rafforzata oltre la DPIA generale?
2. Serve autodichiarazione età minima (18+) o verifica più stringente?
3. Obbligo di valutare impatto per trattamento immagini che possono includere terzi (familiari in foto)?

---

## 6. Profilazione e decisioni automatizzate (Art. 22)

| Trattamento automatizzato | Decisione con effetto giuridico? | Misure previste |
|---------------------------|:--------------------------------:|-----------------|
| Diagnosi AI (categoria intervento) | No — cliente **conferma** prima invio | Consenso + revisione umana su dispute |
| Shortlist geo 15 artigiani | No — artigiano decide accettazione | Trasparenza in informativa |
| Ranking (pilota: distanza + rotazione) | No | — |

**Domanda al consulente:** l'informativa deve includere sezione specifica Art. 22 anche se non si applica? Formulazione consigliata per diagnosi AI.

---

## 7. Modello di intermediazione contatti — requisiti privacy

### 7.1 Architettura privacy (descrizione per legale)

- Contatti (telefono, email) conservati in tabella **`contact_vault`** separata.
- Accesso client-side **negato** (Row Level Security deny-all).
- Sblocco solo tramite procedura server-side dopo match accettato.
- Log immutabile **`contact_reveals`**: chi ha visto quale contatto, quando.

### 7.2 Flusso sblocco

```
Richiesta SOS → inviti a max 15 artigiani (senza contatto cliente)
→ primo artigiano accetta → match
→ sblocco bidirezionale: cliente ↔ artigiano
→ altri invitati: accesso negato
```

### 7.3 Domande al consulente

1. Il titolare è **responsabile** del trattamento dei dati di contatto di entrambe le parti o esiste contitolarità con l'artigiano dal momento del match?
2. Serve **accordo tra titolari** (Art. 26) con artigiani per la fase post-match?
3. L'artigiano, una volta ricevuto il contatto, diventa titolare autonomo per il rapporto commerciale offline — come informativa deve descriverlo?
4. Obbligo di **DPA (Art. 28)** con artigiani se qualificati responsabili del trattamento?

---

## 8. Trasferimenti extra-UE e sub-responsabili

### 8.1 Sub-responsabili previsti (pilota)

| Fornitore | Servizio | Sede / hosting | Dati trattati | DPA |
|-----------|----------|----------------|---------------|:---:|
| **Supabase Inc.** | DB, auth, storage, realtime | **EU (Frankfurt)** — confermare | Tutti i dati piattaforma | ☐ Da firmare |
| **Stripe** | Pagamenti artigiani | UE/US — verificare | Email, dati pagamento, customer ID | ☐ Da firmare |
| **Provider AI vision** | [Da selezionare — es. OpenAI, Anthropic, Google] | Probabilmente US | **Solo immagine SOS** (senza nome/indirizzo nel prompt) | ☐ Da firmare |
| **Provider push** | [Firebase / OneSignal / altro] | Verificare | Token dispositivo, ID utente | ☐ Da firmare |
| **Provider SMS** | [Twilio / altro] | Verificare | Numero telefono, testo minimale | ☐ Da firmare |
| **Vercel** (o hosting Next.js) | Hosting frontend | Verificare | Log accesso, IP | ☐ Da firmare |

### 8.2 Misure tecniche verso sub-responsabili AI

- Invio all'LLM: **solo immagine** + metadati tecnici (no nome cliente, no indirizzo nel prompt).
- Contratto: no training su dati cliente; retention limitata (target ≤ 30 giorni lato provider).
- Valutazione **modello EU-hosted** come alternativa.

**Domande al consulente:**
1. Trasferimento immagini verso provider AI US: SCC + TIA sufficienti o preferire soluzione EU-only?
2. Elenco sub-responsabili nell'informativa: elenco statico o link aggiornabile?
3. Supabase EU region: conferma che non avviene replica US non necessaria?

---

## 9. Misure tecniche e organizzative (Art. 32) — stato progetto

| Misura | Implementazione prevista | Stato |
|--------|-------------------------|:-----:|
| Cifratura in transito | HTTPS/TLS | Previsto |
| Cifratura at rest | Supabase default + storage privato | Previsto |
| Pseudonimizzazione AI | No PII nel prompt LLM | Previsto |
| Controllo accessi | RLS su tutte le tabelle; vault isolato | Previsto |
| Autenticazione admin | MFA obbligatorio | Previsto pre go-live |
| Audit log | contact_reveals, admin actions, consent_records | Previsto |
| Backup | Supabase automatic backup | Previsto |
| Retention automatizzata | Job cancellazione foto 90 gg | Sprint 2 |
| Test sicurezza | Pen test leggero RLS pre go-live | Previsto |
| Formazione staff admin | Runbook privacy | Da organizzare |

**Allegato tecnico disponibile:** Threat model security (Doc 3) con attacchi P0 e checklist pre go-live.

---

## 10. Diritti degli interessati (Art. 15–22) — procedura proposta

| Diritto | Canale | SLA interno | Note implementative |
|---------|--------|:-----------:|---------------------|
| Accesso | privacy@[dominio] | 30 giorni | Export JSON profilo + richieste + consensi |
| Rettifica | Self-service + supporto | 30 giorni | Profilo artigiano/cliente |
| Cancellazione | Richiesta email + self-service (Sprint 2) | 30 giorni | Anonimizza profilo; conserva ledger anonimizzato se obbligo fiscale |
| Limitazione | Flag account | 30 giorni | Blocca matching/inviti |
| Portabilità | Export JSON | 30 giorni | Dati forniti dall'interessato |
| Opposizione marketing | Link disiscrizione | Immediato | Solo se opt-in marketing |
| Revoca consenso AI/GPS | In-app + email | Immediato | Revoca GPS blocca nuove richieste SOS |

**Domande al consulente:**
1. Testo obbligatorio per risposta Art. 15 (accesso) — template consigliato?
2. Cancellazione vs obbligo conservazione ledger fiscale artigiano: come conciliare?
3. Serve registro delle richieste diritti (Art. 30)?

---

## 11. Consensi — granularità richiesta

### 11.1 Consensi obbligatori pilota

| Consenso | Momento | Revocabile | Conseguenza revoca |
|----------|---------|:----------:|-------------------|
| Privacy generale + contratto | Registrazione | Parziale | Impossibile usare servizio |
| Geolocalizzazione GPS | Prima richiesta SOS | Sì | Impossibile inviare richiesta |
| Analisi AI foto | Prima upload, checkbox separata | Sì | Impossibile procedere senza AI (pilota) |
| Notifiche push (artigiano) | Attivazione account | Sì | Rischio mancati inviti |

### 11.2 Consenso opzionale

| Consenso | Momento |
|----------|---------|
| Marketing / newsletter | Registrazione — **non pre-spuntato** |

**Domande al consulente:**
1. Formulazione consenso AI foto — testo legale consigliato (IT)?
2. Consenso geolocalizzazione: basta permesso OS + informativa o serve checkbox aggiuntiva?
3. Versioning consensi: obbligo re-consenso se cambia informativa?

**Implementazione tecnica:** tabella `consent_records` con `purpose`, `version`, `granted_at`, `withdrawn_at`, `ip_hash`.

---

## 12. Informativa privacy — sezioni richieste

Chiediamo redazione o revisione di **due informative distinte**:

1. **Informativa Cliente SOS** (`anchecasa.it/sos/privacy`)
2. **Informativa Artigiano** (`anchecasa.it/artigiano/privacy`)

### Contenuti minimi da coprire (checklist Art. 13)

- [ ] Identità titolare e contatti DPO
- [ ] Finalità e base giuridica per ogni trattamento (tabella §4)
- [ ] Categorie dati e origine
- [ ] Destinatari e sub-responsabili (§8)
- [ ] Trasferimenti extra-UE se applicabili
- [ ] Periodo conservazione (§4 e §13)
- [ ] Diritti interessato + reclamo Garante
- [ ] Natura obbligatoria/facoltativa conferimento dati
- [ ] Processo decisionale automatizzato / profilazione (§6)
- [ ] Modello intermediazione contatti (§7)
- [ ] Cookie policy (solo tecnici al pilota — confermare)

**Domanda al consulente:** un'unica informativa con sezioni o due documenti separati?

---

## 13. Cookie e tracking

**Pilota:** solo cookie tecnici/necessari (sessione auth Supabase).

- **No** Google Analytics al pilota
- **No** cookie marketing / remarketing
- **No** pixel social

**Domanda al consulente:** cookie banner necessario con soli cookie tecnici post-ePrivacy? Policy cookie minimale sufficiente?

---

## 14. DPIA — richiesta di supporto

### 14.1 Fattori di rischio identificati

| Fattore | Descrizione |
|---------|-------------|
| Geolocalizzazione sistematica | GPS su ogni richiesta SOS |
| Dati ambienti privati | Foto interni abitazione |
| Intermediazione contatti | Vault PII ad alto rischio se violato |
| Trattamento automatizzato | Diagnosi AI |
| Interessati vulnerabili | Possibile presenza anziani (non target esplicito) |
| Nuova tecnologia | Matching AI-assisted |

### 14.2 Richiesta

Chiediamo al consulente di:
1. Confermare se DPIA è **obbligatoria** per il pilota
2. Compilare o supervisionare DPIA utilizzando questo brief + threat model
3. Indicare misure residuali accettabili e eventuali condizioni al go-live

---

## 15. Registro trattamenti (Art. 30)

Chiediamo supporto per compilazione registro trattamenti completo a partire da §4.

**Trattamenti esclusi al pilota (menzionare come "pianificati / non attivi"):**
- Scraping e parsing CV nazionale (Supply Archivio Manodopera)
- Dashboard B2B condomini/aziende
- Video diagnosis AI

**Domanda al consulente:** per trattamenti futuri (scraping CV), base giuridica attualmente **non identificata** — richiediamo parere preventivo separato prima di attivazione.

---

## 16. Scraping CV — parere preventivo (NON pilota, urgente strategico)

> **Nota:** non attivo al pilota, ma core business futuro. Richiediamo parere scritto prima di qualsiasi ingest.

Trattamento ipotizzato:
- Raccolta dati professionali da fonti pubbliche/semi-pubbliche (portali lavoro, profili professionali)
- Parsing AI CV
- Profilazione skill + geolocalizzazione
- Contatto artigiano per "reclamo profilo"

**Domande al consulente:**
1. Base giuridica applicabile (legittimo interesse Art. 6.1.f vs consenso)?
2. Compatibilità con orientamenti Garante su scraping/profilazione professionale?
3. Obbligo informativa ex Art. 14 (dati non ottenuti dall'interessato)?
4. Diritto opposizione: come gestire su scala nazionale?
5. Consigliate alternative legali (registrazione volontaria artigiano only)?

---

## 17. Clausole contrattuali

Chiediamo redazione/revisione di:

| Documento | Parti |
|-----------|-------|
| **Termini di servizio Cliente SOS** | Titolare ↔ Cliente |
| **Termini di servizio Artigiano** | Titolare ↔ Artigiano |
| **Accordo trattamento dati (DPA)** | Titolare ↔ Supabase, Stripe, AI provider |
| **Accordo contitolarità (se necessario)** | Titolare ↔ Artigiano post-match |
| **Informativa + consenso marketing** | Opt-in |

**Punti specifici da includere nei ToS artigiano:**
- Modello pay-per-task e trial rimborsabile
- Obbligo contattare cliente entro 15 min post-match
- Divieto uso contatto cliente per scopi diversi dall'intervento richiesto
- Conseguenze no-show e sospensione account

---

## 18. Data breach — procedura proposta

| Fase | Tempo | Azione |
|------|-------|--------|
| Rilevamento | 0–1h | Alert tecnico, triage |
| Containment | 1–4h | Revoca sessioni, rotazione chiavi se vault compromesso |
| Valutazione | 4–24h | Impatto, categorie dati, n. interessati |
| Notifica Garante | ≤72h | Se rischio per diritti e libertà (Art. 33) |
| Notifica interessati | Senza indebito ritardo | Se alto rischio (Art. 34) |
| Documentazione | Permanente | Registro breach interno |

**Scenario prioritario:** violazione `contact_vault` o bucket foto SOS.

**Domanda al consulente:** template notifica Garante e comunicazione interessati.

---

## 19. Conservazione dati — tabella riepilogativa

| Dato | Periodo | Dopo scadenza |
|------|---------|---------------|
| Foto SOS | 90 gg post-completamento | Cancellazione storage |
| Richiesta SOS (metadata) | 24 mesi | Anonimizzazione |
| Contatti vault | Durata account | Cancellazione o anonimizzazione |
| Audit contact_reveals | 24 mesi | Archivio / cancellazione |
| Consent records | 5 anni (proposta) | Cancellazione |
| Ledger crediti / fatture Stripe | 10 anni (proposta — **confermare**) | Obbligo legale |
| Log admin | 24 mesi | Cancellazione |
| Documenti verifica artigiano | 12 mesi post-verifica | Cancellazione |

**Domanda al consulente:** conferma periodi o rettifica in base a settore e normativa fiscale.

---

## 20. Checklist go-live GDPR — condizioni legali

Il go-live pubblico pilota **non deve procedere** senza:

- [ ] Parere scritto consulente su basi giuridiche §4
- [ ] DPIA completata e approvata (se obbligatoria)
- [ ] Informative cliente + artigiano pubblicate
- [ ] Cookie policy (se necessaria) pubblicata
- [ ] Registro trattamenti Art. 30 compilato
- [ ] DPA firmati con sub-responsabili attivi (Supabase, Stripe, AI)
- [ ] ToS cliente e artigiano pubblicati
- [ ] Procedura diritti interessato documentata e testata
- [ ] Procedura data breach documentata
- [ ] Consensi granulari implementati (AI, GPS, marketing separato)
- [ ] Contatto privacy attivo e monitorato

*(Allineato a gate G6–G8 in `INDICE-MASTER-PILOTA-v1.md` §6.2)*

---

## 21. Deliverable richiesti al consulente

| # | Deliverable | Priorità |
|---|-------------|:--------:|
| L1 | Parere base giuridica trattamenti pilota (§4) | **P0** |
| L2 | Redazione/revisione 2 informative privacy | **P0** |
| L3 | DPIA pilota (compilazione o supervisione) | **P0** |
| L4 | Registro trattamenti Art. 30 | **P0** |
| L5 | ToS Cliente + Artigiano | **P1** |
| L6 | Template consensi (AI, GPS, marketing) | **P1** |
| L7 | Verifica DPA sub-responsabili | **P1** |
| L8 | Procedura diritti interessato + template risposte | **P1** |
| L9 | Procedura data breach + template notifiche | **P1** |
| L10 | Parere preventivo scraping CV (non pilota) | **P2** |
| L11 | Parere contitolarità titolare/artigiano post-match | **P1** |

**Timeline richiesta:**
- L1, L6, L11: entro **2 settimane** (parallelamente a Sprint 1 dev)
- L2–L5, L7–L9: entro **4 settimane** (prima go-live)
- L10: entro **8 settimane** (pre roadmap supply)

---

## 22. Allegati disponibili su richiesta

1. Product Spec congelato v1.0 (matrice funzioni IN/OUT)
2. Flusso operativo artigiano (consensi, sblocco contatto, dispute)
3. Threat model security (misure tecniche Art. 32)
4. Indice master pilota (`docs/INDICE-MASTER-PILOTA-v1.md`)
5. Schema database concettuale (entità: contact_vault, consent_records, credit_ledger)

---

## 23. Contatti progetto per il consulente

| Ruolo | Nome | Email | Telefono |
|-------|------|-------|----------|
| Product owner | [___] | [___] | [___] |
| Referente tecnico | [___] | [___] | [___] |
| Referente ops | [___] | [___] | [___] |

---

## 24. Dichiarazione del mittente

Il sottoscritto [Nome, Ruolo] dichiara che le informazioni contenute in questo brief riflettono fedelmente l'architettura e i flussi pianificati per il pilota v1.0 SuperMastro, con esclusione esplicita dello scraping CV fino a parere legale dedicato.

Data: _______________  
Firma: _______________

---

*Documento interno — versione 1.0-pilot — non costituisce parere legale. Validazione giuridica obbligatoria prima del go-live.*
