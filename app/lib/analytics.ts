// Derived analytics: swing, counterfactual, anomaly detection, CSV helpers.
// Kept framework-free so it can be unit-tested in isolation.

import type { ElectionRecord, RegionalRecord } from '../types/election';

export type Block = 'Conservative' | 'Democratic';

export interface SwingRow {
  region: string;
  from: string;
  to: string;
  conservativeSwing: number; // percentage points
  democraticSwing: number;   // percentage points
  netSwing: number;          // Democratic − Conservative swing
}

// Compute region-level swing (percentage-point change) between two cycles.
export function computeSwing(
  regional: Record<string, RegionalRecord>,
  fromElection: string,
  toElection: string,
): SwingRow[] {
  const from = regional[fromElection];
  const to = regional[toElection];
  if (!from || !to) return [];

  const regions = Object.keys(to).filter((r) => from[r]);
  return regions.map((region) => {
    const cSwing = (to[region].Conservative - from[region].Conservative) * 100;
    const dSwing = (to[region].Democratic - from[region].Democratic) * 100;
    return {
      region,
      from: fromElection,
      to: toElection,
      conservativeSwing: round(cSwing, 2),
      democraticSwing: round(dSwing, 2),
      netSwing: round(dSwing - cSwing, 2),
    };
  });
}

// Short region label (strip 특별시/광역시/도 suffixes).
export function shortRegion(region: string): string {
  return region.replace(/특별자치시|특별자치도|광역시|특별시|도$/g, '') || region;
}

// Turnout decomposition: for the selected election, split each region's share
// of the national electorate and its share of national ballots cast, and
// report the gap (positive = region overperformed national turnout).
export interface TurnoutDecompRow {
  region: string;
  eligibleShare: number;   // % of national eligible voters in this region (proxy: equal-weighted since per-region voters not in dataset)
  turnoutRate: number;     // % turnout in the region (proxy from Conservative+Democratic sum vs 1 for now)
  deltaVsNational: number; // percentage points
}

// The regional summary only has vote-share blocks, not raw turnout.
// We expose a two-block "Conservative+Democratic coverage" as a proxy for
// "two-party engagement" in a region — honest about what the data supports.
export function computeTwoBlockCoverage(
  regional: Record<string, RegionalRecord>,
  election: string,
): { region: string; twoBlock: number }[] {
  const rec = regional[election];
  if (!rec) return [];
  return Object.entries(rec).map(([region, shares]) => ({
    region,
    twoBlock: round((shares.Conservative + shares.Democratic) * 100, 2),
  }));
}

// Counterfactual: if the Democratic block's turnout effectively rose by
// `pctPoints` in `targetRegion` (with a plausible split of the new voters),
// how does the national two-block margin shift?
//
// Model: treat the incremental voters as splitting by `newVoterDemShare` for
// Democratic and (1 − newVoterDemShare) for Conservative. This is a plain,
// transparent linear model — we show the assumptions in the UI.
export interface CounterfactualResult {
  baselineDemNational: number;     // %
  baselineConNational: number;     // %
  baselineMargin: number;          // pp (Dem − Con)
  adjustedDemNational: number;
  adjustedConNational: number;
  adjustedMargin: number;          // pp (Dem − Con)
  marginShift: number;             // pp
  assumptions: string;
}

export function runCounterfactual(
  election: ElectionRecord,
  regional: Record<string, RegionalRecord>,
  electionKey: string,
  targetRegion: string,
  turnoutBumpPp: number,
  newVoterDemShare: number,
): CounterfactualResult | null {
  const rec = regional[electionKey];
  if (!rec || !rec[targetRegion]) return null;

  // Approximate regional electorate weight by an equal split across 17 regions
  // if we don't have per-region Voters in the dataset. This is a simplification
  // and is shown to the user.
  const regions = Object.keys(rec);
  const regionWeight = 1 / regions.length;

  const baseDem = avgBlock(rec, 'Democratic') * 100;
  const baseCon = avgBlock(rec, 'Conservative') * 100;

  // Adjusted Dem share in target region: mix baseline turnout voters with the
  // bump. With a pp bump, the block share moves by approximately:
  //   delta_dem = turnoutBumpPp/100 * (newVoterDemShare − current Dem share)
  const curDem = rec[targetRegion].Democratic;
  const curCon = rec[targetRegion].Conservative;
  const bump = turnoutBumpPp / 100;
  const deltaDem = bump * (newVoterDemShare - curDem);
  const deltaCon = bump * ((1 - newVoterDemShare) - curCon);

  const adjDem = (curDem + deltaDem) * 100;
  const adjCon = (curCon + deltaCon) * 100;

  // National-level mix: replace target region contribution with its adjusted
  // shares, keep others.
  const adjNationalDem =
    (baseDem - regionWeight * curDem * 100) + regionWeight * adjDem;
  const adjNationalCon =
    (baseCon - regionWeight * curCon * 100) + regionWeight * adjCon;

  return {
    baselineDemNational: round(baseDem, 2),
    baselineConNational: round(baseCon, 2),
    baselineMargin: round(baseDem - baseCon, 2),
    adjustedDemNational: round(adjNationalDem, 2),
    adjustedConNational: round(adjNationalCon, 2),
    adjustedMargin: round(adjNationalDem - adjNationalCon, 2),
    marginShift: round((adjNationalDem - adjNationalCon) - (baseDem - baseCon), 2),
    assumptions: `Regional electorate weight approximated as equal across ${regions.length} regions (no per-region Voters in summary). Incremental voters assumed to split ${(newVoterDemShare * 100).toFixed(0)}% Dem / ${((1 - newVoterDemShare) * 100).toFixed(0)}% Con.`,
  };
}

