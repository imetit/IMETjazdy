# Dochádzkový modul — kompletný pre mzdárky a zamestnancov

**Dátum:** 2026-04-29
**Status:** Návrh na schválenie
**Cieľ:** Premakaný dochádzkový systém porovnateľný s top SK riešeniami (ATTIS, Aktion, Dotyk Tech), pokrývajúci celý workflow od pípnutia cez kontrolu, korektúry, anomálie, uzávierku až po mzdový podklad.

---

## 1. Cieľ a rámec

Aplikácia má 3 typy užívateľov dochádzky:

1. **Mzdárka** (rola = ľubovoľná, modul `dochadzka` na úrovni `admin` v `user_moduly`)
   - Vidí všetkých zamestnancov svojich firiem (cez `pristupne_firmy[]`)
   - Filtruje, edituje, schvaľuje, uzaviera, exportuje
2. **Manager / nadriadený** (rola = `zamestnanec` + nadriadený svojich podriadených)
   - Vidí dochádzku svojho tímu (read-only, ale nemôže editovať)
   - Schvaľuje cez existujúci flow dovoleniek a ciest
3. **Zamestnanec** (vlastný profil)
   - Vidí svoju vlastnú dochádzku (mesačne / ročne)
   - Vidí auto-doplnené záznamy + môže "Nahlásiť chybu" (žiadosť mzdárke)
   - PDF export vlastnej dochádzky

Plus **systém** (cron job) ktorý automatizuje:
- Auto-pipnutie odchodu cez polnoc keď sa zamestnanec zabudne odpípnuť

---

## 2. Architektúra

```
┌────────────────────────────────────────────────────────────────────┐
│  TABLET PWA (PIN/RFID)         WEB (mzdárka, manager, zamestnanec) │
│  └── insert dochadzka          └── insert/update/delete dochadzka  │
│                                                                    │
│            ▼                              ▼                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Supabase  (postgres)                          │   │
│  │  • dochadzka (extended s auto_doplnene, korekcia_dovod)   │   │
│  │  • dochadzka_uzavierka (per firma + mesiac)              │   │
│  │  • dochadzka_schvalene_hodiny (per zamestnanec + mesiac) │   │
│  │  • profiles.pristupne_firmy[] (multi-firma scope)        │   │
│  │  • audit_log (všetky úpravy s pôvodnými hodnotami)       │   │
│  └────────────────────────────────────────────────────────────┘   │
│            ▲                              ▲                        │
│            │                              │                        │
│  ┌─────────────────────┐    ┌────────────────────────────────┐    │
│  │  CRON 00:30 daily   │    │  Auto-flow z dovoleniek/ciest │    │
│  │  /api/cron/auto-pip │    │  (existuje)                   │    │
│  └─────────────────────┘    └────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Databázové zmeny (migrácia `20260429000000_dochadzka_mzdy.sql`)

### 3.1 Rozšírenie `dochadzka`

```sql
ALTER TABLE dochadzka ADD COLUMN auto_doplnene BOOLEAN DEFAULT FALSE;
ALTER TABLE dochadzka ADD COLUMN korekcia_dovod TEXT;
ALTER TABLE dochadzka ADD COLUMN povodny_cas TIMESTAMPTZ;  -- pre audit pri úprave
ALTER TABLE dochadzka ADD COLUMN upravil_id UUID REFERENCES profiles(id);
ALTER TABLE dochadzka ADD COLUMN upravene_at TIMESTAMPTZ;

-- Rozšíriť zdroj o 'auto'
ALTER TABLE dochadzka DROP CONSTRAINT IF EXISTS dochadzka_zdroj_check;
ALTER TABLE dochadzka ADD CONSTRAINT dochadzka_zdroj_check
  CHECK (zdroj IN ('pin', 'rfid', 'manual', 'system', 'auto'));

CREATE INDEX idx_dochadzka_user_datum ON dochadzka(user_id, datum);
CREATE INDEX idx_dochadzka_auto ON dochadzka(auto_doplnene) WHERE auto_doplnene = TRUE;
```

### 3.2 Nová tabuľka `dochadzka_uzavierka`

```sql
CREATE TABLE dochadzka_uzavierka (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id UUID NOT NULL REFERENCES firmy(id),
  mesiac VARCHAR(7) NOT NULL,  -- YYYY-MM
  stav VARCHAR(20) NOT NULL DEFAULT 'otvoreny'
    CHECK (stav IN ('otvoreny', 'na_kontrolu', 'uzavrety')),
  na_kontrolu_at TIMESTAMPTZ,
  na_kontrolu_by UUID REFERENCES profiles(id),
  uzavrety_at TIMESTAMPTZ,
  uzavrety_by UUID REFERENCES profiles(id),
  prelomenie_dovod TEXT,  -- ak it_admin opätovne otvorí
  prelomil_id UUID REFERENCES profiles(id),
  prelomil_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firma_id, mesiac)
);

