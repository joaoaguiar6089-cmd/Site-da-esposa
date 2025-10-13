import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  FormTemplate, 
  FormTemplateCreate, 
  FormTemplateUpdate,
  FormTemplateWithFields 
} from "@/types/forms";

// =====================================================
// QUERY KEYS
// =====================================================

export const formTemplatesKeys = {
  all: ['form-templates'] as const,
  lists: () => [...formTemplatesKeys.all, 'list'] as const,
  list: (filters: string) => [...formTemplatesKeys.lists(), filters] as const,
  details: () => [...formTemplatesKeys.all, 'detail'] as const,
  detail: (id: string) => [...formTemplatesKeys.details(), id] as const,
  withFields: (id: string) => [...formTemplatesKeys.detail(id), 'with-fields'] as const,
};

// =====================================================
// HOOK: useFormTemplates - Lista de Templates
// =====================================================

interface UseFormTemplatesOptions {
  includeInactive?: boolean;
  category?: string;
}

export function useFormTemplates(options: UseFormTemplatesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para listar templates
  const query = useQuery({
    queryKey: formTemplatesKeys.list(JSON.stringify(options)),
    queryFn: async () => {
      console.log('🔍 Buscando templates...', options);
      let query = supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtros opcionais
      if (!options.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar templates:', error);
        throw error;
      }
      
      console.log('✅ Templates encontrados:', data?.length || 0);
      return data as FormTemplate[];
    },
    staleTime: 30000, // Cache por 30 segundos
    retry: 1, // Tentar apenas 1 vez se falhar
  });

  // Mutation: Criar template
  const createMutation = useMutation({
    mutationFn: async (newTemplate: FormTemplateCreate) => {
      console.log('📝 Criando template:', newTemplate);
      const { data, error } = await supabase
        .from('form_templates')
        .insert(newTemplate)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar template:', error);
        throw error;
      }
      
      console.log('✅ Template criado:', data);
      return data as FormTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.lists() });
      toast({
        title: "Ficha criada!",
        description: `"${data.name}" foi criada com sucesso.`,
      });
    },
    onError: (error: any) => {
      console.error('❌ Erro na mutation:', error);
      toast({
        title: "Erro ao criar ficha",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Atualizar template
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FormTemplateUpdate }) => {
      const { data, error } = await supabase
        .from('form_templates')
        .update({
          ...updates,
          edit_count: supabase.sql`edit_count + 1`,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FormTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.detail(data.id) });
      toast({
        title: "Ficha atualizada!",
        description: `"${data.name}" foi atualizada com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar ficha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Deletar template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.lists() });
      toast({
        title: "Ficha deletada",
        description: "A ficha foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar ficha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Publicar/Despublicar template
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { data, error } = await supabase
        .from('form_templates')
        .update({ is_published: isPublished })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FormTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.detail(data.id) });
      toast({
        title: data.is_published ? "Ficha publicada!" : "Ficha despublicada",
        description: data.is_published 
          ? "A ficha agora está disponível para os clientes."
          : "A ficha foi removida da visualização dos clientes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Clonar template
  const cloneMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      // 1. Buscar template original
      const { data: original, error: fetchError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Buscar campos do template original
      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', id)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      // 3. Criar novo template
      const { data: newTemplate, error: createError } = await supabase
        .from('form_templates')
        .insert({
          name: newName,
          description: original.description,
          category: original.category,
          is_published: false, // Clone sempre começa como não publicado
          pdf_template_url: original.pdf_template_url,
          pdf_mapping: original.pdf_mapping,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 4. Clonar campos
      if (fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          template_id: newTemplate.id,
          field_key: field.field_key,
          label: field.label,
          description: field.description,
          placeholder: field.placeholder,
          help_text: field.help_text,
          field_type: field.field_type,
          is_required: field.is_required,
          validation_rules: field.validation_rules,
          options: field.options,
          auto_fill_source: field.auto_fill_source,
          auto_fill_mapping: field.auto_fill_mapping,
          conditional_logic: field.conditional_logic,
          order_index: field.order_index,
          column_span: field.column_span,
          pdf_field_name: field.pdf_field_name,
          pdf_coordinates: field.pdf_coordinates,
        }));

        const { error: insertFieldsError } = await supabase
          .from('form_fields')
          .insert(newFields);

        if (insertFieldsError) throw insertFieldsError;
      }

      return newTemplate as FormTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formTemplatesKeys.lists() });
      toast({
        title: "Ficha clonada!",
        description: `"${data.name}" foi criada como cópia.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao clonar ficha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Query state
    templates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: string, updates: FormTemplateUpdate) => 
      updateMutation.mutateAsync({ id, updates }),
    deleteTemplate: deleteMutation.mutateAsync,
    publishTemplate: (id: string) => 
      togglePublishMutation.mutateAsync({ id, isPublished: true }),
    unpublishTemplate: (id: string) => 
      togglePublishMutation.mutateAsync({ id, isPublished: false }),
    cloneTemplate: (id: string, newName: string) => 
      cloneMutation.mutateAsync({ id, newName }),
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCloning: cloneMutation.isPending,
    
    // Refetch
    refetch: query.refetch,
  };
}

// =====================================================
// HOOK: useFormTemplate - Template Individual
// =====================================================

export function useFormTemplate(id: string | null | undefined) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: formTemplatesKeys.detail(id || 'null'),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FormTemplate;
    },
    enabled: !!id,
  });

  return {
    template: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =====================================================
// HOOK: useFormTemplateWithFields - Template com Campos
// =====================================================

export function useFormTemplateWithFields(id: string | null | undefined) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: formTemplatesKeys.withFields(id || 'null'),
    queryFn: async () => {
      if (!id) return null;

      // Buscar template
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (templateError) throw templateError;

      // Buscar campos
      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', id)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      return {
        ...template,
        fields: fields || [],
      } as FormTemplateWithFields;
    },
    enabled: !!id,
  });

  return {
    template: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
