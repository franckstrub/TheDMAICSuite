// Simple statistics utilities for Lean Six Sigma calculations

/**
 * Safely parse numeric value from either string or number
 * @param value Value to parse
 * @param defaultValue Default value if parsing fails
 * @returns Parsed number or default value
 */
export function parseNumericValue(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Try to parse the string as a number
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? defaultValue : parsedValue;
  }
  
  return defaultValue;
}

/**
 * Calculate the mean (average) of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const avg = mean(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sortedValues.length / 2);
  
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  } else {
    return sortedValues[midpoint];
  }
}

/**
 * Calculate the range of an array of numbers
 */
export function range(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  return sortedValues[sortedValues.length - 1] - sortedValues[0];
}

/**
 * Calculate the mode (most frequent value) of an array of numbers
 */
export function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const counts = new Map<number, number>();
  
  values.forEach(value => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  
  let maxCount = 0;
  let modeValue: number | null = null;
  
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  });
  
  return modeValue;
}

/**
 * Calculate the Cpk (Process Capability Index) for a process
 * @param values Array of process measurements
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @returns The Cpk value or null if insufficient data
 */
export function calculateCpk(values: number[], lsl: number, usl: number): number | null {
  if (values.length < 30 || lsl >= usl) return null;
  
  const avg = mean(values);
  const sigma = standardDeviation(values);
  
  if (sigma === 0) return null;
  
  const cpkUpper = (usl - avg) / (3 * sigma);
  const cpkLower = (avg - lsl) / (3 * sigma);
  
  return Math.min(cpkUpper, cpkLower);
}

/**
 * Calculate the Cp (Process Capability) for a process
 * @param values Array of process measurements
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @returns The Cp value or null if insufficient data
 */
export function calculateCp(values: number[], lsl: number, usl: number): number | null {
  if (values.length < 30 || lsl >= usl) return null;
  
  const sigma = standardDeviation(values);
  
  if (sigma === 0) return null;
  
  return (usl - lsl) / (6 * sigma);
}

/**
 * Calculate the Defects Per Million Opportunities (DPMO)
 * @param defects Number of defects
 * @param opportunities Number of opportunities for defects
 * @returns The DPMO value
 */
export function calculateDPMO(defects: number, opportunities: number): number {
  if (opportunities === 0) return 0;
  return (defects / opportunities) * 1000000;
}

/**
 * Calculate the Sigma Level from DPMO
 * @param dpmo Defects Per Million Opportunities
 * @returns The Sigma Level (1-6)
 */
export function calculateSigmaLevel(dpmo: number): number {
  if (dpmo <= 0) return 6;
  
  // Simplified sigma level calculation for educational purposes
  if (dpmo <= 3.4) return 6;
  if (dpmo <= 233) return 5;
  if (dpmo <= 6210) return 4;
  if (dpmo <= 66807) return 3;
  if (dpmo <= 308537) return 2;
  return 1;
}

/**
 * Calculate the Pp (Process Performance) for a process
 * @param values Array of process measurements
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @returns The Pp value or null if insufficient data
 */
export function calculatePp(values: number[], lsl: number, usl: number): number | null {
  if (values.length < 30 || lsl >= usl) return null;
  
  const sigma = standardDeviation(values);
  
  if (sigma === 0) return null;
  
  return (usl - lsl) / (6 * sigma);
}

/**
 * Calculate the Ppk (Process Performance Index) for a process
 * @param values Array of process measurements
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @returns The Ppk value or null if insufficient data
 */
export function calculatePpk(values: number[], lsl: number, usl: number): number | null {
  if (values.length < 30 || lsl >= usl) return null;
  
  const avg = mean(values);
  const sigma = standardDeviation(values);
  
  if (sigma === 0) return null;
  
  const ppkUpper = (usl - avg) / (3 * sigma);
  const ppkLower = (avg - lsl) / (3 * sigma);
  
  return Math.min(ppkUpper, ppkLower);
}

/**
 * Calculate process yield (percentage within specification limits)
 * @param values Array of process measurements
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @returns Yield percentage (0-100)
 */
export function calculateYield(values: number[], lsl: number, usl: number): number {
  if (values.length === 0) return 0;
  
  const withinSpec = values.filter(value => value >= lsl && value <= usl).length;
  return (withinSpec / values.length) * 100;
}

/**
 * Calculate DPMO based on yield
 * @param yieldPercent Yield percentage (0-100)
 * @returns DPMO value
 */
export function calculateDPMOFromYield(yieldPercent: number): number {
  const defectRate = (100 - yieldPercent) / 100;
  return defectRate * 1000000;
}

/**
 * Calculate Z score with shift adjustment
 * @param yieldPercent Yield percentage (0-100)
 * @param shift Z-shift value (typically 1.5)
 * @returns Z score
 */
export function calculateZScore(yieldPercent: number, shift: number = 1.5): number {
  const defectRate = (100 - yieldPercent) / 100;
  
  if (defectRate <= 0) return 6 + shift;
  if (defectRate >= 1) return shift;
  
  // Using normal distribution inverse (simplified approximation)
  const z = Math.sqrt(2) * inverseErrorFunction(1 - 2 * defectRate);
  return Math.max(0, z + shift);
}

/**
 * Simplified inverse error function approximation
 * @param x Input value
 * @returns Inverse error function result
 */
function inverseErrorFunction(x: number): number {
  const a = 0.147;
  const firstPart = Math.log(1 - x * x);
  const secondPart = 2 / (Math.PI * a) + firstPart / 2;
  
  return Math.sign(x) * Math.sqrt(Math.sqrt(secondPart * secondPart - firstPart / a) - secondPart);
}

/**
 * Get frequency distribution for histogram data
 * @param values Array of values
 * @param bins Number of bins for the histogram
 * @returns Array of bin objects with x (center value) and y (frequency) properties
 */
export function getHistogramData(values: number[], bins = 10): { x: number, y: number }[] {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binWidth = range / bins;
  
  const histogramData = Array(bins).fill(0).map((_, i) => {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const binCenter = binStart + binWidth / 2;
    
    const frequency = values.filter(val => 
      val >= binStart && (i === bins - 1 ? val <= binEnd : val < binEnd)
    ).length;
    
    return { x: binCenter, y: frequency };
  });
  
  return histogramData;
}

/**
 * Calculate Pareto data (sorted frequencies and cumulative percentages)
 * @param categories Array of category labels
 * @param values Array of values corresponding to categories
 * @returns Object with sorted data and cumulative percentages
 */
export function getParetoData(categories: string[], values: number[]): {
  categories: string[],
  values: number[],
  cumulativePercentages: number[]
} {
  if (categories.length === 0 || values.length === 0 || categories.length !== values.length) {
    return { categories: [], values: [], cumulativePercentages: [] };
  }
  
  // Create pairs of categories and values
  const pairs = categories.map((category, i) => ({
    category,
    value: values[i]
  }));
  
  // Sort by value in descending order
  const sortedPairs = [...pairs].sort((a, b) => b.value - a.value);
  
  // Get sorted categories and values
  const sortedCategories = sortedPairs.map(pair => pair.category);
  const sortedValues = sortedPairs.map(pair => pair.value);
  
  // Calculate cumulative percentages
  const total = sortedValues.reduce((sum, val) => sum + val, 0);
  let cumSum = 0;
  const cumulativePercentages = sortedValues.map(val => {
    cumSum += val;
    return (cumSum / total) * 100;
  });
  
  return {
    categories: sortedCategories,
    values: sortedValues,
    cumulativePercentages
  };
}
