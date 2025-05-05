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
    case 'completed':
      return 'bg-purple-100 text-purple-800';
    case 'on hold':
      return 'bg-gray-100 text-gray-800';
    case 'abandoned':
      return 'bg-red-100 text-red-800';
    case 'deleted':
      return 'bg-gray-300 text-gray-900 line-through';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getProjectTypeColor(type: string): string {
  if (!type) return 'bg-gray-100 text-gray-800';
  
  const typeLower = type.toLowerCase();
  if (typeLower.includes('white belt')) return 'bg-white text-gray-600 border border-gray-800';
  if (typeLower.includes('yellow belt')) return 'bg-yellow-100 text-yellow-800';
  if (typeLower.includes('green belt')) return 'bg-green-100 text-green-800';
  if (typeLower.includes('black belt')) return 'bg-black bg-opacity-80 text-white';
  if (typeLower.includes('master black belt')) return 'bg-purple-900 text-white';
  if (typeLower.includes('champion')) return 'bg-blue-700 text-white';
  
  return 'bg-blue-100 text-blue-800'; // Default for other types
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
  
  // Format all currencies without decimal places
  switch (currency) {
    case 'CHF':
      // Swiss Franc uses the abbreviation before the number
      return `${currency} ${Math.round(numericValue).toLocaleString()}`;
    default:
      // All other currencies including Dollar, Euro, Pound, Yen, Won
      return `${currency}${Math.round(numericValue).toLocaleString()}`;
  }
}

/**
 * Formats a breakeven time period in years to a readable format with years and months
 * @param years The number of years (can be decimal, e.g. 1.5 years)
 * @returns Formatted string, e.g. "1 year, 6 months" or "6 months"
 */
export function formatBreakeven(years: number): string {
  if (years === 0) return "Immediate";
  if (years < 0) return "N/A"; // Negative value indicates no breakeven
  
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  
  if (wholeYears === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (months === 0) {
    return `${wholeYears} year${wholeYears !== 1 ? 's' : ''}`;
  } else {
    return `${wholeYears} year${wholeYears !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
  }
}

/**
 * Calculates the timeline progress percentage based on start and target dates
 * @param startDate The project start date
 * @param targetEndDate The project target end date
 * @returns A number between 0-100 representing the timeline progress
 */
export function calculateTimelineProgress(startDate: string | Date | null, targetEndDate: string | Date | null): number {
  if (!startDate || !targetEndDate) return 0;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof targetEndDate === 'string' ? new Date(targetEndDate) : targetEndDate;
  const now = new Date();
  
  // If the project hasn't started yet
  if (now < start) return 0;
  
  // If the project is already past the target date
  if (now > end) return 100;
  
  // Calculate percentage between start and end dates
  const totalDuration = end.getTime() - start.getTime();
  const elapsedDuration = now.getTime() - start.getTime();
  
  return Math.round((elapsedDuration / totalDuration) * 100);
}

/**
 * Returns a color class for the timeline progress bar
 * @param progress The timeline progress percentage (0-100)
 * @returns A Tailwind CSS color class
 */
export function getTimelineColor(progress: number): string {
  if (progress < 30) return 'bg-green-500';  // Early in timeline - green
  if (progress < 70) return 'bg-blue-500';   // Middle of timeline - blue
  if (progress < 90) return 'bg-yellow-500'; // Nearing completion - yellow
  return 'bg-red-500';                       // At or past deadline - red
}

/**
 * Calculate milestone progress between two dates
 * @param startDate Start date for milestone
 * @param endDate End date for milestone
 * @returns Progress percentage (0-100)
 */
export function calculateMilestoneProgress(startDate: string | Date | null, endDate: string | Date | null): number {
  if (!startDate || !endDate) return 0;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  
  // If the milestone hasn't started yet
  if (now < start) return 0;
  
  // If the milestone is already past the end date
  if (now > end) return 100;
  
  // Calculate percentage between start and end dates
  const totalDuration = end.getTime() - start.getTime();
  const elapsedDuration = now.getTime() - start.getTime();
  
  return Math.round((elapsedDuration / totalDuration) * 100);
}

/**
 * Format date for display in milestone timelines
 * @param dateString Date string
 * @returns Formatted date string (e.g. "May 15, 2025")
 */
export function formatMilestoneDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  });
}
