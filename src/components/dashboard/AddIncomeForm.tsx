import { useState } from 'react';
import { useIncomeCategories, useAddIncome } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { QuickCategoryAdd } from './QuickCategoryAdd';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export function AddIncomeForm() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isStartingBalance, setIsStartingBalance] = useState(false);
  
  const { data: incomeCategories = [] } = useIncomeCategories();
  const addIncome = useAddIncome();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !categoryId) {
      toast.error('Выберите категорию и введите сумму');
      return;
    }

    try {
      await addIncome.mutateAsync({
        amount: parseFloat(amount),
        category_id: categoryId,
        description: isStartingBalance ? 'Начальный баланс' : null,
      });
      
      setAmount('');
      // Keep category selected for quick repeated entries
      setIsStartingBalance(false);
      
      toast.success(isStartingBalance ? 'Баланс сохранён' : 'Доход добавлен');
    } catch {
      toast.error('Не удалось добавить');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount && categoryId) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const selectedCategory = incomeCategories.find(c => c.id === categoryId);

  return (
    <Card className="glass-card">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Добавить доход
        </CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStartingBalance(!isStartingBalance)}
            className={`text-xs px-2 py-1 rounded-full transition-colors ${
              isStartingBalance 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wallet className="w-3 h-3 inline mr-1" />
            Баланс
          </button>
          <QuickCategoryAdd type="income" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* Category selector - compact */}
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[140px] h-10 shrink-0">
              <SelectValue placeholder="Категория">
                {selectedCategory && (
                  <span className="flex items-center gap-1.5">
                    <CategoryIcon icon={selectedCategory.icon} className="w-4 h-4" />
                    <span className="truncate">{selectedCategory.name}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {incomeCategories.length === 0 ? (
                <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                  Нажмите «Добавить» ↗
                </div>
              ) : (
                incomeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Amount input */}
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              step="0.01"
              className="h-10 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₽</span>
          </div>

          {/* Submit button */}
          <Button 
            type="submit" 
            size="icon"
            className="h-10 w-10 shrink-0 gradient-primary"
            disabled={addIncome.isPending || !amount || !categoryId}
          >
            {addIncome.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
