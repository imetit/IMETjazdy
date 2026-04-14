-- Wave 8: Multi-tenant — firmy (matka IMET + 6 dcérskych)
-- Dátum: 2026-04-14
--
-- IMET ma 1 matku + 6 dcerskych firiem. Niektore pouzivaju plne moduly
-- (HQ v BA), niektore iba dochadzku (vyroba + pobočky).

BEGIN;

-- ============================================================
-- 1. firmy
-- ============================================================

CREATE TABLE IF NOT EXISTS firmy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kod VARCHAR(30) UNIQUE NOT NULL,
  nazov VARCHAR(200) NOT NULL,
  ico VARCHAR(20),
  dic VARCHAR(20),
  ic_dph VARCHAR(20),
  adresa TEXT,
  mesto VARCHAR(100),
  krajina VARCHAR(3) NOT NULL DEFAULT 'SK',
  mena VARCHAR(3) NOT NULL DEFAULT 'EUR',
  je_matka BOOLEAN NOT NULL DEFAULT false,
  moduly_default JSONB NOT NULL DEFAULT '["dochadzka"]'::jsonb,
  aktivna BOOLEAN NOT NULL DEFAULT true,
  poradie INTEGER NOT NULL DEFAULT 100,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firmy_kod ON firmy(kod);
CREATE INDEX IF NOT EXISTS idx_firmy_aktivna ON firmy(aktivna);

ALTER TABLE firmy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_firmy" ON firmy
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_write_firmy" ON firmy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','it_admin','fin_manager'))
  );

-- ============================================================
-- 2. Seed 7 firiem
-- ============================================================

INSERT INTO firmy (kod, nazov, mesto, krajina, mena, je_matka, moduly_default, poradie) VALUES
  ('IMET',
    'IMET, a.s.',
    'Bratislava', 'SK', 'EUR', true,
    '["jazdy","vozovy_park","zamestnanecka_karta","dochadzka","dovolenky","sluzobne_cesty","archiv","admin_zamestnanci","admin_nastavenia"]'::jsonb,
    1),
  ('IMET_TEC',
    'IMET-TEC, s.r.o.',
    'Bratislava', 'SK', 'EUR', false,
    '["jazdy","vozovy_park","zamestnanecka_karta","dochadzka","dovolenky","sluzobne_cesty","archiv"]'::jsonb,
    2),
  ('AKE_BA',
    'AKE, s.r.o.',
    'Bratislava', 'SK', 'EUR', false,
    '["jazdy","vozovy_park","zamestnanecka_karta","dochadzka","dovolenky","sluzobne_cesty","archiv"]'::jsonb,
    3),
  ('AKE_SKALICA',
    'AKE Skalica',
    'Skalica', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    4),
  ('IMET_CZ',
    'IMET CZ, s.r.o.',
    NULL, 'CZ', 'CZK', false,
    '["dochadzka","dovolenky"]'::jsonb,
    5),
  ('IMET_KE',
    'IMET Košice',
    'Košice', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    6),
  ('IMET_ZA',
    'IMET Žilina',
    'Žilina', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    7)
ON CONFLICT (kod) DO NOTHING;

-- ============================================================
-- 3. profiles: firma_id + tyzdnovy fond + pracovne dni + datum nastupu
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS firma_id UUID REFERENCES firmy(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_firma ON profiles(firma_id);

-- Existujúci používatelia → matka IMET
UPDATE profiles
SET firma_id = (SELECT id FROM firmy WHERE kod = 'IMET')
WHERE firma_id IS NULL;

-- Týždňový fond (import-friendly — starý systém to má)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tyzdnovy_fond_hodiny DECIMAL(4,1) DEFAULT 42.5
  CHECK (tyzdnovy_fond_hodiny > 0 AND tyzdnovy_fond_hodiny <= 60);

-- Koľko dní týždenne pracuje (pre odvodenie denného fondu)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pracovne_dni_tyzdne INTEGER DEFAULT 5
  CHECK (pracovne_dni_tyzdne BETWEEN 1 AND 7);

-- Dátum nástupu (z exportu)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS datum_nastupu DATE;
CREATE INDEX IF NOT EXISTS idx_profiles_datum_nastupu ON profiles(datum_nastupu);

COMMIT;
