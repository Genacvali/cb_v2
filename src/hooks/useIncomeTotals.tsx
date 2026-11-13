import { useMemo } from 'react';
import { useIncomes } from './useBudget';
import { useFormatMoney } from './useCurrencies';
import { useExchangeRates } from './useExchangeRates';
import { sumIncomes } from '@/lib/allocations';

/**
 * Income per source and in total, in the profile currency. Incomes in other
 * currencies are converted at today's rate; rates load only when needed.
 */
export function useIncomeTotals() {
  const { data: incomes = [] } = useIncomes();
  const { defaultCurrency } = useFormatMoney();
  const hasForeign = incomes.some(inc => (inc.currency || defaultCurrency) !== defaultCurrency);
  const { convert, isLoading: ratesLoading } = useExchangeRates({ enabled: hasForeign });

  const totals = useMemo(
    () => sumIncomes(incomes, defaultCurrency, (amount, currency) => convert(amount, currency, defaultCurrency)),
    [incomes, defaultCurrency, convert],
  );

  return {
    incomes,
    incomeByCategory: totals.byCategory,
    totalIncome: totals.total,
    missingRates: totals.missingRates,
    hasForeign,
    ratesLoading: hasForeign && ratesLoading,
    baseCurrency: defaultCurrency,
  };
}
