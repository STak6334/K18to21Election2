'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

import type { ElectionRecord, RegionalRecord } from '../types/election';

interface Props {
  electionData: ElectionRecord[];
  regionalData: Record<string, RegionalRecord>;
}

interface CandidateDatum {
  name: string;
  party: string;
  votes: number;
  pct: number;
  color: string;
}

interface RegionDatum {
  region: string;
  Conservative: number;
  Democratic: number;
}

interface CandidateTooltipPayload {
  payload: CandidateDatum;
}

interface RegionTooltipPayload {
  name: string;
  value: number;
  color: string;
}

const CONSERVATIVE = '#ef4444';
const DEMOCRATIC = '#3b82f6';

function getPartyColor(name: string): string {
  if (
    name.includes('새누리당') ||
    name.includes('자유한국당') ||
    name.includes('국민의힘') ||
    name.includes('바른정당') ||
    name.includes('우리공화당')
  ) {
    return CONSERVATIVE;
  }
  if (
    name.includes('민주통합당') ||
    name.includes('더불어민주당') ||
    name.includes('민주노동당')
  ) {
    return DEMOCRATIC;
  }
  if (name.includes('국민의당') || name.includes('개혁신당')) return '#a855f7';
  if (name.includes('정의당')) return '#eab308';
  return '#6b7280';
}

function parseCandidate(key: string): { name: string; party: string } {
  const parenMatch = key.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), party: parenMatch[2].trim() };
  }
  const parts = key.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { name: parts[parts.length - 1], party: parts.slice(0, -1).join(' ') };
  }
  return { name: key, party: '' };
}

function shortRegion(region: string): string {
  return region
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('광역시', '')
    .replace('특별시', '')
    .replace('도', '');
}

function getWinner(candidates: Record<string, number>): string {
  let max = 0;
  let winner = '';
  for (const [key, votes] of Object.entries(candidates)) {
    if (votes > max) {
      max = votes;
      winner = key;
    }
  }
  return winner;
}

const ELECTION_LABELS: Record<string, string> = {
  '18th': '18대 (2012)',
  '19th': '19대 (2017)',
  '20th': '20대 (2022)',
  '21st': '21대 (2025)',
};

const ELECTIONS = ['18th', '19th', '20th', '21st'] as const;

