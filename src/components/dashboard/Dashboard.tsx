import { useRef } from 'react';
import { Header } from './Header';
import { StatsCards } from './StatsCards';
import { BudgetChart } from './BudgetChart';
import { AddIncomeForm } from './AddIncomeForm';
import { CategoryAllocation } from './CategoryAllocation';
import { CategoryManager } from './CategoryManager';

export function Dashboard() {
  const incomeRef = useRef<HTMLDivElement>(null);
  const allocationRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (section: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      income: incomeRef,
      allocation: allocationRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onScrollTo={scrollToSection} />
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Category manager - hidden on mobile (available in burger menu) */}
        <div className="hidden md:flex justify-end mb-4">
          <CategoryManager />
        </div>
        
        <StatsCards />
        
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
            <div ref={incomeRef}>
              <AddIncomeForm />
            </div>
            <BudgetChart />
          </div>
          
          <div ref={allocationRef}>
            <CategoryAllocation />
          </div>
        </div>
      </main>
    </div>
  );
}
