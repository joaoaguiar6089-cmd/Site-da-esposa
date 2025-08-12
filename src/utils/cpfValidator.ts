/**
 * CPF validation utilities with proper security checks
 */

/**
 * Remove all non-numeric characters from CPF
 */
export const cleanCPF = (cpf: string): string => {
  return cpf.replace(/[^\d]/g, '');
};

/**
 * Format CPF with dots and dash (XXX.XXX.XXX-XX)
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cleanCPF(cpf);
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Validate CPF format (11 digits)
 */
export const isValidCPFFormat = (cpf: string): boolean => {
  const cleaned = cleanCPF(cpf);
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
};

/**
 * Validate CPF using checksum algorithm
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cleanCPF(cpf);
  
  // Check format first
  if (!isValidCPFFormat(cleaned)) {
    return false;
  }
  
  // Check for known invalid sequences (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Calculate checksum
  let sum = 0;
  let weight = 10;
  
  // First digit verification
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight--;
  }
  
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  if (parseInt(cleaned[9]) !== firstDigit) {
    return false;
  }
  
  // Second digit verification
  sum = 0;
  weight = 11;
  
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight--;
  }
  
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  return parseInt(cleaned[10]) === secondDigit;
};

/**
 * Mask CPF for display (XXX.***.**X-XX)
 */
export const maskCPF = (cpf: string): string => {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  
  return `${cleaned.substring(0, 3)}.***.**${cleaned.substring(8, 9)}-${cleaned.substring(9)}`;
};