# IMET Interny System — Kompletny Dizajn Spec

**Datum:** 2026-04-17
**Scope:** Vsetky moduly okrem dochadzky — doplnenie chybajucich funkcii + manualy
**Princip:** Vsetko musi byt 100% prepojene — moduly medzi sebou komunikuju, data su konzistentne

---

## 1. KNIHA JAZD — Doplnenie

### 1.1 Hromadne spracovanie jazd
- Checkboxy v `AdminJazdyTable` na vyber viacerych jazd
- Batch akcie: schvalit vsetky vybrane, zamietnout vsetky vybrane
- Validacia: iba jazdy v stave `odoslana` sa daju batch schvalit
- Po batch schvaleni: auto-vypocet nahrad pre kazdu jazdu (existujuca logika v `calculations.ts`)
- Prepojenie: ak ma jazda vazbu na sluzobnu cestu (`sluzobna_cesta_id`), aktualizovat aj skutocne km na ceste

### 1.2 PDF cestovny prikaz per jazda
- Tlacidlo "PDF" pri kazdej spracovanej jazde
- Obsah: zamestnanec, vozidlo, trasa, km, datum, vypocitane nahrady
- Logo: placeholder "[LOGO]" — nahradit ked pride brand guide
- Format: A4, hlavicka firmy (z tabulky `firmy` podla zamestnanca)
- Prepojenie: pouzije data z `firmy` (nazov, adresa) + `profiles` + `vozidla` + `sadzby`

### 1.3 Mesacny sumar PDF per zamestnanec
- Admin moze vygenerovat mesacny prehlad jazd pre jedneho zamestnanca
- Obsah: vsetky jazdy v mesiaci, sucet km, sucet nahrad, rozdelenie sluzbne/sukromne
- Prepojenie: stiahne sadzby z `sadzby`, palivo z `paliva`, vozidlo z `vozidla`

### 1.4 Notifikacia uctovnicke
- Hook v `createJazda` — ked zamestnanec odosle jazdu, notifikacia pre admin/fin_manager
- Implementacia: `createNotification()` do DB tabulky `notifikacie` (existujuca)
- Email: placeholder funkcia `sendEmailNotification()` — loguje do konzoly, pripravena na O365 switch
- Prepojenie: notifikacia obsahuje link na `/admin/jazdy/[id]`

---

## 2. VOZOVY PARK — Doplnenie

### 2.1 UI zdielane vozidla (vozidlo_vodici M:N)
- Novy tab "Vodici" v `VozidloDetail`
- Zobrazenie: vsetci priradeni vodici, kto je primarny, datum priradenia
- Akcie: pridat vodica (select z profiles), odstranit, nastavit primarneho
- Server akcie: `vozidlo-vodici.ts` uz existuje — napojit na UI
- Prepojenie: ked sa zmeni primarny vodic, aktualizovat aj `vozidla.priradeny_vodic_id`

### 2.2 UI tachometer mesacne zaznamy
- Novy tab "Tachometer" v `VozidloDetail`
- Tabulka: mesiac, zaciatok km, koniec km, rozdiel, kto zadal
- Formular: vyber mesiac + hodnota km
- Validacia: novy zaznam musi byt >= posledny
- Prepojenie: `vozidlo_tacho_zaznamy` tabulka existuje — napojit UI
- Prepojenie s jazdami: mesacne km z tachometra vs sucet km z jazd = kontrola konzistentnosti

### 2.3 Spotreba paliva
- **Nova tabulka `vozidlo_tankovanie`**: vozidlo_id, datum, litrov, cena_za_liter, celkova_cena, km_na_tachometri, plna_naplna (bool), poznamka, created_by
- Novy tab "Tankovanie" v `VozidloDetail`
- Tabulka: datum, litrov, cena, km, kto tankoval
- Formular: pridat tankovanie
- Auto-vypocet priemernej spotreby: (litrov / (km2 - km1)) * 100 = L/100km
- Zobrazenie priemernej spotreby na dashboarde vozidla
- Prepojenie: vyuziva `vozidlo_tacho_zaznamy` pre km referencing

