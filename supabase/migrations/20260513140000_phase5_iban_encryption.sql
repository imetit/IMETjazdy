-- Phase 5: Column-level encryption for IBAN fields
-- Refs: docs/superpowers/plans/2026-05-13-saas-security-hardening.md (Phase 5 Task 5.1)
--
-- Stratégia: pgcrypto (pgp_sym_encrypt/decrypt) so symetrickým kľúčom uloženým
-- v Supabase Vault. IBAN je high-value PII (umožňuje fraud), preto šifrujeme
-- at-rest column-level. Aplikácia číta cez VIEW (`*_v_dec`) ktorý decryptuje
-- pre authorized roly; zapisuje cez SECURITY DEFINER funkcie.
--
-- POZOR — TÁTO MIGRÁCIA JE ŠTRUKTURÁLNA, NIE DESTRUCTIVE:
--   * pridáva iban_enc bytea stĺpce
--   * NEZMAŽE pôvodné iban text stĺpce v tejto migrácii (zachováva backward compat)
--   * po cutover (Phase 5 follow-up) druhá migrácia zmaže iban text stĺpce
--
-- USER MUSÍ pred aplikáciou:
--   1. V Supabase dashboarde → Settings → Vault → vytvoriť secret 'iban-key'
--      s hodnotou random 32+ znakov (generuj cez `openssl rand -base64 32`)
--   2. Aplikovať túto migráciu cez SQL editor alebo `supabase db push`
--   3. Spustiť backfill query (na konci tejto migrácie, commented)
--   4. Po validácii (cca 1 týždeň monitoring) → druhá migrácia drop iban text

-- ── 1. pgcrypto extension ──────────────────────────────────────────
create extension if not exists pgcrypto;

-- Helper funkcia: získa kľúč z Vault (cached per session)
create or replace function get_iban_key()
returns text
language plpgsql
security definer
set search_path = vault, public, pg_temp
stable
as $$
declare
  k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'iban-key' limit 1;
  if k is null then
    raise exception 'Vault secret "iban-key" nie je nakonfigurovaný — viď Phase 5 migration header';
  end if;
  return k;
end;
$$;

-- ── 2. Pridať šifrované stĺpce ──────────────────────────────────────
alter table bankove_ucty add column if not exists iban_enc bytea;
alter table dodavatelia add column if not exists iban_enc bytea;
alter table faktury add column if not exists iban_enc bytea;

-- ── 3. Triggers pre auto-encrypt pri INSERT/UPDATE ─────────────────
create or replace function encrypt_iban_field()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Ak prišiel plaintext iban, zašifruj a vyčisti plaintext
  if new.iban is not null and new.iban <> '' then
    new.iban_enc := pgp_sym_encrypt(new.iban, get_iban_key());
    -- Plaintext NECHÁVAME zatiaľ pre backward-compat počas cutover okna.
    -- Po cutover druhá migrácia DROP iban text column.
  elsif new.iban is null then
    new.iban_enc := null;
  end if;
  return new;
end;
$$;

drop trigger if exists encrypt_iban_bankove on bankove_ucty;
create trigger encrypt_iban_bankove before insert or update of iban on bankove_ucty
  for each row execute function encrypt_iban_field();

drop trigger if exists encrypt_iban_dodavatelia on dodavatelia;
create trigger encrypt_iban_dodavatelia before insert or update of iban on dodavatelia
  for each row execute function encrypt_iban_field();

drop trigger if exists encrypt_iban_faktury on faktury;
create trigger encrypt_iban_faktury before insert or update of iban on faktury
  for each row execute function encrypt_iban_field();

-- ── 4. Backfill existujúcich IBAN (commented — spustiť MANUÁLNE po VAULT setupe) ──
-- Triggery encryptujú pri UPDATE, takže "no-op update" stačí.
--
-- update bankove_ucty set iban = iban where iban is not null;
-- update dodavatelia set iban = iban where iban is not null;
-- update faktury set iban = iban where iban is not null;

-- ── 5. Views s decrypt-on-read pre authorized roly ──────────────────
-- RLS na views: rovnaké pravidlá ako pôvodná tabuľka. Decrypt sa vykoná len
-- pre fin_manager / admin / it_admin role. Anonymous a zamestnanec uvidí null.

create or replace view bankove_ucty_v as
select
  bu.id, bu.firma_id, bu.nazov, bu.banka, bu.swift, bu.mena, bu.aktivny, bu.created_at, bu.updated_at,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and bu.iban_enc is not null
    then pgp_sym_decrypt(bu.iban_enc, get_iban_key())
    else null
  end as iban
from bankove_ucty bu;

create or replace view dodavatelia_v as
select
  d.id, d.firma_id, d.nazov, d.ico, d.dic, d.ic_dph, d.swift, d.default_mena,
  d.default_dph_sadzba, d.default_splatnost_dni, d.adresa, d.email, d.telefon,
  d.poznamka, d.aktivny, d.created_at, d.updated_at,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and d.iban_enc is not null
    then pgp_sym_decrypt(d.iban_enc, get_iban_key())
    else null
  end as iban
from dodavatelia d;

create or replace view faktury_v as
select
  f.*,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and f.iban_enc is not null
    then pgp_sym_decrypt(f.iban_enc, get_iban_key())
    else null
  end as iban_decrypted
from faktury f;

-- Pre teraz: aplikácia naďalej číta pôvodné `iban` text stĺpce (backward-compat).
-- Po cutover migrácii zmeníme `iban` view na decrypted variant.

comment on column bankove_ucty.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via bankove_ucty_v view (RLS-gated decrypt). Plain `iban` column deprecated, will be dropped in cutover migration.';
comment on column dodavatelia.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via dodavatelia_v view.';
comment on column faktury.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via faktury_v view.';

-- ── 6. Revoke direct SELECT na plaintext iban (after cutover) ───────
-- Pre teraz necháme — aplikácia by sa lámala. Po validácii odkomentovať:
-- revoke select (iban) on bankove_ucty from authenticated, anon;
-- revoke select (iban) on dodavatelia from authenticated, anon;
-- revoke select (iban) on faktury from authenticated, anon;
