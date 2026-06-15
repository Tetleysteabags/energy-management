-- Slices 2–7: events, supplements, settings, crash rules, note tags, wearables, imports

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  llm_notes_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- supplements (user's regular stack)
-- ---------------------------------------------------------------------------
create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index supplements_user_idx on public.supplements (user_id) where is_active = true;

alter table public.supplements enable row level security;

create policy "supplements_select_own" on public.supplements for select using (auth.uid() = user_id);
create policy "supplements_insert_own" on public.supplements for insert with check (auth.uid() = user_id);
create policy "supplements_update_own" on public.supplements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supplements_delete_own" on public.supplements for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_supplement_intake
-- ---------------------------------------------------------------------------
create table public.daily_supplement_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  supplement_id uuid not null references public.supplements (id) on delete cascade,
  taken boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, log_date, supplement_id)
);

alter table public.daily_supplement_intake enable row level security;

create policy "supplement_intake_select_own" on public.daily_supplement_intake for select using (auth.uid() = user_id);
create policy "supplement_intake_insert_own" on public.daily_supplement_intake for insert with check (auth.uid() = user_id);
create policy "supplement_intake_update_own" on public.daily_supplement_intake for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supplement_intake_delete_own" on public.daily_supplement_intake for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- events (optional granular log)
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null,
  label text not null,
  duration_minutes smallint,
  intensity smallint,
  note text,
  created_at timestamptz not null default now(),
  constraint events_intensity_range check (intensity is null or intensity between 0 and 3)
);

create index events_user_time_idx on public.events (user_id, occurred_at desc);

alter table public.events enable row level security;

create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- crash_rule_versions (versioned crash definition)
-- ---------------------------------------------------------------------------
create table public.crash_rule_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  active_from date not null,
  match_mode text not null default 'any' check (match_mode in ('any', 'all')),
  pem_threshold smallint not null default 7,
  capacity_threshold smallint not null default 3,
  created_at timestamptz not null default now()
);

create index crash_rules_user_active_idx on public.crash_rule_versions (user_id, active_from desc);

alter table public.crash_rule_versions enable row level security;

create policy "crash_rules_select_own" on public.crash_rule_versions for select using (auth.uid() = user_id);
create policy "crash_rules_insert_own" on public.crash_rule_versions for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- day_crashes (computed crash days, tied to rule version)
-- ---------------------------------------------------------------------------
create table public.day_crashes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  crash_rule_version_id uuid not null references public.crash_rule_versions (id),
  created_at timestamptz not null default now(),
  unique (user_id, log_date, crash_rule_version_id)
);

alter table public.day_crashes enable row level security;

create policy "day_crashes_select_own" on public.day_crashes for select using (auth.uid() = user_id);
create policy "day_crashes_insert_own" on public.day_crashes for insert with check (auth.uid() = user_id);
create policy "day_crashes_delete_own" on public.day_crashes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- note_tags (LLM-derived, require confirmation)
-- ---------------------------------------------------------------------------
create table public.note_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid not null references public.daily_logs (id) on delete cascade,
  tag text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create index note_tags_log_idx on public.note_tags (daily_log_id);

alter table public.note_tags enable row level security;

create policy "note_tags_select_own" on public.note_tags for select using (auth.uid() = user_id);
create policy "note_tags_insert_own" on public.note_tags for insert with check (auth.uid() = user_id);
create policy "note_tags_update_own" on public.note_tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "note_tags_delete_own" on public.note_tags for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- watched_hypotheses (explore → pre-registered watch list)
-- ---------------------------------------------------------------------------
create table public.watched_hypotheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  predictor text not null,
  outcome text not null,
  lag_days smallint not null default 1,
  created_at timestamptz not null default now()
);

alter table public.watched_hypotheses enable row level security;

create policy "watched_hypotheses_select_own" on public.watched_hypotheses for select using (auth.uid() = user_id);
create policy "watched_hypotheses_insert_own" on public.watched_hypotheses for insert with check (auth.uid() = user_id);
create policy "watched_hypotheses_delete_own" on public.watched_hypotheses for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wearable_connections
-- ---------------------------------------------------------------------------
create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('mock', 'google_health')),
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'stale')),
  token_encrypted text,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.wearable_connections enable row level security;

create policy "wearable_connections_select_own" on public.wearable_connections for select using (auth.uid() = user_id);
create policy "wearable_connections_insert_own" on public.wearable_connections for insert with check (auth.uid() = user_id);
create policy "wearable_connections_update_own" on public.wearable_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wearable_connections_delete_own" on public.wearable_connections for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wearable_daily_metrics (read-only sync data)
-- ---------------------------------------------------------------------------
create table public.wearable_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  sleep_minutes smallint,
  resting_hr smallint,
  hrv_ms smallint,
  steps integer,
  spo2 smallint,
  skin_temp_c numeric(4, 1),
  source text not null default 'mock',
  created_at timestamptz not null default now(),
  unique (user_id, log_date, source)
);

alter table public.wearable_daily_metrics enable row level security;

create policy "wearable_metrics_select_own" on public.wearable_daily_metrics for select using (auth.uid() = user_id);
create policy "wearable_metrics_insert_own" on public.wearable_daily_metrics for insert with check (auth.uid() = user_id);
create policy "wearable_metrics_update_own" on public.wearable_daily_metrics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create user_settings + default crash rule on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.crash_rule_versions (user_id, active_from, match_mode, pem_threshold, capacity_threshold)
  values (new.id, current_date, 'any', 7, 3);
  return new;
end;
$$;

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger wearable_connections_set_updated_at
  before update on public.wearable_connections
  for each row execute function public.set_updated_at();

-- is_crash flag helper column on daily_logs for heatmap dot
alter table public.daily_logs
  add column if not exists is_crash boolean not null default false;
