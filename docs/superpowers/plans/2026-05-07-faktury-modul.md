# Faktúry modul — implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oddeliť plný účtovný workflow faktúr od archívu dokumentov — nová `faktury` tabuľka s state machine, multi-currency, per-firma config, plné prepojenia.

**Architecture:** PostgreSQL/Supabase (RLS + triggers + state guard) → server actions (state machine + cache) → API endpoints (SWR) → Next.js 16 admin pages s Streaming SSR + SWR client cache.

**Tech Stack:** Next.js 16.2.2, React 19.2, Supabase (PostgreSQL 15), TypeScript, SWR, Tailwind CSS v4, Lucide icons, recharts, ECB API.

**Spec:** `docs/superpowers/specs/2026-05-07-faktury-modul-design.md`

---

## File Structure

**Nové súbory:**
- `supabase/migrations/20260507100000_faktury_modul.sql` — DB migrácia
- `scripts/migrate-faktury-data.mjs` — data migration z dokumenty_archiv
- `src/lib/faktury-types.ts` — TypeScript types
- `src/lib/faktury-helpers.ts` — resolveSchvalovatel, getEcbKurz, state machine validácia
- `src/lib/faktury-validation.ts` — input validation per pole
- `src/actions/faktury.ts` — všetky CRUD + workflow akcie
- `src/actions/dodavatelia.ts` — dodávatelia CRUD
- `src/actions/bankove-ucty.ts` — bankové účty CRUD
- `src/app/api/admin/faktury/route.ts` — list endpoint
- `src/app/api/admin/faktury/[id]/route.ts` — detail endpoint
- `src/app/api/admin/faktury/cashflow/route.ts` — cashflow forecast
- `src/app/api/admin/dodavatelia/route.ts`
- `src/app/admin/faktury/page.tsx` — list
- `src/app/admin/faktury/[id]/page.tsx` — detail
- `src/app/admin/faktury/nahrat/page.tsx` — upload
- `src/app/admin/faktury/reporty/page.tsx` — reporty
- `src/app/admin/faktury/dodavatelia/page.tsx`
- `src/app/admin/firmy/[id]/faktury-pravidla/page.tsx`
- `src/components/faktury/FakturyTable.tsx`
- `src/components/faktury/FakturaDetail.tsx`
- `src/components/faktury/FakturaWorkflowButtons.tsx`
- `src/components/faktury/FakturaUploadForm.tsx`
- `src/components/faktury/DodavatelAutocomplete.tsx`
- `src/components/faktury/MenaSelector.tsx`
- `src/components/faktury/EcbKurzInput.tsx`
- `src/components/faktury/PrepojeniaPanel.tsx`
- `src/components/faktury/AuditLogPanel.tsx`
- `src/components/faktury/CashflowChart.tsx`

**Upraviť:**
- `supabase/migrations/...` (cleanup dokumenty_archiv)
- `src/components/Sidebar.tsx` (nová sekcia Faktúry, oddeliť Archív)
- `src/lib/types.ts` (pridať `'faktury'` do ModulId)
- `src/app/api/cron/keep-warm/route.ts` → rename na `daily-maintenance` + ECB fetch + eskalácie
- `vercel.json` (cron path update)
- `src/app/admin/page.tsx` (dashboard widget pre faktúry)
- Existujúce stránky pre kontextové linky:
  - `src/app/admin/vozidla/[id]/page.tsx`
  - `src/app/admin/sluzobne-cesty/[id]/page.tsx`
  - `src/app/fleet/servisy/[id]/page.tsx` (ak existuje)
  - `src/app/fleet/poistky/[id]/page.tsx` (ak existuje)
  - `src/app/admin/zamestnanci/[id]/page.tsx`

---

## Fáza 1: DB migrácia — schéma

### Task 1.1: Vytvoriť migráciu s `dodavatelia` + `bankove_ucty` + `kurzy_mien`

**Files:**
- Create: `supabase/migrations/20260507100000_faktury_modul.sql`

- [ ] **Step 1: Vytvoriť súbor s tabuľkami `dodavatelia`, `bankove_ucty`, `kurzy_mien`**

