import { useState } from 'react';
import { useExpenseCategories, useIncomes, useDeleteExpenseCategory } from '@/hooks/useBudget';
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
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
export function CategoryAllocation() {
  const {
    data: expenseCategories = []
  } = useExpenseCategories();
  const {
    data: incomes = []
  } = useIncomes();
  const {
    data: allAllocations = []
  } = useAllAllocations();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const isMobile = useIsMobile();
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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
  const totalAllocated = expenseCategories.reduce((sum, cat) => {
    return sum + getCategoryAllocation(cat.id);
  }, 0);
  const allocationPercent = totalIncome > 0 ? Math.round(totalAllocated / totalIncome * 100) : 0;
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
          </div>
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