-- Permissions systém
-- Každý zamestnanec má pozíciu a individuálne oprávnenia na moduly
-- it_admin (superadmin) vidí všetko a spravuje oprávnenia

-- Pozícia zamestnanca (textové pole)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pozicia VARCHAR(100);

-- Oprávnenia na moduly per user
CREATE TABLE IF NOT EXISTS user_moduly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  modul VARCHAR(50) NOT NULL,
  pristup VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (pristup IN ('view', 'edit', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, modul)
);

ALTER TABLE user_moduly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_moduly" ON user_moduly
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_all_moduly" ON user_moduly
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'it_admin')
  );

-- Audit log pre citlivé operácie
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  akcia VARCHAR(50) NOT NULL,
  tabulka VARCHAR(100),
  zaznam_id UUID,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_audit" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'it_admin')
  );
CREATE POLICY "all_insert_audit" ON audit_log
  FOR INSERT WITH CHECK (true);

-- In-app notifikácie
CREATE TABLE IF NOT EXISTS notifikacie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  typ VARCHAR(50) NOT NULL,
  nadpis VARCHAR(255) NOT NULL,
  sprava TEXT,
  precitane BOOLEAN NOT NULL DEFAULT false,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifikacie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_notifikacie" ON notifikacie
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_update_own_notifikacie" ON notifikacie
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "all_insert_notifikacie" ON notifikacie
  FOR INSERT WITH CHECK (true);

-- Predefinované moduly ktoré existujú v systéme:
-- 'jazdy' - Kniha jázd
-- 'vozovy_park' - Vozový park / Fleet
-- 'zamestnanecka_karta' - Zamestnanecká karta
-- 'dochadzka' - Dochádzka
-- 'dovolenky' - Dovolenky
-- 'sluzobne_cesty' - Služobné cesty
-- 'archiv' - Archív dokumentov
-- 'admin_zamestnanci' - Správa zamestnancov
-- 'admin_nastavenia' - Nastavenia systému
