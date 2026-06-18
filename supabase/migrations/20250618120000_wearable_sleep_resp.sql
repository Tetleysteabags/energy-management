-- Sleep quality breakdown + overnight respiratory rate on wearable_daily_metrics

alter table public.wearable_daily_metrics
  add column if not exists sleep_wake_minutes smallint,
  add column if not exists sleep_efficiency numeric(4, 3),
  add column if not exists respiratory_rate numeric(4, 1);

alter table public.wearable_daily_metrics
  drop constraint if exists wearable_daily_metrics_sleep_efficiency_check;

alter table public.wearable_daily_metrics
  add constraint wearable_daily_metrics_sleep_efficiency_check
  check (sleep_efficiency is null or (sleep_efficiency >= 0 and sleep_efficiency <= 1));

alter table public.wearable_daily_metrics
  drop constraint if exists wearable_daily_metrics_respiratory_rate_check;

alter table public.wearable_daily_metrics
  add constraint wearable_daily_metrics_respiratory_rate_check
  check (respiratory_rate is null or (respiratory_rate >= 5 and respiratory_rate <= 40));
