import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CurrencyType } from "@/store/AppContext";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getProgressColor(progress: number): string {
  if (progress < 30) return 'bg-blue-500';
  if (progress < 70) return 'bg-yellow-500';
  return 'bg-primary';
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'at risk':
      return 'bg-yellow-100 text-yellow-800';
    case 'on track':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-purple-100 text-purple-800';
    case 'on hold':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getPhaseLabel(phase: string): string {
  switch (phase.toLowerCase()) {
    case 'define':
      return 'Define';
    case 'measure':
      return 'Measure';
    case 'analyze':
      return 'Analyze';
    case 'improve':
      return 'Improve';
    case 'control':
      return 'Control';
    default:
      return phase;
  }
}

export function calculateGap(importance: number, satisfaction: number): number {
  return importance - satisfaction;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats a number as a financial value with the given currency symbol
 * @param value The number to format
 * @param currency The currency symbol to use
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string, currency: CurrencyType): string {
  // Convert string to number if needed
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d.-]/g, '')) 
    : value;
  
  if (isNaN(numericValue)) {
    return `${currency}0`;
  }
  
  // Format based on currency
  switch (currency) {
    case '¥':
    case '₩':
      // Yen and Won typically don't use decimal places
      return `${currency}${Math.round(numericValue).toLocaleString()}`;
    case 'CHF':
      // Swiss Franc uses the abbreviation before the number
      return `${currency} ${numericValue.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    default:
      // Dollar, Euro, Pound
      return `${currency}${numericValue.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
  }
}
