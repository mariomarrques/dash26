import { Bell, LogOut, Menu } from "lucide-react";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { usePeriod } from "@/contexts/PeriodContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  hidePeriodFilter?: boolean;
}

export const Header = ({ title, subtitle, onMenuClick, hidePeriodFilter = false }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { period, setPeriod } = usePeriod();
  const isMobile = useIsMobile();

  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : 'U';

  return (
    <header className="bg-background border-b border-border">
      {/* Mobile: 2-line layout */}
      {isMobile ? (
        <div className="flex flex-col">
          {/* Line 1: Menu, Title, Bell, Avatar */}
          <div className="h-14 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button 
                onClick={onMenuClick}
                className="p-2 rounded-xl hover:bg-muted transition-all duration-200 flex-shrink-0"
                aria-label="Abrir menu"
              >
                <Menu size={22} className="text-foreground" />
              </button>

              <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Notifications */}
              <button className="p-2 rounded-xl hover:bg-muted transition-all duration-200">
                <Bell size={20} className="text-muted-foreground" />
              </button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-xl hover:bg-muted transition-all duration-200">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-gradient-primary text-white text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl bg-card border-border">
                  <DropdownMenuItem 
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Line 2: Period Filter - full width */}
          {!hidePeriodFilter && (
            <div className="px-3 pb-3">
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>
          )}
        </div>
      ) : (
        /* Desktop: Single line layout */
        <div className="h-18 px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="min-w-0 flex-shrink">
              <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            
            {/* Global Period Filter - Desktop */}
            {!hidePeriodFilter && (
              <PeriodFilter value={period} onChange={setPeriod} />
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Notifications */}
            <button className="p-2.5 rounded-xl hover:bg-muted transition-all duration-200 hover:scale-105 relative">
              <Bell size={20} className="text-muted-foreground" />
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-muted transition-all duration-200">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">
                    {user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl bg-card border-border">
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive cursor-pointer rounded-lg"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </header>
  );
};
