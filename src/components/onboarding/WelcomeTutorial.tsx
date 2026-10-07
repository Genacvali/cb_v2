import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Wallet, 
  PieChart, 
  Target, 
  Sparkles,
  Plus,
  X,
  Smartphone,
  Check,
  Loader2
} from 'lucide-react';
import { useAddIncomeCategory, useAddExpenseCategory } from '@/hooks/useBudget';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import crystalLogo from '@/assets/crystal-logo.png';

interface TutorialStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  type: 'info' | 'income-categories' | 'expense-categories';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    icon: <Sparkles className="w-12 h-12" />,
    title: 'Добро пожаловать в CrystalBudget!',
    description: 'Мы поможем вам управлять финансами легко и эффективно. Давайте познакомимся с основными функциями и настроим ваш бюджет.',
    type: 'info',
  },
  {
    id: 'apps',
    icon: <Smartphone className="w-12 h-12" />,
    title: 'Работает с любыми приложениями',
    description: 'CrystalBudget отлично дополняет ZenMoney, Дзен-мани, 1Money, CoinKeeper и другие приложения учёта финансов. Используйте его для планирования бюджета, а расходы отслеживайте в привычном приложении.',
    type: 'info',
  },
  {
    id: 'income',
    icon: <Wallet className="w-12 h-12" />,
    title: 'Добавьте источники дохода',
    description: 'Укажите откуда приходят деньги — зарплата, аванс, подработка. Это поможет автоматически распределять бюджет.',
    type: 'income-categories',
  },
  {
    id: 'expenses',
    icon: <PieChart className="w-12 h-12" />,
    title: 'Создайте категории расходов',
    description: 'Добавьте категории трат — продукты, транспорт, развлечения. Позже вы сможете настроить процент или сумму для каждой.',
    type: 'expense-categories',
  },
  {
    id: 'done',
    icon: <Target className="w-12 h-12" />,
    title: 'Всё готово!',
    description: 'Теперь вы можете начать пользоваться приложением. Добавляйте доходы, и они автоматически распределятся по категориям.',
    type: 'info',
  },
];

const SUGGESTED_INCOME_CATEGORIES = ['Зарплата', 'Аванс', 'Подработка', 'Инвестиции'];
const SUGGESTED_EXPENSE_CATEGORIES = ['Продукты', 'Транспорт', 'Жильё', 'Развлечения', 'Накопления', 'Здоровье'];

// Sensible default emoji for the suggested categories so they don't all look identical.
const EXPENSE_ICON_BY_NAME: Record<string, string> = {
  'Продукты': '🛒',
  'Транспорт': '🚗',
  'Жильё': '🏠',
  'Развлечения': '🎮',
  'Накопления': '💰',
  'Здоровье': '🏥',
};

interface WelcomeTutorialProps {
  onComplete: () => void;
}