CREATE INDEX idx_uzavierka_firma_mesiac ON dochadzka_uzavierka(firma_id, mesiac);
```

### 3.3 Per-zamestnanec schválenie hodín

```sql
CREATE TABLE dochadzka_schvalene_hodiny (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  mesiac VARCHAR(7) NOT NULL,
  schvaleny_at TIMESTAMPTZ DEFAULT now(),
  schvaleny_by UUID NOT NULL REFERENCES profiles(id),
  poznamka TEXT,
  UNIQUE(user_id, mesiac)
);

CREATE INDEX idx_schvalene_user_mesiac ON dochadzka_schvalene_hodiny(user_id, mesiac);
```

### 3.4 Multi-firma scope

```sql
ALTER TABLE profiles ADD COLUMN pristupne_firmy UUID[] DEFAULT NULL;
-- NULL = vidí len svoju firma_id
-- [] alebo array = vidí svoju firma_id + tieto navyše
-- it_admin ignoruje, vidí všetky
```

### 3.5 Per-zamestnanec auto-pip flag

```sql
ALTER TABLE profiles ADD COLUMN auto_pip_enabled BOOLEAN DEFAULT TRUE;
-- false = brigádnik / nepravidelný úvazok (auto-pipnutie sa preskočí)
```

### 3.6 RLS policies

```sql
-- dochadzka_uzavierka: read pre admin/it_admin/fin_manager + scope, write pre admin+
ALTER TABLE dochadzka_uzavierka ENABLE ROW LEVEL SECURITY;
-- (policies cez service_role pre server actions)

ALTER TABLE dochadzka_schvalene_hodiny ENABLE ROW LEVEL SECURITY;
-- Zamestnanec môže select-nuť svoje schválenia (read-only)
-- Mzdárka môže write per scope
```

### 3.7 Notifikácie typov

Existujúca `notifikacie` tabuľka — pridáme nové `typ` hodnoty:
- `dochadzka_auto_pip` — auto-doplnený odchod
- `dochadzka_korekcia` — mzdárka upravila tvoj záznam
- `dochadzka_schvalene` — mzdárka schválila tvoje hodiny
- `dochadzka_uzavierka_pripravena` — pripravované uzavretie mesiaca

---

## 4. Cron job — auto-pipnutie cez polnoc

**Endpoint:** `POST /api/cron/auto-pip`
**Autorizácia:** Header `Authorization: Bearer {CRON_SECRET}` (env premenná)
**Spustenie:** Vercel Cron `0 30 0 * * *` (každú noc o 00:30 lokálneho času)
**Konfigurácia:** `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/auto-pip", "schedule": "30 0 * * *" }
  ]
}
```

### Logika

```typescript
// pre každého aktívneho zamestnanca s auto_pip_enabled = true a rolou ≠ tablet:
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
const datum = yesterday.toISOString().split('T')[0]

// 1. Skip ak víkend / sviatok
if (!isPracovnyDen(yesterday)) continue

// 2. Skip ak má dovolenku/PN/OČR/cestu (auto-flow už urobil záznamy)
if (await maAbsenciu(user.id, datum)) continue

// 3. Načítaj záznamy zo včera
const { data: zaznamy } = await admin
  .from('dochadzka')
  .select('*')
  .eq('user_id', user.id)
  .eq('datum', datum)
  .order('cas', { ascending: true })

if (zaznamy.length === 0) continue  // celý deň chýba — anomália, ale neauto-pipni

// 4. Ak posledný záznam = príchod (bez zodpovedajúceho odchodu)
const last = zaznamy[zaznamy.length - 1]
if (last.smer !== 'prichod') continue
if (last.dovod !== 'praca') continue  // posledný príchod-lekár → nepipni

// 5. Skip "nočné zmeny" — ak prvý príchod tohto dňa bol po 18:00
const firstPrichod = zaznamy.find(z => z.smer === 'prichod')
if (firstPrichod && new Date(firstPrichod.cas).getHours() >= 18) continue

