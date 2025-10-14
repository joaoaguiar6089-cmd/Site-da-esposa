import { useState } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useFormSnippets } from "@/hooks/forms/useFormSnippets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SnippetLibraryProps {
  onAddFields: (fields: any[]) => void;
}

export default function SnippetLibrary({ onAddFields }: SnippetLibraryProps) {
  const { snippets, groupedSnippets, isLoading, createSnippet, isCreating } = useFormSnippets();
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["personal_data", "contact"]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSnippet, setNewSnippet] = useState({
    name: "",
    description: "",
    category: "geral",
    icon: "FileText",
  });

  // Filtrar snippets
  const filteredSnippets = snippets.filter((snippet) =>
    snippet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle categoria
  const toggleCategory = (category: string) => {
    setOpenCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleCreateSnippet = async () => {
    if (!newSnippet.name.trim()) {
      return;
    }

    try {
      await createSnippet({
        name: newSnippet.name,
        description: newSnippet.description,
        category: newSnippet.category,
        icon: newSnippet.icon,
        fields: [], // Snippet comeÃ§a vazio, admin adiciona campos depois
      });

      // Reset form e fecha dialog
      setNewSnippet({
        name: "",
        description: "",
        category: "geral",
        icon: "FileText",
      });
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Erro ao criar snippet:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <h3 className="font-semibold mb-3">Biblioteca de Campos</h3>
        <Input
          placeholder="Buscar campos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Snippets List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Carregando...
            </p>
          ) : searchQuery ? (
            // Modo de busca
            filteredSnippets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum campo encontrado
              </p>
            ) : (
              filteredSnippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onAdd={() => onAddFields(snippet.fields)}
                />
              ))
            )
          ) : (
            // Modo de categorias
            Object.entries(groupedSnippets).map(([category, categorySnippets]) => (
              <Collapsible
                key={category}
                open={openCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between font-medium"
                  >
                    <span>{getCategoryLabel(category)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {categorySnippets.length}
                      </Badge>
                      {openCategories.includes(category) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 ml-2">
                  {categorySnippets.map((snippet) => (
                    <SnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      onAdd={() => onAddFields(snippet.fields)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-background">
        <Button 
          variant="outline" 
          className="w-full" 
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar Snippet
        </Button>
      </div>

      {/* Dialog de CriaÃ§Ã£o */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Snippet</DialogTitle>
            <DialogDescription>
              Crie um snippet customizado para reutilizar campos em multiplas fichas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Snippet *</Label>
              <Input
                id="name"
                placeholder="Ex: Anamnese Corporal"
                value={newSnippet.name}
                onChange={(e) => setNewSnippet({ ...newSnippet, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">DescriÃ§Ã£o</Label>
              <Textarea
                id="description"
                placeholder="Descreva o propÃ³sito deste snippet..."
                value={newSnippet.description}
                onChange={(e) => setNewSnippet({ ...newSnippet, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newSnippet.category}
                onChange={(e) => setNewSnippet({ ...newSnippet, category: e.target.value })}
              >
                <option value="geral">Geral</option>
                <option value="personal_data">Dados Pessoais</option>
                <option value="contact">Contato</option>
                <option value="address">EndereÃ§o</option>
                <option value="medical">MÃ©dico</option>
                <option value="aesthetic">EstÃ©tico</option>
                <option value="consent">Consentimento</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground">
              Dica: Após criar o snippet, abra uma ficha, passe o mouse sobre o campo desejado e clique no ícone de cópia para salvá-lo dentro do snippet.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSnippet}
              disabled={!newSnippet.name.trim() || isCreating}
            >
              {isCreating ? "Criando..." : "Criar Snippet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// SUB-COMPONENTE: Card de Snippet
// =====================================================

interface SnippetCardProps {
  snippet: any;
  onAdd: () => void;
}

function SnippetCard({ snippet, onAdd }: SnippetCardProps) {
  return (
    <div className="group relative bg-background border rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-1">{snippet.name}</p>
          {snippet.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {snippet.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {snippet.fields?.length || 0} campos
            </Badge>
            {snippet.is_system && (
              <Badge className="text-xs bg-blue-100 text-blue-800">
                Sistema
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAdd}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Helper: Label de categoria
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    personal_data: "Dados Pessoais",
    contact: "Contato",
    address: "EndereÃ§o",
    medical: "MÃ©dico",
    consent: "Consentimento",
    evaluation: "AvaliaÃ§Ã£o",
    other: "Outros",
  };
  return labels[category] || category;
}





