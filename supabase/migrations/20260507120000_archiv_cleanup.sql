-- =====================================================================
-- Archív dokumentov cleanup po refactore faktúr (2026-05-07)
-- Faktúry teraz sídlia v samostatnej tabuľke `faktury`.
-- Z dokumenty_archiv sa odstraňujú faktúrne polia + obmedzí typ enum.
-- =====================================================================

-- 1. Skontroluj že žiadne dokumenty_archiv typ='faktura' už neexistujú
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM dokumenty_archiv WHERE typ = 'faktura';
  IF cnt > 0 THEN
    RAISE NOTICE 'Pozor: % faktúr ešte v dokumenty_archiv. Spusti scripts/migrate-faktury-data.mjs pred touto migráciou.', cnt;
    -- Soft delete: označ ich ako 'ine' aby sa to neblokovalo, ale upozorni
    UPDATE dokumenty_archiv SET typ = 'ine' WHERE typ = 'faktura';
  END IF;
END $$;

-- 2. Backup tabuľka pre prípad rollbacku
CREATE TABLE IF NOT EXISTS dokumenty_archiv_pre_cleanup_20260507 AS
  SELECT * FROM dokumenty_archiv;

-- 3. Drop search_vector (depends on column to be removed) + faktúrnych polí
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS search_vector;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS suma;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS dodavatel;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS cislo_faktury;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS datum_splatnosti;

-- Re-create search_vector ako simple GENERATED column (bez faktúrnych polí)
ALTER TABLE dokumenty_archiv ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(nazov, '') || ' ' ||
      coalesce(popis, '') || ' ' ||
      coalesce(typ, '')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_dokumenty_archiv_search ON dokumenty_archiv USING gin(search_vector);

-- 4. Aktualizuj typ enum check (bez 'faktura')
ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_typ_check;
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_typ_check
  CHECK (typ IN ('zmluva', 'objednavka', 'dodaci_list', 'ine'));

-- 5. Aktualizuj stav enum (bez 'na_uhradu' a 'uhradeny' — to bola len pre faktúry)
ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_stav_check;
-- Najprv migrate akúkoľvek existujúcu 'na_uhradu' alebo 'uhradeny' na 'schvaleny'
UPDATE dokumenty_archiv SET stav = 'schvaleny' WHERE stav IN ('na_uhradu', 'uhradeny');
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_stav_check
  CHECK (stav IN ('nahrany', 'caka_na_schvalenie', 'schvaleny', 'zamietnuty', 'nahradeny', 'expirujuci'));
