import { useState, useEffect } from 'react';
import { useIncomeCategories, useAddIncome, useResetIncomes, useIncomes, useProfile } from '@/hooks/useBudget';
import { useCurrencies, getCurrencySymbol } from '@/hooks/useCurrencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuickCategoryAdd } from './QuickCategoryAdd';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Loader2, Wallet, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function AddIncomeForm() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [isStartingBalance, setIsStartingBalance] = useState(false);
  
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: incomes = [] } = useIncomes();
  const { data: profile } = useProfile();
  const { data: currencies = [] } = useCurrencies();
  const addIncome = useAddIncome();
  const resetIncomes = useResetIncomes();

  // Set default currency from profile
  useEffect(() => {
    if (profile?.default_currency) {
      setCurrency(profile.default_currency);
    }
  }, [profile?.default_currency]);

  const handleReset = async () => {
    try {
      await resetIncomes.mutateAsync();
      toast.success('Доходы обнулены. Введите новую сумму для распределения.');
    } catch {
      toast.error('Ошибка при обнулении');
    }
  };

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
        currency,
        description: isStartingBalance ? 'Начальный баланс' : null,
      });
      
      setAmount('');
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
  const currencySymbol = getCurrencySymbol(currency, currencies);

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
            className={`text-xs px-2 py-1 rounded-full transition-colors flex items-center gap-1 ${
              isStartingBalance 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
            title="Записать как начальный остаток на счёте"
          >
            <Wallet className="w-3 h-3" />
            <span className="hidden sm:inline">
              {isStartingBalance ? 'Начальный остаток ✓' : 'Начальный остаток'}
            </span>
            <span className="sm:hidden">
              {isStartingBalance ? `${currencySymbol} Остаток ✓` : `${currencySymbol} Остаток`}
            </span>
          </button>
          <QuickCategoryAdd type="income" />
          
          {incomes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded-full transition-colors flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  title="Обнулить все доходы для нового распределения"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Сброс</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Начать новый период?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Все текущие доходы будут обнулены. Вы сможете ввести новую сумму для нового распределения по категориям.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Обнулить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          {/* Category selector - compact */}
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[120px] h-10 shrink-0">
              <SelectValue placeholder="Категория">
                {selectedCategory && (
                  <span className="truncate">{selectedCategory.name}</span>
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
                    {cat.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Currency selector */}
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[70px] h-10 shrink-0">
              <SelectValue>
                {getCurrencySymbol(currency, currencies)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{curr.symbol}</span>
                    <span className="text-muted-foreground text-xs">{curr.code}</span>
                  </span>
                </SelectItem>
              ))}
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
              className="h-10 pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {currencySymbol}
            </span>
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
