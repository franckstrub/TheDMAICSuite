import jStat from 'jstat';
import { performNormalityTest } from './statisticsUtils';

export interface CoefficientRow {
  term: string;
  estimate: number;
  stdError: number;
  tValue: number;
  pValue: number;
  vif: number | null; // null for intercept
}

export interface AnovaRow {
  source: string;
  df: number;
  ss: number;
  ms: number;
  fValue: number | null;
  pValue: number | null;
}

export interface MultipleRegressionResult {
  // Coefficients with VIF
  coefficients: CoefficientRow[];
  
  // ANOVA table
  anovaTable: AnovaRow[];
  
  // Overall model statistics
  rSquared: number;
  rSquaredAdjusted: number;
  
  // Residual statistics
  residuals: number[];
  fittedValues: number[];
  residualMean: number;
  residualStd: number;
  andersonDarlingStatistic: number;
  andersonDarlingPValue: number;
  andersonDarlingNormality: 'Normal' | 'Not Normal' | 'Inconclusive';
  
  // Sample size
  n: number;
  
  // Number of predictors
  k: number;
}

/**
 * Calculate Variance Inflation Factor for predictor i
 * VIF_i = 1 / (1 - R²_i) where R²_i is from regressing X_i on all other X variables
 */
function calculateVIF(X: number[][], predictorIndex: number): number {
  const n = X.length;
  const k = X[0].length - 1; // Exclude intercept
  
  if (k <= 1) {
    // Can't calculate VIF with only one predictor
    return 1;
  }
  
  // Extract the target predictor and other predictors
  const y: number[] = [];
  const otherX: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    y.push(X[i][predictorIndex + 1]); // +1 to skip intercept column
    const row: number[] = [1]; // intercept
    for (let j = 1; j <= k; j++) {
      if (j !== predictorIndex + 1) {
        row.push(X[i][j]);
      }
    }
    otherX.push(row);
  }
  
  try {
    // Regress X_i on all other X variables
    const { rSquared } = multipleRegressionCore(otherX, y, false);
    
    if (rSquared >= 0.9999) {
      // Near-perfect multicollinearity
      return 999.99;
    }
    
    const vif = 1 / (1 - rSquared);
    return Math.max(1, vif); // VIF should be at least 1
  } catch (error) {
    // If regression fails, return high VIF to indicate problem
    return 999.99;
  }
}

/**
 * Core multiple regression calculation using matrix operations
 * Returns coefficients, R², and other statistics
 */
