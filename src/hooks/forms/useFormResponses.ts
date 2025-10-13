// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FormResponse, FormResponseStatus } from "@/types/forms";

// =====================================================
// QUERY KEYS
// =====================================================

export const formResponsesKeys = {
  all: ['formResponses'] as const,
  lists: () => [...formResponsesKeys.all, 'list'] as const,
  list: (filters: string) => [...formResponsesKeys.lists(), filters] as const,
  details: () => [...formResponsesKeys.all, 'detail'] as const,
  detail: (id: string) => [...formResponsesKeys.details(), id] as const,
};

// =====================================================
// TYPES
// =====================================================

export interface FormResponseCreate {
  template_id: string;
  client_id?: string;
  response_data: Record<string, any>;
  status?: FormResponseStatus;
  filled_by?: string;
}

export interface FormResponseUpdate {
  response_data?: Record<string, any>;
  status?: FormResponseStatus;
  submitted_at?: string;
}

export interface UseFormResponsesOptions {
  clientId?: string;
  templateId?: string;
  status?: FormResponseStatus;
}

// =====================================================
// HOOK: useFormResponses
// =====================================================

export function useFormResponses(options: UseFormResponsesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Listar responses
  const queryKey = formResponsesKeys.list(JSON.stringify(options));
  
  const { data: responses = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('form_responses')
        .select(`
          *,
          form_templates (
            id,
            name,
            description,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }

      if (options.templateId) {
        query = query.eq('template_id', options.templateId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
  });

  // Mutation: Criar response
  const createResponse = useMutation({
    mutationFn: async (newResponse: FormResponseCreate) => {
      const { data, error } = await supabase
        .from('form_responses')
        .insert({
          ...newResponse,
          status: newResponse.status || 'draft',
          response_data: newResponse.response_data as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });
      toast({
        title: "Rascunho criado",
        description: "Você pode continuar preenchendo mais tarde.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar rascunho",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Atualizar response
  const updateResponse = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FormResponseUpdate }) => {
      const { data, error } = await supabase
        .from('form_responses')
        .update({
          ...updates,
          response_data: updates.response_data as any,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Submeter response
  const submitResponse = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('form_responses')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });
      toast({
        title: "Ficha enviada!",
        description: "Sua ficha foi enviada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Deletar response
  const deleteResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formResponsesKeys.lists() });
      toast({
        title: "Ficha deletada",
        description: "A ficha foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    responses,
    isLoading,
    error,
    createResponse: createResponse.mutateAsync,
    updateResponse: updateResponse.mutateAsync,
    submitResponse: submitResponse.mutateAsync,
    deleteResponse: deleteResponse.mutateAsync,
    isCreating: createResponse.isPending,
    isUpdating: updateResponse.isPending,
    isSubmitting: submitResponse.isPending,
    isDeleting: deleteResponse.isPending,
  };
}

// =====================================================
// HOOK: useFormResponse (single)
// =====================================================

export function useFormResponse(id: string | undefined) {
  const { toast } = useToast();

  const { data: response, isLoading, error } = useQuery({
    queryKey: formResponsesKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('form_responses')
        .select(`
          *,
          form_templates (
            id,
            name,
            description,
            category,
            form_fields (
              *
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return {
    response,
    isLoading,
    error,
  };
}
