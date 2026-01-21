import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ExpenseCategoryAllocation } from '@/types/budget';

export function useExpenseCategoryAllocations(expenseCategoryId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['expense-category-allocations', expenseCategoryId],
    queryFn: async () => {
      if (!user || !expenseCategoryId) return [];
      const { data, error } = await supabase
        .from('expense_category_allocations')
        .select('*, income_category:income_categories(*)')
        .eq('expense_category_id', expenseCategoryId)
        .order('created_at');
      if (error) throw error;
      return data as ExpenseCategoryAllocation[];
    },
    enabled: !!user && !!expenseCategoryId,
  });
}

export function useAllAllocations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['all-allocations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('expense_category_allocations')
        .select('*, income_category:income_categories(*)')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      return data as ExpenseCategoryAllocation[];
    },
    enabled: !!user,
  });
}

export function useAddAllocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (allocation: Omit<ExpenseCategoryAllocation, 'id' | 'user_id' | 'created_at' | 'income_category'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('expense_category_allocations')
        .insert({ ...allocation, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-category-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['all-allocations'] });
    },
  });
}

export function useUpdateAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpenseCategoryAllocation> & { id: string }) => {
      const { error } = await supabase
        .from('expense_category_allocations')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-category-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['all-allocations'] });
    },
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_category_allocations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-category-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['all-allocations'] });
    },
  });
}

export function useBulkSaveAllocations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      expenseCategoryId, 
      allocations 
    }: { 
      expenseCategoryId: string; 
      allocations: Array<{
        id?: string;
        income_category_id: string;
        allocation_type: 'percentage' | 'fixed';
        allocation_value: number;
      }>;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete existing allocations for this expense category
      await supabase
        .from('expense_category_allocations')
        .delete()
        .eq('expense_category_id', expenseCategoryId);
      
      // Insert new allocations
      if (allocations.length > 0) {
        const { error } = await supabase
          .from('expense_category_allocations')
          .insert(
            allocations.map(a => ({
              expense_category_id: expenseCategoryId,
              income_category_id: a.income_category_id,
              allocation_type: a.allocation_type,
              allocation_value: a.allocation_value,
              user_id: user.id,
            }))
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-category-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['all-allocations'] });
    },
  });
}
