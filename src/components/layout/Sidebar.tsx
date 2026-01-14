import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Settings,
  Receipt,
  PieChart,
  PanelLeftClose,
  PanelLeft,
  ShieldAlert
} from "lucide-react";
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Logo } from "@/components/ui/logo";

const ADMIN_EMAIL = "sacmariomarques@gmail.com";

const SIDEBAR_STORAGE_KEY = "dash26-sidebar-collapsed";

// Pages that should auto-collapse the sidebar for better focus
const FLOW_PAGES = ["/vendas", "/compras", "/estoque", "/custos", "/margens"];

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  collapsed?: boolean;
}

const NavItem = ({ icon, label, to, collapsed }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to || 
    (to !== "/" && location.pathname.startsWith(to));

  const linkContent = (
    <NavLink
      to={to}
      className={cn(
        "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200",
        "text-sidebar-foreground",
        isActive 
          ? "bg-gradient-primary text-white font-semibold" 
          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-r-full" />
      )}
      
      <span className={cn(
        "flex-shrink-0 transition-transform duration-200",
        !isActive && "group-hover:scale-110"
      )}>
        {icon}
      </span>
      
      {!collapsed && (
        <span className="text-sm font-medium">{label}</span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="font-medium bg-card border-border shadow-lg"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
};

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Verificação de admin para item exclusivo
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  // Initialize from localStorage or default to false
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Auto-collapse on flow pages, always expand on dashboard
  useEffect(() => {
    const isFlowPage = FLOW_PAGES.some(page => location.pathname.startsWith(page));
    const isDashboard = location.pathname === "/";
    
    if (isFlowPage) {
      setCollapsed(true);
    } else if (isDashboard) {
      // Dashboard always expands the sidebar for full overview
      setCollapsed(false);
    }
  }, [location.pathname]);

  // Persist preference when manually toggled
  const toggleCollapsed = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newValue));
  };

  const navItems = [
    { id: "dashboard", to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { id: "vendas", to: "/vendas", icon: <TrendingUp size={20} />, label: "Vendas" },
    { id: "compras", to: "/compras", icon: <ShoppingCart size={20} />, label: "Compras" },
    { id: "estoque", to: "/estoque", icon: <Package size={20} />, label: "Estoque" },
    { id: "custos", to: "/custos", icon: <Receipt size={20} />, label: "Custos Fixos" },
    { id: "margens", to: "/margens", icon: <PieChart size={20} />, label: "Margens" },
  ];

  return (
    <aside 
      className={cn(
        "h-screen flex flex-col transition-all duration-300 flex-shrink-0",
        "bg-sidebar border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Header with Logo */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-sidebar-border",
        collapsed ? "px-2 justify-center" : "px-4"
      )}>
        <NavLink to="/" className="flex items-center">
          <Logo 
            size={collapsed ? "sm" : "md"} 
            variant={collapsed ? "icon" : "full"}
            forceDarkText
          />
        </NavLink>
        
        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="p-2 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-all duration-200 rounded-lg hover:bg-sidebar-accent"
                aria-label="Recolher menu"
              >
                <PanelLeftClose size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border">
              Recolher menu
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 py-2.5 border-b border-sidebar-border">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="w-full p-2 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-all duration-200 rounded-lg hover:bg-sidebar-accent flex items-center justify-center"
                aria-label="Expandir menu"
              >
                <PanelLeft size={18} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border">
              Expandir menu
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Section Label - only when expanded */}
      {!collapsed && (
        <div className="px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/40">
            Menu Principal
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1",
        collapsed ? "px-2 py-2" : "px-3"
      )}>
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            to={item.to}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className={cn(
        "border-t border-sidebar-border space-y-1",
        collapsed ? "px-2 py-3" : "px-3 py-4"
      )}>
        {!collapsed && (
          <div className="px-2 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/40">
              Sistema
            </span>
          </div>
        )}
        
        {/* Item de auditoria - SOMENTE para admin */}
        {isAdmin && (
          <NavItem
            icon={<ShieldAlert size={20} />}
            label="Auditoria de Estoque"
            to="/admin/auditoria"
            collapsed={collapsed}
          />
        )}
        <NavItem
          icon={<Settings size={20} />}
          label="Configurações"
          to="/configuracoes"
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
};

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
