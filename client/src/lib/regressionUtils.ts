// Regression utilities for polynomial regression analysis

import { mean} from "jstat";
import jStat from "jstat";
import {performNormalityTest} from "./statisticsUtils";

export interface RegressionStatistics {
  r2Adjusted: number;
  dfRegression: number;
  dfError: number;
  msr: number;
  mse: number;
  regressionPValue: number;
  fStatistic: number;
  residualMean: number;
  residualStd: number;
  andersonDarlingStatistic: number;
  andersonDarlingPValue: number;
  andersonDarlingNormality: 'Normal' | 'Not Normal' | 'Inconclusive';
}

export interface RegressionResult {
  coefficients: number[];
  r2: number;
  equation: string;
  residuals: number[];
  sse: number;
  sst: number;
  statistics: RegressionStatistics;
}

export interface LinearRegressionResult extends RegressionResult {
  a: number;
  b: number;
  pearsonR: number;
}

export interface QuadraticRegressionResult extends RegressionResult {
  a: number;
  b: number;
  c: number;
}

export interface CubicRegressionResult extends RegressionResult {
  a: number;
  b: number;
  c: number;
  d: number;
}

function parseNumericValue(value: string | number): number {
  if (typeof value === "number") return value;
  const cleanedValue = value.replace(/,/g, ".");
  const numericValue = parseFloat(cleanedValue);
  return isNaN(numericValue) ? 0 : numericValue;
}

export function linearRegression(x: number[], y: number[]): LinearRegressionResult {
  if (x.length !== y.length || x.length < 2) {
    throw new Error("X and Y must have the same length and at least 2 points");
  }

  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  const yPred = x.map(xi => a + b * xi);
  const residuals = y.map((yi, i) => yi - yPred[i]);
  
  const yMean = sumY / n;
  const sst = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  let r2 = sst !== 0 ? 1 - (sse / sst) : (sse === 0 ? 1 : 0);
  
  // Clamp R² to [0, 1] interval and handle non-finite values
  if (!isFinite(r2)) {
    r2 = 0;
  }
  r2 = Math.max(0, Math.min(1, r2));

  // Calculate Pearson correlation coefficient
  const xMean = sumX / n;
  const numerator = sumXY - n * xMean * yMean;
  const denominator = Math.sqrt((sumX2 - n * xMean * xMean) * (sumY2 - n * yMean * yMean));
  let pearsonR = denominator !== 0 ? numerator / denominator : 0;
  
  // Clamp Pearson r to [-1, 1] interval and handle non-finite values
  if (!isFinite(pearsonR)) {
    pearsonR = 0;
  }
  pearsonR = Math.max(-1, Math.min(1, pearsonR));

  const equation = `Y = ${a.toFixed(4)} ${b >= 0 ? '+' : ''} ${b.toFixed(4)}X`;

  const statistics = calculateRegressionStatistics(x, y, residuals, sse, sst, r2, 2);

  return {
    a,
    b,
    coefficients: [a, b],
    r2,
    equation,
    residuals,
    sse,
    sst,
    pearsonR,
    statistics,
  };
}

export function quadraticRegression(x: number[], y: number[]): QuadraticRegressionResult {
  if (x.length !== y.length || x.length < 3) {
    throw new Error("X and Y must have the same length and at least 3 points");
  }

  const n = x.length;
  
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumX2 += xi * xi;
    sumX3 += xi * xi * xi;
    sumX4 += xi * xi * xi * xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2Y += xi * xi * yi;
  }

  const matrix = [
    [n, sumX, sumX2],
    [sumX, sumX2, sumX3],
    [sumX2, sumX3, sumX4]
  ];
  const vector = [sumY, sumXY, sumX2Y];

  const coeffs = solveLinearSystem(matrix, vector);
  const [a, b, c] = coeffs;

  const yPred = x.map(xi => a + b * xi + c * xi * xi);
  const residuals = y.map((yi, i) => yi - yPred[i]);
  
  const yMean = sumY / n;
  const sst = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  let r2 = sst !== 0 ? 1 - (sse / sst) : (sse === 0 ? 1 : 0);
  
  // Clamp R² to [0, 1] interval and handle non-finite values
  if (!isFinite(r2)) {
    r2 = 0;
  }
  r2 = Math.max(0, Math.min(1, r2));

  const equation = `Y = ${a.toFixed(4)} ${b >= 0 ? '+' : ''} ${b.toFixed(4)}X ${c >= 0 ? '+' : ''} ${c.toFixed(4)}X²`;

  const statistics = calculateRegressionStatistics(x, y, residuals, sse, sst, r2, 3);

  return {
    a,
    b,
    c,
    coefficients: [a, b, c],
    r2,
    equation,
    residuals,
    sse,
    sst,
    statistics,
  };
}

