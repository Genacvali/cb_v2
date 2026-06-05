import { useMemo, useState } from 'react';
import { useExpenseCategories, useIncomes, useIncomeCategories, useDeleteExpenseCategory } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
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
import { Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { DistributeRemainingDialog } from './DistributeRemainingDialog';
import { toast } from 'sonner';

export function CategoryAllocation() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: incomes = [] } = useIncomes();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: allAllocations = [] } = useAllAllocations();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const isMobile = useIsMobile();

  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);

  // ── Income aggregation ────────────────────────────────────────────────────
  const incomeByCategory = incomes.reduce((acc, inc) => {
    const catId = inc.category_id || 'uncategorized';
    acc[catId] = (acc[catId] || 0) + Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  // ── Per-category helpers ──────────────────────────────────────────────────
  const getCategoryAllocation = (categoryId: string) => {
    const cats = allAllocations.filter(a => a.expense_category_id === categoryId);
    return cats.reduce((sum, a) => {
      const src = incomeByCategory[a.income_category_id] || 0;
      return sum + (a.allocation_type === 'percentage'
        ? src * a.allocation_value / 100
        : Math.min(a.allocation_value, src));
    }, 0);
  };

  const getCategoryPlannedTotal = (categoryId: string) => {
    const cats = allAllocations.filter(a => a.expense_category_id === categoryId);
    return cats.reduce((sum, a) => {
      const src = incomeByCategory[a.income_category_id] || 0;
      return sum + (a.allocation_type === 'percentage'
        ? src * a.allocation_value / 100
        : a.allocation_value);
    }, 0);
  };

  const totalAllocated = useMemo(
    () => expenseCategories.reduce((sum, cat) => sum + getCategoryAllocation(cat.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenseCategories, allAllocations, incomeByCategory],
  );

  const allocationPercent = totalIncome > 0 ? Math.round(totalAllocated / totalIncome * 100) : 0;
  const remainingTotal = Math.max(totalIncome - totalAllocated, 0);

  // ── Category actions ──────────────────────────────────────────────────────
  const handleEdit = (category: ExpenseCategory) => { setEditingCategory(category); setEditDialogOpen(true); };
  const handleDeleteClick = (category: ExpenseCategory) => { setCategoryToDelete(category); setDeleteDialogOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteExpenseCategory.mutateAsync(categoryToDelete.id);
      toast.success('\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u0443\u0434\u0430\u043b\u0435\u043d\u0430');
    } catch {
      toast.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0438');
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
                    {a.income_category?.name}: {a.allocation_type === 'percentage'
                      ? `${Math.round(a.allocation_value)}%`
                      : `${Math.round(a.allocation_value).toLocaleString('ru-RU')}₽`}
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
              <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(cat)} className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return <>
    <Card className="glass-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-1 md:gap-2 p-3 md:p-6">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <CardTitle className="text-sm md:text-lg truncate">Категории расходов</CardTitle>
          <Badge variant={allocationPercent >= 100 ? 'default' : 'secondary'} className="text-[10px] md:text-xs px-1.5 shrink-0">
            {allocationPercent}%
          </Badge>
          {remainingTotal > 0 && (
            <>
              <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                Остаток: {Math.round(remainingTotal).toLocaleString('ru-RU')} ₽
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                title="Распределить остаток"
                onClick={() => setDistributeDialogOpen(true)}
              >
                <Wand2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* ── Add category ── */}
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
              <ExpenseCategoryForm onClose={() => setAddDialogOpen(false)} onSuccess={() => setAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 md:space-y-4 p-3 md:p-6 pt-0 md:pt-0">
        {expenseCategories.length === 0
          ? (
            <div className="text-center py-4 md:py-6">
              <p className="text-muted-foreground text-xs md:text-sm mb-1 md:mb-2">Нет категорий расходов</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Нажмите «+» чтобы создать</p>
            </div>
          )
          : expenseCategories.map(cat => (
            <div key={cat.id}>
              {renderCategoryContent(cat, isMobile)}
            </div>
          ))}
      </CardContent>
    </Card>

    {/* Edit dialog */}
    <ExpenseCategoryEditor
      category={editingCategory}
      open={editDialogOpen}
      onOpenChange={open => { setEditDialogOpen(open); if (!open) setEditingCategory(null); }}
    />

    {/* Distribute remaining dialog */}
    <DistributeRemainingDialog
      open={distributeDialogOpen}
      onOpenChange={setDistributeDialogOpen}
      remainingTotal={remainingTotal}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      allAllocations={allAllocations}
      incomeByCategory={incomeByCategory}
    />

    {/* Delete confirmation */}
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
          <AlertDialogAction onClick={handleDeleteConfirm}>Удалить</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
