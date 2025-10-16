import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Loader2,
  ChevronRight
} from "lucide-react";
import { useFormTemplates } from "@/hooks/forms/useFormTemplates";

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  onCancel?: () => void;
}

export function TemplateSelector({ onSelect, onCancel }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { templates = [], isLoading } = useFormTemplates();

  // Filtrar templates publicados e ativos
  const availableTemplates = templates.filter(
    (template) => template.is_published && template.is_active
  );

  // Filtrar por busca
  const filteredTemplates = availableTemplates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Agrupar por categoria
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'Sem Categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof templates>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (availableTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum template disponível
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure templates na seção de Documentos
          </p>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Voltar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, categoria..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de Templates */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum template encontrado com "{searchQuery}"
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-3">
              {/* Título da Categoria */}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {category}
              </h3>

              {/* Templates da Categoria */}
              <div className="grid gap-3">
                {categoryTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onSelect(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1 text-sm">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    {template.pdf_template_url && (
                      <CardContent className="pt-0">
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Com PDF
                        </Badge>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão Cancelar */}
      {onCancel && (
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