### 2.4 Tankove karty
- **Nova tabulka `tankove_karty`**: id, cislo_karty, typ (shell/omv/slovnaft/ina), vozidlo_id (nullable), vodic_id (nullable), stav (aktivna/blokovana/zrusena), limit_mesacny, platnost_do, poznamka
- Sekcia "Tankove karty" v `VozidloDetail` — karty priradene k tomuto vozidlu
- Admin stránka `/fleet/tankove-karty` — prehlad vsetkych kariet
- Prepojenie: karta moze byt priradena vozidlu ALEBO vodicovi (nie obom)
- Prepojenie: pri tankovani sa moze vybrat karta

### 2.5 Poistne udalosti workflow
- Rozsirit existujuci `PoistnaUdalostForm` + `fleet-poistne.ts`
- Stavy: `nahlasena` → `riesena` → `u_poistovne` → `vyriesena` / `zamietnuta`
- Pole: cislo_poistky, datum_udalosti, popis, skoda_odhad, skoda_skutocna, poistovna_plnenie, spoluucast
- Upload fotek/dokumentov do `fleet-documents` bucketu
- Prepojenie: vazba na vozidlo + vodica (kto riadil v case udalosti)
- Prepojenie: notifikacia fleet_managerovi + fin_managerovi

### 2.6 Planovanie servisov
- Rozsirit `vozidlo_servisy`: pridat `nasledny_servis_km`, `nasledny_servis_datum`, `interval_km`, `interval_mesiace`
- Automaticke upozornenia: ked sa blizi datum alebo km (podla posledneho tacho zaznamu)
- Zobrazenie v `FleetDashboard` — "Blizace sa servisy"
- Prepojenie: porovnava posledny `vozidlo_tacho_zaznamy` zaznam s `nasledny_servis_km`

### 2.7 Naklady per vozidlo report
- Nova sekcia vo `FleetReporty`
- Sucet: servisy (suma) + tankovanie (suma) + poistne udalosti (spoluucast) + STK/EK poplatky + poistenie PZP/havarijne
- Obdobie: mesacne / rocne
- Graf alebo tabulka
- Prepojenie: agreguje data z `vozidlo_servisy`, `vozidlo_tankovanie`, `fleet-poistne`, `vozidlo_kontroly`

---

## 3. ZAMESTNANECKA KARTA — Doplnenie

### 3.1 iCal subscribe banner
- Banner v `/moja-karta` s URL pre Outlook: `{BASE_URL}/api/cal/{ical_token}`
- Tlacidlo "Kopirovat link" — clipboard API
- Kratky navod: "Pridajte si tento link do Outlook ako internetovy kalendar"
- Prepojenie: pouziva `profiles.ical_token` (uz existuje)
- Ak token neexistuje, vygenerovat pri prvom zobrazeni

### 3.2 Onboarding checklist
- **Nova tabulka `onboarding_items`**: id, profile_id, typ (bozp/majetok/karty/pristup/skolenie/zmluva/custom), nazov, splnene (bool), splnene_datum, splnil_id, poznamka
- Default polozky pri vytvoreni noveho zamestnanca: BOZP skolenie, Prevzatie majetku, Pridelenie RFID karty, Pridelenie pristupov, Podpis zmluvy, Pridelenie vozidla (ak relevantne)
- Sekcia "Onboarding" v admin zamestnanec detail (`/admin/zamestnanci/[id]`)
- Progress bar: X z Y splnenych
- Prepojenie: ked sa splni "Pridelenie majetku" → skontrolovat ze ma zaznam v `zamestnanecka_majetok`
- Prepojenie: ked sa splni "RFID karta" → skontrolovat ze ma zaznam v `rfid_karty`

### 3.3 Offboarding workflow
- Pole `offboarding_stav` na `profiles`: null / `zahajeny` / `dokonceny`
- Ked admin spusti offboarding, auto-vytvorenie checklistu: Vratit majetok, Deaktivovat RFID, Odovzdat vozidlo, Zrusit pristupy, Vypocet zostatku dovolenky, Vyuctovanie cestovnych nahrad
- Po dokonceni vsetkych poloziek: deaktivacia profilu (existujuci `is_active = false`)
- Prepojenie: kontroluje `zamestnanecka_majetok` (vsetko vratene?), `rfid_karty` (deaktivovane?), `vozidla` (odovzdane?)