function toPct(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

function formatSignedPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%p`;
}

function getStrongestRegion(
  regions: RegionDatum[],
  key: 'Conservative' | 'Democratic',
): RegionDatum | null {
  if (regions.length === 0) return null;
  return regions.reduce((best, current) => (current[key] > best[key] ? current : best));
}

function CustomTooltipVotes({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CandidateTooltipPayload[];
}) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-600 bg-slate-800/95 px-3 py-2 text-sm shadow-xl">
        <p className="font-semibold text-white">{d.name || '후보'}</p>
        <p className="text-xs text-slate-300">{d.party || '소속 정보 없음'}</p>
        <p style={{ color: d.color }} className="mt-1 font-bold">
          {d.votes.toLocaleString('ko-KR')}표
        </p>
        <p className="text-xs text-slate-400">{d.pct.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
}

function CustomTooltipRegion({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: RegionTooltipPayload[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-600 bg-slate-800/95 px-3 py-2 text-sm shadow-xl">
        <p className="mb-1 font-semibold text-white">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'Conservative' ? '보수' : '진보'}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ElectionDashboard({ electionData, regionalData }: Props) {
  const [selected, setSelected] = useState<(typeof ELECTIONS)[number]>('21st');

  const current = electionData.find((d) => d.Election === selected) ?? electionData[0];
  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        선거 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  const currentIndex = ELECTIONS.indexOf(current.Election as (typeof ELECTIONS)[number]);
  const previousElection = currentIndex > 0 ? ELECTIONS[currentIndex - 1] : null;
  const previous = previousElection
    ? electionData.find((d) => d.Election === previousElection)
    : undefined;

  const turnoutRate = toPct(current.Turnout, current.Voters);
  const turnoutDelta = previous ? turnoutRate - toPct(previous.Turnout, previous.Voters) : null;
  const totalVotes = current['Total Votes'];
  const winnerKey = getWinner(current.Candidates);

  const sortedCandidates: CandidateDatum[] = Object.entries(current.Candidates)
    .sort((a, b) => b[1] - a[1])
    .map(([key, votes]) => {
      const info = parseCandidate(key);
      return {
        name: info.name,
        party: info.party,
        votes,
        pct: toPct(votes, totalVotes),
        color: getPartyColor(key),
      };
    });

  const candidateData = sortedCandidates.slice(0, 8);
  const winner = sortedCandidates[0];
  const runnerUp = sortedCandidates[1];
  const topThree = sortedCandidates.slice(0, 3);
  const topTwoShare = (winner?.pct ?? 0) + (runnerUp?.pct ?? 0);
  const minorPartyShare = Math.max(0, 100 - topTwoShare);
  const marginVotes = winner && runnerUp ? winner.votes - runnerUp.votes : 0;
  const marginPct = winner && runnerUp ? winner.pct - runnerUp.pct : 0;

  const regions = regionalData[selected] ?? {};
  const regionalChartData: RegionDatum[] = Object.entries(regions)
    .map(([region, data]) => ({
      region: shortRegion(region),
      Conservative: Math.round(data.Conservative * 1000) / 10,
      Democratic: Math.round(data.Democratic * 1000) / 10,
    }))
    .sort((a, b) => b.Democratic - a.Democratic);

  const strongestConservative = getStrongestRegion(regionalChartData, 'Conservative');
  const strongestDemocratic = getStrongestRegion(regionalChartData, 'Democratic');

  const turnoutTrend = electionData.map((d) => ({
    election: ELECTION_LABELS[d.Election],
    turnout: parseFloat(toPct(d.Turnout, d.Voters).toFixed(1)),
  }));

  const turnoutValues = turnoutTrend.map((d) => d.turnout);
  const turnoutMin =
    turnoutValues.length > 0 ? Math.max(0, Math.floor(Math.min(...turnoutValues) - 2)) : 0;
  const turnoutMax =
    turnoutValues.length > 0 ? Math.min(100, Math.ceil(Math.max(...turnoutValues) + 2)) : 100;

  const partyTrend = electionData.map((d) => {
    let con = 0;
    let dem = 0;
    const total = d['Total Votes'];

    for (const [key, votes] of Object.entries(d.Candidates)) {
      const color = getPartyColor(key);
      if (color === CONSERVATIVE) con += votes;
      else if (color === DEMOCRATIC) dem += votes;
    }

    return {
      election: ELECTION_LABELS[d.Election],
      보수: parseFloat(toPct(con, total).toFixed(1)),
      진보: parseFloat(toPct(dem, total).toFixed(1)),
    };
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-blue-500/10 to-transparent" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">🗳️</span>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">
                한국 대통령 선거 인사이트 대시보드
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Korean Presidential Election Results · 18th–21st (2012–2025)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ELECTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setSelected(e)}
                aria-pressed={selected === e}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  selected === e
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/70 ring-1 ring-blue-300/40'
                    : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'
                }`}
              >
                {ELECTION_LABELS[e]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-1 text-xs text-slate-400">유권자 수</p>
            <p className="text-lg font-bold text-white">{current.Voters.toLocaleString('ko-KR')}</p>
            <p className="text-xs text-slate-500">Eligible voters</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-1 text-xs text-slate-400">투표 참여</p>
            <p className="text-lg font-bold text-white">{current.Turnout.toLocaleString('ko-KR')}</p>
            <p className="text-xs text-slate-500">Ballots cast</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-1 text-xs text-slate-400">투표율</p>
            <p className="text-2xl font-bold text-emerald-400">{turnoutRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500">
              {turnoutDelta === null ? '첫 비교 대상 선거' : `직전 대비 ${formatSignedPct(turnoutDelta)}`}
            </p>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: `${winner?.color ?? getPartyColor(winnerKey)}18`,
              borderColor: `${winner?.color ?? getPartyColor(winnerKey)}66`,
            }}
          >
            <p className="mb-1 text-xs text-slate-300">당선자</p>
            <p className="text-lg font-bold" style={{ color: winner?.color ?? getPartyColor(winnerKey) }}>
              {winner?.name ?? parseCandidate(winnerKey).name}
            </p>
            <p className="truncate text-xs text-slate-300">
              {winner?.party ?? parseCandidate(winnerKey).party}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-1 text-xs text-slate-400">승리 격차</p>
            <p className="text-lg font-bold text-amber-300">
              {marginVotes > 0 ? marginVotes.toLocaleString('ko-KR') : '-'}
            </p>
            <p className="text-xs text-slate-500">
              {runnerUp ? `${marginPct.toFixed(2)}%p (${winner?.name} vs ${runnerUp.name})` : '비교 후보 없음'}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.85fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/60">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">후보별 득표수</h2>
                <p className="text-xs text-slate-500">Candidate vote counts (Top 8)</p>
              </div>
              <p className="text-right text-xs text-slate-400">
                총 유효투표수
                <br />
                <span className="font-semibold text-slate-200">
                  {totalVotes.toLocaleString('ko-KR')}표
                </span>
              </p>
            </div>

            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={candidateData}
                layout="vertical"
                margin={{ top: 0, right: 35, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: '#e2e8f0', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltipVotes />} cursor={{ fill: '#ffffff0c' }} />
                <Bar dataKey="votes" radius={[0, 5, 5, 0]} maxBarSize={30}>
                  {candidateData.map((entry, index) => (
                    <Cell key={`${entry.party}-${entry.name}-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/60">
            <h2 className="text-base font-semibold">핵심 경쟁 구도</h2>
            <p className="mb-4 text-xs text-slate-500">Top candidates & race intensity</p>

            <div className="space-y-3">
              {topThree.map((candidate, index) => (
                <div
                  key={`${candidate.party}-${candidate.name}-${index}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <p className="mb-1 text-xs text-slate-400">{index + 1}위 후보</p>
                  <p className="font-semibold text-white">{candidate.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-300">{candidate.party || '무소속/기타'}</span>
                    <span className="font-semibold" style={{ color: candidate.color }}>
                      {candidate.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">양강 후보 합계</span>
                <span className="font-semibold text-slate-100">{topTwoShare.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">기타 후보 득표율</span>
                <span className="font-semibold text-slate-100">{minorPartyShare.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">1·2위 표 차이</span>
                <span className="font-semibold text-amber-300">
                  {runnerUp ? marginVotes.toLocaleString('ko-KR') : '-'}
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/60">
            <h2 className="text-base font-semibold">지역별 정당 지지율</h2>
            <p className="text-xs text-slate-500">Regional party support (%)</p>

            <div className="my-4 flex flex-wrap gap-2">
              {strongestConservative && (
                <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                  보수 강세: {strongestConservative.region} {strongestConservative.Conservative.toFixed(1)}%
                </span>
              )}
              {strongestDemocratic && (
                <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                  진보 강세: {strongestDemocratic.region} {strongestDemocratic.Democratic.toFixed(1)}%
                </span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={regionalChartData}
                margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" />
                <XAxis
                  dataKey="region"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={52}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltipRegion />} cursor={{ fill: '#ffffff0c' }} />
                <Legend
                  formatter={(value) =>
                    value === 'Conservative' ? (
                      <span className="text-xs text-red-300">보수 (Conservative)</span>
                    ) : (
                      <span className="text-xs text-blue-300">진보 (Democratic)</span>
                    )
                  }
                />
                <Bar dataKey="Conservative" fill={CONSERVATIVE} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Democratic" fill={DEMOCRATIC} radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/60">
            <div>
              <h2 className="text-base font-semibold">역대 투표율 추이</h2>
              <p className="mb-4 text-xs text-slate-500">Historical voter turnout (%)</p>
              <ResponsiveContainer width="100%" height={165}>
                <LineChart data={turnoutTrend} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="election"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[turnoutMin, turnoutMax]}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}%`, '투표율']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#34d399' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="turnout"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={{ fill: '#34d399', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h2 className="text-base font-semibold">양당 득표율 추이</h2>
              <p className="mb-4 text-xs text-slate-500">
                Conservative vs progressive vote share (%)
              </p>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={partyTrend} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="election"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v, name) => [
                      `${v}%`,
                      name === '보수' ? '보수 (Conservative)' : '진보 (Progressive)',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: value === '보수' ? CONSERVATIVE : DEMOCRATIC, fontSize: '12px' }}>
                        {value === '보수' ? '보수 (Conservative)' : '진보 (Progressive)'}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="보수"
                    stroke={CONSERVATIVE}
                    strokeWidth={2.5}
                    dot={{ fill: CONSERVATIVE, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="진보"
                    stroke={DEMOCRATIC}
                    strokeWidth={2.5}
                    dot={{ fill: DEMOCRATIC, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <p className="pb-2 text-center text-xs text-slate-500">
          Data source: National Election Commission of Korea · 지역별 데이터는 보수/진보 양당 기준이며,
          19대처럼 다당 경쟁이 강한 선거에서는 두 값의 합이 100%와 다를 수 있습니다.
        </p>
      </main>
    </div>
  );
}
