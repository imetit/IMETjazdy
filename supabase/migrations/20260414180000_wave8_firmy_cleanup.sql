-- Wave 8 cleanup: upraviť zoznam firiem podľa finálneho rozhodnutia
-- Dátum: 2026-04-14
--
-- Odstrániť: SQUASH (staré, neexistuje), AKE_ZVOLEN (neexistuje),
--            IMET_HOTEL (placeholder už nie je potrebný — admin manuálne),
--            IMET_KE (Košice = IMET-TEC Košice, nie samostatná firma)
-- Pridať:    IMET_TEC_KE (Košická pobočka IMET-TEC)

BEGIN;

-- profiles.firma_id má ON DELETE SET NULL, takže delete je bezpečný
-- (nikto v týchto firmách zatiaľ reálne nie je priradený)
DELETE FROM firmy WHERE kod IN ('SQUASH', 'AKE_ZVOLEN', 'IMET_HOTEL', 'IMET_KE');

INSERT INTO firmy (kod, nazov, mesto, krajina, mena, je_matka, moduly_default, poradie, aktivna) VALUES
  ('IMET_TEC_KE',
    'IMET-TEC Košice',
    'Košice', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    3, true)
ON CONFLICT (kod) DO NOTHING;

-- Renumber poradia
UPDATE firmy SET poradie = 1 WHERE kod = 'IMET';
UPDATE firmy SET poradie = 2 WHERE kod = 'IMET_TEC';
UPDATE firmy SET poradie = 3 WHERE kod = 'IMET_TEC_KE';
UPDATE firmy SET poradie = 4 WHERE kod = 'AKE_BA';
UPDATE firmy SET poradie = 5 WHERE kod = 'AKE_SKALICA';
UPDATE firmy SET poradie = 6 WHERE kod = 'IMET_CZ';
UPDATE firmy SET poradie = 7 WHERE kod = 'IMET_ZA';

COMMIT;