// 6. Vypočítaj očakávaný odchod
const fond = user.pracovny_fond_hodiny ?? 8.5
const prichodTime = new Date(last.cas)
const odchodTime = new Date(prichodTime.getTime() + fond * 60 * 60 * 1000)

// Cap na 23:59 toho istého dňa (neprenášaj do nasledujúceho)
const eod = new Date(yesterday)
eod.setHours(23, 59, 0, 0)
if (odchodTime > eod) odchodTime = eod

// 7. Vlož auto-doplnený odchod
await admin.from('dochadzka').insert({
  user_id: user.id,
  datum,
  smer: 'odchod',
  dovod: 'praca',
  cas: odchodTime.toISOString(),
  zdroj: 'auto',
  auto_doplnene: true,
})

// 8. Notifikácia v aplikácii (žiadny email)
await admin.from('notifikacie').insert({
  user_id: user.id,
  typ: 'dochadzka_auto_pip',
  nadpis: 'Auto-doplnený odchod',
  sprava: `Včera (${datum}) ste sa zabudli odpípnuť. Systém doplnil odchod o ${formatTime(odchodTime)}. Ak je čas iný, kontaktujte mzdárku.`,
  link: '/dochadzka-prehled',
})

// 9. Notifikácia mzdárke (per firma) — bulk za všetkých auto-doplnených
```

### Bezpečnosť cron endpointu

```typescript
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... logika
}
```

---

## 5. UI sekcie

### 5.1 Hlavný prehľad pre mzdárku — `/admin/dochadzka`

**Hlavička (sticky):**
```
┌────────────────────────────────────────────────────────────────┐
│  Mesiac: [2026-04 ▾]  Firma: [☑IMET ☑IMET-TEC ☐AKE ▾]       │
│  Oddelenie: [▾]  Typ úvazku: [▾]  Status: [▾]               │
│  Search: [_____]                          [Spustiť uzávierku] │
└────────────────────────────────────────────────────────────────┘
```

**4 KPI widgety (klikateľné = filter):**
- 🟢 V práci práve teraz (X osôb)
- 🟡 Auto-doplnené čakajú kontrolu (X)
- 🟠 Anomálie (X)
- 🔴 Nadčasy top 3

**Stavový banner per firma:**
```
IMET, a.s. — 2026-04: NA KONTROLU (62% schválené, 7 anomálií, 12 auto-doplnených)
[Detail uzávierky] [Spustiť kontrolu]
```

**Hlavná tabuľka:**

| Meno | Firma | Pozícia | Fond | Odpracované | ± | Dov. | PN | OČR | Sviatky | Nadč. | Auto🤖 | Status | ✓ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ján Novák | IMET | Technik | 178h | 175h 30m | -2h 30m | 1 | 0 | 0 | 0 | 0 | 1 | OK | ✓ |
| Mária K. | IMET-TEC | Účt. | 178h | 0 | — | 0 | 22 | 0 | 0 | 0 | 0 | PN | ✓ |

- Klik na riadok → detail mesiaca
- Klik na "🤖 1" → filter na auto-doplnené
- Klik na "Status: OK" → toggle schválené/neschválené
- Bulk akcie hore: **[Schváliť všetkých vybraných] [Schváliť celú firmu]**

### 5.2 Detail zamestnanca — `/admin/dochadzka/{userId}?mesiac=YYYY-MM`

**Sumár boxy hore:**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Fond    │ Odprac. │ Rozdiel │ Dov./PN │ Nadčasy │ Auto🤖 │
│ 178h    │ 175h30m │ -2h30m  │ 1d / 0d │ 0h      │ 1      │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Stĺpec príplatkov:**
```
Nočná: 0h  |  Sobota: 0h  |  Nedeľa: 0h  |  Sviatok: 0h
```

**Mesačný kalendár — denný breakdown:**

| Deň | Príchody/Odchody | Súčet | Dôvod | Stav |
|---|---|---|---|---|
| Po 1.4 | 07:55 → 16:30 | 8h 5m | praca | ✓ |
| Ut 2.4 | 08:02 → 12:00 (obed) → 12:30 → 16:32 | 8h | praca | ✓ |
| St 3.4 | 07:50 → **16:25 🤖** | 8h | praca | ⚠️ Auto |
| Št 4.4 | (sviatok) | — | — | — |
| Pi 5.4 | 08:00 → 14:00 (lekár) | 6h | lekár+praca | ✓ |
| ... | | | | |

**Klik na deň → editor modal:**
```
┌─ Záznamy 3.4.2026 — Ján Novák ──────────────┐
│  07:50  Príchod  praca  zdroj: pin     [✏][🗑]│
│  16:25  Odchod   praca  zdroj: auto    [✏][🗑]│  ← ⚠️ Auto-doplnené
│                                              │
│  [+ Pridať záznam]                           │
└──────────────────────────────────────────────┘

