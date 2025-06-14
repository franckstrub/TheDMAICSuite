/**
 * ANOVA Gage R&R Statistics Calculations
 * 
 * This module calculates comprehensive ANOVA-based Gage R&R statistics
 * for continuous measurement system analysis including all variance components,
 * study variations, and tolerance percentages.
 */

export interface ContinuousAnalysisRow {
  unitNumber: number;
  app1_rep1: number;
  app1_rep2: number;
  app1_rep3: number;
  app2_rep1: number;
  app2_rep2: number;
  app2_rep3: number;
  app3_rep1: number;
  app3_rep2: number;
  app3_rep3: number;
}

export interface VariationComponent {
  studyVariation: number;  // σ dev
  studyVar: number;        // 6*study var (or 5.15*study var)
  percentStudyVar: number; // %study var
  percentTolerance: number; // %tolerance (if tolerance provided)
}

export interface GageRRStatistics {
  totalGageRR: VariationComponent;
  repeatability: VariationComponent;
  reproducibility: VariationComponent;
  operator: VariationComponent;
  partOperator: VariationComponent;
  partToPart: VariationComponent;
  total: VariationComponent;
  numberDistinctCategories: number;
  isValid: boolean;
}

/**
 * Main function to calculate ANOVA Gage R&R statistics
 */
export function calculateGageRRStatistics(
  data: ContinuousAnalysisRow[], 
  sigmaMultiplier: number = 6, 
  tolerance?: number
): GageRRStatistics {
  if (data.length === 0) {
    return createEmptyStatistics();
  }

  // Filter out rows with all zero values
  const validData = data.filter(row => 
    row.app1_rep1 !== 0 || row.app1_rep2 !== 0 || row.app1_rep3 !== 0 ||
    row.app2_rep1 !== 0 || row.app2_rep2 !== 0 || row.app2_rep3 !== 0 ||
    row.app3_rep1 !== 0 || row.app3_rep2 !== 0 || row.app3_rep3 !== 0
  );

  if (validData.length === 0) {
    return createEmptyStatistics();
  }

  // Perform ANOVA calculations
  const anovaResults = performANOVA(validData);
  
  // Calculate variance components
  const varComponents = calculateVarianceComponents(anovaResults, validData.length);
  
  // Calculate study variations and percentages
  const statistics = calculateStudyVariations(varComponents, sigmaMultiplier, tolerance);
  
  // Calculate number of distinct categories
  const ndc = calculateNumberDistinctCategories(varComponents.partToPart, varComponents.totalGageRR);
  
  return {
    ...statistics,
    numberDistinctCategories: ndc,
    isValid: statistics.totalGageRR.percentStudyVar < 30 && ndc >= 5
  };
}

interface ANOVAResults {
  partSumSquares: number;
  operatorSumSquares: number;
  partOperatorSumSquares: number;
  repeatableSumSquares: number;
  totalSumSquares: number;
  partMeanSquare: number;
  operatorMeanSquare: number;
  partOperatorMeanSquare: number;
  repeatableMeanSquare: number;
  partDegreesOfFreedom: number;
  operatorDegreesOfFreedom: number;
  partOperatorDegreesOfFreedom: number;
  repeatableDegreesOfFreedom: number;
}

