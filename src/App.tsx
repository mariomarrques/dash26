import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Compras from "./pages/Compras";
import NovaCompra from "./pages/NovaCompra";
import CompraDetalhe from "./pages/CompraDetalhe";
import Vendas from "./pages/Vendas";
import Estoque from "./pages/Estoque";
import CustosFixos from "./pages/CustosFixos";
import Margens from "./pages/Margens";
import Configuracoes from "./pages/Configuracoes";
import AuditoriaEstoque from "./pages/AuditoriaEstoque";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PeriodProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/compras" 
              element={
                <ProtectedRoute>
                  <Compras />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/compras/nova" 
              element={
                <ProtectedRoute>
                  <NovaCompra />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/compras/:id" 
              element={
                <ProtectedRoute>
                  <CompraDetalhe />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/vendas" 
              element={
                <ProtectedRoute>
                  <Vendas />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/estoque" 
              element={
                <ProtectedRoute>
                  <Estoque />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/custos"
              element={
                <ProtectedRoute>
                  <CustosFixos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/margens" 
              element={
                <ProtectedRoute>
                  <Margens />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/configuracoes" 
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/auditoria" 
              element={
                <ProtectedRoute>
                  <AuditoriaEstoque />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </PeriodProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
