import { useState } from "react";
import { Plus, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingActionButtonProps {
  onNewSale: () => void;
  onNewPurchase: () => void;
}

export const FloatingActionButton = ({ onNewSale, onNewPurchase }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-6 right-4 z-50 md:hidden flex flex-col-reverse items-end gap-3">
        {/* Action options (shown when open) */}
        {isOpen && (
          <>
            <button
              onClick={() => {
                onNewSale();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-xl px-4 py-3 animate-fade-in-up"
              style={{ animationDelay: "0ms" }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <span className="font-semibold text-foreground pr-2">Nova Venda</span>
            </button>
            
            <button
              onClick={() => {
                onNewPurchase();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-xl px-4 py-3 animate-fade-in-up"
              style={{ animationDelay: "50ms" }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <span className="font-semibold text-foreground pr-2">Nova Compra</span>
            </button>
          </>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
            "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
            "active:scale-95",
            isOpen && "rotate-45"
          )}
          aria-label={isOpen ? "Fechar menu" : "Abrir menu de ações"}
          data-tour="fab-main"
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={28} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
};
