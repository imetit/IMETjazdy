# Otázky pre firmu — kompletizácia systému IMET

**Dátum:** 2026-04-14
**Kontext:** Interný systém IMET (Next.js + Supabase). Pred spustením pre ~60 zamestnancov potrebujeme doplniť nasledujúce informácie, aby systém správne reflektoval firemnú realitu a legislatívu.

Prosím vyplňte odpovede priamo do tohto dokumentu alebo mailom.

---

## 1. ZAMESTNANCI A HIERARCHIA

1.1 **Zoznam zamestnancov** — meno, priezvisko, pracovný email, rola (zamestnanec / fleet_manager / admin / it_admin), pracovný fond (napr. 8,5 h/deň).

1.2 **Hierarchia nadriadených** — pre každého zamestnanca: kto je jeho **priamy nadriadený**, ktorý schvaľuje dochádzku, dovolenky a služobné cesty.

1.3 **Zastupovanie nadriadeného** — ak je priamy nadriadený na dovolenke, kto ho zastupuje pri schvaľovaní? (Momentálne zastupovanie nie je implementované — potrebné vedieť či treba.)

1.4 **Ktoré oddelenia** existujú? (pole `oddelenie` sa používa v dokumentoch a môže sa využiť aj pri profiloch)

---

## 2. MODULY — KTO ČO VIDÍ

2.1 Potvrdiť default maticu prístupov:

| Modul | Zamestnanec | Fleet manager | Admin | IT Admin |
|---|---|---|---|---|
| Jazdy (vlastné) | ✅ | ✅ | ✅ | ✅ |
| Vozidlá (admin) | ❌ | ✅ (len prehľad) | ✅ | ✅ |
| Dochádzka (vlastná) | ✅ | ✅ | ✅ | ✅ |
| Dochádzka (všetkých) | ❌ | ❌ | ✅ | ✅ |
| Dovolenky (vlastné) | ✅ | ✅ | ✅ | ✅ |
| Služobné cesty (vlastné) | ✅ | ✅ | ✅ | ✅ |
| Archív dokumentov | ❌ | ❌ | ✅ | ✅ |
| Reporty | ❌ | ✅ (fleet) | ✅ | ✅ |
| Správa zamestnancov | ❌ | ❌ | ❌ | ✅ |
| Permissions | ❌ | ❌ | ❌ | ✅ |

Odsúhlasiť alebo upraviť. Rozdiel medzi `admin` a `it_admin` — potvrdiť.

2.2 **Individuálne výnimky** — plánuje sa že admin bude ručne niektorým užívateľom povoľovať extra moduly mimo default roly? (dnes to vie cez `user_moduly`)

---

## 3. DOCHÁDZKA

3.1 **Pracovný fond** — default 8,5 h/deň. Má niekto iný (skrátený úväzok, 4/5, 6h)?

3.2 **Prestávka** — započítava sa do fondu? Ako dlhá?

3.3 **Pracovné dni / sviatky** — sú sviatky podľa slovenského kalendára (štátne), alebo firma má vlastný kalendár sviatkov (napr. Silvester krátky deň)?

3.4 **Dôvody dochádzky** — v systéme sú: práca, obed, lekár, lekár_doprovod, služobné, služobná_cesta, prechod, fajčenie, súkromné, dovolenka. **Chýba niečo?** (home office, školenie, OČR, PN?)

3.5 **Tablet / kiosk v kancelárii** — má byť jeden zdieľaný tablet, kde sa každý pípne PINom? Kde bude umiestnený? Má sa logovať IP / MAC adresa pre bezpečnosť?

3.6 **Ročná bilancia** — ako sa vypočítava prenos nevyčerpaných dní / hodín do ďalšieho roku? (legislatíva + firemné pravidlá)

3.7 **PDF export dochádzky** — formát (kto podpisuje, hlavička, logo, pečiatka)?

---

## 4. DOVOLENKY

4.1 **Ročný nárok** — default 20 dní. Má niekto 25 dní (nad 33 rokov podľa ZP)? Je to automatické alebo individuálne nastavenie?

