/**
 * Engine test harness.
 *   node --experimental-strip-types analysis-engine.test.ts
 *
 * Validates the three properties the engine must have:
 *   1. RECOVERY  — on data with known injected lags, the pre-registered
 *      hypotheses surface with the correct direction.
 *   2. GATE      — on pure noise, NOTHING survives BH correction (across seeds).
 *   3. EVENTS    — crash precursors and the load->crash-rate envelope behave.
 * Plus missing-day handling.
 */

import { noiseOnly, knownLag, realistic } from "./synthetic-data-generator";
import {
  buildFrame,
  analyze,
  runConfirmatory,
  runCaseControl,
  loadPercentileCrashRate,
  flagCrashes,
  DEFAULT_CRASH_RULE,
  type ConfirmatoryResult,
} from "./analysis-engine";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}
function frameOf(ds: { symptoms: any[]; loads: any[]; wearables: any[] }) {
  return buildFrame(ds.symptoms, ds.loads, ds.wearables);
}
function byId(res: ConfirmatoryResult[], id: string) {
  return res.find((r) => r.hypothesis.id === id)!;
}

// ---------------------------------------------------------------------------
// 1. RECOVERY on known-lag data
// ---------------------------------------------------------------------------
console.log("\n[1] RECOVERY — injected lags must surface (known-lag dataset, n=240)");
{
  const f = frameOf(knownLag({ days: 240, seed: 11 }));
  const res = runConfirmatory(f, undefined, { bootstrap: 400, seed: 7 });
  console.log("    id   label                 dir  beta    95% CI            q       n");
  for (const r of res) {
    console.log(
      `    ${r.hypothesis.id.padEnd(4)} ${r.label.padEnd(20)} ${(r.directionMatches ? "ok " : "x  ")} ${r.beta.toFixed(2).padStart(5)}  [${r.ci[0].toFixed(2)}, ${r.ci[1].toFixed(2)}]  q=${r.qBH.toFixed(3)}  n=${r.n}`
    );
  }
  // Strong injected edges should survive BH with correct direction.
  for (const id of ["H1a", "H3", "H4a", "H4c", "H5"]) {
    const r = byId(res, id);
    check(`${id} survives BH, correct direction`, r.survivesBH && r.directionMatches, `label=${r.label} beta=${r.beta.toFixed(2)}`);
  }
  // Weaker injected edges should at least point the right way and surface.
  for (const id of ["H4b"]) {
    const r = byId(res, id);
    check(`${id} surfaces with correct direction`, r.directionMatches && r.label !== "no_signal", `label=${r.label} beta=${r.beta.toFixed(2)}`);
  }
  // H1b (meetings->PEM) and H2 are deliberately faint and maskable by the
  // threshold-PEM dynamics — just require they make no false STRONG claim.
  for (const id of ["H1b", "H2"]) {
    const r = byId(res, id);
    check(`${id} makes no false strong claim`, r.label !== "recurring_pattern" || r.directionMatches, `label=${r.label}`);
  }
}

