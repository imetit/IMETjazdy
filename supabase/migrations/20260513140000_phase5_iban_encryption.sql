-- Phase 5: Column-level encryption for IBAN fields
-- Refs: docs/superpowers/plans/2026-05-13-saas-security-hardening.md (Phase 5 Task 5.1)
--
-- Stratégia: pgcrypto (pgp_sym_encrypt/decrypt) so symetrickým kľúčom uloženým
-- v Supabase Vault. IBAN je high-value PII (umožňuje fraud), preto šifrujeme
-- at-rest column-level. Aplikácia číta cez VIEW (`*_v`) ktorý decryptuje pre
-- authorized roly; zapisuje cez normálne UPDATE (BEFORE trigger zašifruje).
--
-- POZOR — TÁTO MIGRÁCIA JE ŠTRUKTURÁLNA, NIE DESTRUCTIVE:
--   * pridáva iban_enc bytea stĺpce
--   * NEZMAŽE pôvodné iban text stĺpce v tejto migrácii (zachováva backward compat)
--   * po cutover (Phase 5 follow-up) druhá migrácia zmaže iban text stĺpce
--
-- Vyžaduje pred aplikáciou: Vault secret 'iban-key' (vytvorený mimo migrácie).
-- pgp_sym_encrypt / pgp_sym_decrypt sú v schéme `extensions` (Supabase default),
-- nie `public` — preto fully-qualified volania a search_path include.

-- ── 1. pgcrypto extension ──────────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;

-- Helper funkcia: získa kľúč z Vault (SECURITY DEFINER pre prístup do vault.*)
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
    raise exception 'Vault secret "iban-key" nie je nakonfigurovaný — vytvor cez select vault.create_secret(''<random-32B>'', ''iban-key'', ''AES-256 key for IBAN encryption'')';
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
set search_path = extensions, public, pg_temp
as $$
begin
  if new.iban is not null and new.iban <> '' then
    new.iban_enc := extensions.pgp_sym_encrypt(new.iban, get_iban_key());
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

-- ── 4. Views s decrypt-on-read pre authorized roly ──────────────────
-- Schémy odrážajú reálny stav DB:
--   bankove_ucty: id, firma_id, nazov, iban, swift, banka, mena, aktivny, poradie, poznamka, created_at
--   dodavatelia:  id, nazov, ico, dic, ic_dph, iban, swift, default_mena, default_dph_sadzba,
--                 default_splatnost_dni, adresa, email, telefon, poznamka, aktivny, search_vector,
--                 created_at, updated_at  (BEZ firma_id — supplier list je shared)
--   faktury: SELECT * (dynamický)

drop view if exists bankove_ucty_v;
create view bankove_ucty_v as
select
  bu.id, bu.firma_id, bu.nazov, bu.banka, bu.swift, bu.mena,
  bu.aktivny, bu.poradie, bu.poznamka, bu.created_at,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and bu.iban_enc is not null
    then extensions.pgp_sym_decrypt(bu.iban_enc, get_iban_key())
    else null
  end as iban
from bankove_ucty bu;

drop view if exists dodavatelia_v;
create view dodavatelia_v as
select
  d.id, d.nazov, d.ico, d.dic, d.ic_dph, d.swift,
  d.default_mena, d.default_dph_sadzba, d.default_splatnost_dni,
  d.adresa, d.email, d.telefon, d.poznamka, d.aktivny,
  d.created_at, d.updated_at,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and d.iban_enc is not null
    then extensions.pgp_sym_decrypt(d.iban_enc, get_iban_key())
    else null
  end as iban
from dodavatelia d;

drop view if exists faktury_v;
create view faktury_v as
select
  f.*,
  case
    when (select role from profiles where id = auth.uid()) in ('fin_manager', 'admin', 'it_admin')
      and f.iban_enc is not null
    then extensions.pgp_sym_decrypt(f.iban_enc, get_iban_key())
    else null
  end as iban_decrypted
from faktury f;

-- ── 5. Auto-backfill existujúcich IBAN ──────────────────────────────
-- Triggery encryptujú pri UPDATE, takže "no-op update" stačí — zaplní iban_enc.
update bankove_ucty set iban = iban where iban is not null and iban_enc is null;
update dodavatelia set iban = iban where iban is not null and iban_enc is null;
update faktury set iban = iban where iban is not null and iban_enc is null;

comment on column bankove_ucty.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via bankove_ucty_v view. Plain `iban` deprecated, drop in cutover migration after validation window.';
comment on column dodavatelia.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via dodavatelia_v view.';
comment on column faktury.iban_enc is
  'Phase 5: pgp_sym_encrypted IBAN. Read via faktury_v view.';
