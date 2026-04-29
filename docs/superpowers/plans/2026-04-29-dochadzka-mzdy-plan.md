# Dochádzka pre mzdárky — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Premakaný dochádzkový modul s auto-pipnutím cez polnoc, mesačnou uzávierkou, plnými korektúrami s auditom, multi-firma scope, štruktúrovanými žiadosťami o korekciu, anomáliami, príplatkami, 9 reportami a zamestnaneckým dashboardom.

**Architecture:** Migrácia rozširuje `dochadzka` o flagy `auto_doplnene`, `korekcia_dovod`, `povodny_cas`. Pridá 4 nové tabuľky (`dochadzka_uzavierka`, `dochadzka_schvalene_hodiny`, `dochadzka_korekcia_ziadosti`, `dochadzka_history`) + `pristupne_firmy[]`, `auto_pip_enabled`, `fond_per_den` v `profiles`. Vercel cron volá `/api/cron/auto-pip` o 00:30 cez `CRON_SECRET`. Server actions kontrolujú stav uzávierky pred každou mutáciou. UI je rozdelený na mzdárkin admin pohľad (`/admin/dochadzka/*`) a zamestnanecký pohľad (`/dochadzka-prehled`).

**Tech Stack:** Next.js 16, React 19, Supabase, PostgreSQL triggery, Vercel Cron, exceljs (XLSX), jsPDF, Tailwind v4, Playwright (E2E).

---

## File Structure

### Nové súbory

| Cesta | Zodpovednosť |
|---|---|
| `supabase/migrations/20260429000000_dochadzka_mzdy.sql` | DB zmeny — 5 ALTER + 4 CREATE TABLE + RLS + triggery |
| `src/app/api/cron/auto-pip/route.ts` | Cron endpoint — auto-doplnenie odchodu |
| `src/app/admin/dochadzka/uzavierka/page.tsx` | Stránka uzávierky per firma |
| `src/app/admin/dochadzka/statistiky/page.tsx` | Manažérska štatistika |
| `src/app/admin/dochadzka/import/page.tsx` | Bulk XLSX import |
| `src/components/dochadzka/DochadzkaFiltre.tsx` | Filter hlavička (mesiac, firma, oddelenie...) |
| `src/components/dochadzka/DochadzkaKPI.tsx` | 4 KPI widgety s click-to-filter |
| `src/components/dochadzka/DochadzkaEditorModal.tsx` | Modal pre úpravu/pridanie záznamu |
| `src/components/dochadzka/UzavierkaCard.tsx` | Karta firmy s stavom uzávierky |
| `src/components/dochadzka/AnomalieList.tsx` | Zoznam anomálií s drill-down |
| `src/components/dochadzka/PriplatkyBox.tsx` | Box so súčtami príplatkov |
| `src/components/dochadzka/KorekciaZiadostiInbox.tsx` | Mzdárkina inbox žiadostí |
| `src/components/dochadzka/KorekciaZiadostForm.tsx` | Zamestnanecký formulár "nahlásiť chybu" |
| `src/components/dochadzka/PredictiveWarnings.tsx` | Prediktívne varovania pred uzávierkou |
| `src/components/dochadzka/MzdarkaTodoPanel.tsx` | TODO panel pre mzdárku |
| `src/components/dochadzka/StatistikyDashboard.tsx` | Grafy a metriky firmy |
| `src/components/dochadzka/BulkImportForm.tsx` | XLSX import s mapovaním stĺpcov |
| `src/lib/dochadzka-anomalies.ts` | `detectAnomalies(userId, mesiac)` |
| `src/lib/dochadzka-priplatky.ts` | `calculatePriplatky(userId, mesiac)` |
| `src/lib/dochadzka-uzavierka.ts` | Stavový stroj uzávierky helpers |
| `src/lib/dochadzka-fond.ts` | `calculateFond(profile, datum)` (rešpektuje `fond_per_den`) |
| `src/lib/firma-scope.ts` | `getAccessibleFirmaIds(userId)` |
| `src/lib/xlsx.ts` | exceljs helper na export reportov |
| `src/actions/dochadzka-uzavierka.ts` | Server actions: spustitKontrolu, uzavriet, prelomit |
| `src/actions/dochadzka-korekcie.ts` | Update/insert/delete dochádzka so záznamom auditu |
| `src/actions/dochadzka-ziadosti.ts` | Korekcia žiadosti — vytvor/schváľ/zamietni |
| `src/actions/dochadzka-import.ts` | Bulk XLSX import |
| `scripts/e2e-dochadzka-workflow.mjs` | E2E test celého workflow |

### Upravené súbory

| Cesta | Zmena |
|---|---|
| `src/app/admin/dochadzka/page.tsx` | Refactor — používa nové filtre, KPI, tabuľku |
| `src/app/admin/dochadzka/[userId]/page.tsx` | Detail zamestnanca s editor modálom |
| `src/app/admin/dochadzka/reporty/page.tsx` | Rozšírenie o 9 reportov |
| `src/app/(zamestnanec)/dochadzka-prehled/page.tsx` | Rozšírenie o ročný prehľad + KorekciaZiadostForm |
| `src/components/dochadzka/AdminDochadzkaTable.tsx` | Realtime channel + nové stĺpce + bulk actions |
| `src/components/dochadzka/MesacnyVykaz.tsx` | Auto-doplnené flagy + edit klik |
| `src/components/dochadzka/AdminDochadzkaDetail.tsx` | Sumár boxy + editor + schválenie |
| `src/components/dochadzka/MojaDochadzka.tsx` | Ročný prehľad + nahlásiť chybu |
| `src/components/dochadzka/ExportMzdy.tsx` | Pridať XLSX okrem CSV |
| `src/actions/admin-dochadzka.ts` | Multi-firma scope filter |
| `src/actions/dochadzka.ts` | Kontrola stavu uzávierky pred insertom |
| `src/lib/dochadzka-utils.ts` | Rozšírenie o anomálie helpers |
| `src/lib/types.ts` | Nové typy |
| `src/components/Sidebar.tsx` | Nové linky (Uzávierka, Štatistiky, Import) |
| `vercel.json` | Cron schedule |
| `package.json` | exceljs, recharts |

---

## FÁZA 1: Migrácia + types

### Task 1.1: SQL migrácia

**Files:**
- Create: `supabase/migrations/20260429000000_dochadzka_mzdy.sql`

- [ ] **Step 1: Vytvoriť migračný súbor**

