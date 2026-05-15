# IMET Jazdy

> HR a vozový park v jednom systéme. Pre slovenské firmy, audit-ready pre korporát.

[![Security audit](https://github.com/imetit/IMETjazdy/actions/workflows/security.yml/badge.svg)](https://github.com/imetit/IMETjazdy/actions/workflows/security.yml)

**Live:** [imetjazdy.vercel.app](https://imetjazdy.vercel.app) · **Security policy:** [/security](https://imetjazdy.vercel.app/security) · **Privacy:** [/privacy](https://imetjazdy.vercel.app/privacy)

## Čo to je

Komplexný systém pre:

| Modul | Funkcie |
|-------|---------|
| **Dochádzka** | Tablet kiosk (PIN/RFID + bcrypt + jednorázový token), anomálie, korekcie, mzdové podklady (PROLIM/Cézar/Magma XLSX) |
| **Kniha jázd** | Automatický výpočet náhrad podľa § 7 zákona č. 283/2002, PDF/XLSX export |
| **Faktúry** | Multi-currency s ECB kurzami, dvojstupňové schvaľovanie, dobropisy, eskalácie 3/7/14/30d, IBAN encrypted at-rest |
| **Dovolenky** | Schválenie cez nadriadeného s automatickým zastupovaním, OČR/PN, polovičné dni |
| **Služobné cesty** | Domáce + zahraničné, preddavky, stravné podľa krajiny, doklady |
| **Vozový park** | STK/EK/PZP/havarijné, M:N vodiči, servisy, hlásenia, tankovacie karty |
| **Archív** | Verzionované dokumenty, ACL kategórie, fulltext, expirácie |

## Tech stack

- **Next.js 16** App Router + React 19 + TypeScript 5
- **Supabase** (Postgres 17 + Auth + Storage + Vault) — EU region (Ireland)
- **Vercel** edge (fra1 Frankfurt)
- **Tailwind 4**
- **Zod** runtime validation
- **Sentry** error tracking (PII scrubbing)
- **Upstash Redis** rate limiting
- **pgcrypto** column-level IBAN encryption
- **Playwright** E2E

## Bezpečnosť

Po 6-agentovom paralelnom audite (2026-05-13) systém prešiel:

- ✅ 13/13 critical findings vyriešených (multi-tenant isolation, IDOR, audit immutability, IBAN encryption, GDPR endpoints)
- ✅ Soft-delete + retention politika podľa SR zákonov
- ✅ MFA TOTP povinné pre admin/it_admin/fin_manager
- ✅ Rate limiting na PIN, login, write actions
- ✅ CSP + HSTS + X-Frame DENY + Permissions-Policy
- ✅ npm audit + gitleaks + dependabot v CI

Detaily: [docs/superpowers/plans/2026-05-13-saas-security-hardening.md](./docs/superpowers/plans/2026-05-13-saas-security-hardening.md)

## Multi-firma

Single codebase škáluje na N firiem. Aktuálne 7 v produkcii (IMET, IMET-TEC, AKE, IMET CZ, IMET KE, IMET ZA, AKE Skalica). Per-firma:
- `firma_id` scope na všetkých admin akciách (`requireScopedAdmin`)
- RLS politiky na DB level
- Per-firma cache keys (žiadny cache leak medzi firmami)
- Per-firma faktúrový workflow (limity, schvaľovatelia L1/L2)

## Vývoj

```bash
# Závislosti
npm i

# .env.local z .env.example
cp .env.example .env.local
# vyplň NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY

# Dev server
npm run dev          # http://localhost:3000

# Production build
npm run build && npm start

# Lint
npm run lint

# TypeScript check
npx tsc --noEmit

# E2E tests
npx playwright install chromium
npx playwright test
```

## Deploy

Per `feedback_deploy`: auto-deploy nefunguje, vyžaduje manuálne:

```bash
git push origin main
vercel --prod
```

## DB migrácie

Aplikujú sa cez Supabase CLI (auto-login uvedený v memory):

```bash
cat supabase/migrations/<file>.sql | npx supabase db query --linked
```

Alebo cez Supabase dashboard → SQL editor.

## Runbooky

- [Incident Response](./docs/runbooks/incident-response.md) — P0/P1 procedures, audit log queries, breach notif
- [Backup & Restore](./docs/runbooks/backup-restore.md) — Supabase PITR, RPO/RTO, DR scenár
- [DPA Template](./docs/templates/dpa-template.md) — pre korporátnych klientov

## Licencia + kontakt

© IMET, a.s. — všetky práva vyhradené.

- **Demo / predaj:** kontakt@imet.sk
- **Bezpečnostné nálezy:** security@imet.sk ([policy](https://imetjazdy.vercel.app/security))
- **Tech support:** it@imet.sk
