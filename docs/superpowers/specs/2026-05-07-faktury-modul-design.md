# Faktúry modul — kompletný refactor archívu (Možnosť C)

**Dátum:** 2026-05-07
**Autor:** brainstorming session s Matúš Maťas
**Status:** Návrh — čaká na schválenie

## Cieľ

Oddeliť **schvaľovací workflow faktúr** od **archívu dokumentov**. Aktuálne sú obe v jednej tabuľke `dokumenty_archiv` čo robí logiku zmätenou. Po refaktore:

- **Modul Faktúry** — plná účtovná logika (state machine, schvaľovanie, úhrada, dobropisy, multi-currency)
- **Modul Archív dokumentov** — len úložisko + verzionovanie + expirácie pre nefakturačné dokumenty (zmluvy, BOZP, HR, interné)

## Pravidlá ktoré musí splniť (ironclad)

1. **Bez chyby** — state machine vynútený DB triggerom + server actions, nedá sa obísť
2. **Logická konzistencia** — auditné prepojenia na všetko (vozidlá, cesty, servisy, tankové karty, poistné udalosti, školenia)
3. **Intuitívne UI** — kontextové linky (otvoríš servis → "Pridať faktúru" pre-fill polí)
4. **Multi-currency** — historický kurz k EUR fixovaný pri schválení (security pole)
5. **Per-firma workflow** — každá firma má vlastné pravidlá schvaľovania (jsonb config)
6. **Audit log** — každá akcia zaznamenaná, vrátane diffu polí a IP
7. **RLS defense in depth** — ani priamym SQL prístupom user neuvidí faktúry firmy do ktorej nemá prístup

## Architektúra rozhodnutia

| # | Otázka | Vybrané | Dôvod |
|---|---|---|---|
| 1 | Schvaľovací flow | **D — per firma config** | Najflexibilnejšie pre 7 firiem s rôznou organizáciou |
| 2 | Edit po schválení | **C — hybrid** | Security polia → re-approval, metadata voľne, dobropis pre uhradenú |
| 3 | Mena | **B — multi-currency** | Reálne fakturujú aj v iných menách než EUR |
| 4 | Prepojenia | **B — plný integrovaný systém** | Audit & reporty per vozidlo/cesta/servis/poistka |

---

## 1. DB Schéma

### 1.1 Nová tabuľka `faktury`

```sql
CREATE TABLE faktury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifikácia
  cislo_faktury text NOT NULL,
  variabilny_symbol text,
  konstantny_symbol text,
  specificky_symbol text,
  je_dobropis boolean NOT NULL DEFAULT false,
  povodna_faktura_id uuid REFERENCES faktury(id) ON DELETE RESTRICT,

  -- Dodávateľ (snapshot + odkaz)
  dodavatel_id uuid REFERENCES dodavatelia(id) ON DELETE RESTRICT,
  dodavatel_nazov text NOT NULL,
  dodavatel_ico text,

  -- Suma + mena (multi-currency)
  mena text NOT NULL DEFAULT 'EUR',
  suma_bez_dph numeric(12,2),
  dph_sadzba numeric(5,2) NOT NULL DEFAULT 20,
  dph_suma numeric(12,2),
  suma_celkom numeric(12,2) NOT NULL CHECK (suma_celkom <> 0),
  -- Dobropis musí mať negatívnu sumu, bežná faktúra pozitívnu (audit chain pre saldo)
  CONSTRAINT chk_dobropis_negative CHECK (
    (je_dobropis = true AND suma_celkom < 0) OR
    (je_dobropis = false AND suma_celkom > 0)
  ),
  -- Dobropis MUSÍ mať povodna_faktura_id, bežná faktúra NESMIE mať
  CONSTRAINT chk_dobropis_povodna CHECK (
    (je_dobropis = true AND povodna_faktura_id IS NOT NULL) OR
    (je_dobropis = false AND povodna_faktura_id IS NULL)
  ),
  kurz_k_eur numeric(12,6),
  suma_celkom_eur numeric(12,2),
  kurz_zdroj text CHECK (kurz_zdroj IN ('ECB','manual','NBS')),
  kurz_datum date,

  -- Bankové údaje
  iban text,

  -- Dátumy
  datum_vystavenia date,
  datum_doruceni date,
  datum_splatnosti date NOT NULL,
  datum_uhrady date,
  datum_zdanitelneho_plnenia date,

  -- Stav + workflow
  stav text NOT NULL DEFAULT 'rozpracovana'
    CHECK (stav IN ('rozpracovana','caka_na_schvalenie','schvalena','zamietnuta','na_uhradu','uhradena','stornovana')),
  aktualny_stupen smallint NOT NULL DEFAULT 1 CHECK (aktualny_stupen IN (1,2)),
  version integer NOT NULL DEFAULT 1, -- optimistic locking

  -- Súbor
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,

  -- Prepojenia (B — plný integrovaný systém)
  firma_id uuid NOT NULL REFERENCES firmy(id) ON DELETE RESTRICT,
  vozidlo_id uuid REFERENCES vozidla(id) ON DELETE SET NULL,
  servis_id uuid REFERENCES vozidlo_servisy(id) ON DELETE SET NULL,
  tankova_karta_id uuid REFERENCES tankove_karty(id) ON DELETE SET NULL,
  cesta_id uuid REFERENCES sluzobne_cesty(id) ON DELETE SET NULL,
  zamestnanec_id uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- pre faktúry preplátenia (zamestnanec si platil sám, firma mu to vracia)
  skolenie_id uuid REFERENCES skolenia(id) ON DELETE SET NULL,
  poistna_udalost_id uuid REFERENCES poistne_udalosti(id) ON DELETE SET NULL,
  bankovy_ucet_id uuid REFERENCES bankove_ucty(id) ON DELETE SET NULL,
  kategoria_id uuid REFERENCES archiv_kategorie(id) ON DELETE SET NULL,

  -- Metadata
  popis text,
  poznamka text,
  oddelenie text,
  tagy text[],
  search_vector tsvector,

  -- Auditná stopa kľúčových eventov
  nahral_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  posol_na_schvalenie_at timestamptz,

  schvalil_l1_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  schvalene_l1_at timestamptz,
  schvalil_l2_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  schvalene_l2_at timestamptz,

  zamietol_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  zamietnute_at timestamptz,
  zamietnutie_dovod text,

  uhradil_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uhradene_at timestamptz,

  stornoval_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stornovane_at timestamptz,
  storno_dovod text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_faktura_per_dodavatel UNIQUE (cislo_faktury, dodavatel_id, firma_id, je_dobropis)
);
```

