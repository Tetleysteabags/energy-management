import { capacityColor } from "@/lib/trends/capacity";

/** Illustrative 4-week capacity grid — not real user data. */
const SAMPLE_WEEKS: (number | null)[][] = [
  [5, 6, 4, 5, 3, 6, 7],
  [6, 5, null, 4, 5, 6, 6],
  [4, 3, 4, 5, 6, 5, 7],
  [6, 7, 5, null, 6, 6, 5],
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const LINE_VALUES = SAMPLE_WEEKS.flat().filter((v): v is number => v != null);

function linePoints(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = 0;
  const max = 10;
  const padY = 6;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = padY + ((max - value) / (max - min)) * (height - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function TrendsSamplePreview() {
  const width = 280;
  const height = 72;
  const points = linePoints(LINE_VALUES, width, height);

  return (
    <figure className="border-border/60 space-y-3 rounded-lg border bg-card px-3 py-3">
      <div className="space-y-2" aria-hidden>
        <div className="grid grid-cols-[auto_1fr] items-start gap-2">
          <div className="text-muted-foreground grid grid-rows-7 gap-1 pt-0.5 text-[10px] leading-none">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`} className="flex h-4 items-center">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {SAMPLE_WEEKS.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-1">
                {week.map((capacity, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="border-border/40 size-4 rounded-sm border"
                    style={{
                      backgroundColor:
                        capacity == null ? "transparent" : capacityColor(capacity),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="text-foreground/70 h-16 w-full"
          role="presentation"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      </div>

      <figcaption className="text-muted-foreground text-xs leading-relaxed">
        Sample only — a capacity calendar (tougher → steadier) and a quiet line over the same
        stretch. Your real Trends view looks like this after enough days are logged.
      </figcaption>
    </figure>
  );
}