4.2 **Typy žiadostí** — dovolenka, PN, OČR, náhradné voľno, neplatené voľno, iné?

4.3 **Minimálna doba vopred** — musí zamestnanec žiadať napr. 14 dní vopred? (dnes bez obmedzenia)

4.4 **Schvaľovacie workflow** — stačí 1 schvaľovateľ (priamy nadriadený), alebo nad X dní aj druhý level (napr. fin. riaditeľka)?

4.5 **Čerpanie pol-dňa** — má byť možné čerpať polovicu dňa? (dnes len celé dni)

4.6 **Krátenie fondu** — pri PN/OČR/dovolenke sa generujú záznamy dochádzky 8:00–16:30. Ak má niekto 4h úväzok, ako to rátať?

---

## 5. SLUŽOBNÉ CESTY

5.1 **Cestovné náhrady — sadzby (2026)** — aktuálne sadzby stravného, amortizácie, sadzba za km pri súkromnom vozidle. Aktualizovať pri zmene zákona.

5.2 **Zahraničná cesta** — iné pravidlá (diety podľa krajiny)? Systém dnes neeviduje krajinu cieľa.

5.3 **Kto schvaľuje** — priamy nadriadený? Alebo nad nejakú sumu / dĺžku (viac ako 3 dni) aj vyššie?

5.4 **Preddavok** — vypláca sa preddavok pred cestou? Ak áno, systém to neeviduje.

5.5 **Cestovný príkaz vs vyúčtovanie** — v DB je tabuľka `cestovne_prikazy` so stavmi `navrh/schvaleny/vyplateny`. Aký je presný flow medzi `sluzobne_cesty.stav` a `cestovne_prikazy.stav`?

5.6 **Doklady** — prikladajú sa scan bločkov / faktúr? Kde sa ukladajú (Storage bucket)?

---

## 6. JAZDY (knihá jázd)

6.1 **Firemné vs súkromné** — systém rozlišuje. Súkromné jazdy autom firmy — zdaňovaný benefit? Potrebuje sa to niekam reportovať?

6.2 **Tankovanie** — kto zadáva? Vodič (cez appku) alebo účtovníčka z faktúr?

6.3 **Servis / STK / diaľničná známka** — má chodiť notifikácia komu? Fleet manager + vodič vozidla? Aký predstih (30/14/7 dní)?

6.4 **Počet nájazdových km** — aktuálny stav odometra per vozidlo — eviduje sa automaticky zo zadaných jázd, alebo manuálne?

---

## 7. ARCHÍV DOKUMENTOV

7.1 **Typy dokumentov** — aktuálne: faktúra, zmluva, objednávka, iné? Čo ešte treba?

7.2 **Workflow schválenia faktúry** — nahrá účtovníčka → schvaľuje fin. riaditeľka → na úhradu → uhradené? Kto je v ktorom kroku?

7.3 **Retencia** — ako dlho uchovávať (zákon: daňové doklady 10 rokov)? Automatická archivácia po X rokoch?

7.4 **Max veľkosť súboru** — dnes 25 MB. Stačí?

7.5 **Prístup** — momentálne iba admin/it_admin. Má aj fin. riaditeľka samostatnú rolu alebo patrí pod admin?

---

## 8. VOZOVÝ PARK

8.1 **Priradenie vozidla k zamestnancovi** — 1:1, alebo môže zamestnanec mať viac vozidiel? Môže byť jedno vozidlo zdieľané viacerými?

8.2 **Notifikácie STK/servis** — komu? Fleet manager + vodič, alebo iba fleet manager?

8.3 **Tachometer evidencia** — pri každej jazde sa zadáva stav km, alebo len počet km?

---

## 9. NOTIFIKÁCIE A EMAILY

9.1 **Email posielanie** — systém má pripravený mail sender. Aká SMTP služba? (Resend, SendGrid, vlastný Exchange?)

9.2 **Template mailov** — má byť s logom, pečiatkou, kontaktmi? Kto dodá HTML template / brand guide?

