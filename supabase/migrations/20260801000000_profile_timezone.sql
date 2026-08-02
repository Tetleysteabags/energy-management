-- Log dates are calendar days in the user's timezone, so profiles.timezone is
-- now read at runtime rather than being decorative.
--
-- The old 'Europe/Nicosia' default silently gave every new account the author's
-- zone. Unknown must mean unknown: the app falls back to UTC and the browser
-- reports the real zone on first load.

alter table public.profiles alter column timezone drop default;
alter table public.profiles alter column timezone drop not null;

comment on column public.profiles.timezone is
  'IANA timezone reported by the browser. Null until first sign-in; readers fall back to UTC.';
