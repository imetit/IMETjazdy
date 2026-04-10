# IMET Systém — Systematická oprava a dorobenie

**Dátum:** 2026-04-10
**Stav:** Schválené na implementáciu

## Kontext

IMET interný systém má implementované základné CRUD operácie pre všetky moduly (jazdy, vozový park, dochádzka, dovolenky, služobné cesty, archív). Audit odhalil kritické problémy: chýbajúce bezpečnostné kontroly v server actions, neprepojené moduly, chýbajúce výpočty, žiadne filtrovanie/stránkovanie, žiadne indexy v DB, slabý error handling.

## Fáza 1: Security + Kritické bugy + Prepojenie modulov

### 1.1 Auth helper funkcie

Nový súbor `src/lib/auth-helpers.ts`:

```typescript
// requireAuth() — vráti user alebo hodí error
// requireRole(roles[]) — overí rolu
// requireOwner(userId) — overí že akcia patrí userovi
// requireNadriadeny(zamestnanecId) — overí že user je nadriadený daného zamestnanca
```

Použitie na ZAČIATKU každého server action. Existujúce `supabase.auth.getUser()` check sa nahradí týmito helpermi.

### 1.2 Permission checky na všetky actions

Každý action dostane správny check:
- `jazdy.ts`: createJazda → requireAuth, updateJazdaAdmin → requireRole(['admin','it_admin']), deleteJazda → requireOwner ALEBO requireRole(['admin','it_admin'])
- `vyuctovanie.ts`: processJazda → requireRole(['admin','it_admin'])
- `dovolenky.ts`: schvalDovolenku → requireNadriadeny(dovolenka.user_id)
- `sluzobne-cesty.ts`: schvalCestu → requireNadriadeny(cesta.user_id)
- `archiv.ts`: updateDokumentStav → requireRole(['admin','it_admin'])
- `dochadzka.ts`: manuálne zápisy → requireRole(['admin','it_admin'])
- `fleet-*.ts`: všetky mutácie → requireRole(['fleet_manager','it_admin'])
- `zamestnanci.ts`: všetky → requireRole(['admin','it_admin'])
- `permissions.ts`: všetky → requireRole(['it_admin'])

### 1.3 Prepojenie: Dovolenka → Dochádzka

Keď sa dovolenka schváli (`schvalDovolenku`):
- Pre každý pracovný deň v rozsahu vytvoriť záznam v `dochadzka` s `dovod: 'dovolenka'`, `smer: 'prichod'` aj `'odchod'` (celý deň)
- Ak už existuje dochádzka na daný deň → preskočiť (zamestnanec bol v práci)

### 1.4 Prepojenie: Služobná cesta → Dochádzka

Keď sa cesta schváli (`schvalCestu`):
- Pre každý pracovný deň cesty vytvoriť `dochadzka` záznamy s `dovod: 'sluzobna_cesta'`
- Rovnaký pattern ako dovolenka

### 1.5 Validácia vozidla pri jazde

`createJazda` → overiť, že `profiles.vozidlo_id` je stále platné (vozidlo existuje a je aktívne).

### 1.6 Fix calculateMesacnyStav

Implementovať v `src/lib/dochadzka-utils.ts`:
- Vstup: záznamy dochádzky za mesiac + pracovný fond zamestnanca
- Výpočet: súčet odpracovaných hodín - povinný obed - fajčenie
- Porovnanie s fondom (počet pracovných dní × osobný fond)
- Výstup: { odpracovane, fond, bilancia, nadcasy, absencie }

### 1.7 Fix date loop v dovolenkách

Nahradiť mutujúci for loop za while loop. Pridať check `isSviatok()` + `isPracovnyDen()` z dochadzka-utils.

### 1.8 Fix VAT výpočet

Explicitné zátvorkovanie: `const dph = (naklady_phm / (1 + dphRate)) * dphRate`

## Fáza 2: Databáza

### 2.1 Indexy

```sql
CREATE INDEX idx_jazdy_user_stav ON jazdy(user_id, stav);
CREATE INDEX idx_jazdy_vozidlo ON jazdy(vozidlo_id);
CREATE INDEX idx_dochadzka_user_datum ON dochadzka(user_id, datum);
CREATE INDEX idx_dovolenky_user_stav ON dovolenky(user_id, stav);
CREATE INDEX idx_dovolenky_user_rok ON dovolenky(user_id, rok);
CREATE INDEX idx_rfid_kod ON rfid_karty(kod_karty);
CREATE INDEX idx_sluzobne_cesty_user ON sluzobne_cesty(user_id, stav);
CREATE INDEX idx_notifikacie_user ON notifikacie(user_id, precitane);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at);
CREATE INDEX idx_user_moduly_user ON user_moduly(user_id, modul);
CREATE INDEX idx_vozidlo_servisy ON vozidlo_servisy(vozidlo_id, datum);
CREATE INDEX idx_vozidlo_kontroly ON vozidlo_kontroly(vozidlo_id);
```

