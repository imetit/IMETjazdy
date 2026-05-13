-- Phase 1: RLS hardening
-- Refs: docs/superpowers/plans/2026-05-13-saas-security-hardening.md (Phase 1 Task 1.6)
--
-- Findings addressed:
--  - audit_log INSERT WITH CHECK (true): any authenticated user could insert
--    forged audit records, neutralizing the audit trail for compliance.
--  - audit_log lacks UPDATE/DELETE policies: users with elevated DB access
--    could tamper with history.
--  - notifikacie INSERT WITH CHECK (true): any user could spam notifications
--    to any other user.
--
-- IMPORTANT — applying this migration:
--  Apply via Supabase dashboard SQL editor or `supabase db push`.
--  After applying, verify:
--    1) Server actions (using service_role) still write audit/notifikacie OK
--    2) An authenticated REST call attempting to INSERT into audit_log fails
--    3) An authenticated REST call attempting to UPDATE audit_log fails

-- ── audit_log: tamper-proof ─────────────────────────────────────────
-- 1) Block direct INSERT from authenticated/anon (only server actions via
--    admin client / service_role can write, which bypasses RLS)
drop policy if exists "all_insert_audit" on audit_log;

-- 2) Explicit DENY for UPDATE (no policy = no access for non-service-role,
--    plus an explicit policy makes intent clear in audits)
drop policy if exists "audit_log_no_update" on audit_log;
create policy "audit_log_no_update" on audit_log
  for update using (false) with check (false);

-- 3) Explicit DENY for DELETE
drop policy if exists "audit_log_no_delete" on audit_log;
create policy "audit_log_no_delete" on audit_log
  for delete using (false);

-- 4) Hard immutability via trigger — blocks even service_role unless an
--    explicit session flag is set. Retention cron (Phase 4) will set this
--    flag inside a controlled function to allow age-based cleanup.
create or replace function audit_log_block_modify() returns trigger
language plpgsql
security definer
as $$
begin
  if current_setting('app.audit_maintenance', true) = 'allow' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  raise exception 'audit_log is immutable; UPDATE/DELETE blocked (set app.audit_maintenance=allow within a controlled function to override)';
end;
$$;

drop trigger if exists audit_log_immutable on audit_log;
create trigger audit_log_immutable
  before update or delete on audit_log
  for each row execute function audit_log_block_modify();

comment on trigger audit_log_immutable on audit_log is
  'Phase 1: blocks UPDATE/DELETE even from service_role. Retention cron must use a SECURITY DEFINER function that sets app.audit_maintenance=allow.';

-- ── notifikacie: anti-spam ──────────────────────────────────────────
drop policy if exists "all_insert_notifikacie" on notifikacie;

-- Authenticated users may only insert notifications for themselves
-- (typically: dismissing/marking-read flows). System/admin notifications
-- go through server actions using service_role which bypasses RLS.
create policy "users_insert_own_notifikacie" on notifikacie
  for insert with check (user_id = auth.uid());

-- ── Verification queries (for manual run after apply) ───────────────
-- These should all FAIL when run as an authenticated user via REST API:
--   INSERT INTO audit_log (user_id, akcia) VALUES (auth.uid(), 'tamper');
--   UPDATE audit_log SET akcia = 'tamper' WHERE id = '...';
--   DELETE FROM audit_log WHERE id = '...';
--   INSERT INTO notifikacie (user_id, typ, nadpis) VALUES ('<other-uuid>', 'spam', 'Hi');
-- And SUCCESS:
--   INSERT INTO notifikacie (user_id, typ, nadpis) VALUES (auth.uid(), 'self', 'Note');
