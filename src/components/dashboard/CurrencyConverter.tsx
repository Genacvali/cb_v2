import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeftRight, ArrowRightLeft, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { KNOWN_CURRENCIES, QUICK_CONVERT_CURRENCIES, findKnownCurrency } from '@/constants/currencies';
import { useExchangeRates, useDisplayCurrency } from '@/hooks/useExchangeRates';
import { useFormatMoney } from '@/hooks/useCurrencies';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional preset amount (e.g. the current remaining balance). */
  initialAmount?: number;
}

const formatNumber = (n: number, max = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: max, minimumFractionDigits: 0 }).format(n);

const formatRate = (n: number) => {
  // Show more precision for small rates (e.g. 1 RUB = 0,0120 USD)
  const digits = n >= 100 ? 2 : n >= 1 ? 4 : 6;
  return formatNumber(n, digits);
};

export function CurrencyConverter({ open, onOpenChange, initialAmount }: Props) {
  const { defaultCurrency, currencies } = useFormatMoney();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const { convert, rateOf, supportedCodes, date, source, isLoading, isError, isFetching, refetch } = useExchangeRates();

  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(defaultCurrency);
  const [to, setTo] = useState(displayCurrency && displayCurrency !== defaultCurrency ? displayCurrency : 'USD');

  // Reset "from" to the profile currency and prefill amount each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setFrom(defaultCurrency);
    if (initialAmount && initialAmount > 0) setAmount(String(Math.round(initialAmount * 100) / 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Merge DB currencies + static list, keep only codes the rate source supports
  const options = useMemo(() => {
    const byCode = new Map<string, { code: string; name: string; symbol: string }>();
    for (const c of KNOWN_CURRENCIES) byCode.set(c.code, c);
    for (const c of currencies) byCode.set(c.code, { code: c.code, name: c.name, symbol: c.symbol });
    const supported = new Set(supportedCodes);
    return [...byCode.values()].filter(c => supported.has(c.code));
  }, [currencies, supportedCodes]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const result = hasAmount ? convert(parsedAmount, from, to) : null;
  const rate = rateOf(from, to);
  const inverseRate = rateOf(to, from);

  const symbol = (code: string) => findKnownCurrency(code)?.symbol || currencies.find(c => c.code === code)?.symbol || code;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const applyToDashboard = displayCurrency === to && to !== defaultCurrency;

  const renderSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="space-y-1.5 flex-1 min-w-0">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span className="font-medium">{symbol(value)}</span>
              <span>{value}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map(c => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span className="w-6 text-center font-medium">{c.symbol}</span>
                <span>{c.code}</span>
                <span className="text-muted-foreground text-xs truncate">{c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Конвертер валют
          </DialogTitle>
          <DialogDescription>
            Быстро посмотреть распределённые суммы в другой валюте.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="convert-amount" className="text-xs text-muted-foreground">Сумма</Label>
            <div className="relative">
              <Input
                id="convert-amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-11 pr-10 text-lg font-medium tabular-nums"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {symbol(from)}
              </span>
            </div>
          </div>

          {/* From / To */}
          <div className="flex items-end gap-2">
            {renderSelect(from, setFrom, 'Из')}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={swap}
              aria-label="Поменять валюты местами"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
            {renderSelect(to, setTo, 'В')}
          </div>

          {/* Quick targets */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CONVERT_CURRENCIES.filter(c => c !== from).map(code => (
              <Badge
                key={code}
                variant={to === code ? 'default' : 'outline'}
                className={cn('cursor-pointer select-none px-2.5 py-1', to !== code && 'hover:bg-secondary')}
                onClick={() => setTo(code)}
              >
                {symbol(code)} {code}
              </Badge>
            ))}
          </div>

          {/* Result */}
          <div className="rounded-xl bg-secondary/50 px-4 py-3 space-y-1">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загружаем курсы…
              </div>
            ) : isError ? (
              <div className="flex items-center justify-between gap-2 text-sm text-destructive">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Не удалось загрузить курсы
                </span>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => refetch()}>
                  Повторить
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Результат</span>
                  <span className="text-2xl font-bold tabular-nums truncate">
                    {result !== null ? `${formatNumber(result)} ${symbol(to)}` : `— ${symbol(to)}`}
                  </span>
                </div>
                {rate !== null && inverseRate !== null && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    1 {from} = {formatRate(rate)} {to} · 1 {to} = {formatRate(inverseRate)} {from}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Apply to dashboard */}
          {to !== defaultCurrency && (
            <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Показывать суммы в {to}</p>
                <p className="text-xs text-muted-foreground">
                  Карточки и категории на дашборде будут пересчитаны в {symbol(to)}
                </p>
              </div>
              <Switch
                checked={applyToDashboard}
                onCheckedChange={checked => setDisplayCurrency(checked ? to : null)}
                disabled={isError || isLoading}
                aria-label={`Показывать суммы на дашборде в ${to}`}
              />
            </div>
          )}
          {displayCurrency && displayCurrency !== defaultCurrency && displayCurrency !== to && (
            <p className="text-xs text-muted-foreground">
              Сейчас дашборд показывает суммы в {displayCurrency}.{' '}
              <button type="button" className="underline hover:text-foreground" onClick={() => setDisplayCurrency(null)}>
                Вернуть {defaultCurrency}
              </button>
            </p>
          )}

          {/* Source */}
          {date && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Курс на {new Date(date).toLocaleDateString('ru-RU')} · {source}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
                Обновить
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
