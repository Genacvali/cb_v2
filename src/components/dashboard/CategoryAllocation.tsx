import { useMemo, useState } from 'react';
import { renderCategoriesImage } from '@/lib/exportCategoriesImage';
import { useExpenseCategories, useIncomeCategories, useDeleteExpenseCategory } from '@/hooks/useBudget';
import { useAllAllocations, useDeleteAllocations } from '@/hooks/useAllocations';
import { useIncomeTotals } from '@/hooks/useIncomeTotals';
import { allocationContribution, allocationPlanned, formatPercent, getAdjustmentIds } from '@/lib/allocations';
import { useDisplayMoney } from '@/hooks/useExchangeRates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { ExpenseCategoryEditor } from './ExpenseCategoryEditor';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';
import { ExpenseCategory, ExpenseCategoryAllocation } from '@/types/budget';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Ellipsis, Loader2, Plus, RotateCcw } from 'lucide-react';
import { DistributeRemainingDialog } from './DistributeRemainingDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SortMode = 'amount' | 'created';
const SORT_STORAGE_KEY = 'crystalbudget-category-sort';

function readSortMode(): SortMode {
  try {
    return localStorage.getItem(SORT_STORAGE_KEY) === 'created' ? 'created' : 'amount';
  } catch {
    return 'amount';
  }
}

