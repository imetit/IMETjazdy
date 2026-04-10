-- ============================================================
-- IMET System Hardening Migration
-- Phase 2: Indexes, FK cascade, missing columns, constraints
-- Run this on Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. INDEXES - Performance critical for 200+ employees
-- ============================================================

-- Jazdy
CREATE INDEX IF NOT EXISTS idx_jazdy_user_stav ON jazdy(user_id, stav);
CREATE INDEX IF NOT EXISTS idx_jazdy_vozidlo ON jazdy(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_jazdy_mesiac ON jazdy(mesiac);

-- Dochádzka
CREATE INDEX IF NOT EXISTS idx_dochadzka_user_datum ON dochadzka(user_id, datum);
CREATE INDEX IF NOT EXISTS idx_dochadzka_datum ON dochadzka(datum);

-- Dovolenky
CREATE INDEX IF NOT EXISTS idx_dovolenky_user_stav ON dovolenky(user_id, stav);
CREATE INDEX IF NOT EXISTS idx_dovolenky_schvalovatel ON dovolenky(schvalovatel_id, stav);

-- RFID
CREATE INDEX IF NOT EXISTS idx_rfid_kod ON rfid_karty(kod_karty);

-- Služobné cesty
CREATE INDEX IF NOT EXISTS idx_sluzobne_cesty_user ON sluzobne_cesty(user_id, stav);
CREATE INDEX IF NOT EXISTS idx_sluzobne_cesty_schvalovatel ON sluzobne_cesty(schvalovatel_id, stav);

-- Notifikácie
CREATE INDEX IF NOT EXISTS idx_notifikacie_user_precitane ON notifikacie(user_id, precitane);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabulka ON audit_log(tabulka, created_at DESC);

-- User moduly
CREATE INDEX IF NOT EXISTS idx_user_moduly_user ON user_moduly(user_id);

-- Fleet
CREATE INDEX IF NOT EXISTS idx_vozidlo_servisy_vozidlo ON vozidlo_servisy(vozidlo_id, datum);
CREATE INDEX IF NOT EXISTS idx_vozidlo_kontroly_vozidlo ON vozidlo_kontroly(vozidlo_id);
CREATE INDEX IF NOT EXISTS idx_vozidlo_kontroly_platnost ON vozidlo_kontroly(platnost_do);
CREATE INDEX IF NOT EXISTS idx_vozidlo_hlasenia_stav ON vozidlo_hlasenia(stav);
CREATE INDEX IF NOT EXISTS idx_km_historia_vozidlo ON km_historia(vozidlo_id, datum);

-- Archív
CREATE INDEX IF NOT EXISTS idx_archiv_nahral ON dokumenty_archiv(nahral_id);
CREATE INDEX IF NOT EXISTS idx_archiv_stav ON dokumenty_archiv(stav);

-- Zamestnanecký majetok/licencie
CREATE INDEX IF NOT EXISTS idx_majetok_user ON zamestnanec_majetok(user_id);
CREATE INDEX IF NOT EXISTS idx_licencie_user ON zamestnanec_licencie(user_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_nadriadeny ON profiles(nadriadeny_id);
CREATE INDEX IF NOT EXISTS idx_profiles_vozidlo ON profiles(vozidlo_id);


-- ============================================================
-- 2. FK CASCADE - prevent orphan records on user deletion
-- ============================================================

-- Dochadzka
ALTER TABLE dochadzka DROP CONSTRAINT IF EXISTS dochadzka_user_id_fkey;
ALTER TABLE dochadzka ADD CONSTRAINT dochadzka_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Dovolenky
ALTER TABLE dovolenky DROP CONSTRAINT IF EXISTS dovolenky_user_id_fkey;
ALTER TABLE dovolenky ADD CONSTRAINT dovolenky_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE dovolenky DROP CONSTRAINT IF EXISTS dovolenky_schvalovatel_id_fkey;
ALTER TABLE dovolenky ADD CONSTRAINT dovolenky_schvalovatel_id_fkey
  FOREIGN KEY (schvalovatel_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Dovolenky nároky
ALTER TABLE dovolenky_naroky DROP CONSTRAINT IF EXISTS dovolenky_naroky_user_id_fkey;
ALTER TABLE dovolenky_naroky ADD CONSTRAINT dovolenky_naroky_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- RFID karty
ALTER TABLE rfid_karty DROP CONSTRAINT IF EXISTS rfid_karty_user_id_fkey;
ALTER TABLE rfid_karty ADD CONSTRAINT rfid_karty_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Služobné cesty
ALTER TABLE sluzobne_cesty DROP CONSTRAINT IF EXISTS sluzobne_cesty_user_id_fkey;
ALTER TABLE sluzobne_cesty ADD CONSTRAINT sluzobne_cesty_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE sluzobne_cesty DROP CONSTRAINT IF EXISTS sluzobne_cesty_schvalovatel_id_fkey;
ALTER TABLE sluzobne_cesty ADD CONSTRAINT sluzobne_cesty_schvalovatel_id_fkey
  FOREIGN KEY (schvalovatel_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Zamestnanecký majetok
ALTER TABLE zamestnanec_majetok DROP CONSTRAINT IF EXISTS zamestnanec_majetok_user_id_fkey;
ALTER TABLE zamestnanec_majetok ADD CONSTRAINT zamestnanec_majetok_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Zamestnanecké licencie
ALTER TABLE zamestnanec_licencie DROP CONSTRAINT IF EXISTS zamestnanec_licencie_user_id_fkey;
ALTER TABLE zamestnanec_licencie ADD CONSTRAINT zamestnanec_licencie_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Archív dokumentov
ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_nahral_id_fkey;
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_nahral_id_fkey
  FOREIGN KEY (nahral_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_schvalovatel_id_fkey;
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_schvalovatel_id_fkey
  FOREIGN KEY (schvalovatel_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Vozidlo hlásenia
ALTER TABLE vozidlo_hlasenia DROP CONSTRAINT IF EXISTS vozidlo_hlasenia_user_id_fkey;
ALTER TABLE vozidlo_hlasenia ADD CONSTRAINT vozidlo_hlasenia_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Poistné udalosti
ALTER TABLE poistne_udalosti DROP CONSTRAINT IF EXISTS poistne_udalosti_user_id_fkey;
ALTER TABLE poistne_udalosti ADD CONSTRAINT poistne_udalosti_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;


-- ============================================================
-- 3. MISSING COLUMNS
-- ============================================================

-- Skutočná spotreba a cena PHM (referenced in types but may not be in DB)
ALTER TABLE jazdy ADD COLUMN IF NOT EXISTS skutocna_spotreba_litrov DECIMAL(10,3);
ALTER TABLE jazdy ADD COLUMN IF NOT EXISTS skutocna_cena_phm DECIMAL(10,2);


-- ============================================================
-- 4. CHECK CONSTRAINTS
-- ============================================================

-- Dátumové rozsahy
ALTER TABLE dovolenky DROP CONSTRAINT IF EXISTS chk_dovolenky_datumy;
ALTER TABLE dovolenky ADD CONSTRAINT chk_dovolenky_datumy CHECK (datum_do >= datum_od);

ALTER TABLE sluzobne_cesty DROP CONSTRAINT IF EXISTS chk_cesty_datumy;
ALTER TABLE sluzobne_cesty ADD CONSTRAINT chk_cesty_datumy CHECK (datum_do >= datum_od);

-- KM musí byť kladné
ALTER TABLE jazdy DROP CONSTRAINT IF EXISTS chk_jazdy_km;
ALTER TABLE jazdy ADD CONSTRAINT chk_jazdy_km CHECK (km > 0);


-- ============================================================
-- 5. DOCHADZKA - add 'system' to zdroj check if not present
-- ============================================================

-- Allow 'system' as zdroj (for auto-generated records from leave/trips)
ALTER TABLE dochadzka DROP CONSTRAINT IF EXISTS dochadzka_zdroj_check;
ALTER TABLE dochadzka ADD CONSTRAINT dochadzka_zdroj_check
  CHECK (zdroj IN ('rfid', 'pin', 'manual', 'system'));
