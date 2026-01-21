import { useState, useEffect } from 'react';
import { ExpenseCategory, IncomeCategory } from '@/types/budget';
import { useIncomeCategories, useUpdateExpenseCategory } from '@/hooks/useBudget';
import { useExpenseCategoryAllocations, useBulkSaveAllocations } from '@/hooks/useAllocations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

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

interface AllocationFormData {
  id?: string;
  income_category_id: string;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
}

interface Props {
  category: ExpenseCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseCategoryEditor({ category, open, onOpenChange }: Props) {
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: existingAllocations = [] } = useExpenseCategoryAllocations(category?.id);
  const updateCategory = useUpdateExpenseCategory();
  const bulkSaveAllocations = useBulkSaveAllocations();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState('#10B981');
  const [allocations, setAllocations] = useState<AllocationFormData[]>([]);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
    }
  }, [category]);

  useEffect(() => {
    if (existingAllocations.length > 0) {
      setAllocations(existingAllocations.map(a => ({
        id: a.id,
        income_category_id: a.income_category_id,
        allocation_type: a.allocation_type,
        allocation_value: a.allocation_value,
      })));
    } else if (category) {
      // If no allocations exist, initialize with empty array
      setAllocations([]);
    }
  }, [existingAllocations, category]);

  const handleAddAllocation = () => {
    if (incomeCategories.length === 0) {
      toast.error('Сначала добавьте категории дохода');
      return;
    }
    setAllocations([
      ...allocations,
      {
        income_category_id: incomeCategories[0].id,
        allocation_type: 'fixed',
        allocation_value: 0,
      },
    ]);
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (
    index: number,
    field: keyof AllocationFormData,
    value: string | number
  ) => {
    setAllocations(allocations.map((a, i) => {
      if (i !== index) return a;
      return { ...a, [field]: value };
    }));
  };

  const handleSave = async () => {
    if (!category) return;
    if (!name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      // Update category info
      await updateCategory.mutateAsync({
        id: category.id,
        name,
        icon,
        color,
      });

      // Save allocations
      await bulkSaveAllocations.mutateAsync({
        expenseCategoryId: category.id,
        allocations,
      });

      toast.success('Категория сохранена');
      onOpenChange(false);
    } catch {
      toast.error('Ошибка при сохранении');
    }
  };

  const getIncomeCategoryName = (id: string) => {
    return incomeCategories.find(c => c.id === id)?.name || 'Не выбрано';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать категорию</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Измените данные категории расходов
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название категории"
              className="bg-secondary/50"
            />
          </div>

          {/* Icon Grid */}
          <div className="space-y-2">
            <Label>Иконка</Label>
            <div className="grid grid-cols-8 gap-2">
              {ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all ${
                    icon === iconName
                      ? 'border-primary bg-primary/20 scale-110'
                      : 'border-transparent bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <CategoryIcon icon={iconName} color={color} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Sources and Distribution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Источники и распределение</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddAllocation}
                className="gap-1 text-primary"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </Button>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
              <span>
                Вы можете добавить несколько источников с разными типами распределения
                для гибкого управления бюджетом.
              </span>
            </div>

            {/* Allocations List */}
            <div className="space-y-4">
              {allocations.map((allocation, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Источник {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAllocation(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Income Category Select */}
                  <Select
                    value={allocation.income_category_id}
                    onValueChange={(value) =>
                      handleAllocationChange(index, 'income_category_id', value)
                    }
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Выберите источник">
                        {getIncomeCategoryName(allocation.income_category_id)}
                      </SelectValue>
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

                  {/* Type and Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={allocation.allocation_type}
                      onValueChange={(value: 'percentage' | 'fixed') =>
                        handleAllocationChange(index, 'allocation_type', value)
                      }
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Сумма</SelectItem>
                        <SelectItem value="percentage">Процент</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Input
                        type="number"
                        value={allocation.allocation_value || ''}
                        onChange={(e) =>
                          handleAllocationChange(
                            index,
                            'allocation_value',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="bg-secondary/50 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {allocation.allocation_type === 'percentage' ? '%' : '₽'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {allocations.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Нет источников. Нажмите "Добавить" чтобы создать распределение.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} className="gradient-primary">
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