export function CategoryAllocation() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { incomeByCategory, totalIncome } = useIncomeTotals();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const { data: allAllocations = [] } = useAllAllocations();
  const {
    money, isConverted, displayCurrency, defaultCurrency, rate, rateDate, ratesLoading, resetDisplayCurrency,
  } = useDisplayMoney();
  const deleteExpenseCategory = useDeleteExpenseCategory();
  const deleteAllocations = useDeleteAllocations();

  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false);
  const [resetAdjustmentsOpen, setResetAdjustmentsOpen] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const [sortMode, setSortModeState] = useState<SortMode>(readSortMode);

  const setSortMode = (mode: SortMode) => {
    setSortModeState(mode);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, mode);
    } catch {
      // Storage may be unavailable (private mode) — keep the choice for this session only.
    }
  };

  const adjustmentIds = useMemo(() => getAdjustmentIds(allAllocations), [allAllocations]);
  const adjustments = allAllocations.filter(a => adjustmentIds.has(a.id));
  const adjustmentsTotal = adjustments.reduce((sum, a) => sum + Number(a.allocation_value), 0);
  const adjustedCategoryCount = new Set(adjustments.map(a => a.expense_category_id)).size;

  // ── Per-category data ─────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const list = expenseCategories.map((category, index) => {
      const own = allAllocations.filter(a => a.expense_category_id === category.id);
      const sourceIncome = (a: ExpenseCategoryAllocation) => incomeByCategory[a.income_category_id] || 0;
      return {
        category,
        index,
        base: own.filter(a => !adjustmentIds.has(a.id)),
        topUp: own
          .filter(a => adjustmentIds.has(a.id))
          .reduce((sum, a) => sum + Number(a.allocation_value), 0),
        hasAllocations: own.length > 0,
        allocated: own.reduce((sum, a) => sum + allocationContribution(a, sourceIncome(a)), 0),
        planned: own.reduce((sum, a) => sum + allocationPlanned(a, sourceIncome(a)), 0),
      };
    });
    if (sortMode === 'amount') {
      list.sort((a, b) => b.planned - a.planned || a.index - b.index);
    }
    return list;
  }, [expenseCategories, allAllocations, incomeByCategory, adjustmentIds, sortMode]);

  const totalAllocated = rows.reduce((sum, row) => sum + row.allocated, 0);
  const noIncome = totalIncome <= 0;

  const allocationPercent = totalIncome > 0 ? Math.round(totalAllocated / totalIncome * 100) : 0;
  // Positive: money left to assign. Negative: allocations exceed income.
  const balance = totalIncome - totalAllocated;
  const remainingTotal = balance > 0.5 ? balance : 0;
  const overspendTotal = balance < -0.5 ? -balance : 0;

  const formatAllocation = (a: ExpenseCategoryAllocation) => (
    a.allocation_type === 'percentage'
      ? formatPercent(a.allocation_value)
      : money(Math.round(a.allocation_value))
  );

  const describeSources = (row: typeof rows[number]) => {
    const parts = row.base.slice(0, 2).map(a => `${a.income_category?.name ?? 'Источник'}: ${formatAllocation(a)}`);
    if (row.base.length > 2) parts.push(`+${row.base.length - 2}`);
    return parts;
  };

  const shareOfIncome = (planned: number) => (totalIncome > 0 ? planned / totalIncome * 100 : 0);

  // ── Category actions ──────────────────────────────────────────────────────
  const handleEdit = (category: ExpenseCategory) => { setEditingCategory(category); setEditDialogOpen(true); };
  const handleDeleteClick = (category: ExpenseCategory) => { setCategoryToDelete(category); setDeleteDialogOpen(true); };
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
    setEditDialogOpen(false);
    setEditingCategory(null);
  };

  const handleResetAdjustments = async () => {
    try {
      await deleteAllocations.mutateAsync([...adjustmentIds]);
      toast.success('Выравнивание сброшено');
    } catch {
      toast.error('Ошибка при сбросе');
    }
  };

  const handleCopyImage = async () => {
    if (copyingImage || rows.length === 0) return;
    setCopyingImage(true);
    const note = overspendTotal > 0
      ? `Перерасход: ${money(Math.round(overspendTotal))}`
      : remainingTotal > 0
        ? `Остаток: ${money(Math.round(remainingTotal))}`
        : undefined;
    const png = renderCategoriesImage({
      title: 'Категории расходов',
      badge: `${allocationPercent}%`,
      note,
      rows: rows.map(row => {
        const parts = describeSources(row);
        if (row.topUp > 0) parts.push(`доплата ${money(Math.round(row.topUp))}`);
        return {
          icon: row.category.icon,
          name: row.category.name,
          detail: parts.join(' • ') || 'Источник не задан',
          amount: money(Math.round(row.planned)),
          dimAmount: !row.hasAllocations,
        };
      }),
    });
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': png }),
      ]);
      toast.success('Картинка скопирована — вставьте её в чат');
    } catch {
      try {
        const blob = await png;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'kategorii-rashodov.png';
        link.click();
        URL.revokeObjectURL(url);
        toast.message('Браузер не дал скопировать — картинка скачана');
      } catch {
        toast.error('Не удалось сделать картинку');
      }
    } finally {
      setCopyingImage(false);
    }
  };

  const renderRow = (row: typeof rows[number]) => {
    const { category: cat, hasAllocations, planned, topUp, base } = row;
    const parts = describeSources(row);
    const share = shareOfIncome(planned);
    const showAmount = hasAllocations && !noIncome;
    return (
      <button
        key={cat.id}
        type="button"
        onClick={() => handleEdit(cat)}
        className="w-full p-2 md:px-3 md:py-2.5 flex items-center gap-3 text-left rounded-lg hover:bg-secondary/40 transition-colors"
        aria-label={`Редактировать ${cat.name}`}
      >
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/50 overflow-visible">
          <CategoryIcon icon={cat.icon} className="text-sm md:text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium text-sm md:text-base truncate">{cat.name}</span>
            <span className={cn(
              'text-sm md:text-base font-medium tabular-nums whitespace-nowrap shrink-0',
              !showAmount && 'text-muted-foreground font-normal',
            )}>
              {showAmount || !hasAllocations ? money(Math.round(planned)) : '—'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">
              {hasAllocations ? (
                <>
                  {parts.join(' • ')}
                  {topUp > 0 && (
                    <span className="text-primary">
                      {base.length > 0 && ' • '}доплата {money(Math.round(topUp))}
                    </span>
                  )}
                </>
              ) : (
                <span className="italic">Источник не задан</span>
              )}
            </p>
            {showAmount && share > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatPercent(Math.round(share * 10) / 10)}
              </span>
            )}
          </div>
          {showAmount && (
            <div className="h-1 mt-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(share, 100)}%` }}
              />
            </div>
          )}
        </div>
      </button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return <>
    <Card className="glass-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-1 md:gap-2 p-3 md:p-6 space-y-0">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <CardTitle className="text-sm md:text-lg truncate">Категории расходов</CardTitle>
          {!noIncome && (
            <Badge
              variant={overspendTotal > 0 ? 'destructive' : allocationPercent >= 100 ? 'default' : 'secondary'}
              className="hidden sm:inline-flex text-xs px-1.5 shrink-0"
            >
              {allocationPercent}%
            </Badge>
          )}
          {(remainingTotal > 0 || overspendTotal > 0) && (
            <span className={cn(
              'hidden sm:inline text-xs whitespace-nowrap',
              overspendTotal > 0 ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}>
              {overspendTotal > 0
                ? `Перерасход: ${money(Math.round(overspendTotal))}`
                : `Остаток: ${money(Math.round(remainingTotal))}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(remainingTotal > 0 || overspendTotal > 0) && (
            <Button
              variant={overspendTotal > 0 ? 'destructive' : 'secondary'}
              size="sm"
              className="h-8 px-2.5 text-xs whitespace-nowrap"
              onClick={() => setDistributeDialogOpen(true)}
            >
              {overspendTotal > 0 ? 'Снять перерасход' : 'Распределить'}
            </Button>
          )}
          {/* ── Add category ── */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Новая категория"
                title="Новая категория"
              >
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
          {/* ── Rare actions ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Ещё действия"
                title="Ещё"
              >
                {copyingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ellipsis className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Порядок</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sortMode} onValueChange={value => setSortMode(value as SortMode)}>
                <DropdownMenuRadioItem value="amount">По сумме</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">Как созданы</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                disabled={rows.length === 0 || copyingImage}
                onSelect={handleCopyImage}
              >
                <Copy className="w-4 h-4" />
                Скопировать картинкой
              </DropdownMenuItem>
              {adjustments.length > 0 && (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => { window.setTimeout(() => setResetAdjustmentsOpen(true), 0); }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Сбросить выравнивание
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-0.5 md:space-y-1 px-1.5 pb-3 md:px-3 md:pb-6 pt-0">
        {rows.length === 0
          ? (
            <div className="text-center py-4 md:py-6">
              <p className="text-muted-foreground text-sm mb-1 md:mb-2">Категорий пока нет</p>
              <p className="text-xs text-muted-foreground">Нажмите «+», чтобы создать первую</p>
            </div>
          )
          : <>
            {noIncome && (
              <div className="mx-1.5 md:mx-3 mb-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs md:text-sm text-muted-foreground">
                Добавьте доход — суммы появятся сами. Под каждой категорией видно, откуда и сколько она получит.
              </div>
            )}
            {!noIncome && (
              <p className={cn(
                'sm:hidden px-2 pb-1 text-xs',
                overspendTotal > 0 ? 'text-destructive font-medium' : 'text-muted-foreground',
              )}>
                Распределено {allocationPercent}%
                {overspendTotal > 0 && ` · перерасход ${money(Math.round(overspendTotal))}`}
                {remainingTotal > 0 && ` · остаток ${money(Math.round(remainingTotal))}`}
              </p>
            )}
            {rows.map(renderRow)}
          </>}

        {isConverted && (
          <div className="flex items-center justify-between gap-2 mx-1.5 md:mx-3 pt-2 mt-1 border-t border-border/50 text-xs text-muted-foreground">
            <span className="truncate tabular-nums">
              {ratesLoading
                ? 'Загружаем курс…'
                : rate
                  ? `≈ в ${displayCurrency} по курсу 1 ${displayCurrency} = ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: rate >= 100 ? 2 : 4 }).format(rate)} ${defaultCurrency}${rateDate ? ` · ${new Date(rateDate).toLocaleDateString('ru-RU')}` : ''}`
                  : `Курс ${displayCurrency} недоступен — показаны суммы в ${defaultCurrency}`}
            </span>
            <button
              type="button"
              onClick={resetDisplayCurrency}
              className="shrink-0 underline hover:text-foreground"
            >
              Вернуть {defaultCurrency}
            </button>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Edit dialog */}
    <ExpenseCategoryEditor
      category={editingCategory}
      open={editDialogOpen}
      onOpenChange={open => { setEditDialogOpen(open); if (!open) setEditingCategory(null); }}
      onDelete={handleDeleteClick}
    />

    {/* Distribute remaining dialog */}
    <DistributeRemainingDialog
      open={distributeDialogOpen}
      onOpenChange={setDistributeDialogOpen}
      balance={balance}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      allAllocations={allAllocations}
      incomeByCategory={incomeByCategory}
    />

    <AlertDialog open={resetAdjustmentsOpen} onOpenChange={setResetAdjustmentsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Сбросить выравнивание?</AlertDialogTitle>
          <AlertDialogDescription>
            Уберём доплаты из «Распределить» в {adjustedCategoryCount} категориях на {money(Math.round(adjustmentsTotal))}.
            Основные проценты и суммы категорий останутся как есть.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleResetAdjustments}>Сбросить</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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
