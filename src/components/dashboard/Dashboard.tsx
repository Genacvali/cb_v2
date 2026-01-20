import { Header } from './Header';
import { StatsCards } from './StatsCards';
import { BudgetChart } from './BudgetChart';
import { AddIncomeForm } from './AddIncomeForm';
import { CategoryAllocation } from './CategoryAllocation';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <StatsCards />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <AddIncomeForm />
            <BudgetChart />
          </div>
          
          <div>
            <CategoryAllocation />
          </div>
        </div>
      </main>
    </div>
  );
}
