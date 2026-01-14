import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  hidePeriodFilter?: boolean;
}

export const DashboardLayout = ({ 
  children, 
  title, 
  subtitle,
  hidePeriodFilter = false
}: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background-alt overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Ambient glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-80 pointer-events-none z-0 opacity-60">
          <div 
            className="w-full h-full"
            style={{ background: 'var(--gradient-glow)' }}
          />
        </div>
        
        <Header 
          title={title} 
          subtitle={subtitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          hidePeriodFilter={hidePeriodFilter}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

// Reposicionamento visual aplicado: identidade própria do Dash 26 estabelecida
