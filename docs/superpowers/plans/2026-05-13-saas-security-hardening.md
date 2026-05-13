# IMET Jazdy — SaaS Security Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zaceliť všetky bezpečnostné medzery odhalené v audite z 2026-05-13 tak, aby bol systém pripravený na predaj veľkej korporátnej firme (ISO 27001 / SOC 2 due diligence).

**Architecture:** Vrstvený fix — najprv zastaviť aktívne úniky (Fáza 0), potom autorizačné diery v aplikačnej vrstve (Fáza 1), web hardening (Fáza 2), validácia a rate limit (Fáza 3), compliance (Fáza 4-5), observabilita (Fáza 6), dokumentácia + CI hygiene (Fáza 7), testovanie + pentest (Fáza 8). Každá fáza je samostatne nasaditeľná a otestovateľná.

**Tech Stack:** Next.js 16, Supabase (Postgres + Auth + Storage), TypeScript, Zod, bcrypt, Upstash Redis (rate limit), Sentry (observability), Vercel (hosting).

**Audit reference:** Findings z 6 paralelných agentov 2026-05-13 — viď git komentáre a audit-summary nižšie.

**Total scope:** ~6-8 týždňov full-time. Tento plán pokrýva všetkých 13 KRITICKÝCH + 10 stredných findings.

---

## Audit summary (zdroj požiadaviek)

| # | Severity | Finding | Fix vo fáze |
|---|----------|---------|-------------|
| 1 | 🔴 | Service role key v gite (`setup-db.mjs`) | 0 |
| 2 | 🔴 | Admin heslo `Admin123!` v 4 scriptoch | 0 |
| 3 | 🔴 | `recordDochadzka` berie `userId` z klienta bez auth | 1 |
| 4 | 🔴 | PIN 4-cifr, plaintext, `Math.random`, žiadny rate-limit | 3 |
| 5 | 🔴 | IDOR vo faktúrach (cross-firma fin_manager) | 1 |
| 6 | 🔴 | Admin cross-tenant breach (admin-dochadzka-mzdy, korekcie) | 1 |
| 7 | 🔴 | `unstable_cache` globálny key — cache leak medzi firmami | 1 |
| 8 | 🔴 | `tablet_insert_dochadzka` RLS bez user_id checku | 1 |
| 9 | 🔴 | `audit_log`/`notifikacie` INSERT `WITH CHECK (true)` | 1 |
| 10 | 🔴 | PostgREST `.or()` injection vo fleet-vozidla search | 2 |
| 11 | 🔴 | IBAN plaintext v DB | 5 |
| 12 | 🔴 | Žiadny GDPR export, hard delete usera | 4 |
| 13 | 🔴 | Audit log nie je immutable | 4 |
| 14 | ⚠️ | Next.js 16.2.2 — 1 high CVE (SSRF) | 0 |
| 15 | ⚠️ | Žiadne security headers | 2 |
| 16 | ⚠️ | File uploads 4/6 bez MIME/size/sanitize | 2 |
| 17 | ⚠️ | CRON_SECRET v query stringu | 2 |
| 18 | ⚠️ | Žiadny rate limit nikde | 3 |
| 19 | ⚠️ | Žiadne Zod schémy | 3 |
| 20 | ⚠️ | MFA/2FA vypnuté | 6 |
| 21 | ⚠️ | CSV formula injection | 5 |
| 22 | ⚠️ | Žiadny Sentry / error tracking | 6 |
| 23 | ⚠️ | Žiadna privacy policy / DPA / consent log | 7 |

---

## Pravidlá pre celý plán

- **Po každej fáze:** spustiť `npm run build`, manuálny smoke test kľúčových flow-ov, potom commit + push.
- **Migrácie:** každá nová migrácia ide do `supabase/migrations/YYYYMMDDHHMMSS_*.sql`, aplikuje sa cez `supabase db push` (alebo manuálne v Supabase dashboard SQL editor).
- **Branching:** všetka práca na `master` (single-developer projekt, deploy cez `git push` + `vercel --prod`).
- **Commit messages:** `security: <fáza>: <čo>` (napr. `security: phase1: requireScopedAdmin helper + recordDochadzka auth`).
- **Rollback plán:** každý commit musí byť revert-bezpečný (žiadne data-loss migrácie bez backup-u).

---

# FÁZA 0: Stop the bleeding

**Cieľ:** Eliminovať aktívne úniky credentials a high-severity CVE v jednom dni.

**Files:**
- Modify: `setup-db.mjs`
- Modify: `scripts/bench-perf.mjs`
- Modify: `scripts/bench-browser.mjs`
- Modify: `scripts/screenshot-jazdy.mjs`
- Modify: `scripts/screenshot-jazdy-zoom.mjs`
- Modify: `scripts/screenshot-jazdy-detail.mjs`
- Modify: `package.json` (next, uuid)
- Modify: `src/lib/supabase-admin.ts` (server-only import)
- Modify: `.gitignore` (defensive)

### Task 0.1: USER ACTION — rotovať Supabase service role key

- [ ] **Krok 1:** Otvoriť https://supabase.com/dashboard/project/yotjzvykdpxkwfegjrkr/settings/api
- [ ] **Krok 2:** Kliknúť "Reset" pri service_role key (NIE pri anon key)
- [ ] **Krok 3:** Skopírovať nový kľúč
- [ ] **Krok 4:** V Vercel dashboard (Settings → Environment Variables) updatovať `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview + Development)
- [ ] **Krok 5:** Lokálne updatovať `.env.local`
- [ ] **Krok 6:** Trigger redeploy: `vercel --prod` alebo cez dashboard
- [ ] **Krok 7:** Overiť že web ide a admin akcie fungujú

### Task 0.2: USER ACTION — zmeniť heslá pre účty s `Admin123!`

- [ ] **Krok 1:** Login ako `it@imet.sk` cez https://imetjazdy.vercel.app/login
- [ ] **Krok 2:** Zmeniť heslo na silné (16+ znakov, mix, generovať password manager)
- [ ] **Krok 3:** Skontrolovať či iné účty mali toto heslo — ak áno, reset
- [ ] **Krok 4:** Zapnúť password manager (Bitwarden / 1Password) pre IMET tím

### Task 0.3: Zmazať / sanitizovať leakové scripty

**Pôvodný stav** (`setup-db.mjs:6,15`): hardcoded JWT.
**Cieľ:** Scripty buď zmazať (ak nie sú nutné), alebo prepísať na `process.env`.

- [ ] **Krok 1:** Skontrolovať či sa `setup-db.mjs` používa — ak nie, zmazať
- [ ] **Krok 2:** Pre `scripts/bench-*.mjs` a `scripts/screenshot-*.mjs` prepísať:

```javascript
// PRED
const supabase = createClient(
  'https://yotjzvykdpxkwfegjrkr.supabase.co',
  'eyJhbGciOi...' // hardcoded
)
const email = 'it@imet.sk'
const password = 'Admin123!'

