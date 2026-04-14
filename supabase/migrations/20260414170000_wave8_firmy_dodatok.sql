-- Wave 8 dodatok: objavené firmy v exporte starej dochádzky
-- Dátum: 2026-04-14
--
-- Na základe analýzy exportu:
-- - SQUASH Sports Production (squash centrum + reštaurácia?) — 8+ ľudí
-- - AKE Zvolen — historická pobočka (iba 1 ex-zamestnanec)
-- - HOTEL / reštaurácia — ~50 ľudí v neprefixovaných oddeleniach (Čašníci,
--   Kuchári, RECEPCIA, Chyžné, F&B manageri, Upratovačky, Udržbári).
--   Čaká na potvrdenie či je to samostatná firma alebo pod IMET/SQUASH.
--   Nateraz pridávame ako IMET_HOTEL placeholder — po potvrdení premenovať.

BEGIN;

INSERT INTO firmy (kod, nazov, mesto, krajina, mena, je_matka, moduly_default, poradie, aktivna) VALUES
  ('SQUASH',
    'SQUASH Sports Production',
    'Bratislava', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    8, true),
  ('AKE_ZVOLEN',
    'AKE Zvolen (historická)',
    'Zvolen', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    9, false),
  ('IMET_HOTEL',
    'IMET Hotel / Reštaurácia (placeholder)',
    'Bratislava', 'SK', 'EUR', false,
    '["dochadzka","dovolenky"]'::jsonb,
    10, true)
ON CONFLICT (kod) DO NOTHING;

COMMIT;
