import { useState, useEffect, useMemo } from 'react';
import { useIncomeCategories, useAddExpenseCategory, useUpdateExpenseCategory, useIncomes } from '@/hooks/useBudget';
import { useExpenseCategoryAllocations, useBulkSaveAllocations } from '@/hooks/useAllocations';
import { useCurrencies, getCurrencySymbol } from '@/hooks/useCurrencies';
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
import { Plus, Trash2, Lightbulb, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseCategory } from '@/types/budget';
import { CATEGORY_EMOJI_OPTIONS, DEFAULT_CATEGORY_COLOR } from '@/constants/categoryOptions';

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
  const { data: incomes = [] } = useIncomes();
  const { data: existingAllocations = [] } = useExpenseCategoryAllocations(category?.id);
  const { data: currencies = [] } = useCurrencies();
  const addCategory = useAddExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const bulkSaveAllocations = useBulkSaveAllocations();

  // Build a map of income category -> currencies used in that category's incomes
  const incomeCategoryCurrencies = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    incomes.forEach(income => {
      if (income.category_id) {
        if (!map[income.category_id]) {
          map[income.category_id] = new Set();
        }
        map[income.category_id].add(income.currency || 'RUB');
      }
    });
    return map;
  }, [incomes]);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🛒');
  // Preserve the existing color on edit; the form has no color picker, so
  // falling back to the default here would silently reset template colors.
  const color = (isEditing && category?.color) || DEFAULT_CATEGORY_COLOR;
  const [allocations, setAllocations] = useState<AllocationFormData[]>([]);
  const [showAllocations, setShowAllocations] = useState(false);

  const isSaving = addCategory.isPending || updateCategory.isPending || bulkSaveAllocations.isPending;

  useEffect(() => {
    if (category && isEditing) {
      setName(category.name);
      setIcon(category.icon || '🛒');
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

  // Get the currency for a specific income category based on actual incomes
  const getIncomeCategoryCurrency = (categoryId: string): string => {
    const currencySet = incomeCategoryCurrencies[categoryId];
    if (currencySet && currencySet.size > 0) {
      // Return the first currency (most incomes use single currency)
      return Array.from(currencySet)[0];
    }
    return 'RUB'; // Default
  };

  const validateAllocations = (): string | null => {
    for (const a of allocations) {
      if (!a.income_category_id) return 'Выберите источник дохода для каждого распределения';
      if (!(a.allocation_value > 0)) return 'Сумма или процент распределения должны быть больше нуля';
      if (a.allocation_type === 'percentage' && a.allocation_value > 100) return 'Процент не может быть больше 100';
    }
    // Warn when one income source is over-allocated by percentage within this category
    const percentBySource: Record<string, number> = {};
    for (const a of allocations) {
      if (a.allocation_type === 'percentage') {
        percentBySource[a.income_category_id] = (percentBySource[a.income_category_id] || 0) + a.allocation_value;
      }
    }
    const over = Object.entries(percentBySource).find(([, p]) => p > 100);
    if (over) return `Суммарный процент от «${getIncomeCategoryName(over[0])}» превышает 100`;
    return null;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Введите название категории');
      return;
    }
    const validationError = validateAllocations();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (isSaving) return;

    try {
      if (isEditing && category) {
        // Update existing category
        await updateCategory.mutateAsync({
          id: category.id,
          name: trimmedName,
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
          name: trimmedName,
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
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label>Название</Label>
        <Input
          placeholder="Например: Кафе"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          className="bg-secondary/50"
          autoFocus={!isEditing}
        />
      </div>

      {/* Emoji Grid - optimized for mobile */}
      <div className="space-y-2">
        <Label>Иконка</Label>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {CATEGORY_EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border-2 transition-all text-xl ${
                icon === emoji
                  ? 'border-primary bg-primary/20 scale-110'
                  : 'border-transparent bg-secondary/50 hover:bg-secondary'
              }`}
            >
              {emoji}
            </button>
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
                          min={0}
                          max={allocation.allocation_type === 'percentage' ? 100 : undefined}
                          step={allocation.allocation_type === 'percentage' ? 1 : 0.01}
                          value={allocation.allocation_value || ''}
                          onChange={(e) =>
                            handleAllocationChange(
                              index,
                              'allocation_value',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          placeholder="0"
                          className="bg-secondary/50 pr-8 h-9"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {allocation.allocation_type === 'percentage' 
                            ? '%' 
                            : getCurrencySymbol(getIncomeCategoryCurrency(allocation.income_category_id), currencies)}
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
        <Button onClick={handleSave} className="flex-1 gradient-primary" disabled={isSaving || !name.trim()}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Сохранить' : 'Создать'}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