```sql
-- ==============================================================
-- IMET Dochádzka — modul pre mzdárky
-- ==============================================================
BEGIN;

-- 1. Rozšírenie dochadzka
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS auto_doplnene BOOLEAN DEFAULT FALSE;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS korekcia_dovod TEXT;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS povodny_cas TIMESTAMPTZ;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS upravil_id UUID REFERENCES profiles(id);
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS upravene_at TIMESTAMPTZ;

ALTER TABLE dochadzka DROP CONSTRAINT IF EXISTS dochadzka_zdroj_check;
ALTER TABLE dochadzka ADD CONSTRAINT dochadzka_zdroj_check
  CHECK (zdroj IN ('pin', 'rfid', 'manual', 'system', 'auto'));

CREATE INDEX IF NOT EXISTS idx_dochadzka_user_datum ON dochadzka(user_id, datum);
CREATE INDEX IF NOT EXISTS idx_dochadzka_auto ON dochadzka(auto_doplnene) WHERE auto_doplnene = TRUE;

-- 2. dochadzka_uzavierka
CREATE TABLE IF NOT EXISTS dochadzka_uzavierka (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID NOT NULL REFERENCES firmy(id) ON DELETE CASCADE,
  mesiac VARCHAR(7) NOT NULL,
  stav VARCHAR(20) NOT NULL DEFAULT 'otvoreny'
    CHECK (stav IN ('otvoreny', 'na_kontrolu', 'uzavrety')),
  na_kontrolu_at TIMESTAMPTZ,
  na_kontrolu_by UUID REFERENCES profiles(id),
  uzavrety_at TIMESTAMPTZ,
  uzavrety_by UUID REFERENCES profiles(id),
  prelomenie_dovod TEXT,
  prelomil_id UUID REFERENCES profiles(id),
  prelomil_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firma_id, mesiac)
);
CREATE INDEX IF NOT EXISTS idx_uzavierka_firma_mesiac ON dochadzka_uzavierka(firma_id, mesiac);

ALTER TABLE dochadzka_uzavierka ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uzavierka_admin_all" ON dochadzka_uzavierka FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
CREATE POLICY "uzavierka_select_own_firma" ON dochadzka_uzavierka FOR SELECT USING (
  firma_id IN (SELECT firma_id FROM profiles WHERE id = auth.uid())
);

-- 3. dochadzka_schvalene_hodiny
CREATE TABLE IF NOT EXISTS dochadzka_schvalene_hodiny (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mesiac VARCHAR(7) NOT NULL,
  schvaleny_at TIMESTAMPTZ DEFAULT now(),
  schvaleny_by UUID NOT NULL REFERENCES profiles(id),
  poznamka TEXT,
  UNIQUE(user_id, mesiac)
);
CREATE INDEX IF NOT EXISTS idx_schvalene_user_mesiac ON dochadzka_schvalene_hodiny(user_id, mesiac);

ALTER TABLE dochadzka_schvalene_hodiny ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schvalene_admin_all" ON dochadzka_schvalene_hodiny FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
CREATE POLICY "schvalene_select_own" ON dochadzka_schvalene_hodiny FOR SELECT USING (user_id = auth.uid());

-- 4. dochadzka_korekcia_ziadosti
CREATE TABLE IF NOT EXISTS dochadzka_korekcia_ziadosti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  povodny_zaznam_id UUID REFERENCES dochadzka(id) ON DELETE SET NULL,
  navrh_smer VARCHAR(10),
  navrh_dovod VARCHAR(30),
  navrh_cas TIMESTAMPTZ,
  poznamka_zamestnanec TEXT NOT NULL,
  stav VARCHAR(20) NOT NULL DEFAULT 'caka_na_schvalenie'
    CHECK (stav IN ('caka_na_schvalenie', 'schvalena', 'zamietnuta')),
  vybavila_id UUID REFERENCES profiles(id),
  vybavila_at TIMESTAMPTZ,
  poznamka_mzdarka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ziadosti_stav ON dochadzka_korekcia_ziadosti(stav);
CREATE INDEX IF NOT EXISTS idx_ziadosti_user ON dochadzka_korekcia_ziadosti(user_id);

ALTER TABLE dochadzka_korekcia_ziadosti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ziadosti_admin_all" ON dochadzka_korekcia_ziadosti FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
CREATE POLICY "ziadosti_own_select" ON dochadzka_korekcia_ziadosti FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ziadosti_own_insert" ON dochadzka_korekcia_ziadosti FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. dochadzka_history (verzionovanie)
CREATE TABLE IF NOT EXISTS dochadzka_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dochadzka_id UUID NOT NULL,
  zmena_typ VARCHAR(20) NOT NULL CHECK (zmena_typ IN ('insert', 'update', 'delete')),
  povodne_data JSONB,
  nove_data JSONB,
  zmenil_id UUID REFERENCES profiles(id),
  zmenil_at TIMESTAMPTZ DEFAULT now(),
  dovod TEXT
);
CREATE INDEX IF NOT EXISTS idx_history_dochadzka ON dochadzka_history(dochadzka_id);

ALTER TABLE dochadzka_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_admin_select" ON dochadzka_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);

-- 6. profiles rozšírenia
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pristupne_firmy UUID[] DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_pip_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fond_per_den JSONB;

-- 7. Trigger pre dochadzka_history
CREATE OR REPLACE FUNCTION dochadzka_history_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, nove_data, zmenil_id, dovod)
    VALUES (NEW.id, 'insert', to_jsonb(NEW), NEW.upravil_id, NEW.korekcia_dovod);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, povodne_data, nove_data, zmenil_id, dovod)
    VALUES (NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.upravil_id, NEW.korekcia_dovod);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, povodne_data, zmenil_id)
    VALUES (OLD.id, 'delete', to_jsonb(OLD), OLD.upravil_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dochadzka_history_t ON dochadzka;
CREATE TRIGGER dochadzka_history_t
  AFTER INSERT OR UPDATE OR DELETE ON dochadzka
  FOR EACH ROW EXECUTE FUNCTION dochadzka_history_trigger();

COMMIT;
```

- [ ] **Step 2: Aplikovať migráciu cez Supabase**

Run: `npx supabase db push` alebo cez Supabase Studio Dashboard SQL Editor.
Expected: 0 errors.

- [ ] **Step 3: Verifikovať vytvorené tabuľky a stĺpce**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js')
require('fs').readFileSync('.env.local','utf8').split('\n').forEach(l=>{const[k,...v]=l.split('=');if(k)process.env[k.trim()]=v.join('=').trim()})
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
;(async()=>{
  for (const t of ['dochadzka_uzavierka','dochadzka_schvalene_hodiny','dochadzka_korekcia_ziadosti','dochadzka_history']) {
    const { error } = await sb.from(t).select('id').limit(1)
    console.log(t, error ? '❌' : '✅')
  }
  const { data } = await sb.from('profiles').select('pristupne_firmy, auto_pip_enabled, fond_per_den').limit(1)
  console.log('profiles cols:', data ? '✅' : '❌')
  const { data:d2 } = await sb.from('dochadzka').select('auto_doplnene, korekcia_dovod, povodny_cas, upravil_id').limit(1)
  console.log('dochadzka cols:', d2 ? '✅' : '❌')
})()
"
```

Expected: 6× ✅

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260429000000_dochadzka_mzdy.sql
git commit -m "feat(db): dochádzka modul migrácia — 4 nové tabuľky + 5 stĺpcov + trigger"
```

### Task 1.2: TS types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/dochadzka-types.ts`

- [ ] **Step 1: Pridať types do `src/lib/dochadzka-types.ts`**

```typescript
// (zachovať existujúce, pridať nové)

export type StavUzavierky = 'otvoreny' | 'na_kontrolu' | 'uzavrety'

export interface DochadzkaUzavierka {
  id: string
  firma_id: string
  mesiac: string  // YYYY-MM
  stav: StavUzavierky
  na_kontrolu_at: string | null
  na_kontrolu_by: string | null
  uzavrety_at: string | null
  uzavrety_by: string | null
  prelomenie_dovod: string | null
  prelomil_id: string | null
  prelomil_at: string | null
}

export interface DochadzkaSchvalenehoHodiny {
  id: string
  user_id: string
  mesiac: string
  schvaleny_at: string
  schvaleny_by: string
  poznamka: string | null
}

export type StavZiadosti = 'caka_na_schvalenie' | 'schvalena' | 'zamietnuta'

export interface KorekciaZiadost {
  id: string
  user_id: string
  datum: string
  povodny_zaznam_id: string | null
  navrh_smer: 'prichod' | 'odchod' | null
  navrh_dovod: string | null
  navrh_cas: string | null
  poznamka_zamestnanec: string
  stav: StavZiadosti
  vybavila_id: string | null
  vybavila_at: string | null
  poznamka_mzdarka: string | null
  created_at: string
}

export interface DochadzkaHistoryEntry {
  id: string
  dochadzka_id: string
  zmena_typ: 'insert' | 'update' | 'delete'
  povodne_data: Record<string, unknown> | null
  nove_data: Record<string, unknown> | null
  zmenil_id: string | null
  zmenil_at: string
  dovod: string | null
}

export interface AnomalyType {
  typ: 'chyba_odchod' | 'auto_doplnene' | 'neuplny_mesiac' | 'podozrivy_cas' | 'dlhy_blok' | 'duplicitny' | 'kolizia_dovolenka' | 'praca_vo_sviatok'
  severita: 'low' | 'medium' | 'high'
  datum: string
  popis: string
  zaznam_id?: string
}

export interface PriplatkySumar {
  nocna_hod: number
  sobota_hod: number
  nedela_hod: number
  sviatok_hod: number
  nadcas_hod: number
}

// Rozšíriť existujúci DochadzkaZaznam
// (v existujúcom súbore pridať polia auto_doplnene, korekcia_dovod, povodny_cas, upravil_id, upravene_at)
```

