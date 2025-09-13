import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DiscountConfig {
  id: string;
  min_groups: number;
  max_groups?: number;
  discount_percentage: number;
  is_active: boolean;
}

interface DiscountResult {
  applicableDiscount: DiscountConfig | null;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  discountPercentage: number;
}

export const useDiscountCalculation = (procedureId: string, selectedGroupsCount: number, originalTotal: number) => {
  const [discountConfigs, setDiscountConfigs] = useState<DiscountConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (procedureId) {
      loadDiscountConfigs();
    }
  }, [procedureId]);

  const loadDiscountConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedure_discount_config')
        .select('*')
        .eq('procedure_id', procedureId)
        .eq('is_active', true)
        .order('discount_percentage', { ascending: false }); // Maior desconto primeiro

      if (error) throw error;

      setDiscountConfigs(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações de desconto:', error);
      setDiscountConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (): DiscountResult => {
    if (selectedGroupsCount === 0 || discountConfigs.length === 0) {
      return {
        applicableDiscount: null,
        originalTotal,
        discountAmount: 0,
        finalTotal: originalTotal,
        discountPercentage: 0,
      };
    }

    // Encontrar a configuração aplicável com maior desconto
    const applicableConfig = discountConfigs.find(config => {
      const meetsMin = selectedGroupsCount >= config.min_groups;
      const meetsMax = !config.max_groups || selectedGroupsCount <= config.max_groups;
      return meetsMin && meetsMax;
    });

    if (!applicableConfig) {
      return {
        applicableDiscount: null,
        originalTotal,
        discountAmount: 0,
        finalTotal: originalTotal,
        discountPercentage: 0,
      };
    }

    const discountAmount = (originalTotal * applicableConfig.discount_percentage) / 100;
    const finalTotal = Math.max(0, originalTotal - discountAmount);

    return {
      applicableDiscount: applicableConfig,
      originalTotal,
      discountAmount,
      finalTotal,
      discountPercentage: applicableConfig.discount_percentage,
    };
  };

  return {
    discountResult: calculateDiscount(),
    loading,
    refreshConfigs: loadDiscountConfigs,
  };
};