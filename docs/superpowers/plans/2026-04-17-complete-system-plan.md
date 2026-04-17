# IMET Kompletny System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doplnit vsetky chybajuce funkcie do interneho systemu IMET (okrem dochadzky) + pridat manualove stranky ku kazdemu modulu.

**Architecture:** Kazda faza produkuje funkcny softver. Zaciname DB migraciou, potom cross-cutting (email, dark mode), potom modul po module, na konci manualy a dashboard integraciu.

**Tech Stack:** Next.js 16 (App Router, React 19), Supabase (PostgreSQL + Auth + Storage), Tailwind CSS v4, jsPDF, Lucide React

**Working Directory:** `C:/CLAUDE PROJEKTY/imetjazdy-work/`

**Key Patterns:**
- Server actions: `'use server'` + `requireAdmin()` / `requireFleetOrAdmin()` / `requireFinOrAdmin()` from `@/lib/auth-helpers`
- Admin operations: `createSupabaseAdmin()` from `@/lib/supabase-admin`
- Notifications: `createNotifikacia(userId, typ, nadpis, sprava, link)` from `@/actions/notifikacie`
- Audit: `logAudit(akcia, tabulka, entityId, details)` from `@/actions/audit`
- Types: `@/lib/types.ts` (Profile, Vozidlo, Jazda), `@/lib/fleet-types.ts`, `@/lib/archiv-types.ts`
- Components: `DataTable` from `@/components/ui/DataTable` for tables with search/filter/sort/pagination/CSV
- Revalidation: `revalidatePath()` after mutations
- Routing: `(zamestnanec)` group = employee, `admin/` = admin, `fleet/` = fleet manager

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260417100000_complete_system.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ==============================================================
-- IMET Complete System Migration 2026-04-17
-- New tables: vozidlo_tankovanie, tankove_karty, onboarding_items, skolenia, archiv_kategorie
-- Extended: dokumenty_archiv, vozidlo_servisy, cesta_doklady, sluzobne_cesty, profiles
-- ==============================================================

-- 1. ARCHIV KATEGORIE (stromova struktura)
CREATE TABLE IF NOT EXISTS archiv_kategorie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nazov text NOT NULL,
  parent_id uuid REFERENCES archiv_kategorie(id) ON DELETE SET NULL,
  popis text,
  pristup_role text[] DEFAULT '{admin,it_admin}',
  poradie int DEFAULT 0,
  farba text DEFAULT '#6b7280',
  ikona text DEFAULT 'Folder',
  created_at timestamptz DEFAULT now()
);

-- Seed default kategorie
INSERT INTO archiv_kategorie (nazov, pristup_role, poradie, farba, ikona) VALUES
  ('Zmluvy', '{admin,it_admin,fin_manager}', 1, '#3b82f6', 'FileText'),
  ('Faktury', '{admin,it_admin,fin_manager}', 2, '#f59e0b', 'Receipt'),
  ('Interne dokumenty', '{admin,it_admin}', 3, '#6b7280', 'FolderOpen'),
  ('BOZP', '{admin,it_admin}', 4, '#ef4444', 'ShieldAlert'),
  ('HR dokumenty', '{admin,it_admin}', 5, '#8b5cf6', 'Users'),
  ('Vozovy park', '{admin,it_admin,fleet_manager}', 6, '#10b981', 'Car'),
  ('Ostatne', '{admin,it_admin,fin_manager}', 7, '#6b7280', 'Archive')
ON CONFLICT DO NOTHING;

-- 2. DOKUMENTY ARCHIV - rozsirenie
ALTER TABLE dokumenty_archiv ADD COLUMN IF NOT EXISTS verzia int DEFAULT 1;
ALTER TABLE dokumenty_archiv ADD COLUMN IF NOT EXISTS povodny_dokument_id uuid REFERENCES dokumenty_archiv(id) ON DELETE SET NULL;
ALTER TABLE dokumenty_archiv ADD COLUMN IF NOT EXISTS platnost_do date;
ALTER TABLE dokumenty_archiv ADD COLUMN IF NOT EXISTS kategoria_id uuid REFERENCES archiv_kategorie(id) ON DELETE SET NULL;

-- 3. VOZIDLO TANKOVANIE
CREATE TABLE IF NOT EXISTS vozidlo_tankovanie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id uuid NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  datum date NOT NULL,
  litrov numeric(10,2) NOT NULL,
  cena_za_liter numeric(10,3),
  celkova_cena numeric(10,2) NOT NULL,
  km_na_tachometri int,
  plna_naplna boolean DEFAULT true,
  tankova_karta_id uuid,
  poznamka text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 4. TANKOVE KARTY
CREATE TABLE IF NOT EXISTS tankove_karty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cislo_karty text NOT NULL,
  typ text NOT NULL DEFAULT 'ina',
  vozidlo_id uuid REFERENCES vozidla(id) ON DELETE SET NULL,
  vodic_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stav text NOT NULL DEFAULT 'aktivna',
  limit_mesacny numeric(10,2),
  platnost_do date,
  poznamka text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_tankova_karta_priradenie CHECK (
    NOT (vozidlo_id IS NOT NULL AND vodic_id IS NOT NULL)
  )
);

-- FK pre tankovanie -> karta
ALTER TABLE vozidlo_tankovanie
  ADD CONSTRAINT fk_tankovanie_karta
  FOREIGN KEY (tankova_karta_id) REFERENCES tankove_karty(id) ON DELETE SET NULL;

-- 5. ONBOARDING ITEMS
CREATE TABLE IF NOT EXISTS onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typ text NOT NULL,
  nazov text NOT NULL,
  splnene boolean DEFAULT false,
  splnene_datum timestamptz,
  splnil_id uuid REFERENCES profiles(id),
  poznamka text,
  created_at timestamptz DEFAULT now()
);

-- 6. SKOLENIA
CREATE TABLE IF NOT EXISTS skolenia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typ text NOT NULL DEFAULT 'ine',
  nazov text NOT NULL,
  datum_absolvovany date,
  platnost_do date,
  certifikat_url text,
  stav text NOT NULL DEFAULT 'platne',
  poznamka text,
  created_at timestamptz DEFAULT now()
);

-- 7. VOZIDLO SERVISY - rozsirenie o planovanie
ALTER TABLE vozidlo_servisy ADD COLUMN IF NOT EXISTS nasledny_servis_km int;
ALTER TABLE vozidlo_servisy ADD COLUMN IF NOT EXISTS nasledny_servis_datum date;
ALTER TABLE vozidlo_servisy ADD COLUMN IF NOT EXISTS interval_km int;
ALTER TABLE vozidlo_servisy ADD COLUMN IF NOT EXISTS interval_mesiace int;

-- 8. CESTA DOKLADY - rozsirenie o stav
ALTER TABLE cesta_doklady ADD COLUMN IF NOT EXISTS stav text DEFAULT 'neskontrolovany';

-- 9. SLUZOBNE CESTY - rozsirenie o vyuctovanie
ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS vyuctovanie_stav text DEFAULT 'caka_na_doklady';

-- 10. PROFILES - offboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS offboarding_stav text;

-- 11. POISTNE UDALOSTI - rozsirenie o financne polia
ALTER TABLE poistne_udalosti ADD COLUMN IF NOT EXISTS cislo_poistky text;
ALTER TABLE poistne_udalosti ADD COLUMN IF NOT EXISTS skoda_odhad numeric(10,2);
ALTER TABLE poistne_udalosti ADD COLUMN IF NOT EXISTS skoda_skutocna numeric(10,2);
ALTER TABLE poistne_udalosti ADD COLUMN IF NOT EXISTS poistovna_plnenie numeric(10,2);
ALTER TABLE poistne_udalosti ADD COLUMN IF NOT EXISTS spoluucast numeric(10,2);

-- ======= RLS POLICIES =======