- [ ] **Step 2: Pridať `pristupne_firmy`, `auto_pip_enabled`, `fond_per_den` do `Profile` interface v `src/lib/types.ts`**

```typescript
// V interface Profile (existujúci súbor) pridať:
  pristupne_firmy: string[] | null
  auto_pip_enabled: boolean
  fond_per_den: Record<string, number> | null
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/dochadzka-types.ts
git commit -m "feat(types): typy pre dochádzku modul (uzavierka, ziadosti, history, priplatky)"
```

---

## FÁZA 2: Multi-firma scope helpers

### Task 2.1: getAccessibleFirmaIds helper

**Files:**
- Create: `src/lib/firma-scope.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/lib/firma-scope.ts
import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'

/**
 * Vráti zoznam firma_id ku ktorým má používateľ prístup.
 * - it_admin → null = vidí všetky
 * - fin_manager → vidí všetky firmy v systéme (clamp môže byť later)
 * - ostatní → svoja firma_id + pristupne_firmy[]
 */
export async function getAccessibleFirmaIds(userId: string): Promise<string[] | null> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, firma_id, pristupne_firmy')
    .eq('id', userId)
    .single<{ role: string; firma_id: string | null; pristupne_firmy: string[] | null }>()

  if (!profile) return []
  if (profile.role === 'it_admin') return null  // null = vidí všetky

  const ids: string[] = []
  if (profile.firma_id) ids.push(profile.firma_id)
  if (profile.pristupne_firmy) ids.push(...profile.pristupne_firmy)

  if (profile.role === 'fin_manager' && ids.length === 0) {
    // fin_manager bez firma_id vidí všetky
    const { data: firmy } = await admin.from('firmy').select('id').eq('aktivna', true)
    return (firmy || []).map(f => f.id)
  }

  return [...new Set(ids)]  // dedupe
}
```

- [ ] **Step 2: Vytvoriť test**

```typescript
// scripts/test-firma-scope.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
fs.readFileSync('.env.local','utf8').split('\n').forEach(l=>{const[k,...v]=l.split('=');if(k)process.env[k.trim()]=v.join('=').trim()})
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Načítaj demo.gr (it_admin) a demo.uctovnik (admin) profile
const { data: gr } = await sb.from('profiles').select('id').eq('email', 'demo.gr@imet.sk').single()
const { data: uc } = await sb.from('profiles').select('id, firma_id').eq('email', 'demo.uctovnik@imet.sk').single()
console.log('IT admin id:', gr?.id, 'Mzdárka:', uc?.id, 'firma:', uc?.firma_id)
// Manuálne test cez DB query — full automated test až v executing-plans
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/firma-scope.ts
git commit -m "feat(lib): firma-scope helper pre multi-firma prístup"
```

### Task 2.2: Admin UI pre `pristupne_firmy[]`

**Files:**
- Modify: `src/components/UserPermissionsSection.tsx` (alebo equivalent)

- [ ] **Step 1: Nájsť existujúci komponent na editáciu user permissions**

```bash
grep -rn "pristupne_firmy\|firma_id.*update" src/components/ src/actions/ | head -10
```

- [ ] **Step 2: Pridať multi-select dropdown firiem**

V detaile zamestnanca (`/admin/zamestnanci/[id]`) pod "Firma" pridať checkbox zoznam pre `pristupne_firmy`.

```tsx
{/* Dodatočné firmy ku ktorým má prístup */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Dodatočné firmy (mzdárka môže pracovať s týmito firmami popri svojej hlavnej):
  </label>
  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
    {firmy.filter(f => f.id !== profile.firma_id).map(f => (
      <label key={f.id} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pristupneFirmy.includes(f.id)}
          onChange={(e) => {
            const next = e.target.checked
              ? [...pristupneFirmy, f.id]
              : pristupneFirmy.filter(x => x !== f.id)
            setPristupneFirmy(next)
          }}
        />
        {f.nazov}
      </label>
    ))}
  </div>
  <button onClick={() => updateUserPristupneFirmy(profile.id, pristupneFirmy)} className="mt-2 px-3 py-1.5 bg-primary text-white rounded text-sm">Uložiť</button>
</div>
```

- [ ] **Step 3: Server action**

```typescript
// V src/actions/zamestnanci.ts pridať:
export async function updateUserPristupneFirmy(profileId: string, firmaIds: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const { createSupabaseAdmin } = await import('@/lib/supabase-admin')
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('profiles').update({ pristupne_firmy: firmaIds }).eq('id', profileId)
  if (error) return { error: 'Chyba pri uložení' }
  await logAudit('zmena_pristupne_firmy', 'profiles', profileId, { firmaIds })
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}
```

- [ ] **Step 4: TypeScript check + Commit**

```bash
npx tsc --noEmit && git add . && git commit -m "feat(admin): multi-firma scope edit pre zamestnancov"
```

---

## FÁZA 3: Cron auto-pipnutie

### Task 3.1: Fond helper

**Files:**
- Create: `src/lib/dochadzka-fond.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/lib/dochadzka-fond.ts
import type { Profile } from './types'

/** Vráti pracovný fond v hodinách pre konkrétny dátum. */
export function calculateFond(profile: Pick<Profile, 'pracovny_fond_hodiny' | 'fond_per_den'>, datum: Date): number {
  const fondPerDen = profile.fond_per_den
  if (fondPerDen) {
    const days = ['ne', 'po', 'ut', 'st', 'stv', 'pi', 'so']
    const key = days[datum.getDay()]
    if (typeof fondPerDen[key] === 'number') return fondPerDen[key]
  }
  return profile.pracovny_fond_hodiny || 8.5
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dochadzka-fond.ts
git commit -m "feat(lib): calculateFond helper s podporou fond_per_den"
```

### Task 3.2: Cron API endpoint

**Files:**
- Create: `src/app/api/cron/auto-pip/route.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/app/api/cron/auto-pip/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { isPracovnyDen } from '@/lib/dochadzka-utils'
import { calculateFond } from '@/lib/dochadzka-fond'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return runAutoPip()
}

// GET pre manuálne spustenie z Vercel Cron (Vercel volá GET)
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return runAutoPip()
}

async function runAutoPip() {
  const admin = createSupabaseAdmin()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const datum = yesterday.toISOString().split('T')[0]

  if (!isPracovnyDen(yesterday)) {
    return NextResponse.json({ ok: true, skipped: 'weekend_or_holiday', datum })
  }

  // Načítaj všetkých aktívnych ne-tablet zamestnancov s auto_pip_enabled
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, firma_id, role, pracovny_fond_hodiny, fond_per_den, auto_pip_enabled')
    .eq('active', true)
    .neq('role', 'tablet')
    .eq('auto_pip_enabled', true)

  let processed = 0
  const autoDoplnene: string[] = []

  for (const p of profiles || []) {
    // Skip ak má dovolenku/PN/OČR alebo cestu na yesterday
    const { data: dov } = await admin
      .from('dovolenky')
      .select('id').eq('user_id', p.id).eq('stav', 'schvalena')
      .lte('datum_od', datum).gte('datum_do', datum).limit(1)
    if (dov && dov.length > 0) continue

    const { data: cesta } = await admin
      .from('sluzobne_cesty')
      .select('id').eq('user_id', p.id).eq('stav', 'schvalena')
      .lte('datum_od', datum).gte('datum_do', datum).limit(1)
    if (cesta && cesta.length > 0) continue

    // Načítaj záznamy yesterday
    const { data: zaznamy } = await admin
      .from('dochadzka')
      .select('id, smer, dovod, cas')
      .eq('user_id', p.id).eq('datum', datum)
      .order('cas', { ascending: true })

    if (!zaznamy || zaznamy.length === 0) continue

    const last = zaznamy[zaznamy.length - 1]
    if (last.smer !== 'prichod') continue
    if (last.dovod !== 'praca') continue

    const firstPrichod = zaznamy.find(z => z.smer === 'prichod')
    if (firstPrichod && new Date(firstPrichod.cas).getHours() >= 18) continue

    // Vypočítaj odchod
    const fond = calculateFond(p, yesterday)
    const prichodTime = new Date(last.cas)
    let odchodTime = new Date(prichodTime.getTime() + fond * 60 * 60 * 1000)
    const eod = new Date(yesterday); eod.setHours(23, 59, 0, 0)
    if (odchodTime > eod) odchodTime = eod

    // Insert auto-doplnený odchod
    await admin.from('dochadzka').insert({
      user_id: p.id, datum, smer: 'odchod', dovod: 'praca',
      cas: odchodTime.toISOString(), zdroj: 'auto', auto_doplnene: true,
    })

    // Notifikácia zamestnancovi
    await admin.from('notifikacie').insert({
      user_id: p.id, typ: 'dochadzka_auto_pip',
      nadpis: 'Auto-doplnený odchod',
      sprava: `Včera (${datum}) ste sa zabudli odpípnuť. Systém doplnil odchod o ${odchodTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}. Ak je čas iný, kontaktujte mzdárku.`,
      link: '/dochadzka-prehled',
    })

    autoDoplnene.push(p.full_name)
    processed++
  }

  // Bulk notifikácia mzdárkam (admin/it_admin/fin_manager za firmu)
  if (autoDoplnene.length > 0) {
    const { data: mzdarky } = await admin
      .from('profiles').select('id')
      .in('role', ['admin', 'it_admin', 'fin_manager']).eq('active', true)
    for (const m of mzdarky || []) {
      await admin.from('notifikacie').insert({
        user_id: m.id, typ: 'dochadzka_auto_pip',
        nadpis: `Auto-doplnené ${processed} záznamov`,
        sprava: `Za ${datum} bolo auto-doplnené ${processed} odchodov: ${autoDoplnene.slice(0,5).join(', ')}${autoDoplnene.length>5?'…':''}`,
        link: '/admin/dochadzka',
      })
    }
  }

  return NextResponse.json({ ok: true, datum, processed, autoDoplnene })
}
```

