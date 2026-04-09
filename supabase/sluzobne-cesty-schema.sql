-- Služobné cesty schema
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sluzobne_cesty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum_od DATE NOT NULL,
  datum_do DATE NOT NULL,
  ciel TEXT NOT NULL,
  ucel TEXT NOT NULL,
  doprava VARCHAR(30) CHECK (doprava IN ('firemne_auto', 'sukromne_auto', 'vlak', 'autobus', 'lietadlo', 'ine')),
  predpokladany_km INTEGER,
  skutocny_km INTEGER,
  stav VARCHAR(20) NOT NULL DEFAULT 'nova' CHECK (stav IN ('nova', 'schvalena', 'zamietnuta', 'ukoncena', 'zrusena')),
  schvalovatel_id UUID REFERENCES profiles(id),
  schvalene_at TIMESTAMPTZ,
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sluzobne_cesty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_cesty" ON sluzobne_cesty
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_cesty" ON sluzobne_cesty
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_update_own_cesty" ON sluzobne_cesty
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "schvalovatel_manage_cesty" ON sluzobne_cesty
  FOR ALL USING (schvalovatel_id = auth.uid());
CREATE POLICY "admin_all_cesty" ON sluzobne_cesty
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );

CREATE TABLE IF NOT EXISTS cestovne_prikazy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sluzobna_cesta_id UUID NOT NULL REFERENCES sluzobne_cesty(id),
  cislo_prikazu VARCHAR(50),
  dieta_suma DECIMAL(10,2) DEFAULT 0,
  km_nahrada DECIMAL(10,2) DEFAULT 0,
  ubytovanie DECIMAL(10,2) DEFAULT 0,
  ine_naklady DECIMAL(10,2) DEFAULT 0,
  celkom DECIMAL(10,2) DEFAULT 0,
  stav VARCHAR(20) NOT NULL DEFAULT 'navrh' CHECK (stav IN ('navrh', 'schvaleny', 'vyplateny')),
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cestovne_prikazy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_prikazy" ON cestovne_prikazy
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sluzobne_cesty WHERE id = sluzobna_cesta_id AND user_id = auth.uid())
  );
CREATE POLICY "admin_all_prikazy" ON cestovne_prikazy
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