```sql
-- =====================================================================
-- Faktúry modul — kompletná schéma (2026-05-07)
-- Spec: docs/superpowers/specs/2026-05-07-faktury-modul-design.md
-- =====================================================================

-- ── 1. DODAVATELIA ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dodavatelia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nazov text NOT NULL,
  ico text,
  dic text,
  ic_dph text,
  iban text,
  swift text,
  default_mena text NOT NULL DEFAULT 'EUR',
  default_dph_sadzba numeric(5,2) NOT NULL DEFAULT 20,
  default_splatnost_dni int DEFAULT 14,
  adresa text,
  email text,
  telefon text,
  poznamka text,
  aktivny boolean NOT NULL DEFAULT true,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dodavatelia_ico ON dodavatelia(ico) WHERE ico IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dodavatelia_search ON dodavatelia USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_dodavatelia_aktivny ON dodavatelia(aktivny) WHERE aktivny = true;

-- ── 2. BANKOVE_UCTY ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bankove_ucty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES firmy(id) ON DELETE CASCADE,
  nazov text NOT NULL,
  iban text NOT NULL,
  swift text,
  banka text,
  mena text NOT NULL DEFAULT 'EUR',
  aktivny boolean NOT NULL DEFAULT true,
  poradie int DEFAULT 0,
  poznamka text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_iban_per_firma UNIQUE (firma_id, iban)
);
CREATE INDEX IF NOT EXISTS idx_bankove_ucty_firma ON bankove_ucty(firma_id, aktivny);

-- ── 3. KURZY_MIEN ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kurzy_mien (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mena text NOT NULL,
  kurz_k_eur numeric(12,6) NOT NULL CHECK (kurz_k_eur > 0),
  datum date NOT NULL,
  zdroj text NOT NULL DEFAULT 'ECB' CHECK (zdroj IN ('ECB','NBS','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_mena_datum UNIQUE (mena, datum)
);
CREATE INDEX IF NOT EXISTS idx_kurzy_mena_datum_desc ON kurzy_mien(mena, datum DESC);

-- Seed: kurz EUR voči EUR = 1
INSERT INTO kurzy_mien (mena, kurz_k_eur, datum, zdroj)
VALUES ('EUR', 1, CURRENT_DATE, 'manual')
ON CONFLICT (mena, datum) DO NOTHING;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260507100000_faktury_modul.sql
git commit -m "feat(faktury): migrácia 1/3 — dodavatelia + bankove_ucty + kurzy_mien"
```

### Task 1.2: Pridať `faktury` tabuľku + constraints

**Files:**
- Modify: `supabase/migrations/20260507100000_faktury_modul.sql` (append)

- [ ] **Step 1: Pridať tabuľku `faktury`**