[Editor záznamu — modal]
  Smer:    [Príchod ▾]
  Dôvod:   [praca ▾]
  Čas:     [16:25  ▾]
  Dôvod korektúry: [Reálne odišiel skôr — overené] *
                                          [Zrušiť] [Uložiť]
```

Po uložení:
- `povodny_cas` = pôvodný čas (audit)
- `upravil_id` = mzdárka
- `upravene_at` = now
- `korekcia_dovod` = vyplnený text
- `audit_log` insert
- Notifikácia zamestnancovi (in-app): "Mzdárka upravila tvoj záznam z 3.4."

**Tlačidlá hore detailu:**
- `[Schváliť hodiny ✓]` — označí mesiac tohto zamestnanca ako schválený
- `[Žiadať doplnenie ✉]` — pošle žiadosť zamestnancovi o doplnenie
- `[PDF výkaz]` — vygeneruje PDF s logom firmy

### 5.3 Mesačná uzávierka — `/admin/dochadzka/uzavierka`

**Per firma karta:**
```
┌─ IMET, a.s. — 2026-04 ─────────────────────────────────┐
│ Stav: [OTVORENÝ ━━━━━━━━━━━━━━] na kontrolu | uzavretý │
│                                                        │
│ Schválené hodiny: 35 / 58 zamestnancov (62%)         │
│ Nevyriešené anomálie: 7                              │
│ Auto-doplnené nepreverené: 12                        │
│                                                        │
│ [Spustiť predkontrolu] [Uzavrieť mesiac]             │
└────────────────────────────────────────────────────────┘
```

**Stavový stroj:**
- `otvoreny` — bežné dni, záznamy sa pridávajú cez tablet/auto-flow/manuál
- `na_kontrolu` — mzdárka spustila predkontrolu, prechádza anomálie
  - Tlačidlo "Spustiť predkontrolu" prepne na tento stav, vypíše zoznam anomálií
- `uzavrety` — zamknuté, žiadne nové záznamy/úpravy
  - Povolené iba ak: anomálie = 0 alebo akceptované, všetci zamestnanci schválení (dochadzka_schvalene_hodiny)
  - Po uzavretí: server actions kontrolujú stav uzávierky pred update/insert/delete
- **Prelomenie:** iba `it_admin` cez `[Otvoriť opätovne]` s povinným dôvodom + audit log

### 5.4 Reporty — `/admin/dochadzka/reporty`

| Report | Stĺpce | Format |
|---|---|---|
| **Mzdový podklad** | Meno, OČ, fond hod, odpracované hod, dovolenka dni, PN dni, OČR dni, sviatky dni, nadčasy hod, **nočná hod, víkend hod, sviatok hod** | XLSX, CSV, PDF |
| **Sumár firmy** | Agregát všetkých zamestnancov firmy | XLSX, PDF |
| **Anomálie** | Detail s drill-down | PDF |
| **Auto-doplnené** | Per zamestnanec ktoré dni boli auto-doplnené | XLSX |
| **Nadčasy** | Per zamestnanec a deň | XLSX, PDF |
| **Korektúry** | Audit všetkých ručných úprav za mesiac | XLSX, PDF |
| **Ročný prehľad** | Per zamestnanec × 12 mesiacov | XLSX, PDF |
| **Custom range** | Od-do, čokoľvek | XLSX |
| **Trend graf** | Mesiac × odpracované hodiny | screen |

**Knižnice:** XLSX cez `exceljs` (light) alebo `xlsx` (sheetjs). PDF cez existujúci `jsPDF`.

### 5.5 Anomálie — auto-detekcia

Backend funkcia `detectAnomalies(user_id, mesiac)` vracia zoznam anomálií:

| Typ | Detekcia | Severita |
|---|---|---|
| `chyba_odchod` | Príchod bez odchodu, deň skončil | High |
| `auto_doplnene` | `auto_doplnene = true`, čaká na kontrolu | Medium |
| `neuplny_mesiac` | Chýbajú celé pracovné dni bez dovolenky/PN | High |
| `podozrivy_cas` | Príchod < 06:00 alebo odchod > 22:00 | Low |
| `dlhý_blok` | >16h bez prerušenia | High |
| `duplicitny` | 2× príchod / odchod za sebou | Medium |
| `kolizia_dovolenka` | Záznam práce počas schválenej dovolenky | High |
| `praca_vo_sviatok` | Záznam práce v štátny sviatok | Low |

UI: každá anomália má drill-down + `[Vyriešiť] [Akceptovať]` tlačidlá.

### 5.6 Príplatky a nadčasy

Backend funkcia `calculatePriplatky(user_id, mesiac)` vracia:
```typescript
{
  nocna_hod: number,      // práca medzi 22:00-06:00
  sobota_hod: number,
  nedela_hod: number,
  sviatok_hod: number,
  nadcas_hod: number,     // odpracované − fond per deň
}
```

V mzdovom podklade ako separátne stĺpce.

### 5.7 Zamestnanecký dashboard — `/dochadzka-prehled` (rozšírené)

**Hlavička:**
```
Moja dochádzka
[Mesiac ▾]  [Ročný prehľad]  [PDF výkaz]
```

**Sumár boxy:**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Fond    │ Odprac. │ Rozdiel │ Dovol.  │ PN+OČR  │ Stav    │
│ 178h    │ 175h30m │ -2h30m  │ 1 d     │ 0+0 d   │ Schválený│
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

**Denný breakdown** (read-only) — rovnaká tabuľka ako v admin detail, ale:
- Bez `[✏][🗑]` tlačidiel
- Auto-doplnené dni majú tlačidlo `[Nahlásiť chybu]` → otvorí modal so správou pre mzdárku

**"Nahlásiť chybu" modal:**
```
Chcem nahlásiť chybu v dochádzke 3.4.2026:
[__________________________________________]
[__________________________________________]
                            [Zrušiť] [Odoslať]
