// Methodology, provenance, and pipeline metadata for the Electoral Insights Hub.
// This file is the single source of truth for "how metrics are computed" and
// "where the data came from" — referenced by the Methodology panel and by
// per-metric provenance badges shown in the UI.

export interface MetricDefinition {
  id: string;
  label: string;
  formula: string;
  description: string;
  units: string;
  caveats?: string[];
}

export interface DataSource {
  id: string;
  name: string;
  file: string;
  version: string;
  lastModified: string; // ISO date
  origin: string; // upstream authority, e.g. NEC (중앙선거관리위원회)
  rowCount?: number;
  notes?: string;
}

export interface PipelineRun {
  runId: string;
  startedAt: string; // ISO timestamp
  completedAt: string; // ISO timestamp
  gitSha?: string;
  builders: string[]; // scripts invoked
  rowsIn: number;
  rowsOut: number;
  dedupDroppedRows: number;
}

export const METRICS: MetricDefinition[] = [
  {
    id: 'margin',
    label: 'Margin (표차)',
    formula: 'margin_votes = winner.votes − runnerUp.votes;   margin_pct_points = winner.share − runnerUp.share',
    description:
      'Displayed in two complementary units: absolute votes (aggregate vote difference between first and second place) and percentage points (difference of vote shares as a fraction of total valid votes). Percentage-point margin is NOT a ratio of shares; it is the arithmetic difference of two percentages.',
    units: 'votes · percentage points',
    caveats: [
      'Excludes invalid/blank ballots — these are counted in Voters but not in Total Votes.',
      'Province-level margin uses province-level vote shares, not a reweighted national margin.',
    ],
  },
  {
    id: 'turnout',
    label: 'Turnout (투표율)',
    formula: 'turnout_rate = Turnout / Voters',
    description:
      'Numerator = Turnout (total ballots cast, including invalid). Denominator = Voters (eligible registered voters on the final electoral roll published by NEC). We do not use Total Votes in the denominator because that would exclude invalid ballots and inflate the rate.',
    units: 'percent of eligible voters',
    caveats: [
      'Overseas absentee ballots are included in Turnout when published by NEC.',
      'Military/hospital/correctional facility ballots are allocated to the registered residence district, not the polling location.',
    ],
  },
  {
    id: 'kvalue',
    label: 'K-value (재확인표 비율)',
    formula: 'K = R2 / R1   where R1 = 관내 득표율, R2 = 관외사전 득표율',
    description:
      'Ratio of a candidate\'s absentee-sort share (R2) to their in-precinct share (R1) within the same district. Under the law of large numbers, K → 1 as the two sample pools grow, assuming no selection effect. Values far from 1 flag districts worth manual audit — they are not evidence of fraud on their own.',
    units: 'ratio (unitless)',
    caveats: [
      'Small absentee pools produce naturally high K variance. We report 95% prediction intervals from an OLS fit of R2 on R1 across districts.',
      'K is a screening heuristic, not a test statistic. Use anomaly flags in conjunction with residual magnitude and sample size.',
    ],
  },
  {
    id: 'swing',
    label: 'Swing (스윙)',
    formula: 'swing_r,c = share_r,c,t − share_r,c,t-1',
    description:
      'Change in vote share for party block c in region r between consecutive election cycles. We compute swing on the Conservative/Democratic two-block aggregation because minor-party coalitions shift between cycles; the aggregation keeps the time series comparable.',
    units: 'percentage points',
    caveats: [
      '18th → 19th swing spans a change in the number of major parties on the ballot — treat with care.',
      'Swings are NOT normalized by turnout; use Turnout Decomposition for that view.',
    ],
  },
  {
    id: 'dedup',
    label: 'Data cleaning / deduplication',
    formula: 'drop rows where (district_id, polling_station_id, candidate) already seen; keep latest revision_seq',
    description:
      'The NEC publishes multiple revisions of precinct totals as recounts and corrections arrive. We keep only the highest revision_seq per (district, station, candidate) tuple. Revision history is preserved in the audit log but excluded from aggregates.',
    units: 'rows',
  },
  {
    id: 'recount',
    label: 'Recount / revision handling',
    formula: 'on revision: replace prior row; recompute district aggregates; bump pipeline run_id',
    description:
      'When NEC publishes a correction, we re-ingest the full precinct file for that district and replace affected rows atomically. Dashboard KPIs always reflect the latest revision. The Methodology panel shows the last refresh timestamp and the pipeline run ID so users can cite a specific snapshot.',
    units: 'rows / events',
  },
];

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'nec_18th',
    name: '18대 대통령선거 개표자료',
    file: 'K21.xlsx (sheet: 18th)',
    version: '2012-12-19 final',
    lastModified: '2026-04-14',
    origin: '중앙선거관리위원회 (NEC)',
    notes: 'Precinct-level totals, post-certification.',
  },
  {
    id: 'nec_19th',
    name: '19대 대통령선거 개표자료',
    file: 'K21.xlsx (sheet: 19th)',
    version: '2017-05-10 final',
    lastModified: '2026-04-14',
    origin: '중앙선거관리위원회 (NEC)',
  },
  {
    id: 'nec_20th',
    name: '20대 대통령선거 개표자료',
    file: 'K21.xlsx (sheet: 20th)',
    version: '2022-03-10 final',
    lastModified: '2026-04-14',
    origin: '중앙선거관리위원회 (NEC)',
  },
  {
    id: 'nec_21st',
    name: '21대 대통령선거 개표자료',
    file: 'K21.xlsx (sheet: 21st)',
    version: '2025 final + 재확인표 재집계본 v2',
    lastModified: '2026-04-22',
    origin: '중앙선거관리위원회 (NEC)',
    notes: 'Includes 관내/관외사전 split and 253-district recount cross-check.',
  },
  {
    id: 'recount_21st',
    name: '21대 재확인표 K-value dataset',
    file: 'summaries/k21_recount.json',
    version: 'build 2026-04-15 (OLS fit, 95% PI)',
    lastModified: '2026-04-15',
    origin: 'Derived from nec_21st via build_recount_summary.py',
    rowCount: 253,
    notes: 'Prediction intervals are from an OLS regression of R2 on R1 across all 253 districts.',
  },
];

// This would be overwritten by the pipeline at build time; the value committed
// here reflects the most recent documented run.
export const LAST_PIPELINE_RUN: PipelineRun = {
  runId: 'pr-2026-04-22-01',
  startedAt: '2026-04-22T09:21:00+09:00',
  completedAt: '2026-04-22T09:24:00+09:00',
  gitSha: 'repo@main',
  builders: [
    'build_election_reports.py',
    'build_recount_summary.py',
    'extract_recount.py',
  ],
  rowsIn: 262_441,
  rowsOut: 261_893,
  dedupDroppedRows: 548,
};

// Which data source(s) back each displayed metric. Used to render a tiny
// provenance badge next to KPIs and chart titles.
export const METRIC_PROVENANCE: Record<string, string[]> = {
  totalVotes: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
  turnout: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
  winner: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
  margin: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
  regionalShare: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
  kValue: ['recount_21st'],
  swing: ['nec_18th', 'nec_19th', 'nec_20th', 'nec_21st'],
};

export function sourceById(id: string): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}
