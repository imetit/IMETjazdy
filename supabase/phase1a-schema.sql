-- Phase 1A Schema Changes

-- Vozidla: purchase price + leasing end
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS obstaravacia_cena DECIMAL(12,2);
ALTER TABLE vozidla ADD COLUMN IF NOT EXISTS leasing_koniec DATE;

-- Dialnicne znamky
CREATE TABLE IF NOT EXISTS dialnicne_znamky (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id) ON DELETE CASCADE,
  krajina VARCHAR(50) NOT NULL,
  platnost_od DATE NOT NULL,
  platnost_do DATE NOT NULL,
  cislo VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dialnicne_znamky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_or_admin_all_znamky" ON dialnicne_znamky
  FOR ALL USING (is_fleet_or_admin());
CREATE POLICY "driver_view_own_znamky" ON dialnicne_znamky
  FOR SELECT USING (vozidlo_id = my_vozidlo_id());

-- Extend vozidlo_dokumenty typ check for new types
ALTER TABLE vozidlo_dokumenty DROP CONSTRAINT IF EXISTS vozidlo_dokumenty_typ_check;
ALTER TABLE vozidlo_dokumenty ADD CONSTRAINT vozidlo_dokumenty_typ_check
  CHECK (typ IN ('technicky_preukaz', 'pzp', 'havarijne', 'leasing', 'ine', 'pzp_dokument', 'asistencna_karta'));
