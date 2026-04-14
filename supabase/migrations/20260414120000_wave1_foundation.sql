-- Wave 1: Foundation — nová rola fin_manager, typy úväzku, zastupovanie, OČR, pol dňa
-- Dátum: 2026-04-14

BEGIN;

-- ============================================================
-- 1. PROFILES: nová rola fin_manager + typ úväzku + zastupovanie
-- ============================================================

-- Rozšíriť rolu o fin_manager (+ zachovať všetky existujúce)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('zamestnanec', 'admin', 'fleet_manager', 'it_admin', 'tablet', 'fin_manager'));

-- Typ pracovného úväzku
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS typ_uvazku VARCHAR(20) NOT NULL DEFAULT 'tpp'
  CHECK (typ_uvazku IN ('tpp', 'dohoda', 'brigada', 'extern', 'materska', 'rodicovska'));

CREATE INDEX IF NOT EXISTS idx_profiles_typ_uvazku ON profiles(typ_uvazku);

-- Zastupujúci nadriadený
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zastupuje_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_zastupuje ON profiles(zastupuje_id);

-- Sanity: zastupujúci ≠ ja
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_zastupuje_not_self;
ALTER TABLE profiles ADD CONSTRAINT profiles_zastupuje_not_self
  CHECK (zastupuje_id IS NULL OR zastupuje_id <> id);

-- ============================================================
-- 2. DOVOLENKY: OČR + pol dňa
-- ============================================================

ALTER TABLE dovolenky DROP CONSTRAINT IF EXISTS dovolenky_typ_check;
ALTER TABLE dovolenky ADD CONSTRAINT dovolenky_typ_check
  CHECK (typ IN ('dovolenka', 'sick_leave', 'ocr', 'nahradne_volno', 'neplatene_volno'));

ALTER TABLE dovolenky ADD COLUMN IF NOT EXISTS pol_dna BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE dovolenky ADD COLUMN IF NOT EXISTS cast_dna VARCHAR(10)
  CHECK (cast_dna IS NULL OR cast_dna IN ('dopoludnie', 'popoludnie'));

-- Ak je pol_dna, musí byť jeden deň (datum_od = datum_do) a musí byť určená časť dňa
ALTER TABLE dovolenky DROP CONSTRAINT IF EXISTS dovolenky_pol_dna_consistency;
ALTER TABLE dovolenky ADD CONSTRAINT dovolenky_pol_dna_consistency
  CHECK (
    (pol_dna = false) OR
    (pol_dna = true AND datum_od = datum_do AND cast_dna IS NOT NULL)
  );

-- ============================================================
-- 3. RLS: rozšíriť admin policies o fin_manager
-- ============================================================

-- DOVOLENKY
DROP POLICY IF EXISTS admin_all_dovolenky ON dovolenky;
CREATE POLICY admin_all_dovolenky ON dovolenky
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

-- SLUZOBNE_CESTY
DROP POLICY IF EXISTS admin_all_cesty ON sluzobne_cesty;
CREATE POLICY admin_all_cesty ON sluzobne_cesty
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

-- CESTOVNE_PRIKAZY
DROP POLICY IF EXISTS admin_all_cestovne_prikazy ON cestovne_prikazy;
CREATE POLICY admin_all_cestovne_prikazy ON cestovne_prikazy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

-- DOCHADZKA (ak má admin policy)
DROP POLICY IF EXISTS admin_all_dochadzka ON dochadzka;
CREATE POLICY admin_all_dochadzka ON dochadzka
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

-- DOKUMENTY_ARCHIV
DROP POLICY IF EXISTS admin_all_dokumenty ON dokumenty_archiv;
CREATE POLICY admin_all_dokumenty ON dokumenty_archiv
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

-- JAZDY (fin_manager vidí všetky pre reporty)
DROP POLICY IF EXISTS admin_all_jazdy ON jazdy;
CREATE POLICY admin_all_jazdy ON jazdy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
  );

COMMIT;

-- Kontrola po aplikácii:
-- SELECT typ_uvazku, COUNT(*) FROM profiles GROUP BY typ_uvazku;
-- SELECT typ, COUNT(*) FROM dovolenky GROUP BY typ;