**Indexy (15):**
- `(stav)`, `(firma_id, stav)`, `(datum_splatnosti) WHERE stav IN ('schvalena','na_uhradu')`
- `(dodavatel_id)`, `(vozidlo_id)`, `(servis_id)`, `(cesta_id)`, `(kategoria_id)`
- `(created_at DESC)`, `(povodna_faktura_id) WHERE je_dobropis = true`
- `gin(search_vector)`, `gin(tagy)`
- `(firma_id, datum_splatnosti) WHERE stav = 'na_uhradu'` — cashflow forecast

### 1.2 Nová tabuľka `faktury_audit_log`

```sql
CREATE TABLE faktury_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faktura_id uuid NOT NULL REFERENCES faktury(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  akcia text NOT NULL,
    -- 'created','sent_for_approval','approved_l1','approved_l2',
    -- 'rejected','resubmitted','marked_for_payment','paid','cancelled',
    -- 'edited_security','edited_metadata','reapproval_triggered',
    -- 'credit_note_created','linked','unlinked'
  povodny_stav text,
  novy_stav text,
  zmenene_polia jsonb, -- { "suma_celkom": { "old": 100, "new": 120 } }
  poznamka text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 1.3 Nová tabuľka `dodavatelia`

```sql
CREATE TABLE dodavatelia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nazov text NOT NULL,
  ico text,
  dic text,
  ic_dph text,
  iban text,
  swift text,
  default_mena text NOT NULL DEFAULT 'EUR',
  default_dph_sadzba numeric(5,2) NOT NULL DEFAULT 20,
  default_splatnost_dni int DEFAULT 14,
  adresa text,
  email text,
  telefon text,
  poznamka text,
  aktivny boolean NOT NULL DEFAULT true,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_dodavatelia_ico ON dodavatelia(ico) WHERE ico IS NOT NULL;
