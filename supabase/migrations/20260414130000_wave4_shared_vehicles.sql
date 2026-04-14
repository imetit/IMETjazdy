-- Wave 4: Zdieľané vozidlá + tacho záznamy
-- Dátum: 2026-04-14

BEGIN;

-- ============================================================
-- vozidlo_vodici: M:N vzťah, jedno vozidlo môže mať viac vodičov
-- ============================================================

CREATE TABLE IF NOT EXISTS vozidlo_vodici (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  od DATE NOT NULL DEFAULT CURRENT_DATE,
  do_dne DATE,
  primarny BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vozidlo_id, user_id, od)
);

CREATE INDEX IF NOT EXISTS idx_vozidlo_vodici_vozidlo ON vozidlo_vodici(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_vozidlo_vodici_user ON vozidlo_vodici(user_id);

-- Iba jeden primárny vodič na vozidlo (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vozidlo_vodici_one_primary
  ON vozidlo_vodici(vozidlo_id) WHERE primarny = true;

ALTER TABLE vozidlo_vodici ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_vozidla_vodici" ON vozidlo_vodici
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "fleet_admin_all_vodici" ON vozidlo_vodici
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('fleet_manager','admin','it_admin','fin_manager'))
  );

-- Seed: migrovať existujúce profiles.vozidlo_id ako primárny záznam
INSERT INTO vozidlo_vodici (vozidlo_id, user_id, primarny)
SELECT vozidlo_id, id, true FROM profiles
WHERE vozidlo_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Seed: vozidla.priradeny_vodic_id tiež ako primárny (ak nebol už z profiles)
INSERT INTO vozidlo_vodici (vozidlo_id, user_id, primarny)
SELECT id, priradeny_vodic_id, false FROM vozidla
WHERE priradeny_vodic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vozidlo_vodici vv
    WHERE vv.vozidlo_id = vozidla.id AND vv.user_id = vozidla.priradeny_vodic_id
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- vozidlo_tacho_zaznamy: mesačný stav tachometra
-- ============================================================

CREATE TABLE IF NOT EXISTS vozidlo_tacho_zaznamy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  mesiac VARCHAR(7) NOT NULL,  -- YYYY-MM
  stav_km INTEGER NOT NULL CHECK (stav_km >= 0),
  zapisal_id UUID REFERENCES profiles(id),
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vozidlo_id, mesiac)
);

CREATE INDEX IF NOT EXISTS idx_vozidlo_tacho_vozidlo ON vozidlo_tacho_zaznamy(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_vozidlo_tacho_mesiac ON vozidlo_tacho_zaznamy(mesiac);

ALTER TABLE vozidlo_tacho_zaznamy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_admin_all_tacho" ON vozidlo_tacho_zaznamy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('fleet_manager','admin','it_admin','fin_manager'))
  );

CREATE POLICY "driver_view_own_tacho" ON vozidlo_tacho_zaznamy
  FOR SELECT USING (
    vozidlo_id IN (SELECT vozidlo_id FROM vozidlo_vodici WHERE user_id = auth.uid())
  );

COMMIT;
