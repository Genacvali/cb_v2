-- Create table for expense category allocations (linking expense categories to income sources)
CREATE TABLE public.expense_category_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  income_category_id UUID NOT NULL REFERENCES public.income_categories(id) ON DELETE CASCADE,
  allocation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (allocation_type IN ('percentage', 'fixed')),
  allocation_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_category_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own allocations" 
ON public.expense_category_allocations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own allocations" 
ON public.expense_category_allocations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allocations" 
ON public.expense_category_allocations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocations" 
ON public.expense_category_allocations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_allocations_expense_category ON public.expense_category_allocations(expense_category_id);
CREATE INDEX idx_allocations_income_category ON public.expense_category_allocations(income_category_id);