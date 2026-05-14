# Backup & Restore Runbook — IMET Jazdy

> Aktualizované: 2026-05-13. RPO target: 1 hour. RTO target: 2 hours.

## Zálohovacia stratégia

### Supabase (databáza + storage)

**Automatic backups** (Pro plan):
- Denné fyzické zálohy, retencia 7 dní (Pro), 14 dní (Team), 30 dní (Enterprise)
- **PITR (Point-in-Time Recovery)** — `Database → Backups → PITR` (paid add-on,
  potrebné pre RPO < 24h)
- Storage buckety zálohované samostatne

**USER ACTION:** v Supabase dashboarde aktivovať **PITR add-on** pred predajom korporátnemu klientovi.

### Vercel (kód + konfig)

- Kód: zálohovaný v GitHub repo (`imetit/IMETjazdy`)
- Env vars: zálohuj manuálne mesačne — `vercel env pull .env.production.backup`
- Deployment history: 100 posledných deployov bližšie v Vercel dashboarde

### Lokálne backups (offsite)

```bash
# Mesačne — full DB dump
supabase db dump --db-url "$DATABASE_URL" -f backups/imet-$(date +%F).sql
# Ulož na šifrovaný offline disk (LUKS / VeraCrypt)
```

---

## Restore — DB do bodu v čase (PITR)

**Kedy použiť:** korupcia dát, omylom dropnutá tabuľka, ransomware, audit-driven rollback.

1. Supabase dashboard → Database → Backups → PITR
2. Vyber timestamp (presné na minútu)
3. **POZOR:** PITR restore vytvorí NOVÝ projekt s týmto stavom (nie in-place revert)
4. Update `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` v Vercel
5. Redeploy

**Test obnoveniteľnosti:** plánovaná raz za 6 mesiacov do staging projektu.

---

## Restore — Storage bucket

Storage backupy sú samostatné. Pri strate súborov:

```bash
# Listovať obsah backupu
supabase storage ls backup-2026-05-13/faktury/
# Restore individuálne súbory
supabase storage cp backup-2026-05-13/faktury/<path> .
# Re-upload do live bucketu cez Supabase admin SDK
```

---

## Restore — Vercel deployment

```bash
# Listovať posledných 20 deployments
vercel ls

# Promote starší deploy ako production
vercel promote <deployment-url>
```

---

## Disaster Recovery — kompletný re-provisioning

Scenár: Supabase projekt zničený, treba vytvoriť odznova.

1. **Nový Supabase projekt** (rovnaký region)
2. **Restore z latest backup**: `supabase db dump → psql` (alebo PITR)
3. **Storage migration**:
   ```bash
   # Z latest snapshot
   supabase storage cp -r backup-bucket new-bucket
   ```
4. **Auth users**: backup obsahuje `auth.users`; re-applied automaticky
5. **Update Vercel env vars** s novými Supabase credentials
6. **Smoke test**: prihlásenie, otvorenie 3 admin stránok, jedno data write
7. **DNS update** (ak je custom domain) → no change ak používate vercel.app

**RTO target:** 2 hours from "all systems down" to "users can log in".

---

## Pravidelné kontrolky (mesačne)

- [ ] PITR / backups sú zapnuté a viditeľné v dashboarde
- [ ] Posledný backup je <24h starý
- [ ] Test restore do staging prostredia (rotuj kvartálne)
- [ ] Vercel env vars sú konzistentné medzi prod/preview/dev
- [ ] Offsite kópia (mesačne, šifrovaná) je k dispozícii
- [ ] Tento dokument je aktuálny
