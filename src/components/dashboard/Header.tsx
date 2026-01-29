import { useAuth } from '@/hooks/useAuth';
import { useTheme, THEME_OPTIONS } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Palette } from 'lucide-react';
import crystalLogo from '@/assets/crystal-logo.png';

export function Header() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U';
  const currentTheme = THEME_OPTIONS.find(t => t.value === theme);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <img 
            src={crystalLogo} 
            alt="CrystalBudget" 
            className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-lg"
          />
          <h1 className="text-lg md:text-xl font-bold gradient-text">CrystalBudget</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <span className="text-lg">{currentTheme?.icon || '☀️'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Тема
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={theme === option.value ? 'bg-secondary' : ''}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarFallback className="gradient-primary text-white font-medium text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="truncate">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}