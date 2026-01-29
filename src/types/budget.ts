export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  onboarding_completed: boolean;
  tutorial_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
  created_at: string;
  allocations?: ExpenseCategoryAllocation[];
}

export interface ExpenseCategoryAllocation {
  id: string;
  user_id: string;
  expense_category_id: string;
  income_category_id: string;
  allocation_type: 'percentage' | 'fixed';
  allocation_value: number;
  created_at: string;
  income_category?: IncomeCategory;
}

export interface Income {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string | null;
  created_at: string;
  category?: IncomeCategory;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  incomeCategories: Omit<IncomeCategory, 'id' | 'user_id' | 'created_at'>[];
  expenseCategories: Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at'>[];
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'basic',
    name: 'Базовый',
    description: 'Стандартный набор для начала',
    icon: 'wallet',
    incomeCategories: [
      { name: 'Зарплата', icon: 'briefcase', color: '#10B981' },
      { name: 'Аванс', icon: 'banknote', color: '#06B6D4' },
      { name: 'Подработка', icon: 'laptop', color: '#8B5CF6' },
    ],
    expenseCategories: [
      { name: 'Продукты', icon: 'shopping-cart', color: '#F59E0B', allocation_type: 'percentage', allocation_value: 30 },
      { name: 'Транспорт', icon: 'car', color: '#3B82F6', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Жильё', icon: 'home', color: '#EF4444', allocation_type: 'percentage', allocation_value: 25 },
      { name: 'Развлечения', icon: 'gamepad-2', color: '#EC4899', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Накопления', icon: 'piggy-bank', color: '#22C55E', allocation_type: 'percentage', allocation_value: 15 },
      { name: 'Прочее', icon: 'more-horizontal', color: '#6B7280', allocation_type: 'percentage', allocation_value: 10 },
    ],
  },
  {
    id: 'freelancer',
    name: 'Для фрилансера',
    description: 'Учитывает налоги и инструменты',
    icon: 'laptop',
    incomeCategories: [
      { name: 'Проекты', icon: 'folder', color: '#10B981' },
      { name: 'Консультации', icon: 'message-circle', color: '#06B6D4' },
      { name: 'Пассивный доход', icon: 'trending-up', color: '#8B5CF6' },
    ],
    expenseCategories: [
      { name: 'Налоги', icon: 'file-text', color: '#EF4444', allocation_type: 'percentage', allocation_value: 15 },
      { name: 'Инструменты', icon: 'wrench', color: '#3B82F6', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Образование', icon: 'book-open', color: '#8B5CF6', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Продукты', icon: 'shopping-cart', color: '#F59E0B', allocation_type: 'percentage', allocation_value: 20 },
      { name: 'Жильё', icon: 'home', color: '#EC4899', allocation_type: 'percentage', allocation_value: 20 },
      { name: 'Накопления', icon: 'piggy-bank', color: '#22C55E', allocation_type: 'percentage', allocation_value: 20 },
      { name: 'Прочее', icon: 'more-horizontal', color: '#6B7280', allocation_type: 'percentage', allocation_value: 5 },
    ],
  },
  {
    id: 'family',
    name: 'Семейный',
    description: 'Для семьи с детьми',
    icon: 'users',
    incomeCategories: [
      { name: 'Зарплата (муж)', icon: 'briefcase', color: '#10B981' },
      { name: 'Зарплата (жена)', icon: 'briefcase', color: '#06B6D4' },
      { name: 'Пособия', icon: 'gift', color: '#8B5CF6' },
    ],
    expenseCategories: [
      { name: 'Продукты', icon: 'shopping-cart', color: '#F59E0B', allocation_type: 'percentage', allocation_value: 25 },
      { name: 'Дети', icon: 'baby', color: '#EC4899', allocation_type: 'percentage', allocation_value: 20 },
      { name: 'Жильё', icon: 'home', color: '#EF4444', allocation_type: 'percentage', allocation_value: 20 },
      { name: 'Медицина', icon: 'heart-pulse', color: '#14B8A6', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Отпуск', icon: 'plane', color: '#3B82F6', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Накопления', icon: 'piggy-bank', color: '#22C55E', allocation_type: 'percentage', allocation_value: 10 },
      { name: 'Прочее', icon: 'more-horizontal', color: '#6B7280', allocation_type: 'percentage', allocation_value: 5 },
    ],
  },
];
