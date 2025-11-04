import jStat from 'jstat';
import { performNormalityTest } from './statisticsUtils';

export interface AnovaTwoWayResult {
  // Overall statistics
  grandMean: number;
  totalN: number;
  
  // Factor A statistics
  factorALevels: string[];
  factorAMeans: number[];
  factorANs: number[];
  factorASS: number;
  factorADF: number;
  factorAMS: number;
  factorAF: number;
  factorAPValue: number;
  
  // Factor B statistics
  factorBLevels: string[];
  factorBMeans: number[];
  factorBNs: number[];
  factorBSS: number;
  factorBDF: number;
  factorBMS: number;
  factorBF: number;
  factorBPValue: number;
  
  // Interaction statistics (if applicable)
  interactionSS: number;
  interactionDF: number;
  interactionMS: number;
  interactionF: number;
  interactionPValue: number;
  
  // Error statistics
  errorSS: number;
  errorDF: number;
  errorMS: number;
  
  // Total statistics
  totalSS: number;
  totalDF: number;
  
  // Cell means for interaction plot
  cellMeans: Record<string, number>;
  cellNs: Record<string, number>;
  
  // Raw data for residual analysis
  residuals: number[];
  fittedValues: number[];
  
  // R-squared
  rSquared: number;
  
  // Residual statistics
  residualStd: number;
  andersonDarlingStatistic: number;
  andersonDarlingPValue: number;
  andersonDarlingNormality: 'Normal' | 'Not Normal' | 'Inconclusive';
}

/**
 * Perform Two-Way ANOVA with or without interaction
 * 
 * @param factorALevels - Array of factor A level names
 * @param factorBLevels - Array of factor B level names
 * @param cellData - Object with keys like "A1-B1" and values as arrays of observations
 * @param includeInteraction - Whether to include interaction effect
 * @returns AnovaTwoWayResult object with all statistics
 */
