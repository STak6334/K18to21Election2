// Minimal, dependency-free i18n. Keys map to { ko, en } pairs. The provider
// lives in components/LanguageProvider.tsx; consumers read via useT().

export type Locale = 'ko' | 'en';

export interface Dict {
  ko: string;
  en: string;
}

type Key =
  | 'app.title'
  | 'app.subtitle'
  | 'nav.insight'
  | 'nav.report'
  | 'nav.audit'
  | 'nav.recount'
  | 'nav.methodology'
  | 'kpi.totalVotes'
  | 'kpi.turnout'
  | 'kpi.winner'
  | 'kpi.marginVotes'
  | 'kpi.sourceDatasets'
  | 'kpi.howComputed'
  | 'chart.candidatePerf'
  | 'chart.candidatePerf.desc'
  | 'chart.regionalSupport'
  | 'chart.regionalSupport.desc'
  | 'chart.actions'
  | 'chart.showData'
  | 'chart.hideData'
  | 'chart.downloadCsv'
  | 'chart.openMethod'
  | 'chart.keyboardHint'
  | 'chart.source'
  | 'swing.title'
  | 'swing.from'
  | 'swing.to'
  | 'swing.legend'
  | 'counterfactual.title'
  | 'counterfactual.description'
  | 'counterfactual.targetRegion'
  | 'counterfactual.turnoutBump'
  | 'counterfactual.newVoterDemShare'
  | 'counterfactual.baselineDem'
  | 'counterfactual.baselineCon'
  | 'counterfactual.baselineMargin'
  | 'counterfactual.adjustedDem'
  | 'counterfactual.adjustedCon'
  | 'counterfactual.adjustedMargin'
  | 'counterfactual.shift'
  | 'counterfactual.outcome'
  | 'counterfactual.flip'
  | 'counterfactual.noFlip'
  | 'counterfactual.assumptions'
  | 'anomaly.title'
  | 'anomaly.description'
  | 'anomaly.severity.info'
  | 'anomaly.severity.watch'
  | 'anomaly.severity.review'
  | 'anomaly.severity.critical'
  | 'anomaly.filter.all'
  | 'anomaly.filter.watchPlus'
  | 'anomaly.filter.reviewPlus'
  | 'anomaly.filter.criticalOnly'
  | 'anomaly.col.severity'
  | 'anomaly.col.province'
  | 'anomaly.col.district'
  | 'anomaly.col.r1'
  | 'anomaly.col.r2'
  | 'anomaly.col.pi95'
  | 'anomaly.col.k'
  | 'anomaly.col.residual'
  | 'anomaly.col.reasons'
  | 'anomaly.showingTop'
  | 'method.heading'
  | 'method.description'
  | 'method.lastRefresh'
  | 'method.runId'
  | 'method.duration'
  | 'method.gitBuild'
  | 'method.rowsIn'
  | 'method.rowsOut'
  | 'method.dedupDropped'
  | 'method.builders'
  | 'method.citeHint'
  | 'method.definitions'
  | 'method.formula'
  | 'method.units'
  | 'method.description2'
  | 'method.caveats'
  | 'method.provenance'
  | 'method.dataset'
  | 'method.file'
  | 'method.version'
  | 'method.lastModified'
  | 'method.origin'
  | 'method.rows'
  | 'method.cite'
  | 'refresh.lastRefresh'
  | 'refresh.runId'
  | 'refresh.dedup'
  | 'refresh.howComputed'
  | 'narrative.title'
  | 'narrative.description'
  | 'narrative.topShifts'
  | 'narrative.turnoutExtremes'
  | 'narrative.overPerform'
  | 'narrative.underPerform'
  | 'narrative.noData'
  | 'narrative.shiftToDem'
  | 'narrative.shiftToCon'
  | 'narrative.sinceLastCycle'
  | 'quality.title'
  | 'quality.description'
  | 'quality.dataset'
  | 'quality.completeness'
  | 'quality.freshness'
  | 'quality.schemaDrift'
  | 'quality.validationErrors'
  | 'quality.status'
  | 'quality.pass'
  | 'quality.warn'
  | 'quality.fail'
  | 'quality.rows'
  | 'quality.expected'
  | 'quality.ageDays'
  | 'quality.no_drift'
  | 'quality.drift_detected'
  | 'quality.summary.pass'
  | 'quality.summary.warn'
  | 'quality.summary.fail'
  | 'quality.detail.dataset'
  | 'share.button'
  | 'share.copied'
  | 'share.description'
  | 'lang.toggle'
  | 'lang.korean'
  | 'lang.english'
  | 'footer.copyright'
  | 'footer.dataHash'
  | 'footer.docs'
  | 'footer.pipeline'
  | 'footer.reportPdf'
  | 'common.positive'
  | 'common.negative'
  | 'common.votes'
  | 'common.region'
  | 'common.pct'
  | 'common.open'
  | 'common.close'
  | 'common.search';

