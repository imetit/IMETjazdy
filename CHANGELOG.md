# Changelog

Všetky zmeny v projekte IMET Jazdy. Newer at the top.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: dátumovo (rolling).

## [2026-05-15] — Code-quality + UX sweep

### Security
- Closed 14 auth/IDOR holes in server actions (`vozidla`, `licencie`, `majetok`,
  `cestovne-prikazy`, `fleet-znamky`, `fleet-historia`, `rfid-karty`,
  `dovolenky-naroky`, `audit`, `jazdy-reporty`, `fleet-reporty`, `notifikacie`).
- PIN migrated to bcrypt + 6-digit + CSPRNG (new `profile_pins` table, RLS deny-all).
- Cross-tenant breach fix in `dochadzka-ziadosti.schvalitZiadost`/`zamietnut`
  (was `requireAdmin`, now `requireScopedAdmin` after fetching target user_id).
- `bankove-ucty`: Zod IBAN validation + `requireScopedFirma` on create/deactivate.
- `permissions.getUserModuly`: scope check (self-read OR scoped admin).
- `vyuctovanie.processJazda`: defensive input validation (UUID regex, enum,
  finite ranges on payroll inputs).
- Fixed broken `ring: 2px solid` CSS (Tailwind utility in CSS) — restored
  visible focus rings sitewide.
- Strengthened Supabase Auth: password min length 6 → 8 + required complexity
  (upper + lower + digit). MFA TOTP enabled.

### Compliance / GDPR (Phase 4 + 5)
- Endpoints `/api/gdpr/export/[userId]` (čl. 15, ZIP) + `/api/gdpr/delete/[userId]`
  (čl. 17, SECURITY DEFINER anonymize).
- Audit log immutable via DB trigger (blocks UPDATE/DELETE incl. service_role) +
  IP + user-agent capture.
- IBAN column-level encryption (pgcrypto + Supabase Vault, AES-256, RLS-gated
  decrypt views).
- Soft-delete for employees + retention cron (daily 03:00 UTC).
- Privacy/Terms/Security pages with dark theme matching landing.
- DPA template + incident response + backup/restore runbooks.

### Observability
- Sentry SDK (client/server/edge) with PII scrubbing (emails, JWT, Bearer
  tokens, ≥6-digit numbers). `sendDefaultPii: false`. Request body / cookies /
  Authorization stripped from events.
- Structured `logger` (info/warn/error) replacing 5 raw `console.log/error`
  in cron + email paths.

### Performance / DX
- Per-firma cache keys (`unstable_cache`) — closes multi-tenant cache leak.
- Rate limiting via Upstash Redis (identifyPin 5/5min, login 10/15min, write
  60/min, upload 20/min, gdprExport 3/h). Graceful degradation when env unset.

### UX
- New landing at `/` (was redirect to /login): dark theme with animated aurora
  (teal/violet/fuchsia radial gradients), oversized typography, 5 capability
  spotlights with mini UI mocks + bento grid + security "13/13" stat.
- Redesigned login page: full-bleed aurora + centered glass card.
- Branded `error.tsx` + `not-found.tsx`.
- Accessible `Modal` (role=dialog, aria-modal, aria-labelledby, focus trap,
  Esc handler, body scroll lock, configurable backdrop close).
- 17 `alert()` calls replaced with `useToast()` (colorful auto-dismiss banners).
- `EmptyState` component + first adoption (in `/moje` Posledné jazdy).
- Mobile responsive fixes: FleetDashboard grid 4 → 2/4, employee tables wrapped
  in `overflow-x-auto`, VozidlaTable mobile-safe with delete confirm + spinner.
- Tablet kiosk hardening: hardcode dark bg, larger error banner with role=alert.

### Validation (Zod)
- Centralized schemas in `src/lib/validation/schemas.ts`.
- Applied to: createZamestnanec, resetZamestnanecPassword, identifyByPin
  (format + rate-limit), createDodavatel, createJazda, addManualDochadzka,
  pridatZaznam (korekcie), createDovolenka, createCesta, createBankovyUcet,
  processJazda (defensive). ~15 server actions converted from raw `formData.get`.

### Infrastructure
- `robots.ts` + `sitemap.ts` (next 13+ metadata routes).
- Dynamic `opengraph-image.tsx` for share previews (edge runtime, ImageResponse).
- `.well-known/security.txt` + branded `/security` policy page.
- `.github/dependabot.yml` (weekly grouped patches).
- `.github/workflows/security.yml` (npm audit gate + gitleaks + signature
  verification).
- Health endpoint `/api/health` (DB latency + version + region).

### Testing
- Playwright config + foundational tests (`tests/e2e/auth-roles.spec.ts`,
  `cross-tenant.spec.ts`).
- Screenshot script (`scripts/screenshot-landing.mjs`).

### Routing
- Employee dashboard moved `/` → `/moje`.
- Middleware: `PUBLIC_PATHS` allows `/`, `/login`, `/privacy`, `/terms`,
  `/security` for unauthenticated visitors; zamestnanec login → `/moje`.

### Database migrations
- `20260513120000_phase1_rls_hardening.sql` — audit_log immutable + notifikacie INSERT restricted
- `20260513130000_phase4_audit_gdpr.sql` — audit IP/UA, soft-delete, retention,
  anonymize_user fn, tablet_identify_tokens
- `20260513140000_phase5_iban_encryption.sql` — IBAN encryption + decrypt views
- `20260515100000_phase3_pin_hash.sql` — profile_pins (bcrypt PIN)

All applied to production DB via Supabase CLI.

## [2026-05-13] — Foundation security hardening (Phase 0–8)

Initial 8-phase security plan; see `docs/superpowers/plans/2026-05-13-saas-security-hardening.md`.
