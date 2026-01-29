import { useExpenseCategories, useIncomes } from '@/hooks/useBudget';
import { useAllAllocations } from '@/hooks/useAllocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const renderActiveShape = (props: any, isMobile: boolean) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  const fontSize = isMobile ? 11 : 14;
  const smallFontSize = isMobile ? 9 : 12;

  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" style={{ fontSize, fontWeight: 500 }}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" style={{ fontSize: smallFontSize }}>
        {value.toLocaleString('ru-RU')} ₽
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="hsl(var(--muted-foreground))" style={{ fontSize: smallFontSize }}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + (isMobile ? 4 : 8)}
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
        innerRadius={outerRadius + (isMobile ? 6 : 12)}
        outerRadius={outerRadius + (isMobile ? 8 : 16)}
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
  const isMobile = useIsMobile();

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
        // Fixed amount: only count what the source category actually has
        totalAllocated += Math.min(allocation.allocation_value, sourceIncome);
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
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Распределение бюджета</CardTitle>
        </CardHeader>
        <CardContent className="h-48 md:h-64 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
          Добавьте доход и распределите по категориям
        </CardContent>
      </Card>
    );
  }

  const innerRadius = isMobile ? 45 : 70;
  const outerRadius = isMobile ? 70 : 100;
  const chartHeight = isMobile ? 260 : 320;

  return (
    <Card className="glass-card">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Распределение бюджета</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={(props: any) => renderActiveShape(props, isMobile)}
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
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
                fontSize: isMobile ? '12px' : '14px',
              }}
            />
            <Legend 
              formatter={(value, entry: any) => (
                <span style={{ fontSize: isMobile ? 11 : 14 }}>
                  {isMobile && value.length > 10 ? value.substring(0, 10) + '...' : value} ({(entry.payload.percent * 100).toFixed(0)}%)
                </span>
              )}
              wrapperStyle={{ paddingTop: isMobile ? '10px' : '20px' }}
              iconSize={isMobile ? 8 : 10}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
