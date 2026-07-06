# Design System — SuperMastro / AncheCasa v1.1

**Versione:** 1.1-pilot (Modern Light IT)  
**Stack:** Tailwind CSS 4 · CVA · Framer Motion · Lucide  
**Riferimento copy:** [NAMING-COPY-SUPERMASTRO-v1.md](NAMING-COPY-SUPERMASTRO-v1.md)

---

## 1. Principi

| Principio | Applicazione |
|-----------|--------------|
| Chiaro e moderno | Sfondo `#f5f5f7`, card bianche, ombre soft — **no tema scuro** |
| Marketplace italiano | Modulo iscrizione semplice (Homedeal-style) + mappa Italia |
| Due ingressi, un linguaggio | `/supermastro` e `/artigiano` stesso stile light |
| Motion leggero | Rotazione messaggi sulla mappa; `prefers-reduced-motion` rispettato |
| Accent mirato | Blu brand (cliente), amber solo CTA monetizzazione mastro |

---

## 2. Token (`web/src/app/globals.css`)

| Token | Valore |
|-------|--------|
| `--background` | `#f5f5f7` |
| `--foreground` | `#1a1a1a` |
| `--muted` | `#6b7280` |
| `--brand` | `#2563eb` |
| `--worker` | `#d97706` (solo bottoni trial/crediti) |
| `--section-alt` | `#ffffff` |

Classe utility: `.surface-card` (bordo + ombra leggera).

---

## 3. Componenti marketing condivisi

| Componente | File | Uso |
|------------|------|-----|
| `ItalyDemandMap` | `components/marketing/italy-demand-map.tsx` | Mappa + puntini + bubble messaggi (`variant`: `client` \| `worker`) |
| `HowItWorksSteps` | `components/marketing/how-it-works-steps.tsx` | 3 step Scatta/Capisci/Risolve |
| `TrustStrip` | `components/marketing/trust-strip.tsx` | Fascia trust numerica |
| `ClientEmailModule` | `components/supermastro/client-email-module.tsx` | Email + magic link B2C |
| `InlineSignupModule` | `components/artigiano/inline-signup-module.tsx` | Categoria + CAP + email B2B |

---

## 4. Landing pages

### `/supermastro` — [`supermastro-landing.tsx`](web/src/components/supermastro/supermastro-landing.tsx)

Hero 2 colonne: copy + modulo email | mappa domanda SOS → trust strip → come funziona → CTA.

### `/artigiano` — [`artigiano-landing.tsx`](web/src/components/artigiano/artigiano-landing.tsx)

Hero: modulo iscrizione inline + mappa ticker domanda → benefit → come funziona → FAQ.

Dashboard loggato: card light in colonna stretta (`max-w-lg`).

---

## 5. UI primitives

`Button`, `Card`, `Input`, `Badge` in `components/ui/` — varianti `client` e `worker`.

---

## 6. Deprecato

- `landing-scroll.tsx` (scrollytelling Apple-style) — sostituito da landing light
- `data-theme="worker"` scuro — rimosso
- `.glass-panel` — non usato nelle landing principali

---

## 7. Bozza iscrizione mastro

`sessionStorage` via [`lib/worker-signup-draft.ts`](web/src/lib/worker-signup-draft.ts): skill + CAP dal modulo inline → prefill onboarding.