```sql
-- ── 4. FAKTURY (hlavná tabuľka) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS faktury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cislo_faktury text NOT NULL,
  variabilny_symbol text,
  konstantny_symbol text,
  specificky_symbol text,
  je_dobropis boolean NOT NULL DEFAULT false,
  povodna_faktura_id uuid REFERENCES faktury(id) ON DELETE RESTRICT,

  dodavatel_id uuid REFERENCES dodavatelia(id) ON DELETE RESTRICT,
  dodavatel_nazov text NOT NULL,
  dodavatel_ico text,

  mena text NOT NULL DEFAULT 'EUR',
  suma_bez_dph numeric(12,2),
  dph_sadzba numeric(5,2) NOT NULL DEFAULT 20,
  dph_suma numeric(12,2),
  suma_celkom numeric(12,2) NOT NULL CHECK (suma_celkom <> 0),
  kurz_k_eur numeric(12,6),
  suma_celkom_eur numeric(12,2),
  kurz_zdroj text CHECK (kurz_zdroj IN ('ECB','manual','NBS')),
  kurz_datum date,

  iban text,

  datum_vystavenia date,
  datum_doruceni date,
  datum_splatnosti date NOT NULL,
  datum_uhrady date,
  datum_zdanitelneho_plnenia date,

  stav text NOT NULL DEFAULT 'rozpracovana'
    CHECK (stav IN ('rozpracovana','caka_na_schvalenie','schvalena','zamietnuta','na_uhradu','uhradena','stornovana')),
  aktualny_stupen smallint NOT NULL DEFAULT 1 CHECK (aktualny_stupen IN (1,2)),
  version integer NOT NULL DEFAULT 1,

  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,

  firma_id uuid NOT NULL REFERENCES firmy(id) ON DELETE RESTRICT,
  vozidlo_id uuid REFERENCES vozidla(id) ON DELETE SET NULL,
  servis_id uuid REFERENCES vozidlo_servisy(id) ON DELETE SET NULL,
  tankova_karta_id uuid REFERENCES tankove_karty(id) ON DELETE SET NULL,
  cesta_id uuid REFERENCES sluzobne_cesty(id) ON DELETE SET NULL,
  zamestnanec_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  skolenie_id uuid REFERENCES skolenia(id) ON DELETE SET NULL,
  poistna_udalost_id uuid REFERENCES poistne_udalosti(id) ON DELETE SET NULL,
  bankovy_ucet_id uuid REFERENCES bankove_ucty(id) ON DELETE SET NULL,
  kategoria_id uuid REFERENCES archiv_kategorie(id) ON DELETE SET NULL,

  popis text,
  poznamka text,
  oddelenie text,
  tagy text[],
  search_vector tsvector,

  nahral_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  posol_na_schvalenie_at timestamptz,
  schvalil_l1_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  schvalene_l1_at timestamptz,
  schvalil_l2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  schvalene_l2_at timestamptz,
  zamietol_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  zamietnute_at timestamptz,
  zamietnutie_dovod text,
  uhradil_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uhradene_at timestamptz,
  stornoval_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stornovane_at timestamptz,
  storno_dovod text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_faktura_per_dodavatel UNIQUE (cislo_faktury, dodavatel_id, firma_id, je_dobropis),
  CONSTRAINT chk_dobropis_negative CHECK (
    (je_dobropis = true AND suma_celkom < 0) OR
    (je_dobropis = false AND suma_celkom > 0)
  ),
  CONSTRAINT chk_dobropis_povodna CHECK (
    (je_dobropis = true AND povodna_faktura_id IS NOT NULL) OR
    (je_dobropis = false AND povodna_faktura_id IS NULL)
  )
);
```

- [ ] **Step 2: Pridať indexy pre faktury**

```sql
CREATE INDEX IF NOT EXISTS idx_faktury_stav ON faktury(stav);
CREATE INDEX IF NOT EXISTS idx_faktury_firma_stav ON faktury(firma_id, stav);
CREATE INDEX IF NOT EXISTS idx_faktury_splatnost
  ON faktury(datum_splatnosti) WHERE stav IN ('schvalena','na_uhradu');
CREATE INDEX IF NOT EXISTS idx_faktury_dodavatel ON faktury(dodavatel_id);
CREATE INDEX IF NOT EXISTS idx_faktury_vozidlo ON faktury(vozidlo_id) WHERE vozidlo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faktury_servis ON faktury(servis_id) WHERE servis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faktury_cesta ON faktury(cesta_id) WHERE cesta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faktury_kategoria ON faktury(kategoria_id);
CREATE INDEX IF NOT EXISTS idx_faktury_search ON faktury USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_faktury_tagy ON faktury USING gin(tagy);
CREATE INDEX IF NOT EXISTS idx_faktury_created ON faktury(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faktury_dobropis
  ON faktury(povodna_faktura_id) WHERE je_dobropis = true;
CREATE INDEX IF NOT EXISTS idx_faktury_cashflow
  ON faktury(firma_id, datum_splatnosti) WHERE stav = 'na_uhradu';
```

- [ ] **Step 3: Audit log + firmy.faktury_workflow + module permissions**

```sql
-- ── 5. FAKTURY_AUDIT_LOG ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faktury_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faktura_id uuid NOT NULL REFERENCES faktury(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  akcia text NOT NULL,
  povodny_stav text,
  novy_stav text,
  zmenene_polia jsonb,
  poznamka text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faktury_audit_faktura ON faktury_audit_log(faktura_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faktury_audit_user ON faktury_audit_log(user_id, created_at DESC);

-- ── 6. FIRMY.faktury_workflow ─────────────────────────────────────────
ALTER TABLE firmy ADD COLUMN IF NOT EXISTS faktury_workflow jsonb NOT NULL DEFAULT '{
  "stupne": 1,
  "limit_auto_eur": 0,
  "schvalovatel_l1": "fin_manager",
  "schvalovatel_l2": "admin",
  "uhradzuje": "fin_manager"
}'::jsonb;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260507100000_faktury_modul.sql
git commit -m "feat(faktury): migrácia 2/3 — faktury tabuľka + audit log + firmy.faktury_workflow"
```