```

Po odoslaní:
- `notifikacie.insert` pre mzdárku firmy
- Email (po nasadení O365)

**Ročný prehľad:**
- Tabuľka 12 × stĺpce (mesiac × fond/odpracované/dovolenka/PN/OČR/nadčasy)
- Trend graf

**PDF výkaz** — používateľ exportuje vlastný mesačný/ročný výkaz

---

## 6. Audit a bezpečnosť

**Každá úprava záznamu** (čas, dôvod, smer):
- `dochadzka.povodny_cas` = pôvodná hodnota
- `dochadzka.upravil_id` = ID mzdárky
- `dochadzka.upravene_at` = timestamp
- `dochadzka.korekcia_dovod` = povinný text
- `audit_log` entry s typom `dochadzka_korekcia`, detail v JSONB

**Pri uzávierke:**
- Server action kontroluje stav uzávierky pred každým update/insert/delete
- Ak `stav = uzavrety` → 403 (okrem it_admin)

**Cron job:**
- Endpoint chránený `CRON_SECRET` env (Vercel automaticky generuje pre cron)
- Iba POST so správnym Bearer headerom

**Multi-firma scope:**
- Server action helper `getAccessibleFirmaIds(userId)` vracia `[firma_id, ...pristupne_firmy]`
- Všetky queries `.in('firma_id', accessibleIds)` (alebo `profiles.firma_id IN (...)`)
- it_admin ignoruje (vidí všetko)

---

## 7. Edge cases

| Situácia | Reakcia |
|---|---|
| Zamestnanec sa zabudol odpípnuť | ✅ Cron auto-doplní odchod = príchod + fond, flag `auto_doplnene` |
| Pracoval cez polnoc (nočná zmena) | ⚠️ Cron skipne ak prvý príchod ≥ 18:00 |
| Zabudol odpípnuť obed | ⚠️ Anomália typ `chyba_odchod` (medzi obed-prichod a praca-prichod) |
| Pribudol počas dňa (lekár → koniec) | ⚠️ Posledný = odchod-lekár → cron neauto-pipne |
| Brigádnik / nepravidelný | ⚙️ `auto_pip_enabled = false` v profile |
| Sviatok / víkend | ⏭️ Cron skipne |
| Schválená dovolenka / PN / OČR / cesta | ⏭️ Cron skipne (auto-flow už vytvoril) |
| Tablet účet (rola=tablet) | ⏭️ Cron skipne |
| Posledný deň mesiaca | ✅ Auto-pipnutie funguje normálne (odchod sa cap-ne na 23:59 toho istého dňa) |
| Mzdárka vidí 2 firmy | ✅ Filter v dropdown, query cez `pristupne_firmy[]` |
| Uzávierka v polovici mesiaca | ❌ Nemožné — uzavrieť možno len kompletné mesiace |
| Editovať uzavretý mesiac | ❌ 403 okrem it_admin (s prelomením zámku) |
| Auto-pip pre dovolenky bez fondu | ⏭️ Skipne, lebo má dovolenku |
| Zamestnanec hlási chybu | ✅ Notifikácia mzdárke (in-app) |
| Dva príchody za sebou | ⚠️ Anomália `duplicitny` |
| Mzdárka schváli a potom úprava | ⚠️ Schválenie sa zruší pri úprave (a auto-zaznamená) |

---

## 8. Implementačný timeline (orientačne)

| Fáza | Obsah | Čas |
|---|---|---|
| **1. Migrácia + types** | DB zmeny, TS types, audit helpers | 0.5 dňa |
| **2. Cron + auto-pipnutie** | API endpoint, cron, notifikácie | 1 deň |
| **3. Mzdárkin prehľad** | `/admin/dochadzka` filtre, KPI, tabuľka | 1 deň |
| **4. Detail zamestnanca + editor** | Editor modal, korekcie, audit | 1 deň |
| **5. Uzávierka** | Stavový stroj, server actions check, UI | 0.5 dňa |
| **6. Anomálie + príplatky** | Detekcia, výpočet, UI | 1 deň |
| **7. Reporty + XLSX** | 9 reportov, exporty | 1.5 dňa |
| **8. Zamestnanecký dashboard** | `/dochadzka-prehled` rozšírenie + Nahlásiť chybu | 0.5 dňa |
| **9. Tests + bug fixes** | E2E test, edge cases | 1 deň |
| **CELKOM** | | **~8 pracovných dní** |

---

## 9. Súbory ktoré budú vytvorené / upravené

```
NOVÉ:
  supabase/migrations/20260429000000_dochadzka_mzdy.sql
  src/app/api/cron/auto-pip/route.ts
  src/app/admin/dochadzka/uzavierka/page.tsx
  src/components/dochadzka/DochadzkaFiltre.tsx
  src/components/dochadzka/DochadzkaKPI.tsx
  src/components/dochadzka/DochadzkaEditorModal.tsx
  src/components/dochadzka/UzavierkaCard.tsx
  src/components/dochadzka/AnomalieList.tsx
  src/components/dochadzka/PriplatkyBox.tsx
  src/lib/dochadzka-anomalies.ts
  src/lib/dochadzka-priplatky.ts
  src/lib/dochadzka-uzavierka.ts
  src/lib/xlsx.ts (helper pre Excel export)
  src/actions/dochadzka-uzavierka.ts
  src/actions/dochadzka-korekcie.ts

