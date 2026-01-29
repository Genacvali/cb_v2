import { useState, useMemo } from 'react';
import { useIncomes, useIncomeCategories, useUpdateIncome } from '@/hooks/useBudget';
import { useCurrencies, formatMoney, getCurrencySymbol } from '@/hooks/useCurrencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { History, ChevronDown, ChevronUp, Calendar, Trash2, Pencil, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Income } from '@/types/budget';

type PeriodFilter = 'all' | 'current' | 'last' | 'last3';

export function IncomeHistory() {
  const { data: incomes = [] } = useIncomes();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: currencies = [] } = useCurrencies();
  const updateIncome = useUpdateIncome();
  const queryClient = useQueryClient();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Edit state
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCurrency, setEditCurrency] = useState('RUB');

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Без категории';
    return incomeCategories.find(c => c.id === categoryId)?.name || 'Неизвестная';
  };

  const filteredIncomes = useMemo(() => {
    const now = new Date();
    
    return incomes.filter(income => {
      const incomeDate = new Date(income.created_at);
      
      switch (periodFilter) {
        case 'current': {
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          return isWithinInterval(incomeDate, { start, end });
        }
        case 'last': {
          const lastMonth = subMonths(now, 1);
          const start = startOfMonth(lastMonth);
          const end = endOfMonth(lastMonth);
          return isWithinInterval(incomeDate, { start, end });
        }
        case 'last3': {
          const threeMonthsAgo = subMonths(now, 3);
          return incomeDate >= startOfMonth(threeMonthsAgo);
        }
        default:
          return true;
      }
    });
  }, [incomes, periodFilter]);

  // Group totals by currency
  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredIncomes.forEach(income => {
      const curr = income.currency || 'RUB';
      totals[curr] = (totals[curr] || 0) + Number(income.amount);
    });
    return totals;
  }, [filteredIncomes]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredIncomes> = {};
    
    filteredIncomes.forEach(income => {
      const dateKey = format(new Date(income.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(income);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => {
        // Calculate totals by currency for this date
        const dailyTotals: Record<string, number> = {};
        items.forEach(item => {
          const curr = item.currency || 'RUB';
          dailyTotals[curr] = (dailyTotals[curr] || 0) + Number(item.amount);
        });
        
        return {
          date,
          formattedDate: format(new Date(date), 'd MMMM yyyy', { locale: ru }),
          items,
          dailyTotals
        };
      });
  }, [filteredIncomes]);

  const handleDeleteIncome = async (incomeId: string) => {
    try {
      const { error } = await supabase
        .from('incomes')
        .delete()
        .eq('id', incomeId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      toast.success('Запись удалена');
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleEditClick = (income: Income) => {
    setEditingIncome(income);
    setEditAmount(String(income.amount));
    setEditCategoryId(income.category_id || '');
    setEditDescription(income.description || '');
    setEditCurrency(income.currency || 'RUB');
  };

  const handleEditSave = async () => {
    if (!editingIncome || !editAmount || !editCategoryId) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      await updateIncome.mutateAsync({
        id: editingIncome.id,
        amount: parseFloat(editAmount),
        category_id: editCategoryId,
        description: editDescription || null,
        currency: editCurrency,
      });
      toast.success('Запись обновлена');
      setEditingIncome(null);
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const periodLabels: Record<PeriodFilter, string> = {
    all: 'Все время',
    current: 'Текущий месяц',
    last: 'Прошлый месяц',
    last3: 'Последние 3 месяца'
  };

  const formatTotals = (totals: Record<string, number>) => {
    return Object.entries(totals)
      .map(([curr, amount]) => formatMoney(amount, curr, currencies))
      .join(' • ');
  };

  if (incomes.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="glass-card overflow-hidden">
        <CardHeader className="p-3 md:p-4 pb-2">
          <div className="flex items-center justify-between gap-1 md:gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity min-w-0"
            >
              <History className="w-4 h-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm md:text-base truncate">История</CardTitle>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
            
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 md:px-2">
                {filteredIncomes.length}
              </Badge>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="h-7 md:h-8 w-[100px] md:w-[140px] text-[10px] md:text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Этот месяц</SelectItem>
                  <SelectItem value="last">Прошлый</SelectItem>
                  <SelectItem value="last3">3 месяца</SelectItem>
                  <SelectItem value="all">Все</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="p-3 md:p-4 pt-2 space-y-2 md:space-y-3">
            {/* Period summary */}
            <div className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-secondary/30">
              <span className="text-xs md:text-sm text-muted-foreground">{periodLabels[periodFilter]}</span>
              <span className="font-semibold text-xs md:text-sm">{formatTotals(totalsByCurrency)}</span>
            </div>

            {groupedByDate.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Нет записей за выбранный период
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {groupedByDate.map(group => (
                  <div key={group.date} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {group.formattedDate}
                      </div>
                      <span className="font-medium text-muted-foreground">
                        {formatTotals(group.dailyTotals)}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5">
                      {group.items.map(income => (
                        <div 
                          key={income.id} 
                          className="flex items-center justify-between p-2 md:p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <span className="text-xs md:text-sm font-medium truncate">
                                {getCategoryName(income.category_id)}
                              </span>
                              {income.description && (
                                <Badge variant="outline" className="text-[8px] md:text-[10px] px-1 shrink-0 hidden sm:inline-flex">
                                  {income.description}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {format(new Date(income.created_at), 'HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
                            <span className="text-xs md:text-sm font-semibold text-primary">
                              +{formatMoney(Number(income.amount), income.currency || 'RUB', currencies)}
                            </span>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 md:transition-opacity text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditClick(income)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 md:transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Запись о доходе {formatMoney(Number(income.amount), income.currency || 'RUB', currencies)} будет удалена.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteIncome(income.id)}>
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Редактировать запись</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Сумма и валюта</label>
              <div className="flex gap-2">
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue>
                      {getCurrencySymbol(editCurrency, currencies)}
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
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {getCurrencySymbol(editCurrency, currencies)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Описание (опционально)</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Например: Начальный баланс"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIncome(null)}>
              Отмена
            </Button>
            <Button onClick={handleEditSave} disabled={updateIncome.isPending}>
              {updateIncome.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
