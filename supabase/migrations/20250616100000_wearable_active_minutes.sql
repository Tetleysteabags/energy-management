-- Active minutes on wearable_daily_metrics (daytime window on log_date D)

alter table public.wearable_daily_metrics
  add column if not exists active_minutes smallint;
