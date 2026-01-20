import { useExpenseCategories, useIncomes } from '@/hooks/useBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function BudgetChart() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: incomes = [] } = useIncomes();

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  const chartData = expenseCategories.map((cat) => {
    const amount = cat.allocation_type === 'percentage'
      ? (totalIncome * cat.allocation_value) / 100
      : cat.allocation_value;
    
    return {
      name: cat.name,
      value: amount,
      color: cat.color,
      percent: cat.allocation_type === 'percentage' 
        ? cat.allocation_value 
        : totalIncome > 0 ? (cat.allocation_value / totalIncome) * 100 : 0,
    };
  }).filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Распределение бюджета</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Добавьте доход для отображения диаграммы
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Распределение бюджета</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend 
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({entry.payload.percent.toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
