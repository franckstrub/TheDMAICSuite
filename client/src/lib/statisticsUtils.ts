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
export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const avg = mean(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  const avgSquareDiff = mean(squareDiffs);
  return avgSquareDiff;
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
 * Calculate all capability indexes at once
 * @param dataPointsArray Array of measurement values
 * @param meanValue Mean of the values
 * @param stdDev Standard deviation of the values
 * @param lsl Lower Specification Limit
 * @param usl Upper Specification Limit
 * @param dataSetTerm Data set term (Long Term or Short Term)
 * @param zShift Z-shift value
 * @returns Object containing all capability indexes
 */
export function calculateCapabilityIndexes(
  dataPointsArray: number[],
  meanValue: number,
  stdDev: number,
  lsl: number,
  usl: number,
  dataSetTerm: "Long Term" | "Short Term",
): {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
} {
  if (dataPointsArray.length < 30 || lsl >= usl || stdDev === 0) {
    return { cp: null, cpk: null, pp: null, ppk: null };
  }
  if (dataSetTerm === "Long Term") {
     // Calculate Pp (Process Performance)
    const pp = (usl - lsl) / (6 * stdDev);

    // Calculate Ppk (Process Performance Index)
    const ppupper = (usl - meanValue) / (3 * stdDev);
    const pplower = (meanValue - lsl) / (3 * stdDev);
    const ppk = Math.min(ppupper, pplower);
    const cp = null;
    const cpk = null;

    return {
      cp: cp > 0 ? cp : null,
      cpk: cpk > 0 ? cpk : null,
      pp: pp > 0 ? pp : null,
      ppk: ppk > 0 ? ppk : null
    };
  }
  else {
    // Calculate Cp (Process Capability)
    const cp = (usl - lsl) / (6 * stdDev);

    // Calculate Cpk (Process Capability Index)
    const cpupper = (usl - meanValue) / (3 * stdDev);
    const cplower = (meanValue - lsl) / (3 * stdDev);
    const cpk = Math.min(cpupper, cplower);
    const pp = null;
    const ppk = null;
  
    return {
      cp: cp > 0 ? cp : null,
      cpk: cpk > 0 ? cpk : null,
      pp: pp > 0 ? pp : null,
      ppk: ppk > 0 ? ppk : null
    };
  }
}


/**
 * Calculate performance metrics for both Long Term and Short Term for Normal continuous data
 * @param zLongTerm Long Term Z score
 * @param zShortTerm Short Term Z score
 * @returns Object containing both Long Term and Short Term metrics
 */
export function calculatePerformanceMetrics(
  zLongTerm: number, 
  zShortTerm: number
): {
  longTerm: { yield: number; dpmo: number; percentDefects: number; };
  shortTerm: { yield: number; dpmo: number; percentDefects: number; };
} {
  // Calculate Long Term metrics using zLongTerm
  // For a two-sided specification, defect rate is 2 * P(Z < -|z|)
  const longTermDefectRate = 1 - normalCDF(zLongTerm);
  const longTermYield = (1 - longTermDefectRate) * 100;
  const longTermDpmo = longTermDefectRate * 1000000;
  const longTermPercentDefects = longTermDefectRate * 100;

  // Calculate Short Term metrics using zShortTerm
  const shortTermDefectRate = 1-normalCDF(zShortTerm);
  const shortTermYield = (1 - shortTermDefectRate) * 100;
  const shortTermDpmo = shortTermDefectRate * 1000000;
  const shortTermPercentDefects = shortTermDefectRate * 100;

  return {
    longTerm: {
      yield: Math.max(0, Math.min(100, longTermYield)),
      dpmo: Math.max(0, longTermDpmo),
      percentDefects: Math.max(0, Math.min(100, longTermPercentDefects))
    },
    shortTerm: {
      yield: Math.max(0, Math.min(100, shortTermYield)),
      dpmo: Math.max(0, shortTermDpmo), 
      percentDefects: Math.max(0, Math.min(100, shortTermPercentDefects))
    }
  };
}
/**
 * Calculate performance metrics for both Long Term and Short Term for non-Normal continuous data
 * @param zLongTerm Long Term Z score
 * @param zShortTerm Short Term Z score
 * @returns Object containing both Long Term and Short Term metrics
 */
export function calculateObservedPerformanceMetrics(
  values: number[],
  lsl: number,
  usl: number,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  longTerm: { obsyield: number; obsdpmo: number; obspercentDefects: number; };
  shortTerm: { obsyield: number; obsdpmo: number; obspercentDefects: number; };
} {
   // Calculate actual defect counts from the data
  const calculateDefectRate = (values: number[], lsl: number, usl: number): number => {
    if (values.length === 0) return 0;
    
    const defectCount = values.filter(value => value < lsl || value > usl).length;
    return defectCount / values.length;
  };

  // Calculate observed defect rate from actual data
  const observedDefectRate = calculateDefectRate(values, lsl, usl);
  // Calculate Long Term metrics using zLongTerm
  // For a two-sided specification, defect rate is 2 * P(Z < -|z|)
  if(dataSetTerm="Long Term") {
    const longTermDefectRate = observedDefectRate;
    const longTermYield = (1 - longTermDefectRate) * 100;
    const longTermDpmo = longTermDefectRate * 1000000;
    const longTermPercentDefects = longTermDefectRate * 100;
    // Calculate Short Term metrics using z-equivalentLongterm and ShortTerm
    const ZequivLT = inverseNormCDF(longTermPercentDefects);
    //find Z-equivalent of observedDefectRate
    const shortTermDefectRate = 1;
    const shortTermYield = (1 - shortTermDefectRate) * 100;
    const shortTermDpmo = shortTermDefectRate * 1000000;
    const shortTermPercentDefects = shortTermDefectRate * 100;
    return {
    longTerm: {
      obsyield: Math.max(0, Math.min(100, longTermYield)),
      obsdpmo: Math.max(0, longTermDpmo),
      obspercentDefects: Math.max(0, Math.min(100, longTermPercentDefects))
      },
    shortTerm: {
      obsyield: Math.max(0, Math.min(100, shortTermYield)),
      obsdpmo: Math.max(0, shortTermDpmo), 
      obspercentDefects: Math.max(0, Math.min(100, shortTermPercentDefects))
      }
    };
  }
  else {
    const longTermDefectRate = observedDefectRate;
    const longTermYield = (1 - longTermDefectRate) * 100;
    const longTermDpmo = longTermDefectRate * 1000000;
    const longTermPercentDefects = longTermDefectRate * 100;
    // Calculate Short Term metrics using zShortTerm
    const shortTermDefectRate = 1;
    const shortTermYield = (1 - shortTermDefectRate) * 100;
    const shortTermDpmo = shortTermDefectRate * 1000000;
    const shortTermPercentDefects = shortTermDefectRate * 100;
  return {
    longTerm: {
      obsyield: Math.max(0, Math.min(100, longTermYield)),
      obsdpmo: Math.max(0, longTermDpmo),
      obspercentDefects: Math.max(0, Math.min(100, longTermPercentDefects))
    },
    shortTerm: {
      obsyield: Math.max(0, Math.min(100, shortTermYield)),
      obsdpmo: Math.max(0, shortTermDpmo), 
      obspercentDefects: Math.max(0, Math.min(100, shortTermPercentDefects))
    }
  };
  }
}

/**
 * Normal cumulative distribution function (CDF)
 */
function normalCDF(x: number): number {
  // Using the complementary error function approximation
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  // Save the sign of x
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Perform Anderson-Darling normality test
 */
export function performNormalityTest(values: number[]): {
  isNormal: boolean;
  adStatistic: number;
  pValue: number;
} {
  if (values.length < 8) {
    return { isNormal: false, adStatistic: 0, pValue: 0 };
  }

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const meanVal = mean(values);
  const stdDev = standardDeviation(values);
  
  // Calculate Anderson-Darling statistic
  let adSum = 0;
  for (let i = 0; i < n; i++) {
    const zi = (sorted[i] - meanVal) / stdDev;
    const phi = normalCDF(zi);
    const phiComp = 1 - normalCDF((sorted[n - 1 - i] - meanVal) / stdDev);
    
    if (phi > 0 && phi < 1 && phiComp > 0 && phiComp < 1) {
      adSum += (2 * i + 1) * (Math.log(phi) + Math.log(phiComp));
    }
  }
  
  const adStatistic = -n - adSum / n;
  const adAdjusted = adStatistic * (1 + 0.75/n + 2.25/(n*n));
  
  // Critical values for Anderson-Darling test (approximate)
  const criticalValue = 0.787; // 5% significance level
  const isNormal = adAdjusted < criticalValue;
  
  // Approximate p-value calculation
  let pValue = 0.05;
  if (adAdjusted < 0.2) pValue = 0.8;
  else if (adAdjusted < 0.34) pValue = 0.5;
  else if (adAdjusted < 0.787) pValue = 0.1;
  else pValue = 0.01;
  
  return { isNormal, adStatistic: adAdjusted, pValue };
}

/**
 * Calculate Z-score for Long Term and Short Term based on data term, normality, and specification limits
 */
export function calculateZScoreLongShortTerm(
  values: number[],
  meanVal: number,
  stdDev: number,
  lsl: number,
  usl: number,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  zLongTerm: number;
  zShortTerm: number;
  zBench: number;
  isNormal: boolean;
  adStatistic: number;
  pValue: number;
} {
  if (values.length === 0 || stdDev === 0) {
    return {
      zLongTerm: 0,
      zShortTerm: 0,
      zBench: 0,
      isNormal: false,
      adStatistic: 0,
      pValue: 0
    };
  }

  // Perform normality test
  const normalityTest = performNormalityTest(values);
  
  // Calculate Z values based on specification limits
  let zLsl = Infinity;
  let zUsl = Infinity;
  
  if (lsl !== 0 && !isNaN(lsl) && isFinite(lsl)) {
    zLsl = Math.abs(meanVal - lsl) / stdDev;
  }
  
  if (usl !== 0 && !isNaN(usl) && isFinite(usl)) {
    zUsl = Math.abs(usl - meanVal) / stdDev;
  }
  
  // Take the minimum Z (worst case) - only consider finite values
  const validZValues = [zLsl, zUsl].filter(z => isFinite(z));
  const zMinimum = validZValues.length > 0 ? Math.min(...validZValues) : 0;
  
  // Calculate Long Term and Short Term Z scores
  let zLongTerm = zMinimum;
  let zShortTerm = zMinimum;
  
  if (dataSetTerm === "Long Term") {
    // Long term data already includes variation
    zLongTerm = zMinimum;
    zShortTerm = zMinimum + zShift; // Add shift to get short term equivalent
  } else {
    // Short term data - add shift to get long term
    zShortTerm = zMinimum;
    zLongTerm = Math.max(0, zMinimum - zShift); // Subtract shift for long term
  }
  
  // Z.Bench is typically the short term capability
  const zBench = zShortTerm;
  
  return {
    zLongTerm: Math.max(0, zLongTerm),
    zShortTerm: Math.max(0, zShortTerm),
    zBench: Math.max(0, zBench),
    isNormal: normalityTest.isNormal,
    adStatistic: normalityTest.adStatistic,
    pValue: normalityTest.pValue
  };
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
 * Calculate quartiles for box plot
 * @param values Array of values
 * @returns Object with quartile values
 */
export function calculateQuartiles(values: number[]): {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
} {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const medianValue = median(values);
  
  // Calculate Q1 and Q3
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  
  return { min, q1, median: medianValue, q3, max };
}

/**
 * Calculate moving range for control charts
 * @param values Array of values
 * @returns Array of moving ranges
 */
export function calculateMovingRange(values: number[]): number[] {
  if (values.length < 2) return [];
  
  const movingRanges: number[] = [];
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  
  return movingRanges;
}

/**
 * Calculate control limits for Individual chart
 * @param values Array of values
 * @returns Control limits object
 */
export function calculateIndividualControlLimits(values: number[]): {
  centerLine: number;
  ucl: number;
  lcl: number;
} {
  if (values.length < 2) {
    return { centerLine: 0, ucl: 0, lcl: 0 };
  }
  
  const centerLine = mean(values);
  const movingRanges = calculateMovingRange(values);
  const avgMovingRange = mean(movingRanges);
  
  // Constants for Individual chart (d2 = 1.128 for n=2)
  const d2 = 1.128;
  const estimatedSigma = avgMovingRange / d2;
  
  const ucl = centerLine + 3 * estimatedSigma;
  const lcl = centerLine - 3 * estimatedSigma;
  
  return { centerLine, ucl, lcl };
}

/**
 * Calculate control limits for Moving Range chart
 * @param values Array of values
 * @returns Control limits object
 */
export function calculateMovingRangeControlLimits(values: number[]): {
  centerLine: number;
  ucl: number;
  lcl: number;
} {
  if (values.length < 2) {
    return { centerLine: 0, ucl: 0, lcl: 0 };
  }
  
  const movingRanges = calculateMovingRange(values);
  const centerLine = mean(movingRanges);
  
  // Constants for Moving Range chart (D3 = 0, D4 = 3.267 for n=2)
  const D3 = 0;
  const D4 = 3.267;
  
  const ucl = D4 * centerLine;
  const lcl = D3 * centerLine;
  
  return { centerLine, ucl, lcl };
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

/**
 * Inverse Normal CDF using Beasley-Springer-Moro algorithm
 * Calculates the Z value from a percentage of defects
 * @param p Probability/percentage (0 to 1, where 0.01 = 1% defects)
 * @returns Z-score corresponding to the given probability
 */
export function inverseNormCDF(p: number): number {
  // Handle edge cases
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Use Beasley-Springer-Moro algorithm for inverse normal CDF
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];

  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];

  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];

  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  // Define break-points
  const plow = 0.02425;
  const phigh = 1 - plow;

  let q, r, val;

  if (p < plow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    val = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    val = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
          (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    val = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return val;
}
