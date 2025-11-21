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
 * Calculate R² from regressing y on X using QR decomposition approach
 */
function calculateR2(X: number[][], y: number[]): number {
  const n = X.length;
  const p = X[0].length;
  
  // Calculate means
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const yDevs = y.map(val => val - yMean);
  const sst = yDevs.reduce((sum, d) => sum + d * d, 0);
  
  if (sst === 0) return 0;
  
  try {
    // Simple approach: Use normal equations X'X beta = X'y
    // X'X (p x p matrix)
    const XtX: number[][] = [];
    for (let i = 0; i < p; i++) {
      XtX[i] = [];
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][i] * X[k][j];
        }
        XtX[i][j] = sum;
      }
    }
    
    // X'y (p x 1 vector)
    const Xty: number[] = [];
    for (let i = 0; i < p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * y[k];
      }
      Xty[i] = sum;
    }
    
    // Solve using Gaussian elimination
    const beta = gaussianElimination(XtX, Xty);
    if (!beta) return 0;
    
    // Calculate fitted values and SSE
    let sse = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < p; j++) {
        pred += X[i][j] * beta[j];
      }
      sse += (y[i] - pred) ** 2;
    }
    
    const r2 = Math.max(0, 1 - sse / sst);
    return Math.min(1, r2);
  } catch {
    return 0;
  }
}

/**
 * Gaussian elimination to solve Ax = b
 */
function gaussianElimination(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  
  // Create augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    
    // Check for singular matrix
    if (Math.abs(aug[i][i]) < 1e-10) {
      return null;
    }
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  
  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }
  
  return x;
}

/**
 * Calculate Variance Inflation Factor (VIF) for DOE terms
 * VIF_i = 1 / (1 - R²_i) where R²_i is from regressing term_i on all other terms
 */
export function calculateDOEVIF(X: number[][], termIndex: number): number {
  const n = X.length;
  const k = X[0].length - 1; // Exclude intercept
  
  if (k <= 1) {
    return 1;
  }
  
  // Extract the target term values and other terms
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
    // Calculate R² from regressing y on otherX
    const rSquared = calculateR2(otherX, y);
    
    if (rSquared >= 0.9999) {
      return 999.99;
    }
    
    const vif = 1 / Math.max(0.0001, 1 - rSquared);
    return Math.min(999.99, Math.max(1, vif));
  } catch (error) {
    return 1;
  }
}