9.3 **Ktoré udalosti generujú email** (okrem in-app notifikácie):
- Nová žiadosť o dovolenku → nadriadený ✅/❌?
- Schválenie/zamietnutie žiadosti → zamestnanec ✅/❌?
- Upozornenie na STK/servis → komu?
- Pripomienka na pending žiadosti po X dňoch → ?

9.4 **SMS notifikácie** — treba? (ak áno, ktorá služba)

---

## 10. BEZPEČNOSŤ, PRÍSTUP, LEGISLATÍVA

10.1 **2FA** — má byť povinné pre admin/it_admin? Metóda (TOTP / SMS / email OTP)?

10.2 **Politika hesiel** — minimálna dĺžka (dnes 6), komplexnosť, expirácia?

10.3 **GDPR — retention osobných údajov** — ak zamestnanec odíde, za ako dlho vymazať profil? (momentálne len deaktivácia)

10.4 **Audit log** — pre ktoré akcie je povinný (dnes schvaľovanie, zmena roly, upload dokumentov). Treba ešte niečo?

10.5 **IP whitelist** — má byť admin panel dostupný iba z firemnej siete / VPN?

10.6 **Zálohovanie** — aká stratégia (Supabase backup default + export do vlastného úložiska)?

---

## 11. DIZAJN A UX

11.1 **Logo, farby, branding** — dodá firma? (momentálne generické Tailwind farby)

11.2 **Jazyk** — iba slovenčina, alebo aj CZ/EN (napr. pre zahraničných pracovníkov)?

11.3 **Zariadenia** — tablety, mobily, desktop? Primárne desktop, mobil len dochádzka?

---

## 12. INTEGRÁCIE

12.1 **Účtovný softvér** — exportuje sa niečo (SuperFaktúra, Omega, Pohoda)? Formát?

12.2 **Mzdový softvér** — prepája sa dochádzka na mzdy (export CSV/XML)?

12.3 **Kalendár** — má sa dovolenka / služobná cesta prelievať do Google Calendar / Outlook?

---

## 13. NASADENIE A PREVÁDZKA

13.1 **Doména** — na akej doméne bude systém bežať (např. `system.imet.sk`, `interne.imet.sk`)?

13.2 **Správa užívateľov** — kto bude v roli `it_admin`? (1-2 osoby, aby nebol single-point-of-failure)

13.3 **Onboarding** — má IT admin dostať školenie / manuál? Kto ho vypracuje?

13.4 **Podpora** — SLA pre bugfixes, response time, kontakt?

---

## 14. ŠPECIFICKÉ EDGE CASES

14.1 **Zamestnanec na materskej / rodičovskej** — ako ho evidovať? (deaktivácia? špeciálny stav?)

14.2 **Dohodár (DoPČ, DoVP)** — iné workflow ako trvalý pracovný pomer?

14.3 **Brigádnici / študenti** — majú byť v systéme?

14.4 **Externí pracovníci / konzultanti** — iba v archíve dokumentov ako dodávateľ, alebo aj ako user?

---

## 15. PRIORITY A TERMÍNY

15.1 **Čo chce firma mať spustené ako prvé?** (MVP scope) — napr. dochádzka + dovolenky, zvyšok neskôr?

15.2 **Termín produkčného spustenia** — máme nejaký deadline (fiscal year, audit)?

15.3 **Pilotná prevádzka** — spustíme najprv len pre podskupinu (napr. 5-10 ľudí) na otestovanie?

---

## KONIEC

Prosíme odpovedať čo najpodrobnejšie. Pri nejasnostiach radšej doplniť komentár než nechať prázdne. Ak niečo z vyššie uvedeného nie je relevantné pre firmu, stačí napísať „neaplikuje sa".

Po doplnení odpovedí vieme:
- Presne nastaviť defaults a permissions
- Dokončiť zostávajúce moduly (ročná bilancia, PDF exporty, emaily)
- Nasadiť produkciu s nulovými security holes
- Nabehnúť s 60 zamestnancami bez prekvapení
