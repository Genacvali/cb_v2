import { useState } from 'react';
import { 
  useIncomeCategories, 
  useExpenseCategories, 
  useDeleteIncomeCategory, 
  useDeleteExpenseCategory,
  useAddIncomeCategory,
  useAddExpenseCategory,
  useUpdateExpenseCategory,
  useUpdateIncomeCategory
} from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const deleteIncomeCategory = useDeleteIncomeCategory();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const addIncomeCategory = useAddIncomeCategory();
  const addExpenseCategory = useAddExpenseCategory();
  const updateExpenseCategory = useUpdateExpenseCategory();
  const updateIncomeCategory = useUpdateIncomeCategory();

  const [isOpen, setIsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ type: 'income' | 'expense'; category: IncomeCategory | ExpenseCategory } | null>(null);
  const [newCategory, setNewCategory] = useState<CategoryFormData>({ name: '', icon: 'wallet', color: '#10B981' });
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income');

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
      setIsOpen(false);
    } catch {
      toast.error('Ошибка при добавлении');
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      if (editingCategory.type === 'expense') {
        await updateExpenseCategory.mutateAsync({
          id: editingCategory.category.id,
          name: newCategory.name,
          icon: newCategory.icon,
          color: newCategory.color
        });
      } else {
        await updateIncomeCategory.mutateAsync({
          id: editingCategory.category.id,
          name: newCategory.name,
          icon: newCategory.icon,
          color: newCategory.color
        });
      }
      toast.success('Категория обновлена');
      setEditDialogOpen(false);
      setEditingCategory(null);
      setNewCategory({ name: '', icon: 'wallet', color: '#10B981' });
    } catch {
      toast.error('Ошибка при обновлении');
    }
  };

  const openEditDialog = (type: 'income' | 'expense', category: IncomeCategory | ExpenseCategory) => {
    setEditingCategory({ type, category });
    setNewCategory({
      name: category.name,
      icon: category.icon,
      color: category.color
    });
    setEditDialogOpen(true);
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
          
          <Tabs defaultValue="income" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Доходы
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="w-4 h-4" />
                Расходы
              </TabsTrigger>
            </TabsList>
            
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
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </Button>
              </div>
              
              {categoryType === 'income' && newCategory.name === '' && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input 
                        placeholder="Например: Бонус"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
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
                              newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddCategory} className="flex-1">
                        Сохранить
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setNewCategory({ name: '', icon: 'wallet', color: '#10B981' })}
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog('income', cat)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                  }}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </Button>
              </div>
              
              {categoryType === 'expense' && newCategory.name === '' && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input 
                        placeholder="Например: Кафе"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
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
                              newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleAddCategory} className="flex-1">
                        Сохранить
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setNewCategory({ name: '', icon: 'wallet', color: '#10B981' })}
                      >
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-2">
                {expenseCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-medium">{cat.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {cat.allocation_type === 'percentage' 
                            ? `${cat.allocation_value}%` 
                            : `${cat.allocation_value.toLocaleString('ru-RU')} ₽`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog('expense', cat)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                            <AlertDialogAction onClick={() => handleDeleteExpense(cat.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать категорию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
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
                      newCategory.color === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
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
            <Button onClick={handleEditCategory}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
