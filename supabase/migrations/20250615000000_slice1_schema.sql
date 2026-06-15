-- Slice 1: profiles + daily check-in logs (ui-ux-spec.md aligned)
-- Symptoms/capacity: 0–10. Loads: 0–3. Apply in Supabase SQL editor or via supabase db push.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/Nicosia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- daily_logs — one row per user per calendar day
-- ---------------------------------------------------------------------------
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,

  -- Morning check-in (symptoms 0–10)
  sleep_quality smallint,
  sleep_hours numeric(3, 1),
  rested_score smallint,
  morning_fatigue smallint,
  morning_brain_fog smallint,
  morning_pain smallint,
  morning_dysautonomia smallint,
  morning_submitted_at timestamptz,

  -- Evening check-in (loads 0–3, symptoms 0–10)
  physical_load smallint,
  cognitive_load smallint,
  social_load smallint,
  capacity smallint,
  evening_fatigue smallint,
  evening_brain_fog smallint,
  evening_pain smallint,
  pem smallint,
  alcohol boolean not null default false,
  alcohol_units smallint,
  late_caffeine boolean not null default false,
  late_meal boolean not null default false,
  notes text,
  evening_submitted_at timestamptz,

  is_excluded boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, log_date),

  constraint daily_logs_sleep_quality_range
    check (sleep_quality is null or sleep_quality between 0 and 10),
  constraint daily_logs_rested_score_range
    check (rested_score is null or rested_score between 0 and 10),
  constraint daily_logs_morning_fatigue_range
    check (morning_fatigue is null or morning_fatigue between 0 and 10),
  constraint daily_logs_morning_brain_fog_range
    check (morning_brain_fog is null or morning_brain_fog between 0 and 10),
  constraint daily_logs_morning_pain_range
    check (morning_pain is null or morning_pain between 0 and 10),
  constraint daily_logs_morning_dysautonomia_range
    check (morning_dysautonomia is null or morning_dysautonomia between 0 and 10),
  constraint daily_logs_physical_load_range
    check (physical_load is null or physical_load between 0 and 3),
  constraint daily_logs_cognitive_load_range
    check (cognitive_load is null or cognitive_load between 0 and 3),
  constraint daily_logs_social_load_range
    check (social_load is null or social_load between 0 and 3),
  constraint daily_logs_evening_fatigue_range
    check (evening_fatigue is null or evening_fatigue between 0 and 10),
  constraint daily_logs_evening_brain_fog_range
    check (evening_brain_fog is null or evening_brain_fog between 0 and 10),
  constraint daily_logs_evening_pain_range
    check (evening_pain is null or evening_pain between 0 and 10),
  constraint daily_logs_capacity_range
    check (capacity is null or capacity between 0 and 10),
  constraint daily_logs_pem_range
    check (pem is null or pem between 0 and 10),
  constraint daily_logs_alcohol_units_range
    check (alcohol_units is null or alcohol_units between 0 and 20),
  constraint daily_logs_sleep_hours_range
    check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24))
);

create index daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);

alter table public.daily_logs enable row level security;

create policy "daily_logs_select_own"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "daily_logs_insert_own"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "daily_logs_update_own"
  on public.daily_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_logs_delete_own"
  on public.daily_logs for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
