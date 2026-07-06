# Change Request — Modulo Recruitment Nationwide v1.0

**Progetto:** AncheCasa / SuperMastro  
**CR-ID:** CR-2026-RECRUITMENT-01  
**Data:** 6 luglio 2026  
**Stato:** APPROVATO per implementazione  
**Riferimento pilota:** `01-PRODUCT-SPEC-PILOTA-v1.md` (principio P6)

---

## 1. Motivazione

Popolamento urgente del talent pool nazionale: iscrizione lavoratori (artigiani e dipendenti) in tutta Italia, con match datore-candidato per condomini, hotel e PMI. Il pilota SOS resta invariato nella zona e nelle categorie attive.

---

## 2. Scope IN (nuovo)

| ID | Funzione | Note |
|----|----------|------|
| R01 | Iscrizione talent nationwide (CAP qualsiasi comune IT) | Dual entry SuperMastro + AncheCasa |
| R02 | Profilo biforcato: artigiano (P.IVA) / dipendente | Stesso DB `workers` |
| R03 | Catalogo skill ampliato (edilizia, ufficio, logistica, Horeca) | SOS matching solo su `sos_enabled` |
| R04 | Registrazione organizzazione datore | Condominio, hotel, ditta |
| R05 | Pubblicazione fabbisogno lavoro (`job_requests`) | Shortlist geo + skill |
| R06 | Notifica candidati e risposta sì/no | Match mediato, vault contatti |
| R07 | Dashboard admin Recruitment | Accanto a verifica SOS |
| R08 | Pagine legali aggiornate | Recruitment + disclaimer SOS vs nationwide |

---

## 3. Scope INVARIATO (pilota SOS)

| Regola | Dettaglio |
|--------|-----------|
| SOS geo | Zona pilota + raggio 25 km per inviti urgenti |
| SOS categorie | idraulico, elettricista, fabbro (`sos_enabled = true`) |
| Privato SOS | Gratuito |
| Artigiano SOS | Crediti / trial su accettazione match SOS |
| Contatti mediati | Vault fino a match reciproco |

---

## 4. Scope POSTICIPATO

- App nativa iOS/Android  
- Chat in-app  
- Scraping CV nazionale  
- Marketplace pubblico browse profili  
- Somministuzione diretta (APL partnership)  
- Geocoding CAP preciso per ogni comune (fase 1: approssimazione)

---

## 5. Impatto documentazione

Aggiornare post-go-live: `01-PRODUCT-SPEC`, `NAMING-COPY`, `DESIGN-SYSTEM` sezione hub recruitment.

---

## 6. Approvazione

| Ruolo | Stato |
|-------|-------|
| Product Owner | Approvato (urgenza popolamento) |
| Tech | Implementato in CR-2026-RECRUITMENT-01 |
| Legal | Privacy/Termini v1.1 recruitment |
