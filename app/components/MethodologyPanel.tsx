'use client';

import { BookOpen, Database, GitBranch, Clock } from 'lucide-react';
import {
  METRICS,
  DATA_SOURCES,
  LAST_PIPELINE_RUN,
  type PipelineRun,
} from '../lib/methodology';

export default function MethodologyPanel() {
  return (
    <section
      aria-labelledby="methodology-heading"
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <header className="rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
            <BookOpen className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 id="methodology-heading" className="text-2xl font-black text-white">
              How metrics are computed
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              This panel documents every formula, denominator, and data-cleaning rule behind the
              numbers shown on this site. For each metric we show: what it measures, how it is
              calculated, what it is <em>not</em>, and where the input data came from.
            </p>
          </div>
        </div>
      </header>

      <PipelineCard run={LAST_PIPELINE_RUN} />

      <section aria-labelledby="metrics-heading" className="rounded-3xl border border-white/5 bg-slate-900/40 p-6">
        <h2 id="metrics-heading" className="mb-4 text-lg font-bold text-white">
          Metric definitions
        </h2>
        <div className="space-y-4">
          {METRICS.map((m) => (
            <article
              key={m.id}
              id={`metric-${m.id}`}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 scroll-mt-24"
            >
              <h3 className="text-base font-bold text-blue-300">{m.label}</h3>
              <dl className="mt-3 grid gap-3 md:grid-cols-[8rem_1fr]">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Formula
                </dt>
                <dd className="font-mono text-xs text-amber-200">{m.formula}</dd>

                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Units
                </dt>
                <dd className="text-xs text-slate-300">{m.units}</dd>

                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </dt>
                <dd className="text-sm leading-relaxed text-slate-300">{m.description}</dd>

                {m.caveats && m.caveats.length > 0 && (
                  <>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Caveats
                    </dt>
                    <dd>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-slate-400">
                        {m.caveats.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </dd>
                  </>
                )}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="sources-heading" className="rounded-3xl border border-white/5 bg-slate-900/40 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-300" aria-hidden />
          <h2 id="sources-heading" className="text-lg font-bold text-white">
            Data provenance
          </h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
          <table className="w-full text-left text-sm text-slate-300">
            <caption className="sr-only">
              Upstream data sources, file locations, and last-modified dates.
            </caption>
            <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-2">Dataset</th>
                <th scope="col" className="px-3 py-2">File</th>
                <th scope="col" className="px-3 py-2">Version</th>
                <th scope="col" className="px-3 py-2">Last modified</th>
                <th scope="col" className="px-3 py-2">Upstream origin</th>
                <th scope="col" className="px-3 py-2 text-right">Rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {DATA_SOURCES.map((s) => (
                <tr key={s.id} id={`source-${s.id}`}>
                  <td className="px-3 py-2 font-medium text-white">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.file}</td>
                  <td className="px-3 py-2 text-xs">{s.version}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.lastModified}</td>
                  <td className="px-3 py-2 text-xs">{s.origin}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {s.rowCount ? s.rowCount.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Sources listed here are cited per-metric via tooltips on KPI cards and per-chart badges
          under every visualization.
        </p>
      </section>
    </section>
  );
}

function PipelineCard({ run }: { run: PipelineRun }) {
  const durationSec = Math.round(
    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
  );
  const dedupPct =
    run.rowsIn > 0 ? ((run.dedupDroppedRows / run.rowsIn) * 100).toFixed(3) : '0';
  return (
    <section
      aria-labelledby="pipeline-heading"
      className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-emerald-300" aria-hidden />
        <h2 id="pipeline-heading" className="text-lg font-bold text-white">
          Last refresh
        </h2>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        <PipelineField label="Pipeline run ID" value={run.runId} mono />
        <PipelineField label="Completed" value={formatTs(run.completedAt)} />
        <PipelineField label="Duration" value={`${durationSec}s`} />
        <PipelineField label="Git / build" value={run.gitSha ?? '—'} mono />
        <PipelineField label="Rows in" value={run.rowsIn.toLocaleString()} />
        <PipelineField label="Rows out" value={run.rowsOut.toLocaleString()} />
        <PipelineField
          label="Dedup dropped"
          value={`${run.dedupDroppedRows.toLocaleString()} (${dedupPct}%)`}
        />
        <PipelineField label="Builders" value={run.builders.join(', ')} mono />
      </dl>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
        <Clock className="h-3 w-3" aria-hidden />
        Cite this snapshot by its run ID when sharing screenshots or figures.
      </p>
    </section>
  );
}

function PipelineField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className={`mt-0.5 truncate text-sm text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return iso;
  }
}
