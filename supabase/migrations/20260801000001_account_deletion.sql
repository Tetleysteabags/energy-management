-- Right to erasure (GDPR Art. 17) plus the RLS gaps that blocked it.
--
-- Every table cascades from auth.users, so removing the auth row clears the
-- lot. Deletion runs as a security-definer function rather than through the
-- admin API so the service-role key never has to exist in a request path.

-- ---------------------------------------------------------------------------
-- Missing policies — a user could not delete these rows even via the app
-- ---------------------------------------------------------------------------
create policy "wearable_metrics_delete_own"
  on public.wearable_daily_metrics for delete
  using (auth.uid() = user_id);

create policy "crash_rules_update_own"
  on public.crash_rule_versions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "crash_rules_delete_own"
  on public.crash_rule_versions for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- day_crashes referenced crash_rule_versions with no cascade, so a user-level
-- delete could fail on foreign key order.
-- ---------------------------------------------------------------------------
alter table public.day_crashes
  drop constraint if exists day_crashes_crash_rule_version_id_fkey;

alter table public.day_crashes
  add constraint day_crashes_crash_rule_version_id_fkey
    foreign key (crash_rule_version_id)
    references public.crash_rule_versions (id)
    on delete cascade;

-- ---------------------------------------------------------------------------
-- delete_own_account — erases the caller and everything cascading from them
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Cascades clear profiles, daily_logs, events, supplements, settings,
  -- crash rules, note tags, watched hypotheses and every wearable row.
  delete from auth.users where id = caller;
end;
$$;

-- Only a signed-in user may call it, and only ever for themselves.
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes the calling user and all their data. Takes no arguments by design — it can only ever act on auth.uid().';