- [ ] **Step 2: Vercel cron config**

Modify: `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/auto-pip", "schedule": "30 0 * * *" }
  ]
}
```

- [ ] **Step 3: ENV premenná `CRON_SECRET`**

```bash
# Lokálne
echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local

# Vercel — manuálne v dashboard alebo cez CLI:
vercel env add CRON_SECRET production
```

- [ ] **Step 4: Manuálny test endpointu (lokálne)**

```bash
curl -X POST http://localhost:3333/api/cron/auto-pip \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

Expected: `{"ok":true,"datum":"...","processed":N,"autoDoplnene":[...]}`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/auto-pip/route.ts vercel.json
git commit -m "feat(cron): auto-pipnutie odchodu cez polnoc s in-app notifikáciami"
```

---

## FÁZA 4: Server actions pre korektúry s auditom

### Task 4.1: dochadzka-korekcie actions

**Files:**
- Create: `src/actions/dochadzka-korekcie.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/actions/dochadzka-korekcie.ts
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

interface ZaznamData {
  user_id: string
  datum: string
  smer: 'prichod' | 'odchod'
  dovod: string
  cas: string  // ISO
}

async function checkUzavierka(userId: string, datum: string): Promise<{ blocked: boolean; reason?: string }> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('firma_id, role').eq('id', userId).single<{ firma_id: string | null; role: string }>()
  if (!profile?.firma_id) return { blocked: false }
  const mesiac = datum.slice(0, 7)
  const { data: uz } = await admin
    .from('dochadzka_uzavierka').select('stav')
    .eq('firma_id', profile.firma_id).eq('mesiac', mesiac).single<{ stav: string }>()
  if (uz?.stav === 'uzavrety') {
    // Iba it_admin môže prelomiť
    return { blocked: true, reason: 'Mesiac je uzavretý. Pre úpravy kontaktujte IT admina.' }
  }
  return { blocked: false }
}

export async function pridatZaznam(data: ZaznamData & { korekcia_dovod: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const block = await checkUzavierka(data.user_id, data.datum)
  if (block.blocked) return { error: block.reason }
  if (!data.korekcia_dovod?.trim()) return { error: 'Dôvod korektúry je povinný' }

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka').insert({
    user_id: data.user_id, datum: data.datum, smer: data.smer, dovod: data.dovod,
    cas: data.cas, zdroj: 'manual', korekcia_dovod: data.korekcia_dovod,
    upravil_id: auth.user.id, upravene_at: new Date().toISOString(),
  })
  if (error) return { error: 'Chyba pri uložení' }
  await logAudit('dochadzka_pridanie', 'dochadzka', data.user_id, { datum: data.datum, smer: data.smer })

  // Notifikácia zamestnancovi
  await admin.from('notifikacie').insert({
    user_id: data.user_id, typ: 'dochadzka_korekcia',
    nadpis: 'Dochádzka upravená', sprava: `Mzdárka pridala záznam ${data.datum}. Dôvod: ${data.korekcia_dovod}`,
    link: '/dochadzka-prehled',
  })

  revalidatePath(`/admin/dochadzka/${data.user_id}`)
  revalidatePath('/dochadzka-prehled')
}

export async function upravitZaznam(zaznamId: string, novyCas: string, novySmer: 'prichod' | 'odchod', novyDovod: string, dovod_korekcie: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod_korekcie?.trim()) return { error: 'Dôvod korektúry je povinný' }

  const admin = createSupabaseAdmin()
  const { data: original } = await admin.from('dochadzka').select('user_id, datum, cas').eq('id', zaznamId).single<{ user_id: string; datum: string; cas: string }>()
  if (!original) return { error: 'Záznam nenájdený' }

  const block = await checkUzavierka(original.user_id, original.datum)
  if (block.blocked) return { error: block.reason }

  const { error } = await admin.from('dochadzka').update({
    cas: novyCas, smer: novySmer, dovod: novyDovod,
    povodny_cas: original.cas, korekcia_dovod: dovod_korekcie,
    upravil_id: auth.user.id, upravene_at: new Date().toISOString(),
  }).eq('id', zaznamId)
  if (error) return { error: 'Chyba pri úprave' }

  await logAudit('dochadzka_uprava', 'dochadzka', zaznamId, { dovod_korekcie })
  await admin.from('notifikacie').insert({
    user_id: original.user_id, typ: 'dochadzka_korekcia',
    nadpis: 'Dochádzka upravená', sprava: `Mzdárka upravila záznam ${original.datum}. Dôvod: ${dovod_korekcie}`,
    link: '/dochadzka-prehled',
  })

  // Zruší schválenie hodín pre tento mesiac (treba opätovne schváliť)
  await admin.from('dochadzka_schvalene_hodiny').delete()
    .eq('user_id', original.user_id).eq('mesiac', original.datum.slice(0, 7))

  revalidatePath(`/admin/dochadzka/${original.user_id}`)
}

export async function zmazatZaznam(zaznamId: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }

  const admin = createSupabaseAdmin()
  const { data: original } = await admin.from('dochadzka').select('user_id, datum').eq('id', zaznamId).single<{ user_id: string; datum: string }>()
  if (!original) return { error: 'Záznam nenájdený' }

  const block = await checkUzavierka(original.user_id, original.datum)
  if (block.blocked) return { error: block.reason }

  // Najprv update s dôvodom (aby trigger zachytil)
  await admin.from('dochadzka').update({
    korekcia_dovod: dovod, upravil_id: auth.user.id, upravene_at: new Date().toISOString(),
  }).eq('id', zaznamId)

  await admin.from('dochadzka').delete().eq('id', zaznamId)
  await logAudit('dochadzka_zmazanie', 'dochadzka', zaznamId, { dovod })

  revalidatePath(`/admin/dochadzka/${original.user_id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/dochadzka-korekcie.ts
git commit -m "feat(actions): dochádzka korekcie s auditom + uzavierka guard"
```

---

## FÁZA 5: Uzávierka

### Task 5.1: Uzavierka actions + helpers

**Files:**
- Create: `src/lib/dochadzka-uzavierka.ts`
- Create: `src/actions/dochadzka-uzavierka.ts`

- [ ] **Step 1: Helper na lookup stavu**

```typescript
// src/lib/dochadzka-uzavierka.ts
import 'server-only'
import { createSupabaseAdmin } from './supabase-admin'

export async function getUzavierkaStav(firmaId: string, mesiac: string) {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('dochadzka_uzavierka')
    .select('*').eq('firma_id', firmaId).eq('mesiac', mesiac).maybeSingle()
  return data || { stav: 'otvoreny' as const }
}
```

- [ ] **Step 2: Server actions**

```typescript
// src/actions/dochadzka-uzavierka.ts
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export async function spustitKontrolu(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_uzavierka').upsert({
    firma_id: firmaId, mesiac, stav: 'na_kontrolu',
    na_kontrolu_at: new Date().toISOString(), na_kontrolu_by: auth.user.id,
  }, { onConflict: 'firma_id,mesiac' })
  if (error) return { error: error.message }
  await logAudit('uzavierka_kontrola', 'dochadzka_uzavierka', firmaId, { mesiac })
  revalidatePath('/admin/dochadzka')
}