CREATE INDEX idx_dodavatelia_search ON dodavatelia USING gin(search_vector);
CREATE INDEX idx_dodavatelia_aktivny ON dodavatelia(aktivny) WHERE aktivny = true;
```

### 1.4 Nová tabuľka `bankove_ucty`

```sql
CREATE TABLE bankove_ucty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id uuid NOT NULL REFERENCES firmy(id) ON DELETE CASCADE,
  nazov text NOT NULL,
  iban text NOT NULL,
  swift text,
  banka text,
  mena text NOT NULL DEFAULT 'EUR',
  aktivny boolean NOT NULL DEFAULT true,
  poradie int DEFAULT 0,
  poznamka text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_iban_per_firma UNIQUE (firma_id, iban)
);
CREATE INDEX idx_bankove_ucty_firma ON bankove_ucty(firma_id, aktivny);
```

### 1.5 Nová tabuľka `kurzy_mien`

```sql
CREATE TABLE kurzy_mien (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mena text NOT NULL,
  kurz_k_eur numeric(12,6) NOT NULL CHECK (kurz_k_eur > 0),
  datum date NOT NULL,
  zdroj text NOT NULL DEFAULT 'ECB' CHECK (zdroj IN ('ECB','NBS','manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_mena_datum UNIQUE (mena, datum)
);
CREATE INDEX idx_kurzy_mena_datum_desc ON kurzy_mien(mena, datum DESC);
```

### 1.6 Rozšírenie `firmy.faktury_workflow`

```sql
ALTER TABLE firmy ADD COLUMN faktury_workflow jsonb NOT NULL DEFAULT '{
  "stupne": 1,
  "limit_auto_eur": 0,
  "schvalovatel_l1": "fin_manager",
  "schvalovatel_l2": "admin",
  "uhradzuje": "fin_manager"
}'::jsonb;
```

**Pole `schvalovatel_*` a `uhradzuje`:**
- `'nadriadeny'` — priamy nadriadený autora (`profiles.nadriadeny_id`); ak je na dovolenke, zastupujúci
- `'fin_manager'` — aktívny `role='fin_manager'` user firmy
- `'admin'` — aktívny `role='admin'` user firmy
- `'it_admin'` — globálny it_admin
- `'user:{UUID}'` — konkrétny user

**Logika `limit_auto_eur`:**
- Ak `stupne=2` AND `suma_celkom_eur <= limit_auto_eur` → preskočí L2, ide priamo na `schvalena` po L1
- Ak `stupne=2` AND `suma_celkom_eur > limit_auto_eur` → po L1 prejde na `aktualny_stupen=2` → čaká L2
- Ak `stupne=1` → vždy len L1, pole `schvalovatel_l2` sa ignoruje (UI disablne)
- Pre dobropis (negative suma) sa berie `ABS(suma_celkom_eur)` voči limitu

**Validácia config:**
- `limit_auto_eur >= 0`
- Ak `stupne=2`, `schvalovatel_l1 != schvalovatel_l2` (tá istá role nemôže schváliť oba stupne — leda by `user:` rozdielne UUID)
- Konflikt záujmov: `nahral_id` nemôže schvaľovať vlastnú faktúru ani v jednom stupni → resolveSchvalovatel preskočí self a fallback na nadriadeného/it_admina

### 1.7 Úprava existujúcej `dokumenty_archiv`

```sql
-- Po migrácii faktúr von:
DELETE FROM dokumenty_archiv WHERE typ = 'faktura';

-- Odstrániť faktúrne polia
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS suma;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS dodavatel;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS cislo_faktury;
ALTER TABLE dokumenty_archiv DROP COLUMN IF EXISTS datum_splatnosti;

-- Stav enum zostáva (zmluva môže byť caka_na_schvalenie pre právnika), ale 'na_uhradu' a 'uhradeny' už nedávajú zmysel
ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_stav_check;
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_stav_check
  CHECK (stav IN ('nahrany','caka_na_schvalenie','schvaleny','zamietnuty','nahradeny','expirujuci'));

-- Typ enum stratí 'faktura'
ALTER TABLE dokumenty_archiv DROP CONSTRAINT IF EXISTS dokumenty_archiv_typ_check;
ALTER TABLE dokumenty_archiv ADD CONSTRAINT dokumenty_archiv_typ_check
  CHECK (typ IN ('zmluva','objednavka','dodaci_list','ine'));
```

### 1.8 Nový modul permissions

```sql
-- Pridať do enum modulov
INSERT INTO module_permissions (modul, label) VALUES ('faktury', 'Faktúry') ON CONFLICT DO NOTHING;
```

`it_admin` a `fin_manager` automaticky majú prístup. `admin` a iní cez explicit `user_moduly` entry.

---

## 2. Triggers (DB-level železná logika)

### 2.1 `faktury_search_vector_t`
INSERT/UPDATE → recompute `search_vector` z `cislo_faktury + dodavatel_nazov + popis + poznamka + variabilny_symbol`.

### 2.2 `faktury_eur_calc_t`
INSERT/UPDATE pri zmene `mena|kurz_k_eur|suma_celkom`:
- Ak `mena = 'EUR'` → `suma_celkom_eur = suma_celkom`, `kurz_k_eur = 1`
- Inak → `suma_celkom_eur = round(suma_celkom * kurz_k_eur, 2)`

### 2.3 `faktury_state_guard_t`
UPDATE pri zmene `stav` → kontrola voči matici allowed transitions (viď sekcia 3). Neplatný prechod = `RAISE EXCEPTION`. Defense in depth — application layer to robí prvý, DB druhý.

### 2.4 `faktury_audit_t`
INSERT/UPDATE/DELETE → snapshot do `faktury_audit_log` s diffom zmenených polí (jsonb). User z `current_setting('app.current_user_id')`.

### 2.5 `faktury_version_t`
UPDATE → `version = OLD.version + 1`. Server actions overia `WHERE version = expected_version` pre optimistic locking.

### 2.6 `faktury_updated_at_t`
UPDATE → `updated_at = now()`.

### 2.7 `dodavatelia_search_vector_t`
INSERT/UPDATE → search_vector z `nazov + ico + dic + email + adresa`.

---

## 3. State machine

### 3.1 Stavy

| Stav | Význam | Terminálny? |
|---|---|---|
| `rozpracovana` | Draft — autor ešte neposlal | nie |
| `caka_na_schvalenie` | Posunuté na schvaľovateľa (L1 alebo L2 podľa `aktualny_stupen`) | nie |
| `schvalena` | Kompletne schválená — pripravená na úhradu | nie |
| `zamietnuta` | Zamietnutá s dôvodom — autor môže opraviť a znovu poslať | nie |
| `na_uhradu` | Schválená + označená že treba uhradiť (medzi-fáza) | nie |
| `uhradena` | Zaplatená — locked | **áno** (okrem dobropisu) |
| `stornovana` | Zrušená | **áno** |

### 3.2 Allowed transitions

```
rozpracovana       → caka_na_schvalenie | stornovana
caka_na_schvalenie → schvalena | caka_na_schvalenie (L1→L2) | zamietnuta | stornovana
zamietnuta         → caka_na_schvalenie | stornovana
schvalena          → na_uhradu | uhradena | caka_na_schvalenie (re-approval) | stornovana
na_uhradu          → uhradena | schvalena | caka_na_schvalenie (re-approval) | stornovana
uhradena           → [LOCKED] (iba dobropis vytvorí novú faktúru, alebo it_admin force storno)
stornovana         → [TERMINAL]
```

### 3.3 Špeciálne pravidlá

**Re-approval po edit security poľa** (suma, mena, kurz, dodávateľ, IBAN, VS, číslo, splatnosť, súbor):
- Ak stav je `schvalena` alebo `na_uhradu` → state vráti na `caka_na_schvalenie`, `aktualny_stupen=1`, vyčistia sa `schvalil_l1/l2_*` polia
- Audit log entry `reapproval_triggered` s diffom

**Storno uhradenej faktúry**:
- Iba `it_admin` cez `forceStornoUhradenej(id, dovod)` action
- Audit log eskalácia
- Notif fin_manageru firmy

**Dobropis**:
- Vytvorí sa nová faktúra `je_dobropis=true`, `povodna_faktura_id=X`, `suma_celkom` záporná (alebo flag + absolute, použijem **záporná hodnota** pre čistejšiu sum aritmetiku v reportoch)
- Workflow rovnaký ako bežná faktúra (musí ísť cez schválenie)
- Pôvodná faktúra zostáva `uhradena`, ale `view faktury_saldo` ukazuje súčet so zápornými dobropismi

### 3.4 Schvaľovateľ resolution

```ts
async function resolveSchvalovatel(faktura, firmaWorkflow, stupen: 1 | 2): string {
  const role = stupen === 1 ? firmaWorkflow.schvalovatel_l1 : firmaWorkflow.schvalovatel_l2

  if (role === 'nadriadeny') return await resolveCurrentApprover(faktura.nahral_id) // existing helper, handles dovolenka
  if (role === 'fin_manager') return await getActiveFinManager(faktura.firma_id)
  if (role === 'admin') return await getActiveAdmin(faktura.firma_id)
  if (role === 'it_admin') return await getItAdmin()
  if (role.startsWith('user:')) return role.slice(5)
  throw new Error(`Neznáma role config: ${role}`)
}
```

Ak `resolveSchvalovatel` vráti null → fallback na `it_admin` + warn notif.

### 3.5 Auto-skip L2

Pri `firmaWorkflow.stupne=2` a po L1 schválení:
```ts
if (faktura.suma_celkom_eur <= firmaWorkflow.limit_auto_eur) {
  // Auto-skip L2
  faktura.stav = 'schvalena'
  audit('approved_auto_skip_l2', { reason: `pod limit ${firmaWorkflow.limit_auto_eur} EUR` })
} else {
  faktura.stav = 'caka_na_schvalenie'
  faktura.aktualny_stupen = 2
}
```

---

## 4. RLS policies

```sql
-- SELECT
CREATE POLICY faktury_select ON faktury FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (
      p.role = 'it_admin'
      OR faktury.firma_id = p.firma_id
      OR faktury.firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[]))
    )
  )
);