function multipleRegressionCore(
  X: number[][], // Design matrix (n x p) including intercept column
  y: number[],   // Response vector (n x 1)
  calculateIndividualSS: boolean = true
): {
  coefficients: number[];
  rSquared: number;
  rSquaredAdjusted: number;
  residuals: number[];
  fittedValues: number[];
  sse: number;
  sst: number;
  mse: number;
  covMatrix: number[][];
  individualSS?: number[];
} {
  const n = X.length;
  const p = X[0].length; // Number of parameters (including intercept)
  const k = p - 1; // Number of predictors (excluding intercept)
  
  if (n < p) {
    throw new Error('Not enough data points for the number of predictors');
  }
  
  // Compute X'X
  const XtX: number[][] = Array(p).fill(0).map(() => Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let row = 0; row < n; row++) {
        sum += X[row][i] * X[row][j];
      }
      XtX[i][j] = sum;
    }
  }
  
  // Compute X'y
  const Xty: number[] = Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let row = 0; row < n; row++) {
      sum += X[row][i] * y[row];
    }
    Xty[i] = sum;
  }
  
  // Solve (X'X)β = X'y using matrix inversion
  const XtX_inv = invertMatrix(XtX);
  
  // β = (X'X)^-1 X'y
  const coefficients: number[] = Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let j = 0; j < p; j++) {
      sum += XtX_inv[i][j] * Xty[j];
    }
    coefficients[i] = sum;
  }
  
  // Calculate fitted values and residuals
  const fittedValues: number[] = [];
  const residuals: number[] = [];
  
  for (let i = 0; i < n; i++) {
    let fitted = 0;
    for (let j = 0; j < p; j++) {
      fitted += X[i][j] * coefficients[j];
    }
    fittedValues.push(fitted);
    residuals.push(y[i] - fitted);
  }
  
  // Calculate sum of squares
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;
  const sst = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  const ssr = sst - sse;
  
  // Calculate R² and Adjusted R²
  let rSquared = sst !== 0 ? ssr / sst : (sse === 0 ? 1 : 0);
  rSquared = Math.max(0, Math.min(1, rSquared));
  
  const rSquaredAdjusted = n > p ? 1 - ((1 - rSquared) * (n - 1) / (n - p)) : rSquared;
  
  // Mean squared error
  const mse = n > p ? sse / (n - p) : 0;
  
  // Covariance matrix: Cov(β) = σ²(X'X)^-1
  const covMatrix: number[][] = XtX_inv.map(row => row.map(val => val * mse));
  
  // Calculate individual SS for each predictor (Type III SS - sequential)
  let individualSS: number[] | undefined;
  if (calculateIndividualSS && k > 0) {
    individualSS = [];
    
    for (let excludeIdx = 1; excludeIdx < p; excludeIdx++) {
      // Build reduced model without this predictor
      const reducedX: number[][] = [];
      for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < p; j++) {
          if (j !== excludeIdx) {
            row.push(X[i][j]);
          }
        }
        reducedX.push(row);
      }
      
      try {
        // Fit reduced model
        const reducedResult = multipleRegressionCore(reducedX, y, false);
        
        // SS for this predictor = SSR_full - SSR_reduced
        const ssrFull = ssr;
        const ssrReduced = reducedResult.sst - reducedResult.sse;
        const ssPredic = ssrFull - ssrReduced;
        
        individualSS.push(Math.max(0, ssPredic));
      } catch (error) {
        // If reduced model fails, use 0
        individualSS.push(0);
      }
    }
  }
  
  return {
    coefficients,
    rSquared,
    rSquaredAdjusted,
    residuals,
    fittedValues,
    sse,
    sst,
    mse,
    covMatrix,
    individualSS,
  };
}

/**
 * Invert a matrix using Gauss-Jordan elimination
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const augmented: number[][] = [];
  
  // Create augmented matrix [A | I]
  for (let i = 0; i < n; i++) {
    augmented[i] = [...matrix[i]];
    for (let j = 0; j < n; j++) {
      augmented[i].push(i === j ? 1 : 0);
    }
  }
  
  // Gauss-Jordan elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      throw new Error('Matrix is singular and cannot be inverted');
    }
    
    // Scale pivot row
    const pivot = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  // Extract inverse from augmented matrix
  const inverse: number[][] = [];
  for (let i = 0; i < n; i++) {
    inverse[i] = augmented[i].slice(n);
  }
  
  return inverse;
}

/**
 * Perform multiple regression analysis
 * @param dataY Response variable
 * @param dataX Predictor variables (each element is an array of values for one predictor)
 * @param predictorNames Names of predictor variables
 * @param selectedPredictors Indices of predictors to include in the model
 * @param responseVariableName Name of response variable
 */