---

## Fáza 2: DB triggers + RLS

### Task 2.1: Triggers

**Files:**
- Modify: `supabase/migrations/20260507100000_faktury_modul.sql` (append)

- [ ] **Step 1: Trigger `faktury_search_vector_t`**

```sql
CREATE OR REPLACE FUNCTION faktury_search_vector_fn() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.cislo_faktury,'') || ' ' ||
    coalesce(NEW.dodavatel_nazov,'') || ' ' ||
    coalesce(NEW.popis,'') || ' ' ||
    coalesce(NEW.poznamka,'') || ' ' ||
    coalesce(NEW.variabilny_symbol,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faktury_search_vector_t ON faktury;
CREATE TRIGGER faktury_search_vector_t
  BEFORE INSERT OR UPDATE OF cislo_faktury, dodavatel_nazov, popis, poznamka, variabilny_symbol
  ON faktury FOR EACH ROW
  EXECUTE FUNCTION faktury_search_vector_fn();
```

- [ ] **Step 2: Trigger `faktury_eur_calc_t`**

```sql
CREATE OR REPLACE FUNCTION faktury_eur_calc_fn() RETURNS trigger AS $$
BEGIN
  IF NEW.mena = 'EUR' THEN
    NEW.kurz_k_eur := 1;
    NEW.suma_celkom_eur := NEW.suma_celkom;
  ELSIF NEW.kurz_k_eur IS NOT NULL THEN
    NEW.suma_celkom_eur := round(NEW.suma_celkom * NEW.kurz_k_eur, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faktury_eur_calc_t ON faktury;
CREATE TRIGGER faktury_eur_calc_t
  BEFORE INSERT OR UPDATE OF mena, kurz_k_eur, suma_celkom
  ON faktury FOR EACH ROW
  EXECUTE FUNCTION faktury_eur_calc_fn();
```

- [ ] **Step 3: Trigger `faktury_state_guard_t` (DB-level state machine)**

```sql
CREATE OR REPLACE FUNCTION faktury_state_guard_fn() RETURNS trigger AS $$
DECLARE
  is_it_admin boolean;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.stav = NEW.stav THEN RETURN NEW; END IF;

  -- Allowed transitions matrix
  IF (OLD.stav, NEW.stav) IN (
    ('rozpracovana','caka_na_schvalenie'),
    ('rozpracovana','stornovana'),
    ('caka_na_schvalenie','schvalena'),
    ('caka_na_schvalenie','caka_na_schvalenie'),
    ('caka_na_schvalenie','zamietnuta'),
    ('caka_na_schvalenie','stornovana'),
    ('zamietnuta','caka_na_schvalenie'),
    ('zamietnuta','stornovana'),
    ('schvalena','na_uhradu'),
    ('schvalena','uhradena'),
    ('schvalena','caka_na_schvalenie'),
    ('schvalena','stornovana'),
    ('na_uhradu','uhradena'),
    ('na_uhradu','schvalena'),
    ('na_uhradu','caka_na_schvalenie'),
    ('na_uhradu','stornovana')
  ) THEN
    RETURN NEW;
  END IF;

  -- Special: uhradena → stornovana iba it_admin
  IF OLD.stav = 'uhradena' AND NEW.stav = 'stornovana' THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = COALESCE(current_setting('app.current_user_id', true)::uuid, NEW.stornoval_id)
      AND role = 'it_admin'
    ) INTO is_it_admin;
    IF is_it_admin THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Storno uhradenej faktúry vyžaduje it_admin rolu';
  END IF;

  RAISE EXCEPTION 'Neplatný prechod stavov faktúry: % → %', OLD.stav, NEW.stav;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faktury_state_guard_t ON faktury;
CREATE TRIGGER faktury_state_guard_t
  BEFORE UPDATE ON faktury FOR EACH ROW
  EXECUTE FUNCTION faktury_state_guard_fn();
```

- [ ] **Step 4: Trigger `faktury_audit_t`**