UPRAVENÉ:
  src/app/admin/dochadzka/page.tsx (kompletne preonať)
  src/app/admin/dochadzka/[userId]/page.tsx
  src/app/admin/dochadzka/reporty/page.tsx
  src/app/(zamestnanec)/dochadzka-prehled/page.tsx (rozšírenie)
  src/components/dochadzka/AdminDochadzkaTable.tsx
  src/components/dochadzka/MesacnyVykaz.tsx
  src/components/dochadzka/MojaDochadzka.tsx
  src/components/dochadzka/AdminDochadzkaDetail.tsx
  src/components/dochadzka/ExportMzdy.tsx
  src/actions/admin-dochadzka.ts
  src/actions/dochadzka.ts
  src/lib/dochadzka-utils.ts (rozšírenie o anomálie a príplatky)
  src/lib/types.ts (nové typy)
  vercel.json (cron config)
  .env.local + Vercel ENV (CRON_SECRET)

E2E testy:
  scripts/e2e-dochadzka-workflow.mjs (nový)
```

---

## 10. Otvorené body — defaulty pre v1

- **Default fond pre auto-pipnutie:** 8.5h (override per profil cez `pracovny_fond_hodiny`)
- **Email notifikácie pre auto-pipnutie:** vypnuté (len in-app)
- **Schvaľovanie:** per-zamestnanec aj bulk za firmu
- **Multi-firma scope:** `pristupne_firmy[]` v profile
- **Strict zámok uzávierky:** áno, prelomenie len it_admin
- **XLSX knižnica:** `exceljs` (light, dobre udržiavaná)
- **Príplatky (nočná, víkend, sviatok, nadčas):** v reportoch áno

---

## 11. Mimo rámec v1 (na neskôr)

- Plánovanie zmien (rozvrhy, šichty)
- Mobilná natívna aplikácia
- Lekárske prehliadky / BOZP doklady
- Kalendárna heatmap (vizualizácia dovoleniek tímu)
- Integrácia s Google / Outlook kalendárom (zatiaľ máme iCal feed)
- Geolocation pri pípnutí (potvrdenie že je v práci)
- **Manager-team view** — nadriadený ktorý nie je mzdárka by mohol mať read-only pohľad na dochádzku svojho tímu (`/dochadzka-tim`). V1 manager vidí tím cez existujúce schvaľovanie dovoleniek/ciest.

## 12. Email notifikácie — politika v1

Pre celý dochádzkový modul **NIE** sú v v1 emailové notifikácie aktívne:
- Auto-pipnutie cez polnoc → in-app notifikácia (red badge na zvončeku)
- Mzdárkova korekcia → in-app
- Schválenie hodín → in-app
- Pripravovaná uzávierka → in-app
- "Nahlásenie chyby" zamestnancom → in-app pre mzdárku

Po nasadení O365 SMTP (separátna úloha) sa zapnú emaily pre kritické akcie (korekcia, schválenie, uzávierka). Auto-pipnutie ostane bez emailu (príliš časté).

---

**Status: Schválené užívateľom 2026-04-29 — pripravené na implementáciu.**

---

## 13. Ultra-rozšírenia (rozhodol som pridať pre top-tier kvalitu)

User dal autoritu "urob to najlepsie ako vieš" — pridávam tieto rozšírenia ktoré z toho spravia premium nástroj porovnateľný s drahými riešeniami (ATTIS, Aktion).

### 13.1 Štruktúrované žiadosti o korekciu (namiesto voľný text "Nahlásiť chybu")

Nová tabuľka `dochadzka_korekcia_ziadosti`:
```sql
CREATE TABLE dochadzka_korekcia_ziadosti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  datum DATE NOT NULL,
  povodny_zaznam_id UUID REFERENCES dochadzka(id),
  navrh_smer VARCHAR(10),
  navrh_dovod VARCHAR(30),
  navrh_cas TIMESTAMPTZ,
  poznamka_zamestnanec TEXT NOT NULL,
  stav VARCHAR(20) DEFAULT 'caka_na_schvalenie'
    CHECK (stav IN ('caka_na_schvalenie', 'schvalena', 'zamietnuta')),
  vybavila_id UUID REFERENCES profiles(id),
  vybavila_at TIMESTAMPTZ,
  poznamka_mzdarka TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Zamestnanec si vyplní: dátum, čo je zle, čo má byť. Mzdárka klikne "Schváliť" — automaticky aplikuje korektúru.

