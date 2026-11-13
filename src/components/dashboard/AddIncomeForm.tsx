import { useState, useEffect, useRef } from 'react';
import { useIncomeCategories, useAddIncome, useProfile } from '@/hooks/useBudget';
import { useCurrencies, getCurrencySymbol } from '@/hooks/useCurrencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { QuickCategoryAdd } from './QuickCategoryAdd';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export function AddIncomeForm() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [currency, setCurrency] = useState('RUB');
  const [isStartingBalance, setIsStartingBalance] = useState(false);
  const knownCategoryIds = useRef<Set<string> | null>(null);

  const { data: incomeCategories = [], isSuccess: categoriesLoaded } = useIncomeCategories();
  const { data: profile } = useProfile();
  const { data: currencies = [] } = useCurrencies();
  const addIncome = useAddIncome();

  // Set default currency from profile
  useEffect(() => {
    if (profile?.default_currency) {
      setCurrency(profile.default_currency);
    }
  }, [profile?.default_currency]);

  // Preselect a source: the first one on load, a freshly created one afterwards.
  useEffect(() => {
    if (!categoriesLoaded) return;
    const ids = incomeCategories.map(c => c.id);
    const known = knownCategoryIds.current;
    const created = known ? ids.find(id => !known.has(id)) : undefined;
    knownCategoryIds.current = new Set(ids);
    if (created) {
      setCategoryId(created);
    } else if (!ids.includes(categoryId)) {
      setCategoryId(ids[0] ?? '');
    }
  }, [categoriesLoaded, incomeCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !categoryId) {
      toast.error('Выберите источник и введите сумму');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!(parsedAmount > 0)) {
      toast.error('Сумма должна быть больше нуля');
      return;
    }

    try {
      await addIncome.mutateAsync({
        amount: parsedAmount,
        category_id: categoryId,
        currency,
        description: isStartingBalance ? 'Начальный баланс' : null,
      });

      setAmount('');
      setIsStartingBalance(false);

      toast.success(isStartingBalance ? 'Остаток сохранён' : 'Доход добавлен');
    } catch {
      toast.error('Не удалось добавить');
    }
  };

  const selectedCategory = incomeCategories.find(c => c.id === categoryId);
  const currencySymbol = getCurrencySymbol(currency, currencies);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="p-3 md:p-4 pb-2 md:pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm md:text-base flex items-center gap-1.5">
          <Wallet className="w-4 h-4" />
          Доход
        </CardTitle>
        <QuickCategoryAdd type="income" label="Источник" />
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-1 md:pt-1">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger
                className="flex-1 min-w-0 h-10 text-sm [&>span]:line-clamp-none"
                aria-label="Источник дохода"
              >
                <SelectValue placeholder="Источник дохода">
                  {selectedCategory && (
                    <span className="flex items-center gap-2 min-w-0">
                      <CategoryIcon icon={selectedCategory.icon} className="text-sm shrink-0" />
                      <span className="truncate">{selectedCategory.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.length === 0 ? (
                  <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                    Создайте источник кнопкой «+ Источник»
                  </div>
                ) : (
                  incomeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={cat.icon} className="text-sm" />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[76px] h-10 shrink-0 text-sm px-3" aria-label="Валюта">
                <SelectValue>
                  {currencySymbol}
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
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Сумма"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                aria-label="Сумма дохода"
                className="h-10 pr-8 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currencySymbol}
              </span>
            </div>

            <Button
              type="submit"
              className="h-10 px-4 shrink-0 gradient-primary"
              disabled={addIncome.isPending || !amount || !categoryId}
            >
              {addIncome.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </div>

          <label className="flex items-center gap-2 pt-1 text-xs md:text-sm text-muted-foreground cursor-pointer select-none w-fit">
            <Switch checked={isStartingBalance} onCheckedChange={setIsStartingBalance} />
            Это начальный остаток на счёте
          </label>
        </form>
      </CardContent>
    </Card>
  );
}
