-- Wave 3: Služobné cesty — zahraničie, preddavok, doklady
-- Dátum: 2026-04-14

BEGIN;

-- ============================================================
-- Rozšírenie sluzobne_cesty
-- ============================================================

ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS typ_cesty VARCHAR(10) NOT NULL DEFAULT 'domaca'
  CHECK (typ_cesty IN ('domaca', 'zahranicna'));

ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS krajina VARCHAR(60);
ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS mena VARCHAR(3);

-- Preddavok
ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS preddavok_suma DECIMAL(12,2);
ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS preddavok_stav VARCHAR(20)
  CHECK (preddavok_stav IS NULL OR preddavok_stav IN ('ziadany','vyplateny','zuctovany'));
ALTER TABLE sluzobne_cesty ADD COLUMN IF NOT EXISTS preddavok_vyplateny_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sluzobne_cesty_typ ON sluzobne_cesty(typ_cesty);
CREATE INDEX IF NOT EXISTS idx_sluzobne_cesty_krajina ON sluzobne_cesty(krajina);

-- ============================================================
-- Sadzby diét per krajina (zatiaľ prázdna, vyplniť po dodaní oficiálnych sadzieb)
-- ============================================================

CREATE TABLE IF NOT EXISTS dieta_sadzby (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  krajina VARCHAR(60) NOT NULL,
  mena VARCHAR(3) NOT NULL,
  suma_do_6h DECIMAL(10,2),
  suma_6_12h DECIMAL(10,2),
  suma_nad_12h DECIMAL(10,2) NOT NULL,
  platne_od DATE NOT NULL,
  platne_do DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(krajina, platne_od)
);

CREATE INDEX IF NOT EXISTS idx_dieta_sadzby_krajina ON dieta_sadzby(krajina);

ALTER TABLE dieta_sadzby ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_dieta" ON dieta_sadzby
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_write_dieta" ON dieta_sadzby
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','it_admin','fin_manager'))
  );

-- ============================================================
-- Doklady k služobnej ceste (Storage bucket + referencie)
-- ============================================================

CREATE TABLE IF NOT EXISTS cesta_doklady (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cesta_id UUID NOT NULL REFERENCES sluzobne_cesty(id) ON DELETE CASCADE,
  nazov VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  typ VARCHAR(30),   -- napr. 'ubytovanie', 'strava', 'doprava', 'ine'
  suma DECIMAL(12,2),
  mena VARCHAR(3),
  nahral_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cesta_doklady_cesta ON cesta_doklady(cesta_id);

ALTER TABLE cesta_doklady ENABLE ROW LEVEL SECURITY;

-- Vlastník cesty vidí svoje doklady
CREATE POLICY "owner_view_cesta_doklady" ON cesta_doklady
  FOR SELECT USING (
    cesta_id IN (SELECT id FROM sluzobne_cesty WHERE user_id = auth.uid())
  );
CREATE POLICY "owner_insert_cesta_doklady" ON cesta_doklady
  FOR INSERT WITH CHECK (
    cesta_id IN (SELECT id FROM sluzobne_cesty WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_all_cesta_doklady" ON cesta_doklady
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','it_admin','fin_manager'))
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sluzobne-cesty-doklady', 'sluzobne-cesty-doklady', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
