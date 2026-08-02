-- Somewhere for failures to land, so a broken app does not depend on a user
-- thinking to mention it.
--
-- Deliberately write-only from the app's point of view: there is no select
-- policy, so no account can read these rows through the anon key. The operator
-- reads them in the Supabase dashboard, which uses the service role.

create table public.error_reports (
  id uuid primary key default gen_random_uuid(),
  -- Cascades so erasing an account erases its diagnostics too, matching what
  -- the privacy notice promises.
  user_id uuid references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  -- Next.js error digest; ties a user-facing report to the server log line.
  digest text,
  message text not null,
  route text,
  user_agent text,
  release text,

  -- Bounds on anything a client can influence, so a hostile caller cannot use
  -- this table as free storage.
  constraint error_reports_message_len check (char_length(message) <= 2000),
  constraint error_reports_route_len check (route is null or char_length(route) <= 512),
  constraint error_reports_digest_len check (digest is null or char_length(digest) <= 128),
  constraint error_reports_user_agent_len check (user_agent is null or char_length(user_agent) <= 512),
  constraint error_reports_release_len check (release is null or char_length(release) <= 128)
);

create index error_reports_occurred_idx on public.error_reports (occurred_at desc);

alter table public.error_reports enable row level security;

-- Insert only, and only ever attributed to yourself (or to nobody, for
-- failures on signed-out pages). No select, update or delete policy exists.
create policy "error_reports_insert_own"
  on public.error_reports for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

comment on table public.error_reports is
  'Write-only crash log. No select policy by design — read it from the Supabase dashboard.';