function performANOVA(data: ContinuousAnalysisRow[]): ANOVAResults {
  const numParts = data.length;
  const numOperators = 3; // Always 3 operators
  const numReps = 3; // Always 3 repetitions per operator
  const totalObs = numParts * numOperators * numReps;

  // Flatten data into a structure for ANOVA calculations
  const flatData: { part: number; operator: number; rep: number; value: number }[] = [];
  
  data.forEach((row, partIndex) => {
    // Operator 1
    flatData.push({ part: partIndex, operator: 0, rep: 0, value: row.app1_rep1 });
    flatData.push({ part: partIndex, operator: 0, rep: 1, value: row.app1_rep2 });
    flatData.push({ part: partIndex, operator: 0, rep: 2, value: row.app1_rep3 });
    
    // Operator 2
    flatData.push({ part: partIndex, operator: 1, rep: 0, value: row.app2_rep1 });
    flatData.push({ part: partIndex, operator: 1, rep: 1, value: row.app2_rep2 });
    flatData.push({ part: partIndex, operator: 1, rep: 2, value: row.app2_rep3 });
    
    // Operator 3
    flatData.push({ part: partIndex, operator: 2, rep: 0, value: row.app3_rep1 });
    flatData.push({ part: partIndex, operator: 2, rep: 1, value: row.app3_rep2 });
    flatData.push({ part: partIndex, operator: 2, rep: 2, value: row.app3_rep3 });
  });

  // Calculate grand mean
  const grandMean = flatData.reduce((sum, obs) => sum + obs.value, 0) / totalObs;

  // Calculate part means
  const partMeans = Array(numParts).fill(0).map((_, partIndex) => {
    const partData = flatData.filter(obs => obs.part === partIndex);
    return partData.reduce((sum, obs) => sum + obs.value, 0) / partData.length;
  });

  // Calculate operator means
  const operatorMeans = Array(numOperators).fill(0).map((_, opIndex) => {
    const opData = flatData.filter(obs => obs.operator === opIndex);
    return opData.reduce((sum, obs) => sum + obs.value, 0) / opData.length;
  });

  // Calculate part-operator means
  const partOperatorMeans = Array(numParts).fill(0).map(() => Array(numOperators).fill(0));
  for (let p = 0; p < numParts; p++) {
    for (let o = 0; o < numOperators; o++) {
      const cellData = flatData.filter(obs => obs.part === p && obs.operator === o);
      partOperatorMeans[p][o] = cellData.reduce((sum, obs) => sum + obs.value, 0) / cellData.length;
    }
  }

  // Calculate sum of squares
  let totalSumSquares = 0;
  let partSumSquares = 0;
  let operatorSumSquares = 0;
  let partOperatorSumSquares = 0;
  let repeatableSumSquares = 0;

  // Total sum of squares
  flatData.forEach(obs => {
    totalSumSquares += Math.pow(obs.value - grandMean, 2);
  });

  // Part sum of squares
  partMeans.forEach(partMean => {
    partSumSquares += numOperators * numReps * Math.pow(partMean - grandMean, 2);
  });

  // Operator sum of squares
  operatorMeans.forEach(opMean => {
    operatorSumSquares += numParts * numReps * Math.pow(opMean - grandMean, 2);
  });

  // Part-Operator interaction sum of squares
  for (let p = 0; p < numParts; p++) {
    for (let o = 0; o < numOperators; o++) {
      const expected = partMeans[p] + operatorMeans[o] - grandMean;
      partOperatorSumSquares += numReps * Math.pow(partOperatorMeans[p][o] - expected, 2);
    }
  }

  // Repeatability (error) sum of squares
  flatData.forEach(obs => {
    const expectedValue = partOperatorMeans[obs.part][obs.operator];
    repeatableSumSquares += Math.pow(obs.value - expectedValue, 2);
  });

  // Degrees of freedom
  const partDegreesOfFreedom = numParts - 1;
  const operatorDegreesOfFreedom = numOperators - 1;
  const partOperatorDegreesOfFreedom = partDegreesOfFreedom * operatorDegreesOfFreedom;
  const repeatableDegreesOfFreedom = numParts * numOperators * (numReps - 1);

  // Mean squares
  const partMeanSquare = partSumSquares / partDegreesOfFreedom;
  const operatorMeanSquare = operatorSumSquares / operatorDegreesOfFreedom;
  const partOperatorMeanSquare = partOperatorSumSquares / partOperatorDegreesOfFreedom;
  const repeatableMeanSquare = repeatableSumSquares / repeatableDegreesOfFreedom;

  return {
    partSumSquares,
    operatorSumSquares,
    partOperatorSumSquares,
    repeatableSumSquares,
    totalSumSquares,
    partMeanSquare,
    operatorMeanSquare,
    partOperatorMeanSquare,
    repeatableMeanSquare,
    partDegreesOfFreedom,
    operatorDegreesOfFreedom,
    partOperatorDegreesOfFreedom,
    repeatableDegreesOfFreedom
  };
}

interface VarianceComponents {
  repeatability: number;
  operator: number;
  partOperator: number;
  partToPart: number;
  totalGageRR: number;
  total: number;
}

function calculateVarianceComponents(anova: ANOVAResults, numParts: number): VarianceComponents {
  const numOperators = 3;
  const numReps = 3;

  // Variance components from ANOVA mean squares
  const repeatability = anova.repeatableMeanSquare;
  
  const partOperator = Math.max(0, (anova.partOperatorMeanSquare - anova.repeatableMeanSquare) / numReps);
  
  const operator = Math.max(0, (anova.operatorMeanSquare - anova.partOperatorMeanSquare) / (numParts * numReps));
  
  const partToPart = Math.max(0, (anova.partMeanSquare - anova.partOperatorMeanSquare) / (numOperators * numReps));

  const totalGageRR = repeatability + operator + partOperator;
  const total = totalGageRR + partToPart;

  return {
    repeatability,
    operator,
    partOperator,
    partToPart,
    totalGageRR,
    total
  };
}

function calculateStudyVariations(
  varComponents: VarianceComponents, 
  sigmaMultiplier: number, 
  tolerance?: number
): Omit<GageRRStatistics, 'numberDistinctCategories' | 'isValid'> {
  
  const createVariationComponent = (variance: number): VariationComponent => {
    const studyVariation = Math.sqrt(variance);
    const studyVar = sigmaMultiplier * studyVariation;
    const percentStudyVar = varComponents.total > 0 ? (studyVar / (sigmaMultiplier * Math.sqrt(varComponents.total))) * 100 : 0;
    const percentTolerance = tolerance ? (studyVar / tolerance) * 100 : 0;

    return {
      studyVariation,
      studyVar,
      percentStudyVar,
      percentTolerance
    };
  };

  return {
    totalGageRR: createVariationComponent(varComponents.totalGageRR),
    repeatability: createVariationComponent(varComponents.repeatability),
    reproducibility: createVariationComponent(varComponents.operator + varComponents.partOperator),
    operator: createVariationComponent(varComponents.operator),
    partOperator: createVariationComponent(varComponents.partOperator),
    partToPart: createVariationComponent(varComponents.partToPart),
    total: createVariationComponent(varComponents.total)
  };
}

function calculateNumberDistinctCategories(partToPartVariance: number, gageRRVariance: number): number {
  if (gageRRVariance <= 0) return 0;
  return 1.41 * Math.sqrt(partToPartVariance / gageRRVariance);
}

function createEmptyStatistics(): GageRRStatistics {
  const emptyComponent: VariationComponent = {
    studyVariation: 0,
    studyVar: 0,
    percentStudyVar: 0,
    percentTolerance: 0
  };

  return {
    totalGageRR: emptyComponent,
    repeatability: emptyComponent,
    reproducibility: emptyComponent,
    operator: emptyComponent,
    partOperator: emptyComponent,
    partToPart: emptyComponent,
    total: emptyComponent,
    numberDistinctCategories: 0,
    isValid: false
  };
}