export function WelcomeTutorial({ onComplete }: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [newIncome, setNewIncome] = useState('');
  const [newExpense, setNewExpense] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addIncomeCategory = useAddIncomeCategory();
  const addExpenseCategory = useAddExpenseCategory();
  const { user } = useAuth();
  const { toast } = useToast();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  const handleAddIncomeCategory = (name: string) => {
    if (name.trim() && !incomeCategories.includes(name.trim())) {
      setIncomeCategories([...incomeCategories, name.trim()]);
    }
    setNewIncome('');
  };

  const handleRemoveIncomeCategory = (name: string) => {
    setIncomeCategories(incomeCategories.filter(c => c !== name));
  };

  const handleAddExpenseCategory = (name: string) => {
    if (name.trim() && !expenseCategories.includes(name.trim())) {
      setExpenseCategories([...expenseCategories, name.trim()]);
    }
    setNewExpense('');
  };

  const handleRemoveExpenseCategory = (name: string) => {
    setExpenseCategories(expenseCategories.filter(c => c !== name));
  };

  /** Returns true on success; the tutorial must not be marked complete otherwise. */
  const saveCategories = async (): Promise<boolean> => {
    if (!user) return false;
    if (incomeCategories.length === 0 && expenseCategories.length === 0) return true;
    
    setIsSaving(true);
    try {
      // Save income categories
      for (const name of incomeCategories) {
        await addIncomeCategory.mutateAsync({
          name,
          icon: '💰',
          color: '#10B981',
        });
      }

      // Save expense categories
      for (const name of expenseCategories) {
        await addExpenseCategory.mutateAsync({
          name,
          icon: EXPENSE_ICON_BY_NAME[name] ?? '🛒',
          color: '#6B7280',
          allocation_type: 'percentage',
          allocation_value: 0,
        });
      }

      toast({
        title: 'Категории созданы!',
        description: `Добавлено ${incomeCategories.length} источников дохода и ${expenseCategories.length} категорий расходов`,
      });
      return true;
    } catch {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить категории. Попробуйте ещё раз.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (isLastStep) {
      if (await saveCategories()) onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = async () => {
    if (await saveCategories()) onComplete();
  };

  const canProceed = () => {
    // For category steps, require at least one category
    if (step.type === 'income-categories') {
      return incomeCategories.length > 0;
    }
    if (step.type === 'expense-categories') {
      return expenseCategories.length > 0;
    }
    return true;
  };

  const renderStepContent = () => {
    if (step.type === 'income-categories') {
      return (
        <div className="space-y-4 mt-4">
          {/* Quick add suggestions */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Быстрый выбор:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_INCOME_CATEGORIES.filter(s => !incomeCategories.includes(s)).map((suggestion) => (
                <Badge 
                  key={suggestion}
                  variant="outline" 
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleAddIncomeCategory(suggestion)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Added categories */}
          {incomeCategories.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Добавлено:</p>
              <div className="flex flex-wrap gap-2">
                {incomeCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="pr-1">
                    {cat}
                    <button
                      onClick={() => handleRemoveIncomeCategory(cat)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom input */}
          <div className="flex gap-2">
            <Input
              placeholder="Или введите свой..."
              value={newIncome}
              onChange={(e) => setNewIncome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddIncomeCategory(newIncome);
                }
              }}
            />
            <Button 
              type="button" 
              variant="secondary" 
              size="icon"
              onClick={() => handleAddIncomeCategory(newIncome)}
              disabled={!newIncome.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (step.type === 'expense-categories') {
      return (
        <div className="space-y-4 mt-4">
          {/* Quick add suggestions */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Быстрый выбор:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_EXPENSE_CATEGORIES.filter(s => !expenseCategories.includes(s)).map((suggestion) => (
                <Badge 
                  key={suggestion}
                  variant="outline" 
                  className="cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => handleAddExpenseCategory(suggestion)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          {/* Added categories */}
          {expenseCategories.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Добавлено:</p>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="pr-1">
                    {cat}
                    <button
                      onClick={() => handleRemoveExpenseCategory(cat)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom input */}
          <div className="flex gap-2">
            <Input
              placeholder="Или введите свой..."
              value={newExpense}
              onChange={(e) => setNewExpense(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddExpenseCategory(newExpense);
                }
              }}
            />
            <Button 
              type="button" 
              variant="secondary" 
              size="icon"
              onClick={() => handleAddExpenseCategory(newExpense)}
              disabled={!newExpense.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Info step - show summary on last step
    if (step.id === 'done' && (incomeCategories.length > 0 || expenseCategories.length > 0)) {
      return (
        <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Будет создано:</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            {incomeCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>{incomeCategories.length} источник(ов) дохода</span>
              </div>
            )}
            {expenseCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>{expenseCategories.length} категорий расходов</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-20 blur-3xl" />
      </div>

      <Card className="w-full max-w-lg glass-card relative z-10">
        <CardContent className="pt-8 pb-6 px-6">
          {/* Logo on first step */}
          {isFirstStep && (
            <div className="flex justify-center mb-6">
              <img
                src={crystalLogo}
                alt="CrystalBudget"
                className="w-24 h-24 object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* Step indicator — only completed steps are clickable, so required
              category steps can't be skipped by jumping ahead. */}
          <div className="flex justify-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((s, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Шаг ${index + 1}: ${s.title}`}
                disabled={index > currentStep}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all disabled:cursor-default ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Icon (not on first step) */}
          {!isFirstStep && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white">
                {step.icon}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="text-center mb-4 animate-fade-in" key={currentStep}>
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Step-specific content */}
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-6">
            {isFirstStep ? (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Пропустить
              </Button>
            ) : (
              <Button variant="ghost" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            )}

            <Button 
              onClick={handleNext} 
              className="gradient-primary hover:opacity-90 min-w-[120px]"
              disabled={!canProceed() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Сохранение...
                </>
              ) : isLastStep ? (
                'Начать'
              ) : (
                <>
                  Далее
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Skip hint for category steps */}
          {(step.type === 'income-categories' || step.type === 'expense-categories') && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Добавьте хотя бы одну категорию для продолжения
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
