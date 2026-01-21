import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Menu, 
  LogOut, 
  User, 
  Wallet,
  Settings,
  PieChart,
  TrendingUp,
  Plus
} from 'lucide-react';
import { CategoryManager } from './CategoryManager';

interface MobileNavProps {
  onScrollTo?: (section: string) => void;
}

export function MobileNav({ onScrollTo }: MobileNavProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  const menuItems = [
    { icon: TrendingUp, label: 'Доходы', section: 'income' },
    { icon: PieChart, label: 'Распределение', section: 'allocation' },
  ];

  const handleNavClick = (section: string) => {
    onScrollTo?.(section);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <SheetTitle className="gradient-text">CrystalBudget</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-80px)]">
          {/* User info */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="gradient-primary text-white font-medium text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Мой аккаунт</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {menuItems.map((item) => (
              <Button
                key={item.section}
                variant="ghost"
                className="w-full justify-start gap-3 h-11"
                onClick={() => handleNavClick(item.section)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Button>
            ))}
            
            {/* Category Manager inline */}
            <div className="pt-2">
              <CategoryManager />
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border/50">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
