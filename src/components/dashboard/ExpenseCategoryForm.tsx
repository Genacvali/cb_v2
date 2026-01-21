import { useState, useEffect } from 'react';
import { useIncomeCategories, useAddExpenseCategory, useUpdateExpenseCategory } from '@/hooks/useBudget';
import { useExpenseCategoryAllocations, useBulkSaveAllocations } from '@/hooks/useAllocations';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseCategory } from '@/types/budget';
import { CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_OPTIONS } from '@/constants/categoryOptions';

interface AllocationFormData {
  id?: string;
  income_category_id: string;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
}

interface Props {
  category?: ExpenseCategory | null;
  isEditing?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExpenseCategoryForm({ category, isEditing = false, onClose, onSuccess }: Props) {
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: existingAllocations = [] } = useExpenseCategoryAllocations(category?.id);
  const addCategory = useAddExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const bulkSaveAllocations = useBulkSaveAllocations();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shopping-cart');
  const [color, setColor] = useState('#F59E0B');
  const [allocations, setAllocations] = useState<AllocationFormData[]>([]);
  const [showAllocations, setShowAllocations] = useState(false);

  useEffect(() => {
    if (category && isEditing) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setShowAllocations(true);
    }
  }, [category, isEditing]);

  useEffect(() => {
    if (existingAllocations.length > 0 && isEditing) {
      setAllocations(existingAllocations.map(a => ({
        id: a.id,
        income_category_id: a.income_category_id,
        allocation_type: a.allocation_type,
        allocation_value: a.allocation_value,
      })));
    }
  }, [existingAllocations, isEditing]);

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
    setShowAllocations(true);
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

  const getIncomeCategoryName = (id: string) => {
    return incomeCategories.find(c => c.id === id)?.name || 'Не выбрано';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      if (isEditing && category) {
        // Update existing category
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
      } else {
        // Create new category
        const newCategory = await addCategory.mutateAsync({
          name,
          icon,
          color,
          allocation_type: 'percentage',
          allocation_value: 0,
        });

        // Save allocations if any
        if (allocations.length > 0 && newCategory) {
          await bulkSaveAllocations.mutateAsync({
            expenseCategoryId: newCategory.id,
            allocations,
          });
        }

        toast.success('Категория создана');
      }

      onSuccess?.();
      onClose();
    } catch {
      toast.error('Ошибка при сохранении');
    }
  };

  return (
    <Card className="border-dashed border-primary/50">
      <CardContent className="pt-4 space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label>Название</Label>
          <Input
            placeholder="Например: Кафе"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-secondary/50"
          />
        </div>

        {/* Icon Grid */}
        <div className="space-y-2">
          <Label>Иконка</Label>
          <div className="grid grid-cols-10 gap-1.5">
            {CATEGORY_ICON_OPTIONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                  icon === iconName
                    ? 'border-primary bg-primary/20 scale-110'
                    : 'border-transparent bg-secondary/50 hover:bg-secondary'
                }`}
              >
                <CategoryIcon icon={iconName} color={color} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label>Цвет</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLOR_OPTIONS.map((c) => (
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

        {/* Allocations Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAllocations(!showAllocations)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              Распределение бюджета
              {showAllocations ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddAllocation}
              className="gap-1 text-primary h-8"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </Button>
          </div>

          {showAllocations && (
            <>
              {/* Tip */}
              {allocations.length === 0 && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
                  <span>
                    Укажите откуда будет браться бюджет на эту категорию — из какого источника дохода и в каком размере.
                  </span>
                </div>
              )}

              {/* Allocations List */}
              <div className="space-y-3">
                {allocations.map((allocation, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-card/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Источник {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAllocation(index)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Income Category Select */}
                    <Select
                      value={allocation.income_category_id}
                      onValueChange={(value) =>
                        handleAllocationChange(index, 'income_category_id', value)
                      }
                    >
                      <SelectTrigger className="bg-secondary/50 h-9">
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
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={allocation.allocation_type}
                        onValueChange={(value: 'percentage' | 'fixed') =>
                          handleAllocationChange(index, 'allocation_type', value)
                        }
                      >
                        <SelectTrigger className="bg-secondary/50 h-9">
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
                          className="bg-secondary/50 pr-8 h-9"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {allocation.allocation_type === 'percentage' ? '%' : '₽'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1 gradient-primary">
            {isEditing ? 'Сохранить' : 'Создать'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
