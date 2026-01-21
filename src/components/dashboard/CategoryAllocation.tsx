import { useState } from 'react';
import { useExpenseCategories, useIncomes, useDeleteExpenseCategory } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { SwipeableCategory } from './SwipeableCategory';
import { ExpenseCategoryEditor } from './ExpenseCategoryEditor';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExpenseCategory } from '@/types/budget';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
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

  // Calculate allocated amounts for each expense category
  const getCategoryAllocation = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    let totalAllocated = 0;
    for (const allocation of categoryAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        totalAllocated += sourceIncome * allocation.allocation_value / 100;
      } else {
        totalAllocated += allocation.allocation_value;
      }
    }
    return totalAllocated;
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
  const renderCategoryContent = (cat: ExpenseCategory) => {
    const amount = getCategoryAllocation(cat.id);
    const progressValue = totalIncome > 0 ? amount / totalIncome * 100 : 0;
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === cat.id);
    return <div className="space-y-1.5 md:space-y-2 p-3 md:p-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/50 overflow-visible">
              <CategoryIcon icon={cat.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-sm md:text-base block truncate">{cat.name}</span>
              {categoryAllocations.length > 0 && <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                  {categoryAllocations.map((a, i) => <span key={a.id}>
                      {a.income_category?.name}: {a.allocation_type === 'percentage' ? `${a.allocation_value}%` : `${a.allocation_value.toLocaleString('ru-RU')}₽`}
                      {i < categoryAllocations.length - 1 && ' • '}
                    </span>)}
                </p>}
            </div>
          </div>
          
          <span className="text-xs md:text-sm font-medium whitespace-nowrap">
            {amount.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <Progress value={progressValue} className="h-1.5 md:h-2 flex-1" animated />
          <span className="text-[10px] md:text-xs text-muted-foreground w-8 md:w-12 text-right">
            {Math.round(progressValue)}%
          </span>
        </div>
      </div>;
  };
  return <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 md:p-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base md:text-lg">Категории расходов</CardTitle>
            <Badge variant={allocationPercent >= 100 ? 'default' : 'secondary'} className="text-xs">
              {allocationPercent}%
            </Badge>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-8 text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить</span>
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
        <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0 md:pt-0">
          {isMobile && expenseCategories.length > 0}
          
          {expenseCategories.length === 0 ? <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-2">Нет категорий расходов</p>
              <p className="text-xs text-muted-foreground">Нажмите «Добавить» чтобы создать</p>
            </div> : expenseCategories.map(cat => isMobile ? <SwipeableCategory key={cat.id} onEdit={() => handleEdit(cat)} onDelete={() => handleDeleteClick(cat)}>
                  {renderCategoryContent(cat)}
                </SwipeableCategory> : <div key={cat.id}>
                  {renderCategoryContent(cat)}
                </div>)}

          {totalIncome > 0 && <div className="pt-3 md:pt-4 mt-3 md:mt-4 border-t border-border">
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Нераспределено</span>
                <span className="font-medium">
                  {(totalIncome - totalAllocated).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>}
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