### 13.2 Verzionovanie záznamov (plná história zmien)

Nová tabuľka `dochadzka_history`:
```sql
CREATE TABLE dochadzka_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dochadzka_id UUID NOT NULL REFERENCES dochadzka(id) ON DELETE CASCADE,
  zmena_typ VARCHAR(20) CHECK (zmena_typ IN ('insert', 'update', 'delete')),
  povodne_data JSONB,
  nove_data JSONB,
  zmenil_id UUID REFERENCES profiles(id),
  zmenil_at TIMESTAMPTZ DEFAULT now(),
  dovod TEXT
);
```

Pred každou úpravou trigger uloží snapshot. Audit "Kto všetko menil tento záznam?" → kompletná timeline.

### 13.3 Smart fond per deň týždňa (rozšírený fond)

`pracovny_fond_hodiny` ostáva pre default. Pridáme:
```sql
ALTER TABLE profiles ADD COLUMN fond_per_den JSONB;
-- napr. { "po": 8.5, "ut": 8.5, "st": 8.5, "stv": 8.5, "pi": 6 }
-- ak NULL → použiť pracovny_fond_hodiny pre všetky dni
```

Cron auto-pipnutie a výpočet fondu rešpektuje fond_per_den ak je nastavený.

### 13.4 Real-time updates pre mzdárku (Supabase Realtime)

Mzdárka vidí v reálnom čase keď niekto pípne (bez refresh):
- WebSocket channel `dochadzka:firma:{firma_id}`
- KPI widget "V práci dnes" sa updatne live
- Toast notification "Ján Novák práve pípol príchod"

