import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Settings,
  ChevronLeft,
  ChevronRight,
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
import logoPainel55 from "@/assets/logo-painel55.png";

const ADMIN_EMAIL = "sacmariomarques@gmail.com";

const SIDEBAR_STORAGE_KEY = "painel55-sidebar-collapsed";

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
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "text-sidebar-foreground/70 hover:text-white",
        isActive 
          ? "bg-gradient-primary text-white shadow-glow-primary font-semibold" 
          : "hover:bg-white/10 hover:translate-x-1",
        collapsed && "justify-center px-3"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
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
        "h-screen flex flex-col transition-all duration-300 border-r border-sidebar-border flex-shrink-0",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
      style={{ background: "var(--gradient-dark)" }}
    >
      {/* Header with Logo and Collapse Button */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-white/10 px-4",
        collapsed && "justify-center px-2"
      )}>
        <NavLink to="/" className="flex items-center gap-3">
          <img 
            src={logoPainel55} 
            alt="Painel 55" 
            className="w-10 h-10 rounded-xl flex-shrink-0"
          />
          {!collapsed && (
            <span className="text-white font-bold text-xl tracking-tight">
              Painel 55
            </span>
          )}
        </NavLink>
        
        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Recolher menu"
              >
                <PanelLeftClose size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Recolher menu
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Expand button when collapsed - in header area */}
      {collapsed && (
        <div className="px-2 py-3 border-b border-white/10">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                className="w-full p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10 flex items-center justify-center"
                aria-label="Expandir menu"
              >
                <PanelLeft size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Expandir menu
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
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

      {/* Bottom section - Settings and Admin */}
      <div className="p-4 border-t border-white/10 space-y-2">
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
