'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, Hash, Link as LinkIcon, Share2 } from 'lucide-react';
import type { ElectionRecord, RegionalRecord } from '../types/election';
import { LAST_PIPELINE_RUN } from '../lib/methodology';
import { useLanguage } from './LanguageProvider';

interface Props {
  view: string;
  selectedElection: string;
  electionData: ElectionRecord[];
  regional: Record<string, RegionalRecord>;
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(6, '0').slice(0, 8);
}

export default function ShareBar({ view, selectedElection, electionData, regional }: Props) {
  const { locale, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const dataHash = useMemo(() => {
    const parts: string[] = [
      `pipeline:${LAST_PIPELINE_RUN.runId}`,
      `rows:${LAST_PIPELINE_RUN.rowsOut}`,
      ...electionData.map((e) => `${e.Election}:${e['Total Votes']}:${e.Turnout}:${e.Voters}`),
      ...Object.entries(regional).flatMap(([cycle, regions]) =>
        Object.entries(regions).map(
          ([r, v]) =>
            `${cycle}:${r}:${v.Conservative.toFixed(6)}:${v.Democratic.toFixed(6)}`,
        ),
      ),
    ];
    return hashString(parts.join('|'));
  }, [electionData, regional]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    url.searchParams.set('election', selectedElection);
    url.searchParams.set('lang', locale);
    url.searchParams.set('hash', dataHash);
    url.searchParams.set('run', LAST_PIPELINE_RUN.runId);
    return url.toString();
  }, [view, selectedElection, locale, dataHash]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [shareUrl]);

  return (
    <div
      role="region"
      aria-label={t('share.button')}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-900/40 px-5 py-3 text-xs"
    >
      <div className="flex items-center gap-4 text-slate-400">
        <span className="flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          <span className="uppercase tracking-wider text-slate-500">
            {t('footer.dataHash')}
          </span>
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-slate-200">
            {dataHash}
          </code>
        </span>
        <span className="hidden sm:inline text-slate-600">·</span>
        <span className="hidden font-mono text-slate-500 sm:inline">
          run {LAST_PIPELINE_RUN.runId}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label={t('share.button')}
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
            <span className="text-emerald-300">{t('share.copied')}</span>
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            {t('share.button')}
          </>
        )}
      </button>
    </div>
  );
}

export { hashString };