### 3.4 Skolenia a certifikaty
- **Nova tabulka `skolenia`**: id, profile_id, typ (bozp/opp/vodicak/odborne/ine), nazov, datum_absolvovany, platnost_do, certifikat_url (Storage), stav (platne/expirovane/blizi_sa), poznamka
- Tab "Skolenia" v zamestnaneckej karte
- Admin moze pridat skolenie + nahrat certifikat
- Auto-vypocet stavu: ak `platnost_do` < dnes → expirovane, < dnes+30dni → blizi_sa
- Zobrazenie expiracii na admin dashboarde (ako STK)
- Prepojenie: upload certifikatu do Storage bucketu `skolenia-certifikaty`
- Prepojenie: notifikacia zamestnancovi ked sa skolenie blizi k expiraciu

### 3.5 Export PDF zamestnaneckej karty
- Tlacidlo "Exportovat PDF" v admin zamestnanec detail
- Obsah: osobne udaje, firma, pozicia, uvazok, fond, nastup, priradene vozidlo, majetok (tabulka), licencie (tabulka), skolenia (tabulka), RFID karty
- Format: A4, hlavicka firmy
- Prepojenie: agreguje vsetko z `profiles`, `zamestnanecka_majetok`, `zamestnanecka_licencia`, `rfid_karty`, `skolenia`, `vozidla`, `firmy`

---

## 4. SLUZOBNE CESTY — Doplnenie

### 4.1 Auto-vypocet diet
- Rozsirit `diety-utils.ts`
- Logika: pocet hodin na ceste → kategoria (5-12h, 12-18h, 18+h) → sadzba z `dieta_sadzby`
- Pre zahranicne: krajina → sadzba z `dieta_sadzby` (ak existuje, inak fallback na domesticku)
- Zobrazenie vypoctu v detail cesty — transparentne "5h domaca = X EUR"
- Prepojenie: pouziva `dieta_sadzby` tabulku (prazdna, ale pripravena)

### 4.2 Doklady review
- V `SluzobnasCestaDetail` admin sekcia: zoznam nahratych dokladov
- Kazdy doklad: nahlad (ak obrazok), stav (neskontrolovany/schvaleny/zamietnuty)
- Admin moze potvrdit alebo zamietnout jednotlive doklady
- Pole `stav` na `cesta_doklady` (default: neskontrolovany)
- Prepojenie: ked su vsetky doklady schvalene, cesta moze byt vyuctovana

### 4.3 Vyuctovanie rozsirenie
- Rozsirit existujuci `VyuctovaniePanel`
- Logika: preddavok_suma vs. skutocne naklady (suma dokladov) = doplatok / preplatenie
- Pole: `vyuctovanie_stav` (caka_na_doklady / vyuctovane / uzavrete)
- Sumar: diety + doklady - preddavok = vysledok
- Prepojenie: vazba na `cesta_doklady` (sumy z dokladov)
- Prepojenie: vysledok exportovany do mesacneho CSV miezd

---

## 5. ARCHIV DOKUMENTOV — Doplnenie

### 5.1 Kategorie/priecinky
- **Nova tabulka `archiv_kategorie`**: id, nazov, parent_id (self-ref, stromova struktura), popis, pristup_role (text[]), poradie, farba, ikona
- Seed default kategorie: Zmluvy, Faktury, Interné dokumenty, BOZP, HR dokumenty, Vozový park, Ostatné
- Stromovy sidebar v archive — kategorie s podkategoriami
- Kazdy dokument ma `kategoria_id` (FK)
- Prepojenie: `pristup_role[]` na kategorii urcuje kto vidi dokumenty v nej

### 5.2 Verziovanie dokumentov
- Pole na `dokumenty_archiv`: `verzia` (int, default 1), `povodny_dokument_id` (self-ref FK, nullable)
- Ked admin nahra novu verziu: vytvori novy zaznam s `povodny_dokument_id = stary.id`, verzia = stary.verzia + 1
- V detaile dokumentu: "Historia verzii" — vsetky verzie s datumami
- Stary dokument dostane `stav = nahradeny`
- Prepojenie: stary subor zostava v Storage (audit trail)

