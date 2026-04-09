-- Archivácia dokumentov schema

CREATE TABLE IF NOT EXISTS dokumenty_archiv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazov VARCHAR(255) NOT NULL,
  typ VARCHAR(30) NOT NULL CHECK (typ IN ('faktura', 'zmluva', 'objednavka', 'dodaci_list', 'ine')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  popis TEXT,
  tagy TEXT[],
  oddelenie VARCHAR(100),
  nahral_id UUID NOT NULL REFERENCES profiles(id),
  stav VARCHAR(30) NOT NULL DEFAULT 'nahrany' CHECK (stav IN (
    'nahrany', 'caka_na_schvalenie', 'schvaleny', 'na_uhradu', 'uhradeny', 'zamietnuty'
  )),
  schvalovatel_id UUID REFERENCES profiles(id),
  schvalene_at TIMESTAMPTZ,
  suma DECIMAL(12,2),
  datum_splatnosti DATE,
  dodavatel VARCHAR(255),
  cislo_faktury VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dokumenty_archiv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_archiv" ON dokumenty_archiv
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'it_admin'))
  );
