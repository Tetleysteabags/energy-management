-- Optional cycle / period tracking (opt-in via user_settings.track_cycle)

alter table public.user_settings
  add column if not exists track_cycle boolean not null default false;

alter table public.daily_logs
  add column if not exists on_period boolean not null default false;