```sql
CREATE OR REPLACE FUNCTION faktury_audit_fn() RETURNS trigger AS $$
DECLARE
  diff jsonb := '{}';
  user_id_val uuid;
BEGIN
  user_id_val := NULLIF(current_setting('app.current_user_id', true), '')::uuid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO faktury_audit_log (faktura_id, user_id, akcia, novy_stav)
    VALUES (NEW.id, COALESCE(user_id_val, NEW.nahral_id), 'created', NEW.stav);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.stav <> NEW.stav THEN diff := diff || jsonb_build_object('stav', jsonb_build_object('old', OLD.stav, 'new', NEW.stav)); END IF;
    IF OLD.suma_celkom <> NEW.suma_celkom THEN diff := diff || jsonb_build_object('suma_celkom', jsonb_build_object('old', OLD.suma_celkom, 'new', NEW.suma_celkom)); END IF;
    IF COALESCE(OLD.dodavatel_nazov,'') <> COALESCE(NEW.dodavatel_nazov,'') THEN diff := diff || jsonb_build_object('dodavatel_nazov', jsonb_build_object('old', OLD.dodavatel_nazov, 'new', NEW.dodavatel_nazov)); END IF;
    IF OLD.kurz_k_eur IS DISTINCT FROM NEW.kurz_k_eur THEN diff := diff || jsonb_build_object('kurz_k_eur', jsonb_build_object('old', OLD.kurz_k_eur, 'new', NEW.kurz_k_eur)); END IF;
    IF OLD.datum_splatnosti <> NEW.datum_splatnosti THEN diff := diff || jsonb_build_object('datum_splatnosti', jsonb_build_object('old', OLD.datum_splatnosti, 'new', NEW.datum_splatnosti)); END IF;

    IF diff <> '{}'::jsonb OR OLD.stav <> NEW.stav THEN
      INSERT INTO faktury_audit_log (faktura_id, user_id, akcia, povodny_stav, novy_stav, zmenene_polia)
      VALUES (
        NEW.id, user_id_val,
        CASE
          WHEN OLD.stav = 'rozpracovana' AND NEW.stav = 'caka_na_schvalenie' THEN 'sent_for_approval'
          WHEN OLD.stav = 'caka_na_schvalenie' AND NEW.stav = 'schvalena' THEN 'approved'
          WHEN OLD.stav = 'caka_na_schvalenie' AND NEW.stav = 'zamietnuta' THEN 'rejected'
          WHEN OLD.stav = 'zamietnuta' AND NEW.stav = 'caka_na_schvalenie' THEN 'resubmitted'
          WHEN OLD.stav = 'schvalena' AND NEW.stav = 'na_uhradu' THEN 'marked_for_payment'
          WHEN NEW.stav = 'uhradena' THEN 'paid'
          WHEN NEW.stav = 'stornovana' THEN 'cancelled'
          WHEN OLD.stav IN ('schvalena','na_uhradu') AND NEW.stav = 'caka_na_schvalenie' THEN 'reapproval_triggered'
          ELSE 'edited'
        END,
        OLD.stav, NEW.stav, diff
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO faktury_audit_log (faktura_id, user_id, akcia, povodny_stav)
    VALUES (OLD.id, user_id_val, 'deleted', OLD.stav);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faktury_audit_t ON faktury;
CREATE TRIGGER faktury_audit_t
  AFTER INSERT OR UPDATE OR DELETE ON faktury
  FOR EACH ROW EXECUTE FUNCTION faktury_audit_fn();
```

- [ ] **Step 5: Trigger `faktury_version_t` + `faktury_updated_at_t`**

```sql
CREATE OR REPLACE FUNCTION faktury_version_fn() RETURNS trigger AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faktury_version_t ON faktury;
CREATE TRIGGER faktury_version_t
  BEFORE UPDATE ON faktury FOR EACH ROW
  EXECUTE FUNCTION faktury_version_fn();

-- Dodavatelia search vector
CREATE OR REPLACE FUNCTION dodavatelia_search_vector_fn() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    coalesce(NEW.nazov,'') || ' ' ||
    coalesce(NEW.ico,'') || ' ' ||
    coalesce(NEW.dic,'') || ' ' ||
    coalesce(NEW.email,'') || ' ' ||
    coalesce(NEW.adresa,'')
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dodavatelia_search_vector_t ON dodavatelia;
CREATE TRIGGER dodavatelia_search_vector_t
  BEFORE INSERT OR UPDATE ON dodavatelia
  FOR EACH ROW EXECUTE FUNCTION dodavatelia_search_vector_fn();
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260507100000_faktury_modul.sql
git commit -m "feat(faktury): triggers — search vector, EUR calc, state guard, audit log, version"
```

