import { Bell, LogOut, Menu, UserCircle } from "lucide-react";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { usePeriod } from "@/contexts/PeriodContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  hidePeriodFilter?: boolean;
}

export const Header = ({ title, subtitle, onMenuClick, hidePeriodFilter = false }: HeaderProps) => {
  const { user, profile, profileLoaded, signOut } = useAuth();
  const { period, setPeriod } = usePeriod();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Nome do perfil - fallback seguro
  const displayName = profile?.name || null;
  
  // Só mostra "completar perfil" se:
  // 1. Usuário existe
  // 2. Profile já foi carregado (não estamos esperando)
  // 3. Profile não tem nome
  const needsProfileSetup = user && profileLoaded && !profile?.name;
  
  // Get initials from name or email
  const getInitials = () => {
    if (profile?.name) {
      const parts = profile.name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return profile.name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const userInitials = getInitials();

  // Handler de logout robusto
  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      queryClient.clear();
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border/60 sticky top-0 z-40">
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

            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Theme Toggle */}
              <ThemeToggle variant="icon" />
              
              {/* Notifications */}
              <button className="p-2 rounded-xl hover:bg-muted transition-all duration-200 relative">
                <Bell size={20} className="text-muted-foreground" />
              </button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-xl hover:bg-muted transition-all duration-200">
                    <Avatar className="w-7 h-7 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-primary text-white text-[10px] font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-52 rounded-xl bg-card border-border shadow-lg"
                >
                  {/* User info header */}
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {displayName || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  
                  {needsProfileSetup && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/configuracoes')}
                      className="text-warning focus:text-warning cursor-pointer rounded-lg mx-1 mt-1"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Completar perfil
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg mx-1 mb-1"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOut ? 'Saindo...' : 'Sair'}
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
        <div className="h-[72px] px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 flex-1 min-w-0">
            <div className="min-w-0 flex-shrink">
              <h1 className="text-xl font-bold text-foreground truncate tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            
            {/* Global Period Filter - Desktop */}
            {!hidePeriodFilter && (
              <PeriodFilter value={period} onChange={setPeriod} />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle variant="dropdown" />
            
            {/* Notifications */}
            <button className="p-2.5 rounded-xl hover:bg-muted transition-all duration-200 relative group">
              <Bell size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            {/* Separator */}
            <div className="w-px h-8 bg-border mx-2" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-muted transition-all duration-200 group">
                  <Avatar className="w-9 h-9 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-foreground block leading-tight">
                      {displayName || 'Usuário'}
                    </span>
                    {needsProfileSetup ? (
                      <span className="text-xs text-warning">Completar perfil</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Minha conta</span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 rounded-xl bg-card border-border shadow-lg"
              >
                {/* User info header */}
                <div className="px-3 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {displayName || 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                
                {needsProfileSetup && (
                  <DropdownMenuItem 
                    onClick={() => navigate('/configuracoes')}
                    className="text-warning focus:text-warning cursor-pointer rounded-lg mx-1.5 mt-1.5"
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    Completar perfil
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator className="my-1.5" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive cursor-pointer rounded-lg mx-1.5 mb-1.5"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Saindo...' : 'Sair'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </header>
  );
};

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
