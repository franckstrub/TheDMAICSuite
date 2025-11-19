// Shared utilities for DOE components (Full Factorial and Fractional Factorial)

import type { DOEFactor } from '@/lib/doeUtils';

// Transform generatedPlan for saving to database
export function transformGeneratedPlanForSaving(generatedPlan: any, factors: DOEFactor[]) {
  if (!generatedPlan || !generatedPlan.plan || !Array.isArray(generatedPlan.plan)) {
    return [];
  }
  
  return generatedPlan.plan.map((row: any) => ({
    standardOrder: row.standardOrder,
    runOrder: row.runOrder,
    factors: factors.map(f => row[f.name] as number),
  }));
}

// Reconstruct generatedPlan from persisted database format
export function reconstructGeneratedPlanFromPersisted(
  persistedPlan: any[],
  factors: DOEFactor[],
  designType: string
) {
  if (!persistedPlan || !Array.isArray(persistedPlan) || persistedPlan.length === 0) {
    return null;
  }
  
  const plan = persistedPlan.map((row: any) => {
    const planRow: any = {
      standardOrder: row.standardOrder,
      runOrder: row.runOrder,
    };
    
    // Map factor values back to factor names
    factors.forEach((factor, index) => {
      planRow[factor.name] = row.factors[index];
    });
    
    return planRow;
  });
  
  return {
    designType,
    plan,
  };
}

// Helper to get default factor based on index
export function getDefaultFactor(index: number): DOEFactor {
  return {
    name: `Factor ${String.fromCharCode(64 + index)}`,
    type: "continuous",
    lowValue: -1,
    highValue: 1,
    units: "",
  };
}

// Helper to convert UI string input to number, handling French decimal format
export function parseFactorValue(value: string): number {
  if (value.trim() === '') return NaN;
  const normalized = value.replace(',', '.');
  return parseFloat(normalized);
}

// Validate factor count
export function validateFactorCount(factors: DOEFactor[], minFactors: number = 2): boolean {
  return factors.length >= minFactors;
}

// Validate factor count for Fractional
export function validateFractionalFactorCount(factors: DOEFactor[], minFactors: number = 3): boolean {
  return factors.length >= minFactors;
}
