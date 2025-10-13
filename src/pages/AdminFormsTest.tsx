import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AdminFormsTest = () => {
  console.log('✅ AdminFormsTest component loaded!');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Admin
        </Button>
        
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">🎉 ROTA FUNCIONANDO!</h1>
          <p className="text-xl">A rota /admin/forms está carregando corretamente!</p>
          <div className="bg-green-100 border border-green-400 rounded p-4">
            <p className="text-green-800">
              ✅ Se você está vendo esta mensagem, a rota está configurada corretamente.
            </p>
            <p className="text-green-800 mt-2">
              O problema pode estar no componente FormTemplatesList.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFormsTest;
