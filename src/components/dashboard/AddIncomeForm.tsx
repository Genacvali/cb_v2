import { useState } from 'react';
import { useIncomeCategories, useAddIncome } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { QuickCategoryAdd } from './QuickCategoryAdd';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AddIncomeForm() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isStartingBalance, setIsStartingBalance] = useState(false);
  
  const { data: incomeCategories = [] } = useIncomeCategories();
  const addIncome = useAddIncome();
  const { toast } = useToast();

  const handleStartingBalanceToggle = (checked: boolean) => {
    setIsStartingBalance(checked);
    if (checked) {
      setDescription('Начальный баланс');
    } else {
      setDescription('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !categoryId) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addIncome.mutateAsync({
        amount: parseFloat(amount),
        category_id: categoryId,
        description: isStartingBalance ? 'Начальный баланс' : (description || null),
      });
      
      setAmount('');
      setCategoryId('');
      setDescription('');
      setIsStartingBalance(false);
      
      toast({
        title: 'Успешно!',
        description: isStartingBalance ? 'Начальный баланс добавлен' : 'Доход добавлен',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить доход',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Добавить доход
        </CardTitle>
        <QuickCategoryAdd type="income" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Starting balance toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="starting-balance" className="text-sm font-normal cursor-pointer">
                Это начальный баланс
              </Label>
            </div>
            <Switch
              id="starting-balance"
              checked={isStartingBalance}
              onCheckedChange={handleStartingBalanceToggle}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="amount" className="text-sm">
                {isStartingBalance ? 'Текущий баланс *' : 'Сумма *'}
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
                className="h-10 md:h-11"
              />
            </div>
            
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="category" className="text-sm">
                {isStartingBalance ? 'Источник *' : 'Категория *'}
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.length === 0 ? (
                    <div className="py-3 px-2 text-center text-sm text-muted-foreground">
                      Нет категорий. Нажмите «Добавить» выше.
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
            </div>
          </div>

          {!isStartingBalance && (
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="description" className="text-sm">Описание</Label>
              <Input
                id="description"
                placeholder="Например: Зарплата за январь"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 md:h-11"
              />
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full gradient-primary hover:opacity-90 h-10 md:h-11 text-sm md:text-base"
            disabled={addIncome.isPending}
          >
            {addIncome.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isStartingBalance ? 'Сохраняю...' : 'Добавляю...'}
              </>
            ) : (
              <>
                {isStartingBalance ? <Wallet className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {isStartingBalance ? 'Сохранить баланс' : 'Добавить доход'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
