-- IMET Kniha Jázd - Database Schema
-- Run this in Supabase SQL Editor

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'zamestnanec' CHECK (role IN ('zamestnanec', 'admin')),
  vozidlo_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vozidla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  znacka TEXT NOT NULL,
  variant TEXT DEFAULT '',
  spz TEXT NOT NULL,
  druh TEXT NOT NULL DEFAULT 'osobne' CHECK (druh IN ('osobne', 'nakladne')),
  palivo TEXT NOT NULL DEFAULT 'diesel' CHECK (palivo IN ('diesel', 'premium_diesel', 'benzin_e10', 'benzin_e5', 'lpg', 'elektro')),
  spotreba_tp DECIMAL NOT NULL CHECK (spotreba_tp > 0),
  objem_motora INTEGER DEFAULT 0,
  aktivne BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD CONSTRAINT fk_profiles_vozidlo FOREIGN KEY (vozidlo_id) REFERENCES vozidla(id) ON DELETE SET NULL;

CREATE TABLE paliva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diesel DECIMAL DEFAULT 0,
  premium_diesel DECIMAL DEFAULT 0,
  benzin_e10 DECIMAL DEFAULT 0,
  benzin_e5 DECIMAL DEFAULT 0,
  lpg DECIMAL DEFAULT 0,
  elektro DECIMAL DEFAULT 0,
  aktualizovane TIMESTAMPTZ
);

INSERT INTO paliva (diesel, premium_diesel, benzin_e10, benzin_e5, lpg, elektro)
VALUES (0, 0, 0, 0, 0, 0);

CREATE TABLE jazdy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cislo_dokladu TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id),
  typ TEXT CHECK (typ IN ('firemne_doma', 'firemne_zahranicie', 'sukromne_doma', 'sukromne_zahranicie')),
  mesiac TEXT NOT NULL,
  odchod_z TEXT NOT NULL,
  prichod_do TEXT NOT NULL,
  cez TEXT,
  km DECIMAL NOT NULL CHECK (km > 0),
  vozidlo_id UUID NOT NULL REFERENCES vozidla(id),
  cas_odchodu TEXT NOT NULL,
  cas_prichodu TEXT NOT NULL,
  stav TEXT NOT NULL DEFAULT 'rozpracovana' CHECK (stav IN ('rozpracovana', 'odoslana', 'spracovana')),
  spotreba_pouzita DECIMAL,
  palivo_typ TEXT,
  cena_za_liter DECIMAL,
  sadzba_za_km DECIMAL,
  stravne DECIMAL,
  vreckove DECIMAL,
  naklady_phm DECIMAL,
  naklady_celkom DECIMAL,
  komentar TEXT,
  spracovane_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jazdy_prilohy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jazda_id UUID NOT NULL REFERENCES jazdy(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT '',
  last_doc_number INTEGER DEFAULT 0,
  sadzba_sukromne_auto DECIMAL DEFAULT 0.25,
  stravne_doma_do5h DECIMAL DEFAULT 0,
  stravne_doma_5do12h DECIMAL DEFAULT 4.00,
  stravne_doma_12do18h DECIMAL DEFAULT 6.00,
  stravne_doma_nad18h DECIMAL DEFAULT 9.30,
  stravne_zahr_do6h DECIMAL DEFAULT 0,
  stravne_zahr_6do12h DECIMAL DEFAULT 9.00,
  stravne_zahr_nad12h DECIMAL DEFAULT 18.00,
  vreckove_percento DECIMAL DEFAULT 10,
  dph_phm DECIMAL DEFAULT 23,
  dph_ubytovanie DECIMAL DEFAULT 6
);

INSERT INTO settings (company_name) VALUES ('');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'zamestnanec')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at on jazdy
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jazdy_updated_at
  BEFORE UPDATE ON jazdy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vozidla ENABLE ROW LEVEL SECURITY;
ALTER TABLE paliva ENABLE ROW LEVEL SECURITY;
ALTER TABLE jazdy ENABLE ROW LEVEL SECURITY;
ALTER TABLE jazdy_prilohy ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "Users see own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin sees all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admin updates profiles" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin inserts profiles" ON profiles FOR INSERT WITH CHECK (is_admin());

-- VOZIDLA
CREATE POLICY "Everyone reads vozidla" ON vozidla FOR SELECT USING (true);
CREATE POLICY "Admin manages vozidla" ON vozidla FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin updates vozidla" ON vozidla FOR UPDATE USING (is_admin());
CREATE POLICY "Admin deletes vozidla" ON vozidla FOR DELETE USING (is_admin());

-- PALIVA
CREATE POLICY "Everyone reads paliva" ON paliva FOR SELECT USING (true);
CREATE POLICY "Admin updates paliva" ON paliva FOR UPDATE USING (is_admin());

-- JAZDY
CREATE POLICY "Employee sees own jazdy" ON jazdy FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin sees all jazdy" ON jazdy FOR SELECT USING (is_admin());
CREATE POLICY "Employee creates own jazdy" ON jazdy FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employee updates own draft jazdy" ON jazdy FOR UPDATE USING (user_id = auth.uid() AND stav = 'rozpracovana');
CREATE POLICY "Admin updates any jazdy" ON jazdy FOR UPDATE USING (is_admin());
CREATE POLICY "Employee deletes own draft jazdy" ON jazdy FOR DELETE USING (user_id = auth.uid() AND stav = 'rozpracovana');

-- JAZDY_PRILOHY
CREATE POLICY "Employee sees own prilohy" ON jazdy_prilohy FOR SELECT USING (
  EXISTS (SELECT 1 FROM jazdy WHERE jazdy.id = jazda_id AND jazdy.user_id = auth.uid())
);
CREATE POLICY "Admin sees all prilohy" ON jazdy_prilohy FOR SELECT USING (is_admin());
CREATE POLICY "Employee uploads to own jazda" ON jazdy_prilohy FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM jazdy WHERE jazdy.id = jazda_id AND jazdy.user_id = auth.uid())
);
CREATE POLICY "Employee deletes own draft prilohy" ON jazdy_prilohy FOR DELETE USING (
  EXISTS (SELECT 1 FROM jazdy WHERE jazdy.id = jazda_id AND jazdy.user_id = auth.uid() AND jazdy.stav = 'rozpracovana')
);
CREATE POLICY "Admin deletes any prilohy" ON jazdy_prilohy FOR DELETE USING (is_admin());

-- SETTINGS
CREATE POLICY "Everyone reads settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin updates settings" ON settings FOR UPDATE USING (is_admin());

-- STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('blocky', 'blocky', false);

CREATE POLICY "Authenticated users upload blocky" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blocky' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users read blocky" ON storage.objects FOR SELECT
  USING (bucket_id = 'blocky' AND auth.uid() IS NOT NULL);
