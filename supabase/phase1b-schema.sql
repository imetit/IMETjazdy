-- Phase 1B Schema Changes

-- 1. Poistné udalosti (insurance events)
CREATE TABLE IF NOT EXISTS poistne_udalosti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum DATE NOT NULL,
  cas TIME,
  miesto TEXT NOT NULL,
  popis TEXT NOT NULL,
  skoda_popis TEXT,
  policajna_sprava BOOLEAN DEFAULT false,
  svedkovia TEXT,
  stav VARCHAR(20) DEFAULT 'nahlasena' CHECK (stav IN ('nahlasena', 'riesena', 'uzavreta')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE poistne_udalosti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_or_admin_all_poistne" ON poistne_udalosti
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "user_insert_own_poistne" ON poistne_udalosti
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_view_own_poistne" ON poistne_udalosti
  FOR SELECT USING (user_id = auth.uid());

-- 2. História držiteľov vozidiel
CREATE TABLE IF NOT EXISTS vozidlo_historia_drzitelov (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum_od DATE NOT NULL,
  datum_do DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vozidlo_historia_drzitelov ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_or_admin_all_historia" ON vozidlo_historia_drzitelov
  FOR ALL USING (is_fleet_or_admin());

-- 3. Odovzdávacie protokoly
CREATE TABLE IF NOT EXISTS odovzdavacie_protokoly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id),
  odovzdavajuci_id UUID REFERENCES profiles(id),
  preberajuci_id UUID REFERENCES profiles(id),
  datum DATE NOT NULL,
  km_stav INTEGER,
  stav_vozidla TEXT,
  poskodenia TEXT,
  prislusenstvo TEXT,
  poznamky TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE odovzdavacie_protokoly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_or_admin_all_protokoly" ON odovzdavacie_protokoly
  FOR ALL USING (is_fleet_or_admin());

-- 4. Datum pridelenia na vozidla
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS datum_pridelenia DATE;
