import { useState } from 'react';
import { useIncomeCategories, useAddIncome } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AddIncomeForm() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  
  const { data: incomeCategories = [] } = useIncomeCategories();
  const addIncome = useAddIncome();
  const { toast } = useToast();

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
        description: description || null,
      });
      
      setAmount('');
      setCategoryId('');
      setDescription('');
      
      toast({
        title: 'Успешно!',
        description: 'Доход добавлен',
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
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Добавить доход
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="amount" className="text-sm">Сумма *</Label>
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
              <Label htmlFor="category" className="text-sm">Категория *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-4 h-4" />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <Button 
            type="submit" 
            className="w-full gradient-primary hover:opacity-90 h-10 md:h-11 text-sm md:text-base"
            disabled={addIncome.isPending}
          >
            {addIncome.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Добавляю...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Добавить доход
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
