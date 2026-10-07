import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Currency } from '@/types/budget';
import { useProfile } from './useBudget';
import { findKnownCurrency } from '@/constants/currencies';

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as Currency[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function formatMoney(amount: number, currency: string, currencies: Currency[]): string {
  return new Intl.NumberFormat('ru-RU', { 
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount) + ' ' + getCurrencySymbol(currency, currencies);
}

export function getCurrencySymbol(currency: string, currencies: Currency[]): string {
  const curr = currencies.find(c => c.code === currency);
  return curr?.symbol || findKnownCurrency(currency)?.symbol || currency;
}

/**
 * Returns a formatter bound to the user's default currency, so components
 * don't need to hardcode a symbol. Pass an explicit currency to override.
 */
export function useFormatMoney() {
  const { data: currencies = [] } = useCurrencies();
  const { data: profile } = useProfile();
  const defaultCurrency = profile?.default_currency || 'RUB';

  const format = useCallback(
    (amount: number, currency?: string) => formatMoney(amount, currency || defaultCurrency, currencies),
    [currencies, defaultCurrency],
  );

  return { format, defaultCurrency, symbol: getCurrencySymbol(defaultCurrency, currencies), currencies };
}