-- INSERT (cez admin klient v server actions, RLS overuje firma scope)
CREATE POLICY faktury_insert ON faktury FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR firma_id = p.firma_id OR firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

-- UPDATE (state machine v actions, RLS overuje len že user má prístup k firme)
CREATE POLICY faktury_update ON faktury FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid()
    AND p.role IN ('admin','it_admin','fin_manager')
    AND (p.role = 'it_admin' OR firma_id = p.firma_id OR firma_id = ANY(COALESCE(p.pristupne_firmy, ARRAY[]::uuid[])))
  )
);

-- DELETE iba it_admin
CREATE POLICY faktury_delete ON faktury FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'it_admin')
);
```

`dodavatelia` — admin/fin_manager/it_admin all access (zdieľané naprieč firmami).
`bankove_ucty` — per firma scope ako faktury.
`kurzy_mien` — read-only pre všetkých (cez RLS), insert iba cron + it_admin.
`faktury_audit_log` — read len pre rovnakú firma scope, insert len cez trigger.

---

## 5. Storage

- Nový bucket `faktury` (private, signed URLs)
- Path schema: `<firma_id>/<rok>/<mesiac>/<faktura_id>_<filename>`
- Pôvodné súbory v bucket `archiv` ostávajú na ich `file_path` (migrácia ich nepresúva — len kopíruje DB row)
- Limit: 25 MB per súbor, MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
- Po DELETE faktury → trigger zavolá storage cleanup (cez postgres_net alebo manual cleanup cron)

---

## 6. Server actions API

Nový súbor `src/actions/faktury.ts`:

### CRUD
- `createFaktura(formData)` — upload + insert (stav=`rozpracovana`)
- `updateFaktura(id, data, expectedVersion)` — split na security vs metadata polia, security trigger re-approval
- `deleteFaktura(id)` — soft delete (stav=`stornovana` + `storno_dovod`); hard delete iba it_admin

### Workflow actions
- `sendForApproval(id)` — `rozpracovana` → `caka_na_schvalenie`, resolve schvaľovateľa, fixovať kurz_k_eur ak chýba
- `approveFaktura(id, expectedVersion)` — schvaľovateľ overí, posunie podľa stupne+limit_auto
- `rejectFaktura(id, dovod, expectedVersion)` — `caka_na_schvalenie` → `zamietnuta`
- `resubmitFaktura(id)` — `zamietnuta` → `caka_na_schvalenie` (reset L1)
- `markForPayment(id)` — `schvalena` → `na_uhradu`
- `markPaid(id, datum_uhrady, bankovy_ucet_id)` — → `uhradena`
- `cancelFaktura(id, dovod)` — → `stornovana` (stav-dependent guard)
- `forceStornoUhradenej(id, dovod)` — iba it_admin
- `createCreditNote(povodnaFakturaId, formData)` — `je_dobropis=true`, suma negative

### Bulk
- `bulkApprove(ids[], expectedVersions[])`
- `bulkMarkPaid(ids[], bankovy_ucet_id, datum_uhrady)`
- `bulkExportCsv(filter)`

### Read
- `getFaktury(filter)` — paginated, cached cez `unstable_cache` per (firma, mesiac, stav)
- `getFakturaDetail(id)` — full record + audit log + súvisiace
- `getFakturyByVozidlo(vozidlo_id)`
- `getFakturyByCesta(cesta_id)`
- `getFakturyExpiringSoon(days=7)` — splatnosť do N dní
- `getFakturyOverdue()` — po splatnosti
- `getCashflowForecast(mesiac_od, mesiac_do)` — sum suma_celkom_eur per mesiac splatnosti
- `getDodavatelia(search?)` — autocomplete
- `getDodavatelStats(id)` — počet faktúr, sum, average, splatnosti

### Pomocné
- `getEcbKurz(mena, datum)` — lookup `kurzy_mien` → fallback live ECB
- `resolveSchvalovatel(faktura, firma, stupen)` — viď sekcia 3.4

---

## 7. UI structure

### 7.1 Sidebar (nová sekcia)

```
... existujúce moduly ...
[Faktúry]
  → Všetky faktúry         /admin/faktury
  → Čakajú na schválenie   /admin/faktury?stav=caka_na_schvalenie  [badge: count]
  → Po splatnosti          /admin/faktury?overdue=1                [badge: count, červené]
  → Nahrať faktúru         /admin/faktury/nahrat
  → Reporty                /admin/faktury/reporty
  → Dodávatelia            /admin/faktury/dodavatelia
