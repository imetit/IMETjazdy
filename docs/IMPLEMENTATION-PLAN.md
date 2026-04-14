# Implementačný plán — podľa odpovedí z dotazníka (2026-04-14)

Plán pokrýva **14 rozhodnutých** bodov. Otvorených 18 bodov čaká na dáta od firmy (viď `OTAZKY-PRE-FIRMU.md`). Každá vlna = samostatný commit + deploy.

---

## Vlna 1 — Foundation (rozšírenie rolí, typov, stavov)

**Cieľ:** rozšíriť základné enumy a polia tak, aby sa na ne dali naviazať ďalšie featury.

- [x] **SQL migrácia** `supabase/2026-04-14-wave1-foundation.sql`
  - Rozšíriť `profiles.role` CHECK o `fin_manager`
  - Pridať `profiles.typ_uvazku` (tpp/dohoda/brigada/extern/materska/rodicovska)
  - Pridať `profiles.zastupuje_id` (FK → profiles)
  - Rozšíriť `dovolenky.typ` CHECK o `ocr` (OČR)
  - Pridať `dovolenky.pol_dna` (bool) + `dovolenky.cast_dna` (dopoludnie/popoludnie)
  - Rozšíriť všetky `role IN ('admin','it_admin')` RLS policies o `fin_manager`
- [x] **TS typy** (`types.ts`, `dovolenka-types.ts`)
- [x] **auth-helpers**: `requireFinOrAdmin()` helper, `requireAdmin()` naďalej len admin/it_admin (fin_manager ≠ admin pre správu userov)
- [x] **get-session**: `fin_manager` dostáva všetky moduly okrem `admin_zamestnanci` a `admin_nastavenia`
- [x] **Admin layout**: povoliť `fin_manager` prístup
- [x] **Admin UI** (UserPermissionsSection, ZamestnanciTable): tlačidlo „Finančný manažér", filter, badge
- [x] **Zamestnanci form**: rozbaľovacie „typ úväzku" + „zastupujúci"
- [x] **Dovolenka form**: pridaný OČR + checkbox „Pol dňa" (aktívne iba pri 1-dňovej žiadosti)

## Vlna 2 — Zastupovanie nadriadeného

**Cieľ:** keď je priamy nadriadený na schválenej dovolenke, žiadosť ide automaticky na jeho zástupcu.

- [ ] Helper `getCurrentApprover(userId: string)`: nájde primárneho nadriadeného → ak má approved dovolenku pokrývajúcu dnešok → vráti jeho `zastupuje_id`, inak primárneho
- [ ] `createDovolenka`, `createCesta`: pri zakladaní žiadosti použiť `getCurrentApprover` namiesto priameho `nadriadeny_id`
- [ ] `requireNadriadeny`: povoliť aj zastupujúceho ako oprávneného schvaľovateľa
- [ ] `getDovolenkyNaSchvalenie`, `getCestyNaSchvalenie`: ukázať aj žiadosti, kde som zastupujúci
- [ ] UI: v detaile zamestnanca badge „Zastupuje: X" a „Je zastúpený: Y"

## Vlna 3 — Služobné cesty (zahraničie, preddavok, doklady)

- [ ] **SQL**: `sluzobne_cesty` pridať `krajina`, `preddavok_suma`, `preddavok_vyplateny_at`, `typ_cesty` (domaca/zahranicna)
- [ ] **Tabuľka dieta sadzieb per krajina** (zatiaľ prázdna — sadzby pri dodaní)
- [ ] **Upload dokladov** cez Storage bucket `sluzobne-cesty-doklady/` + UI prílohy v detaile
- [ ] **Flow preddavku**: polia + stav (žiadaný → vyplatený → zúčtovaný)

## Vlna 4 — Zdieľané vozidlá

**Cieľ:** relaxovať 1:1 vzťah user ↔ vozidlo. Vozidlo môže mať viac vodičov.

- [ ] **SQL**: nová tabuľka `vozidlo_vodici` (vozidlo_id, user_id, od, do)
- [ ] Migrovať existujúce `profiles.vozidlo_id` do novej tabuľky (zachovať naďalej ako „primárne vozidlo")
- [ ] Fleet manager UI: panel priradených vodičov per vozidlo
- [ ] Logika jazdy: vodič si môže vybrať z vozidiel, ku ktorým má prístup
- [ ] Tachometer: mesačný záznam stavu km (`vozidlo_tacho_zaznamy`)

## Vlna 5 — Fleet notifikácie (STK/servis 30/14/7)

- [ ] Zlepšiť cron endpoint `/api/fleet-notifications`
- [ ] Trojúrovňové upozornenia: 30 / 14 / 7 dní pred expiráciou
- [ ] Email + in-app: fleet_manager + priradený vodič (alebo všetci vodiči pri zdieľanom)
- [ ] Logovať odoslané notifikácie (dedup — to isté neposlať 2×)

## Vlna 6 — Bezpečnosť (2FA, IP whitelist, audit)

- [ ] **Email OTP 2FA** pre role `admin / it_admin / fin_manager` cez Supabase auth hooks
- [ ] **IP whitelist** middleware: env `ADMIN_IP_WHITELIST` (CSV), ak neprázdne a request pochádza inak ako z whitelistu → 403 na `/admin/*`
- [ ] Rozšíriť `audit_log` o IP adresu a User-Agent

## Vlna 7 — Integrácie (Outlook, Business Central, CSV mzdy)

- [ ] **iCal feed** per zamestnanec (`/api/cal/{token}.ics`) — dovolenky, služobné cesty → Outlook subscribe
- [ ] **CSV export dochádzky** pre mzdy — `/admin/reporty/export-mzdy.csv`
- [ ] **Business Central export** — placeholder (formát čaká na dodanie)

## Vlna 8 — Branding a produkcia

- [ ] Nasadiť logo + firemné farby (po dodaní brand guide)
- [ ] Nasadiť produkčnú doménu + SSL
- [ ] Pilot 5-10 ľudí → spätná väzba → ostrá prevádzka

---

## Krížová referencia s otvorenými bodmi

| Otvorený bod | Blokuje vlnu |
|---|---|
| 1. Zoznam zamestnancov | Ostrá prevádzka (import pred pilotom) |
| 2. Oddelenia | Vlna 3 (oddelenie v profile) |
| 6. Tablet miesta | Vlna 6 (IP/MAC logging) |
| 7. PDF dochádzka formát | Neskôr (po brand guide) |
| 8, 9. Cestovné sadzby | Vlna 3 (diety tabuľka) |
| 11. Typy dokumentov | Upresnenie v archíve |
| 12. Workflow faktúry | Archív — druhá iterácia |
| 13. Business Central | Vlna 7 |
| 14. Brand guide | Vlna 8 |
| 15. Doména | Vlna 8 |
| 17. Dohodári workflow | Po dodaní konkrétnych pravidiel |
| 18. Zastupovanie pravidlá | Vlna 2 — medzitým default = auto podľa dovolenky |

Všetky ostatné features sa dajú postaviť bez blokácií.
