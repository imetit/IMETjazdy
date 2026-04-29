-- ==============================================================
-- IMET Dochádzka — modul pre mzdárky
-- Dátum: 2026-04-29
-- ==============================================================
BEGIN;

-- 1. Rozšírenie dochadzka
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS auto_doplnene BOOLEAN DEFAULT FALSE;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS korekcia_dovod TEXT;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS povodny_cas TIMESTAMPTZ;
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS upravil_id UUID REFERENCES profiles(id);
ALTER TABLE dochadzka ADD COLUMN IF NOT EXISTS upravene_at TIMESTAMPTZ;

ALTER TABLE dochadzka DROP CONSTRAINT IF EXISTS dochadzka_zdroj_check;
ALTER TABLE dochadzka ADD CONSTRAINT dochadzka_zdroj_check
  CHECK (zdroj IN ('pin', 'rfid', 'manual', 'system', 'auto'));

CREATE INDEX IF NOT EXISTS idx_dochadzka_user_datum ON dochadzka(user_id, datum);
CREATE INDEX IF NOT EXISTS idx_dochadzka_auto ON dochadzka(auto_doplnene) WHERE auto_doplnene = TRUE;

-- 2. dochadzka_uzavierka
CREATE TABLE IF NOT EXISTS dochadzka_uzavierka (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID NOT NULL REFERENCES firmy(id) ON DELETE CASCADE,
  mesiac VARCHAR(7) NOT NULL,
  stav VARCHAR(20) NOT NULL DEFAULT 'otvoreny'
    CHECK (stav IN ('otvoreny', 'na_kontrolu', 'uzavrety')),
  na_kontrolu_at TIMESTAMPTZ,
  na_kontrolu_by UUID REFERENCES profiles(id),
  uzavrety_at TIMESTAMPTZ,
  uzavrety_by UUID REFERENCES profiles(id),
  prelomenie_dovod TEXT,
  prelomil_id UUID REFERENCES profiles(id),
  prelomil_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firma_id, mesiac)
);
CREATE INDEX IF NOT EXISTS idx_uzavierka_firma_mesiac ON dochadzka_uzavierka(firma_id, mesiac);

ALTER TABLE dochadzka_uzavierka ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uzavierka_admin_all" ON dochadzka_uzavierka;
CREATE POLICY "uzavierka_admin_all" ON dochadzka_uzavierka FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
DROP POLICY IF EXISTS "uzavierka_select_own_firma" ON dochadzka_uzavierka;
CREATE POLICY "uzavierka_select_own_firma" ON dochadzka_uzavierka FOR SELECT USING (
  firma_id IN (SELECT firma_id FROM profiles WHERE id = auth.uid())
);

-- 3. dochadzka_schvalene_hodiny
CREATE TABLE IF NOT EXISTS dochadzka_schvalene_hodiny (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mesiac VARCHAR(7) NOT NULL,
  schvaleny_at TIMESTAMPTZ DEFAULT now(),
  schvaleny_by UUID NOT NULL REFERENCES profiles(id),
  poznamka TEXT,
  UNIQUE(user_id, mesiac)
);
CREATE INDEX IF NOT EXISTS idx_schvalene_user_mesiac ON dochadzka_schvalene_hodiny(user_id, mesiac);

ALTER TABLE dochadzka_schvalene_hodiny ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schvalene_admin_all" ON dochadzka_schvalene_hodiny;
CREATE POLICY "schvalene_admin_all" ON dochadzka_schvalene_hodiny FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
DROP POLICY IF EXISTS "schvalene_select_own" ON dochadzka_schvalene_hodiny;
CREATE POLICY "schvalene_select_own" ON dochadzka_schvalene_hodiny FOR SELECT USING (user_id = auth.uid());

-- 4. dochadzka_korekcia_ziadosti
CREATE TABLE IF NOT EXISTS dochadzka_korekcia_ziadosti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  povodny_zaznam_id UUID REFERENCES dochadzka(id) ON DELETE SET NULL,
  navrh_smer VARCHAR(10),
  navrh_dovod VARCHAR(30),
  navrh_cas TIMESTAMPTZ,
  poznamka_zamestnanec TEXT NOT NULL,
  stav VARCHAR(20) NOT NULL DEFAULT 'caka_na_schvalenie'
    CHECK (stav IN ('caka_na_schvalenie', 'schvalena', 'zamietnuta')),
  vybavila_id UUID REFERENCES profiles(id),
  vybavila_at TIMESTAMPTZ,
  poznamka_mzdarka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ziadosti_stav ON dochadzka_korekcia_ziadosti(stav);
CREATE INDEX IF NOT EXISTS idx_ziadosti_user ON dochadzka_korekcia_ziadosti(user_id);

ALTER TABLE dochadzka_korekcia_ziadosti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ziadosti_admin_all" ON dochadzka_korekcia_ziadosti;
CREATE POLICY "ziadosti_admin_all" ON dochadzka_korekcia_ziadosti FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);
DROP POLICY IF EXISTS "ziadosti_own_select" ON dochadzka_korekcia_ziadosti;
CREATE POLICY "ziadosti_own_select" ON dochadzka_korekcia_ziadosti FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "ziadosti_own_insert" ON dochadzka_korekcia_ziadosti;
CREATE POLICY "ziadosti_own_insert" ON dochadzka_korekcia_ziadosti FOR INSERT WITH CHECK (user_id = auth.uid());

-- 5. dochadzka_history (verzionovanie)
CREATE TABLE IF NOT EXISTS dochadzka_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dochadzka_id UUID NOT NULL,
  zmena_typ VARCHAR(20) NOT NULL CHECK (zmena_typ IN ('insert', 'update', 'delete')),
  povodne_data JSONB,
  nove_data JSONB,
  zmenil_id UUID REFERENCES profiles(id),
  zmenil_at TIMESTAMPTZ DEFAULT now(),
  dovod TEXT
);
CREATE INDEX IF NOT EXISTS idx_history_dochadzka ON dochadzka_history(dochadzka_id);

ALTER TABLE dochadzka_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "history_admin_select" ON dochadzka_history;
CREATE POLICY "history_admin_select" ON dochadzka_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin', 'fin_manager'))
);

-- 6. profiles rozšírenia
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pristupne_firmy UUID[] DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_pip_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fond_per_den JSONB;

-- 7. Trigger pre dochadzka_history
CREATE OR REPLACE FUNCTION dochadzka_history_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, nove_data, zmenil_id, dovod)
    VALUES (NEW.id, 'insert', to_jsonb(NEW), NEW.upravil_id, NEW.korekcia_dovod);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, povodne_data, nove_data, zmenil_id, dovod)
    VALUES (NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.upravil_id, NEW.korekcia_dovod);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO dochadzka_history (dochadzka_id, zmena_typ, povodne_data, zmenil_id)
    VALUES (OLD.id, 'delete', to_jsonb(OLD), OLD.upravil_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dochadzka_history_t ON dochadzka;
CREATE TRIGGER dochadzka_history_t
  AFTER INSERT OR UPDATE OR DELETE ON dochadzka
  FOR EACH ROW EXECUTE FUNCTION dochadzka_history_trigger();

-- 8. Notifikácie typy (info-only, nemení schemu)
-- 'dochadzka_auto_pip', 'dochadzka_korekcia', 'dochadzka_schvalene', 'dochadzka_uzavierka_pripravena', 'dochadzka_ziadost'

COMMIT;
