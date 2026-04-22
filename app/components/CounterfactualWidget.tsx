'use client';

import { useMemo, useState } from 'react';
import { Beaker, TrendingUp, TrendingDown } from 'lucide-react';
import type { ElectionRecord, RegionalRecord } from '../types/election';
import { runCounterfactual, pctPoint } from '../lib/analytics';

interface Props {
  election: ElectionRecord;
  regional: Record<string, RegionalRecord>;
  electionKey: string;
}

export default function CounterfactualWidget({ election, regional, electionKey }: Props) {
  const regions = Object.keys(regional[electionKey] ?? {});
  const [region, setRegion] = useState<string>(regions[0] ?? '');
  const [turnoutBump, setTurnoutBump] = useState<number>(1.5);
  const [newVoterDemShare, setNewVoterDemShare] = useState<number>(0.55);

  const result = useMemo(
    () => runCounterfactual(election, regional, electionKey, region, turnoutBump, newVoterDemShare),
    [election, regional, electionKey, region, turnoutBump, newVoterDemShare],
  );

  return (
    <section
      aria-labelledby="counterfactual-heading"
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-6"
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
          <Beaker className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 id="counterfactual-heading" className="text-lg font-bold text-white">
            Counterfactual: turnout &amp; composition
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-3xl">
            Explore a simple what-if: if turnout rose by a given amount in one region, with a specified
            split of the incremental voters between the Democratic and Conservative blocks, how does the
            national two-block margin shift? This is a transparent linear model — see the assumptions
            printed below and consult the methodology panel for caveats.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="uppercase tracking-wider text-slate-500">Target region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="uppercase tracking-wider text-slate-500">
            Turnout bump: {turnoutBump.toFixed(1)} pp
          </span>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={turnoutBump}
            onChange={(e) => setTurnoutBump(parseFloat(e.target.value))}
            aria-valuemin={-5}
            aria-valuemax={5}
            aria-valuenow={turnoutBump}
            aria-label="Turnout bump in percentage points"
            className="accent-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="uppercase tracking-wider text-slate-500">
            New-voter Dem share: {(newVoterDemShare * 100).toFixed(0)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={newVoterDemShare}
            onChange={(e) => setNewVoterDemShare(parseFloat(e.target.value))}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={newVoterDemShare}
            aria-label="Share of new voters going to the Democratic block"
            className="accent-blue-500"
          />
        </label>
      </div>

      {result && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Stat label="Baseline Dem" value={`${result.baselineDemNational.toFixed(2)}%`} />
          <Stat label="Baseline Con" value={`${result.baselineConNational.toFixed(2)}%`} />
          <Stat
            label="Baseline margin"
            value={pctPoint(result.baselineMargin)}
            tone={result.baselineMargin >= 0 ? 'dem' : 'con'}
          />
          <Stat
            label="Shift"
            value={pctPoint(result.marginShift)}
            icon={result.marginShift >= 0 ? 'up' : 'down'}
            tone={result.marginShift >= 0 ? 'dem' : 'con'}
          />

          <Stat label="Adjusted Dem" value={`${result.adjustedDemNational.toFixed(2)}%`} />
          <Stat label="Adjusted Con" value={`${result.adjustedConNational.toFixed(2)}%`} />
          <Stat
            label="Adjusted margin"
            value={pctPoint(result.adjustedMargin)}
            tone={result.adjustedMargin >= 0 ? 'dem' : 'con'}
          />
          <Stat
            label="Outcome implied"
            value={
              (result.baselineMargin < 0 && result.adjustedMargin >= 0) ||
              (result.baselineMargin > 0 && result.adjustedMargin <= 0)
                ? 'Flip'
                : 'No flip'
            }
            tone={
              (result.baselineMargin < 0 && result.adjustedMargin >= 0) ||
              (result.baselineMargin > 0 && result.adjustedMargin <= 0)
                ? 'warn'
                : 'info'
            }
          />
        </div>
      )}

      {result && (
        <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-slate-400">
          <span className="font-bold text-amber-300">Assumptions:</span> {result.assumptions}
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = 'info',
}: {
  label: string;
  value: string;
  icon?: 'up' | 'down';
  tone?: 'info' | 'dem' | 'con' | 'warn';
}) {
  const color =
    tone === 'dem'
      ? 'text-blue-300'
      : tone === 'con'
        ? 'text-rose-300'
        : tone === 'warn'
          ? 'text-amber-300'
          : 'text-white';
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-lg font-bold ${color}`}>
        {icon === 'up' && <TrendingUp className="h-4 w-4" aria-hidden />}
        {icon === 'down' && <TrendingDown className="h-4 w-4" aria-hidden />}
        {value}
      </p>
    </div>
  );
}
