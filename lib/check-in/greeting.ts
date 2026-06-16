/** Time-of-day greeting. Pure so both server (SSR fallback) and client can use it. */
export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
