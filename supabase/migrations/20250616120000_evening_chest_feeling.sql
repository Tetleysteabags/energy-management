-- Evening chest feeling (tight/heaviness), split from muscle-level pain.
alter table public.daily_logs
  add column if not exists evening_chest_feeling smallint;

alter table public.daily_logs
  drop constraint if exists daily_logs_evening_chest_feeling_range;

alter table public.daily_logs
  add constraint daily_logs_evening_chest_feeling_range
    check (evening_chest_feeling is null or evening_chest_feeling between 0 and 10);
