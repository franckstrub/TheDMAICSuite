// Regression utilities for polynomial regression analysis

export interface RegressionStatistics {
  r2Adjusted: number;
  regressionPValue: number;
  fStatistic: number;
  coefficientPValues: number[];
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

  const equation = `Y = ${a.toFixed(4)} + ${b.toFixed(4)}X`;

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

  const equation = `Y = ${a.toFixed(4)} + ${b.toFixed(4)}X + ${c.toFixed(4)}X²`;

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

  const equation = `Y = ${a.toFixed(4)} + ${b.toFixed(4)}X + ${c.toFixed(4)}X² + ${d.toFixed(4)}X³`;

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
 * Calculate t-distribution CDF (cumulative distribution function)
 * Using approximation for p-value calculation
 */
function tDistributionCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

/**
 * Incomplete beta function approximation
 */
function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Using continued fraction approximation
  const lbeta = logGamma(a + b) - logGamma(a) - logGamma(b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  
  const f = continuedFraction(a, b, x);
  return front * f;
}

function continuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200;
  const epsilon = 3e-7;
  
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    ser += coefficients[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * F-distribution CDF for p-value calculation
 */
function fDistributionCDF(f: number, df1: number, df2: number): number {
  const x = df2 / (df2 + df1 * f);
  return 1 - incompleteBeta(df2 / 2, df1 / 2, x);
}

/**
 * Anderson-Darling test for normality
 */
function andersonDarlingTest(data: number[]): {
  statistic: number;
  pValue: number;
  conclusion: 'Normal' | 'Not Normal' | 'Inconclusive';
} {
  const n = data.length;
  if (n < 3) {
    return { statistic: 0, pValue: 1, conclusion: 'Inconclusive' };
  }
  
  // Standardize data
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  if (std === 0) {
    return { statistic: 0, pValue: 1, conclusion: 'Inconclusive' };
  }
  
  const standardized = data.map(x => (x - mean) / std).sort((a, b) => a - b);
  
  // Calculate Anderson-Darling statistic
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const z = standardized[i];
    const phi = normalCDF(z);
    
    if (phi <= 0 || phi >= 1) continue;
    
    sum += (2 * (i + 1) - 1) * (Math.log(phi) + Math.log(1 - standardized[n - 1 - i] >= 0 ? normalCDF(standardized[n - 1 - i]) : 0));
  }
  
  let A2 = -n - sum / n;
  
  // Adjust for sample size
  A2 = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  
  // Approximate p-value using critical values
  let pValue = 0.5;
  let conclusion: 'Normal' | 'Not Normal' | 'Inconclusive' = 'Inconclusive';
  
  if (A2 < 0.201) {
    pValue = 0.25;
    conclusion = 'Normal';
  } else if (A2 < 0.240) {
    pValue = 0.15;
    conclusion = 'Normal';
  } else if (A2 < 0.283) {
    pValue = 0.10;
    conclusion = 'Normal';
  } else if (A2 < 0.346) {
    pValue = 0.05;
    conclusion = 'Inconclusive';
  } else if (A2 < 0.399) {
    pValue = 0.025;
    conclusion = 'Not Normal';
  } else {
    pValue = 0.01;
    conclusion = 'Not Normal';
  }
  
  return { statistic: A2, pValue, conclusion };
}

/**
 * Normal CDF (cumulative distribution function)
 */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  
  return x > 0 ? 1 - p : p;
}

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
  const df = n - numParams;
  
  // R² Adjusted - handle edge cases
  let r2Adjusted: number;
  if (df <= 0) {
    r2Adjusted = r2;
  } else {
    r2Adjusted = 1 - ((1 - r2) * (n - 1)) / df;
  }
  
  // Clamp R² Adjusted to [0, 1] interval and handle non-finite values
  if (!isFinite(r2Adjusted)) {
    r2Adjusted = 0;
  }
  r2Adjusted = Math.max(0, Math.min(1, r2Adjusted));
  
  // F-statistic and p-value for overall regression - handle edge cases
  let fStatistic: number;
  let regressionPValue: number;
  
  if (df <= 0 || sse === 0) {
    fStatistic = 0;
    regressionPValue = 1;
  } else {
    const mse = sse / df;
    const ssr = sst - sse;
    const dfRegression = numParams - 1;
    const msr = dfRegression > 0 ? ssr / dfRegression : 0;
    fStatistic = mse !== 0 ? msr / mse : 0;
    regressionPValue = 1 - fDistributionCDF(fStatistic, dfRegression, df);
  }
  
  // Clamp regression p-value to [0, 1] interval and handle non-finite values
  if (!isFinite(regressionPValue)) {
    regressionPValue = 1;
  }
  regressionPValue = Math.max(0, Math.min(1, regressionPValue));
  
  // Calculate coefficient p-values (this is a simplified approach)
  // For accurate p-values, we'd need the variance-covariance matrix
  const coefficientPValues = new Array(numParams).fill(0.05);
  
  // Residual statistics
  const residualMean = residuals.reduce((sum, r) => sum + r, 0) / n;
  const residualVariance = residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / n;
  const residualStd = Math.sqrt(residualVariance);
  
  // Anderson-Darling test for normality
  const adTest = andersonDarlingTest(residuals);
  
  return {
    r2Adjusted,
    regressionPValue,
    fStatistic,
    coefficientPValues,
    residualMean,
    residualStd,
    andersonDarlingStatistic: adTest.statistic,
    andersonDarlingPValue: adTest.pValue,
    andersonDarlingNormality: adTest.conclusion,
  };
}