export function cubicRegression(x: number[], y: number[]): CubicRegressionResult {
  if (x.length !== y.length || x.length < 4) {
    throw new Error("X and Y must have the same length and at least 4 points");
  }

  const n = x.length;
  
  let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumX5 = 0, sumX6 = 0;
  let sumY = 0, sumXY = 0, sumX2Y = 0, sumX3Y = 0;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    sumX += xi;
    sumX2 += xi * xi;
    sumX3 += xi * xi * xi;
    sumX4 += xi * xi * xi * xi;
    sumX5 += xi * xi * xi * xi * xi;
    sumX6 += xi * xi * xi * xi * xi * xi;
    sumY += yi;
    sumXY += xi * yi;
    sumX2Y += xi * xi * yi;
    sumX3Y += xi * xi * xi * yi;
  }

  const matrix = [
    [n, sumX, sumX2, sumX3],
    [sumX, sumX2, sumX3, sumX4],
    [sumX2, sumX3, sumX4, sumX5],
    [sumX3, sumX4, sumX5, sumX6]
  ];
  const vector = [sumY, sumXY, sumX2Y, sumX3Y];

  const coeffs = solveLinearSystem(matrix, vector);
  const [a, b, c, d] = coeffs;

  const yPred = x.map(xi => a + b * xi + c * xi * xi + d * xi * xi * xi);
  const residuals = y.map((yi, i) => yi - yPred[i]);
  
  const yMean = sumY / n;
  const sst = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  let r2 = sst !== 0 ? 1 - (sse / sst) : (sse === 0 ? 1 : 0);
  
  // Clamp R² to [0, 1] interval and handle non-finite values
  if (!isFinite(r2)) {
    r2 = 0;
  }
  r2 = Math.max(0, Math.min(1, r2));

  const equation = `Y = ${a.toFixed(4)} ${b >= 0 ? '+' : ''} ${b.toFixed(4)}X ${c >= 0 ? '+' : ''} ${c.toFixed(4)}X² ${d >= 0 ? '+' : ''} ${d.toFixed(4)}X³`;

  const statistics = calculateRegressionStatistics(x, y, residuals, sse, sst, r2, 4);

  return {
    a,
    b,
    c,
    d,
    coefficients: [a, b, c, d],
    r2,
    equation,
    residuals,
    sse,
    sst,
    statistics,
  };
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}

export function solveLinearForX(a: number, b: number, targetY: number): number {
  if (Math.abs(b) < 1e-10) {
    throw new Error("Cannot solve: coefficient b is too close to zero");
  }
  return (targetY - a) / b;
}