### 5.3 Retencna politika
- Pole na `dokumenty_archiv`: `platnost_do` (date, nullable)
- Admin dashboard widget: "Expiruajuce dokumenty" (nasledujucich 30 dni)
- Auto-zmena stavu na `expirujuci` ked platnost_do < dnes + 30 dni
- Prepojenie: notifikacia adminovi o expiracii (rovnaky system ako STK notifikacie)

### 5.4 Pristup per kategoria
- Pole `pristup_role[]` na `archiv_kategorie` — napr. ['admin', 'fin_manager', 'it_admin']
- RLS: ked zamestnanec otvara archiv, vidi len kategorie kde jeho rola je v `pristup_role`
- Admin a it_admin vidia vsetko
- Prepojenie: pouziva existujuce role z `profiles.role`

### 5.5 Hromadny upload
- Drag & drop zona v `ArchivUploadForm` — viacero suborov naraz
- Kazdy subor dostane rovnaku kategoriu + metadata z formulara
- Progress bar per subor
- Prepojenie: pouziva existujuci Storage bucket `archiv`

---

## 6. CROSS-CUTTING

### 6.1 Dark mode
- CSS premenne pre farby (light/dark)
- Toggle v sidebar footer — Slnko/Mesiac ikona
- Ulozenie do localStorage
- Class `dark` na `<html>` elemente
- Tailwind dark: prefix na vsetky existujuce styly? NIE — pouzijeme CSS variables, staci zmenit premenne
- Implementacia: globalny CSS s `[data-theme="dark"]` selector + JS toggle

### 6.2 Konsolidacia nastaveni
- `/admin/nastavenia` prerobene na taby: Vseobecne | Paliva | Sadzby | System
- Presuneme obsah z `/admin/paliva` a `/admin/sadzby` sem (stare URL redirectneme)
- Tab System: SMTP konfig placeholder, IP whitelist, 2FA toggle (placeholder)
- Prepojenie: vsetky nastavenia na jednom mieste

### 6.3 Email placeholder system
- `src/lib/email.ts` — abstrakcia: `sendEmail({ to, subject, body })`
- Implementacia: ak je `SMTP_HOST` env nastaveny → posli cez nodemailer, inak → log do konzoly + zapis do `notifikacie` tabulky
- Pripravene na O365 switch — staci nastavit env premenne
- Pouzitie vo vsetkych moduloch kde treba notifikacie

---

## 7. MANUALY

### 7.1 Struktura
- `/manual` — zamestnanecky manual (pristupy cez sidebar, ikona HelpCircle)
- `/admin/manual` — admin manual
- `/fleet/manual` — fleet manual
- Kazdy: accordion sekcie per modul, krok-za-krokom, screenshoty budu neskor

### 7.2 Obsah per modul

**Kniha jazd (zamestnanec):** Ako zadat novu jazdu, co zadavam (mesiac + km), kde vidim stav, co znamenaju stavy, kedy dostanem nahrady
**Kniha jazd (admin):** Ako spracovat jazdy, hromadne schvalenie, PDF prikaz, mesacny sumar, sadzby + paliva nastavenie
**Vozovy park (fleet):** Vozidla CRUD, servisy, kontroly STK/EK, hlasenia, zdielane vozidla, tachometer, tankovanie, tankove karty, poistne udalosti, naklady report
**Zamestnanecka karta:** Majetok, licencie, RFID, skolenia, onboarding/offboarding, iCal, export PDF
**Sluzobne cesty:** Ako podat ziadost, domaca vs zahranicna, preddavok, doklady, vyuctovanie, schvalovanie
**Archiv dokumentov:** Upload, kategorie, hladanie, verziovanie, schvalovanie, retencia, pristupove prava
**Admin panel:** Dashboard, zamestnanci, roly, moduly, nastavenia, reporty, audit log

### 7.3 Format
- Kazda sekcia: Popis modulu → Co tu najdem → Krok za krokom → Logika/pravidla → FAQ
- Responzivne — funguje na mobile aj desktope
- Tlacidlo "?" v sidebar otvori manual

