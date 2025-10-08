import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryTransactions } from "./inventory/InventoryTransactions";
import { InventoryStock } from "./inventory/InventoryStock";
import { Package } from "lucide-react";

export const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState("transactions");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie entradas, saídas e visualize o estoque atual
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="transactions">Extrato</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <InventoryTransactions />
        </TabsContent>

        <TabsContent value="stock">
          <InventoryStock />
        </TabsContent>
      </Tabs>
    </div>
  );
};