ALTER TABLE archiv_kategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE vozidlo_tankovanie ENABLE ROW LEVEL SECURITY;
ALTER TABLE tankove_karty ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skolenia ENABLE ROW LEVEL SECURITY;

-- archiv_kategorie: viditelne podla pristup_role[] alebo admin
CREATE POLICY "archiv_kategorie_select" ON archiv_kategorie FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid()
    AND (role IN ('admin', 'it_admin') OR role = ANY(archiv_kategorie.pristup_role))
  )
);
CREATE POLICY "archiv_kategorie_admin" ON archiv_kategorie FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
);

-- vozidlo_tankovanie: fleet/admin moze vsetko, zamestnanec cita vlastne
CREATE POLICY "tankovanie_admin" ON vozidlo_tankovanie FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fleet_manager', 'fin_manager'))
);
CREATE POLICY "tankovanie_own" ON vozidlo_tankovanie FOR SELECT USING (created_by = auth.uid());

-- tankove_karty: fleet/admin
CREATE POLICY "tankove_karty_admin" ON tankove_karty FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fleet_manager', 'fin_manager'))
);

-- onboarding_items: admin
CREATE POLICY "onboarding_admin" ON onboarding_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
);
CREATE POLICY "onboarding_own" ON onboarding_items FOR SELECT USING (profile_id = auth.uid());

-- skolenia: admin moze vsetko, zamestnanec cita vlastne
CREATE POLICY "skolenia_admin" ON skolenia FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
);
CREATE POLICY "skolenia_own" ON skolenia FOR SELECT USING (profile_id = auth.uid());

-- ======= INDEXES =======

CREATE INDEX IF NOT EXISTS idx_tankovanie_vozidlo ON vozidlo_tankovanie(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_tankovanie_datum ON vozidlo_tankovanie(datum);
CREATE INDEX IF NOT EXISTS idx_tankove_karty_vozidlo ON tankove_karty(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_tankove_karty_vodic ON tankove_karty(vodic_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profile ON onboarding_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_skolenia_profile ON skolenia(profile_id);
CREATE INDEX IF NOT EXISTS idx_skolenia_platnost ON skolenia(platnost_do);
CREATE INDEX IF NOT EXISTS idx_archiv_kategoria ON dokumenty_archiv(kategoria_id);
CREATE INDEX IF NOT EXISTS idx_archiv_platnost ON dokumenty_archiv(platnost_do);

-- ======= STORAGE BUCKET =======

INSERT INTO storage.buckets (id, name, public)
VALUES ('skolenia-certifikaty', 'skolenia-certifikaty', false)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Apply migration to production Supabase**

Run: `cd "C:/CLAUDE PROJEKTY/imetjazdy-work" && npx supabase db push --linked`

If that fails (no CLI linked), apply via Supabase SQL Editor:
1. Copy the SQL content
2. Go to https://yotjzvykdpxkwfegjrkr.supabase.co → SQL Editor → paste → Run

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260417100000_complete_system.sql
git commit -m "feat: add migration for complete system (tankovanie, karty, onboarding, skolenia, archiv kategorie)"
```

---

### Task 2: Email System + Dark Mode (Cross-cutting Foundation)

**Files:**
- Create: `src/lib/email.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/app/globals.css` (or Tailwind config)

- [ ] **Step 1: Create email abstraction**

Create `src/lib/email.ts`:
```typescript
'use server'

interface EmailOptions {
  to: string | string[]
  subject: string
  body: string
}

/**
 * Unified email sender. Uses SMTP when configured, otherwise logs + creates DB notification.
 * Ready for O365 switch — just set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars.
 */
export async function sendEmail({ to, subject, body }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const smtpHost = process.env.SMTP_HOST

  if (smtpHost) {
    // O365 / SMTP path — will be enabled when SMTP credentials are provided
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'system@imet.sk',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html: body,
      })
      return { success: true }
    } catch (err) {
      console.error('[EMAIL] SMTP error:', err)
      return { success: false, error: 'SMTP error' }
    }
  }

  // Fallback: log to console
  console.log(`[EMAIL] To: ${Array.isArray(to) ? to.join(',') : to} | Subject: ${subject}`)
  return { success: true }
}
```

- [ ] **Step 2: Create ThemeToggle component**

Create `src/components/ThemeToggle.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200"
      title={dark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      {dark ? 'Svetlý režim' : 'Tmavý režim'}
    </button>
  )
}
```

- [ ] **Step 3: Add dark mode CSS variables**

Add to `src/app/globals.css` (at the end, after existing styles):
```css
/* ═══ DARK MODE ═══ */
:root {
  --bg-page: #f1f5f9;
  --bg-card: #ffffff;
  --bg-card-hover: #f8fafc;
  --border-card: #e2e8f0;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --bg-input: #ffffff;
  --border-input: #d1d5db;
}

[data-theme="dark"] {
  --bg-page: #0f172a;
  --bg-card: #1e293b;
  --bg-card-hover: #334155;
  --border-card: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --bg-input: #1e293b;
  --border-input: #475569;
}

/* Apply variables to common elements */
[data-theme="dark"] body {
  background-color: var(--bg-page);
  color: var(--text-primary);
}

[data-theme="dark"] .bg-white {
  background-color: var(--bg-card) !important;
}

[data-theme="dark"] .bg-gray-50,
[data-theme="dark"] .bg-slate-50 {
  background-color: var(--bg-card-hover) !important;
}

[data-theme="dark"] .border-gray-200,
[data-theme="dark"] .border-gray-100 {
  border-color: var(--border-card) !important;
}

