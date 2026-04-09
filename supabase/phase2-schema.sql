-- Phase 2: Zamestnanecká karta schema
-- Run in Supabase SQL Editor

-- IT vybavenie
CREATE TABLE IF NOT EXISTS zamestnanec_majetok (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  typ VARCHAR(30) NOT NULL CHECK (typ IN ('pc', 'monitor', 'telefon', 'tablet', 'prislusenstvo', 'ine')),
  nazov VARCHAR(255) NOT NULL,
  seriove_cislo VARCHAR(100),
  obstaravacia_cena DECIMAL(12,2),
  datum_pridelenia DATE,
  stav VARCHAR(20) NOT NULL DEFAULT 'pridelene' CHECK (stav IN ('pridelene', 'vratene', 'vyradene')),
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE zamestnanec_majetok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_majetok" ON zamestnanec_majetok
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_majetok" ON zamestnanec_majetok
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );

-- Softvéry a licencie
CREATE TABLE IF NOT EXISTS zamestnanec_licencie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  nazov VARCHAR(255) NOT NULL,
  typ VARCHAR(50),
  kluc VARCHAR(255),
  platnost_od DATE,
  platnost_do DATE,
  cena DECIMAL(10,2),
  poznamka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE zamestnanec_licencie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_licencie" ON zamestnanec_licencie
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_licencie" ON zamestnanec_licencie
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
