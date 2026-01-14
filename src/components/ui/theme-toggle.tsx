import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Moon, Sun, Monitor } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'switch';
  className?: string;
  showLabel?: boolean;
}

/**
 * ThemeToggle - Componente elegante para alternar temas
 * Suporta três modos: icon (simples), dropdown (completo), switch (visual)
 */
export function ThemeToggle({ 
  variant = 'icon', 
  className,
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // Simple icon toggle (click to switch between light/dark)
  if (variant === 'icon') {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            className={cn(
              "relative p-2.5 rounded-xl transition-all duration-300",
              "hover:bg-muted hover:scale-105",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "group",
              className
            )}
            aria-label={`Alternar para tema ${resolvedTheme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {/* Sun icon - visible in dark mode */}
            <Sun 
              size={20} 
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "text-muted-foreground transition-all duration-300",
                "group-hover:text-primary",
                resolvedTheme === 'dark' 
                  ? "rotate-0 scale-100 opacity-100" 
                  : "rotate-90 scale-0 opacity-0"
              )}
            />
            {/* Moon icon - visible in light mode */}
            <Moon 
              size={20} 
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "text-muted-foreground transition-all duration-300",
                "group-hover:text-primary",
                resolvedTheme === 'light' 
                  ? "rotate-0 scale-100 opacity-100" 
                  : "-rotate-90 scale-0 opacity-0"
              )}
            />
            {/* Invisible spacer for size */}
            <span className="invisible">
              <Sun size={20} />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Dropdown with all options (light, dark, system)
  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-xl transition-all duration-200",
              "hover:bg-muted",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
            aria-label="Selecionar tema"
          >
            {resolvedTheme === 'dark' ? (
              <Moon size={20} className="text-muted-foreground" />
            ) : (
              <Sun size={20} className="text-muted-foreground" />
            )}
            {showLabel && (
              <span className="text-sm text-muted-foreground">
                {theme === 'system' ? 'Sistema' : resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 rounded-xl">
          <DropdownMenuItem
            onClick={() => setTheme('light')}
            className={cn(
              "gap-2 cursor-pointer rounded-lg",
              theme === 'light' && "bg-muted"
            )}
          >
            <Sun size={16} />
            <span>Claro</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme('dark')}
            className={cn(
              "gap-2 cursor-pointer rounded-lg",
              theme === 'dark' && "bg-muted"
            )}
          >
            <Moon size={16} />
            <span>Escuro</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme('system')}
            className={cn(
              "gap-2 cursor-pointer rounded-lg",
              theme === 'system' && "bg-muted"
            )}
          >
            <Monitor size={16} />
            <span>Sistema</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Visual switch (pill toggle)
  if (variant === 'switch') {
    return (
      <div 
        className={cn(
          "relative flex items-center p-1 rounded-full",
          "bg-muted border border-border",
          "w-[72px] h-9",
          className
        )}
      >
        <button
          onClick={toggleTheme}
          className={cn(
            "absolute w-8 h-7 rounded-full",
            "bg-primary shadow-sm",
            "transition-all duration-300 ease-out",
            resolvedTheme === 'dark' ? "left-1" : "left-[calc(100%-36px)]"
          )}
          aria-label={`Alternar para tema ${resolvedTheme === 'dark' ? 'claro' : 'escuro'}`}
        />
        <div className="relative z-10 flex items-center justify-between w-full px-2">
          <Moon 
            size={14} 
            className={cn(
              "transition-colors duration-300",
              resolvedTheme === 'dark' ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
          <Sun 
            size={14} 
            className={cn(
              "transition-colors duration-300",
              resolvedTheme === 'light' ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
        </div>
      </div>
    );
  }

  return null;
}

// Componente para uso na sidebar (versão compacta)
export function ThemeToggleSidebar({ collapsed }: { collapsed?: boolean }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center justify-center p-3 rounded-xl",
              "text-sidebar-foreground/70 hover:text-white",
              "hover:bg-white/10 transition-all duration-200"
            )}
            aria-label="Alternar tema"
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
        "text-sidebar-foreground/70 hover:text-white",
        "hover:bg-white/10 hover:translate-x-1 transition-all duration-200"
      )}
      aria-label="Alternar tema"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      <span className="text-sm">
        {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      </span>
    </button>
  );
}

export default ThemeToggle;

// Sistema de temas (dark/light + toggle + system preference) implementado no Dash 26
