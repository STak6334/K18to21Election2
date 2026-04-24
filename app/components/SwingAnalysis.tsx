'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { RegionalRecord } from '../types/election';
import { computeSwing, shortRegion, pctPoint } from '../lib/analytics';
import ChartContainer from './ChartContainer';

interface Props {
  regional: Record<string, RegionalRecord>;
}

const CYCLES = ['18th', '19th', '20th', '21st'] as const;
const LABEL: Record<string, string> = {
  '18th': '18대 (2012)',
  '19th': '19대 (2017)',
  '20th': '20대 (2022)',
  '21st': '21대 (2025)',
};

export default function SwingAnalysis({ regional }: Props) {
  const [from, setFrom] = useState<string>('20th');
  const [to, setTo] = useState<string>('21st');

  const rows = useMemo(() => computeSwing(regional, from, to), [regional, from, to]);

  const chartData = rows
    .map((r) => ({
      region: shortRegion(r.region),
      fullRegion: r.region,
      netSwing: r.netSwing,
      democraticSwing: r.democraticSwing,
      conservativeSwing: r.conservativeSwing,
    }))
    .sort((a, b) => b.netSwing - a.netSwing);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <CycleSelect label="From" value={from} onChange={setFrom} exclude={to} />
        <span aria-hidden className="text-slate-500">→</span>
        <CycleSelect label="To" value={to} onChange={setTo} exclude={from} />
      </div>

      <ChartContainer
        title={`Swing by region · ${LABEL[from]} → ${LABEL[to]}`}
        description={`Percentage-point change in two-block (Democratic − Conservative) vote share, by region. Positive values are Democratic swings; negative are Conservative swings.`}
        data={chartData}
        columns={[
          { key: 'fullRegion', label: 'Region' },
          { key: 'democraticSwing', label: 'Dem Δ (pp)', format: (v) => (v as number).toFixed(2) },
          { key: 'conservativeSwing', label: 'Con Δ (pp)', format: (v) => (v as number).toFixed(2) },
          { key: 'netSwing', label: 'Net (Dem−Con) Δ (pp)', format: (v) => (v as number).toFixed(2) },
        ]}
        provenanceIds={[sourceFor(from), sourceFor(to)]}
        metricDefHref="#metric-swing"
        csvFilename={`swing_${from}_to_${to}.csv`}
        extraMeta={
          <span>
            Positive bars = Democratic swing; negative = Conservative swing.
            Values in percentage points; two-block aggregation (see methodology).
          </span>
        }
      >
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="region"
                stroke="#94a3b8"
                fontSize={10}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                unit="pp"
                label={{
                  value: 'Net swing (Dem − Con), pp',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={((v: any, name: any) => {
                  const num = Number(v);
                  if (name === 'netSwing') return [pctPoint(num), 'Net (Dem−Con)'];
                  return [pctPoint(num), String(name)];
                }) as any}
                labelFormatter={(label, payload) => {
                  const p = payload?.[0]?.payload as { fullRegion?: string } | undefined;
                  return p?.fullRegion ?? label;
                }}
              />
              <Bar dataKey="netSwing" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.netSwing >= 0 ? '#3b82f6' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>
    </div>
  );
}

function CycleSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label={`${label} cycle`}
      >
        {CYCLES.filter((c) => c !== exclude).map((c) => (
          <option key={c} value={c}>
            {LABEL[c]}
          </option>
        ))}
      </select>
    </label>
  );
}

function sourceFor(cycle: string): string {
  switch (cycle) {
    case '18th':
      return 'nec_18th';
    case '19th':
      return 'nec_19th';
    case '20th':
      return 'nec_20th';
    case '21st':
      return 'nec_21st';
    default:
      return 'nec_21st';
  }
}
