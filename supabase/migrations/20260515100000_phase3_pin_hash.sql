-- Phase 3: PIN hash + 6-digit + separate profile_pins table
-- Refs: docs/superpowers/plans/2026-05-13-saas-security-hardening.md (Phase 3 Task 3.3)
--
-- Previous state:
--   profiles.pin (varchar(4), plaintext) — readable cez RLS self-read
--   PIN generated via Math.random (predikovateľné)
--   PIN sent in notifikacia.sprava plaintext
--   4-digit (9000 kombinácií = brute-force za sekundy bez rate-limit)
--
-- After this migration:
--   profile_pins.pin_hash (bcrypt cost ≥10)
--   6-digit generated via crypto.randomInt (CSPRNG)
--   Rate-limit (5/5min IP) v identifyByPin (Phase 3 Task 3.2 — už hotové)
--   Backwards-compat: ak nový hash neexistuje, fallback na profiles.pin plaintext
--   Po validačnom okne (1-2 týždne) → druhá migrácia: drop profiles.pin
--
-- USER ACTION: po aplikácii treba postupne resetovať PINy všetkým aktívnym
-- zamestnancom cez /admin/zamestnanci/<id> → "Reset PIN" — alebo bulk akciou.

create table if not exists profile_pins (
  user_id uuid primary key references profiles(id) on delete cascade,
  pin_hash text not null,
  pin_length smallint not null default 6 check (pin_length in (4, 6)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_pins_updated on profile_pins(updated_at);

alter table profile_pins enable row level security;
drop policy if exists "no_access" on profile_pins;
create policy "no_access" on profile_pins for all using (false) with check (false);
-- Aplikácia pristupuje IBA cez admin klient (service_role), ktorý bypass-uje RLS.
-- Žiadny user-scoped klient nesmie čítať pin_hash → bcrypt sa robí v server actione.

comment on table profile_pins is
  'Phase 3: bcrypt-hashed tablet PINs, separately from profiles. RLS denies all client access; only service_role (via createSupabaseAdmin in server actions) reads pin_hash for compare. profiles.pin plaintext column zostáva pre backwards-compat počas cutover.';