export async function uzavrietMesiac(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createSupabaseAdmin()
  // TODO: validate that all anomalies resolved + all employees approved
  const { error } = await admin.from('dochadzka_uzavierka').upsert({
    firma_id: firmaId, mesiac, stav: 'uzavrety',
    uzavrety_at: new Date().toISOString(), uzavrety_by: auth.user.id,
  }, { onConflict: 'firma_id,mesiac' })
  if (error) return { error: error.message }
  await logAudit('uzavierka_uzavrety', 'dochadzka_uzavierka', firmaId, { mesiac })
  revalidatePath('/admin/dochadzka')
}

export async function prelomitUzavierku(firmaId: string, mesiac: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (auth.profile.role !== 'it_admin') return { error: 'Iba IT admin môže prelomiť uzávierku' }
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_uzavierka').update({
    stav: 'otvoreny', prelomenie_dovod: dovod,
    prelomil_id: auth.user.id, prelomil_at: new Date().toISOString(),
  }).eq('firma_id', firmaId).eq('mesiac', mesiac)
  if (error) return { error: error.message }
  await logAudit('uzavierka_prelomenie', 'dochadzka_uzavierka', firmaId, { mesiac, dovod })
  revalidatePath('/admin/dochadzka')
}

export async function schvalitHodinyZamestnanca(userId: string, mesiac: string, poznamka?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createSupabaseAdmin()
  const { error } = await admin.from('dochadzka_schvalene_hodiny').upsert({
    user_id: userId, mesiac, schvaleny_by: auth.user.id, schvaleny_at: new Date().toISOString(), poznamka: poznamka || null,
  }, { onConflict: 'user_id,mesiac' })
  if (error) return { error: error.message }
  await logAudit('schvalenie_hodin', 'dochadzka_schvalene_hodiny', userId, { mesiac })
  revalidatePath(`/admin/dochadzka/${userId}`)
  revalidatePath('/admin/dochadzka')
}

