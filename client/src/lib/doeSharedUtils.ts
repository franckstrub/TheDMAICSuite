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
    lowValue: NaN,
    highValue: NaN,
    units: "",
  };
}

// Helper to get factor display name (shows default if name is empty)
export function getFactorDisplayName(factor: DOEFactor, index: number): string {
  if (factor.name && factor.name.trim() !== '') {
    return factor.name;
  }
  return `Factor ${String.fromCharCode(65 + index)}`; // A=65, B=66, C=67, etc.
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

/**
 * Calculate Variance Inflation Factor (VIF) for DOE terms
 * VIF_i = 1 / (1 - R²_i) where R²_i is from regressing term_i on all other terms
 */
export function calculateDOEVIF(X: number[][], termIndex: number): number {
  const n = X.length;
  const k = X[0].length - 1; // Exclude intercept
  
  if (k <= 1) {
    // Can't calculate VIF with only one term
    return 1;
  }
  
  // Extract the target term and other terms
  const y: number[] = [];
  const otherX: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    y.push(X[i][termIndex + 1]); // +1 to skip intercept column
    const row: number[] = [1]; // intercept
    for (let j = 1; j <= k; j++) {
      if (j !== termIndex + 1) {
        row.push(X[i][j]);
      }
    }
    otherX.push(row);
  }
  
  try {
    // Simple regression: regress y on otherX
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const otherXMeans = Array(k - 1).fill(0);
    for (let col = 0; col < k - 1; col++) {
      otherXMeans[col] = otherX.reduce((sum, row) => sum + row[col + 1], 0) / n;
    }
    
    // Calculate residuals from regressing y on others
    let ssTotal = 0;
    let ssResidual = 0;
    
    for (let i = 0; i < n; i++) {
      ssTotal += (y[i] - yMean) ** 2;
      // Simple estimate: predict y from first term
      const pred = yMean + (otherX[i][1] - otherXMeans[0]) * ((y[i] - yMean) / (otherX[i][1] - otherXMeans[0] || 1));
      ssResidual += (y[i] - pred) ** 2;
    }
    
    const rSquared = Math.max(0, 1 - (ssResidual / ssTotal || 0));
    
    if (rSquared >= 0.9999) {
      return 999.99;
    }
    
    const vif = 1 / Math.max(0.0001, 1 - rSquared);
    return Math.min(999.99, Math.max(1, vif));
  } catch (error) {
    return 999.99;
  }
}
