/**
 * ANOVA Gage R&R Statistics Calculations
 * 
 * This module calculates comprehensive ANOVA-based Gage R&R statistics
 * for continuous measurement system analysis including all variance components,
 * study variations, and tolerance percentages.
 */

export interface ContinuousAnalysisRow {
  unitNumber: number;
  app1_rep1: number | null;
  app1_rep2: number | null;
  app1_rep3: number | null;
  app2_rep1: number | null;
  app2_rep2: number | null;
  app2_rep3: number | null;
  app3_rep1: number | null;
  app3_rep2: number | null;
  app3_rep3: number | null;
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

  // Check if there are any non-null values in the data
  const hasValidValues = data.some(row => 
    row.app1_rep1 !== null || row.app1_rep2 !== null || row.app1_rep3 !== null ||
    row.app2_rep1 !== null || row.app2_rep2 !== null || row.app2_rep3 !== null ||
    row.app3_rep1 !== null || row.app3_rep2 !== null || row.app3_rep3 !== null
  );

  if (!hasValidValues) {
    return createEmptyStatistics();
  }

  // Filter out rows with all null values
  const validData = data.filter(row => 
    row.app1_rep1 !== null || row.app1_rep2 !== null || row.app1_rep3 !== null ||
    row.app2_rep1 !== null || row.app2_rep2 !== null || row.app2_rep3 !== null ||
    row.app3_rep1 !== null || row.app3_rep2 !== null || row.app3_rep3 !== null
  );

  if (validData.length === 0) {
    return createEmptyStatistics();
  }

  // Validate data meets AIAG standards before performing calculations
  const validation = validateGageRRData(validData);
  if (!validation.isValid) {
    return createEmptyStatistics();
  }

  // Perform ANOVA calculations
  const anovaResults = performANOVA(validData);
  
  // Calculate variance components
  const varComponents = calculateVarianceComponents(anovaResults, validData.length, validation.activeOperators);
  
  // Calculate study variations and percentages
  const statistics = calculateStudyVariations(varComponents, sigmaMultiplier, tolerance);
  
  // Calculate number of distinct categories
  const ndc = calculateNumberDistinctCategories(varComponents.partToPart, varComponents.totalGageRR);
  
  return {
    ...statistics,
    numberDistinctCategories: ndc,
    isValid: statistics.totalGageRR.percentStudyVar <= 10 && ndc >= 5
  };
}

interface DataValidation {
  isValid: boolean;
  activeOperators: number;
  minRepetitions: number;
  validParts: number;
  message?: string;
}

/**
 * Validate Gage R&R data according to AIAG standards
 * Minimum requirements: 10 parts, 2 operators, 2 repetitions each
 */
