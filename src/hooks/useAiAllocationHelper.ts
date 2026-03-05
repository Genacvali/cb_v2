import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AiCategorySummary {
  id: string;
  name: string;
  plannedTotal: number;
  currentAllocated: number;
  /** 'percentage' if existing allocations use %, 'fixed' otherwise */
  preferredAllocationType: 'percentage' | 'fixed';
}

export interface AiAllocationRequest {
  remainingAmount: number;
  currency: string;
  categories: AiCategorySummary[];
  /** ID источника дохода, из которого распределяем (null = любой) */
  incomeCategoryId: string | null;
  incomeCategoryName: string | null;
  /** Какой тип распределения использовать */
  allocationTypePreference: 'percentage' | 'fixed' | 'any';
}

export interface AiAllocationSuggestion {
  category_id: string;
  /** Additional fixed amount to add (always provided) */
  amount: number;
  /** 'percentage' | 'fixed' — which type the new allocation should use */
  allocation_type: 'percentage' | 'fixed';
  comment?: string;
}

export interface AiAllocationResponse {
  suggestions: AiAllocationSuggestion[];
  totalSuggested: number;
  note?: string;
}

export function useAiAllocationHelper() {
  return useMutation<AiAllocationResponse, Error, AiAllocationRequest>({
    mutationFn: async (payload: AiAllocationRequest) => {
      const { data, error } = await supabase.functions.invoke<AiAllocationResponse>(
        'ai-budget-helper',
        {
          body: payload,
        }
      );

      if (error) {
        throw new Error(error.message || 'Не удалось получить ответ ИИ');
      }

      if (!data) {
        throw new Error('Пустой ответ от ИИ');
      }

      return data;
    },
  });
}