// PO
import { config } from 'dotenv'
config({ path: '.env.local' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const email = process.env.SCRIPT_TEST_EMAIL
const password = process.env.SCRIPT_TEST_PASSWORD
if (!email || !password) throw new Error('Missing SCRIPT_TEST_* env')
```

- [ ] **Krok 3:** Pridať do `.env.local`: `SCRIPT_TEST_EMAIL=...`, `SCRIPT_TEST_PASSWORD=...`
- [ ] **Krok 4:** Overiť že `.gitignore` má `.env*` (už má, riadok 34)
- [ ] **Krok 5:** Commit: `security: phase0: remove hardcoded credentials from scripts`

### Task 0.4: Rozhodnutie: git history rewrite ALEBO len rotácia?

**Kontext:** Aj keď zmažeme súbory, staré tokeny zostávajú v git histórii commitov `784afa5` a `1f6da58`. Aj keby boli zmazané v HEAD, kto má clone-uté repo môže ich nájsť.

**Voľba A — len rotácia (default):**
- Staré tokeny rotujeme → sú neplatné → história obsahuje neplatné JWT
- Heslá zmenené → staré heslá v gite sú neplatné
- ✅ Jednoduché, žiadne riziko prepísania histórie
- ⚠️ Nepríjemné pri due diligence — auditor uvidí v gite "voľakedy tu bol leak"

**Voľba B — git filter-repo:**
- `pip install git-filter-repo`
- `git filter-repo --path setup-db.mjs --invert-paths` + force-push
- ✅ Čistá história
- 🔴 RIZIKO: prepíše SHA všetkých commitov → každý klon repa musí re-cloneovať. Pri solo projekte OK, ale GitHub Actions / Vercel hooks možno treba re-trigger.

- [ ] **Krok 1:** Rozhodnúť (default = A)
- [ ] **Krok 2:** Ak B: backupnúť repo (`git clone --mirror` na disk), spustiť `filter-repo`, force-push, smoke-test

### Task 0.5: Next.js + uuid CVE patch upgrade

- [ ] **Krok 1:** `cd "C:\CLAUDE PROJEKTY\imetjazdy-work"`
- [ ] **Krok 2:** `npm i next@16.2.6 eslint-config-next@16.2.6 uuid@13.0.2`
- [ ] **Krok 3:** `npm run build` — overiť že build prejde
- [ ] **Krok 4:** `npm audit` — overiť že high count = 0
- [ ] **Krok 5:** Smoke test: spustiť `npm run dev`, login, otvoriť dashboard a 2-3 stránky
- [ ] **Krok 6:** Commit: `security: phase0: bump next 16.2.6 + uuid 13.0.2 (SSRF + buffer CVEs)`
- [ ] **Krok 7:** Push: `git push origin master`
- [ ] **Krok 8:** Deploy: `vercel --prod` + overiť production

### Task 0.6: `server-only` import na supabase-admin

- [ ] **Krok 1:** Prečítať `src/lib/supabase-admin.ts:1`
- [ ] **Krok 2:** Pridať `import 'server-only'` ako prvý riadok (po `'use server'` ak existuje)
- [ ] **Krok 3:** `npm run build` — ak build padne kvôli client importu, fixnúť ho (ide o správanie ktoré chceme)
- [ ] **Krok 4:** Commit: `security: phase0: enforce server-only on supabase-admin`

### Task 0.7: Update `.gitignore` defensive

- [ ] **Krok 1:** Pridať do `.gitignore`:
```
# Defensive: never commit env-like files
.env*
!.env.example
scripts/.local-*
```
- [ ] **Krok 2:** Commit

### Phase 0 exit criteria

- ✅ Service role key rotated (overené že staré JWT neplatí)
- ✅ Admin heslá zmenené
- ✅ Žiadne hardcoded tokens v `git ls-files`
- ✅ `npm audit --audit-level=high` vracia 0
- ✅ Production deploy funguje

---

# FÁZA 1: Critical authorization fixes

**Cieľ:** Eliminovať všetky exploity dostupné autentizovanému zamestnancovi (privilege escalation, IDOR, cross-tenant breach, falšovanie audit logu).

**Files:**
- Modify: `src/lib/auth-helpers.ts` (pridať `requireScopedAdmin`, `assertTargetInScope`)
- Modify: `src/actions/dochadzka.ts:83` (recordDochadzka auth)
- Modify: `src/components/dochadzka/TabletScreen.tsx:105` (volanie recordDochadzka)
- Modify: `src/actions/admin-dochadzka-mzdy.ts` (scope check)
- Modify: `src/actions/dochadzka-korekcie.ts` (scope check)
- Modify: `src/actions/admin-dochadzka.ts` (scope check)
- Modify: `src/actions/faktury.ts` (getFakturaDetail scope)
- Modify: `src/actions/zamestnanci.ts` (scope check)
- Modify: `src/actions/pin-reset.ts` (scope check)
- Modify: `src/actions/dochadzka-import.ts` (scope check)
- Modify: `src/lib/cached-pages.ts` (per-firma cache keys VŠADE)
- Modify: `src/app/admin/page.tsx` (pass firmaScope to getAdminDashboardData)
- Modify: `src/app/admin/jazdy/page.tsx` (per-firma key)
- Modify: `src/app/admin/zamestnanci/page.tsx` (per-firma key)
- Modify: `src/app/admin/archiv/page.tsx` (per-firma key)
- Create: `supabase/migrations/20260513120000_phase1_rls_hardening.sql`

### Task 1.1: `requireScopedAdmin(targetUserId)` helper

**Cieľ:** Vytvoriť helper ktorý kombinuje `requireAdmin()` + overenie že target user je v scope volajúceho.

- [ ] **Krok 1:** V `src/lib/auth-helpers.ts` na koniec pridať:

```typescript
import { getAccessibleFirmaIds } from './firma-scope'

/**
 * Vyžaduje admin/it_admin/fin_manager rolu A overí, že target zamestnanec
 * patrí do scope volajúceho (cez accessible firma IDs).
 *
 * it_admin → vždy prejde (vidí všetky firmy)
 * ostatní → target user musí mať firma_id ∈ getAccessibleFirmaIds(volajúci)
 */
export async function requireScopedAdmin(
  targetUserId: string,
): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireRole(['admin', 'it_admin', 'fin_manager'])
  if ('error' in result) return result

  // it_admin → bez ďalšej kontroly
  if (result.profile.role === 'it_admin') return result

  const { createSupabaseAdmin } = await import('./supabase-admin')
  const admin = createSupabaseAdmin()

  const { data: target } = await admin
    .from('profiles')
    .select('firma_id')
    .eq('id', targetUserId)
    .single<{ firma_id: string | null }>()

  if (!target?.firma_id) {
    return { error: 'Cieľový užívateľ nemá firmu' }
  }

  const accessible = await getAccessibleFirmaIds(result.user.id)
  // accessible === null znamená "všetky firmy" (it_admin), už ošetrené
  if (accessible !== null && !accessible.includes(target.firma_id)) {
    return { error: 'Cieľový zamestnanec mimo vášho scope' }
  }

  return result
}

/**
 * Asercia: target rekord (s firma_id) je v scope volajúceho.
 * Pre operácie kde nemáme userId ale priamo firma_id.
 */
export async function requireScopedFirma(
  targetFirmaId: string,
): Promise<AuthResult & { error?: never } | { error: string }> {
  const result = await requireRole(['admin', 'it_admin', 'fin_manager', 'fleet_manager'])
  if ('error' in result) return result
  if (result.profile.role === 'it_admin') return result

  const accessible = await getAccessibleFirmaIds(result.user.id)
  if (accessible !== null && !accessible.includes(targetFirmaId)) {
    return { error: 'Záznam je mimo vášho scope' }
  }
  return result
}
```

- [ ] **Krok 2:** TypeScript check: `npx tsc --noEmit`
- [ ] **Krok 3:** Commit: `security: phase1: add requireScopedAdmin + requireScopedFirma helpers`

### Task 1.2: `recordDochadzka` — overiť tablet session, nie ľubovoľný userId

**Pôvodný stav** (`src/actions/dochadzka.ts:83`): funkcia berie `userId` ako prvý parameter. Frontend (tablet kiosk) ho pošle po PIN/RFID identifikácii.

**Problém:** Authenticated user (alebo niekto kto našiel session cookie) môže priamo volať server action a pípnuť kohokoľvek.

**Riešenie:** Zaviesť **tablet session token** — krátkodobý token (5 min) generovaný server-side po úspešnom `identifyByPin`/`identifyByRfid`. Token sa pošle naspäť do klienta, klient ho posiela v `recordDochadzka`. Server overí token + extrahuje `userId` z tokenu (nie z volajúceho).

- [ ] **Krok 1:** Migration `supabase/migrations/20260513120000_phase1_rls_hardening.sql`:

```sql
-- Tablet identify tokens — krátkodobé jednorazové tokeny po PIN/RFID identifikácii
create table if not exists tablet_identify_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

create index on tablet_identify_tokens (expires_at);

alter table tablet_identify_tokens enable row level security;

-- Nikto okrem service_role: nikto nečíta priamo, len server actions cez admin klient
create policy "no_access" on tablet_identify_tokens for all using (false) with check (false);

-- Auto-cleanup: cron / job o starých tokenoch
create or replace function cleanup_expired_tablet_tokens() returns void
language plpgsql security definer as $$
begin
  delete from tablet_identify_tokens where expires_at < now() - interval '1 hour';
end;
$$;
```

- [ ] **Krok 2:** Modifikovať `src/actions/dochadzka.ts`:

```typescript
// identifyByPin a identifyByRfid teraz vracajú aj `token`
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function identifyByPin(pin: string): Promise<{
  data?: IdentifiedUser & { token: string };
  error?: string;
}> {
  // ... existujúci lookup (DOČASNE, kým nie je hash v Fáze 3) ...
  // ale pridáme rate-limit check (viď Fáza 3)

  if (!profile) return { error: 'Nesprávny PIN' }

  // Vygenerujeme jednorazový token
  const admin = createSupabaseAdmin()
  const { data: tok } = await admin
    .from('tablet_identify_tokens')
    .insert({ user_id: profile.id })
    .select('token')
    .single<{ token: string }>()

  if (!tok) return { error: 'Chyba pri identifikácii' }

  return {
    data: {
      id: profile.id,
      full_name: profile.full_name,
      pracovny_fond_hodiny: profile.pracovny_fond_hodiny || 8.5,
      token: tok.token,
    }
  }
}

// recordDochadzka teraz prijíma token namiesto userId
export async function recordDochadzka(
  token: string,
  smer: SmerDochadzky,
  dovod: DovodDochadzky,
  zdroj: ZdrojDochadzky,
) {
  const admin = createSupabaseAdmin()
  // Atomicky označiť token ako použitý a vrátiť user_id
  const { data: t } = await admin
    .from('tablet_identify_tokens')
    .update({ used: true })
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .single<{ user_id: string }>()

  if (!t) return { error: 'Identifikácia vypršala, prosím znova' }

  const supabase = await createSupabaseServer()
  const now = new Date()
  const datum = now.toISOString().split('T')[0]

  const { error } = await supabase.from('dochadzka').insert({
    user_id: t.user_id,
    datum,
    smer,
    dovod,
    cas: now.toISOString(),
    zdroj,
  })

  if (error) return { error: 'Chyba pri zápise dochádzky' }
  return { success: true }
}
```

- [ ] **Krok 3:** Update `TabletScreen.tsx:105` (a podobné call-sites) — uložiť `token` z `identifyByPin/Rfid` a poslať ho do `recordDochadzka`
- [ ] **Krok 4:** Manuálny test: identifikovať PIN, pípnuť — overiť že prejde. Skúsiť pípnuť 2× s tým istým tokenom — druhý raz musí zlyhať. Skúsiť pípnuť po 11 min — musí zlyhať.
- [ ] **Krok 5:** Aktualizovať RLS `tablet_insert_dochadzka` v rovnakej migrácii:

```sql
-- Tablet účet môže insertovať len ak má valid token (v praxi: action prepíše user_id z tokenu, ale chceme aj RLS level guard)
drop policy if exists tablet_insert_dochadzka on dochadzka;

create policy "tablet_insert_dochadzka_via_action" on dochadzka
  for insert
  with check (
    -- Permit cez service_role (server action používa admin klient v praxi)
    -- alebo cez authenticated user vkladajúceho len sám seba
    auth.uid() = user_id
  );
```

- [ ] **Krok 6:** Commit: `security: phase1: tablet identify token + tighten dochadzka insert RLS`

### Task 1.3: Aplikovať `requireScopedAdmin` na všetky admin akcie s targetUserId

**Cieľ:** Každá server action, ktorá berie `userId` ako parameter a robí admin akciu, musí volať `requireScopedAdmin(userId)`.

- [ ] **Krok 1:** Inventúra — všetky výskyty `requireAdmin()` a actions ktoré berú `userId/targetUserId/zamestnanecId`:
  - `src/actions/admin-dochadzka-mzdy.ts` (getZamestnanecDetail, ďalšie)
  - `src/actions/dochadzka-korekcie.ts` (pridatZaznam, upravitZaznam, zmazatZaznam)
  - `src/actions/admin-dochadzka.ts` (addManualDochadzka)
  - `src/actions/zamestnanci.ts` (updateZamestnanec, deleteZamestnanec)
  - `src/actions/pin-reset.ts` (resetPin)
  - `src/actions/dochadzka-import.ts` (bulk import — overiť každý záznam alebo whole-batch firma scope)
- [ ] **Krok 2:** Pre každú nahradiť `requireAdmin()` za `requireScopedAdmin(targetUserId)` (alebo `requireScopedFirma` ak je relevantnejšie)
- [ ] **Krok 3:** Pre bulk operácie (import): získať set `firma_id` z payloadu a overiť každý `firma_id ∈ accessible`
- [ ] **Krok 4:** Test: ako admin firmy A skúsiť cez REST volať akciu pre usera firmy B → musí 403
- [ ] **Krok 5:** Commit: `security: phase1: scope-check on all admin user-targeted actions`

### Task 1.4: Faktúry IDOR fix

**Pôvodný stav:** `getFakturaDetail(id)` v `src/actions/faktury.ts` — fin_manager z firmy A môže prečítať faktúru firmy B zámenou `id`.

- [ ] **Krok 1:** Otvoriť `src/actions/faktury.ts`, nájsť `getFakturaDetail`
- [ ] **Krok 2:** Pridať scope check:

```typescript
export async function getFakturaDetail(id: string) {
  const result = await requireFinOrAdmin()
  if ('error' in result) return { error: result.error }

  const admin = createSupabaseAdmin()
  const { data: faktura } = await admin
    .from('faktury')
    .select('*, dodavatel:dodavatelia(*), firma:firmy(*)')
    .eq('id', id)
    .single()
  if (!faktura) return { error: 'Faktúra neexistuje' }

  // Scope check
  if (result.profile.role !== 'it_admin') {
    const accessible = await getAccessibleFirmaIds(result.user.id)
    if (accessible && !accessible.includes(faktura.firma_id)) {
      return { error: 'Faktúra mimo vášho scope' }
    }
  }

  return { data: faktura }
}
```

- [ ] **Krok 3:** Rovnaký pattern aplikovať na ostatné single-record fetchy: `getFakturaPolozky`, `updateFaktura`, `deleteFaktura`, `pridatPlatbu`, `schvalitFakturu`, atď.
- [ ] **Krok 4:** Test: ako fin_manager firmy A skúsiť otvoriť `/admin/faktury/<id-z-firmy-B>` → musí redirect/403
- [ ] **Krok 5:** Commit: `security: phase1: fix IDOR in faktury single-record actions`

### Task 1.5: Per-firma cache keys v `cached-pages.ts`

**Pôvodný stav:** Všetky `unstable_cache` calls majú globálny key (napr. `['admin-dashboard']`). Výsledok je shared cez všetky firmy → admin firmy A dostane dáta firmy B.

- [ ] **Krok 1:** Refaktor `cached-pages.ts` — KAŽDÁ cached funkcia akceptuje `firmaIdsKey: string` parameter a má ho v key:

```typescript
export const getAdminDashboardData = unstable_cache(
  async (mesiac: string, firmaIdsKey: string) => {
    const admin = createSupabaseAdmin()
    const firmaIds = firmaIdsKey === '*' ? null : firmaIdsKey.split(',')
    // pri každom query: ak firmaIds !== null, pridať .in('firma_id', firmaIds)
    // ... (rewrite všetky 10 queries s firma scope)
  },
  ['admin-dashboard-v2'], // bumpneme key na invalidáciu starého cache
  { revalidate: 60, tags: ['dashboard', 'jazdy', 'dovolenky', 'cesty'] },
)
```

- [ ] **Krok 2:** Page komponenty (`/admin/page.tsx`, `/admin/jazdy/page.tsx`, etc.) — pred volaním cached funkcie získať `firmaIdsKey`:

```typescript
const user = await getUser()
const accessible = await getAccessibleFirmaIds(user.id)
const firmaIdsKey = accessible === null ? '*' : [...accessible].sort().join(',')
const data = await getAdminDashboardData(mesiac, firmaIdsKey)
```

- [ ] **Krok 3:** Pre tabuľky bez `firma_id` (napr. ak nejaká neexistuje) — vyhodnotiť či má cache zmysel. Audit log NEMÁ priamo firma_id, ale je linkovaný cez `user_id` → join potrebný.
- [ ] **Krok 4:** Test: nájsť 2 účty (admin firmy A, admin firmy B), prihlásiť každého a porovnať `/admin` — počty musia byť rozdielne podľa firmy
- [ ] **Krok 5:** Commit: `security: phase1: per-firma cache keys (fix multi-tenant cache leak)`

### Task 1.6: RLS holes — `notifikacie`, `audit_log`, profile self-read PIN

**V migrácii `20260513120000_phase1_rls_hardening.sql` pridať:**

```sql
-- notifikacie INSERT: len pre seba alebo cez service_role
drop policy if exists "all_insert_notifikacie" on notifikacie;
create policy "users_insert_own_notifikacie" on notifikacie
  for insert
  with check (auth.uid() = user_id);
-- Cron a admin akcie používajú service_role (bypass) → naďalej fungujú

-- audit_log INSERT: len cez service_role (žiadny user nemôže priamo zapisovať)
drop policy if exists "all_insert_audit" on audit_log;
-- (žiadna INSERT policy = žiadny client/anon/authenticated nemôže insertovať)
-- Server actions volajú logAudit() cez admin klient = service_role = bypass RLS

-- audit_log immutability: explicit DENY UPDATE & DELETE pre všetkých
create policy "audit_log_no_update" on audit_log for update using (false) with check (false);
create policy "audit_log_no_delete" on audit_log for delete using (false);
-- Dokonca aj service_role: revoke
revoke update, delete on audit_log from service_role, postgres;
-- (Ak treba mazať starší log: explicit superuser akcia s zápisom dôvodu)

-- profiles self-read: NIKDY nevracať PIN cez user-scoped klient
-- Riešenie: presunieme PIN do separate tabuľky (Fáza 5), zatiaľ:
-- Zakážeme select na pin stĺpec pre seba — column-level grant revoke
revoke select (pin) on profiles from authenticated, anon;
-- Server actions, ktoré PIN potrebujú (identifyByPin), používajú admin klient
```

- [ ] **Krok 1:** Pridať policies do migrácie
- [ ] **Krok 2:** Aplikovať migráciu: `supabase db push` (lokálne testnúť proti dev DB pred prod)
- [ ] **Krok 3:** Test:
  - User cez REST API skúsi insert do `audit_log` → 403
  - User skúsi update `audit_log` → 403
  - User skúsi select `profiles(pin)` → null/error
  - Server action `logAudit` zo server action stále funguje (admin klient)
- [ ] **Krok 4:** Commit: `security: phase1: harden RLS on notifikacie/audit_log + revoke pin column`

### Phase 1 exit criteria

- ✅ `requireScopedAdmin` + `requireScopedFirma` existujú a sú použité vo všetkých admin akciách s targetom
- ✅ `recordDochadzka` vyžaduje valid jednorazový token (10 min TTL)
- ✅ Faktúry actions skontrolujú firma scope na single-record fetches
- ✅ Všetky `unstable_cache` keys obsahujú firma scope
- ✅ `audit_log` je immutable na DB úrovni; `notifikacie` INSERT je obmedzený
- ✅ Pin column nie je čitateľný cez user-scoped klient
- ✅ Manual smoke test prešiel: admin firmy A nevidí dáta firmy B nikde

---

# FÁZA 2: Web hardening

**Cieľ:** Hardening web layer — security headers, file uploads, PostgREST injection, CRON secrets.

**Files:**
- Modify: `next.config.ts` (pridať `headers()`)
- Create: `src/lib/upload-validator.ts`
- Modify: `src/actions/jazdy.ts`, `archiv.ts`, `fleet-dokumenty.ts`, `fleet-servisy.ts`, `skolenia.ts` (centralized validator)
- Modify: `src/actions/fleet-vozidla.ts:15` (PostgREST .or() escape)
- Modify: `src/app/api/fleet-notifications/route.ts` (Bearer auth)
- Modify: `src/app/api/cron/keep-warm/route.ts` (remove UA fallback)
- Modify: `middleware.ts` (cookie Secure flag)

### Task 2.1: Security headers v `next.config.ts`

- [ ] **Krok 1:** Prepísať `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const cspProd = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspProd },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '25mb' },
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default nextConfig;
```

- [ ] **Krok 2:** `npm run build`
- [ ] **Krok 3:** Lokálne `npm run dev` → otvoriť DevTools Network → response headers majú všetkých 6
- [ ] **Krok 4:** Test cez https://securityheaders.com/ po deploye (cieľ: A+ skóre)
- [ ] **Krok 5:** Commit: `security: phase2: add CSP + HSTS + XFO + nosniff + referrer + permissions headers`

### Task 2.2: Upload validator

- [ ] **Krok 1:** Vytvoriť `src/lib/upload-validator.ts`:

```typescript
import 'server-only'
import { randomUUID } from 'crypto'

