-- Fleet Management Schema Extension
-- Run this in Supabase SQL Editor

-- 1. Extend profiles role check
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('zamestnanec', 'admin', 'fleet_manager'));

-- 2. Extend vozidla table
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS vin VARCHAR(17);
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS rok_vyroby INTEGER;
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS farba VARCHAR(50);
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS typ_vozidla VARCHAR(20) DEFAULT 'osobne';
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS stav VARCHAR(20) DEFAULT 'aktivne';
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS stredisko VARCHAR(100);
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS aktualne_km INTEGER DEFAULT 0;
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS priradeny_vodic_id UUID REFERENCES profiles(id);

ALTER TABLE vozidla ADD CONSTRAINT vozidla_typ_vozidla_check
  CHECK (typ_vozidla IN ('osobne', 'uzitkove', 'ine'));
ALTER TABLE vozidla ADD CONSTRAINT vozidla_stav_check
  CHECK (stav IN ('aktivne', 'vyradene', 'servis'));

-- 3. vozidlo_dokumenty
CREATE TABLE IF NOT EXISTS vozidlo_dokumenty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  typ VARCHAR(30) NOT NULL CHECK (typ IN ('technicky_preukaz', 'pzp', 'havarijne', 'leasing', 'ine')),
  nazov VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  platnost_do DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vozidlo_dokumenty ENABLE ROW LEVEL SECURITY;

-- 4. vozidlo_servisy
CREATE TABLE IF NOT EXISTS vozidlo_servisy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  typ VARCHAR(20) NOT NULL CHECK (typ IN ('servis', 'porucha', 'nehoda', 'udrzba')),
  datum DATE NOT NULL,
  popis TEXT NOT NULL,
  cena DECIMAL(10,2),
  dodavatel VARCHAR(255),
  stav VARCHAR(20) NOT NULL DEFAULT 'planovane'
    CHECK (stav IN ('planovane', 'prebieha', 'dokoncene')),
  km_pri_servise INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vozidlo_servisy ENABLE ROW LEVEL SECURITY;

-- 5. servis_prilohy
CREATE TABLE IF NOT EXISTS servis_prilohy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servis_id UUID NOT NULL REFERENCES vozidlo_servisy(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE servis_prilohy ENABLE ROW LEVEL SECURITY;

-- 6. vozidlo_kontroly
CREATE TABLE IF NOT EXISTS vozidlo_kontroly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  typ VARCHAR(20) NOT NULL CHECK (typ IN ('stk', 'ek', 'pzp', 'havarijne')),
  datum_vykonania DATE NOT NULL,
  platnost_do DATE NOT NULL,
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vozidlo_kontroly ENABLE ROW LEVEL SECURITY;

-- 7. km_historia
CREATE TABLE IF NOT EXISTS km_historia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  km INTEGER NOT NULL,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  zdroj VARCHAR(20) NOT NULL CHECK (zdroj IN ('manualne', 'jazda', 'servis')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE km_historia ENABLE ROW LEVEL SECURITY;

-- 8. vozidlo_hlasenia
CREATE TABLE IF NOT EXISTS vozidlo_hlasenia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  popis TEXT NOT NULL,
  priorita VARCHAR(20) DEFAULT 'normalna'
    CHECK (priorita IN ('nizka', 'normalna', 'vysoka', 'kriticka')),
  stav VARCHAR(20) DEFAULT 'nove'
    CHECK (stav IN ('nove', 'prebieha', 'vyriesene')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vozidlo_hlasenia ENABLE ROW LEVEL SECURITY;

-- 9. notifikacie_log
CREATE TABLE IF NOT EXISTS notifikacie_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ VARCHAR(50) NOT NULL,
  vozidlo_id UUID REFERENCES vozidla(id),
  adresat_email VARCHAR(255) NOT NULL,
  predmet VARCHAR(255) NOT NULL,
  odoslane_at TIMESTAMPTZ DEFAULT now(),
  stav VARCHAR(20) DEFAULT 'odoslane'
);

ALTER TABLE notifikacie_log ENABLE ROW LEVEL SECURITY;

-- 10. Helper function: is_fleet_manager
CREATE OR REPLACE FUNCTION is_fleet_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'fleet_manager'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. Helper function: is_fleet_or_admin
CREATE OR REPLACE FUNCTION is_fleet_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('fleet_manager', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 12. Helper: get user's assigned vehicle
CREATE OR REPLACE FUNCTION my_vozidlo_id()
RETURNS UUID AS $$
  SELECT v.id FROM vozidla v
  WHERE v.priradeny_vodic_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 13. RLS Policies

-- vozidlo_dokumenty
CREATE POLICY "fleet_or_admin_all_docs" ON vozidlo_dokumenty
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_docs" ON vozidlo_dokumenty
  FOR SELECT USING (vozidlo_id = my_vozidlo_id());

-- vozidlo_servisy
CREATE POLICY "fleet_or_admin_all_servisy" ON vozidlo_servisy
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_servisy" ON vozidlo_servisy
  FOR SELECT USING (vozidlo_id = my_vozidlo_id());

-- servis_prilohy
CREATE POLICY "fleet_or_admin_all_prilohy" ON servis_prilohy
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_prilohy" ON servis_prilohy
  FOR SELECT USING (
    servis_id IN (SELECT id FROM vozidlo_servisy WHERE vozidlo_id = my_vozidlo_id())
  );

-- vozidlo_kontroly
CREATE POLICY "fleet_or_admin_all_kontroly" ON vozidlo_kontroly
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_kontroly" ON vozidlo_kontroly
  FOR SELECT USING (vozidlo_id = my_vozidlo_id());

-- km_historia
CREATE POLICY "fleet_or_admin_all_km" ON km_historia
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_km" ON km_historia
  FOR SELECT USING (vozidlo_id = my_vozidlo_id());

-- vozidlo_hlasenia
CREATE POLICY "fleet_or_admin_all_hlasenia" ON vozidlo_hlasenia
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "user_insert_own_hlasenie" ON vozidlo_hlasenia
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_view_own_hlasenia" ON vozidlo_hlasenia
  FOR SELECT USING (user_id = auth.uid());

-- notifikacie_log
CREATE POLICY "fleet_or_admin_all_notif" ON notifikacie_log
  FOR ALL USING (is_fleet_or_admin());

-- Update existing vozidla policies to include fleet_manager
DROP POLICY IF EXISTS "Admin can insert vozidla" ON vozidla;
DROP POLICY IF EXISTS "Admin can update vozidla" ON vozidla;
DROP POLICY IF EXISTS "Admin can delete vozidla" ON vozidla;

CREATE POLICY "Fleet or admin can insert vozidla" ON vozidla
  FOR INSERT WITH CHECK (is_fleet_or_admin());
CREATE POLICY "Fleet or admin can update vozidla" ON vozidla
  FOR UPDATE USING (is_fleet_or_admin());
CREATE POLICY "Fleet or admin can delete vozidla" ON vozidla
  FOR DELETE USING (is_fleet_or_admin());

-- 14. Storage bucket for fleet documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-documents', 'fleet-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload fleet docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fleet-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view fleet docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'fleet-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Fleet or admin can delete fleet docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'fleet-documents' AND is_fleet_or_admin());
