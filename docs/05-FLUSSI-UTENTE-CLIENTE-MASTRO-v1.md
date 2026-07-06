# Flussi utente — Cliente e mastro (pilota v1.0)

**Progetto:** AncheCasa.it / SuperMastro  
**Versione:** 1.0-pilot  
**Riferimenti:** [Product Spec](01-PRODUCT-SPEC-PILOTA-v1.md) · [Flusso artigiano](02-FLUSSO-OPERATIVO-ARTIGIANO-v1.md)

---

## Idea chiave

SuperMastro **non** è:

- un sito “cerca idraulico Roma” con elenco e contatti;
- un portale lavoro dove l’operaio cerca annunci.

È un **marketplace a invito**: la cliente descrive il problema; la piattaforma capisce il mestiere e **propone la richiesta ai mastri in zona**; il mastro **accetta o rifiuta** gli inviti.

---

## URL di ingresso

| Ruolo | URL canonico | Alias |
|-------|--------------|-------|
| Cliente | `https://anchecasa.it/supermastro` | `/sos` → redirect 301 |
| Mastro | `https://anchecasa.it/artigiano` | `/artigiano/iscrizione` → login |
| Admin | `https://anchecasa.it/admin` | — |

Stesso dominio, **due ingressi distinti**, stesso backend Supabase.

---

## 1. Mastro — iscrizione e lavoro

| Step | Azione | Route app |
|------|--------|-----------|
| 1 | Entra nell’area mastri | `/artigiano` |
| 2 | Registrati / accedi | `/artigiano/auth/login` o `/artigiano/iscrizione` |
| 3 | Magic link email (no password) | callback → onboarding se profilo incompleto |
| 4 | Completa profilo | `/artigiano/onboarding` |
| 5 | Attende verifica admin | stato `pending_verification` |
| 6 | Admin approva | `/admin/verifica` |
| 7 | Attiva trial | dashboard `/artigiano` |
| 8 | Riceve inviti SOS | `/artigiano/inviti` |

### Stati account

```
registered → pending_verification → verified → active
```

Solo `active` (con crediti) può accettare inviti.

**Nota:** il mastro **non cerca lavori** in una bacheca — riceve inviti pushati dal matching geografico + competenza.

---

## 2. Cliente — richiesta SOS (es. idraulico)

| Step | Azione | Route app |
|------|--------|-----------|
| 1 | Landing SuperMastro | `/supermastro` |
| 2 | Accedi (magic link) | `/supermastro/auth/login?next=/supermastro/nuova` |
| 3 | Wizard SOS | `/supermastro/nuova` |
| 4a | GPS | verifica zona pilota (`check_pilot_zone`) |
| 4b | Foto | upload + consenso AI |
| 4c | Diagnosi | mestiere suggerito (es. idraulico) |
| 4d | Conferma | telefono + invio ai mastri |
| 5 | Attesa matching | `/supermastro/richiesta/[id]` |
| 6 | Match | contatto mastro (`MatchedContactCard`) |

**Nota:** la cliente **non sceglie** un idraulico da elenco — foto + posizione → diagnosi → matching automatico.

---

## 3. Cosa vede ciascuno

**Cliente:** home SOS, login, nuova richiesta, stato richiesta, account, pagine legali.

**Mastro:** area scura dedicata, onboarding, dashboard stato/crediti, inviti, dettaglio match.

**Admin:** verifica profili, monitor richieste, dispute, metriche.

---

## 4. Vincoli pilota

- **Zona:** richieste fuori zona pilota bloccate (Roma al go-live).
- **Go-live pubblico:** flag `pilot_public` in admin impostazioni.
- **Deploy:** route Cloudflare in `.deploy/project.json`.

---

## 5. Risposte rapide

| Domanda | Risposta |
|---------|----------|
| Come si iscrive l’operaio? | `/artigiano` → magic link → onboarding → verifica admin → trial → inviti |
| Come trova l’idraulico la casalinga? | `/supermastro` → richiesta SOS con foto/GPS → matching automatico |
