import { useState } from 'react';
import { 
  useIncomeCategories, 
  useExpenseCategories, 
  useDeleteIncomeCategory, 
  useDeleteExpenseCategory,
  useAddIncomeCategory,
  useAddExpenseCategory,
  useUpdateIncomeCategory
} from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const ICON_OPTIONS = [
  'wallet', 'briefcase', 'banknote', 'laptop', 'folder', 'message-circle',
  'trending-up', 'gift', 'shopping-cart', 'car', 'home', 'gamepad-2',
  'piggy-bank', 'more-horizontal', 'file-text', 'wrench', 'book-open',
  'baby', 'heart-pulse', 'plane', 'coffee', 'utensils', 'shirt', 'smartphone'
];

const COLOR_OPTIONS = [
  '#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#3B82F6', 
  '#EF4444', '#EC4899', '#22C55E', '#6B7280', '#14B8A6'
];

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
  const addExpenseCategory = useAddExpenseCategory();
  const updateIncomeCategory = useUpdateIncomeCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [incomeEditDialogOpen, setIncomeEditDialogOpen] = useState(false);
  const [editingIncomeCategory, setEditingIncomeCategory] = useState<IncomeCategory | null>(null);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [expenseEditDialogOpen, setExpenseEditDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryFormData>({ name: '', icon: 'wallet', color: '#10B981' });
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');
  const [showAddForm, setShowAddForm] = useState(false);

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

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      if (categoryType === 'income') {
        await addIncomeCategory.mutateAsync(newCategory);
      } else {
        await addExpenseCategory.mutateAsync({
          ...newCategory,
          allocation_type: 'percentage',
          allocation_value: 0
        });
      }
      toast.success('Категория добавлена');
      setNewCategory({ name: '', icon: 'wallet', color: '#10B981' });
      setShowAddForm(false);
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
      setNewCategory({ name: '', icon: 'wallet', color: '#10B981' });
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const openIncomeEditDialog = (category: IncomeCategory) => {
    setEditingIncomeCategory(category);
    setNewCategory({
      name: category.name,
      icon: category.icon,
      color: category.color
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
                <Button 
                  size="sm" 
                  onClick={() => {
                    setCategoryType('expense');
                    setNewCategory({ name: '', icon: 'shopping-cart', color: '#F59E0B' });
                    setShowAddForm(true);
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </Button>
              </div>
              
              {showAddForm && categoryType === 'expense' && (
                <Card className="border-dashed border-primary/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input 
                        placeholder="Например: Кафе"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Иконка</Label>
                      <div className="flex flex-wrap gap-2">
                        {ICON_OPTIONS.slice(0, 12).map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setNewCategory(prev => ({ ...prev, icon }))}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors ${
                              newCategory.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <CategoryIcon icon={icon} color={newCategory.color} className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Цвет</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                            className={`w-8 h-8 rounded-full transition-transform ${
                              newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddCategory} className="flex-1 gradient-primary">
                        Создать
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddForm(false)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20` }}
                          >
                            <CategoryIcon icon={cat.icon} color={cat.color} className="w-6 h-6" />
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
                    setCategoryType('income');
                    setNewCategory({ name: '', icon: 'wallet', color: '#10B981' });
                    setShowAddForm(true);
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </Button>
              </div>
              
              {showAddForm && categoryType === 'income' && (
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
                    <div className="space-y-2">
                      <Label>Иконка</Label>
                      <div className="flex flex-wrap gap-2">
                        {ICON_OPTIONS.slice(0, 12).map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setNewCategory(prev => ({ ...prev, icon }))}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors ${
                              newCategory.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <CategoryIcon icon={icon} color={newCategory.color} className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Цвет</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                            className={`w-8 h-8 rounded-full transition-transform ${
                              newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddCategory} className="flex-1 gradient-primary">
                        Создать
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddForm(false)}
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
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-6 h-6" />
                      </div>
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
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategory(prev => ({ ...prev, icon }))}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors ${
                      newCategory.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <CategoryIcon icon={icon} color={newCategory.color} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
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
