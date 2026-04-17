-- ==============================================================
-- IMET Complete System Migration 2026-04-17
-- New tables: vozidlo_tankovanie, tankove_karty, onboarding_items, skolenia, archiv_kategorie
-- Extended: dokumenty_archiv, vozidlo_servisy, cesta_doklady, sluzobne_cesty, profiles, poistne_udalosti
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
  ('Faktúry', '{admin,it_admin,fin_manager}', 2, '#f59e0b', 'Receipt'),
  ('Interné dokumenty', '{admin,it_admin}', 3, '#6b7280', 'FolderOpen'),
  ('BOZP', '{admin,it_admin}', 4, '#ef4444', 'ShieldAlert'),
  ('HR dokumenty', '{admin,it_admin}', 5, '#8b5cf6', 'Users'),
  ('Vozový park', '{admin,it_admin,fleet_manager}', 6, '#10b981', 'Car'),
  ('Ostatné', '{admin,it_admin,fin_manager}', 7, '#6b7280', 'Archive')
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

-- onboarding_items: admin moze vsetko, zamestnanec cita vlastne
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
