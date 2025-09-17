import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCPF, cleanCPF, isValidCPF } from "@/utils/cpfValidator";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

const NewClientDialog = ({ open, onOpenChange, onClientCreated }: NewClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
    celular: "",
    data_nascimento: "",
    cidade: ""
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obrigatórios
    if (!formData.nome.trim() || !formData.sobrenome.trim() || !formData.celular.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios (Nome, Sobrenome e Celular).",
        variant: "destructive",
      });
      return;
    }

    // Validar CPF apenas se foi fornecido
    if (formData.cpf.trim() && !isValidCPF(formData.cpf)) {
      toast({
        title: "Erro",
        description: "CPF inválido. Deixe em branco se não quiser informar.",
        variant: "destructive",
      });
      return;
    }

    // Validar celular
    const cleanPhone = formData.celular.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: "Erro",
        description: "Número de celular inválido.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const clientData = {
        nome: formData.nome.trim(),
        sobrenome: formData.sobrenome.trim(),
        cpf: formData.cpf.trim() ? cleanCPF(formData.cpf) : `temp_${Date.now()}`,
        celular: formData.celular.trim(),
        data_nascimento: formData.data_nascimento.trim() ? formData.data_nascimento : null,
        cidade: formData.cidade.trim() || null,
      };

      const { error } = await supabase.from("clients").insert([clientData]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente cadastrado com sucesso!",
      });

      setFormData({ nome: "", sobrenome: "", cpf: "", celular: "", data_nascimento: "", cidade: "" });
      onClientCreated();
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      let errorMessage = "Erro ao cadastrar cliente.";
      
      if (error.code === '23505') {
        errorMessage = "Este CPF já está cadastrado no sistema.";
      } else if (error.code === '23514') {
        errorMessage = "Dados inválidos. Verifique o CPF e outros campos.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="sobrenome">Sobrenome *</Label>
              <Input
                id="sobrenome"
                value={formData.sobrenome}
                onChange={(e) => setFormData({...formData, sobrenome: e.target.value})}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <Label htmlFor="celular">Celular *</Label>
            <Input
              id="celular"
              value={formData.celular}
              onChange={(e) => setFormData({...formData, celular: e.target.value})}
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          <div>
            <Label htmlFor="data_nascimento">Data de Nascimento (opcional)</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="cidade">Cidade (opcional)</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({...formData, cidade: e.target.value})}
              placeholder="São Paulo"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewClientDialog;