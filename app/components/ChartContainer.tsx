'use client';

import { KeyboardEvent, ReactNode, useId, useRef, useState } from 'react';
import { Download, Table2, Info } from 'lucide-react';
import { downloadCsv } from '../lib/analytics';
import { sourceById } from '../lib/methodology';

// Accessibility + auditability wrapper for any chart.
//
// - Provides an accessible name + description via aria-labelledby/aria-describedby.
// - Offers a keyboard-activatable toggle to reveal the underlying data table.
// - Offers a one-click CSV download of the chart's data.
// - Renders a provenance row so every chart cites its source(s).
//
// The chart itself (recharts <ResponsiveContainer>) is rendered in a
// role="img" region so assistive tech announces it as a single image with the
// supplied accessible name and longer description.

export interface ChartDataColumn {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

interface ChartContainerProps {
  title: string;
  description: string;           // short, read aloud as accessible description
  data: Array<Record<string, unknown>>;
  columns: ChartDataColumn[];    // columns for the data table + CSV
  provenanceIds?: string[];      // ids from DATA_SOURCES
  metricDefHref?: string;        // anchor id under Methodology panel
  csvFilename?: string;
  extraMeta?: ReactNode;         // e.g. legend hints
  children: ReactNode;           // the chart itself
}

export default function ChartContainer({
  title,
  description,
  data,
  columns,
  provenanceIds = [],
  metricDefHref,
  csvFilename,
  extraMeta,
  children,
}: ChartContainerProps) {
  const [showTable, setShowTable] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const headingId = useId();
  const descId = useId();
  const regionId = useId();
  const liveId = useId();

  const onDownload = () => {
    const cols = columns.map((c) => c.key);
    downloadCsv(
      csvFilename ?? `${slug(title)}.csv`,
      data,
      cols,
    );
  };

  // Build a readable label for the currently focused datapoint.
  function activeLabel(idx: number): string {
    if (idx < 0 || idx >= data.length) return '';
    const row = data[idx];
    const parts = columns.map((c) => {
      const v = row[c.key];
      const text = c.format ? c.format(v) : v == null ? '' : String(v);
      return `${c.label}: ${text}`;
    });
    return `Point ${idx + 1} of ${data.length} — ${parts.join(', ')}`;
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (data.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev === null ? 0 : Math.min(prev + 1, data.length - 1);
        return next;
      });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev === null ? data.length - 1 : Math.max(prev - 1, 0);
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(data.length - 1);
    } else if (e.key === 'Escape') {
      setActiveIndex(null);
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={descId}
      className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-bold text-white">
            {title}
          </h2>
          <p id={descId} className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2" role="toolbar" aria-label={`${title} actions`}>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-expanded={showTable}
            aria-controls={regionId}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Table2 className="h-3.5 w-3.5" aria-hidden />
            {showTable ? 'Hide data' : 'Show data'}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Download ${title} data as CSV`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            CSV
          </button>
          {metricDefHref && (
            <a
              href={metricDefHref}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Open methodology definition for ${title}`}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              Method
            </a>
          )}
        </div>
      </header>

      {/* aria-live region — announces the focused datapoint to screen readers */}
      <div
        id={liveId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {activeIndex !== null ? activeLabel(activeIndex) : ''}
      </div>

      <div
        role="img"
        aria-labelledby={headingId}
        aria-describedby={descId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={() => setActiveIndex(null)}
        className="focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-xl"
        title="Use Arrow keys to navigate datapoints"
      >
        {children}
      </div>

      {extraMeta && <div className="mt-3 text-[11px] text-slate-500">{extraMeta}</div>}

      {provenanceIds.length > 0 && (
        <ProvenanceRow ids={provenanceIds} />
      )}

      <div
        id={regionId}
        role="region"
        aria-label={`${title} data table`}
        hidden={!showTable}
        className="mt-4"
      >
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/60">
          <table className="w-full text-left text-xs text-slate-300">
            <caption className="sr-only">{description}</caption>
            <thead className="bg-slate-800/80 text-[11px] uppercase text-slate-400">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className="px-3 py-2 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => {
                    const v = row[c.key];
                    const text = c.format ? c.format(v) : v == null ? '' : String(v);
                    return (
                      <td key={c.key} className="px-3 py-1.5 font-mono">
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProvenanceRow({ ids }: { ids: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
      <span className="font-semibold uppercase tracking-wider text-slate-400">Source:</span>
      {ids.map((id) => {
        const src = sourceById(id);
        if (!src) return null;
        return (
          <span
            key={id}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono"
            title={`${src.name} · ${src.file} · v${src.version} · updated ${src.lastModified}`}
          >
            {src.file.split('/').pop()}
            <span className="ml-1 text-slate-600">@ {src.version}</span>
          </span>
        );
      })}
    </div>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-|-$/g, '');
}
