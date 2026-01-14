import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Settings,
  Receipt,
  PieChart,
  X
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  onNavigate: () => void;
}

const NavItem = ({ icon, label, to, onNavigate }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to || 
    (to !== "/" && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={cn(
        "group relative w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200",
        "text-sidebar-foreground hover:text-sidebar-accent-foreground",
        isActive 
          ? "bg-gradient-primary text-white font-semibold" 
          : "hover:bg-sidebar-accent"
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
      <span className="text-[15px] font-medium">{label}</span>
    </NavLink>
  );
};

const navItems = [
  { id: "dashboard", to: "/", icon: <LayoutDashboard size={22} />, label: "Dashboard" },
  { id: "vendas", to: "/vendas", icon: <TrendingUp size={22} />, label: "Vendas" },
  { id: "compras", to: "/compras", icon: <ShoppingCart size={22} />, label: "Compras" },
  { id: "estoque", to: "/estoque", icon: <Package size={22} />, label: "Estoque" },
  { id: "custos", to: "/custos", icon: <Receipt size={22} />, label: "Custos Fixos" },
  { id: "margens", to: "/margens", icon: <PieChart size={22} />, label: "Margens" },
];

export const MobileDrawer = ({ isOpen, onClose }: MobileDrawerProps) => {
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside 
        className={cn(
          "fixed top-0 left-0 h-full w-[80%] max-w-[320px] z-50 flex flex-col transition-transform duration-300 ease-out md:hidden",
          "bg-sidebar border-r border-sidebar-border",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between border-b border-sidebar-border px-4">
          <NavLink to="/" onClick={onClose} className="flex items-center">
            <Logo size="md" variant="full" forceDarkText />
          </NavLink>
          
          <button
            onClick={onClose}
            className="p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-sidebar-accent"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              to={item.to}
              onNavigate={onClose}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-sidebar-border">
          <NavItem
            icon={<Settings size={22} />}
            label="Configurações"
            to="/configuracoes"
            onNavigate={onClose}
          />
        </div>
      </aside>
    </>
  );
};

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
