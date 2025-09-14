import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
}

interface SpecificationResult {
  specifications: ProcedureSpecification[];
  totalPrice: number;
  selectedSpecifications: ProcedureSpecification[];
}

export const useSpecificationCalculation = (procedureId: string) => {
  const [specifications, setSpecifications] = useState<ProcedureSpecification[]>([]);
  const [selectedSpecificationIds, setSelectedSpecificationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpecifications = async () => {
    if (!procedureId) {
      setSpecifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('procedure_specifications')
        .select('*')
        .eq('procedure_id', procedureId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSpecifications(data || []);
    } catch (error) {
      console.error('Erro ao carregar especificações:', error);
      setSpecifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecifications();
  }, [procedureId]);

  const calculateSpecificationResult = (): SpecificationResult => {
    const selectedSpecifications = specifications.filter(spec => 
      selectedSpecificationIds.includes(spec.id)
    );
    
    const totalPrice = selectedSpecifications.reduce((sum, spec) => sum + spec.price, 0);

    return {
      specifications,
      totalPrice,
      selectedSpecifications
    };
  };

  const toggleSpecification = (specificationId: string) => {
    setSelectedSpecificationIds(prev => {
      if (prev.includes(specificationId)) {
        return prev.filter(id => id !== specificationId);
      } else {
        return [...prev, specificationId];
      }
    });
  };

  const clearSelections = () => {
    setSelectedSpecificationIds([]);
  };

  return {
    specificationResult: calculateSpecificationResult(),
    loading,
    toggleSpecification,
    clearSelections,
    selectedSpecificationIds,
    refreshSpecifications: loadSpecifications
  };
};