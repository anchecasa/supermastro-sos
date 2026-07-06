# SuperMastro — Web app (Next.js)

App pilota **Blocco A** Sprint 1: Supabase SSR, auth magic link, route `/supermastro` e `/artigiano`.

## Setup

## Supabase collegato

Progetto: **edsvmnxojsmknjuhobqa** (EU, condiviso ecosistema AncheCasa)

### 1. Env locale

File `web/.env.local` (già creato). Completa:

| Variabile | Dove trovarla |
|-----------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → API → service_role |
| `SUPABASE_DB_PASSWORD` | Dashboard → Settings → Database |
| `STRIPE_*` | Stripe Dashboard test mode |

Applica migrazioni:

```bash
npm run db:push
```

### 2. Auth redirect (Dashboard Supabase)

Aggiungi a **Authentication → URL Configuration**:

- `http://localhost:3000/supermastro/auth/callback`
- `http://localhost:3000/artigiano/auth/callback`
- (prod) `https://anchecasa.it/supermastro/auth/callback`
- (prod) `https://anchecasa.it/artigiano/auth/callback`

### 3. Dev server

```bash
npm install
npm run dev
```

- Cliente SOS: http://localhost:3000/supermastro  
- Artigiani: http://localhost:3000/artigiano  

## Blocco A — DoD

| Task | Stato |
|------|:-----:|
| A1 Supabase EU + env | ✅ collegato |
| A2–A5 Schema + vault + consent | ⏳ `npm run db:push` |
| A6 Auth dual route | ✅ |
| A7 SSR cookie httpOnly | ✅ |

## Blocco B — DoD

| Task | Stato |
|------|:-----:|
| B1 Onboarding profilo | ✅ `/artigiano/onboarding` |
| B2 Admin verifica | ✅ `/admin/verifica` |
| B3 Ledger crediti | ✅ migrazione B |
| B4 Stripe trial + webhook | ✅ (configura Stripe env) |
| B5 verified → active | ✅ `grant_trial_credits` |
| B6 Dashboard crediti | ✅ `/artigiano` |

### Test Gate A (S1)

Con artigiano autenticato, da browser console o client:

```js
const { data } = await supabase.from('contact_vault').select('*')
// atteso: [] o errore permesso — mai righe PII
```

## Documentazione

Vedi `../docs/` e `../SPRINT-1-DETTAGLIATO-v1.md`.