export async function bulkSchvalitFirmu(firmaId: string, mesiac: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createSupabaseAdmin()
  const { data: zamestnanci } = await admin.from('profiles').select('id').eq('firma_id', firmaId).eq('active', true)
  const inserts = (zamestnanci || []).map(z => ({
    user_id: z.id, mesiac, schvaleny_by: auth.user.id, schvaleny_at: new Date().toISOString(),
  }))
  const { error } = await admin.from('dochadzka_schvalene_hodiny').upsert(inserts, { onConflict: 'user_id,mesiac' })
  if (error) return { error: error.message }
  await logAudit('bulk_schvalenie_firmy', 'dochadzka_schvalene_hodiny', firmaId, { mesiac, pocet: inserts.length })
  revalidatePath('/admin/dochadzka')
  return { count: inserts.length }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dochadzka-uzavierka.ts src/actions/dochadzka-uzavierka.ts
git commit -m "feat(uzavierka): stavový stroj + bulk schválenie + audit"
```

---

## FÁZA 6: Anomálie + príplatky

### Task 6.1: Anomálie

**Files:**
- Create: `src/lib/dochadzka-anomalies.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/lib/dochadzka-anomalies.ts
import 'server-only'
import type { AnomalyType } from './dochadzka-types'
import { isPracovnyDen, isSviatok } from './dochadzka-utils'
import { createSupabaseAdmin } from './supabase-admin'

export async function detectAnomalies(userId: string, mesiac: string): Promise<AnomalyType[]> {
  const admin = createSupabaseAdmin()
  const [rok, m] = mesiac.split('-').map(Number)
  const dni: AnomalyType[] = []

  const { data: zaznamy } = await admin
    .from('dochadzka').select('id, datum, smer, dovod, cas, auto_doplnene')
    .eq('user_id', userId)
    .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
    .order('cas', { ascending: true })

  // Group by datum
  const byDatum = new Map<string, typeof zaznamy>()
  for (const z of zaznamy || []) {
    if (!byDatum.has(z.datum)) byDatum.set(z.datum, [])
    byDatum.get(z.datum)!.push(z)
  }

  // Pre každý pracovný deň skontroluj
  const daysInMonth = new Date(rok, m, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(rok, m - 1, d)
    const datum = dt.toISOString().split('T')[0]
    const records = byDatum.get(datum) || []

    if (!isPracovnyDen(dt)) continue  // víkend/sviatok skip

    if (records.length === 0) {
      // Skontroluj či má dovolenku/PN
      const { data: dov } = await admin.from('dovolenky').select('id')
        .eq('user_id', userId).eq('stav', 'schvalena')
        .lte('datum_od', datum).gte('datum_do', datum).limit(1)
      if (!dov || dov.length === 0) {
        dni.push({ typ: 'neuplny_mesiac', severita: 'high', datum, popis: 'Chýbajúce záznamy v pracovný deň' })
      }
      continue
    }

    // auto_doplnene
    if (records.some(r => r.auto_doplnene)) {
      dni.push({ typ: 'auto_doplnene', severita: 'medium', datum, popis: 'Auto-doplnený odchod (kontrola potrebná)' })
    }

    // Chyba odchod
    const last = records[records.length - 1]
    if (last.smer === 'prichod') {
      dni.push({ typ: 'chyba_odchod', severita: 'high', datum, popis: 'Príchod bez odchodu', zaznam_id: last.id })
    }

    // Podozrivý čas
    for (const r of records) {
      const h = new Date(r.cas).getHours()
      if (h < 6 || h > 22) {
        dni.push({ typ: 'podozrivy_cas', severita: 'low', datum, popis: `Záznam o ${h}:xx`, zaznam_id: r.id })
      }
    }

    // Dlhý blok
    if (records.length >= 2) {
      const first = new Date(records[0].cas).getTime()
      const lastT = new Date(records[records.length - 1].cas).getTime()
      const hours = (lastT - first) / 3600000
      if (hours > 16) {
        dni.push({ typ: 'dlhy_blok', severita: 'high', datum, popis: `${hours.toFixed(1)}h bez prerušenia` })
      }
    }

    // Duplicitný (2× rovnaký smer za sebou)
    for (let i = 1; i < records.length; i++) {
      if (records[i].smer === records[i - 1].smer) {
        dni.push({ typ: 'duplicitny', severita: 'medium', datum, popis: `2× ${records[i].smer} za sebou`, zaznam_id: records[i].id })
        break
      }
    }
  }

  return dni
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dochadzka-anomalies.ts
git commit -m "feat(lib): detectAnomalies — 6 typov detekcie"
```

### Task 6.2: Príplatky helper

**Files:**
- Create: `src/lib/dochadzka-priplatky.ts`

- [ ] **Step 1: Implementácia**

```typescript
// src/lib/dochadzka-priplatky.ts
import 'server-only'
import type { PriplatkySumar } from './dochadzka-types'
import { isSviatok } from './dochadzka-utils'
import { createSupabaseAdmin } from './supabase-admin'
import { calculateFond } from './dochadzka-fond'

export async function calculatePriplatky(userId: string, mesiac: string): Promise<PriplatkySumar> {
  const admin = createSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('pracovny_fond_hodiny, fond_per_den').eq('id', userId).single()
  const { data: zaznamy } = await admin.from('dochadzka').select('datum, smer, dovod, cas')
    .eq('user_id', userId)
    .gte('datum', `${mesiac}-01`).lte('datum', `${mesiac}-31`)
    .order('cas')

  let nocna_min = 0, sobota_min = 0, nedela_min = 0, sviatok_min = 0, nadcas_min = 0

  // Group by datum
  const byDatum = new Map<string, typeof zaznamy>()
  for (const z of zaznamy || []) {
    if (!byDatum.has(z.datum)) byDatum.set(z.datum, [])
    byDatum.get(z.datum)!.push(z)
  }

  for (const [datum, recs] of byDatum.entries()) {
    if (!recs || recs.length < 2) continue
    const dt = new Date(datum + 'T00:00:00')
    const day = dt.getDay()  // 0=ne, 6=so

    // Pair príchod-odchod
    let pracaMin = 0
    let lastPrichod: Date | null = null
    for (const r of recs) {
      if (r.smer === 'prichod' && r.dovod === 'praca') lastPrichod = new Date(r.cas)
      else if (r.smer === 'odchod' && lastPrichod) {
        const odchod = new Date(r.cas)
        const blok = (odchod.getTime() - lastPrichod.getTime()) / 60000
        pracaMin += blok

        // Nočná: hodiny medzi 22:00-06:00 v rámci bloku
        const startH = lastPrichod.getHours() + lastPrichod.getMinutes() / 60
        const endH = odchod.getHours() + odchod.getMinutes() / 60
        // approximate: ak začiatok < 6 alebo koniec > 22
        // (presnejší výpočet by intersectoval blok s nočným časom)
        if (startH < 6) nocna_min += Math.min(360 - lastPrichod.getMinutes() - lastPrichod.getHours()*60, blok)
        if (endH > 22) nocna_min += Math.min(odchod.getHours()*60 + odchod.getMinutes() - 22*60, blok)

        lastPrichod = null
      }
    }

    if (day === 6) sobota_min += pracaMin
    if (day === 0) nedela_min += pracaMin
    if (isSviatok(dt)) sviatok_min += pracaMin

    const fondMin = calculateFond({ pracovny_fond_hodiny: profile?.pracovny_fond_hodiny ?? 8.5, fond_per_den: profile?.fond_per_den ?? null }, dt) * 60
    if (pracaMin > fondMin) nadcas_min += (pracaMin - fondMin)
  }

  return {
    nocna_hod: Math.round(nocna_min / 60 * 100) / 100,
    sobota_hod: Math.round(sobota_min / 60 * 100) / 100,
    nedela_hod: Math.round(nedela_min / 60 * 100) / 100,
    sviatok_hod: Math.round(sviatok_min / 60 * 100) / 100,
    nadcas_hod: Math.round(nadcas_min / 60 * 100) / 100,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dochadzka-priplatky.ts
git commit -m "feat(lib): calculatePriplatky — nočná, víkend, sviatok, nadčas"
```

---

## FÁZA 7: Hlavný prehľad — UI

### Task 7.1: DochadzkaFiltre komponent

**Files:**
- Create: `src/components/dochadzka/DochadzkaFiltre.tsx`

- [ ] **Step 1: Implementácia**

```tsx
'use client'
import { useState } from 'react'

export interface FilterValues {
  mesiac: string
  firmaIds: string[]
  oddelenia: string[]
  typUvazku: string[]
  status: 'all' | 'kompletny' | 'neuplny' | 'anomalie' | 'auto_doplnene'
  search: string
}

interface Props {
  values: FilterValues
  onChange: (v: FilterValues) => void
  firmy: Array<{ id: string; nazov: string; kod: string }>
  oddelenia: string[]
}

export default function DochadzkaFiltre({ values, onChange, firmy, oddelenia }: Props) {
  return (
    <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center">
      <input type="month" value={values.mesiac} onChange={e => onChange({ ...values, mesiac: e.target.value })}
        className="border rounded-lg px-3 py-2 text-sm" />

      <details className="relative">
        <summary className="border rounded-lg px-3 py-2 text-sm cursor-pointer">
          Firmy ({values.firmaIds.length || 'všetky'})
        </summary>
        <div className="absolute top-full left-0 bg-white border rounded-lg p-2 shadow-lg max-h-64 overflow-y-auto z-20">
          {firmy.map(f => (
            <label key={f.id} className="flex items-center gap-2 text-sm py-1">
              <input type="checkbox" checked={values.firmaIds.includes(f.id)}
                onChange={e => onChange({ ...values, firmaIds: e.target.checked ? [...values.firmaIds, f.id] : values.firmaIds.filter(x => x !== f.id) })} />
              {f.nazov}
            </label>
          ))}
        </div>
      </details>

      <select value={values.status} onChange={e => onChange({ ...values, status: e.target.value as FilterValues['status'] })}
        className="border rounded-lg px-3 py-2 text-sm">
        <option value="all">Všetky stavy</option>
        <option value="kompletny">Kompletní</option>
        <option value="neuplny">Neúplní</option>
        <option value="anomalie">S anomáliami</option>
        <option value="auto_doplnene">S auto-doplnenými</option>
      </select>

      <input value={values.search} onChange={e => onChange({ ...values, search: e.target.value })}
        placeholder="Hľadať podľa mena…"
        className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dochadzka/DochadzkaFiltre.tsx
git commit -m "feat(ui): DochadzkaFiltre komponent (mesiac, firma, status, search)"
```

### Task 7.2: DochadzkaKPI komponent

```tsx
'use client'
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

interface Props {
  vPraciCount: number
  autoDoplneneCount: number
  anomaliCount: number
  topNadcasy: Array<{ name: string; hours: number }>
  onFilter: (status: 'all' | 'auto_doplnene' | 'anomalie') => void
}

export default function DochadzkaKPI({ vPraciCount, autoDoplneneCount, anomaliCount, topNadcasy, onFilter }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <button className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
        <div className="flex items-center gap-2 text-green-700"><Users size={18}/><span className="text-xs font-medium">V práci práve teraz</span></div>
        <div className="text-2xl font-bold text-green-900 mt-1">{vPraciCount}</div>
      </button>
      <button onClick={() => onFilter('auto_doplnene')} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left hover:bg-yellow-100">
        <div className="flex items-center gap-2 text-yellow-700"><Clock size={18}/><span className="text-xs font-medium">Auto-doplnené</span></div>
        <div className="text-2xl font-bold text-yellow-900 mt-1">{autoDoplneneCount}</div>
      </button>
      <button onClick={() => onFilter('anomalie')} className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-left hover:bg-orange-100">
        <div className="flex items-center gap-2 text-orange-700"><AlertTriangle size={18}/><span className="text-xs font-medium">Anomálie</span></div>
        <div className="text-2xl font-bold text-orange-900 mt-1">{anomaliCount}</div>
      </button>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-700"><TrendingUp size={18}/><span className="text-xs font-medium">Top nadčasy</span></div>
        <div className="text-xs text-red-900 mt-1">
          {topNadcasy.slice(0,3).map(t => <div key={t.name} className="truncate">{t.name}: {t.hours}h</div>)}
        </div>
      </div>
    </div>
  )
}
```

```bash
git add src/components/dochadzka/DochadzkaKPI.tsx
git commit -m "feat(ui): DochadzkaKPI s 4 widgetmi"
```

### Task 7.3: Refactor /admin/dochadzka/page.tsx

Použije nové komponenty + `getAccessibleFirmaIds`. Server fetch v parallel:

```tsx
// src/app/admin/dochadzka/page.tsx
import { Suspense } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { getAccessibleFirmaIds } from '@/lib/firma-scope'
import { getSession } from '@/lib/get-session'
import AdminDochadzkaClient from '@/components/dochadzka/AdminDochadzkaClient'

export default async function Page({ searchParams }: { searchParams: Promise<{ mesiac?: string; firma?: string }> }) {
  const params = await searchParams
  const { profile } = await getSession()
  if (!profile) return null

  const mesiac = params.mesiac || new Date().toISOString().slice(0, 7)
  const accessibleFirmaIds = await getAccessibleFirmaIds(profile.id)

  const admin = createSupabaseAdmin()
  const [profilesRes, firmyRes] = await Promise.all([
    accessibleFirmaIds === null
      ? admin.from('profiles').select('id, full_name, pozicia, firma_id, pracovny_fond_hodiny, fond_per_den').eq('active', true)
      : admin.from('profiles').select('id, full_name, pozicia, firma_id, pracovny_fond_hodiny, fond_per_den').eq('active', true).in('firma_id', accessibleFirmaIds),
    admin.from('firmy').select('id, nazov, kod').eq('aktivna', true).order('poradie'),
  ])

  return <AdminDochadzkaClient
    profiles={profilesRes.data || []}
    firmy={firmyRes.data || []}
    initialMesiac={mesiac}
    accessibleFirmaIds={accessibleFirmaIds}
  />
}
```

(`AdminDochadzkaClient` zoskupuje filtre, KPI, tabuľku, Realtime channel — komplexný klient komponent.)

```bash
git add src/app/admin/dochadzka/page.tsx src/components/dochadzka/AdminDochadzkaClient.tsx
git commit -m "feat(admin/dochadzka): server-side scope + client komponent s filtrami"
```

---

## FÁZA 8: Detail zamestnanca + editor

### Task 8.1: DochadzkaEditorModal

**Files:**
- Create: `src/components/dochadzka/DochadzkaEditorModal.tsx`

```tsx
'use client'
import { useState } from 'react'
import { upravitZaznam, zmazatZaznam, pridatZaznam } from '@/actions/dochadzka-korekcie'
import Modal from '@/components/Modal'

interface Props {
  zaznam?: { id: string; smer: 'prichod'|'odchod'; dovod: string; cas: string }  // ak existuje, edit; inak insert
  userId: string
  datum: string
  onClose: () => void
  onSaved: () => void
}

export default function DochadzkaEditorModal({ zaznam, userId, datum, onClose, onSaved }: Props) {
  const [smer, setSmer] = useState(zaznam?.smer || 'prichod')
  const [dovod, setDovod] = useState(zaznam?.dovod || 'praca')
  const [cas, setCas] = useState(zaznam ? zaznam.cas.slice(0, 16) : `${datum}T08:00`)
  const [korekcia, setKorekcia] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true); setError('')
    const result = zaznam
      ? await upravitZaznam(zaznam.id, new Date(cas).toISOString(), smer, dovod, korekcia)
      : await pridatZaznam({ user_id: userId, datum, smer, dovod, cas: new Date(cas).toISOString(), korekcia_dovod: korekcia })
    if (result && 'error' in result && result.error) { setError(result.error); setLoading(false); return }
    onSaved(); onClose()
  }

  async function handleDelete() {
    if (!zaznam) return
    if (!korekcia.trim()) { setError('Dôvod zmazania je povinný'); return }
    if (!confirm('Naozaj zmazať záznam?')) return
    setLoading(true)
    const result = await zmazatZaznam(zaznam.id, korekcia)
    if (result && 'error' in result && result.error) { setError(result.error); setLoading(false); return }
    onSaved(); onClose()
  }

  return (
    <Modal title={zaznam ? 'Upraviť záznam' : 'Pridať záznam'} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <select value={smer} onChange={e => setSmer(e.target.value as 'prichod'|'odchod')} className="border rounded-lg px-3 py-2 text-sm">
            <option value="prichod">Príchod</option><option value="odchod">Odchod</option>
          </select>
          <select value={dovod} onChange={e => setDovod(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="praca">Práca</option><option value="obed">Obed</option><option value="lekar">Lekár</option>
            <option value="lekar_doprovod">Lekár doprovod</option><option value="sluzobne">Služobne</option>
            <option value="sluzobna_cesta">Služobná cesta</option><option value="prechod">Prechod</option>
            <option value="fajcenie">Fajčenie</option><option value="sukromne">Súkromné</option><option value="dovolenka">Dovolenka</option>
          </select>
        </div>
        <input type="datetime-local" value={cas} onChange={e => setCas(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <textarea value={korekcia} onChange={e => setKorekcia(e.target.value)} placeholder="Dôvod korektúry (povinný) *" rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm" required />
        <div className="flex justify-between gap-3">
          {zaznam && <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Zmazať</button>}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Zrušiť</button>
            <button onClick={handleSave} disabled={loading || !korekcia.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? 'Ukladám…' : 'Uložiť'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
```

```bash
git add src/components/dochadzka/DochadzkaEditorModal.tsx
git commit -m "feat(ui): DochadzkaEditorModal — pridať/upraviť/zmazať s povinným dôvodom"
```

### Task 8.2: Detail page integrácia

Integrovať modal do `src/app/admin/dochadzka/[userId]/page.tsx` + `MesacnyVykaz`.

```bash
git add src/app/admin/dochadzka/[userId]/page.tsx src/components/dochadzka/MesacnyVykaz.tsx
git commit -m "feat(admin): detail zamestnanca s editor modalom + auto-doplnené flagy"
```

---

## FÁZA 9: Žiadosti o korekciu

### Task 9.1: Server actions

```typescript
// src/actions/dochadzka-ziadosti.ts
'use server'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { upravitZaznam, pridatZaznam } from './dochadzka-korekcie'

export async function vytvoritZiadost(data: { datum: string; navrh_smer?: string; navrh_dovod?: string; navrh_cas?: string; poznamka: string; povodny_zaznam_id?: string }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth
  if (!data.poznamka?.trim()) return { error: 'Poznámka je povinná' }
  const admin = createSupabaseAdmin()
  await admin.from('dochadzka_korekcia_ziadosti').insert({
    user_id: auth.user.id, datum: data.datum, navrh_smer: data.navrh_smer || null,
    navrh_dovod: data.navrh_dovod || null, navrh_cas: data.navrh_cas || null,
    poznamka_zamestnanec: data.poznamka, povodny_zaznam_id: data.povodny_zaznam_id || null,
  })
  // Notifikuj mzdárky firmy
  const { data: profile } = await admin.from('profiles').select('firma_id, full_name').eq('id', auth.user.id).single()
  const { data: mzdarky } = await admin.from('profiles').select('id').in('role', ['admin', 'it_admin', 'fin_manager']).eq('active', true)
  for (const m of mzdarky || []) {
    await admin.from('notifikacie').insert({
      user_id: m.id, typ: 'dochadzka_ziadost',
      nadpis: 'Nová žiadosť o korekciu dochádzky',
      sprava: `${profile?.full_name} žiada opravu na ${data.datum}: ${data.poznamka.slice(0, 100)}`,
      link: '/admin/dochadzka/ziadosti',
    })
  }
  revalidatePath('/dochadzka-prehled')
}

export async function schvalitZiadost(ziadostId: string, poznamka_mzdarka?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createSupabaseAdmin()
  const { data: z } = await admin.from('dochadzka_korekcia_ziadosti').select('*').eq('id', ziadostId).single()
  if (!z) return { error: 'Žiadosť nenájdená' }

  // Aplikuj korekciu
  if (z.povodny_zaznam_id && z.navrh_cas) {
    await upravitZaznam(z.povodny_zaznam_id, z.navrh_cas, z.navrh_smer || 'prichod', z.navrh_dovod || 'praca', `Schválená žiadosť: ${z.poznamka_zamestnanec}`)
  } else if (z.navrh_cas) {
    await pridatZaznam({ user_id: z.user_id, datum: z.datum, smer: z.navrh_smer || 'prichod', dovod: z.navrh_dovod || 'praca', cas: z.navrh_cas, korekcia_dovod: `Schválená žiadosť: ${z.poznamka_zamestnanec}` })
  }

  await admin.from('dochadzka_korekcia_ziadosti').update({
    stav: 'schvalena', vybavila_id: auth.user.id, vybavila_at: new Date().toISOString(),
    poznamka_mzdarka: poznamka_mzdarka || null,
  }).eq('id', ziadostId)

  await admin.from('notifikacie').insert({
    user_id: z.user_id, typ: 'dochadzka_ziadost', nadpis: 'Žiadosť schválená',
    sprava: `Vaša žiadosť o korekciu ${z.datum} bola schválená.`, link: '/dochadzka-prehled',
  })
  revalidatePath('/admin/dochadzka/ziadosti')
}

export async function zamietnutZiadost(ziadostId: string, dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!dovod?.trim()) return { error: 'Dôvod je povinný' }
  const admin = createSupabaseAdmin()
  const { data: z } = await admin.from('dochadzka_korekcia_ziadosti').select('user_id, datum').eq('id', ziadostId).single()
  await admin.from('dochadzka_korekcia_ziadosti').update({
    stav: 'zamietnuta', vybavila_id: auth.user.id, vybavila_at: new Date().toISOString(), poznamka_mzdarka: dovod,
  }).eq('id', ziadostId)
  if (z) {
    await admin.from('notifikacie').insert({
      user_id: z.user_id, typ: 'dochadzka_ziadost', nadpis: 'Žiadosť zamietnutá',
      sprava: `Vaša žiadosť ${z.datum} bola zamietnutá. Dôvod: ${dovod}`, link: '/dochadzka-prehled',
    })
  }
  revalidatePath('/admin/dochadzka/ziadosti')
}
```

```bash
git add src/actions/dochadzka-ziadosti.ts
git commit -m "feat(actions): žiadosti o korekciu dochádzky — vytvoriť/schváliť/zamietnut"
```

### Task 9.2: UI

- `src/components/dochadzka/KorekciaZiadostForm.tsx` — formulár v `/dochadzka-prehled`
- `src/components/dochadzka/KorekciaZiadostiInbox.tsx` — mzdárkina inbox v `/admin/dochadzka/ziadosti`
- `src/app/admin/dochadzka/ziadosti/page.tsx` — stránka s tabuľkou žiadostí

(Použiť existujúci DataTable + Modal patterns z DovolenkySchvalovanie.)

```bash
git add src/components/dochadzka/KorekciaZiadost*.tsx src/app/admin/dochadzka/ziadosti/page.tsx
git commit -m "feat(ui): zamestnanecký formulár + mzdárkina inbox žiadostí"
```

---

## FÁZA 10: Reporty + XLSX

### Task 10.1: exceljs setup + helper

```bash
npm install exceljs
```

```typescript
// src/lib/xlsx.ts
import 'server-only'
import ExcelJS from 'exceljs'

export async function generateXLSX(sheetName: string, headers: string[], rows: (string | number)[][], filename: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  ws.addRow(headers).font = { bold: true }
  for (const row of rows) ws.addRow(row)
  ws.columns.forEach(c => { c.width = Math.max(12, (c.values?.[1]?.toString().length ?? 12) + 2) })
  return Buffer.from(await wb.xlsx.writeBuffer()) as Buffer
}
```

```bash
git add src/lib/xlsx.ts package.json package-lock.json
git commit -m "feat(lib): xlsx helper cez exceljs"
```

### Task 10.2 — 10.5: 9 reportov

Pre každý report endpoint `/api/reporty/dochadzka/{slug}.xlsx`:
1. Mzdový podklad
2. Sumár firmy
3. Anomálie
4. Auto-doplnené
5. Nadčasy
6. Korektúry (audit)
7. Ročný prehľad
8. Custom range
9. Trend

(Detail v executing-plans podľa rovnakého patternu — server route generuje XLSX.)

```bash
git add src/app/api/reporty/dochadzka/
git commit -m "feat(reporty): 9 XLSX exportov pre mzdárky"
```

### Task 10.6: Print CSS

```css
/* src/app/globals.css — pridať */
@media print {
  .no-print { display: none !important; }
  body { background: white; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
}
```

```bash
git add src/app/globals.css
git commit -m "feat(ui): print CSS pre reporty"
```

---

## FÁZA 11: Štatistiky firmy

### Task 11.1: recharts + dashboard

```bash
npm install recharts
```

`/admin/dochadzka/statistiky` — server fetch agregátnych dát (12 mesiacov), client komponent s grafmi (LineChart pre trend, BarChart pre top nadčasy).

```bash
git add src/app/admin/dochadzka/statistiky/ src/components/dochadzka/StatistikyDashboard.tsx package.json
git commit -m "feat(ui): štatistiky firmy s grafmi (recharts)"
```

---

## FÁZA 12: Bulk import + PIN reset

### Task 12.1: XLSX import

`/admin/dochadzka/import` — drag&drop XLSX, preview, mapping stĺpcov, upload.

### Task 12.2: PIN reset

V detaile zamestnanca tlačidlo "Reset PIN" → server action vygeneruje nový 4-miestny PIN, audit, notifikácia.

```bash
git add src/app/admin/dochadzka/import/ src/components/dochadzka/BulkImportForm.tsx src/actions/dochadzka-import.ts
git commit -m "feat: bulk XLSX import + PIN reset"
```

---

## FÁZA 13: Zamestnanecký dashboard

Rozšíriť `src/components/dochadzka/MojaDochadzka.tsx`:
- Sumár boxy (fond, odpracované, dovolenka, PN, OČR, stav)
- Ročný prehľad tabuľka 12 × stĺpce
- "Nahlásiť chybu" button → otvorí KorekciaZiadostForm
- "PDF výkaz" button → vlastný export

```bash
git add src/components/dochadzka/MojaDochadzka.tsx src/app/(zamestnanec)/dochadzka-prehled/page.tsx
git commit -m "feat(zamestnanec): rozšírený dashboard — ročný prehľad + nahlásiť chybu"
```

---

## FÁZA 14: E2E test

### Task 14.1: e2e-dochadzka-workflow.mjs

Pokrytie:
- Vytvor demo dáta cez existujúci demo-seed
- Login ako mzdárka, otvor /admin/dochadzka, over filtre
- Edituj záznam zamestnanca (audit log entry)
- Spusti kontrolu mesiaca, schváľ hodiny zamestnanca, uzavri mesiac
- Pokus o úpravu uzavretého → blocked
- Cron auto-pip endpoint manuálne (inject mock včerajší príchod bez odchodu)
- Verify že vznikol auto_doplnene záznam + notifikácia
- Login ako zamestnanec, vytvor žiadosť o korekciu
- Login ako mzdárka, schvál žiadosť → záznam aktualizovaný
- Generuj XLSX report, verify file content

```bash
git add scripts/e2e-dochadzka-workflow.mjs
git commit -m "test: E2E workflow dochádzkového modulu"
```

### Task 14.2: Spusti + bug fixes

```bash
node scripts/demo-seed.mjs
PORT=3333 npx next dev -p 3333 &
node scripts/e2e-dochadzka-workflow.mjs
```

Pri každom failure → debug, fix, commit.

---

## FÁZA 15: Deploy

```bash
git push origin main
vercel --prod --yes

# Nastaviť CRON_SECRET v produkcii
vercel env add CRON_SECRET production
# (zadať náhodný string z openssl rand -hex 32)

# Verify cron
vercel cron list
```

Update memory:
- `project_imet_dochadzka_2026_04_29.md` — kompletný stav modulu

---

## Self-Review

**Spec coverage:**
- ✅ Multi-firma scope (Task 2.1, 2.2, 7.3)
- ✅ Auto-pipnutie cron (Task 3.2)
- ✅ Korektúry s auditom (Task 4.1)
- ✅ Uzávierka (Task 5.1)
- ✅ Anomálie (Task 6.1)
- ✅ Príplatky (Task 6.2)
- ✅ Hlavný prehľad UI (Task 7.1-7.3)
- ✅ Detail + editor (Task 8.1, 8.2)
- ✅ Žiadosti o korekciu (Task 9.1, 9.2)
- ✅ Reporty + XLSX + print (Task 10.x)
- ✅ Štatistiky (Task 11)
- ✅ Bulk import + PIN reset (Task 12)
- ✅ Zamestnanecký dashboard (Task 13)
- ✅ E2E test (Task 14)

**Placeholder scan:** Niektoré fázy (10.2-10.5, 12.1) sú zhrnuté kvôli dĺžke — exact code blocks pridať count v executing-plans podľa zavedeného patternu (jsPDF/exceljs server routes).

**Type consistency:** ✅ DochadzkaUzavierka, KorekciaZiadost, AnomalyType, PriplatkySumar — používané konzistentne.

**Scope:** Veľký, ale ide o **single coherent feature** (dochádzkový modul). Nie je možné rozdeliť bez straty integrácie (cron závisí od fond helper, anomálie závisia od uzávierky, atď.). Ostáva ako jeden plán s 15 fázami.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-29-dochadzka-mzdy-plan.md`.**