export type UploadCategory = 'image' | 'document' | 'spreadsheet' | 'any'

const MIME_GROUPS: Record<UploadCategory, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  spreadsheet: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel', 'text/csv', 'application/csv',
  ],
  any: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
}

interface ValidateOpts {
  category: UploadCategory
  maxSizeMb?: number
}

export function validateUpload(file: File, opts: ValidateOpts): { ok: true; safePath: string } | { ok: false; error: string } {
  const maxBytes = (opts.maxSizeMb ?? 25) * 1024 * 1024
  if (file.size > maxBytes) return { ok: false, error: `Súbor je príliš veľký (max ${opts.maxSizeMb ?? 25} MB)` }

  const allowed = MIME_GROUPS[opts.category]
  if (!allowed.includes(file.type)) return { ok: false, error: `Nepovolený typ súboru (${file.type})` }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  if (ext.length > 8) return { ok: false, error: 'Podozrivá prípona' }

  const safePath = `${randomUUID()}.${ext}`
  return { ok: true, safePath }
}
```

- [ ] **Krok 2:** Aplikovať vo všetkých upload server actions:

```typescript
// PRED
const filePath = `${jazda.id}/${file.name}`
await supabase.storage.from('blocky').upload(filePath, file)

// PO
import { validateUpload } from '@/lib/upload-validator'
const validation = validateUpload(file, { category: 'document', maxSizeMb: 25 })
if (!validation.ok) return { error: validation.error }
const filePath = `${jazda.id}/${validation.safePath}`
await supabase.storage.from('blocky').upload(filePath, file)
```

- [ ] **Krok 3:** Files: `jazdy.ts`, `archiv.ts`, `fleet-dokumenty.ts`, `fleet-servisy.ts`, `skolenia.ts`, `faktury.ts` (audit už hovorí že tam to je OK, ale unifikovať)
- [ ] **Krok 4:** Test: upload PDF → OK; upload `.exe` → 400; upload 30MB → 400; upload `../../etc/passwd.pdf` → safePath je UUID, nie filename
- [ ] **Krok 5:** Commit: `security: phase2: centralized upload validator (MIME + size + UUID filenames)`

### Task 2.3: PostgREST `.or()` injection fix vo fleet-vozidla

- [ ] **Krok 1:** `src/actions/fleet-vozidla.ts:15` — pôvodný kód:

```typescript
query.or(`spz.ilike.%${filters.search}%,znacka.ilike.%${filters.search}%,...`)
```

- [ ] **Krok 2:** Fix — sanitizovať search input (povoliť len alphanumeric + medzery):

```typescript
function sanitizeSearch(s: string): string {
  return s.replace(/[^a-zA-Z0-9 áčďéíĺľňóôŕšťúýžÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-]/g, '').slice(0, 50)
}

