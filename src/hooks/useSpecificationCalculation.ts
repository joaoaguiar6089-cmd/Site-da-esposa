import { useState, useEffect } from 'react';

export interface ProcedureSpecification {
  id: string;
  name: string;
  description: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
}

export interface SelectedSpecification extends ProcedureSpecification {
  selected: boolean;
}

interface UseSpecificationCalculationProps {
  specifications: ProcedureSpecification[];
  initialSelections?: string[];
}

export const useSpecificationCalculation = ({ 
  specifications, 
  initialSelections = [] 
}: UseSpecificationCalculationProps) => {
  const [selectedSpecifications, setSelectedSpecifications] = useState<SelectedSpecification[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize selected specifications
  useEffect(() => {
    const specsWithSelection = specifications.map(spec => ({
      ...spec,
      selected: initialSelections.includes(spec.id)
    }));
    setSelectedSpecifications(specsWithSelection);
  }, [specifications, initialSelections]);

  // Calculate total price whenever selections change
  useEffect(() => {
    const total = selectedSpecifications
      .filter(spec => spec.selected)
      .reduce((sum, spec) => sum + spec.price, 0);
    setTotalPrice(total);
  }, [selectedSpecifications]);

  const toggleSpecification = (specificationId: string) => {
    setSelectedSpecifications(prev => 
      prev.map(spec => 
        spec.id === specificationId 
          ? { ...spec, selected: !spec.selected }
          : spec
      )
    );
  };

  const selectSpecification = (specificationId: string, selected: boolean) => {
    setSelectedSpecifications(prev => 
      prev.map(spec => 
        spec.id === specificationId 
          ? { ...spec, selected }
          : spec
      )
    );
  };

  const getSelectedSpecifications = () => {
    return selectedSpecifications.filter(spec => spec.selected);
  };

  const getSelectedSpecificationIds = () => {
    return selectedSpecifications
      .filter(spec => spec.selected)
      .map(spec => spec.id);
  };

  const clearAllSelections = () => {
    setSelectedSpecifications(prev => 
      prev.map(spec => ({ ...spec, selected: false }))
    );
  };

  return {
    selectedSpecifications,
    totalPrice,
    toggleSpecification,
    selectSpecification,
    getSelectedSpecifications,
    getSelectedSpecificationIds,
    clearAllSelections
  };
};