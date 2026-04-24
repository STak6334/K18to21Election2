'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { translate, type Locale, type TranslationKey } from '../lib/i18n';

interface LanguageCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const Ctx = createContext<LanguageCtx | null>(null);

const STORAGE_KEY = 'k21.locale';
const URL_PARAM = 'lang';

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ko';
  const url = new URL(window.location.href);
  const qp = url.searchParams.get(URL_PARAM);
  if (qp === 'ko' || qp === 'en') return qp;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'ko' || stored === 'en') return stored;
  const nav = (window.navigator.language || '').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(readInitialLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale === 'ko' ? 'ko' : 'en';
    } catch {
      // ignore
    }
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  const value = useMemo<LanguageCtx>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(key, locale),
    }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback: default to Korean when used outside a provider (SSR safety).
    return {
      locale: 'ko',
      setLocale: () => {},
      t: (key) => translate(key, 'ko'),
    };
  }
  return ctx;
}

export function useT() {
  return useLanguage().t;
}

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t('lang.toggle')}
      className={`inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs ${className}`}
    >
      <Globe className="ml-1.5 mr-1 h-3.5 w-3.5 text-slate-400" aria-hidden />
      <LangBtn active={locale === 'ko'} onClick={() => setLocale('ko')} label="한국어" />
      <LangBtn active={locale === 'en'} onClick={() => setLocale('en')} label="EN" />
    </div>
  );
}

function LangBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        active ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
