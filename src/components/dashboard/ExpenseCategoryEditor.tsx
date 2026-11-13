import { ExpenseCategory } from '@/types/budget';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseCategoryForm } from './ExpenseCategoryForm';

interface Props {
  category: ExpenseCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (category: ExpenseCategory) => void;
}

export function ExpenseCategoryEditor({ category, open, onOpenChange, onDelete }: Props) {
  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать категорию</DialogTitle>
          <DialogDescription>
            Измените данные категории расходов
          </DialogDescription>
        </DialogHeader>
        <ExpenseCategoryForm
          category={category}
          isEditing
          onClose={() => onOpenChange(false)}
          onDelete={onDelete ? () => onDelete(category) : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