[data-theme="dark"] .text-gray-900 {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .text-gray-700,
[data-theme="dark"] .text-gray-600 {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .text-gray-500,
[data-theme="dark"] .text-gray-400 {
  color: var(--text-muted) !important;
}

[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
  background-color: var(--bg-input) !important;
  border-color: var(--border-input) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.3) !important;
}
```

- [ ] **Step 4: Add ThemeToggle to Sidebar**

In `src/components/Sidebar.tsx`, add import and render ThemeToggle above the logout button:

Import at top:
```tsx
import ThemeToggle from '@/components/ThemeToggle'
```

Insert `<ThemeToggle />` before the logout `<form>` tag in the bottom section.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/components/ThemeToggle.tsx src/app/globals.css src/components/Sidebar.tsx
git commit -m "feat: add email abstraction (O365 ready) + dark mode with CSS variables"
```

---

### Task 3: Kniha Jazd — Batch Processing + PDF + Notifications

**Files:**
- Modify: `src/components/AdminJazdyTable.tsx` — add checkboxes + batch actions
- Create: `src/actions/jazdy-batch.ts` — batch approve/reject
- Create: `src/lib/pdf-jazda.ts` — PDF per trip + monthly summary
- Modify: `src/actions/jazdy.ts` — add notification on createJazda

- [ ] **Step 1: Create batch actions**

Create `src/actions/jazdy-batch.ts`:
```typescript
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'
import { createNotifikacia } from './notifikacie'

export async function batchProcessJazdy(jazdaIds: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (jazdaIds.length === 0) return { error: 'Žiadne jazdy na spracovanie' }

  const admin = createSupabaseAdmin()

  // Load all jazdy with profile and vozidlo data
  const { data: jazdy, error } = await admin
    .from('jazdy')
    .select('*, profile:profiles(full_name, firma_id), vozidlo:vozidla(spotreba_tp, palivo)')
    .in('id', jazdaIds)
    .eq('stav', 'odoslana')

  if (error || !jazdy) return { error: 'Chyba pri nacitani jazd' }

  // Load settings + paliva for calculation
  const [{ data: settings }, { data: paliva }] = await Promise.all([
    admin.from('settings').select('*').single(),
    admin.from('paliva').select('*').order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!settings || !paliva) return { error: 'Chybaju nastavenia alebo ceny paliv' }

  const { calculateVyuctovanie } = await import('@/lib/calculations')

  let processed = 0
  for (const jazda of jazdy) {
    const typ = jazda.typ || 'firemne_doma'
    const calc = calculateVyuctovanie(
      typ, jazda.km, jazda.cas_odchodu, jazda.cas_prichodu,
      jazda.vozidlo, paliva, settings
    )

    // Get next document number
    const { data: numData } = await admin.rpc('get_next_doc_number')
    const cislo = numData || `D-${Date.now()}`

    await admin.from('jazdy').update({
      stav: 'spracovana',
      typ,
      spotreba_pouzita: jazda.vozidlo?.spotreba_tp,
      palivo_typ: jazda.vozidlo?.palivo,
      cena_za_liter: calc.naklady_phm > 0 ? calc.naklady_phm / Math.max(calc.spotreba_litrov, 0.01) : null,
      sadzba_za_km: settings.sadzba_sukromne_auto,
      stravne: calc.stravne,
      vreckove: calc.vreckove,
      naklady_phm: calc.naklady_phm,
      naklady_celkom: calc.naklady_celkom,
      cislo_dokladu: cislo,
      spracovane_at: new Date().toISOString(),
    }).eq('id', jazda.id)

    // Update service trip km if linked
    if ((jazda as any).sluzobna_cesta_id) {
      await admin.from('sluzobne_cesty')
        .update({ skutocne_km: jazda.km })
        .eq('id', (jazda as any).sluzobna_cesta_id)
    }

    await logAudit('batch_spracovanie_jazdy', 'jazdy', jazda.id, { cislo_dokladu: cislo })

    // Notify employee
    await createNotifikacia(
      jazda.user_id, 'jazda_spracovana',
      'Jazda spracovaná', `Vaša jazda za ${jazda.mesiac} bola spracovaná (${cislo}).`,
      `/moje-jazdy`
    )

    processed++
  }

  revalidatePath('/admin/jazdy')
  return { processed }
}

export async function batchRejectJazdy(jazdaIds: string[], dovod: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (jazdaIds.length === 0) return { error: 'Žiadne jazdy' }

  const admin = createSupabaseAdmin()

  const { data: jazdy } = await admin
    .from('jazdy')
    .select('id, user_id, mesiac')
    .in('id', jazdaIds)
    .eq('stav', 'odoslana')

  if (!jazdy) return { error: 'Chyba' }

  for (const jazda of jazdy) {
    await admin.from('jazdy').update({
      stav: 'rozpracovana',
      komentar: dovod,
    }).eq('id', jazda.id)

    await createNotifikacia(
      jazda.user_id, 'jazda_vratena',
      'Jazda vrátená', `Jazda za ${jazda.mesiac} bola vrátená: ${dovod}`,
      `/moje-jazdy`
    )

    await logAudit('batch_vratenie_jazdy', 'jazdy', jazda.id, { dovod })
  }

  revalidatePath('/admin/jazdy')
  return { rejected: jazdy.length }
}
```

- [ ] **Step 2: Update AdminJazdyTable with checkboxes and batch actions**

Rewrite `src/components/AdminJazdyTable.tsx` to add selection checkboxes, a batch action bar that appears when items are selected, with "Spracovať vybrané" and "Vrátiť vybrané" buttons. Add `useState` for `selectedIds: string[]`, checkbox column as first column, select-all header checkbox, and a floating action bar at bottom when `selectedIds.length > 0`.

Key additions:
- `const [selectedIds, setSelectedIds] = useState<string[]>([])`
- First column: checkbox (only enabled when `stav === 'odoslana'`)
- Batch bar: count of selected + "Spracovať" (green) + "Vrátiť" (red with modal for reason)
- Import and call `batchProcessJazdy` and `batchRejectJazdy`
- After batch action: `setSelectedIds([])` + `router.refresh()`

- [ ] **Step 3: Create PDF generation for trips**

Create `src/lib/pdf-jazda.ts`:
```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { Jazda, Settings } from './types'

export function generateJazdaPDF(jazda: Jazda & { profile?: { full_name: string }, vozidlo?: any, firma?: { nazov: string; adresa?: string } }, settings: Settings) {
  const doc = new jsPDF()

  // Header with company
  doc.setFontSize(10)
  doc.text('[LOGO]', 14, 15)
  doc.setFontSize(14)
  doc.text(jazda.firma?.nazov || settings.company_name || 'IMET, a.s.', 40, 15)
  doc.setFontSize(8)
  doc.text(jazda.firma?.adresa || '', 40, 20)

  doc.setFontSize(16)
  doc.text('Cestovný príkaz', 105, 35, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`Č. dokladu: ${jazda.cislo_dokladu || '—'}`, 105, 42, { align: 'center' })

  // Details
  const y = 55
  const details = [
    ['Zamestnanec', jazda.profile?.full_name || ''],
    ['Mesiac', jazda.mesiac],
    ['Trasa', `${jazda.odchod_z}${jazda.cez ? ` → ${jazda.cez}` : ''} → ${jazda.prichod_do}`],
    ['Vzdialenosť', `${jazda.km} km`],
    ['Vozidlo', jazda.vozidlo ? `${jazda.vozidlo.znacka} ${jazda.vozidlo.variant} (${jazda.vozidlo.spz})` : ''],
    ['Náhrada PHM', `${Number(jazda.naklady_phm || 0).toFixed(2)} EUR`],
    ['Stravné', `${Number(jazda.stravne || 0).toFixed(2)} EUR`],
    ['Celkom', `${Number(jazda.naklady_celkom || 0).toFixed(2)} EUR`],
  ];

  (doc as any).autoTable({
    startY: y,
    head: [],
    body: details,
    theme: 'plain',
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 14 },
  })

  // Signatures
  const finalY = (doc as any).lastAutoTable?.finalY || 140
  doc.setFontSize(9)
  doc.text('________________________', 14, finalY + 30)
  doc.text('Zamestnanec', 14, finalY + 36)
  doc.text('________________________', 120, finalY + 30)
  doc.text('Schválil', 120, finalY + 36)

  doc.text(`Vytvorené: ${new Date().toLocaleDateString('sk-SK')}`, 14, finalY + 50)

  doc.save(`cestovny-prikaz-${jazda.cislo_dokladu || jazda.id}.pdf`)
}

export async function generateMesacnySumarPDF(
  zamestnanceMeno: string,
  mesiac: string,
  jazdy: any[],
  settings: Settings,
  firma?: { nazov: string }
) {
  const doc = new jsPDF()

  doc.setFontSize(14)
  doc.text(firma?.nazov || 'IMET, a.s.', 14, 15)
  doc.setFontSize(16)
  doc.text(`Mesačný prehľad jázd — ${mesiac}`, 105, 30, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`Zamestnanec: ${zamestnanceMeno}`, 14, 42)

  const rows = jazdy.map(j => [
    new Date(j.created_at).toLocaleDateString('sk-SK'),
    `${j.odchod_z} → ${j.prichod_do}`,
    `${j.km}`,
    j.stav === 'spracovana' ? `${Number(j.naklady_celkom || 0).toFixed(2)}` : '—',
  ]);

  (doc as any).autoTable({
    startY: 50,
    head: [['Dátum', 'Trasa', 'KM', 'Náhrada (EUR)']],
    body: rows,
    foot: [[
      'SPOLU', '',
      jazdy.reduce((s, j) => s + (j.km || 0), 0).toString(),
      jazdy.reduce((s, j) => s + Number(j.naklady_celkom || 0), 0).toFixed(2),
    ]],
    theme: 'striped',
    margin: { left: 14 },
  })

  doc.save(`sumar-jazd-${mesiac}-${zamestnanceMeno.replace(/\s/g, '-')}.pdf`)
}
```

- [ ] **Step 4: Add notification hook in createJazda**

In `src/actions/jazdy.ts`, after successful insert (after the file upload loop, before `revalidatePath`), add:

```typescript
// Notify admins about new trip submission
if (stav === 'odoslana') {
  const { createNotifikacia } = await import('./notifikacie')
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'it_admin', 'fin_manager'])
    .eq('active', true)

  for (const admin of admins || []) {
    await createNotifikacia(
      admin.id, 'nova_jazda',
      'Nová jazda na spracovanie',
      `${user.email} odoslal jazdu za mesiac ${formData.get('mesiac')}.`,
      `/admin/jazdy/${jazda.id}`
    )
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/actions/jazdy-batch.ts src/lib/pdf-jazda.ts src/components/AdminJazdyTable.tsx src/actions/jazdy.ts
git commit -m "feat: batch processing, PDF export, and notifications for kniha jazd"
```

---

### Task 4: Vozovy Park — Shared Vehicles UI + Tachometer UI

**Files:**
- Create: `src/components/fleet/VodiciSection.tsx` — shared drivers panel
- Create: `src/components/fleet/TachoSection.tsx` — tachometer records panel
- Modify: `src/components/fleet/VozidloDetail.tsx` — add new tabs
- Modify: `src/app/fleet/vozidla/[id]/page.tsx` — load additional data

- [ ] **Step 1: Create VodiciSection component**

Create `src/components/fleet/VodiciSection.tsx` — a panel that:
- Lists all assigned drivers from `vozidlo_vodici` (using existing `getVodiciVozidla`)
- Shows primary badge, name, email, date assigned
- Has "Pridať vodiča" button that opens inline select from `vodici` prop
- Has remove button per driver
- Has "Nastaviť primárneho" button
- Uses `addVodicToVozidlo`, `removeVodicFromVozidlo` from `@/actions/vozidlo-vodici`
- Auto-refreshes via `router.refresh()`

- [ ] **Step 2: Create TachoSection component**

Create `src/components/fleet/TachoSection.tsx` — a panel that:
- Lists monthly tachometer records (mesiac, stav_km, rozdiel from previous, zapisal)
- Has form: month picker (YYYY-MM) + km input
- Validates km >= last record
- Uses `setTachoZaznam` from `@/actions/vozidlo-vodici`
- Shows consistency check: sum of jazdy km vs tachometer diff per month

- [ ] **Step 3: Add new tabs to VozidloDetail**

In `src/components/fleet/VozidloDetail.tsx`:
- Add to `Tab` type: `'vodici' | 'tachometer'`
- Add to tabs array: `{ id: 'vodici', label: 'Vodiči' }`, `{ id: 'tachometer', label: 'Tachometer' }`
- Add to Props: `vodiciData: VozidloVodic[]`, `tachoData: any[]`
- Render `VodiciSection` and `TachoSection` in respective tab panels
- Import both new components

- [ ] **Step 4: Update fleet vehicle detail page data loading**

In `src/app/fleet/vozidla/[id]/page.tsx`, add data loading for `getVodiciVozidla(id)` and tachometer records, pass to VozidloDetail.

- [ ] **Step 5: Commit**

```bash
git add src/components/fleet/VodiciSection.tsx src/components/fleet/TachoSection.tsx src/components/fleet/VozidloDetail.tsx src/app/fleet/vozidla/\[id\]/page.tsx
git commit -m "feat: shared vehicles UI and tachometer records in fleet detail"
```

---

### Task 5: Vozovy Park — Tankovanie + Tankove Karty

**Files:**
- Create: `src/actions/fleet-tankovanie.ts`
- Create: `src/actions/fleet-tankove-karty.ts`
- Create: `src/components/fleet/TankovanieSection.tsx`
- Create: `src/components/fleet/TankoveKartySection.tsx`
- Create: `src/app/fleet/tankove-karty/page.tsx`
- Modify: `src/components/fleet/VozidloDetail.tsx` — add tankovanie + karty tabs
- Modify: `src/components/Sidebar.tsx` — add tankove-karty link in fleet section

- [ ] **Step 1: Create server actions for tankovanie**

Create `src/actions/fleet-tankovanie.ts` with:
- `getTankovanie(vozidloId)` — list all refueling records for a vehicle
- `createTankovanie(formData)` — add new refueling record
- `deleteTankovanie(id)` — remove record
- `getSpotrebaStats(vozidloId)` — calculate average L/100km from refueling data

All using `requireFleetOrAdmin()` + `createSupabaseAdmin()`.

- [ ] **Step 2: Create server actions for tankove karty**

Create `src/actions/fleet-tankove-karty.ts` with:
- `getTankoveKarty(filters?)` — list all cards, optionally filter by vozidlo/vodic/stav
- `createTankovaKarta(formData)` — add new card
- `updateTankovaKarta(id, data)` — edit card
- `deleteTankovaKarta(id)` — remove

Validate constraint: vozidlo_id and vodic_id cannot both be set.

- [ ] **Step 3: Create TankovanieSection component**

Create `src/components/fleet/TankovanieSection.tsx`:
- Table: datum, litrov, cena, km, karta (if linked), kto tankoval
- Form: datum, litrov, cena_za_liter (auto-calculate celkova), km_na_tachometri, plna_naplna, tankova_karta_id (select from cards assigned to this vehicle), poznamka
- Average consumption display: calculated from full-tank refueling records
- Formula: `(litrov / (km_current - km_previous)) * 100 = L/100km`

- [ ] **Step 4: Create TankoveKartySection for vehicle detail + fleet page**

Create `src/components/fleet/TankoveKartySection.tsx` — used both in vehicle detail (filtered to this vehicle) and in standalone fleet page (all cards).

Create `src/app/fleet/tankove-karty/page.tsx` — standalone page listing all tank cards with DataTable.

- [ ] **Step 5: Wire up to VozidloDetail + Sidebar**

Add tabs `'tankovanie'` and `'tankove_karty'` to VozidloDetail.
Add "Tankové karty" link in Sidebar fleet section (between Hlásenia and Reporty): `<Link href="/fleet/tankove-karty">`.

- [ ] **Step 6: Commit**

```bash
git add src/actions/fleet-tankovanie.ts src/actions/fleet-tankove-karty.ts src/components/fleet/TankovanieSection.tsx src/components/fleet/TankoveKartySection.tsx src/app/fleet/tankove-karty/ src/components/fleet/VozidloDetail.tsx src/components/Sidebar.tsx
git commit -m "feat: fuel tracking (tankovanie) and tank card management in fleet"
```

---

### Task 6: Vozovy Park — Insurance Workflow + Service Planning + Cost Report

**Files:**
- Modify: `src/actions/fleet-poistne.ts` — extend with financial fields + workflow
- Modify: `src/components/fleet/PoistnaUdalostForm.tsx` — add financial fields
- Modify: `src/actions/fleet-servisy.ts` — add service planning fields
- Modify: `src/components/fleet/FleetDashboard.tsx` — add upcoming services widget
- Modify: `src/components/fleet/FleetReporty.tsx` — add cost per vehicle report
- Create: `src/actions/fleet-naklady.ts` — aggregate cost data

- [ ] **Step 1: Extend insurance workflow**

In `src/actions/fleet-poistne.ts`:
- Add `updatePoistnaUdalostFinance(id, { cislo_poistky, skoda_odhad, skoda_skutocna, poistovna_plnenie, spoluucast })` — update financial fields
- Extend `updatePoistnaUdalostStav` to support new states: `nahlasena → riesena → u_poistovne → vyriesena / zamietnuta`
- Add notification to fin_manager when state changes to `u_poistovne` or `vyriesena`

In `src/components/fleet/PoistnaUdalostForm.tsx`:
- Add financial fields section: cislo_poistky, skoda_odhad, skoda_skutocna, poistovna_plnenie, spoluucast
- Add state transition buttons based on current state
- Show financial summary: `skoda - poistovna_plnenie = spoluucast`

- [ ] **Step 2: Add service planning**

In `src/actions/fleet-servisy.ts`:
- When creating/updating a service with type `servis` or `udrzba`, allow setting `nasledny_servis_km`, `nasledny_servis_datum`, `interval_km`, `interval_mesiace`
- Add `getUpcomingServices()` — returns services where `nasledny_servis_datum` is within 30 days OR last tacho record km is close to `nasledny_servis_km`

In `src/components/fleet/FleetDashboard.tsx`:
- Add "Blížiace sa servisy" widget below existing widgets, similar to existing "Blížiace sa kontroly" pattern

- [ ] **Step 3: Create cost per vehicle report**

Create `src/actions/fleet-naklady.ts`:
```typescript
'use server'

import { requireFleetOrAdmin } from '@/lib/auth-helpers'

export async function getNakladyPerVozidlo(vozidloId: string, rok: number) {
  const auth = await requireFleetOrAdmin()
  if ('error' in auth) return auth

  const { supabase } = auth
  const odDate = `${rok}-01-01`
  const doDate = `${rok}-12-31`

  const [servisy, tankovanie, kontroly, poistne] = await Promise.all([
    supabase.from('vozidlo_servisy').select('cena').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
    supabase.from('vozidlo_tankovanie').select('celkova_cena').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
    supabase.from('vozidlo_kontroly').select('cena').eq('vozidlo_id', vozidloId).gte('datum_vykonania', odDate).lte('datum_vykonania', doDate),
    supabase.from('poistne_udalosti').select('spoluucast').eq('vozidlo_id', vozidloId).gte('datum', odDate).lte('datum', doDate),
  ])

  return {
    servisy: (servisy.data || []).reduce((s, r) => s + Number(r.cena || 0), 0),
    tankovanie: (tankovanie.data || []).reduce((s, r) => s + Number(r.celkova_cena || 0), 0),
    kontroly: (kontroly.data || []).reduce((s, r) => s + Number(r.cena || 0), 0),
    poistne: (poistne.data || []).reduce((s, r) => s + Number(r.spoluucast || 0), 0),
  }
}
```

In `src/components/fleet/FleetReporty.tsx`:
- Add "Náklady per vozidlo" section with vehicle selector + year picker
- Shows breakdown: servisy, tankovanie, kontroly, poistné, SPOLU
- Table + bar visualization

- [ ] **Step 4: Commit**

```bash
git add src/actions/fleet-poistne.ts src/components/fleet/PoistnaUdalostForm.tsx src/actions/fleet-servisy.ts src/components/fleet/FleetDashboard.tsx src/components/fleet/FleetReporty.tsx src/actions/fleet-naklady.ts
git commit -m "feat: insurance workflow, service planning, and cost reports in fleet"
```

---

### Task 7: Zamestnanecka Karta — iCal + Onboarding + Offboarding + Skolenia + PDF

**Files:**
- Modify: `src/app/(zamestnanec)/moja-karta/page.tsx` — add iCal banner
- Create: `src/actions/onboarding.ts`
- Create: `src/actions/skolenia.ts`
- Create: `src/components/OnboardingSection.tsx`
- Create: `src/components/OffboardingSection.tsx`
- Create: `src/components/SkoleniaSection.tsx`
- Create: `src/lib/pdf-zamestnanec.ts`
- Modify: `src/app/admin/zamestnanci/[id]/page.tsx` — integrate new sections
- Modify: `src/app/admin/page.tsx` — add skolenia expiry widget

- [ ] **Step 1: Add iCal subscribe banner to moja-karta**

In `src/app/(zamestnanec)/moja-karta/page.tsx`:
- After loading profile, check `profile.ical_token`
- If null, generate one: `supabase.from('profiles').update({ ical_token: crypto.randomUUID() }).eq('id', user.id)`
- Pass `icalUrl` to a new `ICalBanner` client component
- Banner shows: Outlook icon, URL field, "Kopírovať" button using `navigator.clipboard.writeText(url)`
- Instructions: "Pridajte si tento link do Outlook: Súbor → Nastavenia konta → Internetové kalendáre → Nové → vložte link"

- [ ] **Step 2: Create onboarding/offboarding server actions**

Create `src/actions/onboarding.ts`:
```typescript
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

const DEFAULT_ONBOARDING = [
  { typ: 'zmluva', nazov: 'Podpis pracovnej zmluvy' },
  { typ: 'bozp', nazov: 'BOZP školenie' },
  { typ: 'majetok', nazov: 'Prevzatie IT vybavenia' },
  { typ: 'karty', nazov: 'Pridelenie RFID prístupovej karty' },
  { typ: 'pristup', nazov: 'Pridelenie prístupov do systému' },
  { typ: 'skolenie', nazov: 'Úvodné školenie na pracovnú pozíciu' },
]

export async function createDefaultOnboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const items = DEFAULT_ONBOARDING.map(item => ({
    ...item,
    profile_id: profileId,
  }))

  const { error } = await admin.from('onboarding_items').insert(items)
  if (error) return { error: 'Chyba pri vytváraní onboarding checklistu' }

  await logAudit('onboarding_started', 'onboarding_items', profileId)
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function getOnboardingItems(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: [] }

  const { data } = await auth.supabase
    .from('onboarding_items')
    .select('*, splnil:profiles!splnil_id(full_name)')
    .eq('profile_id', profileId)
    .order('created_at')

  return { data: data || [] }
}

export async function toggleOnboardingItem(itemId: string, splnene: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('onboarding_items').update({
    splnene,
    splnene_datum: splnene ? new Date().toISOString() : null,
    splnil_id: splnene ? auth.user.id : null,
  }).eq('id', itemId)

  revalidatePath('/admin/zamestnanci')
}

export async function addCustomOnboardingItem(profileId: string, nazov: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('onboarding_items').insert({
    profile_id: profileId,
    typ: 'custom',
    nazov,
  })

  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function startOffboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()

  // Set offboarding state
  await admin.from('profiles').update({ offboarding_stav: 'zahajeny' }).eq('id', profileId)

  // Create offboarding checklist
  const offboardingItems = [
    { typ: 'majetok', nazov: 'Vrátenie IT vybavenia' },
    { typ: 'karty', nazov: 'Deaktivácia RFID kariet' },
    { typ: 'vozidlo', nazov: 'Odovzdanie služobného vozidla' },
    { typ: 'pristup', nazov: 'Zrušenie prístupov do systému' },
    { typ: 'dovolenka', nazov: 'Výpočet zostatku dovolenky' },
    { typ: 'cestovne', nazov: 'Vyúčtovanie cestovných náhrad' },
  ]

  await admin.from('onboarding_items').insert(
    offboardingItems.map(item => ({ ...item, profile_id: profileId }))
  )

  await logAudit('offboarding_started', 'profiles', profileId)
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function completeOffboarding(profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()

  // Check all items are done
  const { data: items } = await admin.from('onboarding_items')
    .select('splnene')
    .eq('profile_id', profileId)

  const allDone = items?.every(i => i.splnene)
  if (!allDone) return { error: 'Nie sú splnené všetky položky checklistu' }

  // Deactivate profile
  await admin.from('profiles').update({
    offboarding_stav: 'dokonceny',
    active: false,
  }).eq('id', profileId)

  await logAudit('offboarding_completed', 'profiles', profileId)
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}
```

- [ ] **Step 3: Create skolenia server actions**

Create `src/actions/skolenia.ts`:
```typescript
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { logAudit } from './audit'

export const TYP_SKOLENIA_LABELS: Record<string, string> = {
  bozp: 'BOZP',
  opp: 'Ochrana pred požiarmi',
  vodicak: 'Vodičský preukaz',
  odborne: 'Odborné školenie',
  ine: 'Iné',
}

export async function getSkolenia(profileId: string) {
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from('skolenia')
    .select('*')
    .eq('profile_id', profileId)
    .order('platnost_do', { ascending: true })

  // Auto-calculate stav
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const enriched = (data || []).map(s => ({
    ...s,
    stav: !s.platnost_do ? 'platne' :
      s.platnost_do < today ? 'expirovane' :
      s.platnost_do <= in30 ? 'blizi_sa' : 'platne',
  }))

  return { data: enriched }
}

export async function createSkolenie(formData: FormData) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const profileId = formData.get('profile_id') as string

  // Handle certificate upload
  let certifikatUrl: string | null = null
  const file = formData.get('certifikat') as File
  if (file && file.size > 0) {
    const path = `${profileId}/${Date.now()}_${file.name}`
    const { error: upErr } = await admin.storage.from('skolenia-certifikaty').upload(path, file)
    if (!upErr) certifikatUrl = path
  }

  const { error } = await admin.from('skolenia').insert({
    profile_id: profileId,
    typ: formData.get('typ') as string,
    nazov: formData.get('nazov') as string,
    datum_absolvovany: formData.get('datum_absolvovany') as string || null,
    platnost_do: formData.get('platnost_do') as string || null,
    certifikat_url: certifikatUrl,
    poznamka: formData.get('poznamka') as string || null,
  })

  if (error) return { error: 'Chyba pri ukladaní školenia' }
  await logAudit('pridanie_skolenia', 'skolenia', profileId, { typ: formData.get('typ') })
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function deleteSkolenie(id: string, profileId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('skolenia').delete().eq('id', id)
  revalidatePath(`/admin/zamestnanci/${profileId}`)
}

export async function getExpiraceSkoleni() {
  const admin = createSupabaseAdmin()
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const { data } = await admin
    .from('skolenia')
    .select('*, profile:profiles!profile_id(full_name, active)')
    .lte('platnost_do', in30)
    .gte('platnost_do', today)
    .order('platnost_do')
    .limit(10)

  return { data: (data || []).filter((s: any) => s.profile?.active !== false) }
}
```

- [ ] **Step 4: Create UI components**

Create `src/components/OnboardingSection.tsx` — progress bar + checklist with checkboxes + "Pridať položku" button. Show in admin employee detail. Supports both onboarding and offboarding items.

Create `src/components/SkoleniaSection.tsx` — table of trainings with expiry status badges (zelená=platné, oranžová=blíži sa, červená=expirované). Form to add new training with certificate upload. Uses `TYP_SKOLENIA_LABELS`.

- [ ] **Step 5: Create employee card PDF export**

Create `src/lib/pdf-zamestnanec.ts`:
- Export function `generateZamestnanecPDF(profile, vozidlo, majetok, licencie, skolenia, firma)`
- A4 format with company header
- Sections: osobné údaje, pracovné zaradenie, vozidlo, majetok (table), licencie (table), školenia (table), RFID karty
- "[LOGO]" placeholder

- [ ] **Step 6: Integrate into admin employee detail page**

In `src/app/admin/zamestnanci/[id]/page.tsx`:
- Load onboarding items, skolenia
- Pass to page component
- Add sections: OnboardingSection, SkoleniaSection, "Exportovať PDF" button, "Spustiť offboarding" button (if not already started)

- [ ] **Step 7: Add skolenia expiry widget to admin dashboard**

In `src/app/admin/page.tsx`:
- Call `getExpiraceSkoleni()`
- Add widget similar to "Blížiace sa expirácie" for STK but for trainings
- Show: meno zamestnanca, typ školenia, dátum expirácie, days left

- [ ] **Step 8: Commit**

```bash
git add src/actions/onboarding.ts src/actions/skolenia.ts src/components/OnboardingSection.tsx src/components/SkoleniaSection.tsx src/lib/pdf-zamestnanec.ts src/app/admin/zamestnanci/\[id\]/page.tsx src/app/\(zamestnanec\)/moja-karta/page.tsx src/app/admin/page.tsx
git commit -m "feat: onboarding/offboarding, skolenia, iCal banner, PDF export for zamestnanecka karta"
```

---

### Task 8: Sluzobne Cesty — Diet Calculation + Document Review + Settlement

**Files:**
- Modify: `src/lib/diety-utils.ts` — enhance diet calculation
- Modify: `src/actions/sluzobne-cesty.ts` — add document review actions
- Modify: `src/components/cesty/SluzobnasCestaDetail.tsx` — add doklady review + vyuctovanie
- Modify: `src/components/VyuctovaniePanel.tsx` — service trip settlement mode

- [ ] **Step 1: Enhance diet calculation**

In `src/lib/diety-utils.ts`, add:
```typescript
/**
 * Enhanced diet calculation supporting international trips.
 * Uses dieta_sadzby table when available, falls back to domestic rates.
 */
export function calculateDietyEnhanced(
  datumOd: string,
  datumDo: string,
  casOd: string,
  casDo: string,
  krajina?: string,
  zahranicneSadzby?: { plna_dieta: number; kratena_50: number } | null,
): { dieta: number; breakdown: string } {
  const od = new Date(`${datumOd}T${casOd || '00:00'}`)
  const do_ = new Date(`${datumDo}T${casDo || '23:59'}`)
  const hodin = (do_.getTime() - od.getTime()) / (1000 * 60 * 60)

  if (krajina && krajina !== 'SK' && zahranicneSadzby) {
    // International trip
    if (hodin <= 6) return { dieta: 0, breakdown: `${hodin.toFixed(1)}h zahraničná — bez nároku (do 6h)` }
    if (hodin <= 12) return { dieta: zahranicneSadzby.kratena_50, breakdown: `${hodin.toFixed(1)}h zahraničná (${krajina}) — 50% sadzba` }
    return { dieta: zahranicneSadzby.plna_dieta, breakdown: `${hodin.toFixed(1)}h zahraničná (${krajina}) — plná sadzba` }
  }

  // Domestic trip
  if (hodin < 5) return { dieta: 0, breakdown: `${hodin.toFixed(1)}h domáca — bez nároku (do 5h)` }
  if (hodin <= 12) return { dieta: STRAVNE_SADZBY.od5do12h, breakdown: `${hodin.toFixed(1)}h domáca — ${STRAVNE_SADZBY.od5do12h} EUR` }
  return { dieta: STRAVNE_SADZBY.nad12h, breakdown: `${hodin.toFixed(1)}h domáca — ${STRAVNE_SADZBY.nad12h} EUR` }
}
```

- [ ] **Step 2: Add document review actions**

In `src/actions/sluzobne-cesty.ts`, add:
```typescript
export async function reviewCestaDoklad(dokladId: string, stav: 'schvaleny' | 'zamietnuty') {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('cesta_doklady').update({ stav }).eq('id', dokladId)
  revalidatePath('/admin/sluzobne-cesty')
}

export async function updateVyuctovanieStav(cestaId: string, stav: string) {
  const auth = await requireFinOrAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('sluzobne_cesty').update({ vyuctovanie_stav: stav }).eq('id', cestaId)
  await logAudit('vyuctovanie_cesty', 'sluzobne_cesty', cestaId, { stav })
  revalidatePath('/admin/sluzobne-cesty')
}
```

- [ ] **Step 3: Enhance SluzobnasCestaDetail**

In `src/components/cesty/SluzobnasCestaDetail.tsx`:
- Add "Doklady" section: list uploaded documents with thumbnails (for images), stav badge, approve/reject buttons per document
- Add "Vyúčtovanie" section: show diet calculation breakdown (using `calculateDietyEnhanced`), sum of approved documents, preddavok, result (doplatok/preplatenie)
- Add vyuctovanie_stav workflow: `caka_na_doklady → vyuctovane → uzavrete`
- Show: `diéty + schválené doklady - preddavok = výsledok`

- [ ] **Step 4: Commit**

```bash
git add src/lib/diety-utils.ts src/actions/sluzobne-cesty.ts src/components/cesty/SluzobnasCestaDetail.tsx
git commit -m "feat: enhanced diet calculation, document review, and settlement for business trips"
```

---

### Task 9: Archiv Dokumentov — Kategorie + Verzie + Retencia + Pristup + Hromadny Upload

**Files:**
- Create: `src/actions/archiv-kategorie.ts`
- Modify: `src/actions/archiv.ts` — add versioning, retention, category filter
- Create: `src/components/archiv/KategorieSidebar.tsx`
- Modify: `src/components/archiv/ArchivTable.tsx` — add category filter
- Modify: `src/components/archiv/ArchivUploadForm.tsx` — add category select, multi-file, platnost_do
- Modify: `src/components/archiv/ArchivDetail.tsx` — add version history
- Modify: `src/app/admin/archiv/page.tsx` — integrate category sidebar
- Modify: `src/lib/archiv-types.ts` — extend types
- Modify: `src/app/admin/page.tsx` — add expiring documents widget

- [ ] **Step 1: Create category actions**

Create `src/actions/archiv-kategorie.ts`:
```typescript
'use server'

import { requireAdmin } from '@/lib/auth-helpers'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function getKategorie() {
  const auth = await requireAdmin()
  if ('error' in auth) return { data: [] }

  const { data } = await auth.supabase
    .from('archiv_kategorie')
    .select('*')
    .order('poradie')

  return { data: data || [] }
}

export async function createKategoria(nazov: string, parentId?: string, pristupRole?: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  const { error } = await admin.from('archiv_kategorie').insert({
    nazov,
    parent_id: parentId || null,
    pristup_role: pristupRole || ['admin', 'it_admin'],
  })

  if (error) return { error: 'Chyba pri vytváraní kategórie' }
  revalidatePath('/admin/archiv')
}

export async function updateKategoria(id: string, data: { nazov?: string; pristup_role?: string[]; poradie?: number }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  await admin.from('archiv_kategorie').update(data).eq('id', id)
  revalidatePath('/admin/archiv')
}

export async function deleteKategoria(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = createSupabaseAdmin()
  // Move docs to "Ostatne" before deleting
  const { data: ostatne } = await admin.from('archiv_kategorie').select('id').eq('nazov', 'Ostatne').single()
  if (ostatne) {
    await admin.from('dokumenty_archiv').update({ kategoria_id: ostatne.id }).eq('kategoria_id', id)
  }
  await admin.from('archiv_kategorie').delete().eq('id', id)
  revalidatePath('/admin/archiv')
}
```

- [ ] **Step 2: Extend archiv.ts with versioning and retention**

In `src/actions/archiv.ts`:
- Modify `getAllDokumenty` to accept `kategoria_id` filter
- Add `uploadNewVersion(povodnyId, formData)` — creates new document with `povodny_dokument_id` and `verzia = old.verzia + 1`, marks old as `stav = 'nahradeny'`
- Add `getDocumentVersions(dokumentId)` — returns all versions of a document chain
- Add `getExpiringDocuments()` — returns documents where `platnost_do` is within 30 days

In `src/lib/archiv-types.ts`:
- Add to `DokumentArchiv`: `verzia`, `povodny_dokument_id`, `platnost_do`, `kategoria_id`
- Add `StavDokumentuArchiv`: add `'nahradeny'` and `'expirujuci'`
- Add `ArchivKategoria` interface

- [ ] **Step 3: Create KategorieSidebar**

Create `src/components/archiv/KategorieSidebar.tsx`:
- Tree structure rendering (parent → children)
- Click to filter documents by category
- Selected category highlighted
- "Všetky" option at top
- "Pridať kategóriu" button (admin only)
- Each category shows document count
- Color dot from `farba` field

- [ ] **Step 4: Update ArchivUploadForm**

In `src/components/archiv/ArchivUploadForm.tsx`:
- Add `kategoria_id` select dropdown (loaded from `getKategorie()`)
- Add `platnost_do` date input (optional, for contracts etc.)
- Support multi-file upload: change `<input type="file">` to `multiple`, loop through files and call `uploadDokumentArchiv` for each with same metadata
- Show progress per file
- Add drag & drop zone enhancement with `onDrop` handler

- [ ] **Step 5: Update ArchivDetail with version history**

In `src/components/archiv/ArchivDetail.tsx`:
- Add "História verzií" section if document has `povodny_dokument_id` or there are newer versions
- List all versions with dates, who uploaded, link to download
- Add "Nahrať novú verziu" button
- Show retention info if `platnost_do` is set: "Platnosť do: DD.MM.YYYY" with warning if expiring

- [ ] **Step 6: Update admin archive page**

In `src/app/admin/archiv/page.tsx`:
- Load categories
- Render 2-column layout: KategorieSidebar (left, narrow) + ArchivTable (right, wide)
- Pass selected category filter to table

- [ ] **Step 7: Add expiring documents widget to admin dashboard**

In `src/app/admin/page.tsx`:
- Call `getExpiringDocuments()`
- Add widget "Expirujúce dokumenty" with same styling as STK widget

- [ ] **Step 8: Commit**

```bash
git add src/actions/archiv-kategorie.ts src/actions/archiv.ts src/lib/archiv-types.ts src/components/archiv/ src/app/admin/archiv/ src/app/admin/page.tsx
git commit -m "feat: categories, versioning, retention, access control, and bulk upload for document archive"
```

---

### Task 10: Nastavenia Konsolidacia

**Files:**
- Modify: `src/app/admin/nastavenia/page.tsx` — tabbed layout
- Modify: `src/components/NastaveniaForm.tsx` — add tabs
- Modify: `src/app/admin/paliva/page.tsx` — redirect to nastavenia
- Modify: `src/app/admin/sadzby/page.tsx` — redirect to nastavenia

- [ ] **Step 1: Rebuild nastavenia as tabbed page**

Rewrite `src/components/NastaveniaForm.tsx` to have 4 tabs:
- **Všeobecné** — existing settings (company_name, stravné sadzby, DPH, vreckové)
- **Palivá** — move content from PalivaGrid here (fuel prices table)
- **Sadzby** — move content from SadzbyForm here (km rates)
- **Systém** — SMTP placeholder (readonly info "Konfigurácia cez env premenné"), IP whitelist info, 2FA toggle (disabled, placeholder)

Load paliva and sadzby data in the page.tsx and pass to the form.

- [ ] **Step 2: Redirect old URLs**

In `src/app/admin/paliva/page.tsx` and `src/app/admin/sadzby/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function Page() { redirect('/admin/nastavenia') }
```

- [ ] **Step 3: Update Sidebar**

Remove "Ceny palív" and "Sadzby náhrad" links from Sidebar (they are now inside Nastavenia).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/nastavenia/ src/components/NastaveniaForm.tsx src/app/admin/paliva/ src/app/admin/sadzby/ src/components/Sidebar.tsx
git commit -m "feat: consolidate settings into tabbed nastavenia page"
```

---

### Task 11: Manualy — Help Pages Pre Kazdy Modul

**Files:**
- Create: `src/app/(zamestnanec)/manual/page.tsx`
- Create: `src/app/admin/manual/page.tsx`
- Create: `src/app/fleet/manual/page.tsx`
- Create: `src/components/ManualPage.tsx` — reusable accordion manual component
- Modify: `src/components/Sidebar.tsx` — add manual link

- [ ] **Step 1: Create ManualPage reusable component**

Create `src/components/ManualPage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react'

export interface ManualSection {
  id: string
  title: string
  icon?: React.ReactNode
  content: React.ReactNode
}

export default function ManualPage({ title, sections }: { title: string; sections: ManualSection[] }) {
  const [open, setOpen] = useState<string[]>([sections[0]?.id])

  function toggle(id: string) {
    setOpen(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle size={28} className="text-primary" />
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      <p className="text-gray-500 text-sm">Kliknite na sekciu pre zobrazenie detailného návodu.</p>

      <div className="space-y-2">
        {sections.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              {open.includes(s.id) ? <ChevronDown size={18} className="text-primary" /> : <ChevronRight size={18} className="text-gray-400" />}
              {s.icon}
              <span className="font-medium text-gray-900">{s.title}</span>
            </button>
            {open.includes(s.id) && (
              <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                <div className="prose prose-sm max-w-none text-gray-700 pt-4">
                  {s.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create employee manual**

Create `src/app/(zamestnanec)/manual/page.tsx` with sections:

1. **Kniha jázd** — Ako zadať novú jazdu (krok za krokom), čo zadávam (mesiac, km, trasa), kde vidím stav, čo znamenajú stavy (rozpracovaná/odoslaná/spracovaná), kedy dostanem náhrady, ako nahráť bločky

2. **Moje vozidlo** — Kde vidím info o priradenom vozidle, ako nahlásiť problém, ako nahlásiť poistnú udalosť, čo robiť pri nehode

3. **Zamestnanecká karta** — Čo obsahuje moja karta, majetok (IT vybavenie), licencie, školenia, ako si pridať Outlook kalendár (iCal)

4. **Služobné cesty** — Ako podať žiadosť o služobnú cestu, domáca vs zahraničná, schvaľovací proces, ako nahrať doklady, vyúčtovanie, preddavok

5. **Notifikácie** — Kde nájdem notifikácie, čo znamenajú rôzne typy, ako označiť za prečítané

6. **FAQ** — Zabudol som heslo, nevidím nejaký modul, koho kontaktovať

- [ ] **Step 3: Create admin manual**

Create `src/app/admin/manual/page.tsx` with sections:

1. **Dashboard** — Čo zobrazuje prehľad, metriky, audit log, expirácie

2. **Kniha jázd — Spracovanie** — Ako spracovať jazdu (výpočet, PDF), hromadné spracovanie, vrátenie jazdy, typy vyúčtovania (firemné doma/zahraničie, súkromné), ceny palív, sadzby

3. **Zamestnanci** — Vytvorenie, úprava, roly (zamestnanec/admin/fleet/fin_manager/it_admin), module permissions, onboarding checklist, offboarding workflow, priradenie vozidla/nadriadeného/firmy

4. **Vozový park** — Správa vozidiel, servisy, kontroly STK/EK/PZP, hlásenia, zdieľané vozidlá, tachometer, tankovanie, tankové karty, poistné udalosti, reporty nákladov

5. **Služobné cesty** — Schvaľovanie, review dokladov, vyúčtovanie, preddavok, diéty

6. **Archív dokumentov** — Upload, kategórie, schvaľovanie, verziovanie, retenčná politika, prístupové práva, hromadný upload

7. **Dovolenky** — Schvaľovanie, typy (dovolenka/PN/OČR/náhradné/neplatené), pol dňa, nárok, zastupovanie

8. **Nastavenia** — Všeobecné, palivá, sadzby, systém

9. **Reporty** — Mesačné reporty jázd, dochádzka, ročný prehľad, CSV export miezd

- [ ] **Step 4: Create fleet manual**

Create `src/app/fleet/manual/page.tsx` with sections:

1. **Dashboard** — Prehľad vozidiel, blížiace sa kontroly/servisy, nové hlásenia

2. **Vozidlá** — Pridanie/úprava, stavy (aktívne/v servise/vyradené), základné údaje, vodič

3. **Vodiči** — Zdieľané vozidlá (M:N), priradenie primárneho vodiča, história držiteľov

4. **Servisy** — Pridanie servisu/opravy, stavy, plánovanie (interval km/mesiace), nasledný servis

5. **Kontroly STK/EK/PZP** — Pridanie kontroly, expirácie, notifikácie 30/14/7 dní

6. **Tachometer** — Mesačné záznamy km, konzistencia s jazdami

7. **Tankovanie** — Záznamy tankovaní, výpočet spotreby L/100km, tankové karty

8. **Hlásenia** — Nové hlásenia od vodičov, riešenie, uzavretie

9. **Poistné udalosti** — Workflow: nahlásená → riešená → u poisťovne → vyriešená, finančné údaje

10. **Reporty** — Náklady per vozidlo, km vodičov, celkové štatistiky

- [ ] **Step 5: Add manual link to Sidebar**

In `src/components/Sidebar.tsx`, add `HelpCircle` import and a manual link at the bottom of each role's nav section:

```tsx
{/* Manual link - always visible */}
{sectionLabel('Pomoc')}
<Link href={canEdit('jazdy') ? '/admin/manual' : '/manual'} className={linkClass(canEdit('jazdy') ? '/admin/manual' : '/manual')}>
  <HelpCircle size={19} className={iconClass(canEdit('jazdy') ? '/admin/manual' : '/manual')} /> Manuál
</Link>
```

For fleet section, show `/fleet/manual` link.

- [ ] **Step 6: Commit**

```bash
git add src/components/ManualPage.tsx src/app/\(zamestnanec\)/manual/ src/app/admin/manual/ src/app/fleet/manual/ src/components/Sidebar.tsx
git commit -m "feat: comprehensive manual pages for all modules (employee, admin, fleet)"
```

---

### Task 12: Dashboard Integration + Final Wiring

**Files:**
- Modify: `src/app/admin/page.tsx` — final dashboard with all widgets
- Modify: `src/app/(zamestnanec)/page.tsx` — employee dashboard enhancements
- Modify: `src/components/fleet/FleetDashboard.tsx` — final fleet dashboard

- [ ] **Step 1: Final admin dashboard**

In `src/app/admin/page.tsx`, add:
- Existing: jazdy stats, dovolenky, cesty, hlásenia, zamestnanci, audit log, STK expirácie
- New: školenia expirácie widget (from `getExpiraceSkoleni()`)
- New: expirujúce dokumenty widget (from `getExpiringDocuments()`)
- New: blížiace sa servisy (from fleet)
- Organize in 3-column grid

- [ ] **Step 2: Employee dashboard enhancements**

In `src/app/(zamestnanec)/page.tsx`:
- Add: expiring trainings for current user
- Add: onboarding progress (if has pending items)
- Add: link to manual

- [ ] **Step 3: Fleet dashboard enhancements**

In `src/components/fleet/FleetDashboard.tsx`:
- Add: upcoming services widget
- Add: expiring tank cards
- Add: monthly fuel consumption trends

- [ ] **Step 4: Final commit**

```bash
git add src/app/admin/page.tsx src/app/\(zamestnanec\)/page.tsx src/components/fleet/FleetDashboard.tsx
git commit -m "feat: integrated dashboard widgets connecting all modules"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

---

## Verification Checklist

After all tasks are complete:

- [ ] All new pages load without errors (`next build` passes)
- [ ] Database migration applied successfully (check Supabase for new tables)
- [ ] Admin dashboard shows all widget types
- [ ] Batch processing works on /admin/jazdy
- [ ] Vehicle detail shows all new tabs (vodiči, tachometer, tankovanie, tankové karty)
- [ ] Employee card shows iCal banner, skolenia
- [ ] Admin employee detail shows onboarding/offboarding, skolenia, PDF export
- [ ] Archive has category sidebar, multi-file upload, versioning
- [ ] Business trip detail has document review + vyúčtovanie
- [ ] Dark mode toggle works
- [ ] Settings page has all 4 tabs
- [ ] Manual pages load for all 3 roles
- [ ] Sidebar shows manual link for all roles
