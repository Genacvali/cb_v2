import { useMemo, useState } from 'react';
import { useExpenseCategories, useIncomes, useIncomeCategories, useDeleteExpenseCategory } from '@/hooks/useBudget';
import { useAllAllocations, useBulkSaveAllocations } from '@/hooks/useAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { ExpenseCategoryEditor } from './ExpenseCategoryEditor';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExpenseCategory } from '@/types/budget';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, ChevronLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAiAllocationHelper } from '@/hooks/useAiAllocationHelper';

type AllocTypePreference = 'percentage' | 'fixed' | 'any';

export function CategoryAllocation() {
  const {
    data: expenseCategories = []
  } = useExpenseCategories();
  const {
    data: incomes = []
  } = useIncomes();
  const {
    data: incomeCategories = []
  } = useIncomeCategories();
  const {
    data: allAllocations = []
  } = useAllAllocations();
  const bulkSaveAllocations = useBulkSaveAllocations();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const isMobile = useIsMobile();
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiStep, setAiStep] = useState<'form' | 'result'>('form');
  const [selectedIncomeCatId, setSelectedIncomeCatId] = useState<string>('__all__');
  const [allocTypePref, setAllocTypePref] = useState<AllocTypePreference>('any');
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const aiHelper = useAiAllocationHelper();

  // Calculate total income per income category
  const incomeByCategory = incomes.reduce((acc, inc) => {
    const catId = inc.category_id || 'uncategorized';
    acc[catId] = (acc[catId] || 0) + Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);
  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  // Actual allocated (only from available income in linked categories) — for Нераспределено
  const getCategoryAllocation = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    let totalAllocated = 0;
    for (const allocation of categoryAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        totalAllocated += sourceIncome * allocation.allocation_value / 100;
      } else {
        totalAllocated += Math.min(allocation.allocation_value, sourceIncome);
      }
    }
    return totalAllocated;
  };
  // Planned total for category (from settings) — shown as "итоговая сумма" on the right
  const getCategoryPlannedTotal = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    let total = 0;
    for (const allocation of categoryAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        total += sourceIncome * allocation.allocation_value / 100;
      } else {
        total += allocation.allocation_value;
      }
    }
    return total;
  };
  const totalAllocated = useMemo(
    () =>
      expenseCategories.reduce((sum, cat) => {
        return sum + getCategoryAllocation(cat.id);
      }, 0),
    [expenseCategories, getCategoryAllocation]
  );

  const allocationPercent = totalIncome > 0 ? Math.round(totalAllocated / totalIncome * 100) : 0;
  const remainingTotal = Math.max(totalIncome - totalAllocated, 0);

  const pickDefaultIncomeCategory = () => {
    if (incomeCategories.length === 0) return null;

    // Try to find "Зарплата" или похожую категорию
    const salaryLike = incomeCategories.find(cat =>
      cat.name.toLowerCase().includes('зарп')
    );
    if (salaryLike) return salaryLike;

    // Иначе берём категорию с наибольшим доходом
    let best = incomeCategories[0];
    let bestAmount = incomeByCategory[best.id] || 0;
    for (const cat of incomeCategories) {
      const amount = incomeByCategory[cat.id] || 0;
      if (amount > bestAmount) {
        best = cat;
        bestAmount = amount;
      }
    }
    return best;
  };

  // Determine preferred allocation type for a category based on its existing allocations
  const getPreferredAllocationType = (categoryId: string): 'percentage' | 'fixed' => {
    const catAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    if (catAllocations.length === 0) return 'fixed';
    const hasPercentage = catAllocations.some(a => a.allocation_type === 'percentage');
    return hasPercentage ? 'percentage' : 'fixed';
  };

  const handleAiSuggest = async () => {
    if (remainingTotal <= 0 || expenseCategories.length === 0) {
      toast.info('Нераспределённого остатка сейчас нет');
      return;
    }

    const incomeCat = selectedIncomeCatId === '__all__'
      ? null
      : incomeCategories.find(c => c.id === selectedIncomeCatId) ?? null;

    try {
      await aiHelper.mutateAsync({
        remainingAmount: remainingTotal,
        currency: 'RUB',
        categories: expenseCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          plannedTotal: getCategoryPlannedTotal(cat.id),
          currentAllocated: getCategoryAllocation(cat.id),
          preferredAllocationType: getPreferredAllocationType(cat.id),
        })),
        incomeCategoryId: incomeCat?.id ?? null,
        incomeCategoryName: incomeCat?.name ?? null,
        allocationTypePreference: allocTypePref,
      });
      setAiStep('result');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить предложение от ИИ';
      toast.error(message);
    }
  };

  const handleAiApply = async () => {
    const result = aiHelper.data;
    if (!result || result.suggestions.length === 0) {
      toast.info('Сначала получи предложение от ИИ');
      return;
    }

    if (incomeCategories.length === 0) {
      toast.error('Сначала добавь хотя бы одну категорию дохода');
      return;
    }

    setIsApplyingAi(true);
    try {
      for (const suggestion of result.suggestions) {
        const amount = Math.max(0, suggestion.amount);
        if (!amount) continue;

        const category = expenseCategories.find(c => c.id === suggestion.category_id);
        if (!category) continue;

        const existingAllocations = allAllocations.filter(
          a => a.expense_category_id === category.id
        );

        const baseAllocations = existingAllocations.map(a => ({
          income_category_id: a.income_category_id,
          allocation_type: a.allocation_type,
          allocation_value: a.allocation_value,
        }));

        const allocType = suggestion.allocation_type ?? 'fixed';

        if (baseAllocations.length === 0) {
          const defaultIncome = pickDefaultIncomeCategory();
          if (!defaultIncome) continue;

          const incomeInSource = incomeByCategory[defaultIncome.id] || 0;
          const value = allocType === 'percentage' && incomeInSource > 0
            ? Math.round(amount / incomeInSource * 100)
            : amount;

          baseAllocations.push({
            income_category_id: defaultIncome.id,
            allocation_type: allocType,
            allocation_value: value,
          });
        } else {
          // Find an allocation of the desired type to top-up
          const sameTypeIndex = baseAllocations.findIndex(
            a => a.allocation_type === allocType
          );

          if (sameTypeIndex >= 0) {
            if (allocType === 'percentage') {
              const incomeSource = incomeByCategory[baseAllocations[sameTypeIndex].income_category_id] || 0;
              const additionalPct = incomeSource > 0
                ? Math.round(amount / incomeSource * 100)
                : 0;
              baseAllocations[sameTypeIndex].allocation_value += additionalPct;
            } else {
              baseAllocations[sameTypeIndex].allocation_value += amount;
            }
          } else {
            // No matching type — add a new allocation entry
            const sourceId = baseAllocations[0].income_category_id;
            const incomeInSource = incomeByCategory[sourceId] || 0;
            const value = allocType === 'percentage' && incomeInSource > 0
              ? Math.round(amount / incomeInSource * 100)
              : amount;

            baseAllocations.push({
              income_category_id: sourceId,
              allocation_type: allocType,
              allocation_value: value,
            });
          }
        }

        await bulkSaveAllocations.mutateAsync({
          expenseCategoryId: category.id,
          allocations: baseAllocations,
        });
      }

      toast.success('Рекомендации ИИ применены. При необходимости скорректируй их в категориях.');
    } catch {
      toast.error('Ошибка при применении рекомендаций');
    } finally {
      setIsApplyingAi(false);
    }
  };
  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setEditDialogOpen(true);
  };
  const handleDeleteClick = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteExpenseCategory.mutateAsync(categoryToDelete.id);
      toast.success('Категория удалена');
    } catch {
      toast.error('Ошибка при удалении');
    }
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };
  const renderCategoryContent = (cat: ExpenseCategory, showActions = false) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === cat.id);
    const plannedTotal = getCategoryPlannedTotal(cat.id);
    return (
      <div className="p-2 md:p-0 flex items-start justify-between gap-3">
        <div className="flex gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/50 overflow-visible">
            <CategoryIcon icon={cat.icon} className="text-sm md:text-base" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-sm md:text-base block truncate">{cat.name}</span>
            {categoryAllocations.length > 0 && (
              <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">
                {categoryAllocations.slice(0, 2).map((a, i) => (
                  <span key={a.id}>
                    {a.income_category?.name}: {a.allocation_type === 'percentage' ? `${Math.round(a.allocation_value)}%` : `${Math.round(a.allocation_value).toLocaleString('ru-RU')}₽`}
                    {i < Math.min(categoryAllocations.length, 2) - 1 && ' • '}
                  </span>
                ))}
                {categoryAllocations.length > 2 && ` • +${categoryAllocations.length - 2}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm md:text-base font-medium tabular-nums whitespace-nowrap">
            {Math.round(plannedTotal).toLocaleString('ru-RU')} ₽
          </span>
          {showActions && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(cat)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(cat)}
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };
  return <>
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-1 md:gap-2 p-3 md:p-6">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <CardTitle className="text-sm md:text-lg truncate">Категории расходов</CardTitle>
            <Badge variant={allocationPercent >= 100 ? 'default' : 'secondary'} className="text-[10px] md:text-xs px-1.5 shrink-0">
              {allocationPercent}%
            </Badge>
            {remainingTotal > 0 && (
              <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                Остаток: {Math.round(remainingTotal).toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Dialog
              open={aiDialogOpen}
              onOpenChange={(open) => {
                setAiDialogOpen(open);
                if (!open) { setAiStep('form'); aiHelper.reset(); }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 md:h-8 px-2 text-xs"
                  disabled={remainingTotal <= 0 || incomes.length === 0}
                >
                  <Bot className="w-3 h-3" />
                  <span className="hidden sm:inline">ИИ-помощник</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 md:p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle className="flex items-center gap-2">
                    {aiStep === 'result' && (
                      <button
                        type="button"
                        onClick={() => { setAiStep('form'); aiHelper.reset(); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    ИИ-помощник по распределению
                  </DialogTitle>
                </DialogHeader>

                {/* Шаг 1: форма */}
                {aiStep === 'form' && (
                  <div className="space-y-5">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Нераспределённый остаток:{' '}
                      <span className="font-semibold text-foreground">
                        {Math.round(remainingTotal).toLocaleString('ru-RU')} ₽
                      </span>
                    </p>

                    {/* Выбор источника дохода */}
                    <div className="space-y-1.5">
                      <p className="text-xs md:text-sm font-medium">Из какой категории дохода распределять?</p>
                      <Select value={selectedIncomeCatId} onValueChange={setSelectedIncomeCatId}>
                        <SelectTrigger className="h-9 text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Все источники</SelectItem>
                          {incomeCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-1.5">
                                <CategoryIcon icon={cat.icon} className="text-sm" />
                                {cat.name}
                                {incomeByCategory[cat.id]
                                  ? ` · ${Math.round(incomeByCategory[cat.id]).toLocaleString('ru-RU')} ₽`
                                  : ''}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Выбор типа распределения */}
                    <div className="space-y-1.5">
                      <p className="text-xs md:text-sm font-medium">Каким способом распределять?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { value: 'any', label: 'Авто', desc: 'Как уже задано' },
                            { value: 'percentage', label: 'Процент', desc: 'Только %' },
                            { value: 'fixed', label: 'Фиксированно', desc: 'Только ₽' },
                          ] as { value: AllocTypePreference; label: string; desc: string }[]
                        ).map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setAllocTypePref(opt.value)}
                            className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                              allocTypePref === opt.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-muted/30 hover:bg-muted/60'
                            }`}
                          >
                            <p className="text-xs font-medium">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {aiHelper.error && (
                      <p className="text-xs text-destructive">
                        {(aiHelper.error as Error).message}
                      </p>
                    )}

                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleAiSuggest}
                      disabled={aiHelper.isPending}
                    >
                      {aiHelper.isPending
                        ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Анализирую...</>
                        : 'Распределить остаток'}
                    </Button>
                  </div>
                )}

                {/* Шаг 2: результат */}
                {aiStep === 'result' && aiHelper.data && (
                  <div className="space-y-3">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      ИИ предлагает распределить{' '}
                      <span className="font-semibold text-foreground">
                        {Math.round(aiHelper.data.totalSuggested).toLocaleString('ru-RU')} ₽
                      </span>
                    </p>

                    <div className="space-y-1.5">
                      {aiHelper.data.suggestions.map((item, index) => {
                        const category = expenseCategories.find(c => c.id === item.category_id);
                        if (!category) return null;
                        return (
                          <div
                            key={`${item.category_id}-${index}`}
                            className="flex items-start justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-secondary/50 mt-0.5">
                                <CategoryIcon icon={category.icon} className="text-xs" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs md:text-sm font-medium truncate">{category.name}</p>
                                {item.comment && (
                                  <p className="mt-0.5 text-[10px] md:text-xs text-muted-foreground leading-tight">
                                    {item.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs md:text-sm font-semibold tabular-nums text-primary">
                                +{Math.round(item.amount).toLocaleString('ru-RU')} ₽
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {item.allocation_type === 'percentage' ? 'процент' : 'фикс'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {aiHelper.data.note && (
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {aiHelper.data.note}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleAiApply}
                        disabled={isApplyingAi}
                      >
                        {isApplyingAi && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                        Применить
                      </Button>
                      <p className="text-[10px] md:text-xs text-muted-foreground text-center">
                        Ты можешь подправить суммы вручную в настройках категорий.
                      </p>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-0.5 md:gap-1 h-7 md:h-8 px-2 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle>Новая категория расхода</DialogTitle>
                </DialogHeader>
                <ExpenseCategoryForm 
                  onClose={() => setAddDialogOpen(false)} 
                  onSuccess={() => setAddDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-4 p-3 md:p-6 pt-0 md:pt-0">
          {isMobile && expenseCategories.length > 0}
          
          {expenseCategories.length === 0 ? <div className="text-center py-4 md:py-6">
              <p className="text-muted-foreground text-xs md:text-sm mb-1 md:mb-2">Нет категорий расходов</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Нажмите «+» чтобы создать</p>
            </div> : expenseCategories.map(cat => (
            <div key={cat.id}>
              {renderCategoryContent(cat, isMobile)}
            </div>
            ))}

        </CardContent>
      </Card>

      {/* Edit dialog */}
      <ExpenseCategoryEditor category={editingCategory} open={editDialogOpen} onOpenChange={open => {
      setEditDialogOpen(open);
      if (!open) setEditingCategory(null);
    }} />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Категория "{categoryToDelete?.name}" будет удалена вместе со всеми распределениями.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}