### Task 2.2: RLS policies

**Files:**
- Modify: `supabase/migrations/20260507100000_faktury_modul.sql` (append)

- [ ] **Step 1: Pridať RLS policies pre faktury**

```sql
ALTER TABLE faktury ENABLE ROW LEVEL SECURITY;
ALTER TABLE faktury_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodavatelia ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankove_ucty ENABLE ROW LEVEL SECURITY;
ALTER TABLE kurzy_mien ENABLE ROW LEVEL SECURITY;

-- Faktury: SELECT/INSERT/UPDATE pre admin/it_admin/fin_manager v firma scope
DROP POLICY IF EXISTS faktury_select ON faktury;
CREATE POLICY faktury_select ON faktury FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (
      p.role = 'it_admin'
      OR faktury.firma_id = p.firma_id
      OR faktury.firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[]))
    )
  )
);

DROP POLICY IF EXISTS faktury_insert ON faktury;
CREATE POLICY faktury_insert ON faktury FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR firma_id = p.firma_id OR firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

DROP POLICY IF EXISTS faktury_update ON faktury;
CREATE POLICY faktury_update ON faktury FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR firma_id = p.firma_id OR firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

DROP POLICY IF EXISTS faktury_delete ON faktury;
CREATE POLICY faktury_delete ON faktury FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'it_admin')
);

-- Audit log: read-only podľa rovnakej firma scope
DROP POLICY IF EXISTS faktury_audit_select ON faktury_audit_log;
CREATE POLICY faktury_audit_select ON faktury_audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM faktury f, profiles p
    WHERE f.id = faktury_audit_log.faktura_id
    AND p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR f.firma_id = p.firma_id OR f.firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

-- Dodavatelia: zdieľané, admin/fin_manager/it_admin all access
DROP POLICY IF EXISTS dodavatelia_all ON dodavatelia;
CREATE POLICY dodavatelia_all ON dodavatelia FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','it_admin','fin_manager'))
);

-- Bankove_ucty: per firma scope
DROP POLICY IF EXISTS bankove_ucty_all ON bankove_ucty;
CREATE POLICY bankove_ucty_all ON bankove_ucty FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR firma_id = p.firma_id OR firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

-- Kurzy_mien: read-only všetci, write iba it_admin (cron používa service_role)
DROP POLICY IF EXISTS kurzy_select ON kurzy_mien;
CREATE POLICY kurzy_select ON kurzy_mien FOR SELECT USING (true);
DROP POLICY IF EXISTS kurzy_admin ON kurzy_mien;
CREATE POLICY kurzy_admin ON kurzy_mien FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'it_admin')
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260507100000_faktury_modul.sql
git commit -m "feat(faktury): RLS policies — per firma scope + role-based access"
```

---

## Fáza 3: Aplikovať migráciu + storage bucket

### Task 3.1: Aplikovať migráciu cez Supabase

- [ ] **Step 1: Push migráciu na Supabase**

```bash
cd "C:/CLAUDE PROJEKTY/imetjazdy-work/" && npx supabase db push
```

Expected: migration applied successfully. Ak zlyhá, čítať error a fixnúť.

- [ ] **Step 2: Vytvoriť storage bucket `faktury`**

Skript `scripts/create-faktury-bucket.mjs`:

```js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=')
  if (k && v) acc[k.trim()] = v.trim()
  return acc
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { error } = await sb.storage.createBucket('faktury', {
  public: false,
  fileSizeLimit: 25 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
})

if (error && !error.message.includes('already exists')) {
  console.error('Failed:', error.message); process.exit(1)
}
console.log('Bucket faktury ready')
```

Run: `node scripts/create-faktury-bucket.mjs`
Expected: `Bucket faktury ready`

- [ ] **Step 3: Verifikácia**

```bash
node -e "import('@supabase/supabase-js').then(async ({createClient}) => {
  const env = require('fs').readFileSync('.env.local','utf8').split('\n').reduce((a,l)=>{const[k,v]=l.split('=');if(k&&v)a[k.trim()]=v.trim();return a},{});
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const t = await sb.from('faktury').select('id').limit(1);
  const d = await sb.from('dodavatelia').select('id').limit(1);
  const k = await sb.from('kurzy_mien').select('mena').limit(5);
  console.log('faktury:', t.error?.message || 'OK');
  console.log('dodavatelia:', d.error?.message || 'OK');
  console.log('kurzy_mien:', k.error?.message || `OK (${k.data.length})`);
})"
```