[Archív dokumentov]   ← oddelene od Faktúr
  → Všetky dokumenty       /admin/archiv
  → Kategórie              /admin/archiv/kategorie
```

### 7.2 Pages

**`/admin/faktury` — list**
- KPI cards: `Čakajú N · Schválené N · Na úhradu N · Po splatnosti N · Tento mesiac celkom X €`
- DataTable s filtrami: stav, dodávateľ (autocomplete), firma, mena, dátum splatnosti od-do, vozidlo, cesta, kategória, oddelenie, fulltext
- Bulk actions: Schváliť vybrané / Označiť uhradené / Export CSV
- Klik na riadok → detail
- Streaming SSR + SWR client cache (per existing pattern)

**`/admin/faktury/[id]` — detail**
- Header: stav badge, suma + mena (+ EUR ekvivalent), tlačidlá podľa stavu+role:
  - Rozpracovaná: Editovať / Poslať na schválenie / Zmazať
  - Čaká schválenie L1: Schváliť / Zamietnuť (iba schvaľovateľ)
  - Čaká schválenie L2: Schváliť / Zamietnuť (iba L2 schvaľovateľ)
  - Schválená: Označiť na úhradu / Označiť uhradené / Editovať / Storno
  - Na úhradu: Označiť uhradené / Vrátiť na schválenu / Storno
  - Uhradená: Vytvoriť dobropis / [it_admin] Force storno
  - Zamietnutá: Editovať / Poslať znovu (autor) / Storno
- Tab "Údaje" — všetky polia faktúry (security a metadata oddelené farebne)
- Tab "Súbor" — inline preview PDF (iframe) alebo `<img>` pre JPG/PNG
- Tab "Prepojenia" — clickable linky na vozidlo/cestu/servis/poistku/zamestnanca/školenie/dodávateľa/dobropis(y)
- Tab "Audit log" — chronologický zoznam s diff polí
- Tab "Saldo" (iba ak má dobropisy) — pôvodná suma − dobropisy = zostatok

**`/admin/faktury/nahrat` — upload form**
- Drop zone (PDF/JPG/PNG/WebP) max 25 MB
- Polia v poradí toku:
  1. Súbor
  2. Dodávateľ — autocomplete s "+ Pridať nového" (otvorí inline modal)
  3. Číslo faktúry, VS, KS, ŠS
  4. Mena (default z dodavatel.default_mena), DPH sadzba (default z dodavatela)
  5. Suma bez DPH / DPH suma / Suma celkom (auto-fill jedného z trojice keď zadáš dva)
  6. Ak mena ≠ EUR: kurz k EUR (pre-fill z dnešného ECB) + zdroj kurzu radio (ECB/manual)
  7. Dátumy: vystavenia / doručenia / splatnosti (default = vystavenia + dodavatel.default_splatnost_dni) / zdaniteľného plnenia
  8. IBAN (pre-fill z dodavatela)
  9. Firma (default z user.firma_id), Kategória, Oddelenie, Tagy
  10. Prepojenia (collapsible): vozidlo, servis, cesta, tankovacia karta, zamestnanec, školenie, poistná udalosť, bankový účet
  11. Popis, Poznámka
- Tlačidlá: "Uložiť ako rozpracovanú" / "Poslať na schválenie"
- Validácia per pole + summary error banner

**`/admin/faktury/reporty`**
- Cashflow forecast — bar chart sum suma_celkom_eur per mesiac splatnosti (3 mesiace dopredu)
- Top 10 dodávateľov (count + sum)
- Per vozidlo (sum servis + tankovanie + poistka)
- Per cesta (cestovné výdavky)
- Per zamestnanec (preplátenia)
- Po splatnosti (overdue list s eskaláciou farbou)
- Mesačný/ročný export CSV/XLSX
- Filter: rok, firma, kategória

**`/admin/faktury/dodavatelia` — CRUD**
- DataTable: nazov, ico, default_mena, počet faktúr, sum, posledná faktúra
- Detail: form + štatistika
- Inline create cez modal (z faktúry nahrat formy)

**`/admin/firmy/[id]/faktury-pravidla`** (nová stránka v admin)
- Form: stupne (1/2 radio), limit_auto_eur (number), schvalovatel_l1 (dropdown role + user picker), schvalovatel_l2 (iba ak stupne=2), uhradzuje (dropdown)
- Preview: "Pri tejto konfigurácii faktúra do 500 € pôjde priamo cez fin_manager. Nad 500 € pôjde aj cez admin..."

### 7.3 Kontextové linky (existujúce stránky)

- `/admin/vozidla/[id]` → tab "Faktúry" + button "Nahrať faktúru" (pre-fill `vozidlo_id`)
- `/admin/sluzobne-cesty/[id]` → tab "Doklady/faktúry" + button "Pridať" (pre-fill `cesta_id` + `zamestnanec_id`)
- `/fleet/servisy/[id]` → button "Pripojiť faktúru" (pre-fill `servis_id` + `vozidlo_id` + `dodavatel_id` z servisu)
- `/fleet/poistky/[id]` → tab "Faktúry" (pre-fill `poistna_udalost_id` ak existuje, alebo `vozidlo_id`)
- `/admin/zamestnanci/[id]` → tab "Faktúry školení" (filter `zamestnanec_id`)
- `/fleet/tankove-karty/[id]` → tab "Mesačné faktúry" (filter `tankova_karta_id`)
- Admin dashboard → karta "Faktúry čakajú" (count, klik → list)

### 7.4 Permissions

- `it_admin` — všetko (vrátane force storno)
- `fin_manager` — full CRUD pre svoju firmu(/firmy z `pristupne_firmy`); schvaľovanie a úhrada podľa firma config
- `admin` — full CRUD; schvaľovanie a úhrada podľa firma config
- `zamestnanec` — žiadny prístup k modulu (viditeľné len ak má modul `faktury` v `user_moduly`)

---

## 8. Notifikácie

Všetky **in-app** (e-mail odložené na koniec projektu — viď memory).

| Event | Recipient | Trigger |
|---|---|---|
| `faktura.podana` | resolveSchvalovatel(L1) | `sendForApproval` action |
| `faktura.schvalena_l1_treba_l2` | resolveSchvalovatel(L2) | po L1 schválení nad limit_auto |
| `faktura.schvalena` | nahral_id + uhradzuje role | terminal schválenie |
| `faktura.zamietnuta` | nahral_id (s dôvodom) | reject action |
| `faktura.uhradena` | nahral_id | mark paid |
| `faktura.po_splatnosti` | uhradzuje role | cron daily, 3/7/14 dní eskalácia |
| `faktura.blizi_sa_splatnost` | uhradzuje role | cron daily, 7 dní pred splatnosťou |
| `faktura.dobropis_vytvoreny` | nahral pôvodnej + uhradzuje role | createCreditNote |
| `faktura.force_storno_uhradenej` | fin_manager + admin firmy | it_admin force storno |

---

## 9. Cron jobs

Vercel Hobby = 2 cron jobs limit. Existujúce: `auto-pip` + `keep-warm`. Pre nové faktúry úlohy potrebujeme rozšíriť `keep-warm` na `daily-maintenance`.

**`/api/cron/daily-maintenance`** (rename z keep-warm, schedule `0 5 * * *`):
1. Supabase keep-warm ping
2. Fetch ECB kurzy → insert do `kurzy_mien` pre dnešok (mena: EUR/CZK/USD/GBP/PLN/HUF/CHF)
3. Eskalácie po splatnosti (3/7/14 dní) → in-app notif
4. Blížiaca sa splatnosť (7 dní) → in-app notif

---

## 10. Migrácia dát

**Postup:**
1. Aplikuj migráciu (vytvorí nové tabuľky, RLS, triggers)
2. Skript `scripts/migrate-faktury.mjs`:
   ```sql
   BEGIN;

   -- Pre každú faktúru z dokumenty_archiv
   INSERT INTO faktury (
     cislo_faktury, dodavatel_nazov, suma_celkom, mena, dph_sadzba,
     datum_splatnosti, file_path, file_name, file_size, mime_type,
     stav, firma_id, kategoria_id, popis, oddelenie, tagy,
     nahral_id, schvalil_l1_id, schvalene_l1_at,
     zamietol_id, zamietnute_at, zamietnutie_dovod,
     created_at
   )
   SELECT
     COALESCE(cislo_faktury, 'AUTO-' || LEFT(id::text, 8)),
     COALESCE(dodavatel, 'Neznámy dodávateľ'),
     COALESCE(suma, 0.01),
     'EUR',
     20,
     COALESCE(datum_splatnosti, created_at::date + INTERVAL '14 days'),
     file_path, nazov, file_size, mime_type,
     CASE
       WHEN stav = 'nahrany' THEN 'rozpracovana'
       WHEN stav = 'caka_na_schvalenie' THEN 'caka_na_schvalenie'
       WHEN stav = 'schvaleny' THEN 'schvalena'
       WHEN stav = 'na_uhradu' THEN 'na_uhradu'
       WHEN stav = 'uhradeny' THEN 'uhradena'
       WHEN stav = 'zamietnuty' THEN 'zamietnuta'
       ELSE 'rozpracovana'
     END,
     -- firma_id: ak existing has it use it, inak default = primary firma (ID z env)
     COALESCE(firma_id, (SELECT id FROM firmy ORDER BY poradie LIMIT 1)),
     kategoria_id, popis, oddelenie, tagy,
     nahral_id, schvalovatel_id, schvalene_at,
     -- zamietnutie ak existuje
     NULL, NULL, NULL,
     created_at
   FROM dokumenty_archiv
   WHERE typ = 'faktura';

   -- Verify count
   DO $$
   DECLARE old_cnt int; new_cnt int;
   BEGIN
     SELECT COUNT(*) INTO old_cnt FROM dokumenty_archiv WHERE typ = 'faktura';
     SELECT COUNT(*) INTO new_cnt FROM faktury;
     IF old_cnt <> new_cnt THEN
       RAISE EXCEPTION 'Mismatch: dokumenty_archiv má % faktúr, faktury má %', old_cnt, new_cnt;
     END IF;
   END $$;

   -- Cleanup
   DELETE FROM dokumenty_archiv WHERE typ = 'faktura';

   COMMIT;
   ```
3. Backfill `suma_celkom_eur` cez UPDATE (mena='EUR' → suma_celkom_eur = suma_celkom)
4. Spustiť audit-log migration (na každú existujúcu faktúru insert `created` event)

**Failsafe:**
- Migrácia v transakcii → buď all-or-nothing
- Pred migráciou: backup `dokumenty_archiv` (`CREATE TABLE dokumenty_archiv_backup_20260507 AS SELECT * FROM dokumenty_archiv`)
- Po validácii (1 týždeň) → drop backup

---

## 11. Edge cases

| # | Scenár | Riešenie |
|---|---|---|
| 1 | Race condition: 2 schvaľovatelia kliknú schvál súčasne | Optimistic locking cez `version` column. Druhý dostane `Conflict — refresh and retry` |
| 2 | Mena bez kurzu pre dnešok (cron neprebehol) | Live ECB API fallback v `getEcbKurz`; ak ECB down → manual entry povolené |
| 3 | Edit security poľa schválenej faktúry | Auto re-approval: stav → `caka_na_schvalenie`, vyčistia sa `schvalil_l1/l2`, audit `reapproval_triggered` |
| 4 | Dobropis pre faktúru s viacerými dobropismi | View `faktury_saldo` agreguje: `suma_celkom_eur(originál) + sum(dobropisy_eur)` (dobropis je negative) |
| 5 | Zamietnutá → autor opraví → poslať znovu | `resubmitFaktura` resetuje na L1, audit `resubmitted` |
| 6 | File upload zlyhá počas createFaktura | Storage delete + DB row delete v rámci `try/catch` cleanup |
| 7 | Bulk schvaľovanie naprieč firmami | Backend zoskupí per firma, validuje role pre každú, vráti per-faktúra status |
| 8 | Storno schválenej faktúry s prepojeným servisom | Audit log; servis.faktura_id ostáva (history), iba flag `faktura_stornovana` na servise |
| 9 | Schvaľovateľ na dovolenke | `resolveCurrentApprover` → zastupujúci (existing helper z dovolenky modulu) |
| 10 | Multi-firma user (`pristupne_firmy[]`) | RLS automaticky scope; UI sumáre zoskupia per firma |
| 11 | Dodávateľ s rovnakým názvom (rôzne IČO) | UNIQUE iba na `ico`. Bez ICO môžu byť 2 entries — autocomplete ukáže oboje |
| 12 | Periodické faktúry (energie) | Nie v MVP. `dodavatel.default_*` polia urýchľujú manual upload |
| 13 | Súbor príliš veľký (>25 MB) | Validácia client-side + server-side, error pred upload |
| 14 | Faktúra so sumou 0 (alebo negative pre dobropis) | `CHECK (suma_celkom <> 0)`. Negative iba ak `je_dobropis=true` (DB constraint) |
| 15 | Force storno uhradenej faktúry | Iba `it_admin`, eskalácia notif fin_manageru, audit `force_storno_uhradenej` |
| 16 | DELETE dodávateľa s aktívnymi faktúrami | `ON DELETE RESTRICT` blokuje. UI ponúkne "deaktivovať" namiesto delete |
| 17 | Migrácia: dokumenty_archiv faktúra bez `firma_id` | Default na primary firma (poradie=1) + audit log entry "migrated_default_firma" |
| 18 | Storage bucket migration: súbor v `archiv/` ale faktúra už v `faktury` tabuľke | `file_path` zachováme ako bol; nové uploady idú do `faktury/` bucket. Read funguje cez `bucket = file_path.startsWith('faktury/') ? 'faktury' : 'archiv'` |

---

## 12. Test plan

### Unit tests
- State machine: každý prechod (allowed + blocked) — ~20 cases
- `resolveSchvalovatel` per role config (5 roles × scenarios)
- `getEcbKurz` lookup + fallback
- DPH calculation (suma_bez_dph + dph → suma_celkom)
- `suma_celkom_eur` auto-calc trigger

### E2E (Playwright)
- Happy path: upload → poslať → L1 schváli → L2 schváli → na úhradu → uhradená
- Dobropis flow: vytvor pôvodnú → uhrad → vytvor dobropis → schváliť → saldo
- Storno: pred schválením / po schválení / po úhrade (iba it_admin)
- Re-approval: schválená → edit suma → späť na caka_na_schvalenie
- Multi-firma: user vidí len svoje firmy
- Bulk schvaľovanie 5 faktúr

### Manual sanity
- Migrácia dát: counts before/after match
- Kontextový upload (z vozidla, z cesty, zo servisu) → pre-fill správne
- Notifikácie sa doručia
- Cron: ECB kurzy denne aktualizované

---

## 13. Implementation phases

| Fáza | Obsah | Odhad |
|---|---|---|
| **1. DB** | Migrácia (faktury, dodavatelia, bankove_ucty, kurzy_mien, audit_log, firmy.faktury_workflow), triggers, RLS, indexy | 1.5h |
| **2. Migrácia dát** | Skript + verifikácia, backup tabuľka | 30min |
| **3. Server actions** | actions/faktury.ts (CRUD + workflow + bulk + reports), helpers (resolveSchvalovatel, getEcbKurz) | 2h |
| **4. API endpoints** | /api/admin/faktury/{,[id],dodavatelia,reporty,cashflow} pre SWR | 30min |
| **5. UI: list + detail** | /admin/faktury, /admin/faktury/[id] s wszystkimi tabmi | 2h |
| **6. UI: nahrat form** | /admin/faktury/nahrat (autocomplete, ECB pre-fill, prepojenia) | 1.5h |
| **7. UI: reporty** | /admin/faktury/reporty (charts, exports) | 1h |
| **8. UI: dodavatelia + bankove ucty** | CRUD pages | 1h |
| **9. UI: per-firma config** | /admin/firmy/[id]/faktury-pravidla | 30min |
| **10. Kontextové linky** | Tabs/buttons na vozidla/cesty/servisy/poistky/zamestnanci/karty | 1h |
| **11. Notifikácie** | In-app notif pri každom evente, cron eskalácie | 30min |
| **12. Cron rename + ECB fetch** | daily-maintenance s kurzy_mien refresh | 30min |
| **13. Refactor archív** | dokumenty_archiv simplification (delete faktúrne polia) | 30min |
| **14. Tests** | Unit + E2E | 1h |
| **15. Deploy + verify** | Vercel deploy + smoke test prod | 30min |

**Total: ~14h**

## 14. Dependencies

- Existing: `firmy`, `profiles`, `vozidla`, `vozidlo_servisy`, `tankove_karty`, `sluzobne_cesty`, `skolenia`, `poistne_udalosti`, `archiv_kategorie`, `notifikacie`
- Existing helpers: `resolveCurrentApprover`, `getAccessibleFirmaIds`, `requireAdmin`/`requireFinOrAdmin`, `createSupabaseAdmin`, `unstable_cache`/`updateTag` patterns
- New libs: žiadne (ECB API cez native fetch, multi-currency math vlastné)

## 15. Open questions / Future

**Mimo MVP:**
- Periodické faktúry (energie/telekom) — neskôr cez templates
- OCR pri upload (auto-extract číslo, dodávateľa, sumu) — v3
- Účtovný export (SAP, Pohoda XML) — keď bude potreba
- Multi-stupne nad 2 (3+ schvaľovatelia) — YAGNI, drvivá väčšina firiem max 2
- Hromadný import historických faktúr cez XLSX — neskôr ak bude treba

**Bezpečnostné poznámky:**
- IP a User-Agent v audit logu — GDPR-conform, kept 10 rokov (účtovné dôvody)
- IBAN a sumy — sensitive data, log access cez `pg_audit` (ak existuje pre kritické faktúry)
- Storage URLs sú signed (15 min TTL), nikdy public