if (filters?.search) {
  const safe = sanitizeSearch(filters.search)
  if (safe) {
    query.or(`spz.ilike.%${safe}%,znacka.ilike.%${safe}%,model.ilike.%${safe}%`)
  }
}
```

- [ ] **Krok 3:** Hľadať podobné patterns v iných actions: `Grep` na `.or(\``
- [ ] **Krok 4:** Test: search `,popis.ilike.%admin%` → escape-uje `,` na bezpečný znak
- [ ] **Krok 5:** Commit: `security: phase2: sanitize PostgREST .or() search input`

### Task 2.4: CRON_SECRET cez Bearer header

- [ ] **Krok 1:** `src/app/api/fleet-notifications/route.ts`:

```typescript
// PRED
const url = new URL(request.url)
const secret = url.searchParams.get('secret')

// PO
const auth = request.headers.get('authorization')
const expected = `Bearer ${process.env.CRON_SECRET}`
if (auth !== expected) return new Response('Unauthorized', { status: 401 })
```

- [ ] **Krok 2:** `vercel.json` cron config — overiť že Vercel posiela `Authorization: Bearer ${CRON_SECRET}` header automaticky (Vercel cron toto podporuje natively)
- [ ] **Krok 3:** `src/app/api/cron/keep-warm/route.ts` — odstrániť `user-agent: vercel-cron` fallback, ponechať len Bearer check
- [ ] **Krok 4:** Test cez `curl` s Bearer header → 200, bez header → 401
- [ ] **Krok 5:** Commit: `security: phase2: CRON_SECRET via Authorization header only`

### Task 2.5: Middleware cookie `secure: true`

- [ ] **Krok 1:** `middleware.ts:28` — pridať `secure: true`:

```typescript
response.cookies.set(ROLE_COOKIE, JSON.stringify(...), {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ROLE_TTL_MS / 1000,
})
```

- [ ] **Krok 2:** Commit

### Phase 2 exit criteria

- ✅ securityheaders.com test → A alebo A+
- ✅ Všetky upload server actions cez `validateUpload`
- ✅ PostgREST `.or()` calls escapujú user input
- ✅ CRON endpoints len cez Bearer header
- ✅ Cookies `Secure` v prod

---

# FÁZA 3: Validation + rate limit + PIN hardening

**Cieľ:** Zod schémy na server actions, rate limiting (login + PIN + state-changing), bcrypt PIN.

**Files:**
- Create: `src/lib/validation/schemas.ts`
- Create: `src/lib/rate-limit.ts`
- Modify: všetky server actions (Zod parse pred DB call)
- Create: `supabase/migrations/20260514100000_phase3_pin_hash.sql`
- Modify: `src/actions/pin-reset.ts`, `dochadzka.ts` (bcrypt compare)

### Task 3.1: Zod schémy

- [ ] **Krok 1:** `npm i zod`
- [ ] **Krok 2:** `src/lib/validation/schemas.ts` — definovať schémy pre každú entitu:

```typescript
import { z } from 'zod'

export const uuidSchema = z.string().uuid()
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const emailSchema = z.string().email().max(255)
export const ibanSchema = z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i)
export const icoSchema = z.string().regex(/^\d{8}$/)
export const pinSchema = z.string().regex(/^\d{6}$/) // 6-digit po Fáze 3

export const FakturaCreateSchema = z.object({
  cislo: z.string().min(1).max(50),
  suma: z.number().positive().finite(),
  mena: z.enum(['EUR', 'USD', 'CZK', 'GBP']),
  splatnost: dateSchema,
  dodavatel_id: uuidSchema,
  firma_id: uuidSchema,
  // ...
})

export const DochadzkaInputSchema = z.object({
  token: uuidSchema,
  smer: z.enum(['prichod', 'odchod']),
  dovod: z.enum(['praca', 'lekar', 'sluzobna_cesta', 'obed']),
  zdroj: z.enum(['tablet', 'web', 'manual']),
})

// ... všetky entity (Jazda, Dovolenka, ZamestnanecCreate, ServisVozidla, atď.)
```

- [ ] **Krok 3:** Pattern v server actions:

```typescript
'use server'
import { FakturaCreateSchema } from '@/lib/validation/schemas'

export async function createFaktura(formData: FormData) {
  const parsed = FakturaCreateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Neplatné vstupy', issues: parsed.error.flatten() }
  // teraz parsed.data je type-safe a validovaný
}
```

- [ ] **Krok 4:** Aplikovať na top 20 server actions (kritické moduly: faktury, dochadzka, jazdy, zamestnanci, dovolenky, sluzobne_cesty)
- [ ] **Krok 5:** Commit per modul: `security: phase3: zod validation for <module> actions`

### Task 3.2: Rate limiter

- [ ] **Krok 1:** Setup Upstash Redis (Vercel Marketplace integration): pridať `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] **Krok 2:** `npm i @upstash/redis @upstash/ratelimit`
- [ ] **Krok 3:** `src/lib/rate-limit.ts`:

```typescript
import 'server-only'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = Redis.fromEnv()

export const limiters = {
  identifyPin: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, '5 m') }),
  login: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10, '15 m') }),
  generalWrite: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(60, '1 m') }),
  fileUpload: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, '1 m') }),
}

