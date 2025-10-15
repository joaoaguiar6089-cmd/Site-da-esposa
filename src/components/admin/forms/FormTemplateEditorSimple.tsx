import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SimpleFieldEditor, { SimpleField } from "./SimpleFieldEditor";
import PDFUploadSimple from "./PDFUploadSimple";

export default function FormTemplateEditorSimple() {
  const { id: templateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<SimpleField[]>([]);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      setTemplate(templateData);
      setName(templateData.name || '');
      setDescription(templateData.description || '');
      setCategory(templateData.category || '');
      setPdfUrl(templateData.pdf_template_url || null);

      // Carregar campos
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      // Converter para formato simplificado
      const simpleFields: SimpleField[] = (fieldsData || []).map(f => {
        // Parse options se for array
        let parsedOptions: string[] | undefined;
        if (Array.isArray(f.options)) {
          parsedOptions = f.options.map((o: any) => o.label || o);
        }

        // Parse auto_fill_mapping se existir
        let parsedAutoFill: { source: string } | undefined;
        if (f.auto_fill_mapping && typeof f.auto_fill_mapping === 'object') {
          const mapping = f.auto_fill_mapping as any;
          if (mapping.source) {
            parsedAutoFill = { source: mapping.source };
          }
        }

        return {
          id: f.id,
          field_key: f.field_key,
          label: f.label,
          field_type: f.field_type as any,
          is_required: f.is_required,
          order_index: f.order_index,
          options: parsedOptions,
          auto_fill_mapping: parsedAutoFill,
        };
      });

      setFields(simpleFields);
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar o template.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a ficha.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let currentTemplateId = templateId;

      // Salvar template
      if (templateId) {
        // Atualizar existente
        const { error } = await supabase
          .from('form_templates')
          .update({
            name,
            description,
            category,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId);

        if (error) throw error;
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('form_templates')
          .insert({
            name,
            description,
            category,
            version: 1,
            is_active: true,
            is_published: false,
          })
          .select()
          .single();

        if (error) throw error;
        currentTemplateId = data.id;
      }

      // Deletar campos antigos
      if (templateId) {
        await supabase
          .from('form_fields')
          .delete()
          .eq('template_id', templateId);
      }

      // Inserir campos novos
      if (fields.length > 0 && currentTemplateId) {
        const fieldsToInsert = fields.map((f, idx) => ({
          template_id: currentTemplateId,
          field_key: f.field_key,
          field_type: f.field_type,
          label: f.label,
          is_required: f.is_required,
          order_index: idx,
          options: f.options ? f.options.map(o => ({ value: o, label: o })) : null,
          auto_fill_mapping: f.auto_fill_mapping || null,
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Sucesso",
        description: "Ficha salva com sucesso!",
      });

      if (!templateId && currentTemplateId) {
        navigate(`/admin/forms/edit/${currentTemplateId}`);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a ficha.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/forms')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {templateId ? 'Editar Ficha' : 'Nova Ficha'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure os campos e o template PDF
            </p>
          </div>
          <div className="flex items-center gap-2">
            {template?.is_published && (
              <Badge className="bg-green-100 text-green-800">Publicada</Badge>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da Ficha *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ficha de Anamnese"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito desta ficha..."
              rows={3}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Laser, Estética Facial, etc"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Campos e PDF */}
      <Tabs defaultValue="fields" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fields">
            <FileText className="mr-2 h-4 w-4" />
            Campos do Formulário
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <Upload className="mr-2 h-4 w-4" />
            Template PDF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <SimpleFieldEditor
            fields={fields}
            onFieldsChange={setFields}
          />
        </TabsContent>

        <TabsContent value="pdf">
          {templateId ? (
            <PDFUploadSimple
              templateId={templateId}
              currentPdfUrl={pdfUrl}
              onPdfUploaded={(url) => {
                setPdfUrl(url);
                setTemplate({ ...template, pdf_template_url: url });
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Salve a ficha primeiro para poder fazer upload do PDF
                </p>
                <Button onClick={handleSave} disabled={!name.trim()}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Ficha
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
