'use client';

import { useMemo } from 'react';
import { Sparkles, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import type { ElectionRecord, RegionalRecord } from '../types/election';
import { buildNarrative } from '../lib/narrative';
import { useT } from './LanguageProvider';

interface Props {
  electionData: ElectionRecord[];
  regional: Record<string, RegionalRecord>;
  currentCycle: string;
}

export default function NarrativePanel({ electionData, regional, currentCycle }: Props) {
  const t = useT();
  const pack = useMemo(
    () => buildNarrative(electionData, regional, currentCycle),
    [electionData, regional, currentCycle],
  );

  if (!pack.previousCycle) {
    return (
      <section
        aria-labelledby="narrative-title"
        className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur"
      >
        <h2 id="narrative-title" className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
          <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
          {t('narrative.title')}
        </h2>
        <p className="text-sm text-slate-400">{t('narrative.noData')}</p>
      </section>
    );
  }

  const hasShifts = pack.topShifts.length > 0;
  const hasTurnout = pack.turnoutExtremes.up.length > 0 || pack.turnoutExtremes.down.length > 0;
  const hasPerf = pack.performance.over.length > 0 || pack.performance.under.length > 0;

  return (
    <section
      aria-labelledby="narrative-title"
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="narrative-title" className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
            {t('narrative.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{t('narrative.description')}</p>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          aria-label={`${t('narrative.sinceLastCycle')} ${pack.previousCycle} → ${pack.currentCycle}`}
        >
          {pack.previousCycle} → {pack.currentCycle}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Top shifts */}
        <Block
          title={t('narrative.topShifts')}
          empty={!hasShifts}
          icon={<Activity className="h-3.5 w-3.5 text-blue-300" aria-hidden />}
        >
          <ul className="space-y-1.5 text-xs">
            {pack.topShifts.map((s) => (
              <li key={s.region} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1 last:border-0">
                <span className="text-slate-300">{s.region}</span>
                <span
                  className={`font-mono font-semibold ${
                    s.netSwing >= 0 ? 'text-blue-300' : 'text-rose-300'
                  }`}
                  aria-label={
                    s.netSwing >= 0 ? t('narrative.shiftToDem') : t('narrative.shiftToCon')
                  }
                >
                  {s.netSwing >= 0 ? '+' : ''}
                  {s.netSwing.toFixed(2)} pp
                </span>
              </li>
            ))}
          </ul>
        </Block>

        {/* Turnout extremes */}
        <Block
          title={t('narrative.turnoutExtremes')}
          empty={!hasTurnout}
          icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" aria-hidden />}
        >
          <ul className="space-y-1.5 text-xs">
            {pack.turnoutExtremes.up.slice(0, 2).map((r) => (
              <li key={`up-${r.region}`} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ArrowUpRight className="h-3 w-3 text-emerald-300" aria-hidden />
                  {r.region}
                </span>
                <span className="font-mono font-semibold text-emerald-300">+{r.delta.toFixed(2)} pp</span>
              </li>
            ))}
            {pack.turnoutExtremes.down.slice(0, 2).map((r) => (
              <li key={`down-${r.region}`} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ArrowDownRight className="h-3 w-3 text-rose-300" aria-hidden />
                  {r.region}
                </span>
                <span className="font-mono font-semibold text-rose-300">{r.delta.toFixed(2)} pp</span>
              </li>
            ))}
          </ul>
        </Block>

        {/* Performance gaps */}
        <Block
          title={pack.winnerBlock === 'Democratic' ? t('narrative.overPerform') : t('narrative.overPerform')}
          empty={!hasPerf}
          icon={<ArrowUpRight className="h-3.5 w-3.5 text-amber-300" aria-hidden />}
        >
          <ul className="space-y-1.5 text-xs">
            {pack.performance.over.slice(0, 2).map((r) => (
              <li key={`over-${r.region}`} className="flex items-center justify-between gap-2">
                <span className="text-slate-300">{r.region}</span>
                <span className="font-mono font-semibold text-amber-300">+{r.gap.toFixed(2)} pp</span>
              </li>
            ))}
            {pack.performance.under.slice(0, 2).map((r) => (
              <li key={`under-${r.region}`} className="flex items-center justify-between gap-2">
                <span className="text-slate-300">{r.region}</span>
                <span className="font-mono font-semibold text-slate-400">{r.gap.toFixed(2)} pp</span>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </section>
  );
}

function Block({
  title,
  children,
  empty,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {icon}
        {title}
      </p>
      {empty ? <p className="text-xs text-slate-500">—</p> : children}
    </div>
  );
}
