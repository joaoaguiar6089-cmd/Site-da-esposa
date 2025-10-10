import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table2, Target } from "lucide-react";
import ProcedurePricingTable from "./ProcedurePricingTable";
import GoalsManagement from "./GoalsManagement";

const ValuesAndGoals = () => {
  const [activeTab, setActiveTab] = useState("pricing");

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Valores e Metas</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tabela de Preços
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing" className="mt-6">
          <ProcedurePricingTable />
        </TabsContent>
        
        <TabsContent value="goals" className="mt-6">
          <GoalsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ValuesAndGoals;