function validateGageRRData(data: ContinuousAnalysisRow[]): DataValidation {
  const numParts = data.length;
  
  // Check minimum parts requirement (AIAG standard: minimum 10 parts)
  if (numParts < 10) {
    return {
      isValid: false,
      activeOperators: 0,
      minRepetitions: 0,
      validParts: numParts,
      message: `Insufficient parts: ${numParts}/10 minimum required`
    };
  }
  
  // Count active operators (operators with at least 2 repetitions per part)
  let activeOperators = 0;
  let minRepetitions = 3;
  
  // Check Operator 1
  const op1HasMinReps = data.every(row => 
    (row.app1_rep1 !== null && row.app1_rep2 !== null) || 
    (row.app1_rep1 === null && row.app1_rep2 === null && row.app1_rep3 === null)
  );
  if (data.some(row => row.app1_rep1 !== null || row.app1_rep2 !== null) && op1HasMinReps) {
    activeOperators++;
  }
  
  // Check Operator 2
  const op2HasMinReps = data.every(row => 
    (row.app2_rep1 !== null && row.app2_rep2 !== null) || 
    (row.app2_rep1 === null && row.app2_rep2 === null && row.app2_rep3 === null)
  );
  if (data.some(row => row.app2_rep1 !== null || row.app2_rep2 !== null) && op2HasMinReps) {
    activeOperators++;
  }
  
  // Check Operator 3 (optional)
  const op3HasMinReps = data.every(row => 
    (row.app3_rep1 !== null && row.app3_rep2 !== null) || 
    (row.app3_rep1 === null && row.app3_rep2 === null && row.app3_rep3 === null)
  );
  if (data.some(row => row.app3_rep1 !== null || row.app3_rep2 !== null) && op3HasMinReps) {
    activeOperators++;
  }
  
  // Check minimum operators requirement (AIAG standard: minimum 2 operators)
  if (activeOperators < 2) {
    return {
      isValid: false,
      activeOperators,
      minRepetitions,
      validParts: numParts,
      message: `Insufficient operators: ${activeOperators}/2 minimum required with balanced data`
    };
  }
  
  return {
    isValid: true,
    activeOperators,
    minRepetitions,
    validParts: numParts
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
  
  // Determine which operators have data (non-null values)
  const activeOperators: number[] = [];
  const hasOp1Data = data.some(row => row.app1_rep1 !== null || row.app1_rep2 !== null || row.app1_rep3 !== null);
  const hasOp2Data = data.some(row => row.app2_rep1 !== null || row.app2_rep2 !== null || row.app2_rep3 !== null);
  const hasOp3Data = data.some(row => row.app3_rep1 !== null || row.app3_rep2 !== null || row.app3_rep3 !== null);
  
  if (hasOp1Data) activeOperators.push(0);
  if (hasOp2Data) activeOperators.push(1);
  if (hasOp3Data) activeOperators.push(2);
  
  const numOperators = activeOperators.length;
  const numReps = 3; // Always 3 repetitions per operator
  
  // Flatten data into a structure for ANOVA calculations - only include active operators and non-null values
  const flatData: { part: number; operator: number; rep: number; value: number }[] = [];
  
  data.forEach((row, partIndex) => {
    // Only include data from active operators and filter out null values
    if (hasOp1Data) {
      if (row.app1_rep1 !== null) flatData.push({ part: partIndex, operator: 0, rep: 0, value: row.app1_rep1 as number });
      if (row.app1_rep2 !== null) flatData.push({ part: partIndex, operator: 0, rep: 1, value: row.app1_rep2 as number });
      if (row.app1_rep3 !== null) flatData.push({ part: partIndex, operator: 0, rep: 2, value: row.app1_rep3 as number });
    }
    
    if (hasOp2Data) {
      if (row.app2_rep1 !== null) flatData.push({ part: partIndex, operator: 1, rep: 0, value: row.app2_rep1 as number });
      if (row.app2_rep2 !== null) flatData.push({ part: partIndex, operator: 1, rep: 1, value: row.app2_rep2 as number });
      if (row.app2_rep3 !== null) flatData.push({ part: partIndex, operator: 1, rep: 2, value: row.app2_rep3 as number });
    }
    
    if (hasOp3Data) {
      if (row.app3_rep1 !== null) flatData.push({ part: partIndex, operator: 2, rep: 0, value: row.app3_rep1 as number });
      if (row.app3_rep2 !== null) flatData.push({ part: partIndex, operator: 2, rep: 1, value: row.app3_rep2 as number });
      if (row.app3_rep3 !== null) flatData.push({ part: partIndex, operator: 2, rep: 2, value: row.app3_rep3 as number });
    }
  });
  
  const totalObs = flatData.length;

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

function calculateVarianceComponents(anova: ANOVAResults, numParts: number, activeOperators: number): VarianceComponents {
  const numReps = 3;

  // Variance components from ANOVA mean squares
  const repeatability = anova.repeatableMeanSquare;
  
  // If only one operator, reproducibility components should be zero
  let partOperator = 0;
  let operator = 0;
  
  if (activeOperators > 1) {
    partOperator = Math.max(0, (anova.partOperatorMeanSquare - anova.repeatableMeanSquare) / numReps);
    operator = Math.max(0, (anova.operatorMeanSquare - anova.partOperatorMeanSquare) / (numParts * numReps));
  }
  
  const partToPart = Math.max(0, (anova.partMeanSquare - anova.partOperatorMeanSquare) / (activeOperators * numReps));

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