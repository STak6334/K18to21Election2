'use client';

import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, CircleAlert, CheckCircle2 } from 'lucide-react';
import { DATA_SOURCES, LAST_PIPELINE_RUN, type DataSource } from '../lib/methodology';
import type { ElectionRecord, RegionalRecord } from '../types/election';
import { useT } from './LanguageProvider';

type Status = 'pass' | 'warn' | 'fail';

interface Score {
  source: DataSource;
  completeness: number; // 0..100
  freshnessDays: number;
  freshnessPct: number; // 0..100 (100 = fresh; decays linearly over a year)
  schemaDrift: boolean;
  validationErrors: number;
  rowsActual: number;
  rowsExpected: number;
  status: Status;
}

interface Props {
  electionData: ElectionRecord[];
  regional: Record<string, RegionalRecord>;
  recountData?: { province: string; district: string; r1: number; r2: number; k_value: number; residual: number }[];
}

const EXPECTED_PROVINCES = 17;
const EXPECTED_DISTRICTS = 253;
const REFERENCE_DATE = new Date(LAST_PIPELINE_RUN.completedAt).getTime();

function daysBetween(a: number, b: number): number {
  return Math.max(0, Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

export default function QualityScorecard({ electionData, regional, recountData }: Props) {
  const t = useT();

  const scores = useMemo<Score[]>(() => {
    return DATA_SOURCES.map((src): Score => {
      let rowsActual = 0;
      let rowsExpected = 1;
      let validationErrors = 0;
      let schemaDrift = false;

      const cycleMap: Record<string, string> = {
        nec_18th: '18th',
        nec_19th: '19th',
        nec_20th: '20th',
        nec_21st: '21st',
      };
      const cycle = cycleMap[src.id];

      if (cycle) {
        const record = electionData.find((d) => d.Election === cycle);
        const regions = regional[cycle];
        rowsActual = (record ? 1 : 0) + (regions ? Object.keys(regions).length : 0);
        rowsExpected = 1 + EXPECTED_PROVINCES;
        if (record) {
          if (!record.Candidates || !record['Total Votes'] || !record.Turnout || !record.Voters) {
            schemaDrift = true;
          }
          if (!record.Candidates || Object.keys(record.Candidates).length === 0) {
            validationErrors += 1;
          }
        } else {
          validationErrors += 1;
        }
        if (regions) {
          for (const v of Object.values(regions)) {
            if (
              typeof v.Conservative !== 'number' ||
              typeof v.Democratic !== 'number' ||
              Number.isNaN(v.Conservative) ||
              Number.isNaN(v.Democratic)
            ) {
              validationErrors += 1;
            }
          }
        }
      } else if (src.id === 'recount_21st') {
        rowsActual = recountData?.length ?? 0;
        rowsExpected = src.rowCount ?? EXPECTED_DISTRICTS;
        if (recountData) {
          for (const r of recountData) {
            if (
              typeof r.k_value !== 'number' ||
              Number.isNaN(r.k_value) ||
              !Number.isFinite(r.k_value)
            ) {
              validationErrors += 1;
            }
            if (typeof r.r1 !== 'number' || typeof r.r2 !== 'number') {
              validationErrors += 1;
            }
          }
        } else {
          validationErrors += 1;
        }
      } else {
        rowsActual = 1;
        rowsExpected = 1;
      }

      const completeness = Math.min(100, Math.round((rowsActual / Math.max(1, rowsExpected)) * 100));

      const modified = new Date(src.lastModified).getTime();
      const ageDays = daysBetween(REFERENCE_DATE, modified);
      const freshnessPct = Math.max(0, Math.min(100, Math.round(100 - (ageDays / 365) * 100)));

      let status: Status = 'pass';
      if (completeness < 90 || validationErrors > 5 || schemaDrift || freshnessPct < 60) {
        status = 'warn';
      }
      if (completeness < 60 || validationErrors > 20) {
        status = 'fail';
      }

      return {
        source: src,
        completeness,
        freshnessDays: ageDays,
        freshnessPct,
        schemaDrift,
        validationErrors,
        rowsActual,
        rowsExpected,
        status,
      };
    });
  }, [electionData, regional, recountData]);

  const summary = scores.reduce(
    (acc, s) => {
      acc[s.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 } as Record<Status, number>,
  );

  return (
    <section
      aria-labelledby="quality-title"
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="quality-title" className="flex items-center gap-2 text-lg font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden />
            {t('quality.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{t('quality.description')}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <SummaryPill tone="emerald" label={t('quality.summary.pass')} count={summary.pass} />
          <SummaryPill tone="amber" label={t('quality.summary.warn')} count={summary.warn} />
          <SummaryPill tone="rose" label={t('quality.summary.fail')} count={summary.fail} />
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
        <table className="w-full text-left text-sm text-slate-300">
          <caption className="sr-only">{t('quality.detail.dataset')}</caption>
          <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('quality.dataset')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('quality.completeness')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('quality.freshness')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('quality.schemaDrift')}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t('quality.validationErrors')}
              </th>
              <th scope="col" className="px-4 py-3 text-center font-semibold">
                {t('quality.status')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {scores.map((s) => (
              <tr key={s.source.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-white">{s.source.name}</div>
                  <div className="font-mono text-[10px] text-slate-500">{s.source.id}</div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {s.completeness}%
                  <div className="text-[10px] text-slate-500">
                    {s.rowsActual}/{s.rowsExpected} {t('quality.rows')}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {s.freshnessPct}%
                  <div className="text-[10px] text-slate-500">
                    {s.freshnessDays} {t('quality.ageDays')}
                  </div>
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-mono ${
                    s.schemaDrift ? 'text-rose-300' : 'text-emerald-300'
                  }`}
                >
                  {s.schemaDrift ? t('quality.drift_detected') : t('quality.no_drift')}
                </td>
                <td
                  className={`px-4 py-2.5 text-right font-mono ${
                    s.validationErrors > 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  {s.validationErrors}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <StatusBadge status={s.status} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryPill({ tone, label, count }: { tone: 'emerald' | 'amber' | 'rose'; label: string; count: number }) {
  const classes: Record<typeof tone, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${classes[tone]}`}>
      {label}
      <span className="font-mono">{count}</span>
    </span>
  );
}

function StatusBadge({ status, t }: { status: Status; t: (k: any) => string }) {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> {t('quality.pass')}
      </span>
    );
  }
  if (status === 'warn') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
        <AlertTriangle className="h-3 w-3" aria-hidden /> {t('quality.warn')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/30">
      <CircleAlert className="h-3 w-3" aria-hidden /> {t('quality.fail')}
    </span>
  );
}