export function multipleRegression(
  dataY: number[],
  dataX: number[][],
  predictorNames: string[],
  selectedPredictors: number[],
  responseVariableName: string = 'Y'
): MultipleRegressionResult {
  // Guard against empty predictor selection
  if (selectedPredictors.length === 0) {
    throw new Error('At least one predictor must be selected for regression analysis');
  }
  
  // Filter out NaN and null values and align data
  const validIndices: number[] = [];
  for (let i = 0; i < dataY.length; i++) {
    if (!isNaN(dataY[i]) && dataY[i] !== null) {
      let allXValid = true;
      for (const predIdx of selectedPredictors) {
        if (!dataX[predIdx] || isNaN(dataX[predIdx][i]) || dataX[predIdx][i] === null) {
          allXValid = false;
          break;
        }
      }
      if (allXValid) {
        validIndices.push(i);
      }
    }
  }
  
  if (validIndices.length < selectedPredictors.length + 2) {
    throw new Error('Not enough valid data points for regression analysis');
  }
  
  // Build design matrix X (n x (k+1)) with intercept
  const n = validIndices.length;
  const k = selectedPredictors.length;
  const X: number[][] = [];
  const y: number[] = [];
  
  for (const idx of validIndices) {
    const row: number[] = [1]; // Intercept
    for (const predIdx of selectedPredictors) {
      row.push(dataX[predIdx][idx]);
    }
    X.push(row);
    y.push(dataY[idx]);
  }
  
  // Perform regression
  const result = multipleRegressionCore(X, y, true);
  
  // Build coefficient table with VIF
  const coefficients: CoefficientRow[] = [];
  
  // Intercept
  coefficients.push({
    term: 'Intercept',
    estimate: result.coefficients[0],
    stdError: Math.sqrt(result.covMatrix[0][0]),
    tValue: result.coefficients[0] / Math.sqrt(result.covMatrix[0][0]),
    pValue: 2 * (1 - jStat.studentt.cdf(Math.abs(result.coefficients[0] / Math.sqrt(result.covMatrix[0][0])), n - k - 1)),
    vif: null, // No VIF for intercept
  });
  
  // Predictors with VIF
  for (let i = 0; i < k; i++) {
    const predIdx = selectedPredictors[i];
    const coefIdx = i + 1;
    const stdError = Math.sqrt(result.covMatrix[coefIdx][coefIdx]);
    const tValue = result.coefficients[coefIdx] / stdError;
    const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tValue), n - k - 1));
    
    // Calculate VIF for this predictor
    const vif = k > 1 ? calculateVIF(X, i) : 1;
    
    coefficients.push({
      term: predictorNames[predIdx] || `X${predIdx + 1}`,
      estimate: result.coefficients[coefIdx],
      stdError,
      tValue,
      pValue,
      vif,
    });
  }
  
  // Build ANOVA table
  const anovaTable: AnovaRow[] = [];
  
  // Regression row (overall model)
  const ssr = result.sst - result.sse;
  const msr = ssr / k;
  const fStatistic = result.mse > 0 ? msr / result.mse : 0;
  const fPValue = k > 0 && result.mse > 0 ? 1 - jStat.centralF.cdf(fStatistic, k, n - k - 1) : 1;
  
  anovaTable.push({
    source: 'Regression',
    df: k,
    ss: ssr,
    ms: msr,
    fValue: fStatistic,
    pValue: fPValue,
  });
  
  // Individual predictor rows
  if (result.individualSS) {
    for (let i = 0; i < k; i++) {
      const predIdx = selectedPredictors[i];
      const ss = result.individualSS[i];
      const ms = ss;
      const f = result.mse > 0 ? ms / result.mse : 0;
      const p = result.mse > 0 ? 1 - jStat.centralF.cdf(f, 1, n - k - 1) : 1;
      
      anovaTable.push({
        source: `  ${predictorNames[predIdx] || `X${predIdx + 1}`}`,
        df: 1,
        ss,
        ms,
        fValue: f,
        pValue: p,
      });
    }
  }
  
  // Error row
  anovaTable.push({
    source: 'Error',
    df: n - k - 1,
    ss: result.sse,
    ms: result.mse,
    fValue: null,
    pValue: null,
  });
  
  // Total row
  anovaTable.push({
    source: 'Total',
    df: n - 1,
    ss: result.sst,
    ms: result.sst / (n - 1),
    fValue: null,
    pValue: null,
  });
  
  // Residual statistics
  const residualMean = result.residuals.reduce((sum, r) => sum + r, 0) / n;
  const residualVariance = result.residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / n;
  const residualStd = Math.sqrt(residualVariance);
  
  // Anderson-Darling test for normality
  const { adStatistic, pValue, isNormal } = performNormalityTest(result.residuals, residualMean, residualStd);
  
  // Map isNormal to normality string
  const normality: 'Normal' | 'Not Normal' | 'Inconclusive' = 
    pValue >= 0.05 ? 'Normal' : (pValue < 0.01 ? 'Not Normal' : 'Inconclusive');
  
  return {
    coefficients,
    anovaTable,
    rSquared: result.rSquared,
    rSquaredAdjusted: result.rSquaredAdjusted,
    residuals: result.residuals,
    fittedValues: result.fittedValues,
    residualMean,
    residualStd,
    andersonDarlingStatistic: adStatistic,
    andersonDarlingPValue: pValue,
    andersonDarlingNormality: normality,
    n,
    k,
  };
}

