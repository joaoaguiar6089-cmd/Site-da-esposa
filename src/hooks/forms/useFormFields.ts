import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FormField, FormFieldCreate, FormFieldUpdate } from "@/types/forms";
import { formTemplatesKeys } from "./useFormTemplates";

// =====================================================
// QUERY KEYS
// =====================================================

export const formFieldsKeys = {
  all: ['form-fields'] as const,
  byTemplate: (templateId: string) => [...formFieldsKeys.all, 'template', templateId] as const,
  detail: (id: string) => [...formFieldsKeys.all, 'detail', id] as const,
};

// =====================================================
// HOOK: useFormFields - Campos de um Template
// =====================================================

export function useFormFields(templateId: string | null | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para listar campos
  const query = useQuery({
    queryKey: formFieldsKeys.byTemplate(templateId || 'null'),
    queryFn: async () => {
      if (!templateId) return [];

      // @ts-expect-error - form_fields table not yet in generated types
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      if (error) throw error;
      return data as FormField[];
    },
    enabled: !!templateId,
  });

  // Mutation: Criar campo
  const createMutation = useMutation({
    mutationFn: async (newField: FormFieldCreate) => {
      // @ts-expect-error - form_fields table not yet in generated types
      const { data, error } = await supabase
        .from('form_fields')
        .insert(newField)
        .select()
        .single();

      if (error) throw error;
      return data as FormField;
    },
    onSuccess: (data) => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: formFieldsKeys.byTemplate(templateId) });
        queryClient.invalidateQueries({ queryKey: formTemplatesKeys.withFields(templateId) });
      }
      toast({
        title: "Campo adicionado!",
        description: `"${data.label}" foi adicionado à ficha.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar campo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Atualizar campo
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FormFieldUpdate }) => {
      // @ts-expect-error - form_fields table not yet in generated types
      const { data, error } = await supabase
        .from('form_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FormField;
    },
    onSuccess: (data) => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: formFieldsKeys.byTemplate(templateId) });
        queryClient.invalidateQueries({ queryKey: formTemplatesKeys.withFields(templateId) });
      }
      toast({
        title: "Campo atualizado!",
        description: `"${data.label}" foi atualizado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar campo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Deletar campo
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - form_fields table not yet in generated types
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: formFieldsKeys.byTemplate(templateId) });
        queryClient.invalidateQueries({ queryKey: formTemplatesKeys.withFields(templateId) });
      }
      toast({
        title: "Campo removido",
        description: "O campo foi removido da ficha.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover campo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Reordenar campos
  const reorderMutation = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      if (!templateId) throw new Error("Template ID is required");

      // Atualizar order_index de todos os campos
      const updates = fieldIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      // Executar updates em paralelo
      const promises = updates.map(({ id, order_index }) =>
        // @ts-expect-error - form_fields table not yet in generated types
        supabase
          .from('form_fields')
          .update({ order_index })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: formFieldsKeys.byTemplate(templateId) });
        queryClient.invalidateQueries({ queryKey: formTemplatesKeys.withFields(templateId) });
      }
      toast({
        title: "Campos reordenados",
        description: "A ordem dos campos foi atualizada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reordenar campos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Duplicar campo
  const duplicateMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      // Buscar campo original
      // @ts-expect-error - form_fields table not yet in generated types
      const { data: original, error: fetchError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('id', fieldId)
        .single();

      if (fetchError) throw fetchError;

      // Criar cópia com field_key único
      const timestamp = Date.now();
      const newFieldKey = `${(original as any).field_key}_copy_${timestamp}`;

      // @ts-expect-error - form_fields table not yet in generated types
      const { data, error } = await supabase
        .from('form_fields')
        .insert({
          template_id: (original as any).template_id,
          field_key: newFieldKey,
          label: `${(original as any).label} (cópia)`,
          description: (original as any).description,
          placeholder: (original as any).placeholder,
          help_text: (original as any).help_text,
          field_type: (original as any).field_type,
          is_required: (original as any).is_required,
          validation_rules: (original as any).validation_rules,
          options: (original as any).options,
          auto_fill_source: (original as any).auto_fill_source,
          auto_fill_mapping: (original as any).auto_fill_mapping,
          conditional_logic: (original as any).conditional_logic,
          order_index: (original as any).order_index + 1,
          column_span: (original as any).column_span,
          pdf_field_name: (original as any).pdf_field_name,
          pdf_coordinates: (original as any).pdf_coordinates,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FormField;
    },
    onSuccess: (data) => {
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: formFieldsKeys.byTemplate(templateId) });
        queryClient.invalidateQueries({ queryKey: formTemplatesKeys.withFields(templateId) });
      }
      toast({
        title: "Campo duplicado!",
        description: `"${data.label}" foi criado como cópia.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar campo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    // Query state
    fields: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    createField: createMutation.mutateAsync,
    updateField: (id: string, updates: FormFieldUpdate) => 
      updateMutation.mutateAsync({ id, updates }),
    deleteField: deleteMutation.mutateAsync,
    reorderFields: reorderMutation.mutateAsync,
    duplicateField: duplicateMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    
    // Refetch
    refetch: query.refetch,
  };
}

// =====================================================
// HOOK: useFormField - Campo Individual
// =====================================================

export function useFormField(id: string | null | undefined) {
  const query = useQuery({
    queryKey: formFieldsKeys.detail(id || 'null'),
    queryFn: async () => {
      if (!id) return null;

      // @ts-expect-error - form_fields table not yet in generated types
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FormField;
    },
    enabled: !!id,
  });

  return {
    field: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