export function solveQuadraticForX(a: number, b: number, c: number, targetY: number): number[] {
  const A = c;
  const B = b;
  const C = a - targetY;

  if (Math.abs(A) < 1e-10) {
    if (Math.abs(B) < 1e-10) {
      return [];
    }
    return [-C / B];
  }

  const discriminant = B * B - 4 * A * C;

  if (discriminant < 0) {
    return [];
  }

  if (Math.abs(discriminant) < 1e-10) {
    return [-B / (2 * A)];
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const x1 = (-B + sqrtDisc) / (2 * A);
  const x2 = (-B - sqrtDisc) / (2 * A);

  return [x1, x2].sort((a, b) => a - b);
}

export function solveCubicForX(a: number, b: number, c: number, d: number, targetY: number): number[] {
  const A = d;
  const B = c;
  const C = b;
  const D = a - targetY;

  if (Math.abs(A) < 1e-10) {
    return solveQuadraticForX(a, b, c, targetY);
  }

  const p = (3 * A * C - B * B) / (3 * A * A);
  const q = (2 * B * B * B - 9 * A * B * C + 27 * A * A * D) / (27 * A * A * A);

  const discriminant = Math.pow(q / 2, 2) + Math.pow(p / 3, 3);

  const roots: number[] = [];

  if (discriminant > 0) {
    const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
    const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
    const x = u + v - B / (3 * A);
    roots.push(x);
  } else if (Math.abs(discriminant) < 1e-10) {
    const u = Math.cbrt(-q / 2);
    roots.push(2 * u - B / (3 * A));
    roots.push(-u - B / (3 * A));
  } else {
    const r = Math.sqrt(-Math.pow(p / 3, 3));
    const phi = Math.acos(-q / (2 * r));
    const s = Math.cbrt(r);
    
    for (let k = 0; k < 3; k++) {
      const x = 2 * s * Math.cos((phi + 2 * Math.PI * k) / 3) - B / (3 * A);
      roots.push(x);
    }
  }

  return roots.sort((a, b) => a - b);
}

// Statistical helper functions
/**
 * Calculate regression statistics
 */
function calculateRegressionStatistics(
  x: number[],
  y: number[],
  residuals: number[],
  sse: number,
  sst: number,
  r2: number,
  numParams: number
): RegressionStatistics {
  const n = x.length;
  const dfError = n - numParams;
  
  // R² Adjusted - handle edge cases
  let r2Adjusted: number;
  if (dfError <= 0) {
    r2Adjusted = r2;
  } else {
    r2Adjusted = 1 - ((1 - r2) * (n - 1)) / dfError;
  }
  
  // Clamp R² Adjusted to [0, 1] interval and handle non-finite values
  if (!isFinite(r2Adjusted)) {
    r2Adjusted = 0;
  }
  r2Adjusted = Math.max(0, Math.min(1, r2Adjusted));
  
  // F-statistic and p-value for overall regression - handle edge cases
  let fStatistic: number;
  let regressionPValue: number;
  const dfRegression = numParams - 1;
  const ssr = sst - sse;
  let mse: number=0;
  let msr: number=0;
  
  if (dfError < 0) {
    fStatistic = 0;
    regressionPValue = 1;
    msr = dfRegression > 0 ? ssr / dfRegression : 0;
  } else if (sse === 0 || dfError === 0) {
    fStatistic = Infinity;
    regressionPValue = 0.0;
    msr = dfRegression > 0 ? ssr / dfRegression : 0;
  } else {
    mse = sse / dfError;
    msr = dfRegression > 0 ? ssr / dfRegression : 0;
    fStatistic = mse !== 0 ? msr / mse : 0;
    regressionPValue = 1 - jStat.centralF.cdf(fStatistic, dfRegression, dfError);
  }

  // Clamp regression p-value to [0, 1] interval and handle non-finite values
  if (!isFinite(regressionPValue)) {
    regressionPValue = 1;
  }
  regressionPValue = Math.max(0, Math.min(1, regressionPValue));
  
  // Residual statistics - assume sample and not population of residuals
  const residualMean = residuals.reduce((sum, r) => sum + r, 0) / n;
  const residualVariance = residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / n;
  const residualStd = Math.sqrt(residualVariance);
  
  // Anderson-Darling test for normality test of residuals
  const normalADTest = performNormalityTest(residuals,residualMean,residualStd);
  
  return {
    r2Adjusted,
    dfRegression,
    dfError,
    msr,
    mse,
    regressionPValue,
    fStatistic,
    residualMean,
    residualStd,
    andersonDarlingStatistic: normalADTest.adStatistic,
    andersonDarlingPValue: normalADTest.pValue,
    andersonDarlingNormality: normalADTest.isNormal ? 'Normal' : (normalADTest.isNormal === false ? 'Not Normal' : 'Inconclusive'),
  };
}
