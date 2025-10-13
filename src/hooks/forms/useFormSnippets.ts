// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FormSnippet, FormSnippetCreate } from "@/types/forms";

// =====================================================
// QUERY KEYS
// =====================================================

export const formSnippetsKeys = {
  all: ['form-snippets'] as const,
  lists: () => [...formSnippetsKeys.all, 'list'] as const,
  list: (filters: string) => [...formSnippetsKeys.lists(), filters] as const,
  detail: (id: string) => [...formSnippetsKeys.all, 'detail', id] as const,
};

// =====================================================
// HOOK: useFormSnippets - Biblioteca de Snippets
// =====================================================

interface UseFormSnippetsOptions {
  category?: string;
  includeInactive?: boolean;
}

export function useFormSnippets(options: UseFormSnippetsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para listar snippets
  const query = useQuery({
    queryKey: formSnippetsKeys.list(JSON.stringify(options)),
    queryFn: async () => {
      // @ts-expect-error - form_snippets table not yet in generated types
      let query = supabase
        .from('form_snippets')
        .select('*')
        .order('category')
        .order('name');

      // Filtros opcionais
      if (!options.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FormSnippet[];
    },
  });

  // Mutation: Criar snippet
  const createMutation = useMutation({
    mutationFn: async (newSnippet: FormSnippetCreate) => {
      // @ts-expect-error - form_snippets table not yet in generated types
      const { data, error } = await supabase
        .from('form_snippets')
        .insert(newSnippet)
        .select()
        .single();

      if (error) throw error;
      return data as FormSnippet;
    },
    onSuccess: (data) => {
      // Invalidar TODAS as queries de snippets (com e sem filtros)
      queryClient.invalidateQueries({ queryKey: formSnippetsKeys.all });
      toast({
        title: "Snippet criado!",
        description: `"${data.name}" foi adicionado à biblioteca.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Atualizar snippet
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FormSnippetCreate> }) => {
      // @ts-expect-error - form_snippets table not yet in generated types
      const { data, error } = await supabase
        .from('form_snippets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FormSnippet;
    },
    onSuccess: (data) => {
      // Invalidar TODAS as queries de snippets
      queryClient.invalidateQueries({ queryKey: formSnippetsKeys.all });
      toast({
        title: "Snippet atualizado!",
        description: `"${data.name}" foi atualizado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Deletar snippet
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se é snippet do sistema
      // @ts-expect-error - form_snippets table not yet in generated types
      const { data: snippet } = await supabase
        .from('form_snippets')
        .select('is_system')
        .eq('id', id)
        .single();

      if ((snippet as any)?.is_system) {
        throw new Error("Snippets do sistema não podem ser deletados");
      }

      // @ts-expect-error - form_snippets table not yet in generated types
      const { error } = await supabase
        .from('form_snippets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar TODAS as queries de snippets
      queryClient.invalidateQueries({ queryKey: formSnippetsKeys.all });
      toast({
        title: "Snippet removido",
        description: "O snippet foi removido da biblioteca.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Incrementar contador de uso
  const incrementUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      // @ts-expect-error - form_snippets table not yet in generated types
      const { error } = await supabase
        .from('form_snippets')
        .update({ 
          usage_count: supabase.sql`usage_count + 1` 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_) => {
      // Invalidar queries silenciosamente (não mostrar toast)
      queryClient.invalidateQueries({ queryKey: formSnippetsKeys.all });
    },
  });

  // Mutation: Duplicar snippet
  const duplicateMutation = useMutation({
    mutationFn: async (snippetId: string) => {
      // Buscar snippet original
      // @ts-expect-error - form_snippets table not yet in generated types
      const { data: original, error: fetchError } = await supabase
        .from('form_snippets')
        .select('*')
        .eq('id', snippetId)
        .single();

      if (fetchError) throw fetchError;

      // Criar cópia
      // @ts-expect-error - form_snippets table not yet in generated types
      const { data, error } = await supabase
        .from('form_snippets')
        .insert({
          name: `${(original as any).name} (cópia)`,
          description: (original as any).description,
          category: (original as any).category,
          icon: (original as any).icon,
          fields: (original as any).fields,
          is_system: false, // Cópia nunca é do sistema
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FormSnippet;
    },
    onSuccess: (data) => {
      // Invalidar TODAS as queries de snippets
      queryClient.invalidateQueries({ queryKey: formSnippetsKeys.all });
      toast({
        title: "Snippet duplicado!",
        description: `"${data.name}" foi criado como cópia.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper: Agrupar snippets por categoria
  const groupedSnippets = React.useMemo(() => {
    if (!query.data) return {};

    return query.data.reduce((acc, snippet) => {
      const category = snippet.category || 'outros';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(snippet);
      return acc;
    }, {} as Record<string, FormSnippet[]>);
  }, [query.data]);

  return {
    // Query state
    snippets: query.data ?? [],
    groupedSnippets,
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    createSnippet: createMutation.mutateAsync,
    updateSnippet: (id: string, updates: Partial<FormSnippetCreate>) => 
      updateMutation.mutateAsync({ id, updates }),
    deleteSnippet: deleteMutation.mutateAsync,
    duplicateSnippet: duplicateMutation.mutateAsync,
    incrementUsage: incrementUsageMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    
    // Refetch
    refetch: query.refetch,
  };
}

// =====================================================
// HOOK: useFormSnippet - Snippet Individual
// =====================================================

export function useFormSnippet(id: string | null | undefined) {
  const query = useQuery({
    queryKey: formSnippetsKeys.detail(id || 'null'),
    queryFn: async () => {
      if (!id) return null;

      // @ts-expect-error - form_snippets table not yet in generated types
      const { data, error } = await supabase
        .from('form_snippets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FormSnippet;
    },
    enabled: !!id,
  });

  return {
    snippet: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =====================================================
// HELPER: Categorias de Snippets
// =====================================================

export const SNIPPET_CATEGORIES = [
  { value: 'identificacao', label: 'Identificação', icon: 'user' },
  { value: 'contato', label: 'Contato', icon: 'phone' },
  { value: 'localizacao', label: 'Localização', icon: 'map-pin' },
  { value: 'saude', label: 'Saúde', icon: 'heart' },
  { value: 'avaliacao', label: 'Avaliação', icon: 'clipboard-check' },
  { value: 'consentimento', label: 'Consentimento', icon: 'file-text' },
  { value: 'outros', label: 'Outros', icon: 'folder' },
] as const;

// Importar React para useMemo
import React from "react";
