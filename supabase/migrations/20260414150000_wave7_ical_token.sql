-- Wave 7: iCal token per zamestnanec — pre Outlook/Office365 calendar sync
-- Dátum: 2026-04-14

BEGIN;

-- Verejný, ale nepredvídateľný token pre subscribe URL
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ical_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Ak mali existujúci userovia NULL, vygenerujeme teraz
UPDATE profiles SET ical_token = gen_random_uuid() WHERE ical_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_ical_token ON profiles(ical_token);

COMMIT;