Expected: 3× OK (žiadne tabuľka neexistuje errory).

- [ ] **Step 4: Commit**

```bash
git add scripts/create-faktury-bucket.mjs
git commit -m "feat(faktury): storage bucket faktury (25MB, PDF/JPG/PNG/WebP)"
```

---

## Fáza 4: TypeScript types

### Task 4.1: `lib/faktury-types.ts`

**Files:**
- Create: `src/lib/faktury-types.ts`

- [ ] **Step 1: Definovať všetky types**

```typescript
// src/lib/faktury-types.ts

export type FakturaStav =
  | 'rozpracovana'
  | 'caka_na_schvalenie'
  | 'schvalena'
  | 'zamietnuta'
  | 'na_uhradu'
  | 'uhradena'
  | 'stornovana'

export type Mena = 'EUR' | 'CZK' | 'USD' | 'GBP' | 'PLN' | 'HUF' | 'CHF'

export type SchvalovatelRole = 'nadriadeny' | 'fin_manager' | 'admin' | 'it_admin' | string // 'user:UUID'

export interface FakturyWorkflowConfig {
  stupne: 1 | 2
  limit_auto_eur: number
  schvalovatel_l1: SchvalovatelRole
  schvalovatel_l2: SchvalovatelRole
  uhradzuje: SchvalovatelRole
}

export interface Faktura {
  id: string
  cislo_faktury: string
  variabilny_symbol: string | null
  konstantny_symbol: string | null
  specificky_symbol: string | null
  je_dobropis: boolean
  povodna_faktura_id: string | null

  dodavatel_id: string | null
  dodavatel_nazov: string
  dodavatel_ico: string | null

  mena: Mena
  suma_bez_dph: number | null
  dph_sadzba: number
  dph_suma: number | null
  suma_celkom: number
  kurz_k_eur: number | null
  suma_celkom_eur: number | null
  kurz_zdroj: 'ECB' | 'manual' | 'NBS' | null
  kurz_datum: string | null

  iban: string | null

  datum_vystavenia: string | null
  datum_doruceni: string | null
  datum_splatnosti: string
  datum_uhrady: string | null
  datum_zdanitelneho_plnenia: string | null

  stav: FakturaStav
  aktualny_stupen: 1 | 2
  version: number

  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null

  firma_id: string
  vozidlo_id: string | null
  servis_id: string | null
  tankova_karta_id: string | null
  cesta_id: string | null
  zamestnanec_id: string | null
  skolenie_id: string | null
  poistna_udalost_id: string | null
  bankovy_ucet_id: string | null
  kategoria_id: string | null

  popis: string | null
  poznamka: string | null
  oddelenie: string | null
  tagy: string[] | null

  nahral_id: string
  posol_na_schvalenie_at: string | null
  schvalil_l1_id: string | null
  schvalene_l1_at: string | null
  schvalil_l2_id: string | null
  schvalene_l2_at: string | null
  zamietol_id: string | null
  zamietnute_at: string | null
  zamietnutie_dovod: string | null
  uhradil_id: string | null
  uhradene_at: string | null
  stornoval_id: string | null
  stornovane_at: string | null
  storno_dovod: string | null

  created_at: string
  updated_at: string
}

export interface Dodavatel {
  id: string
  nazov: string
  ico: string | null
  dic: string | null
  ic_dph: string | null
  iban: string | null
  swift: string | null
  default_mena: Mena
  default_dph_sadzba: number
  default_splatnost_dni: number | null
  adresa: string | null
  email: string | null
  telefon: string | null
  poznamka: string | null
  aktivny: boolean
  created_at: string
  updated_at: string
}

export interface BankovyUcet {
  id: string
  firma_id: string
  nazov: string
  iban: string
  swift: string | null
  banka: string | null
  mena: Mena
  aktivny: boolean
  poradie: number | null
  poznamka: string | null
}

export interface KurzMen {
  id: string
  mena: Mena
  kurz_k_eur: number
  datum: string
  zdroj: 'ECB' | 'NBS' | 'manual'
}

export interface FakturaAuditEntry {
  id: string
  faktura_id: string
  user_id: string | null
  akcia: string
  povodny_stav: FakturaStav | null
  novy_stav: FakturaStav | null
  zmenene_polia: Record<string, { old: unknown; new: unknown }> | null
  poznamka: string | null
  ip_address: string | null
  created_at: string
}

export const FAKTURA_STAV_LABELS: Record<FakturaStav, string> = {
  rozpracovana: 'Rozpracovaná',
  caka_na_schvalenie: 'Čaká na schválenie',
  schvalena: 'Schválená',
  zamietnuta: 'Zamietnutá',
  na_uhradu: 'Na úhradu',
  uhradena: 'Uhradená',
  stornovana: 'Stornovaná',
}

export const FAKTURA_STAV_COLORS: Record<FakturaStav, string> = {
  rozpracovana: 'bg-gray-100 text-gray-800',
  caka_na_schvalenie: 'bg-orange-100 text-orange-800',
  schvalena: 'bg-green-100 text-green-800',
  zamietnuta: 'bg-red-100 text-red-800',
  na_uhradu: 'bg-blue-100 text-blue-800',
  uhradena: 'bg-teal-100 text-teal-800',
  stornovana: 'bg-gray-200 text-gray-500',
}

export const MENA_SYMBOLS: Record<Mena, string> = {
  EUR: '€', CZK: 'Kč', USD: '$', GBP: '£', PLN: 'zł', HUF: 'Ft', CHF: 'CHF',
}

// Polia ktoré po zmene spustia re-approval
export const SECURITY_FIELDS = [
  'suma_celkom', 'suma_bez_dph', 'dph_sadzba', 'dph_suma', 'mena', 'kurz_k_eur',
  'dodavatel_id', 'dodavatel_nazov', 'iban', 'variabilny_symbol', 'cislo_faktury',
  'datum_splatnosti', 'file_path',
] as const

export type SecurityField = typeof SECURITY_FIELDS[number]

// Allowed transitions matrix (musí matchovať DB trigger faktury_state_guard_fn)
export const ALLOWED_TRANSITIONS: Record<FakturaStav, FakturaStav[]> = {
  rozpracovana: ['caka_na_schvalenie', 'stornovana'],
  caka_na_schvalenie: ['schvalena', 'caka_na_schvalenie', 'zamietnuta', 'stornovana'],
  schvalena: ['na_uhradu', 'uhradena', 'caka_na_schvalenie', 'stornovana'],
  zamietnuta: ['caka_na_schvalenie', 'stornovana'],
  na_uhradu: ['uhradena', 'schvalena', 'caka_na_schvalenie', 'stornovana'],
  uhradena: ['stornovana'], // iba it_admin force
  stornovana: [],
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd "C:/CLAUDE PROJEKTY/imetjazdy-work/" && npx tsc --noEmit 2>&1 | tail -5
```

