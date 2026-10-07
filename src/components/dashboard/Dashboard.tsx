import { Header } from './Header';
import { StatsCards } from './StatsCards';
import { AddIncomeForm } from './AddIncomeForm';
import { CategoryAllocation } from './CategoryAllocation';
import { IncomeHistory } from './IncomeHistory';

export function Dashboard() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <StatsCards />
        
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <div className="space-y-4 md:space-y-6 min-w-0">
            <AddIncomeForm />
            <IncomeHistory />
          </div>
          
          <div className="min-w-0">
            <CategoryAllocation />
          </div>
        </div>
      </main>
    </div>
  );
}