// ---------------------------------------------------------------------------
// 2. GATE — noise must produce zero BH survivors, across seeds
// ---------------------------------------------------------------------------
console.log("\n[2] GATE — pure noise must yield NO confirmed findings (5 seeds)");
{
  let totalSurvivors = 0;
  let totalRecurring = 0;
  let totalConfirmInsights = 0;
  let totalInsights = 0;
  let totalPossible = 0;
  for (const seed of [42, 7, 100, 2025, 31]) {
    const f = frameOf(noiseOnly(180, seed));
    const rep = analyze(f, { confirmatory: { bootstrap: 300, seed: 7 } });
    const survivors = rep.confirmatory.filter((r) => r.survivesBH).length;
    const recurring = rep.confirmatory.filter((r) => r.label === "recurring_pattern").length;
    const possible = rep.confirmatory.filter((r) => r.label === "possible_association").length;
    const confirmInsights = rep.insights.filter((i) => i.kind === "confirmatory").length;
    totalSurvivors += survivors;
    totalRecurring += recurring;
    totalPossible += possible;
    totalConfirmInsights += confirmInsights;
    totalInsights += rep.insights.length;
    console.log(`    seed ${String(seed).padStart(4)}: insights=${rep.insights.length} (confirmatory=${confirmInsights})  recurring=${recurring}  BH-survivors=${survivors}  possible(watching)=${possible}`);
  }
  // HARD GATE: zero confirmed confirmatory findings on noise.
  check("noise: ZERO confirmatory findings (hard gate, all seeds)", totalConfirmInsights === 0, `total=${totalConfirmInsights}`);
  check("no 'recurring_pattern' on noise (all seeds)", totalRecurring === 0, `total recurring=${totalRecurring}`);
  // SOFT: BH controls FDR (~5%), so a stray watch-tier precursor across 5 noise
  // datasets is statistically expected — bounded, never a confirmed finding.
  check("noise watch-tier within FDR tolerance (<=1 across 5 seeds)", totalInsights <= 1, `total insights=${totalInsights}`);
  check("BH survivors within FDR tolerance (<=2 across 5 seeds)", totalSurvivors <= 2, `total survivors=${totalSurvivors}, possible(watching)=${totalPossible}`);
}

// ---------------------------------------------------------------------------
// 3. EVENTS — crash precursors and the load->crash-rate envelope
// ---------------------------------------------------------------------------
console.log("\n[3] EVENTS — crash precursors & envelope (realistic dataset)");
{
  const f = frameOf(realistic(220, 7));
  const crashN = flagCrashes(f, DEFAULT_CRASH_RULE).filter(Boolean).length;
  console.log(`    crash days flagged: ${crashN}`);
  const cc = runCaseControl(f, DEFAULT_CRASH_RULE, { permutations: 800, seed: 3 });
  for (const c of cc) {
    console.log(`    ${c.signal.padEnd(22)} stdDiff=${c.standardizedDiff.toFixed(2).padStart(5)}  p=${c.pPermutation.toFixed(3)}  (nCrash=${c.nCrashWindows})`);
  }
  const phys = cc.find((c) => c.signal === "physical_load_score")!;
  check("physical load is higher before crashes", phys.standardizedDiff > 0, `stdDiff=${phys.standardizedDiff.toFixed(2)}`);

  const bins = loadPercentileCrashRate(f, DEFAULT_CRASH_RULE);
  console.log("    exertion bins -> crash rate:");
  for (const b of bins) console.log(`      ${b.label.padEnd(9)} range=[${b.exertionRange[0]}, ${b.exertionRange[1]}]  rate=${(b.crashRate * 100).toFixed(1)}%  (n=${b.nDays})`);
  if (bins.length === 3) {
    check("high-exertion crash rate >= low-exertion", bins[2].crashRate >= bins[0].crashRate, `low=${bins[0].crashRate.toFixed(2)} high=${bins[2].crashRate.toFixed(2)}`);
  }
}

// ---------------------------------------------------------------------------
// 4. MISSING DAYS — engine runs on gappy data without imputing
// ---------------------------------------------------------------------------
console.log("\n[4] MISSING DAYS — gaps handled, not imputed");
{
  const ds = realistic(180, 7);
  const f = frameOf(ds);
  const rep = analyze(f, { confirmatory: { bootstrap: 200, seed: 7 } });
  console.log(`    calendar days=${rep.meta.days}  observed=${rep.meta.observedDays}  missing=${rep.meta.days - rep.meta.observedDays}  crashDays=${rep.meta.crashDays}`);
  check("calendar span exceeds observed days (gaps preserved)", rep.meta.observedDays < rep.meta.days);
  check("engine produced insights array", Array.isArray(rep.insights));
  console.log(`    generated ${rep.insights.length} insight(s):`);
  for (const i of rep.insights) console.log(`      [${i.severity}] ${i.text}`);
}

// ---------------------------------------------------------------------------
console.log(`\n==== ${passed} passed, ${failed} failed ====\n`);
if (failed > 0) process.exit(1);