---

## 8. DATABAZOVA MIGRACIA

Jedna migracia `20260417_complete_system.sql`:

### Nove tabulky
```sql
vozidlo_tankovanie (id, vozidlo_id, datum, litrov, cena_za_liter, celkova_cena, km_na_tachometri, plna_naplna, tankova_karta_id, poznamka, created_by, created_at)
tankove_karty (id, cislo_karty, typ, vozidlo_id, vodic_id, stav, limit_mesacny, platnost_do, poznamka, created_at)
onboarding_items (id, profile_id, typ, nazov, splnene, splnene_datum, splnil_id, poznamka, created_at)
skolenia (id, profile_id, typ, nazov, datum_absolvovany, platnost_do, certifikat_url, stav, poznamka, created_at)
archiv_kategorie (id, nazov, parent_id, popis, pristup_role, poradie, farba, ikona, created_at)
```

### Rozsirene tabulky
```sql
dokumenty_archiv + verzia (int default 1), povodny_dokument_id (FK self), platnost_do (date), kategoria_id (FK archiv_kategorie)
vozidlo_servisy + nasledny_servis_km, nasledny_servis_datum, interval_km, interval_mesiace
cesta_doklady + stav (text default 'neskontrolovany')
sluzobne_cesty + vyuctovanie_stav (text)
profiles + offboarding_stav (text)
```

### RLS policies
- Vsetky nove tabulky: admin/it_admin/fin_manager vidia vsetko
- Zamestnanec vidi len svoje zaznamy (kde profile_id = auth.uid())
- archiv_kategorie: viditelne podla pristup_role[] ALEBO ak je admin

### Storage buckets
- `skolenia-certifikaty` — certifikaty pre skolenia

### Seed data
- `archiv_kategorie`: 7 default kategorii (Zmluvy, Faktury, Interne, BOZP, HR, Vozovy park, Ostatne)

---

## 9. PREPOJENIA MEDZI MODULMI (KRITICKE)

Toto je kluc k 100% prepojenemu systemu:

| Odkial | Kam | Co |
|--------|-----|-----|
| Jazdy → Sluzobne cesty | Ked jazda patri k ceste, aktualizuje skutocne km na ceste |
| Jazdy → Vozidla | Jazda pouziva priradene vozidlo, km sa pocitaju do tachometra |
| Sluzobne cesty → Dochadzka | Schvalena cesta auto-vytvara dochadzka zaznamy (uz funguje) |
| Sluzobne cesty → Jazdy | Cesta moze generovat jazdu (ak zamestnanec pouzil firemne auto) |
| Vozidla → Zamestnanci | Priradeny vodic, historia drzitelov, zdielani vodici |
| Vozidla → Tankovanie | Spotreba per vozidlo, naviazane na tachometer |
| Vozidla → Servisy | Planovanie podla km z tachometra |
| Zamestnanci → Onboarding | Auto-checklist pri vytvoreni, kontrola majetku/RFID |
| Zamestnanci → Offboarding | Kontrola vsetkeho prideleného pred deaktivaciou |
| Zamestnanci → Skolenia | Expiracie na dashboarde, notifikacie |
| Archiv → Kategorie | Pristupove prava podla role, stromova struktura |
| Archiv → Verzie | Historia verzii, audit trail |
| Dashboard → Vsetko | Admin dashboard agreguje expiracie z STK + skoleni + dokumentov |
| Notifikacie → Vsetko | Jednotny system notifikacii pre vsetky moduly |
| PDF export → Firmy | Vsetky PDF pouzivaju hlavicku z tabulky firmy |

---

## 10. CO JE BLOCKED (placeholder, pripravene na data)

- Zahranicne diety sadzby → `dieta_sadzby` prazdna, UI ready
- Cestovne nahrady 2026 → `sadzby` existuju, treba aktualne cisla
- Business Central export → placeholder endpoint
- Logo/brand → "[LOGO]" placeholder vo vsetkych PDF
- SMTP Office 365 → email.ts s console.log fallbackom
- 2FA Email OTP → toggle v nastaveniach (disabled), pripravene na Supabase Auth hooks