function avgBlock(rec: RegionalRecord, block: Block): number {
  const entries = Object.values(rec);
  if (!entries.length) return 0;
  return entries.reduce((s, v) => s + v[block], 0) / entries.length;
}

// Anomaly flags for the recount dataset.
export interface AnomalyRow {
  province: string;
  district: string;
  k: number;
  residual: number;
  r1Pct: number;
  r2Pct: number;
  lower95: number;
  upper95: number;
  severity: 'info' | 'watch' | 'review' | 'critical';
  reasons: string[];
  outsideBand: boolean;
}

export function detectAnomalies(
  rows: Array<{
    province: string;
    district: string;
    r1: number;
    r2: number;
    k_value: number;
    residual: number;
    lower_95_pi?: number;
    upper_95_pi?: number;
  }>,
): AnomalyRow[] {
  return rows.map((d) => {
    const reasons: string[] = [];
    let severity: AnomalyRow['severity'] = 'info';

    if (d.k_value >= 1.5) {
      reasons.push('K ≥ 1.5 (high ratio — absentee pool materially overperforms in-precinct)');
      severity = 'critical';
    } else if (d.k_value >= 1.2) {
      reasons.push('K ≥ 1.2 (elevated)');
      if (severity === 'info') severity = 'review';
    } else if (d.k_value <= 0.5) {
      reasons.push('K ≤ 0.5 (absentee pool materially underperforms in-precinct)');
      severity = 'critical';
    }

    if (Math.abs(d.residual) >= 0.05) {
      reasons.push(`|residual| ≥ 5 pp`);
      if (severity !== 'critical') severity = 'review';
    } else if (Math.abs(d.residual) >= 0.03) {
      reasons.push(`|residual| ≥ 3 pp`);
      if (severity === 'info') severity = 'watch';
    }

    const outsideBand =
      d.lower_95_pi != null &&
      d.upper_95_pi != null &&
      (d.r2 < d.lower_95_pi || d.r2 > d.upper_95_pi);
    if (outsideBand) {
      reasons.push('R2 outside 95% prediction band');
      if (severity !== 'critical') severity = 'review';
    }

    return {
      province: d.province,
      district: d.district,
      k: d.k_value,
      residual: d.residual,
      r1Pct: d.r1 * 100,
      r2Pct: d.r2 * 100,
      lower95: (d.lower_95_pi ?? 0) * 100,
      upper95: (d.upper_95_pi ?? 0) * 100,
      severity,
      reasons,
      outsideBand,
    };
  });
}

// CSV helpers for per-chart download.
// Uses CRLF line endings (Excel convention) so cells don't bleed across rows
// when the file is opened on Windows.
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Any field containing comma, quote, CR, or LF must be quoted.
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map(escape).join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(',')).join('\r\n');
  return `${header}\r\n${body}\r\n`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>, columns?: string[]) {
  const csv = toCsv(rows, columns);
  // Prepend UTF-8 BOM so Excel on Windows (Korean/Japanese locales) detects
  // the encoding instead of falling back to the system codepage — otherwise
  // Hangul and other non-ASCII characters render as mojibake (e.g. ëŒ€êµ¬).
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function round(v: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

export function pctPoint(v: number, digits = 2): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)} pp`;
}

// Unused warning suppression for Block type re-export consumers.
export type { ElectionRecord };
