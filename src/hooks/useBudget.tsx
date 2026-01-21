import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { IncomeCategory, ExpenseCategory, Income, Profile, CategoryTemplate } from '@/types/budget';

export function useProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useIncomeCategories() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['income-categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('income_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      return data as IncomeCategory[];
    },
    enabled: !!user,
  });
}

export function useExpenseCategories() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['expense-categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      return data as ExpenseCategory[];
    },
    enabled: !!user,
  });
}

export function useIncomes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['incomes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('incomes')
        .select('*, category:income_categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Income[];
    },
    enabled: !!user,
  });
}

export function useAddIncomeCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (category: Omit<IncomeCategory, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('income_categories')
        .insert({ ...category, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
    },
  });
}

export function useAddExpenseCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (category: Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('expense_categories')
        .insert({ ...category, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExpenseCategory> & { id: string }) => {
      const { error } = await supabase
        .from('expense_categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
}

export function useDeleteIncomeCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
    },
  });
}

export function useUpdateIncomeCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncomeCategory> & { id: string }) => {
      const { error } = await supabase
        .from('income_categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
    },
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (income: Omit<Income, 'id' | 'user_id' | 'created_at' | 'category'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('incomes')
        .insert({ ...income, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (template: CategoryTemplate) => {
      if (!user) throw new Error('Not authenticated');
      
      // Add income categories
      for (const cat of template.incomeCategories) {
        await supabase
          .from('income_categories')
          .insert({ ...cat, user_id: user.id });
      }
      
      // Add expense categories
      for (const cat of template.expenseCategories) {
        await supabase
          .from('expense_categories')
          .insert({ ...cat, user_id: user.id });
      }
      
      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
