import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Currency } from '@/types/budget';

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
  const curr = currencies.find(c => c.code === currency);
  const symbol = curr?.symbol || currency;
  
  return new Intl.NumberFormat('ru-RU', { 
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount) + ' ' + symbol;
}

export function getCurrencySymbol(currency: string, currencies: Currency[]): string {
  const curr = currencies.find(c => c.code === currency);
  return curr?.symbol || currency;
}
