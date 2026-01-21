import { useState } from 'react';
import { useAddExpenseCategory, useAddIncomeCategory } from '@/hooks/useBudget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_EMOJI_OPTIONS, DEFAULT_CATEGORY_COLOR } from '@/constants/categoryOptions';

interface Props {
  type: 'income' | 'expense';
  onSuccess?: () => void;
}

export function QuickCategoryAdd({ type, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  
  const addExpenseCategory = useAddExpenseCategory();
  const addIncomeCategory = useAddIncomeCategory();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Введите название');
      return;
    }

    try {
      if (type === 'expense') {
        await addExpenseCategory.mutateAsync({
          name,
          icon,
          color: DEFAULT_CATEGORY_COLOR,
          allocation_type: 'percentage',
          allocation_value: 0,
        });
      } else {
        await addIncomeCategory.mutateAsync({
          name,
          icon: '💰', // Default icon for income
          color: DEFAULT_CATEGORY_COLOR,
        });
      }
      toast.success('Категория добавлена');
      setName('');
      setIcon('💰');
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error('Ошибка при добавлении');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 h-8 text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-popover border shadow-lg" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {type === 'expense' ? 'Новая категория расхода' : 'Новая категория дохода'}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            {/* Emoji picker - only for expense */}
            {type === 'expense' && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center text-xl border-2 border-transparent hover:border-primary/30 transition-all shrink-0">
                    {icon}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-popover border shadow-lg" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {CATEGORY_EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`w-8 h-8 rounded flex items-center justify-center text-lg hover:bg-secondary transition-colors ${
                          icon === emoji ? 'bg-primary/20 ring-1 ring-primary' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <Input
              placeholder="Название..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-10"
              autoFocus
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full h-9 gradient-primary"
            disabled={!name.trim()}
          >
            Создать
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
