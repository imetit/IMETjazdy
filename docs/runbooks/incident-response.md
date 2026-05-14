# Incident Response Runbook — IMET Jazdy

> Aktualizované: 2026-05-13. Owner: IT admin (it@imet.sk).

## Severity klasifikácia

| Sev | Kritérium | Reakcia |
|-----|-----------|---------|
| **P0** | Únik produkčných dát, kompromitácia účtov, kompletný výpadok | Okamžitá (24/7), war room do 30 min |
| **P1** | Vážny bezpečnostný nález (RCE, IDOR s impactom, expozícia secrets) | Do 4 hodín v pracovné dni |
| **P2** | Funkčný bug s biznisovým dopadom, degradovaný výkon | Do 1 pracovného dňa |
| **P3** | Kozmetické chyby, drobnosti | Do 1 týždňa |

---

## P0 — Predpoklady úniku dát / kompromitácie

### 1. Rotácia kľúčov (max 15 min)

```bash
# Supabase service_role
# https://supabase.com/dashboard/project/<ref>/settings/api → Reset service_role
# Skopíruj nový kľúč

# Vercel
vercel env rm SUPABASE_SERVICE_ROLE_KEY production preview development
vercel env add SUPABASE_SERVICE_ROLE_KEY  # paste nový

# CRON_SECRET (ak je podozrenie)
vercel env rm CRON_SECRET production preview development
# Generuj: openssl rand -base64 32
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

### 2. Audit log scan (max 30 min)

```sql
-- Posledných 24h nezvyčajných akcií
select user_id, akcia, tabulka, ip_address, user_agent, created_at, detail
from audit_log
where created_at > now() - interval '24 hours'
  and akcia in ('faktura_force_storno', 'soft_delete_zamestnanca', 'gdpr_anonymize',
                'zmena_roly', 'reset_hesla', 'zmena_emailu', 'gdpr_export')
order by created_at desc;

-- Failed login pokusy
select * from auth.audit_log_entries
where created_at > now() - interval '24 hours'
  and event_message ilike '%login_failed%'
order by created_at desc;

-- IP adresy s nezvyčajnou aktivitou
select ip_address, count(*) as akcie_pocet, array_agg(distinct akcia) as akcie
from audit_log
where created_at > now() - interval '24 hours'
group by ip_address
having count(*) > 100
order by akcie_pocet desc;
```

### 3. Forced logout všetkých session (ak je podozrenie na únik tokenov)

```sql
-- Supabase SQL editor — invaliduje všetky refresh tokeny
update auth.refresh_tokens set revoked = true where revoked = false;
```

### 4. Forenzická záloha

```bash
# Pred akoukoľvek úpravou: snapshot DB
# Supabase Pro: dashboard → Database → Backups → Manual backup
# Alebo PITR restore point — poznač timestamp

# Stiahnúť logs
vercel logs <deployment-url> --output=raw > incident-$(date +%F-%H%M).log
```

### 5. Notifikácia užívateľov (GDPR čl. 33–34)

- **Do 72 hodín** oznámiť Úradu na ochranu osobných údajov SR (dataprotection.gov.sk)
- **Bez zbytočného odkladu** informovať dotknutých užívateľov ak je vysoké riziko
- Šablóna emailu pripravená v `docs/templates/breach-notification.md` (TODO)

### 6. Post-mortem (do 7 dní)

- Timeline udalostí (kedy, čo, kto)
- Root cause analýza
- Mitigácia (krátkodobá + dlhodobá)
- Lessons learned
- Update tohto runbooku

---

## P1 — Vážny bezpečnostný nález

### Pokyny pre Disclosure od externého reportera

1. Potvrď príjem do 48h (`Acknowledgement` email)
2. Reproduce vo svojom dev prostredí
3. Klasifikuj severity (CVSS 3.1)
4. Fix v patch branch → review → deploy
5. Re-test fixu reporterom (ak je ochotný)
6. Verejný disclosure podľa Security Policy timeline (typicky 30 dní po fix)
7. Pridaj entry do `CHANGELOG.md` + bezpečnostné upozornenie

---

## Service degradation — bežné problémy

### Vercel deployment failed

```bash
# Skontroluj posledné logy
vercel logs --output=raw | tail -100

# Rollback na posledný funkčný deploy
vercel rollback <deployment-url-stable>
```

### Supabase down

- Status: https://status.supabase.com/
- Fallback: žiadny single-page-application nebude fungovať bez DB; treba čakať

### Vysoký error rate v Sentry

```
1. Otvor Sentry → IMET-Jazdy project → Issues
2. Zoraď podľa "Events" descending
3. Top issue → reproduce v dev
4. Hot-fix branch alebo revert
```

---

## Kontakty

- **IT admin:** it@imet.sk (24/7 pri P0)
- **Security:** security@imet.sk
- **Vercel support:** https://vercel.com/help
- **Supabase support:** support@supabase.com (Pro plan)
- **Úrad pre ochranu OÚ:** statny.dozor@pdp.gov.sk, +421 2 32 31 32 14