Implementácia: `useRealtimeChannel` hook v `AdminDochadzkaTable`.

### 13.5 Štatistiky firmy — manažérsky pohľad

`/admin/dochadzka/statistiky` — agregované metriky:
- Priemerný počet odpracovaných hodín / mesiac
- Trend (graph) — odpracované, dovolenka, PN za posledných 12 mesiacov
- Top 10 nadčasy
- Najviac PN / OČR za rok
- % schválených mesiacov
- Anomálie trendline

Pre vedenie firmy / fin_managera.

### 13.6 Print-friendly výtlačky

Všetky reporty majú CSS `@media print` — A4 portrait, hlavička s logom firmy, zápätie s dátumom + číslom strany. Mzdárka tlačí priamo z prehliadača bez nutnosti PDF download.

### 13.7 Bulk import historickej dochádzky

`/admin/dochadzka/import` — drag&drop XLSX/CSV s historickými dochádzkami:
- Mapovanie stĺpcov (osoba, dátum, príchod, odchod)
- Preview pred uložením
- Detekcia duplikátov
- Audit log: import session

Užitočné pre prechod zo starého systému.

### 13.8 PIN reset workflow

Mzdárka v admin paneli môže resetovať PIN zamestnanca:
- Klik "Reset PIN" → vygeneruje nový 4-miestny PIN
- Notifikácia zamestnancovi (in-app + email po nasadení)
- Audit log

### 13.9 Predictive warnings pre mesiac

Pri otvorenej uzávierke (≥ 5 dní pred koncom mesiaca) systém vypočíta:
- "Tomáš má aktuálne -8h od fondu. Bez akcie skončí mesiac s -45h."
- "Mária má 14h nadčasov + 3 anomálie. Skontrolujte do uzávierky."
- "5 zamestnancov má auto-doplnené záznamy ktoré ešte nikto neskontroloval."

Karta "Predikcia mesiaca" v `/admin/dochadzka`.

### 13.10 Pripomienkové centrum

Mzdárka má TODO list:
- "Schváliť hodiny: 23 zamestnancov"
- "Vybaviť žiadosti o korekciu: 4"
- "Skontrolovať auto-doplnené: 12"
- "Spustiť uzávierku 2026-03 (zameškaná)"

Vidno priamo na `/admin/dochadzka` ako collapsible panel.

---

## 14. Aktualizované rozhodnutia (5 otvorených bodov)

| Otázka | Rozhodnutie |
|---|---|
| Mesačná uzávierka 3-stavová | ✅ Ostáva |
| Multi-firma scope cez `pristupne_firmy[]` | ✅ Implementovať |
| Per-zamestnanec `auto_pip_enabled` flag | ✅ Áno (default `true`) |
| Príplatky v reportoch (nočná/víkend/sviatok/nadčas) | ✅ Áno, v1 |
| Štruktúrovaná žiadosť o korekciu | ✅ Áno (lepšie ako voľný text) |

---

## 15. Aktualizovaný timeline po pridaní rozšírení

| Fáza | Obsah | Čas |
|---|---|---|
| **1. Migrácia + types** | DB zmeny (5 nových tabuliek), TS types | 1 deň |
| **2. Cron + auto-pipnutie** | API endpoint, cron, notifikácie, fond_per_den logika | 1 deň |
| **3. Mzdárkin prehľad** | Filtre, KPI, tabuľka, Realtime channel, TODO panel | 1.5 dňa |
| **4. Detail zamestnanca + editor** | Editor modal, korekcie, history audit | 1 deň |
| **5. Žiadosti o korekciu** | Zamestnanecký formulár + mzdárkina inbox | 0.5 dňa |
| **6. Uzávierka** | Stavový stroj, server actions check, predictive warnings | 1 deň |
| **7. Anomálie + príplatky** | Detekcia, výpočet, UI | 1 deň |
| **8. Reporty + XLSX + print** | 9 reportov, exporty, print CSS | 1.5 dňa |
| **9. Štatistiky firmy** | Agregáty, grafy | 0.5 dňa |
| **10. Bulk import + PIN reset** | XLSX import, PIN reset workflow | 0.5 dňa |
| **11. Zamestnanecký dashboard** | Rozšírenie, žiadosť o korekciu UI | 0.5 dňa |
| **12. Tests + bug fixes** | E2E test pokrývajúci 100% workflow | 1.5 dňa |
| **CELKOM** | | **~12 pracovných dní** |