export function anovaTwoWay(
  factorALevels: string[],
  factorBLevels: string[],
  cellData: Record<string, number[]>,
  includeInteraction: boolean = true
): AnovaTwoWayResult {
  
  // Validate inputs
  if (factorALevels.length < 2) {
    throw new Error("Factor A must have at least 2 levels");
  }
  if (factorBLevels.length < 2) {
    throw new Error("Factor B must have at least 2 levels");
  }
  
  const a = factorALevels.length;
  const b = factorBLevels.length;
  
  // Calculate cell means and counts
  const cellMeans: Record<string, number> = {};
  const cellNs: Record<string, number> = {};
  let totalN = 0;
  let grandSum = 0;
  
  for (const levelA of factorALevels) {
    for (const levelB of factorBLevels) {
      const key = `${levelA}-${levelB}`;
      const data = cellData[key] || [];
      const validData = data.filter(x => !isNaN(x));
      
      if (validData.length === 0) {
        cellMeans[key] = 0;
        cellNs[key] = 0;
      } else {
        const sum = validData.reduce((acc, val) => acc + val, 0);
        cellMeans[key] = sum / validData.length;
        cellNs[key] = validData.length;
        grandSum += sum;
        totalN += validData.length;
      }
    }
  }
  
  if (totalN < 2) {
    throw new Error("Need at least 2 total observations for ANOVA");
  }
  
  // Check for minimum replications if interaction is included
  if (includeInteraction) {
    let minReps = Infinity;
    for (const levelA of factorALevels) {
      for (const levelB of factorBLevels) {
        const key = `${levelA}-${levelB}`;
        minReps = Math.min(minReps, cellNs[key]);
      }
    }
    if (minReps < 2) {
      throw new Error("Each cell must have at least 2 observations when including interaction");
    }
  }
  
  const grandMean = grandSum / totalN;
  
  // Calculate Factor A marginal means
  const factorAMeans: number[] = [];
  const factorANs: number[] = [];
  for (const levelA of factorALevels) {
    let sumA = 0;
    let nA = 0;
    for (const levelB of factorBLevels) {
      const key = `${levelA}-${levelB}`;
      const data = cellData[key] || [];
      const validData = data.filter(x => !isNaN(x));
      sumA += validData.reduce((acc, val) => acc + val, 0);
      nA += validData.length;
    }
    factorAMeans.push(nA > 0 ? sumA / nA : 0);
    factorANs.push(nA);
  }
  
  // Calculate Factor B marginal means
  const factorBMeans: number[] = [];
  const factorBNs: number[] = [];
  for (const levelB of factorBLevels) {
    let sumB = 0;
    let nB = 0;
    for (const levelA of factorALevels) {
      const key = `${levelA}-${levelB}`;
      const data = cellData[key] || [];
      const validData = data.filter(x => !isNaN(x));
      sumB += validData.reduce((acc, val) => acc + val, 0);
      nB += validData.length;
    }
    factorBMeans.push(nB > 0 ? sumB / nB : 0);
    factorBNs.push(nB);
  }
  
  // Calculate Total SS
  let totalSS = 0;
  for (const levelA of factorALevels) {
    for (const levelB of factorBLevels) {
      const key = `${levelA}-${levelB}`;
      const data = cellData[key] || [];
      const validData = data.filter(x => !isNaN(x));
      for (const val of validData) {
        totalSS += Math.pow(val - grandMean, 2);
      }
    }
  }
  
  // Calculate Factor A SS
  let factorASS = 0;
  for (let i = 0; i < factorALevels.length; i++) {
    factorASS += factorANs[i] * Math.pow(factorAMeans[i] - grandMean, 2);
  }
  
  // Calculate Factor B SS
  let factorBSS = 0;
  for (let i = 0; i < factorBLevels.length; i++) {
    factorBSS += factorBNs[i] * Math.pow(factorBMeans[i] - grandMean, 2);
  }
  
  // Calculate Cell SS (for interaction calculation)
  let cellSS = 0;
  for (const levelA of factorALevels) {
    for (const levelB of factorBLevels) {
      const key = `${levelA}-${levelB}`;
      cellSS += cellNs[key] * Math.pow(cellMeans[key] - grandMean, 2);
    }
  }
  
  // Calculate Interaction SS and Error SS
  let interactionSS = 0;
  let errorSS = 0;
  
  if (includeInteraction) {
    interactionSS = cellSS - factorASS - factorBSS;
    // Error SS is within-cell variation
    for (const levelA of factorALevels) {
      for (const levelB of factorBLevels) {
        const key = `${levelA}-${levelB}`;
        const data = cellData[key] || [];
        const validData = data.filter(x => !isNaN(x));
        const cellMean = cellMeans[key];
        for (const val of validData) {
          errorSS += Math.pow(val - cellMean, 2);
        }
      }
    }
  } else {
    // Without interaction, error includes interaction + within-cell variation
    errorSS = totalSS - factorASS - factorBSS;
  }
  
  // Degrees of freedom
  const factorADF = a - 1;
  const factorBDF = b - 1;
  const interactionDF = (a - 1) * (b - 1);
  const totalDF = totalN - 1;
  const errorDF = includeInteraction ? (totalN - a * b) : (totalN - a - b + 1);
  
  // Mean squares
  const factorAMS = factorADF > 0 ? factorASS / factorADF : 0;
  const factorBMS = factorBDF > 0 ? factorBSS / factorBDF : 0;
  const interactionMS = (includeInteraction && interactionDF > 0) ? interactionSS / interactionDF : 0;
  const errorMS = errorDF > 0 ? errorSS / errorDF : 0;
  
  // F-statistics
  const factorAF = errorMS > 0 ? factorAMS / errorMS : 0;
  const factorBF = errorMS > 0 ? factorBMS / errorMS : 0;
  const interactionF = (includeInteraction && errorMS > 0) ? interactionMS / errorMS : 0;
  
  // P-values
  const factorAPValue = (factorADF > 0 && errorDF > 0) 
    ? 1 - jStat.centralF.cdf(factorAF, factorADF, errorDF) 
    : 1;
  const factorBPValue = (factorBDF > 0 && errorDF > 0) 
    ? 1 - jStat.centralF.cdf(factorBF, factorBDF, errorDF) 
    : 1;
  const interactionPValue = (includeInteraction && interactionDF > 0 && errorDF > 0) 
    ? 1 - jStat.centralF.cdf(interactionF, interactionDF, errorDF) 
    : 1;
  
  // Calculate residuals and fitted values
  const residuals: number[] = [];
  const fittedValues: number[] = [];
  
  for (const levelA of factorALevels) {
    for (const levelB of factorBLevels) {
      const key = `${levelA}-${levelB}`;
      const data = cellData[key] || [];
      const validData = data.filter(x => !isNaN(x));
      const fitted = cellMeans[key]; // Cell mean is the fitted value
      
      for (const val of validData) {
        fittedValues.push(fitted);
        residuals.push(val - fitted);
      }
    }
  }
  
  // R-squared
  const rSquared = totalSS > 0 ? 1 - (errorSS / totalSS) : 0;
  
  // Residual statistics
  const residualMean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
  const residualVariance = residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / residuals.length;
  const residualStd = Math.sqrt(residualVariance);
  
  // Anderson-Darling test for normality of residuals
  const normalADTest = performNormalityTest(residuals, residualMean, residualStd);
  
  return {
    grandMean,
    totalN,
    factorALevels,
    factorAMeans,
    factorANs,
    factorASS,
    factorADF,
    factorAMS,
    factorAF,
    factorAPValue,
    factorBLevels,
    factorBMeans,
    factorBNs,
    factorBSS,
    factorBDF,
    factorBMS,
    factorBF,
    factorBPValue,
    interactionSS,
    interactionDF,
    interactionMS,
    interactionF,
    interactionPValue,
    errorSS,
    errorDF,
    errorMS,
    totalSS,
    totalDF,
    cellMeans,
    cellNs,
    residuals,
    fittedValues,
    rSquared,
    residualStd,
    andersonDarlingStatistic: normalADTest.adStatistic,
    andersonDarlingPValue: normalADTest.pValue,
    andersonDarlingNormality: normalADTest.isNormal ? 'Normal' : (normalADTest.isNormal === false ? 'Not Normal' : 'Inconclusive'),
  };
}
