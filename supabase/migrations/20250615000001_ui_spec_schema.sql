-- Align daily_logs with ui-ux-spec.md (0–10 symptoms, 0–3 loads, booleans, capacity)

alter table public.daily_logs
  add column if not exists capacity smallint,
  add column if not exists pem smallint,
  add column if not exists alcohol boolean not null default false,
  add column if not exists alcohol_units smallint,
  add column if not exists late_caffeine boolean not null default false,
  add column if not exists late_meal boolean not null default false;

-- Drop old 1–10 load constraints and widen symptom range to 0–10
alter table public.daily_logs drop constraint if exists daily_logs_sleep_quality_range;
alter table public.daily_logs drop constraint if exists daily_logs_rested_score_range;
alter table public.daily_logs drop constraint if exists daily_logs_morning_fatigue_range;
alter table public.daily_logs drop constraint if exists daily_logs_morning_brain_fog_range;
alter table public.daily_logs drop constraint if exists daily_logs_morning_pain_range;
alter table public.daily_logs drop constraint if exists daily_logs_morning_dysautonomia_range;
alter table public.daily_logs drop constraint if exists daily_logs_physical_load_range;
alter table public.daily_logs drop constraint if exists daily_logs_cognitive_load_range;
alter table public.daily_logs drop constraint if exists daily_logs_social_load_range;
alter table public.daily_logs drop constraint if exists daily_logs_evening_fatigue_range;
alter table public.daily_logs drop constraint if exists daily_logs_evening_brain_fog_range;
alter table public.daily_logs drop constraint if exists daily_logs_evening_pain_range;

alter table public.daily_logs
  add constraint daily_logs_sleep_quality_range
    check (sleep_quality is null or sleep_quality between 0 and 10),
  add constraint daily_logs_rested_score_range
    check (rested_score is null or rested_score between 0 and 10),
  add constraint daily_logs_morning_fatigue_range
    check (morning_fatigue is null or morning_fatigue between 0 and 10),
  add constraint daily_logs_morning_brain_fog_range
    check (morning_brain_fog is null or morning_brain_fog between 0 and 10),
  add constraint daily_logs_morning_pain_range
    check (morning_pain is null or morning_pain between 0 and 10),
  add constraint daily_logs_morning_dysautonomia_range
    check (morning_dysautonomia is null or morning_dysautonomia between 0 and 10),
  add constraint daily_logs_physical_load_range
    check (physical_load is null or physical_load between 0 and 3),
  add constraint daily_logs_cognitive_load_range
    check (cognitive_load is null or cognitive_load between 0 and 3),
  add constraint daily_logs_social_load_range
    check (social_load is null or social_load between 0 and 3),
  add constraint daily_logs_evening_fatigue_range
    check (evening_fatigue is null or evening_fatigue between 0 and 10),
  add constraint daily_logs_evening_brain_fog_range
    check (evening_brain_fog is null or evening_brain_fog between 0 and 10),
  add constraint daily_logs_evening_pain_range
    check (evening_pain is null or evening_pain between 0 and 10),
  add constraint daily_logs_capacity_range
    check (capacity is null or capacity between 0 and 10),
  add constraint daily_logs_pem_range
    check (pem is null or pem between 0 and 10),
  add constraint daily_logs_alcohol_units_range
    check (alcohol_units is null or alcohol_units between 0 and 20);