### 2.2 ON DELETE CASCADE

Pridať na všetky user_id FK: dochadzka, dovolenky, rfid_karty, sluzobne_cesty, zamestnanec_majetok, zamestnanec_licencie, dokumenty_archiv.nahral_id. Pre schvalovatel_id → SET NULL.

### 2.3 Chýbajúce stĺpce

```sql
ALTER TABLE jazdy ADD COLUMN IF NOT EXISTS skutocna_spotreba_litrov DECIMAL(10,3);
ALTER TABLE jazdy ADD COLUMN IF NOT EXISTS skutocna_cena_phm DECIMAL(10,2);
```

### 2.4 Check constraints

```sql
ALTER TABLE dovolenky ADD CONSTRAINT chk_dovolenky_datumy CHECK (datum_do >= datum_od);
ALTER TABLE sluzobne_cesty ADD CONSTRAINT chk_cesty_datumy CHECK (datum_do >= datum_od);
```

### 2.5 Vyčistiť migrácie

- Zmazať `pending-migrations.sql` (broken merge)
- Vytvoriť `supabase/migrations/` adresár s číslovanými migráciami
- Definovať `schema_paths` v config.toml

## Fáza 3: DataTable — filtrovanie, stránkovanie, triedenie

### 3.1 Reusable DataTable komponent

`src/components/ui/DataTable.tsx` — client component:

Props:
- `data: T[]` — dáta
- `columns: Column<T>[]` — definícia stĺpcov (label, accessor, sortable, filterable, render)
- `searchable?: boolean` — textové vyhľadávanie
- `filters?: FilterDef[]` — select filtre (stav, mesiac, rok...)
- `pageSize?: number` — default 25
- `onExport?: () => void` — export callback

Funkcie:
- Client-side sort podľa ľubovoľného stĺpca (click na header)
- Client-side text search cez všetky stĺpce
- Select filtre (dropdown) pre enum polia
- Stránkovanie (predošlá/ďalšia + čísla strán)
- Počet záznamov "Zobrazujem 1-25 z 156"

### 3.2 Nasadenie na stránky

Všetky admin list pages prejsť na DataTable:
- Admin jazdy — filter: stav, mesiac, zamestnanec
- Admin dochádzka — filter: mesiac, zamestnanec
- Admin dovolenky — filter: stav, rok
- Admin služobné cesty — filter: stav, mesiac
- Admin archív — filter: typ, stav + existujúci fulltext
- Admin zamestnanci — filter: rola, aktívny
- Fleet vozidlá — filter: stav, typ
- Fleet servisy — filter: vozidlo, typ
- Fleet kontroly — filter: vozidlo, typ, stav

## Fáza 4: Error handling + Audit

### 4.1 Toast systém

`src/components/ui/Toast.tsx` — globálny toast provider:
- Typy: success, error, warning, info
- Auto-dismiss po 5s
- Pozícia: top-right
- Provider v root layout

Wrapper hook `useActionWithToast()`:
```typescript
const { execute, loading } = useActionWithToast(serverAction, {
  successMessage: 'Uložené',
  errorMessage: 'Chyba pri ukladaní'
})
```

### 4.2 Audit logging

Funkcia `logAudit()` v `src/actions/audit.ts` — aktivovať existujúci kód. Volať z:
- Schválenie/zamietnutie dovolenky
- Schválenie služobnej cesty
- Spracovanie jazdy
- Zmena stavu dokumentu
- Zmena oprávnení (permissions)
- Zmazanie akéhokoľvek záznamu
- Zmena vozidla/priradenie zamestnancovi

### 4.3 Input validácia

Jednoduché validačné funkcie (nie Zod — zbytočný dependency):
- `validateTime(str)` — HH:MM formát
- `validateMesiac(str)` — YYYY-MM formát
- `validateKm(n)` — kladné číslo, max 2000 na deň
- `validateDateRange(od, do)` — od <= do
- Aplikovať v server actions pred DB operáciami

## Fáza 5: Chýbajúce features

### 5.1 Admin dashboard

`src/app/admin/page.tsx` — prehľad systému:
- Karty: počet jázd tento mesiac, neschválené dovolenky, aktívne cesty, blížiace sa STK/EK
- Mini grafy: jazdy po mesiacoch (posledných 6), náklady fleet
- Zoznam: posledné akcie (z audit logu)

### 5.2 CSV/Excel export

Utility `src/lib/export.ts`:
- `exportToCSV(data, columns, filename)` — generuje CSV s BOM pre Excel SK
- Tlačidlo export na každom DataTable
- UTF-8 + BOM aby Excel otvoril správne diakritiku

### 5.3 História cien palív

- Nová tabuľka `paliva_historia` (palivo, cena, platne_od)
- Pri výpočte jazdy použiť cenu platnú v mesiaci jazdy
- Admin UI: história zmien cien

### 5.4 Dátumové filtre na reportoch

Reporty dochádzky: výber mesiaca + roku (dropdown), nie len aktuálny mesiac.
