import { useExpenseCategories, useIncomes } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { useState, useCallback } from 'react';

const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {value.toLocaleString('ru-RU')} ₽
      </text>
      <text x={cx} y={cy + 35} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-xs">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

export function BudgetChart() {
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: incomes = [] } = useIncomes();
  const { data: allAllocations = [] } = useAllAllocations();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Calculate total income per income category
  const incomeByCategory = incomes.reduce((acc, inc) => {
    const catId = inc.category_id || 'uncategorized';
    acc[catId] = (acc[catId] || 0) + Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  // Calculate allocated amounts for each expense category using allocations
  const getCategoryAllocation = (categoryId: string) => {
    const categoryAllocations = allAllocations.filter(a => a.expense_category_id === categoryId);
    
    let totalAllocated = 0;
    for (const allocation of categoryAllocations) {
      const sourceIncome = incomeByCategory[allocation.income_category_id] || 0;
      if (allocation.allocation_type === 'percentage') {
        totalAllocated += (sourceIncome * allocation.allocation_value) / 100;
      } else {
        totalAllocated += allocation.allocation_value;
      }
    }
    return totalAllocated;
  };

  const chartData = expenseCategories.map((cat) => {
    const amount = getCategoryAllocation(cat.id);
    
    return {
      name: cat.name,
      value: amount,
      color: cat.color,
      percent: totalIncome > 0 ? amount / totalIncome : 0,
    };
  }).filter(d => d.value > 0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  if (chartData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Распределение бюджета</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Добавьте доход и распределите по категориям
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
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || 'hsl(var(--primary))'}
                  stroke="transparent"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Сумма']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Legend 
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({(entry.payload.percent * 100).toFixed(1)}%)
                </span>
              )}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
