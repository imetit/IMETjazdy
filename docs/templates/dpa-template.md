# Zmluva o spracúvaní osobných údajov (DPA) — Šablóna

> Toto je východisková šablóna pre korporátnych zákazníkov. Pred podpisom MUSÍ
> schváliť právnik na oboch stranách. Veľa firiem trvá na vlastnej DPA šablóne —
> akceptujeme alternatívnu verziu po review.

## Strany

**Prevádzkovateľ (Controller):** [klient — názov, IČO, sídlo]
**Sprostredkovateľ (Processor):** IMET, a.s., [IČO], Bratislava, SR

## 1. Predmet zmluvy

Sprostredkovateľ spracúva osobné údaje pre Prevádzkovateľa v rozsahu, ktorý je
potrebný pre poskytovanie služby IMET Jazdy podľa hlavnej servisnej zmluvy.

## 2. Kategórie subjektov údajov

- Zamestnanci Prevádzkovateľa
- Externí dodávatelia (fakturačné údaje)
- Zákazníci Prevádzkovateľa (ak sú evidovaní v systéme — voliteľné)

## 3. Kategórie osobných údajov

| Kategória | Účel | Príklady |
|-----------|------|----------|
| Identifikačné | Autentifikácia, evidencia | meno, email, pozícia |
| Pracovné | Mzdové podklady, fleet management | dochádzka, jazdy, vozidlá |
| Kontaktné | Notifikácie | telefón, adresa |
| Bankové | Refundácia, faktúry dodávateľov | IBAN (šifrovaný at-rest) |
| Technické | Bezpečnosť, audit | IP adresa, user-agent, prihlasovacie časy |

## 4. Doba spracovania

Po dobu trvania hlavnej servisnej zmluvy + zákonom stanovenej retencie
(účtovné záznamy 10 rokov, audit log 7 rokov) podľa SR legislatívy.

## 5. Práva subjektu údajov

Sprostredkovateľ poskytuje technické prostriedky pre uplatnenie práv:
- **Prístup (čl. 15):** GET `/api/gdpr/export/[userId]` (ZIP s kompletnými údajmi)
- **Oprava (čl. 16):** UI v profile + admin
- **Výmaz (čl. 17):** POST `/api/gdpr/delete/[userId]` (anonymizácia — účtovné záznamy ostávajú)
- **Obmedzenie (čl. 18):** soft-delete cez admin
- **Prenosnosť (čl. 20):** Export endpoint vracia strojovo čitateľné JSON
- **Námietka (čl. 21):** email it@imet.sk

## 6. Sub-procesory

Sprostredkovateľ využíva nasledovných sub-procesorov:

| Sub-procesor | Účel | Lokalita | DPA link |
|--------------|------|----------|----------|
| Vercel Inc. | Hosting aplikácie | USA + EU edge | https://vercel.com/legal/dpa |
| Supabase Inc. | Databáza, auth, storage | EU (Ireland) | https://supabase.com/legal/dpa |
| Resend Inc. | Transakčné emaily | USA | https://resend.com/legal/dpa |
| Upstash Inc. (Phase 3+) | Rate-limit cache | EU | https://upstash.com/trust/dpa |
| Sentry / Functional Software Inc. (Phase 6+) | Error tracking | EU/USA | https://sentry.io/legal/dpa |

Pred zmenou sub-procesora Prevádzkovateľ informovaný 30 dní vopred. Má právo
namietať; v takom prípade strany v dobrej viere hľadajú alternatívu.

## 7. Bezpečnostné opatrenia

Sprostredkovateľ zavádza nasledovné technické a organizačné opatrenia:

- HTTPS / TLS 1.3 pre prenos
- AES-256 encryption at-rest (database + storage)
- IBAN column-level encryption (pgcrypto / Supabase Vault)
- Role-based access control + multi-tenant izolácia firmy
- Audit log (immutable, IP + user-agent)
- 2FA / MFA pre admin role
- Penetračné testy pred materiálnymi release
- Code review s bezpečnostnými gates (CI npm audit + secret scanning)
- Soft-delete + retention podľa zákona
- GDPR export + erasure endpoints

## 8. Notifikácia incidentov

Sprostredkovateľ oznámi materiálne porušenie bezpečnosti Prevádzkovateľovi:
- **Do 24 hodín** od detekcie cez email + telefón
- Zahrňuje: rozsah, kategórie dotknutých údajov, odporúčané kroky
- Sprostredkovateľ asistuje pri GDPR čl. 33 oznámení dozornému orgánu

## 9. Audit & inšpekcia

Prevádzkovateľ má právo na 1× ročnú audit dokumentáciu (SOC 2 report alebo
ekvivalent). Fyzické inšpekcie iba pri predchádzajúcej dohode 30 dní vopred.

## 10. Vrátenie / vymazanie údajov

Po ukončení servisnej zmluvy Sprostredkovateľ:
- Poskytne export všetkých dát Prevádzkovateľa do 30 dní (formát: SQL dump + ZIP)
- Vymaže dáta zo všetkých systémov do 90 dní (vrátane backupov, podľa rotácie)
- Vystaví certifikát o vymazaní

## 11. Záverečné

- Riadi sa právom Slovenskej republiky (resp. iným podľa preferencie klienta)
- V prípade konfliktu s hlavnou servisnou zmluvou má prednosť táto DPA v
  otázkach spracovania osobných údajov

---

**Sprostredkovateľ:**
___________________ (podpis)
Meno, dátum

**Prevádzkovateľ:**
___________________ (podpis)
Meno, dátum
