import { ExpenseCategory } from '@/types/budget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
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
          {onDelete && (
            <div className="px-4 pb-4">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => onDelete(category)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить категорию
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
