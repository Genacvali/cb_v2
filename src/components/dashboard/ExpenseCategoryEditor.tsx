import { ExpenseCategory } from '@/types/budget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';

interface Props {
  category: ExpenseCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseCategoryEditor({ category, open, onOpenChange }: Props) {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Редактировать категорию</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Измените данные категории расходов
          </p>
        </DialogHeader>
        <div className="px-2 pb-2">
          <ExpenseCategoryForm
            category={category}
            isEditing={true}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
