-- Phase 4: Compliance core
-- Refs: docs/superpowers/plans/2026-05-13-saas-security-hardening.md (Phase 4)
--
-- Adds:
--  1. audit_log: ip_address + user_agent columns (forensic completeness for compliance)
--  2. profiles: deleted_at + anonymized_at columns (soft-delete + GDPR erasure)
--  3. retention_policies table (configurable retention windows per kategórie)
--  4. SECURITY DEFINER funkcia anonymize_user() — bezpečná anonymizácia PII
--     pri zachovaní účtovných záznamov (zákonná retencia)

-- ── 1. audit_log forensic fields ────────────────────────────────────
alter table audit_log
  add column if not exists ip_address inet,
  add column if not exists user_agent text;

create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at);
create index if not exists idx_audit_log_tabulka on audit_log(tabulka);

-- ── 2. profiles soft-delete ─────────────────────────────────────────
alter table profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists anonymized_at timestamptz;

create index if not exists idx_profiles_deleted_at on profiles(deleted_at)
  where deleted_at is not null;

-- ── 3. retention_policies ───────────────────────────────────────────
create table if not exists retention_policies (
  kategoria text primary key,
  popis text not null,
  retention_dni integer not null check (retention_dni > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into retention_policies (kategoria, popis, retention_dni) values
  ('audit_log',             'Audit log — bezpečnostné záznamy',           365 * 7),    -- 7 rokov
  ('dochadzka',             'Dochádzka — mzdové podklady',                365 * 10),   -- 10 rokov
  ('jazdy',                 'Knihu jázd — daňová evidencia',              365 * 10),
  ('faktury',               'Faktúry — účtovné záznamy',                  365 * 10),
  ('sluzobne_cesty',        'Služobné cesty + doklady',                   365 * 10),
  ('dovolenky',             'Dovolenky',                                  365 * 5),
  ('notifikacie',           'In-app notifikácie',                         365),
  ('anonymizovani_useri',   'Hard-delete anonymizovaných po retenčnom okne', 30),
  ('tablet_identify_tokens', 'Tablet PIN/RFID tokens',                    1)
on conflict (kategoria) do nothing;

alter table retention_policies enable row level security;
create policy "admin_read_retention" on retention_policies for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','it_admin','fin_manager')));
create policy "it_admin_write_retention" on retention_policies for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'it_admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'it_admin'));

-- ── 4. anonymize_user() — SECURITY DEFINER, bezpečná GDPR erasure ───
-- Nahradí PII v profile, neruší jazdy/dochadzku/faktúry (zákonná retencia).
-- Po anonymizácii zostáva profil "neviditeľný" ale väzby v účtovných záznamoch
-- ostávajú s placeholder menom "Bývalý zamestnanec".
create or replace function anonymize_user(target_user_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  -- Iba it_admin alebo admin smie anonymizovať
  select role into caller_role from profiles where id = auth.uid();
  if caller_role not in ('admin', 'it_admin') then
    raise exception 'Iba admin/it_admin smie anonymizovať usera';
  end if;

  -- Anonymizácia PII v profile
  update profiles set
    full_name = 'Bývalý zamestnanec',
    email = format('anonymized-%s@example.invalid', substring(id::text, 1, 8)),
    telefon = null,
    adresa = null,
    pin = null,
    rfid_karta = null,
    deleted_at = coalesce(deleted_at, now()),
    anonymized_at = now(),
    active = false
  where id = target_user_id;

  -- Audit (cez session-local flag, audit_log_immutable trigger ho prepustí)
  -- Tu len normálny INSERT — service_role bypassuje immutability trigger
  insert into audit_log (user_id, akcia, tabulka, zaznam_id, detail)
  values (auth.uid(), 'gdpr_anonymize', 'profiles', target_user_id,
          jsonb_build_object('reason', reason, 'anonymized_at', now()));

  -- Zrušíme aktívne RFID karty
  update rfid_karty set aktivna = false where user_id = target_user_id;

  -- Soft-delete pending žiadosti
  update dovolenky set stav = 'zamietnuta',
    dovod_zamietnutia = 'Anonymizovaný zamestnanec'
    where user_id = target_user_id and stav = 'caka_na_schvalenie';
end;
$$;

-- ── 5. cleanup_old_tablet_tokens — fyzické mazanie ─────────────────
-- Pridáva spôsob ako retention cron môže mazať bez triggera blocku.
create or replace function cleanup_old_tablet_tokens()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  -- Tablet tokens nie sú v audit_log scope, takže žiadny immutability problém
  delete from tablet_identify_tokens
    where expires_at < now() - interval '1 hour';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Tablet tokens table (z Phase 1 plánu — ak ešte nie je vytvorená)
create table if not exists tablet_identify_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

create index if not exists idx_tablet_tokens_expires on tablet_identify_tokens(expires_at);

alter table tablet_identify_tokens enable row level security;
drop policy if exists "no_access" on tablet_identify_tokens;
create policy "no_access" on tablet_identify_tokens for all using (false) with check (false);

-- ── 6. profiles RLS update — skryť deleted ─────────────────────────
-- Nemôžeme bezpečne meniť existujúce SELECT policies bez auditu všetkých
-- callerov, preto pridáme stratégiu: server actions filtrujú `deleted_at is null`
-- v aplikačnej vrstve (DRY pattern v src/lib/profiles-scope.ts).
-- TODO: v Phase 5+ centralizovať RLS na DB-level cez where clause v policy.

comment on column profiles.deleted_at is
  'Soft-delete timestamp. Application MUST filter `deleted_at is null` for active queries.';
comment on column profiles.anonymized_at is
  'GDPR erasure timestamp. PII fields (full_name, email, telefon, adresa, pin) are nulled.';
