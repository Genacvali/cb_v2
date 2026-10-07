/**
 * Static currency reference used by the converter. The `currencies` table in
 * Supabase only holds currencies you can record income in; this list is wider
 * and provides symbols for display-only conversion targets (GEL, AMD, ...).
 */
export interface KnownCurrency {
  code: string;
  name: string;
  symbol: string;
}

export const KNOWN_CURRENCIES: KnownCurrency[] = [
  { code: 'RUB', name: 'Российский рубль', symbol: '₽' },
  { code: 'USD', name: 'Доллар США', symbol: '$' },
  { code: 'EUR', name: 'Евро', symbol: '€' },
  { code: 'GEL', name: 'Грузинский лари', symbol: '₾' },
  { code: 'AMD', name: 'Армянский драм', symbol: '֏' },
  { code: 'GBP', name: 'Фунт стерлингов', symbol: '£' },
  { code: 'CNY', name: 'Китайский юань', symbol: '¥' },
  { code: 'KZT', name: 'Казахстанский тенге', symbol: '₸' },
  { code: 'BYN', name: 'Белорусский рубль', symbol: 'Br' },
  { code: 'UAH', name: 'Украинская гривна', symbol: '₴' },
  { code: 'TRY', name: 'Турецкая лира', symbol: '₺' },
  { code: 'AED', name: 'Дирхам ОАЭ', symbol: 'د.إ' },
  { code: 'THB', name: 'Тайский бат', symbol: '฿' },
  { code: 'RSD', name: 'Сербский динар', symbol: 'дин.' },
  { code: 'AZN', name: 'Азербайджанский манат', symbol: '₼' },
  { code: 'UZS', name: 'Узбекский сум', symbol: 'сўм' },
  { code: 'KGS', name: 'Киргизский сом', symbol: 'с' },
  { code: 'ILS', name: 'Израильский шекель', symbol: '₪' },
  { code: 'JPY', name: 'Японская иена', symbol: '¥' },
  { code: 'CHF', name: 'Швейцарский франк', symbol: '₣' },
  { code: 'PLN', name: 'Польский злотый', symbol: 'zł' },
  { code: 'CZK', name: 'Чешская крона', symbol: 'Kč' },
  { code: 'INR', name: 'Индийская рупия', symbol: '₹' },
  { code: 'IDR', name: 'Индонезийская рупия', symbol: 'Rp' },
  { code: 'VND', name: 'Вьетнамский донг', symbol: '₫' },
];

/** Shown as one-tap chips in the converter. */
export const QUICK_CONVERT_CURRENCIES = ['EUR', 'USD', 'GEL', 'AMD'];

export function findKnownCurrency(code: string): KnownCurrency | undefined {
  return KNOWN_CURRENCIES.find(c => c.code === code);
}
