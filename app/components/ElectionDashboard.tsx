'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  BarChart3,
  FileText,
  ShieldCheck,
  TrendingUp,
  Users,
  MapPin,
  Activity,
  Download,
  Search,
  ChevronRight,
  Info,
  BookOpen,
  Clock
} from 'lucide-react';

import type { ElectionRecord, RegionalRecord } from '../types/election';
import ChartContainer from './ChartContainer';
import MethodologyPanel from './MethodologyPanel';
import NarrativePanel from './NarrativePanel';
import QualityScorecard from './QualityScorecard';
import ShareBar from './ShareBar';
import { LanguageToggle, useLanguage } from './LanguageProvider';
import { LAST_PIPELINE_RUN, METRIC_PROVENANCE, sourceById } from '../lib/methodology';

// Code-split heavy analytics widgets — they're only needed on the Insight view
// after first paint, so we load them lazily (no SSR needed, they use Recharts).
const SwingAnalysis = dynamic(() => import('./SwingAnalysis'), { ssr: false });
const CounterfactualWidget = dynamic(() => import('./CounterfactualWidget'), { ssr: false });

// AnomalyFlags + recount scatter are only shown in the Recount view.
// Lazy-load both so the 253-row JSON stays out of the initial payload.
const AnomalyFlags = dynamic(() => import('./AnomalyFlags'), { ssr: false });

interface RecountSummary {
  candidateRatios: { name: string; party: string; r1: number; r2: number; k: number }[];
  provinceRows: {
    province: string;
    r1: number[];
    r2: number[];
    k: number[];
    k_lee: number;
    r1_lee: number;
    r2_lee: number;
  }[];
  districtRows: {
    province: string;
    district: string;
    lee_k: number;
    lee_r1: number;
    lee_r2: number;
    kmx_k: number;
    kmx_r1: number;
    kmx_r2: number;
  }[];
  national: { r1: number[]; r2: number[]; k: number[] };
}

interface ElectionReport {
  title: string;
  subtitle?: string | null;
  date?: string | null;
  overview: { label: string; value: any; note?: any }[];
  candidates: {
    name: string;
    party: string;
    votes: number;
    pct: number;
    winningProvinces: any;
    result: string;
  }[];
  margin: { label: string; votes: number; pct: number; note?: any };
  provinces: {
    name: string;
    turnout: number;
    shares: Record<string, number>;
    winner: string;
    leadPct: number;
  }[];
  provinceCandidates: string[];
  insights: { section: string; items: { label: string; value?: any; note?: any }[] }[];
  regionalSummary?: { region: string; lee: number; kim: number; winner: string; leadPct: number }[] | null;
}

interface Props {
  electionData: ElectionRecord[];
  regionalData: Record<string, RegionalRecord>;
  recountData?: any[];
  recountSummary?: RecountSummary;
  electionReports?: Record<string, ElectionReport>;
  reports: {
    analysis: string;
    excelAudit: string;
    presentationAudit: string;
  };
}

const CANDIDATE_COLORS: Record<string, string> = {
  '이재명': '#3b82f6',
  '김문수': '#f43f5e',
  '이준석': '#f97316',
  '권영국': '#eab308',
  '송진호': '#a855f7',
};

function kColor(k: number): string {
  if (k >= 1.5) return '#f43f5e';
  if (k > 1) return '#eab308';
  return '#10b981';
}

type View = 'insight' | 'report' | 'audit' | 'recount' | 'methodology';

const CONSERVATIVE = '#f43f5e'; // Rose 500
const DEMOCRATIC = '#3b82f6';    // Blue 500

// Helper functions
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
  return '#64748b';
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

const ELECTION_LABELS: Record<string, string> = {
  '18th': '18대 (2012)',
  '19th': '19대 (2017)',
  '20th': '20대 (2022)',
  '21st': '21대 (2025)',
};