export const DICT: Record<Key, Dict> = {
  'app.title': { ko: '선거 인사이트 허브', en: 'Electoral Insights Hub' },
  'app.subtitle': { ko: '분석 · 보고서 · 감사', en: 'Analytics · Reports · Audits' },
  'nav.insight': { ko: '인사이트', en: 'Insight' },
  'nav.report': { ko: '보고서', en: 'Reports' },
  'nav.audit': { ko: '감사', en: 'Audits' },
  'nav.recount': { ko: '재확인표 분석', en: 'Recount' },
  'nav.methodology': { ko: '방법론', en: 'Methodology' },

  'kpi.totalVotes': { ko: '총 투표수', en: 'Total Votes' },
  'kpi.turnout': { ko: '투표율', en: 'Turnout Rate' },
  'kpi.winner': { ko: '당선자', en: 'Winner' },
  'kpi.marginVotes': { ko: '표차(득표수)', en: 'Margin (votes)' },
  'kpi.sourceDatasets': { ko: '출처 데이터셋', en: 'Source datasets' },
  'kpi.howComputed': { ko: '산출 방법', en: 'How?' },

  'chart.candidatePerf': { ko: '후보자 성적', en: 'Candidate Performance' },
  'chart.candidatePerf.desc': {
    ko: '선택한 선거의 후보별 득표수 (득표순).',
    en: 'Votes received by each candidate in the selected election, sorted by count.',
  },
  'chart.regionalSupport': { ko: '지역별 지지도', en: 'Regional Support' },
  'chart.regionalSupport.desc': {
    ko: '17개 시도 양대 진영 득표율(%)을 누적 막대로 표시.',
    en: 'Conservative vs Democratic two-block vote shares by region (17 provinces), stacked, in percent.',
  },
  'chart.actions': { ko: '차트 작업', en: 'Chart actions' },
  'chart.showData': { ko: '데이터 보기', en: 'Show data' },
  'chart.hideData': { ko: '데이터 숨김', en: 'Hide data' },
  'chart.downloadCsv': { ko: 'CSV 내려받기', en: 'Download CSV' },
  'chart.openMethod': { ko: '방법론', en: 'Method' },
  'chart.keyboardHint': {
    ko: '차트 포커스 상태에서 ← → 키로 데이터 포인트를 탐색할 수 있습니다.',
    en: 'When the chart is focused, use ← → to navigate data points.',
  },
  'chart.source': { ko: '출처', en: 'Source' },

  'swing.title': { ko: '지역별 스윙', en: 'Swing by region' },
  'swing.from': { ko: '이전', en: 'From' },
  'swing.to': { ko: '이후', en: 'To' },
  'swing.legend': {
    ko: '양수 = 민주 진영 스윙(pp), 음수 = 보수 진영 스윙(pp). 방법론 참고.',
    en: 'Positive bars = Democratic swing (pp); negative = Conservative swing (pp). See methodology.',
  },

  'counterfactual.title': { ko: '반사실(What-If) 시뮬레이션', en: 'Counterfactual: turnout & composition' },
  'counterfactual.description': {
    ko: '특정 지역의 투표율과 신규 투표자 구성 변화가 전국 양당 격차에 주는 영향을 투명한 선형 모델로 실험합니다. 아래에 가정이 명시됩니다.',
    en: 'Explore a what-if: if turnout rose in a region with a specified split between blocks, how does the national two-block margin shift? Transparent linear model — assumptions printed below.',
  },
  'counterfactual.targetRegion': { ko: '대상 지역', en: 'Target region' },
  'counterfactual.turnoutBump': { ko: '투표율 증가폭', en: 'Turnout bump' },
  'counterfactual.newVoterDemShare': { ko: '신규 투표자 민주 비중', en: 'New-voter Dem share' },
  'counterfactual.baselineDem': { ko: '기준 민주', en: 'Baseline Dem' },
  'counterfactual.baselineCon': { ko: '기준 보수', en: 'Baseline Con' },
  'counterfactual.baselineMargin': { ko: '기준 격차', en: 'Baseline margin' },
  'counterfactual.adjustedDem': { ko: '조정 민주', en: 'Adjusted Dem' },
  'counterfactual.adjustedCon': { ko: '조정 보수', en: 'Adjusted Con' },
  'counterfactual.adjustedMargin': { ko: '조정 격차', en: 'Adjusted margin' },
  'counterfactual.shift': { ko: '변화', en: 'Shift' },
  'counterfactual.outcome': { ko: '결과', en: 'Outcome implied' },
  'counterfactual.flip': { ko: '역전', en: 'Flip' },
  'counterfactual.noFlip': { ko: '유지', en: 'No flip' },
  'counterfactual.assumptions': { ko: '가정', en: 'Assumptions' },

  'anomaly.title': { ko: '이상치 플래그', en: 'Anomaly flags' },
  'anomaly.description': {
    ko: '구시군별 스크리닝 휴리스틱입니다. 플래그는 결론이 아니라 재점검 대상입니다 — K값, 잔차 크기, 95% 예측구간 이탈 여부를 결합합니다.',
    en: 'District-level screening heuristics. A flag is not a finding — it marks districts worth manual review, combining K-value extremes, residual magnitude, and 95% PI deviation.',
  },
  'anomaly.severity.info': { ko: '정상', en: 'OK' },
  'anomaly.severity.watch': { ko: '주시', en: 'Watch' },
  'anomaly.severity.review': { ko: '재점검', en: 'Review' },
  'anomaly.severity.critical': { ko: '심각', en: 'Critical' },
  'anomaly.filter.all': { ko: '전체', en: 'All (info+)' },
  'anomaly.filter.watchPlus': { ko: '주시 이상', en: 'Watch+' },
  'anomaly.filter.reviewPlus': { ko: '재점검 이상', en: 'Review+' },
  'anomaly.filter.criticalOnly': { ko: '심각만', en: 'Critical only' },
  'anomaly.col.severity': { ko: '심각도', en: 'Severity' },
  'anomaly.col.province': { ko: '시도', en: 'Province' },
  'anomaly.col.district': { ko: '구시군', en: 'District' },
  'anomaly.col.r1': { ko: 'R1', en: 'R1' },
  'anomaly.col.r2': { ko: 'R2', en: 'R2' },
  'anomaly.col.pi95': { ko: '95% 구간', en: '95% PI' },
  'anomaly.col.k': { ko: 'K', en: 'K' },
  'anomaly.col.residual': { ko: '잔차', en: 'Residual' },
  'anomaly.col.reasons': { ko: '사유', en: 'Reasons' },
  'anomaly.showingTop': {
    ko: '상위 100개만 표시 중. 전체 목록은 CSV로 내려받으세요.',
    en: 'Showing top 100 flagged districts. Export CSV for the full list.',
  },

  'method.heading': { ko: '지표 산출 방식', en: 'How metrics are computed' },
  'method.description': {
    ko: '사이트에 표시되는 수치의 공식, 분모, 데이터 정제 규칙을 문서화합니다. 각 지표에 대해 측정 대상, 계산 방법, 그렇지 않은 것, 그리고 출처를 보여줍니다.',
    en: 'This panel documents every formula, denominator, and data-cleaning rule behind the numbers. For each metric we show what it measures, how it is calculated, what it is not, and where the input data came from.',
  },
  'method.lastRefresh': { ko: '최근 갱신', en: 'Last refresh' },
  'method.runId': { ko: '파이프라인 런 ID', en: 'Pipeline run ID' },
  'method.duration': { ko: '소요 시간', en: 'Duration' },
  'method.gitBuild': { ko: 'Git / 빌드', en: 'Git / build' },
  'method.rowsIn': { ko: '입력 행', en: 'Rows in' },
  'method.rowsOut': { ko: '출력 행', en: 'Rows out' },
  'method.dedupDropped': { ko: '중복 제거', en: 'Dedup dropped' },
  'method.builders': { ko: '빌더', en: 'Builders' },
  'method.citeHint': {
    ko: '스크린샷이나 도표를 공유할 때 이 런 ID로 스냅샷을 인용하세요.',
    en: 'Cite this snapshot by its run ID when sharing screenshots or figures.',
  },
  'method.definitions': { ko: '지표 정의', en: 'Metric definitions' },
  'method.formula': { ko: '공식', en: 'Formula' },
  'method.units': { ko: '단위', en: 'Units' },
  'method.description2': { ko: '설명', en: 'Description' },
  'method.caveats': { ko: '유의사항', en: 'Caveats' },
  'method.provenance': { ko: '데이터 출처', en: 'Data provenance' },
  'method.dataset': { ko: '데이터셋', en: 'Dataset' },
  'method.file': { ko: '파일', en: 'File' },
  'method.version': { ko: '버전', en: 'Version' },
  'method.lastModified': { ko: '수정일', en: 'Last modified' },
  'method.origin': { ko: '출처 기관', en: 'Upstream origin' },
  'method.rows': { ko: '행 수', en: 'Rows' },
  'method.cite': {
    ko: '각 지표는 KPI 카드의 툴팁 및 차트 아래 뱃지를 통해 출처가 표기됩니다.',
    en: 'Sources listed here are cited per-metric via KPI tooltips and per-chart badges.',
  },

  'refresh.lastRefresh': { ko: '최근 갱신', en: 'Last refresh' },
  'refresh.runId': { ko: '런 ID', en: 'Run ID' },
  'refresh.dedup': { ko: '중복 제거', en: 'dedup dropped' },
  'refresh.howComputed': { ko: '산출 방법', en: 'How metrics are computed' },

  'narrative.title': { ko: '자동 요약', en: 'Auto-insights' },
  'narrative.description': {
    ko: '선택된 선거에 대한 기본 요약입니다. 차트를 해석할 시간이 없는 독자를 위한 즉시 확인용 인사이트입니다.',
    en: 'Plain-language summary for the selected election — instant value for readers who don\'t have time to interpret every chart.',
  },
  'narrative.topShifts': { ko: '지난 주기 대비 지역 스윙 Top 3', en: 'Top 3 regional shifts since last cycle' },
  'narrative.turnoutExtremes': { ko: '투표율 변동 Top 지역', en: 'Largest turnout change regions' },
  'narrative.overPerform': { ko: '당선자가 역사적 평균을 상회한 지역', en: 'Where the winner over-performed history' },
  'narrative.underPerform': { ko: '당선자가 역사적 평균을 하회한 지역', en: 'Where the winner under-performed history' },
  'narrative.noData': {
    ko: '이전 주기 데이터가 부족하여 산출할 수 없습니다.',
    en: 'Insufficient prior-cycle data to compute.',
  },
  'narrative.shiftToDem': { ko: '민주 진영 이동', en: 'shifted toward Democratic' },
  'narrative.shiftToCon': { ko: '보수 진영 이동', en: 'shifted toward Conservative' },
  'narrative.sinceLastCycle': { ko: '직전 주기 대비', en: 'vs previous cycle' },

  'quality.title': { ko: '데이터 품질 & 감사 상태', en: 'Data quality & audit status' },
  'quality.description': {
    ko: '각 데이터셋의 완결성, 신선도, 스키마 드리프트, 검증 오류 개수를 한눈에 보여줍니다.',
    en: 'At-a-glance completeness, freshness, schema-drift, and row-level validation error counts per dataset.',
  },
  'quality.dataset': { ko: '데이터셋', en: 'Dataset' },
  'quality.completeness': { ko: '완결성', en: 'Completeness' },
  'quality.freshness': { ko: '신선도', en: 'Freshness' },
  'quality.schemaDrift': { ko: '스키마 드리프트', en: 'Schema drift' },
  'quality.validationErrors': { ko: '검증 오류', en: 'Validation errors' },
  'quality.status': { ko: '상태', en: 'Status' },
  'quality.pass': { ko: '통과', en: 'Pass' },
  'quality.warn': { ko: '경고', en: 'Warn' },
  'quality.fail': { ko: '실패', en: 'Fail' },
  'quality.rows': { ko: '행', en: 'rows' },
  'quality.expected': { ko: '예상', en: 'expected' },
  'quality.ageDays': { ko: '일 경과', en: 'days old' },
  'quality.no_drift': { ko: '드리프트 없음', en: 'No drift' },
  'quality.drift_detected': { ko: '드리프트 감지', en: 'Drift detected' },
  'quality.summary.pass': { ko: '통과', en: 'Passing' },
  'quality.summary.warn': { ko: '경고', en: 'Warning' },
  'quality.summary.fail': { ko: '실패', en: 'Failing' },
  'quality.detail.dataset': { ko: '데이터셋 상세', en: 'Dataset detail' },

  'share.button': { ko: '뷰 공유', en: 'Share this view' },
  'share.copied': { ko: '복사됨 ✓', en: 'Copied ✓' },
  'share.description': {
    ko: '현재 보고 있는 탭, 선거, 언어 설정이 URL에 인코딩됩니다.',
    en: 'Current tab, election, and locale are encoded into the URL.',
  },

  'lang.toggle': { ko: '언어 전환', en: 'Language toggle' },
  'lang.korean': { ko: '한국어', en: 'Korean' },
  'lang.english': { ko: '영어', en: 'English' },

  'footer.copyright': {
    ko: '© 2026 한국 대통령선거 분석 대시보드 · 18대~21대 통합 데이터',
    en: '© 2026 Korean Presidential Election Dashboard · 18th–21st consolidated dataset',
  },
  'footer.dataHash': { ko: '데이터 해시', en: 'Data hash' },
  'footer.docs': { ko: '데이터 검증 API', en: 'Data Validation API' },
  'footer.pipeline': { ko: '분석 파이프라인', en: 'Analysis Pipeline' },
  'footer.reportPdf': { ko: '보고서 PDF', en: 'Report PDF' },

  'common.positive': { ko: '상승', en: 'up' },
  'common.negative': { ko: '하락', en: 'down' },
  'common.votes': { ko: '표', en: 'votes' },
  'common.region': { ko: '지역', en: 'Region' },
  'common.pct': { ko: '%', en: '%' },
  'common.open': { ko: '열기', en: 'Open' },
  'common.close': { ko: '닫기', en: 'Close' },
  'common.search': { ko: '검색', en: 'Search' },
};

export type TranslationKey = Key;

export function translate(key: Key, locale: Locale): string {
  return DICT[key]?.[locale] ?? key;
}
