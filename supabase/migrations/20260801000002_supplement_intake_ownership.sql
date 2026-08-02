-- daily_supplement_intake.supplement_id comes from the client, and the old
-- policies only checked user_id — so a crafted request could file an intake row
-- against another account's supplement. Require the referenced supplement to
-- belong to the caller as well.
--
-- The subquery reads public.supplements, whose own select policy already limits
-- rows to auth.uid(), so this cannot be used to probe other users' rows.

drop policy if exists "supplement_intake_insert_own" on public.daily_supplement_intake;

create policy "supplement_intake_insert_own"
  on public.daily_supplement_intake for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.supplements s
      where s.id = supplement_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "supplement_intake_update_own" on public.daily_supplement_intake;

create policy "supplement_intake_update_own"
  on public.daily_supplement_intake for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.supplements s
      where s.id = supplement_id
        and s.user_id = auth.uid()
    )
  );