const ELECTIONS = ['18th', '19th', '20th', '21st'] as const;

export default function ElectionDashboard({ electionData, regionalData, reports, recountData, recountSummary, electionReports }: Props) {
  const { t } = useLanguage();
  const [view, setView] = useState<View>('insight');
  const [selectedElection, setSelectedElection] = useState<(typeof ELECTIONS)[number]>('21st');
  const [reportElection, setReportElection] = useState<(typeof ELECTIONS)[number]>('21st');

  // Hydrate from URL params (deep-link + share-URL round-trip).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URL(window.location.href).searchParams;
    const v = p.get('view');
    if (v && ['insight', 'report', 'audit', 'recount', 'methodology'].includes(v)) {
      setView(v as View);
    }
    const e = p.get('election');
    if (e && (ELECTIONS as readonly string[]).includes(e)) {
      const ee = e as (typeof ELECTIONS)[number];
      setSelectedElection(ee);
      setReportElection(ee);
    }
  }, []);

  // Reflect current view/election in the URL without adding history entries.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    url.searchParams.set('election', selectedElection);
    window.history.replaceState({}, '', url.toString());
  }, [view, selectedElection]);

  const current = electionData.find((d) => d.Election === selectedElection) ?? electionData[0];
  
  // Data processing for Insight View
  const turnoutRate = (current.Turnout / current.Voters) * 100;
  const totalVotes = current['Total Votes'];
  
  const sortedCandidates = Object.entries(current.Candidates)
    .sort((a, b) => b[1] - a[1])
    .map(([key, votes]) => {
      const info = parseCandidate(key);
      return {
        name: info.name,
        party: info.party,
        votes,
        pct: (votes / totalVotes) * 100,
        color: getPartyColor(key),
      };
    });

  const regions = regionalData[selectedElection] ?? {};
  const regionalChartData = Object.entries(regions)
    .map(([region, data]) => ({
      region: region.replace(/특별자치시|특별자치도|광역시|특별시|도/g, ''),
      Conservative: Math.round(data.Conservative * 1000) / 10,
      Democratic: Math.round(data.Democratic * 1000) / 10,
    }))
    .sort((a, b) => b.Democratic - a.Democratic);

  // Markdown processing for reports
  const processMarkdown = (md: string) => {
    return md
      .replace(/!\[Voter Turnout Rate\].*?\)/, '![Voter Turnout Rate](/images/voter_turnout.png)')
      .replace(/!\[Major Party Vote Share\].*?\)/, '![Major Party Vote Share](/images/major_party_vote_share.png)')
      .replace(/!\[Regional Party Strength - 21st Election\].*?\)/, '![Regional Party Strength](/images/regional_strength_21st.png)');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-rose-600/10 blur-[120px]" />
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#020617]/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 ring-1 ring-white/10">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                {t('app.title')}
              </h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <nav
              className="flex items-center rounded-xl bg-white/5 p-1 ring-1 ring-white/10"
              aria-label={t('app.title')}
            >
              <NavBtn icon={BarChart3} label={t('nav.insight')} active={view === 'insight'} onClick={() => setView('insight')} tone="blue" />
              <NavBtn icon={FileText} label={t('nav.report')} active={view === 'report'} onClick={() => setView('report')} tone="blue" />
              <NavBtn icon={ShieldCheck} label={t('nav.audit')} active={view === 'audit'} onClick={() => setView('audit')} tone="blue" />
              <NavBtn icon={Search} label={t('nav.recount')} active={view === 'recount'} onClick={() => setView('recount')} tone="rose" />
              <NavBtn icon={BookOpen} label={t('nav.methodology')} active={view === 'methodology'} onClick={() => setView('methodology')} tone="emerald" />
            </nav>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Insight View */}
        {view === 'insight' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <RefreshBanner onOpenMethodology={() => setView('methodology')} />

            <ShareBar
              view={view}
              selectedElection={selectedElection}
              electionData={electionData}
              regional={regionalData}
            />

            <NarrativePanel
              electionData={electionData}
              regional={regionalData}
              currentCycle={selectedElection}
            />

            {/* Election Selectors */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ELECTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setSelectedElection(e)}
                  className={`group relative overflow-hidden rounded-2xl px-6 py-3 transition-all ${
                    selectedElection === e
                      ? 'bg-white/10 text-white ring-2 ring-blue-500/50'
                      : 'bg-white/5 text-slate-500 ring-1 ring-white/5 hover:bg-white/10 hover:text-slate-300'
                  }`}
                >
                  <span className="relative z-10 text-sm font-bold uppercase tracking-wide">
                    {ELECTION_LABELS[e].split(' ')[0]}
                  </span>
                  <div className={`absolute bottom-0 left-0 h-1 w-full bg-blue-500 transition-transform duration-500 ${
                    selectedElection === e ? 'scale-x-100' : 'scale-x-0'
                  }`} />
                </button>
              ))}
            </div>

            {/* Quick Stats Grid (KPIs with provenance tooltips) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t('kpi.totalVotes'), value: totalVotes.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', metricId: 'totalVotes', defHref: '#metric-margin' },
                { label: t('kpi.turnout'), value: `${turnoutRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', metricId: 'turnout', defHref: '#metric-turnout' },
                { label: t('kpi.winner'), value: sortedCandidates[0].name, icon: Search, color: 'text-rose-400', bg: 'bg-rose-400/10', metricId: 'winner', defHref: '#metric-margin' },
                { label: t('kpi.marginVotes'), value: (sortedCandidates[0].votes - sortedCandidates[1].votes).toLocaleString(), icon: Info, color: 'text-amber-400', bg: 'bg-amber-400/10', metricId: 'margin', defHref: '#metric-margin' },
              ].map((stat, i) => (
                <KpiCard
                  key={i}
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                  bg={stat.bg}
                  metricId={stat.metricId}
                  defHref={stat.defHref}
                  onOpenMethodology={() => setView('methodology')}
                  howLabel={t('kpi.howComputed')}
                  sourceLabel={t('kpi.sourceDatasets')}
                />
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartContainer
                title={t('chart.candidatePerf')}
                description={`${t('chart.candidatePerf.desc')} · ${ELECTION_LABELS[selectedElection]}`}
                data={sortedCandidates.map((c) => ({
                  name: c.name,
                  party: c.party,
                  votes: c.votes,
                  pct: c.pct.toFixed(2),
                }))}
                columns={[
                  { key: 'name', label: 'Candidate' },
                  { key: 'party', label: 'Party' },
                  { key: 'votes', label: 'Votes', format: (v) => Number(v).toLocaleString() },
                  { key: 'pct', label: 'Share %' },
                ]}
                provenanceIds={METRIC_PROVENANCE.totalVotes?.filter((s) => s.endsWith(selectedElection.replace(/[a-z]/g, '')) || s === `nec_${selectedElection}`) ?? [`nec_${selectedElection}`]}
                metricDefHref="#metric-margin"
                csvFilename={`candidate_performance_${selectedElection}.csv`}
              >
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sortedCandidates} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={80} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        cursor={{ fill: 'transparent' }}
                        formatter={((v: any, _n: any, entry: any) => [
                          `${Number(v).toLocaleString()} votes (${entry?.payload?.pct?.toFixed(2)}%)`,
                          'Votes',
                        ]) as any}
                      />
                      <Bar dataKey="votes" radius={[0, 8, 8, 0]} barSize={24}>
                        {sortedCandidates.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              <ChartContainer
                title={t('chart.regionalSupport')}
                description={t('chart.regionalSupport.desc')}
                data={regionalChartData.map((r) => ({
                  region: r.region,
                  conservative_pct: r.Conservative,
                  democratic_pct: r.Democratic,
                }))}
                columns={[
                  { key: 'region', label: 'Region' },
                  { key: 'conservative_pct', label: 'Conservative %', format: (v) => Number(v).toFixed(2) },
                  { key: 'democratic_pct', label: 'Democratic %', format: (v) => Number(v).toFixed(2) },
                ]}
                provenanceIds={[`nec_${selectedElection}`]}
                metricDefHref="#metric-swing"
                csvFilename={`regional_support_${selectedElection}.csv`}
              >
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="region" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        formatter={((v: any, n: any) => [`${Number(v).toFixed(2)}%`, n]) as any}
                      />
                      <Legend />
                      <Bar dataKey="Conservative" fill={CONSERVATIVE} radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="Democratic" fill={DEMOCRATIC} radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </div>

            {/* Decision-grade analytics */}
            <SwingAnalysis regional={regionalData} />
            <CounterfactualWidget
              election={current}
              regional={regionalData}
              electionKey={selectedElection}
            />
          </div>
        )}

        {/* Report View */}
        {view === 'report' && (
          <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Election selector */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {ELECTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setReportElection(e)}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                    reportElection === e
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/40'
                      : 'bg-white/5 text-slate-400 ring-1 ring-white/5 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {ELECTION_LABELS[e]}
                </button>
              ))}
            </div>

            {electionReports && electionReports[reportElection] ? (
              <ElectionReportView report={electionReports[reportElection]} />
            ) : (
              <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-8 text-center text-sm text-slate-500">
                No structured report available for this election.
              </div>
            )}
          </div>
        )}

        {/* Audit View */}
        {view === 'audit' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <QualityScorecard
              electionData={electionData}
              regional={regionalData}
              recountData={recountData as any}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
             {/* Excel Audit */}
             <div className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/40 p-8 shadow-xl">
                <div className="mb-6 flex items-center gap-3">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Download className="h-5 w-5" />
                   </div>
                   <h2 className="text-xl font-bold text-white">Excel System Audit</h2>
                </div>
                <div className="space-y-4 text-sm text-slate-400">
                   <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                     {reports.excelAudit}
                   </pre>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                   <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
                     <ChevronRight className="h-3 w-3" /> Integrity Verified
                   </span>
                   <button className="text-xs font-semibold text-slate-500 hover:text-white transition-colors">View Source Data</button>
                </div>
             </div>

             {/* Presentation Audit */}
             <div className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-slate-900/40 p-8 shadow-xl">
                <div className="mb-6 flex items-center gap-3">
                   <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                      <FileText className="h-5 w-5" />
                   </div>
                   <h2 className="text-xl font-bold text-white">Documentation Audit</h2>
                </div>
                <div className="space-y-4 text-sm text-slate-400">
                   <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                     {reports.presentationAudit}
                   </pre>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                   <span className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase">
                     <ChevronRight className="h-3 w-3" /> Visual Compliance
                   </span>
                   <button className="text-xs font-semibold text-slate-500 hover:text-white transition-colors">Open Presentation</button>
                </div>
             </div>
            </div>
          </div>
        )}

        {/* Methodology View */}
        {view === 'methodology' && <MethodologyPanel />}

        {/* Recount View */}
        {view === 'recount' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {recountData && recountData.length > 0 && (
              <AnomalyFlags recountRows={recountData as any} />
            )}
            {/* National KPI Row */}
            {recountSummary && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: '분석 구시군 수', value: recountSummary.districtRows.length.toLocaleString(), sub: '253 districts' },
                  { label: '이재명 전국 K값', value: recountSummary.candidateRatios[0].k.toFixed(4), sub: `R1 ${recountSummary.candidateRatios[0].r1}% → R2 ${recountSummary.candidateRatios[0].r2}%` },
                  { label: 'K ≥ 1.5 구시군', value: recountSummary.districtRows.filter(d => d.lee_k >= 1.5).length.toString(), sub: '고위험 (High risk)' },
                  { label: '최대 K값', value: Math.max(...recountSummary.districtRows.map(d => d.lee_k)).toFixed(4), sub: recountSummary.districtRows[0].district },
                ].map((kpi, i) => (
                  <div key={i} className="rounded-3xl border border-white/5 bg-slate-900/40 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{kpi.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Chart Row 1: Candidate Ratios + Regional K */}
            {recountSummary && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">후보별 재확인표 비율</h2>
                    <span className="text-xs text-slate-500">전국 R1 vs R2 (%)</span>
                  </div>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recountSummary.candidateRatios} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 12 }}
                          formatter={(v: any, n: any) => [typeof v === 'number' ? v.toFixed(2) + '%' : v, n === 'r1' ? 'R1 (관내)' : 'R2 (관외사전)']}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === 'r1' ? 'R1 (관내)' : 'R2 (관외사전)'} />
                        <Bar dataKey="r1" fill="#64748b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="r2" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {recountSummary.candidateRatios.map((c, i) => <Cell key={i} fill={CANDIDATE_COLORS[c.name] ?? '#3b82f6'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1 text-[10px]">
                    {recountSummary.candidateRatios.map(c => (
                      <div key={c.name} className="rounded bg-white/5 p-1 text-center">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="font-mono" style={{ color: kColor(c.k) }}>K={c.k.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">지역별 K값 (이재명 기준)</h2>
                    <span className="text-xs text-slate-500">K = R2 / R1</span>
                  </div>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recountSummary.provinceRows} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} domain={[0.8, 'auto']} />
                        <YAxis dataKey="province" type="category" stroke="#94a3b8" fontSize={10} width={70} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 12 }}
                          formatter={(v: any) => [typeof v === 'number' ? v.toFixed(4) : v, 'K']}
                        />
                        <ReferenceLine x={1} stroke="#10b981" strokeDasharray="3 3" />
                        <ReferenceLine x={1.5} stroke="#f43f5e" strokeDasharray="3 3" />
                        <Bar dataKey="k_lee" radius={[0, 4, 4, 0]}>
                          {recountSummary.provinceRows.map((p, i) => <Cell key={i} fill={kColor(p.k_lee)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Row 2: R1 vs R2 scatter */}
            {recountSummary && (
              <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">R1(분류표 비율) vs R2(재확인표 비율)</h2>
                  <span className="text-xs text-slate-500">253개 구시군 · 이재명 기준 (%)</span>
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        type="number"
                        dataKey="lee_r1"
                        name="R1"
                        stroke="#94a3b8"
                        fontSize={11}
                        unit="%"
                        label={{ value: 'R1 (관내 득표율)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="lee_r2"
                        name="R2"
                        stroke="#94a3b8"
                        fontSize={11}
                        unit="%"
                        label={{ value: 'R2 (관외사전 득표율)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                      />
                      <ZAxis type="number" range={[40, 40]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 12 }}
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }: any) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-white/10 bg-[#0f172a] p-2 text-xs">
                              <div className="font-bold text-white">{d.province} {d.district}</div>
                              <div className="text-slate-400">R1: {d.lee_r1.toFixed(2)}%</div>
                              <div className="text-slate-400">R2: {d.lee_r2.toFixed(2)}%</div>
                              <div className="font-bold" style={{ color: kColor(d.lee_k) }}>K: {d.lee_k.toFixed(4)}</div>
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine
                        segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                      />
                      <Scatter name="구시군" data={recountSummary.districtRows}>
                        {recountSummary.districtRows.map((d, i) => <Cell key={i} fill={kColor(d.lee_k)} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> K ≤ 1</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 1 &lt; K &lt; 1.5</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> K ≥ 1.5</span>
                  <span className="text-slate-500">· 녹색 점선: y=x (R1=R2)</span>
                </div>
              </div>
            )}

            {/* Regional detail data table */}
            {recountSummary && (
              <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">지역별 상세 데이터</h2>
                  <span className="text-xs text-slate-500">17개 시도 집계 (이재명)</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">시도</th>
                        <th className="px-4 py-3 text-right font-semibold">R1 (관내)</th>
                        <th className="px-4 py-3 text-right font-semibold">R2 (관외사전)</th>
                        <th className="px-4 py-3 text-right font-semibold">Δ (R2−R1)</th>
                        <th className="px-4 py-3 text-right font-bold text-rose-300">K (R2/R1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recountSummary.provinceRows.map((p, i) => {
                        const delta = p.r2_lee - p.r1_lee;
                        return (
                          <tr key={i} className="transition-colors hover:bg-white/[0.03]">
                            <td className="px-4 py-2 font-medium text-white">{p.province}</td>
                            <td className="px-4 py-2 text-right font-mono">{p.r1_lee.toFixed(2)}%</td>
                            <td className="px-4 py-2 text-right font-mono">{p.r2_lee.toFixed(2)}%</td>
                            <td className={`px-4 py-2 text-right font-mono ${delta >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                              {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: kColor(p.k_lee) }}>
                              {p.k_lee.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">21대 대선 재확인표 K값 (관내/관외) 분석</h2>
                  <p className="text-sm text-slate-400">Analysis of the K-value (R2/R1) for statistical anomalies in absentee vs local voting.</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20">
                  <Search className="h-5 w-5 text-rose-400" />
                </div>
              </div>

              {/* Data Table for K-values */}
              <div className="relative overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50 shadow-inner max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="sticky top-0 bg-slate-800/90 text-xs uppercase text-slate-400 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3 font-semibold">시도명 (Region)</th>
                      <th className="px-4 py-3 font-semibold">구시군명 (District)</th>
                      <th className="px-4 py-3 text-right font-semibold">R1 (관내득표율)</th>
                      <th className="px-4 py-3 text-right font-semibold">R2 (관외득표율)</th>
                      <th className="px-4 py-3 text-right font-bold text-rose-300">K-Value (R2/R1)</th>
                      <th className="px-4 py-3 text-right font-semibold">잔차 (Residual)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recountData?.map((d: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{d.province}</td>
                        <td className="px-4 py-3">{d.district}</td>
                        <td className="px-4 py-3 text-right">{(d.r1 * 100).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">{(d.r2 * 100).toFixed(2)}%</td>
                        <td className={`px-4 py-3 text-right font-bold ${d.k_value >= 1.5 ? 'text-rose-400' : d.k_value > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {d.k_value.toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{d.residual.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                 <h3 className="mb-2 text-sm font-bold text-rose-300">💡 K-Value 인사이트 (K값 분석)</h3>
                 <p className="text-xs leading-relaxed text-slate-400">
                   K값은 특정 후보의 관외사전투표 득표율(R2)을 관내당일투표 득표율(R1)로 나눈 통계적 지표입니다. 이론적으로 대수의 법칙에 의해 정상적인 선거 환경에서는 관내와 관외의 표본 크기가 충분히 클 때 K값은 1에 수렴해야 합니다. K값이 1을 크게 벗어날 경우(예: 1.5 이상) 통계적 비정상성을 의심하거나 추가적인 재확인표 검증 및 로그 데이터 분석이 요구될 수 있습니다.
                 </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-slate-500">{t('footer.copyright')}</p>
          <div className="mt-4 flex gap-6 md:mt-0">
             <span className="text-xs text-slate-600 hover:text-slate-400 cursor-help">{t('footer.docs')}</span>
             <span className="text-xs text-slate-600 hover:text-slate-400 cursor-help">{t('footer.pipeline')}</span>
             <span className="text-xs text-slate-600 hover:text-slate-400 cursor-help">{t('footer.reportPdf')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavBtn({
  icon: Icon,
  label,
  active,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  tone: 'blue' | 'rose' | 'emerald';
}) {
  const activeBg = tone === 'rose' ? 'bg-rose-600' : tone === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        active ? `${activeBg} text-white shadow-lg` : 'text-slate-400 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" /> <span>{label}</span>
    </button>
  );
}

function RefreshBanner({ onOpenMethodology }: { onOpenMethodology: () => void }) {
  const { t } = useLanguage();
  const run = LAST_PIPELINE_RUN;
  const ts = new Date(run.completedAt).toISOString().replace('T', ' ').slice(0, 19);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/40 px-5 py-3 text-xs"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
          <Clock className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-slate-300">
            {t('refresh.lastRefresh')} <span className="font-mono text-white">{ts} UTC</span>
          </p>
          <p className="text-slate-500">
            {t('refresh.runId')} <span className="font-mono">{run.runId}</span> · {t('refresh.dedup')}{' '}
            {run.dedupDroppedRows.toLocaleString()}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenMethodology}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
        {t('refresh.howComputed')}
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  metricId,
  defHref,
  onOpenMethodology,
  howLabel = 'How?',
  sourceLabel = 'Source',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  metricId: string;
  defHref: string;
  onOpenMethodology: () => void;
  howLabel?: string;
  sourceLabel?: string;
}) {
  const sources = (METRIC_PROVENANCE[metricId] ?? []).map(sourceById).filter(Boolean);
  const provTitle = sources
    .map((s) => `${s!.name} · ${s!.file} · v${s!.version} · updated ${s!.lastModified}`)
    .join('\n');

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-6 transition-all hover:bg-slate-900/60">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span
          className="cursor-help font-mono"
          title={provTitle || 'No source recorded'}
          aria-label={`${sourceLabel}: ${provTitle}`}
        >
          {sourceLabel}: {sources.length}
        </span>
        <button
          type="button"
          onClick={() => {
            onOpenMethodology();
            setTimeout(() => {
              const el = document.querySelector(defHref);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          className="text-slate-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          aria-label={`${howLabel} · ${label}`}
        >
          {howLabel}
        </button>
      </div>
    </div>
  );
}

function fmtNum(v: any): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

function fmtPct(v: any, digits = 2): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') return (v * 100).toFixed(digits) + '%';
  return String(v);
}

function isFraction(v: any): boolean {
  return typeof v === 'number' && v >= 0 && v <= 1;
}

function ElectionReportView({ report }: { report: ElectionReport }) {
  const winner = report.candidates[0];
  const runnerUp = report.candidates[1];
  const chartData = report.candidates.map((c) => ({
    name: c.name,
    pct: Math.round(c.pct * 10000) / 100,
    votes: c.votes,
    color: getPartyColor(`${c.name} (${c.party})`),
  }));

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-[32px] border border-white/5 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{report.title}</h1>
          {report.subtitle && (
            <p className="text-sm font-medium text-slate-400">{report.subtitle}</p>
          )}
          {report.date && (
            <p className="text-xs text-slate-500">{report.date}</p>
          )}
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-bold text-blue-400">1. 선거 개요 (Election Overview)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {report.overview.map((o, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{o.label}</p>
              <p className="mt-1 text-xl font-bold text-white">
                {isFraction(o.value) ? fmtPct(o.value) : fmtNum(o.value)}
              </p>
              {o.note && <p className="mt-1 text-[10px] text-slate-500 leading-tight">{String(o.note)}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Candidates */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-bold text-blue-400">2. 후보별 개표 결과 (Candidate Results)</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">후보자</th>
                  <th className="px-3 py-2">정당</th>
                  <th className="px-3 py-2 text-right">득표수</th>
                  <th className="px-3 py-2 text-right">득표율</th>
                  <th className="px-3 py-2 text-center">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.candidates.map((c, i) => {
                  const color = getPartyColor(`${c.name} (${c.party})`);
                  return (
                    <tr key={i} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-2 font-bold text-white">{c.name}</td>
                      <td className="px-3 py-2" style={{ color }}>{c.party}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtNum(c.votes)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtPct(c.pct)}</td>
                      <td className="px-3 py-2 text-center text-xs">{c.result}</td>
                    </tr>
                  );
                })}
                {report.margin && (
                  <tr className="bg-white/[0.02]">
                    <td className="px-3 py-2 text-xs italic text-slate-400" colSpan={2}>
                      {report.margin.label ?? '표차'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtNum(report.margin.votes)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">{fmtPct(report.margin.pct)}</td>
                    <td className="px-3 py-2 text-center text-[10px] text-slate-500">{report.margin.note ?? ''}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide domain={[0, 'auto']} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={70} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: 12 }}
                  formatter={(v: any) => [typeof v === 'number' ? v.toFixed(2) + '%' : v, '득표율']}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="pct" radius={[0, 8, 8, 0]} barSize={22}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {winner && runnerUp && (
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-slate-400">
            <span className="font-bold text-blue-300">{winner.name}</span> 당선 ·{' '}
            <span className="font-mono">{fmtPct(winner.pct)}</span> vs{' '}
            <span className="font-bold text-rose-300">{runnerUp.name}</span>{' '}
            <span className="font-mono">{fmtPct(runnerUp.pct)}</span>
            {report.margin?.pct && <> · 표차 {fmtPct(report.margin.pct)}</>}
          </div>
        )}
      </div>

      {/* Provinces */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-bold text-blue-400">3. 시도별 개표 결과 (Results by Province)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/50">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/90 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">시도명</th>
                <th className="px-3 py-2 text-right">투표율</th>
                {report.provinceCandidates.map((n) => (
                  <th key={n} className="px-3 py-2 text-right">{n}</th>
                ))}
                <th className="px-3 py-2">우세</th>
                <th className="px-3 py-2 text-right">표차 (%p)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.provinces.map((p, i) => (
                <tr key={i} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-1.5 font-medium text-white">{p.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs">{fmtPct(p.turnout)}</td>
                  {report.provinceCandidates.map((n) => (
                    <td key={n} className="px-3 py-1.5 text-right font-mono text-xs">{fmtPct(p.shares?.[n])}</td>
                  ))}
                  <td className="px-3 py-1.5 text-xs" style={{ color: getPartyColor(p.winner) }}>{p.winner}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs text-amber-300">{fmtPct(p.leadPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional summary (21st only) */}
      {report.regionalSummary && report.regionalSummary.length > 0 && (
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
          <h2 className="mb-4 text-lg font-bold text-blue-400">권역별 요약 (Regional Summary)</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {report.regionalSummary.map((r, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold text-slate-400">{r.region}</p>
                <p className="mt-2 text-sm font-mono" style={{ color: DEMOCRATIC }}>이재명 {fmtPct(r.lee)}</p>
                <p className="text-sm font-mono" style={{ color: CONSERVATIVE }}>김문수 {fmtPct(r.kim)}</p>
                <p className="mt-2 text-[10px] text-slate-500">우세 {r.winner} (+{fmtPct(r.leadPct)})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-bold text-blue-400">4. 주요 분석 (Key Insights)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {report.insights.map((sec, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-bold text-rose-300">■ {sec.section}</h3>
              <ul className="space-y-2 text-xs">
                {sec.items.map((it, j) => (
                  <li key={j} className="flex items-start justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0">
                    <span className="text-slate-400">{it.label}</span>
                    <span className="text-right font-mono text-slate-200">
                      {isFraction(it.value) ? fmtPct(it.value) : fmtNum(it.value)}
                      {it.note !== null && it.note !== undefined && it.note !== '' && (
                        <span className="ml-1 text-[10px] text-slate-500">
                          {isFraction(it.note) ? `(${fmtPct(it.note)})` : `(${it.note})`}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