Expected: Exit 0, žiadne errory.

- [ ] **Step 3: Commit**

```bash
git add src/lib/faktury-types.ts
git commit -m "feat(faktury): TypeScript types — Faktura, Dodavatel, BankovyUcet, KurzMen + state machine constants"
```

---

## Pokračovanie plánu

Tento dokument bude pokračovať fázami 5-17 v ďalších commitoch. Aktuálne pokrýva:
- Fáza 1: DB schéma (tabuľky + indexy + workflow config)
- Fáza 2: Triggers (search vector, EUR calc, state guard, audit, version) + RLS
- Fáza 3: Aplikácia migrácie + storage bucket
- Fáza 4: TypeScript types

**Ďalšie fázy (idú v ďalších iteráciách plánu):**
- Fáza 5: Helpers (resolveSchvalovatel, getEcbKurz, validateTransition)
- Fáza 6: Server actions (CRUD + workflow + bulk)
- Fáza 7: Migrácia historických dát z dokumenty_archiv
- Fáza 8: API endpoints pre SWR
- Fáza 9-13: UI komponenty + pages (list, detail, upload, reporty, dodavatelia, per-firma config)
- Fáza 14: Kontextové linky (vozidla, cesty, servisy, poistky, zamestnanci, karty)
- Fáza 15: Notifikácie + cron rename (keep-warm → daily-maintenance s ECB fetch)
- Fáza 16: Refactor archív (dokumenty_archiv simplification + sidebar split)
- Fáza 17: E2E testy + deploy + smoke verify

**Plán pokračuje cez executing-plans / subagent-driven-development.**
