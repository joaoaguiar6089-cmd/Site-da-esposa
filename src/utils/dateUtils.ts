import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Fuso horário do Brasil (UTC-3)
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert a date string (YYYY-MM-DD) to Brazil timezone and format as DD/MM/YYYY
 */
export function formatDateToBrazil(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Create date from string treating it as local date (without timezone conversion)
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    
    // Simply reformat the string components to avoid timezone issues
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Convert a date to Brazil timezone
 */
export function toBrazilTimezone(date: Date): Date {
  return toZonedTime(date, BRAZIL_TIMEZONE);
}

/**
 * Convert a date from Brazil timezone to UTC
 */
export function fromBrazilTimezone(date: Date): Date {
  return fromZonedTime(date, BRAZIL_TIMEZONE);
}

/**
 * Format a date string to Brazilian format with timezone consideration
 */
export function formatDateTimeToBrazil(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    const brazilDate = toBrazilTimezone(date);
    return format(brazilDate, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return dateString;
  }
}

/**
 * Get current date in Brazil timezone formatted as YYYY-MM-DD
 */
export function getCurrentDateBrazil(): string {
  const now = new Date();
  const brazilDate = toBrazilTimezone(now);
  return format(brazilDate, 'yyyy-MM-dd');
}

/**
 * Get current datetime in Brazil timezone
 */
export function getCurrentDateTimeBrazil(): Date {
  return toBrazilTimezone(new Date());
}

/**
 * Ensure a date string is treated as Brazil date and formatted correctly
 */
export function ensureBrazilDateFormat(dateString: string): string {
  if (!dateString) return '';
  
  // If already in DD/MM/YYYY format, return as is
  if (dateString.includes('/')) {
    return dateString;
  }
  
  // If in YYYY-MM-DD format, convert to DD/MM/YYYY
  if (dateString.includes('-') && dateString.length === 10) {
    return formatDateToBrazil(dateString);
  }
  
  return dateString;
}