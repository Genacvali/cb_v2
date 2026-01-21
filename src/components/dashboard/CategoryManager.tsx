import { useState } from 'react';
import { 
  useIncomeCategories, 
  useExpenseCategories, 
  useDeleteIncomeCategory, 
  useDeleteExpenseCategory,
  useAddIncomeCategory,
  useUpdateIncomeCategory
} from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { IncomeCategory, ExpenseCategory } from '@/types/budget';
import { ExpenseCategoryEditor } from './ExpenseCategoryEditor';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { CATEGORY_EMOJI_OPTIONS, DEFAULT_CATEGORY_COLOR } from '@/constants/categoryOptions';

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

export function CategoryManager() {
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: allAllocations = [] } = useAllAllocations();
  const deleteIncomeCategory = useDeleteIncomeCategory();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const addIncomeCategory = useAddIncomeCategory();
  const updateIncomeCategory = useUpdateIncomeCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [incomeEditDialogOpen, setIncomeEditDialogOpen] = useState(false);
  const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [expenseEditDialogOpen, setExpenseEditDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryFormData>({ name: '', icon: '💰', color: DEFAULT_CATEGORY_COLOR });
  const [showAddIncomeForm, setShowAddIncomeForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);

  const handleDeleteIncome = async (id: string) => {
    try {
      await deleteIncomeCategory.mutateAsync(id);
      toast.success('Категория дохода удалена');
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpenseCategory.mutateAsync(id);
      toast.success('Категория расхода удалена');
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleAddIncomeCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      await addIncomeCategory.mutateAsync(newCategory);
      toast.success('Категория добавлена');
      setNewCategory({ name: '', icon: '💰', color: DEFAULT_CATEGORY_COLOR });
      setShowAddIncomeForm(false);
    } catch {
      toast.error('Ошибка при добавлении');
    }
  };

  const handleEditIncomeCategory = async () => {
    if (!editingIncomeCategory || !newCategory.name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      await updateIncomeCategory.mutateAsync({
        id: editingIncomeCategory.id,
        name: newCategory.name,
        icon: newCategory.icon,
        color: newCategory.color
      });
      toast.success('Категория обновлена');
      setIncomeEditDialogOpen(false);
      setEditingIncomeCategory(null);
      setNewCategory({ name: '', icon: '💰', color: DEFAULT_CATEGORY_COLOR });
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const openIncomeEditDialog = (category: IncomeCategory) => {
    setEditingIncomeCategory(category);
    setNewCategory({
      name: category.name,
      icon: category.icon || '💰',
      color: category.color || DEFAULT_CATEGORY_COLOR
    });
    setIncomeEditDialogOpen(true);
  };

  const openExpenseEditDialog = (category: ExpenseCategory) => {
    setEditingExpenseCategory(category);
    setExpenseEditDialogOpen(true);
  };

  // Get allocations summary for expense category
  const getAllocationsSummary = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    if (categoryAllocations.length === 0) return null;
    
    return categoryAllocations.map(a => {
      const sourceName = a.income_category?.name || 'Неизвестно';
      const value = a.allocation_type === 'percentage' 
        ? `${a.allocation_value}%` 
        : `${a.allocation_value.toLocaleString('ru-RU')} ₽`;
      return { sourceName, value };
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Управление категориями
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление категориями</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="expense" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="w-4 h-4" />
                Расходы
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Доходы
              </TabsTrigger>
            </TabsList>
            
            {/* Expense Categories Tab */}
            <TabsContent value="expense" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Категории расходов ({expenseCategories.length})
                </h3>
                {!showAddExpenseForm && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddExpenseForm(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить
                  </Button>
                )}
              </div>
              
              {showAddExpenseForm && (
                <ExpenseCategoryForm
                  onClose={() => setShowAddExpenseForm(false)}
                  onSuccess={() => setShowAddExpenseForm(false)}
                />
              )}
              
              <div className="space-y-2">
                {expenseCategories.map(cat => {
                  const allocations = getAllocationsSummary(cat.id);
                  
                  return (
                    <div 
                      key={cat.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/50"
                          >
                            <CategoryIcon icon={cat.icon} className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-medium">{cat.name}</span>
                            {allocations && allocations.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {allocations.slice(0, 2).map((a, i) => (
                                  <span key={i}>
                                    {a.sourceName}: {a.value}
                                    {i < Math.min(allocations.length - 1, 1) && ' • '}
                                  </span>
                                ))}
                                {allocations.length > 2 && ` +${allocations.length - 2}`}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openExpenseEditDialog(cat)}
                            className="h-9 w-9"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие нельзя отменить. Категория "{cat.name}" будет удалена вместе со всеми распределениями.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense(cat.id)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            {/* Income Categories Tab */}
            <TabsContent value="income" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Категории доходов ({incomeCategories.length})
                </h3>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setNewCategory({ name: '', icon: '💰', color: DEFAULT_CATEGORY_COLOR });
                    setShowAddIncomeForm(true);
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </Button>
              </div>
              
              {showAddIncomeForm && (
                <Card className="border-dashed border-primary/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input 
                        placeholder="Например: Бонус"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddIncomeCategory} className="flex-1 gradient-primary">
                        Создать
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddIncomeForm(false)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-2">
                {incomeCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openIncomeEditDialog(cat)}
                        className="h-9 w-9"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Категория "{cat.name}" будет удалена.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteIncome(cat.id)}>
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Income Category Edit Dialog */}
      <Dialog open={incomeEditDialogOpen} onOpenChange={setIncomeEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать категорию дохода</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button onClick={handleEditIncomeCategory} className="gradient-primary">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Category Edit Dialog */}
      <ExpenseCategoryEditor 
        category={editingExpenseCategory}
        open={expenseEditDialogOpen}
        onOpenChange={(open) => {
          setExpenseEditDialogOpen(open);
          if (!open) setEditingExpenseCategory(null);
        }}
      />
    </>
  );
}
