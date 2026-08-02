/** Patient-facing explanation of how insights are computed. Keep calm and short. */
export const INSIGHT_METHOD = {
  short:
    "Not machine learning or AI — lagged statistical associations on a fixed list of questions.",
  detail: [
    "Insights are not machine learning, not an LLM, and not a free search for every correlation.",
    "A small, fixed set of next-day questions is tested with ordinary statistics (for example meeting load → next-day fatigue). Each test looks at yesterday → today, accounts for how you felt the day before, and stays labelled cautiously — possible pattern or collecting data, never proof of cause.",
    "Same-day load and same-day symptoms are never treated as confirmatory evidence.",
  ],
} as const;
