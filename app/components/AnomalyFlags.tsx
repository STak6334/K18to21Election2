'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Flag, Download } from 'lucide-react';
import { detectAnomalies, downloadCsv, type AnomalyRow } from '../lib/analytics';

interface Props {
  recountRows: Array<{
    province: string;
    district: string;
    r1: number;
    r2: number;
    k_value: number;
    residual: number;
    lower_95_pi?: number;
    upper_95_pi?: number;
  }>;
}

const SEVERITY_STYLE: Record<AnomalyRow['severity'], { bg: string; text: string; label: string }> = {
  info: { bg: 'bg-slate-500/10', text: 'text-slate-300', label: 'OK' },
  watch: { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'Watch' },
  review: { bg: 'bg-orange-500/15', text: 'text-orange-300', label: 'Review' },
  critical: { bg: 'bg-rose-500/20', text: 'text-rose-300', label: 'Critical' },
};

export default function AnomalyFlags({ recountRows }: Props) {
  const [minSeverity, setMinSeverity] = useState<AnomalyRow['severity']>('watch');
  const all = useMemo(() => detectAnomalies(recountRows), [recountRows]);

  const order: AnomalyRow['severity'][] = ['info', 'watch', 'review', 'critical'];
  const threshold = order.indexOf(minSeverity);

  const filtered = all
    .filter((a) => order.indexOf(a.severity) >= threshold)
    .sort((a, b) => order.indexOf(b.severity) - order.indexOf(a.severity) || Math.abs(b.k - 1) - Math.abs(a.k - 1));

  const counts = all.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] ?? 0) + 1;
    return acc;
  }, {});

  const onExport = () => {
    downloadCsv(
      'anomaly_flags_21st_recount.csv',
      filtered.map((a) => ({
        province: a.province,
        district: a.district,
        k: a.k.toFixed(4),
        residual_pp: (a.residual * 100).toFixed(2),
        r1_pct: a.r1Pct.toFixed(2),
        r2_pct: a.r2Pct.toFixed(2),
        lower_95_pct: a.lower95.toFixed(2),
        upper_95_pct: a.upper95.toFixed(2),
        outside_95_band: a.outsideBand ? '1' : '0',
        severity: a.severity,
        reasons: a.reasons.join('; '),
      })),
    );
  };

  return (
    <section
      aria-labelledby="anomaly-heading"
      className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.03] to-transparent p-6"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
            <Flag className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 id="anomaly-heading" className="text-lg font-bold text-white">
              Anomaly flags
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Precinct-level screening heuristics. A flag is not a finding — it marks districts worth
              manual review, combining K-value extremes, residual magnitude, and falling outside the
              95% prediction band from the OLS fit of R2 on R1.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">
            <span className="sr-only">Minimum severity</span>
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value as AnomalyRow['severity'])}
              className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Minimum severity filter"
            >
              <option value="info">All (info+)</option>
              <option value="watch">Watch+</option>
              <option value="review">Review+</option>
              <option value="critical">Critical only</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            CSV
          </button>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-4 gap-2 text-xs">
        {order.map((s) => (
          <div
            key={s}
            className={`rounded-xl px-3 py-2 ${SEVERITY_STYLE[s].bg}`}
            aria-label={`${SEVERITY_STYLE[s].label}: ${counts[s] ?? 0} districts`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_STYLE[s].text}`}>
              {SEVERITY_STYLE[s].label}
            </p>
            <p className="mt-0.5 text-lg font-bold text-white">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
        <table className="w-full text-left text-sm text-slate-300">
          <caption className="sr-only">
            Districts with anomalous recount ratios, ordered by severity.
          </caption>
          <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-2">Severity</th>
              <th scope="col" className="px-3 py-2">시도</th>
              <th scope="col" className="px-3 py-2">구시군</th>
              <th scope="col" className="px-3 py-2 text-right">R1</th>
              <th scope="col" className="px-3 py-2 text-right">R2</th>
              <th scope="col" className="px-3 py-2 text-right">95% PI</th>
              <th scope="col" className="px-3 py-2 text-right">K</th>
              <th scope="col" className="px-3 py-2 text-right">Residual</th>
              <th scope="col" className="px-3 py-2">Reasons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.slice(0, 100).map((a, i) => {
              const style = SEVERITY_STYLE[a.severity];
              return (
                <tr key={i} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                    >
                      {a.severity === 'critical' && (
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                      )}
                      {style.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white">{a.province}</td>
                  <td className="px-3 py-2">{a.district}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{a.r1Pct.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {a.r2Pct.toFixed(2)}%
                    {a.outsideBand && <span className="ml-1 text-rose-400" aria-label="outside 95% band">⚠</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-500">
                    [{a.lower95.toFixed(1)}, {a.upper95.toFixed(1)}]
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: kColor(a.k) }}>
                    {a.k.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px]">
                    {(a.residual * 100).toFixed(2)} pp
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400">
                    {a.reasons.join(' · ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 100 && (
        <p className="mt-3 text-[11px] text-slate-500">
          Showing top 100 of {filtered.length} flagged districts. Export CSV for the full list.
        </p>
      )}
    </section>
  );
}

function kColor(k: number): string {
  if (k >= 1.5) return '#f43f5e';
  if (k > 1.2 || k < 0.8) return '#eab308';
  return '#10b981';
}