/**
 * Calculate confidence and prediction intervals for Y at given X values (forward prediction)
 * For multiple regression: Y = β0 + β1*X1 + β2*X2 + ... + βk*Xk
 */
export interface YInterval {
  predictedY: number;
  confidenceIntervalLower: number;
  confidenceIntervalUpper: number;
  predictionIntervalLower: number;
  predictionIntervalUpper: number;
}

export function calculateYIntervals(
  xValues: number[], // Values for all predictors [x1, x2, ..., xk]
  dataX: number[][], // All X data [n x k]
  dataY: number[], // All Y data [n]
  result: MultipleRegressionResult
): YInterval {
  const n = dataY.length;
  const k = result.k; // Number of predictors
  const df = n - k - 1; // Degrees of freedom
  const tValue = jStat.studentt.inv(0.975, df);
  
  // Calculate residual standard error from ANOVA table
  const errorRow = result.anovaTable.find(row => row.source === 'Error');
  if (!errorRow) {
    return {
      predictedY: NaN,
      confidenceIntervalLower: NaN,
      confidenceIntervalUpper: NaN,
      predictionIntervalLower: NaN,
      predictionIntervalUpper: NaN,
    };
  }
  
  const s = Math.sqrt(errorRow.ms);
  
  // Build design matrix row for these X values: [1, x1, x2, ..., xk]
  const xRow = [1, ...xValues];
  
  // Calculate predicted Y value
  let predictedY = result.coefficients[0].estimate; // Intercept
  for (let i = 0; i < k; i++) {
    predictedY += result.coefficients[i + 1].estimate * xValues[i];
  }
  
  // Build full design matrix from data
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = [1]; // intercept
    for (let j = 0; j < k; j++) {
      row.push(dataX[j][i]);
    }
    X.push(row);
  }
  
  // Calculate X'X
  const XtX: number[][] = Array(k + 1).fill(0).map(() => Array(k + 1).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k + 1; j++) {
      for (let l = 0; l < k + 1; l++) {
        XtX[j][l] += X[i][j] * X[i][l];
      }
    }
  }
  
  // Invert (X'X)
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) {
    return {
      predictedY,
      confidenceIntervalLower: NaN,
      confidenceIntervalUpper: NaN,
      predictionIntervalLower: NaN,
      predictionIntervalUpper: NaN,
    };
  }
  
  // Calculate variance of prediction: x'(X'X)^-1 x
  let varYConfidence = 0;
  for (let i = 0; i < k + 1; i++) {
    for (let j = 0; j < k + 1; j++) {
      varYConfidence += xRow[i] * XtXInv[i][j] * xRow[j];
    }
  }
  varYConfidence *= (s * s);
  
  // Standard error for confidence interval (mean Y at X)
  const seYConfidence = Math.sqrt(Math.max(0, varYConfidence));
  
  // Standard error for prediction interval (adds individual observation variance)
  const seYPrediction = Math.sqrt(Math.max(0, varYConfidence + s * s));
  
  return {
    predictedY,
    confidenceIntervalLower: predictedY - tValue * seYConfidence,
    confidenceIntervalUpper: predictedY + tValue * seYConfidence,
    predictionIntervalLower: predictedY - tValue * seYPrediction,
    predictionIntervalUpper: predictedY + tValue * seYPrediction,
  };
}
