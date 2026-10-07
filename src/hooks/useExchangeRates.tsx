import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KNOWN_CURRENCIES } from '@/constants/currencies';
import { useFormatMoney } from './useCurrencies';

/** All rates are expressed as "1 USD = X units of currency". */
export interface ExchangeRates {
  base: 'USD';
  rates: Record<string, number>;
  /** ISO date of the rate snapshot */
  date: string;
  source: string;
}

const PRIMARY_URL = 'https://open.er-api.com/v6/latest/USD';
const FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';
const FALLBACK_URL_2 = 'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json';

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchPrimary(): Promise<ExchangeRates> {
  const data = await fetchJson<{
    result: string;
    time_last_update_utc: string;
    rates: Record<string, number>;
  }>(PRIMARY_URL);
  if (data.result !== 'success' || !data.rates) throw new Error('Bad response');
  return {
    base: 'USD',
    rates: { ...data.rates, USD: 1 },
    date: new Date(data.time_last_update_utc).toISOString().slice(0, 10),
    source: 'open.er-api.com',
  };
}

async function fetchFallback(url: string): Promise<ExchangeRates> {
  const data = await fetchJson<{ date: string; usd: Record<string, number> }>(url);
  if (!data.usd) throw new Error('Bad response');
  const rates: Record<string, number> = { USD: 1 };
  for (const [code, value] of Object.entries(data.usd)) {
    rates[code.toUpperCase()] = value;
  }
  return { base: 'USD', rates, date: data.date, source: 'currency-api' };
}

async function fetchExchangeRates(): Promise<ExchangeRates> {
  const attempts = [
    () => fetchPrimary(),
    () => fetchFallback(FALLBACK_URL),
    () => fetchFallback(FALLBACK_URL_2),
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Не удалось загрузить курсы валют');
}

export function useExchangeRates() {
  const query = useQuery({
    queryKey: ['exchange-rates', 'USD'],
    queryFn: fetchExchangeRates,
    staleTime: 1000 * 60 * 60 * 6, // rates update daily; 6h is plenty
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const rates = query.data?.rates;

  /** Convert between any two supported currencies via USD cross rate. */
  const convert = useCallback(
    (amount: number, from: string, to: string): number | null => {
      if (from === to) return amount;
      if (!rates) return null;
      const fromRate = rates[from];
      const toRate = rates[to];
      if (!fromRate || !toRate) return null;
      return (amount / fromRate) * toRate;
    },
    [rates],
  );

  /** Rate of 1 unit of `from` expressed in `to`. */
  const rateOf = useCallback(
    (from: string, to: string): number | null => convert(1, from, to),
    [convert],
  );

  const supportedCodes = useMemo(() => {
    if (!rates) return KNOWN_CURRENCIES.map(c => c.code);
    return KNOWN_CURRENCIES.filter(c => rates[c.code]).map(c => c.code);
  }, [rates]);

  return { ...query, rates, convert, rateOf, supportedCodes, date: query.data?.date, source: query.data?.source };
}

// ── Display currency (dashboard-wide "show amounts in …") ─────────────────────

const DISPLAY_CURRENCY_KEY = 'crystalbudget-display-currency';

interface DisplayCurrencyContextType {
  /** null = show amounts in the profile's default currency (no conversion) */
  displayCurrency: string | null;
  setDisplayCurrency: (code: string | null) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextType | undefined>(undefined);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISPLAY_CURRENCY_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (displayCurrency) localStorage.setItem(DISPLAY_CURRENCY_KEY, displayCurrency);
      else localStorage.removeItem(DISPLAY_CURRENCY_KEY);
    } catch {
      // storage unavailable — keep in-memory only
    }
  }, [displayCurrency]);

  const setDisplayCurrency = useCallback((code: string | null) => setState(code), []);

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error('useDisplayCurrency must be used within DisplayCurrencyProvider');
  return ctx;
}

/**
 * Money formatter that honours the dashboard display currency. Amounts are
 * assumed to be in the profile default currency unless `currency` is passed.
 * Falls back to the original amount if rates are unavailable.
 */
export function useDisplayMoney() {
  const { format, defaultCurrency, currencies } = useFormatMoney();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { convert, rateOf, date, isLoading, isError } = useExchangeRates();

  const target = displayCurrency && displayCurrency !== defaultCurrency ? displayCurrency : null;

  const money = useCallback(
    (amount: number, currency?: string) => {
      const from = currency || defaultCurrency;
      if (!target || from === target) return format(amount, from);
      const converted = convert(amount, from, target);
      if (converted === null) return format(amount, from);
      return `≈ ${format(converted, target)}`;
    },
    [convert, defaultCurrency, format, target],
  );

  const rate = target ? rateOf(target, defaultCurrency) : null;

  return {
    money,
    isConverted: !!target,
    displayCurrency: target,
    defaultCurrency,
    currencies,
    rate,
    rateDate: date,
    ratesLoading: isLoading,
    ratesError: isError,
    resetDisplayCurrency: () => setDisplayCurrency(null),
  };
}