export async function checkRateLimit(
  limiterName: keyof typeof limiters,
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const limiter = limiters[limiterName]
  const r = await limiter.limit(key)
  if (r.success) return { ok: true }
  return { ok: false, retryAfter: Math.ceil((r.reset - Date.now()) / 1000) }
}
```

- [ ] **Krok 4:** Aplikovať na `identifyByPin` (key = IP), login UI handler, state-changing actions (key = userId), file uploads
- [ ] **Krok 5:** Test: 6× `identifyByPin` z tej istej IP → 6. raz vráti rate-limited
- [ ] **Krok 6:** Commit: `security: phase3: rate limiting on PIN/login/writes/uploads`

### Task 3.3: PIN hashing + 6-digit + CSPRNG

- [ ] **Krok 1:** `npm i bcryptjs @types/bcryptjs`
- [ ] **Krok 2:** Migration `supabase/migrations/20260514100000_phase3_pin_hash.sql`:

```sql
-- Separate tabuľka pre PINy — RLS deny pre všetkých okrem service_role
create table if not exists profile_pins (
  user_id uuid primary key references profiles(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profile_pins enable row level security;
create policy "deny_all" on profile_pins for all using (false) with check (false);

-- migrate-helper: pre každý profil s pin v 'profiles' vytvoriť random 6-digit PIN
-- (Pôvodný PIN je 4-digit a treba ho rotovať — admin musí poslať nový PIN každému zamestnancovi)
-- POZOR: tento krok je manuálny — viď Fáza 3 deployment checklist

-- Po nasadení Fázy 3:
-- alter table profiles drop column pin;
-- (počkať týždeň po deployi, kým si všetci zmenia PIN)
```

- [ ] **Krok 3:** `src/actions/pin-reset.ts` — CSPRNG + bcrypt:

```typescript
import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'

async function generatePin(): Promise<{ plain: string; hash: string }> {
  const plain = String(randomInt(100000, 1000000))  // 6 digit
  const hash = await bcrypt.hash(plain, 12)
  return { plain, hash }
}

export async function resetPin(targetUserId: string) {
  const result = await requireScopedAdmin(targetUserId)
  if ('error' in result) return { error: result.error }

  const { plain, hash } = await generatePin()
  const admin = createSupabaseAdmin()
  await admin.from('profile_pins')
    .upsert({ user_id: targetUserId, pin_hash: hash, updated_at: new Date().toISOString() })

  // PIN sa zobrazí len raz adminovi, nikdy v notifikácii / DB v plaintexte
  return { data: { pin: plain } }
}
```

- [ ] **Krok 4:** `identifyByPin` — bcrypt compare:

```typescript
import bcrypt from 'bcryptjs'

export async function identifyByPin(pin: string) {
  // Rate-limit (IP-based)
  const rl = await checkRateLimit('identifyPin', getClientIp())
  if (!rl.ok) return { error: `Príliš veľa pokusov, skús o ${rl.retryAfter}s` }

  // Validate format
  if (!/^\d{6}$/.test(pin)) return { error: 'PIN musí byť 6 číslic' }

  const admin = createSupabaseAdmin()
  const { data: rows } = await admin.from('profile_pins').select('user_id, pin_hash')
  if (!rows) return { error: 'Nesprávny PIN' }

  // Linear scan (acceptable lebo profile_pins má max ~200 záznamov per company)
  // Pre väčší scale: hash bucket alebo index na prvé 2 znaky hashu
  for (const r of rows) {
    if (await bcrypt.compare(pin, r.pin_hash)) {
      // ... lookup profile + return token (viď Fáza 1)
    }
  }
  return { error: 'Nesprávny PIN' }
}
```

- [ ] **Krok 5:** UI: admin reset PIN flow zobrazí PIN raz s tlačidlom "Skopírovať" → po zatvorení modálu PIN nemožno znova vidieť
- [ ] **Krok 6:** Notifikácia v `pin-reset.ts`: ODSTRÁNIŤ plaintext PIN zo `sprava` poľa
- [ ] **Krok 7:** Commit: `security: phase3: PIN bcrypt + 6-digit + CSPRNG + no-plaintext-leak`

### Phase 3 exit criteria

- ✅ Top 20 server actions má Zod validáciu
- ✅ Rate limit funguje (testovateľný)
- ✅ PIN je 6-digit, bcrypt-hashed, separate tabuľka
- ✅ Plaintext PIN sa nikde nezobrazí okrem 1× admin reset modálu

---

# FÁZA 4: Compliance core (audit log + GDPR + soft delete)

**Cieľ:** Tamper-proof audit log s IP/UA, soft delete pre zamestnancov, GDPR export + delete endpointy, retention politika.

**Files:**
- Create: `supabase/migrations/20260515100000_phase4_audit_gdpr.sql`
- Modify: `src/actions/audit.ts` (capture IP + UA z headers)
- Modify: `src/actions/zamestnanci.ts` (soft delete)
- Create: `src/app/api/gdpr/export/[userId]/route.ts`
- Create: `src/app/api/gdpr/delete/[userId]/route.ts`
- Create: `src/app/api/cron/retention/route.ts`

### Task 4.1: Audit log — IP + UA

- [ ] Migration: `alter table audit_log add column ip_address inet, user_agent text;`
- [ ] `src/actions/audit.ts`: capture cez `headers()` z `next/headers`
- [ ] Commit

### Task 4.2: Soft delete zamestnanci

- [ ] Migration: `alter table profiles add column deleted_at timestamptz, anonymized_at timestamptz;`
- [ ] RLS update: všetky SELECT policies pridať `and deleted_at is null`
- [ ] `deleteZamestnanec`: namiesto `auth.admin.deleteUser` → set `deleted_at = now()`, anonymize PII (full_name → "Zmazaný používateľ", email → `deleted-${id}@imet.sk`)
- [ ] Po 30 dňoch retention cron môže `auth.admin.deleteUser` (hard delete)

### Task 4.3: GDPR export endpoint

- [ ] `/api/gdpr/export/[userId]` — admin alebo self, vracia ZIP:
  - `profile.json`
  - `jazdy.json` + attachments
  - `dochadzka.json`
  - `dovolenky.json`
  - `sluzobne-cesty.json` + attachments
  - `audit-log.json` (filter user_id)
- [ ] Audit log entry: "GDPR export for user X by admin Y"

### Task 4.4: GDPR delete endpoint

- [ ] `/api/gdpr/delete/[userId]` — admin only, vyžaduje confirmation token
- [ ] Soft delete + anonymize: full_name, email, telefón, adresa, RFID karty, PIN
- [ ] Audit log "GDPR erasure for user X by admin Y"
- [ ] Skutočné mazanie historických záznamov NEDORIEŠENÉ — jazdy/dochádzka sa nemažú (právny dôvod: účtovné dáta, retention povinnosť). Pre tieto pole `anonymized_user_label = "Bývalý zamestnanec"`.

### Task 4.5: Retention cron

- [ ] `/api/cron/retention` — `vercel.json` cron daily
- [ ] Politika (konfiguračná tabuľka `retention_policies`):
  - Audit log: 7 rokov (zákon o účtovníctve)
  - Dochádzka: 10 rokov (zákonník práce)
  - Faktúry: 10 rokov (DPH zákon)
  - Anonymizovaní useri po `anonymized_at + 30 dní` → hard delete

### Phase 4 exit criteria

- ✅ Audit log obsahuje IP + UA, je immutable
- ✅ Soft delete funguje, hard delete cez retention cron
- ✅ GDPR export vracia ZIP s kompletnými dátami usera
- ✅ GDPR delete anonymizuje a audituje

---

# FÁZA 5: Data protection (IBAN encryption + CSV escape)

**Cieľ:** Encryption-at-rest na citlivých columns + CSV/XLSX safe export.

**Files:**
- Create: `supabase/migrations/20260516100000_phase5_iban_encryption.sql`
- Modify: `src/actions/faktury.ts`, `dodavatelia.ts`, `bankove-ucty.ts`
- Modify: `src/app/api/reporty/mzdy/route.ts` (CSV escape)

### Task 5.1: IBAN encryption

- [ ] Setup Supabase Vault: `select vault.create_secret('iban-key', 'generated-aes-256-key')`
- [ ] Migration:
  ```sql
  -- Pre každý IBAN column: vytvoriť `iban_enc bytea` column, migrate existing dáta cez pgp_sym_encrypt
  alter table bankove_ucty add column iban_enc bytea;
  update bankove_ucty set iban_enc = pgp_sym_encrypt(iban, (select decrypted_secret from vault.decrypted_secrets where name = 'iban-key'));
  alter table bankove_ucty drop column iban;
  alter table bankove_ucty rename column iban_enc to iban;

  -- Helper view s decrypt pre authorized fin role
  create or replace view bankove_ucty_v as select id, ..., pgp_sym_decrypt(iban, (select decrypted_secret from vault.decrypted_secrets where name = 'iban-key')) as iban from bankove_ucty;
  -- RLS na view: len fin_manager/admin/it_admin
  ```
- [ ] Rovnako pre `dodavatelia.iban`, `faktury.iban` (ak existuje)
- [ ] Server actions čítajú z view, zapisujú s `pgp_sym_encrypt`

### Task 5.2: CSV formula injection escape

- [ ] V `src/app/api/reporty/mzdy/route.ts:103` a všetkých CSV/XLSX writeroch:
  ```typescript
  function escapeCsvCell(v: unknown): string {
    const s = String(v ?? '')
    if (/^[=+\-@]/.test(s)) return `'${s}`  // prepend apostrophe
    return s
  }
  ```
- [ ] Aplikovať na všetky výstupy XLSX (`exceljs`) — formula injection funguje aj v XLSX
- [ ] Commit

### Phase 5 exit criteria

- ✅ IBAN v DB je encrypted (verifikované cez `select` priamo na column → bytea)
- ✅ CSV/XLSX bunky začínajúce `=+-@` sú escaped

---

# FÁZA 6: Observability + MFA

**Cieľ:** Sentry s PII scrubbing, structured logging, MFA TOTP pre admin/fin role.

**Files:**
- Modify: `package.json` (+ `@sentry/nextjs`)
- Create: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Create: `src/lib/logger.ts`
- Modify: `supabase/config.toml` (MFA enable)
- Create: `src/app/(app)/profil/mfa/page.tsx` (enrollment UI)

### Task 6.1: Sentry

- [ ] `npx @sentry/wizard@latest -i nextjs`
- [ ] Config `beforeSend` hook: scrubbing pre email/PIN/IBAN regex
- [ ] Env: `SENTRY_DSN`

### Task 6.2: MFA TOTP

- [ ] `supabase/config.toml`: `[auth.mfa.totp] enroll_enabled = true; verify_enabled = true`
- [ ] Enrollment UI: `/profil/mfa` page s QR code + verify flow
- [ ] Policy: admin/it_admin/fin_manager **musia** mať MFA (login flow blokuje ak nemajú)
- [ ] Audit log MFA enrollment events

### Task 6.3: Structured logger

- [ ] `src/lib/logger.ts` — wrapper okolo console + Sentry, kategorizuje (info/warn/error), scrubuje PII
- [ ] Nahradiť všetky `console.log/error` v `src/lib/email.ts`, `src/app/api/cron/*` cez `logger.*`

### Phase 6 exit criteria

- ✅ Sentry zachytáva errors, žiadne PII v stack traces
- ✅ Admin login bez MFA → blokovaný
- ✅ Žiadne `console.*` v produkčnom kóde

---

# FÁZA 7: Docs + deploy hygiene

**Cieľ:** Compliance dokumentácia, security.txt, SBOM, CI security gates.

**Files:**
- Create: `src/app/(legal)/privacy/page.tsx`
- Create: `src/app/(legal)/terms/page.tsx`
- Create: `src/app/(legal)/dpa/page.tsx`
- Create: `public/.well-known/security.txt`
- Create: `docs/runbooks/incident-response.md`
- Create: `docs/runbooks/backup-restore.md`
- Create: `docs/sbom.json` (auto-gen)
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`

### Task 7.1: Privacy / ToS / DPA stránky (stub for legal review)

- [ ] Šablóna Privacy Policy v slovenčine + EN (info aké údaje, prečo, ako dlho, sub-processors: Vercel + Supabase + Resend + Upstash + Sentry)
- [ ] Stub ToS
- [ ] DPA template — link na Vercel DPA (https://vercel.com/legal/dpa), Supabase DPA, atď.
- [ ] Footer link na všetky 3

### Task 7.2: security.txt

```
Contact: mailto:security@imet.sk
Expires: 2027-05-13T00:00:00z
Preferred-Languages: sk, en
Canonical: https://imetjazdy.vercel.app/.well-known/security.txt
Policy: https://imetjazdy.vercel.app/security/policy
```

### Task 7.3: SBOM

- [ ] `npm i -g @cyclonedx/cyclonedx-npm`
- [ ] `cyclonedx-npm --output-file sbom.json`
- [ ] GHA: pri release auto-generate SBOM

### Task 7.4: CI security gate

- [ ] `.github/workflows/security.yml`:
  - `npm audit --audit-level=high` → fail build
  - `npm audit signatures`
  - secret scan (gitleaks)
- [ ] Dependabot weekly PRs

### Task 7.5: Backup/DR runbook

- [ ] Aktivovať Supabase PITR (paid feature)
- [ ] Runbook: ako restore z PITR, ako rollback Vercel deploy, RPO/RTO ciele

### Phase 7 exit criteria

- ✅ Privacy/ToS/DPA stránky live (aj keď text čaká na právnika)
- ✅ security.txt prístupný
- ✅ CI fail-on-high-cve
- ✅ Backup runbook dokumentovaný + PITR aktivované

---

# FÁZA 8: Testing + pentest

**Cieľ:** E2E testy auth scenárov, RLS integration testy, externý pentest.

**Files:**
- Create: `tests/e2e/auth-roles.spec.ts`
- Create: `tests/e2e/cross-tenant.spec.ts`
- Create: `tests/integration/rls.test.ts`

### Task 8.1: Playwright auth E2E

- [ ] Pre každú rolu (admin, it_admin, fin_manager, fleet_manager, zamestnanec, tablet):
  - Login → správna landing page
  - Skúsiť otvoriť stránku mimo rolu → redirect/403
  - Skúsiť API call mimo rolu → 401/403

### Task 8.2: Cross-tenant E2E

- [ ] 2 admin users z rôznych firiem
- [ ] User A skúsi otvoriť faktúru/zamestnanca/jazdu firmy B → 403
- [ ] Cache leak: User A v dashboarde → vidí svoje počty; User B v dashboarde → vidí svoje (rozdielne)

### Task 8.3: RLS integration test

- [ ] Pre každú tabuľku: anon user, authenticated user, admin → assert čo môže/nemôže

### Task 8.4: Externý pentest

- [ ] Vybrať pentest firmu (napr. Citadelo, Nethemba, alebo Bug Bounty platform)
- [ ] Scope: full app + RLS + tenant izolácia
- [ ] Po pentest report → fix → re-test

### Phase 8 exit criteria

- ✅ E2E suite pokrýva všetky role + cross-tenant scenáre
- ✅ Externý pentest report bez critical/high findings (alebo všetky uzavreté)

---

# Deployment checklist (per fáza)

Pre každú fázu pred označením "completed":

1. **Build:** `npm run build` prejde bez warnings
2. **Type check:** `npx tsc --noEmit` prejde
3. **Lint:** `npm run lint` prejde
4. **Manual smoke:** kľúčové flow-y otestované manuálne
5. **Migration apply:** ak je migrácia, aplikovaná na dev DB + smoke test
6. **Commit:** atomic commits, jasné správy
7. **Push:** `git push origin master`
8. **Deploy:** `vercel --prod` (alebo auto cez GHA po Fáze 7)
9. **Production smoke:** otvoriť prod URL, login, 2-3 stránky
10. **Update memory:** zapísať čo sa zmenilo (per `auto memory` system)

---

# Audit summary (post-implementation expected)

Po dokončení všetkých 8 fáz:

| Kategória | Pred | Po |
|-----------|------|-----|
| KRITICKÉ findings | 13 | 0 |
| Stredné findings | 10 | 0 |
| OWASP Top 10 pokryté | 3/10 | 10/10 |
| ISO 27001 readiness | ~30% | ~80% |
| SOC 2 Type I ready | nie | áno (s pentest reportom) |

**Pripravenosť na predaj veľkej korporácii:** po Fáze 8 + externý pentest = ÁNO.
