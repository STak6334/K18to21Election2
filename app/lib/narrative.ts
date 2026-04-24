// Auto-generated narrative insights for the Insight view. Plain functions —
// no framework, no side effects — so they can be tested without React.

import type { ElectionRecord, RegionalRecord } from '../types/election';
import { computeSwing, shortRegion } from './analytics';

export interface RegionalShift {
  region: string;
  netSwing: number;        // pp, Dem − Con
  democraticSwing: number; // pp
  conservativeSwing: number; // pp
}

export interface TurnoutExtremeRegion {
  // Turnout in the summary dataset is national only — so we use the two-block
  // "engagement coverage" proxy (Conservative+Democratic sum) which responds
  // to minor-party turnout effects. Documented in the methodology panel.
  region: string;
  previousCoverage: number; // %
  currentCoverage: number;  // %
  delta: number;            // percentage points
}

export interface PerformanceGap {
  region: string;
  winnerBlock: 'Democratic' | 'Conservative';
  currentShare: number;   // %
  historicalMean: number; // %
  gap: number;            // pp vs historical mean (positive = over-perform)
}

export interface NarrativePack {
  topShifts: RegionalShift[];
  turnoutExtremes: { up: TurnoutExtremeRegion[]; down: TurnoutExtremeRegion[] };
  performance: { over: PerformanceGap[]; under: PerformanceGap[] };
  winnerBlock: 'Democratic' | 'Conservative' | null;
  previousCycle: string | null;
  currentCycle: string;
}

const ALL_CYCLES = ['18th', '19th', '20th', '21st'] as const;

export function buildNarrative(
  electionData: ElectionRecord[],
  regional: Record<string, RegionalRecord>,
  currentCycle: string,
): NarrativePack {
  const idx = ALL_CYCLES.indexOf(currentCycle as typeof ALL_CYCLES[number]);
  const prev = idx > 0 ? ALL_CYCLES[idx - 1] : null;

  const topShifts: RegionalShift[] = [];
  if (prev) {
    const rows = computeSwing(regional, prev, currentCycle);
    topShifts.push(
      ...[...rows]
        .sort((a, b) => Math.abs(b.netSwing) - Math.abs(a.netSwing))
        .slice(0, 3)
        .map((r) => ({
          region: shortRegion(r.region),
          netSwing: r.netSwing,
          democraticSwing: r.democraticSwing,
          conservativeSwing: r.conservativeSwing,
        })),
    );
  }

  const turnoutExtremes = buildTurnoutExtremes(regional, currentCycle, prev);

  const currentElection = electionData.find((d) => d.Election === currentCycle);
  const winnerBlock = detectWinnerBlock(currentElection);

  const performance = buildPerformanceGaps(regional, currentCycle, winnerBlock);

  return {
    topShifts,
    turnoutExtremes,
    performance,
    winnerBlock,
    previousCycle: prev,
    currentCycle,
  };
}

function buildTurnoutExtremes(
  regional: Record<string, RegionalRecord>,
  currentCycle: string,
  prevCycle: string | null,
): { up: TurnoutExtremeRegion[]; down: TurnoutExtremeRegion[] } {
  if (!prevCycle) return { up: [], down: [] };
  const cur = regional[currentCycle];
  const prev = regional[prevCycle];
  if (!cur || !prev) return { up: [], down: [] };

  const rows: TurnoutExtremeRegion[] = Object.keys(cur)
    .filter((r) => prev[r])
    .map((r) => {
      const c = (cur[r].Conservative + cur[r].Democratic) * 100;
      const p = (prev[r].Conservative + prev[r].Democratic) * 100;
      return {
        region: shortRegion(r),
        previousCoverage: round(p, 2),
        currentCoverage: round(c, 2),
        delta: round(c - p, 2),
      };
    });

  const up = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 3);
  const down = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 3);
  return { up, down };
}

function detectWinnerBlock(election?: ElectionRecord): 'Democratic' | 'Conservative' | null {
  if (!election) return null;
  // Approximate: use candidate key party substring.
  const sorted = Object.entries(election.Candidates).sort((a, b) => b[1] - a[1]);
  const [topKey] = sorted[0] ?? [];
  if (!topKey) return null;
  if (
    topKey.includes('민주') ||
    topKey.includes('더불어민주당') ||
    topKey.includes('Democratic')
  ) {
    return 'Democratic';
  }
  if (
    topKey.includes('새누리') ||
    topKey.includes('자유한국') ||
    topKey.includes('국민의힘') ||
    topKey.includes('Conservative')
  ) {
    return 'Conservative';
  }
  return null;
}

function buildPerformanceGaps(
  regional: Record<string, RegionalRecord>,
  currentCycle: string,
  winnerBlock: 'Democratic' | 'Conservative' | null,
): { over: PerformanceGap[]; under: PerformanceGap[] } {
  if (!winnerBlock) return { over: [], under: [] };
  const cur = regional[currentCycle];
  if (!cur) return { over: [], under: [] };

  const pastCycles = ALL_CYCLES.filter((c) => c !== currentCycle && regional[c]);
  const rows: PerformanceGap[] = Object.keys(cur).map((r) => {
    const current = (cur[r][winnerBlock] ?? 0) * 100;
    const pastValues = pastCycles
      .map((c) => regional[c][r])
      .filter((v): v is RegionalRecord[string] => !!v)
      .map((v) => v[winnerBlock] * 100);
    const mean =
      pastValues.length > 0
        ? pastValues.reduce((s, x) => s + x, 0) / pastValues.length
        : current;
    return {
      region: shortRegion(r),
      winnerBlock,
      currentShare: round(current, 2),
      historicalMean: round(mean, 2),
      gap: round(current - mean, 2),
    };
  });

  const over = [...rows].sort((a, b) => b.gap - a.gap).slice(0, 3);
  const under = [...rows].sort((a, b) => a.gap - b.gap).slice(0, 3);
  return { over, under };
}

function round(v: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}
