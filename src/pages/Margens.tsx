import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MargensVendas } from "@/components/margens/MargensVendas";
import { MargensProdutos } from "@/components/margens/MargensProdutos";
import { MargensPedidos } from "@/components/margens/MargensPedidos";
import { MargensClientes } from "@/components/margens/MargensClientes";
import { MargensFilters, MargensFiltersState, initialFilters } from "@/components/margens/MargensFilters";

const Margens = () => {
  const [filters, setFilters] = useState<MargensFiltersState>(initialFilters);

  return (
    <DashboardLayout
      title="Margens & Lucro"
      subtitle="Análise de rentabilidade real"
    >
      <Tabs defaultValue="vendas" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-card border border-border rounded-xl p-1">
            <TabsTrigger 
              value="vendas" 
              className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
            >
              Por Venda
            </TabsTrigger>
            <TabsTrigger 
              value="produtos"
              className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
            >
              Por Produto
            </TabsTrigger>
            <TabsTrigger 
              value="pedidos"
              className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
            >
              Por Pedido
            </TabsTrigger>
            <TabsTrigger 
              value="clientes"
              className="rounded-lg data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
            >
              Por Cliente
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Advanced Filters */}
        <MargensFilters filters={filters} onFiltersChange={setFilters} />

        <TabsContent value="vendas">
          <MargensVendas filters={filters} />
        </TabsContent>

        <TabsContent value="produtos">
          <MargensProdutos filters={filters} />
        </TabsContent>

        <TabsContent value="pedidos">
          <MargensPedidos filters={filters} />
        </TabsContent>

        <TabsContent value="clientes">
          <MargensClientes filters={filters} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Margens;
