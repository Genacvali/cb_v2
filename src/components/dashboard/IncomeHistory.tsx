import { useState, useMemo } from 'react';
import { useIncomes, useIncomeCategories } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, ChevronDown, ChevronUp, Calendar,  Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type PeriodFilter = 'all' | 'current' | 'last' | 'last3';

export function IncomeHistory() {
  const { data: incomes = [] } = useIncomes();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const queryClient = useQueryClient();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current');
  const [isExpanded, setIsExpanded] = useState(false);

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
      .map(([date, items]) => ({
        date,
        formattedDate: format(new Date(date), 'd MMMM yyyy', { locale: ru }),
        items,
        total: items.reduce((sum, i) => sum + Number(i.amount), 0)
      }));
  }, [filteredIncomes]);

  const totalForPeriod = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

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

  const periodLabels: Record<PeriodFilter, string> = {
    all: 'Все время',
    current: 'Текущий месяц',
    last: 'Прошлый месяц',
    last3: 'Последние 3 месяца'
  };

  if (incomes.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <History className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">История доходов</CardTitle>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {filteredIncomes.length} записей
            </Badge>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Текущий месяц</SelectItem>
                <SelectItem value="last">Прошлый месяц</SelectItem>
                <SelectItem value="last3">3 месяца</SelectItem>
                <SelectItem value="all">Все время</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4 pt-2 space-y-3">
          {/* Period summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm text-muted-foreground">{periodLabels[periodFilter]}</span>
            <span className="font-semibold">{totalForPeriod.toLocaleString('ru-RU')} ₽</span>
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
                      {group.total.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {group.items.map(income => (
                      <div 
                        key={income.id} 
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {getCategoryName(income.category_id)}
                            </span>
                            {income.description && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {income.description}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(income.created_at), 'HH:mm')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">
                            +{Number(income.amount).toLocaleString('ru-RU')} ₽
                          </span>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Запись о доходе {Number(income.amount).toLocaleString('ru-RU')} ₽ будет удалена.
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
  );
}
