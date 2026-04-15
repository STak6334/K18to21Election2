import rawElectionData from '../summaries/election_summary.json';
import rawRegionalData from '../summaries/regional_summary.json';
import ElectionDashboard from './components/ElectionDashboard';
import type { ElectionRecord, RegionalRecord } from './types/election';

export default function Home() {
  return (
    <ElectionDashboard
      electionData={rawElectionData as unknown as ElectionRecord[]}
      regionalData={rawRegionalData as unknown as Record<string, RegionalRecord>}
    />
  );
}
