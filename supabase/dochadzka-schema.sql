-- Dochádzka schema
-- Run in Supabase SQL Editor

-- Profiles rozšírenie
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nadriadeny_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pracovny_fond_hodiny DECIMAL(3,1) DEFAULT 8.5;

-- Rozšírenie role enum
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('zamestnanec', 'admin', 'fleet_manager', 'it_admin', 'tablet'));

-- Dochádzka záznamy
CREATE TABLE IF NOT EXISTS dochadzka (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum DATE NOT NULL,
  smer VARCHAR(10) NOT NULL CHECK (smer IN ('prichod', 'odchod')),
  dovod VARCHAR(30) NOT NULL CHECK (dovod IN (
    'praca', 'obed', 'lekar', 'lekar_doprovod',
    'sluzobne', 'sluzobna_cesta', 'prechod',
    'fajcenie', 'sukromne', 'dovolenka'
  )),
  cas TIMESTAMPTZ NOT NULL DEFAULT now(),
  zdroj VARCHAR(10) NOT NULL DEFAULT 'pin' CHECK (zdroj IN ('pin', 'rfid', 'manual', 'system')),
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dochadzka ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_dochadzka" ON dochadzka
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_dochadzka" ON dochadzka
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
CREATE POLICY "tablet_insert_dochadzka" ON dochadzka
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tablet')
  );
CREATE POLICY "tablet_select_dochadzka" ON dochadzka
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tablet')
  );

-- RFID karty
CREATE TABLE IF NOT EXISTS rfid_karty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  kod_karty VARCHAR(100) NOT NULL UNIQUE,
  aktivna BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rfid_karty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_rfid" ON rfid_karty
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
CREATE POLICY "tablet_select_rfid" ON rfid_karty
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tablet')
  );

-- Dovolenky
CREATE TABLE IF NOT EXISTS dovolenky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum_od DATE NOT NULL,
  datum_do DATE NOT NULL,
  typ VARCHAR(20) NOT NULL DEFAULT 'dovolenka' CHECK (typ IN (
    'dovolenka', 'sick_leave', 'nahradne_volno', 'neplatene_volno'
  )),
  poznamka TEXT,
  stav VARCHAR(20) NOT NULL DEFAULT 'caka_na_schvalenie' CHECK (stav IN (
    'caka_na_schvalenie', 'schvalena', 'zamietnuta'
  )),
  schvalovatel_id UUID REFERENCES profiles(id),
  schvalene_at TIMESTAMPTZ,
  dovod_zamietnutia TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dovolenky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_dovolenky" ON dovolenky
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_dovolenky" ON dovolenky
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "schvalovatel_manage_dovolenky" ON dovolenky
  FOR ALL USING (schvalovatel_id = auth.uid());
CREATE POLICY "admin_all_dovolenky" ON dovolenky
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );

-- Dovolenky nároky
CREATE TABLE IF NOT EXISTS dovolenky_naroky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  rok INTEGER NOT NULL,
  narok_dni INTEGER NOT NULL DEFAULT 20,
  prenesene_dni INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, rok)
);

ALTER TABLE dovolenky_naroky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_naroky" ON dovolenky_naroky
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_naroky" ON dovolenky_naroky
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
