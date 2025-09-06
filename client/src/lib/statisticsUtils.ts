import * as jStat from 'jstat'
//import { jStat } from 'jstat'
import { number } from 'zod';
// Simple statistics utilities for Lean Six Sigma calculations

/**
 * Safely parse numeric value from either string or number
 * @param value Value to parse
 * @param defaultValue Default value if parsing fails
 * @returns Parsed number or default value
 */
export function parseNumericValue(value: any, defaultValue: number | undefined): number | undefined {
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
  if (values.length <= 1) return 0; // Need at least 2 values for sample std dev
  
  const avg = mean(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  // Key difference: divide by (n-1) instead of n for sample standard deviation
  const sumSquaredDiffs = squareDiffs.reduce((sum, diff) => sum + diff, 0);
  const sampleVariance = sumSquaredDiffs / (values.length - 1);
  
  return sampleVariance;
}

/**
 * Calculate the SAMPLE standard deviation of an array of numbers
 * Uses Bessel's correction (divides by n-1 instead of n)
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0; // Need at least 2 values for sample std dev
  
  const avg = mean(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  // Key difference: divide by (n-1) instead of n for sample standard deviation
  const sumSquaredDiffs = squareDiffs.reduce((sum, diff) => sum + diff, 0);
  const sampleVariance = sumSquaredDiffs / (values.length - 1);
  
  return Math.sqrt(sampleVariance);
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
export function calculateMode(values: number[]): number | null {
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
  lsl: number | undefined,
  usl: number | undefined,
  dataSetTerm: "Long Term" | "Short Term",
): {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
} {
  if (dataPointsArray.length < 30 || (lsl !== undefined && usl !== undefined && lsl >= usl) || stdDev === 0) {
    return { cp: null, cpk: null, pp: null, ppk: null };
  }
  if (dataSetTerm === "Long Term") {
     // Calculate Pp (Process Performance)
    let pp: number | null;
    if (usl !== undefined && lsl !== undefined) {
      pp = (usl - lsl) / (6 * stdDev);  
    }
    else {
      pp = null;
    }
    
    // Calculate Ppk (Process Performance Index)
    const ppupper = usl !== undefined ? (usl - meanValue) / (3 * stdDev) : 0;
    const pplower = lsl !== undefined ? (meanValue - lsl) / (3 * stdDev) : 0;
    let ppk: number | null;
    if (lsl !== undefined && usl !== undefined) {
      ppk = Math.min(ppupper, pplower); 
    }
    else if (usl !== undefined) {
      ppk = ppupper; 
    }
    else if (lsl !== undefined) {
      ppk = pplower; 
    }
    else {
      ppk = null;
    }
    const cp = null;
    const cpk = null;

    return {
      cp: cp !== null && cp > 0 ? cp : null,
      cpk: cpk !== null && cpk > 0 ? cpk : null,
      pp: pp !== null && pp > 0 ? pp : null,
      ppk: ppk !== null && ppk > 0 ? ppk : null
    };
  }
  else {
    // Calculate Cp (Process Capability)

    let cp: number | null;
    if (usl !== undefined && lsl !== undefined) {
      cp = (usl - lsl) / (6 * stdDev);  
    }
    else {
      cp = null;
    }
    
    // Calculate Cpk (Process Performance Index)
    const cpupper = usl !== undefined ? (usl - meanValue) / (3 * stdDev) : 0;
    const cplower = lsl !== undefined ? (meanValue - lsl) / (3 * stdDev) : 0;
    let cpk: number | null;
    if (lsl !== undefined && usl !== undefined) {
      cpk = Math.min(cpupper, cplower); 
    }
    else if (usl !== undefined) {
      cpk = cpupper; 
    }
    else if (lsl !== undefined) {
      cpk = cplower; 
    }
    else {
      cpk = null;
    }
    const pp = null;
    const ppk = null;
  
    return {
      cp: cp !== null && cp > 0 ? cp : null,
      cpk: cpk !== null && cpk > 0 ? cpk : null,
      pp: pp !== null && pp > 0 ? pp : null,
      ppk: ppk !== null && ppk > 0 ? ppk : null
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
  zLSL_LT: number,
  zUSL_LT: number,
  zShortTerm: number,
  zLSL_ST: number,
  zUSL_ST: number,
): {
  longTerm: { yield: number; dpmo: number; percentDefects: number; pdLSL_LT: number; pdUSL_LT: number };
  shortTerm: { yield: number; dpmo: number; percentDefects: number; pdLSL_ST: number; pdUSL_ST: number };
} {
  // Calculate Long Term metrics using zLongTerm
  // For a two-sided specification, defect rate is 2 * P(Z < -|z|)
  const longTermDefectRate = 1 - normalCDF(zLongTerm);
  const longTermYield = (1 - longTermDefectRate) * 100;
  const longTermDpmo = longTermDefectRate * 1000000;
  const longTermPercentDefects = longTermDefectRate * 100;
  const pdlsl_lt = (1 - normalCDF(zLSL_LT))*100;
  const pdusl_lt = (1 - normalCDF(zUSL_LT))*100;

  // Calculate Short Term metrics using zShortTerm
  const shortTermDefectRate = 1 - normalCDF(zShortTerm);
  const shortTermYield = (1 - shortTermDefectRate) * 100;
  const shortTermDpmo = shortTermDefectRate * 1000000;
  const shortTermPercentDefects = shortTermDefectRate * 100;
  const pdlsl_st = (1 - normalCDF(zLSL_ST))*100;
  const pdusl_st = (1 - normalCDF(zUSL_ST))*100;

  return {
    longTerm: {
      yield: Math.max(0, Math.min(100, longTermYield)),
      dpmo: Math.max(0, longTermDpmo),
      percentDefects: Math.max(0, Math.min(100, longTermPercentDefects)),
      pdLSL_LT: pdlsl_lt,
      pdUSL_LT: pdusl_lt
    },
    shortTerm: {
      yield: Math.max(0, Math.min(100, shortTermYield)),
      dpmo: Math.max(0, shortTermDpmo), 
      percentDefects: Math.max(0, Math.min(100, shortTermPercentDefects)),
      pdLSL_ST: pdlsl_st,
      pdUSL_ST: pdusl_st
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
  lsl: number | undefined,
  usl: number | undefined,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  longTerm: { obsyield: number | undefined; obsdpmo: number | undefined;
              obspercentDefects: number | undefined; ZequivLT: number | undefined; 
              obspdLSL_LT: number | undefined; obspdUSL_LT: number | undefined;
              ZequivLSL_LT: number | undefined; ZequivUSL_LT: number | undefined;
            };
  shortTerm: { obsyield: number | undefined; obsdpmo: number | undefined; 
               obspercentDefects: number | undefined; ZequivST: number | undefined; 
               obspdLSL_ST: number | undefined; obspdUSL_ST: number | undefined;
               ZequivLSL_ST: number | undefined; ZequivUSL_ST: number | undefined;
            };
} {
   // Calculate actual defect counts from the data
  function calculateDefectRate (values: number[], lsl: number, usl: number) : {pdLSL: number; pdUSL: number; ptotal: number} {
    if (values.length === 0) return { pdLSL: 0, pdUSL: 0, ptotal: 0, };
    
    const defectCountlsl = values.filter(value => value < lsl).length;
    const defectCountusl = values.filter(value => value > usl).length;
    const defectCounttotal = values.filter(value => value < lsl || value > usl).length;
    //const defectCount = values.filter(value => value < lsl || value > usl).length;
    
    return {
      pdLSL: defectCountlsl / values.length,
      pdUSL: defectCountusl / values.length,
      ptotal: defectCounttotal / values.length,
    };
  };

  // Calculate observed defect rate from actual data
  const observedDefectRate = calculateDefectRate(values, lsl!, usl!);
  // Calculate Long Term metrics using zLongTerm
  // For a two-sided specification, defect rate is 2 * P(Z < -|z|)
  if(dataSetTerm === "Long Term") {
    const longTermDefectRate = observedDefectRate.ptotal;
    const longTermYield = (1 - longTermDefectRate) * 100;
    const longTermDpmo = longTermDefectRate * 1000000;
    const longTermPercentDefects = longTermDefectRate * 100;
    //const longTermobsdefectLSL = observedDefectRate.pdLSL * 100;
    //const longTermobsdefectUSL = observedDefectRate.pdUSL * 100;

    // Calculate Short Term metrics using z-equivalentLongterm and ShortTerm
    //find Z-equivalent of observedDefectRate
    const ZequivLT = inverseNormCDF(1-longTermDefectRate);
    let ZequivLSL_LT: number | undefined;
    if (lsl) {
       ZequivLSL_LT = inverseNormCDF(1-observedDefectRate.pdLSL);
    }
    else {
      ZequivLSL_LT = undefined;
    };
    let ZequivUSL_LT: number | undefined;
    if (usl) {
       ZequivUSL_LT = inverseNormCDF(1-observedDefectRate.pdUSL);
    }
    else {
       ZequivUSL_LT = undefined;
    };
    //const ZequivLSL_LT = inverseNormCDF(1-observedDefectRate.pdLSL);
    //const ZequivUSL_LT = inverseNormCDF(1-observedDefectRate.pdUSL);

    let shortTermYield: number | undefined;
    let shortTermDpmo: number | undefined;
    let shortTermPercentDefects: number | undefined;
    let ZequivST: number | undefined;
    if (zShift>0) {
      ZequivST = ZequivLT + zShift;
      const shortTermDefectRate = 1-normalCDF(ZequivST);
      shortTermYield = (1 - shortTermDefectRate) * 100;
      shortTermDpmo = shortTermDefectRate * 1000000;
      shortTermPercentDefects = shortTermDefectRate * 100;
      return {
        longTerm: {
        obsyield: Math.max(0, Math.min(100, longTermYield)),
        obsdpmo: Math.max(0, longTermDpmo),
        obspercentDefects: Math.max(0, Math.min(100, longTermPercentDefects)),
        ZequivLT:ZequivLT,
        obspdLSL_LT: observedDefectRate.pdLSL * 100,
        obspdUSL_LT: observedDefectRate.pdUSL * 100,
        ZequivLSL_LT: ZequivLSL_LT,
        ZequivUSL_LT: ZequivUSL_LT,
        },
      shortTerm: {
        obsyield: Math.max(0, Math.min(100, shortTermYield)),
        obsdpmo: Math.max(0, shortTermDpmo), 
        obspercentDefects: Math.max(0, Math.min(100, shortTermPercentDefects)),
        ZequivST: ZequivST,
        obspdLSL_ST: undefined,
        obspdUSL_ST: undefined,
        ZequivLSL_ST: undefined,
        ZequivUSL_ST: undefined,
        }
      };
    }
    else {
      // no Z_shift
      // //ZequivST = undefined;
      //shortTermYield = undefined;
      //shortTermDpmo = undefined;
      //shortTermPercentDefects = undefined;
      return {
        longTerm: {
          obsyield: Math.max(0, Math.min(100, longTermYield)),
          obsdpmo: Math.max(0, longTermDpmo),
          obspercentDefects: Math.max(0, Math.min(100, longTermPercentDefects)),
          ZequivLT: ZequivLT,
          obspdLSL_LT: observedDefectRate.pdLSL * 100,
          obspdUSL_LT: observedDefectRate.pdUSL * 100,
          ZequivLSL_LT: ZequivLSL_LT,
          ZequivUSL_LT: ZequivUSL_LT,

        },
        shortTerm: {
          obsyield: undefined,
          obsdpmo: undefined, 
          obspercentDefects: undefined,
          ZequivST: undefined,
          obspdLSL_ST: undefined,
          obspdUSL_ST: undefined,
          ZequivLSL_ST: undefined,
          ZequivUSL_ST: undefined,
        }
      };
    };
  }
  // Short Term data
  else {
    const shortTermDefectRate = observedDefectRate.ptotal;
    const shortTermYield = (1 - shortTermDefectRate) * 100;
    const shortTermDpmo = shortTermDefectRate * 1000000;
    const shortTermPercentDefects = shortTermDefectRate * 100;
    // Calculate Short Term metrics using zShortTerm
    // Calculate Short Term metrics using z-equivalentLongterm and ShortTerm
    //find Z-equivalent of observedDefectRate
    const ZequivST = inverseNormCDF(1-shortTermDefectRate);
    let ZequivLSL_ST: number | undefined;
    if (lsl) {
       ZequivLSL_ST = inverseNormCDF(1-observedDefectRate.pdLSL);
    }
    else {
      ZequivLSL_ST = undefined;
    };
    let ZequivUSL_ST: number | undefined;
    if (usl) {
       ZequivUSL_ST = inverseNormCDF(1-observedDefectRate.pdUSL);
    }
    else {
       ZequivUSL_ST = undefined;
    };
    let longTermYield: number | undefined;
    let longTermDpmo: number | undefined;
    let longTermPercentDefects: number | undefined;
    let ZequivLT: number | undefined;
    if (zShift>0) {
      ZequivLT = ZequivST - zShift; 
      const longTermDefectRate = 1-normalCDF(ZequivLT);
      longTermYield = (1 - longTermDefectRate) * 100;
      longTermDpmo = longTermDefectRate * 1000000;
      longTermPercentDefects = longTermDefectRate * 100;
      return {
        longTerm: {
          obsyield: Math.max(0, Math.min(100, longTermYield)),
          obsdpmo: Math.max(0, longTermDpmo),
          obspercentDefects: Math.max(0, Math.min(100, longTermPercentDefects)),
          ZequivLT: ZequivLT,
          obspdLSL_LT: undefined,
          obspdUSL_LT: undefined,
          ZequivLSL_LT: undefined,
          ZequivUSL_LT: undefined,
        },
        shortTerm: {
          obsyield: Math.max(0, Math.min(100, shortTermYield)),
          obsdpmo: Math.max(0, shortTermDpmo), 
          obspercentDefects: Math.max(0, Math.min(100, shortTermPercentDefects)),
          ZequivST: ZequivST,
          obspdLSL_ST: observedDefectRate.pdLSL * 100,
          obspdUSL_ST: observedDefectRate.pdUSL * 100,
          ZequivLSL_ST: ZequivLSL_ST,
          ZequivUSL_ST: ZequivUSL_ST,
        }
      };
    }
    else
    {
      // no Z_shift
      //ZequivLT = undefined;
      //longTermYield = undefined;
      //longTermDpmo = undefined;
      //longTermPercentDefects = undefined;
    
      return {
        longTerm: {
          obsyield: undefined,
          obsdpmo: undefined,
          obspercentDefects: undefined,
          ZequivLT: undefined,
          obspdLSL_LT: undefined,
          obspdUSL_LT: undefined,
          ZequivLSL_LT: undefined,
          ZequivUSL_LT: undefined,
          
        },
        shortTerm: {
          obsyield: Math.max(0, Math.min(100, shortTermYield)),
          obsdpmo: Math.max(0, shortTermDpmo), 
          obspercentDefects: Math.max(0, Math.min(100, shortTermPercentDefects)),
          ZequivST: ZequivST,
          obspdLSL_ST: observedDefectRate.pdLSL * 100,
          obspdUSL_ST: observedDefectRate.pdUSL * 100,
          ZequivLSL_ST: ZequivLSL_ST,
          ZequivUSL_ST: ZequivUSL_ST,
        }
      };
    };  
  }
}

//--------------------------
/**
 * Normal cumulative distribution function (CDF)
 */
export function normalCDF(x: number): number {
  // Using the complementary error function approximation
  const sign = x >= 0 ? 1 : -1;
  return (0.5 * (1 + sign*erf(Math.abs(x)/ Math.sqrt(2))));
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
  //const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return y;
}

/**
 * Perform Anderson-Darling normality test
 */
export function performNormalityTest(values: number[], meanval: number, stdeviation: number): {
  isNormal: boolean;
  adStatistic: number;
  pValue: number;
} {
  if (values.length < 2) {
    return { isNormal: false, adStatistic: 0, pValue: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  
  // Calculate Anderson-Darling statistic
  
  let AD_value = 0;
  let p_value = 0;
  let sum_s_alter = 0;
  let p=0;
  let log_p = 0;
  let log_1_minus_p = 0;
  let s_alter = 0;
  let Am = 0;


  if (values.length>0)
  {
    for (let i=0;i<values.length;i++)
    {
      let Z=(sorted[i]-meanval)/stdeviation;
      p=normalCDF(Z);
      log_p=Math.log(p);
      log_1_minus_p=Math.log(1-p);
      s_alter=((2*(i+1)-1)*log_p) +((2*(values.length-(i+1))+1)*log_1_minus_p);
      // (((2*B9)-1)*BN9)+((2*($BK$9-B9)+1)*BO9)
      sum_s_alter=sum_s_alter+s_alter;
    }
    AD_value=-values.length-(sum_s_alter/values.length); // AD value -$BK$9-(BV8/$BK$9)
    /* A_power2_prime=AD_values[0]*(1+(4/length)-(25/(length*length))); //BT9*(1+(4/$BK$9)-(25/($BK$9*$BK$9)))*/
    Am=AD_value*(1+(0.75/values.length)+(2.25/(values.length*values.length))); //BT9*(1+(0.75/$BK$9)+(2.25/($BK$9*$BK$9))) 
    /* IF(BT15<0.2,1-EXP(-13.436+101.14*BT15-223.73*BT15^2),
        IF(BT15<0.34,1-EXP(-8.318+42.796*BT15-59.938*BT15^2),
         IF(BT15<0.6,EXP(0.9177-4.279*BT15-1.38*BT15^2),
         IF(1.2937-5.709*BT15+0.0186*BT15^2<$BS$25,EXP(1.2937-5.709*BT15+0.0186*BT15^2),$BT$23)))) */
    if(Am<0.2)
      {
      p_value=1-Math.exp(-13.436+101.14*Am-223.73*Am**2);
      }
    else if (Am<0.34)
      {
      p_value=1-Math.exp(-8.318+42.796*Am-59.938*Am**2);
      }
    else if (Am<0.6)
      {
      p_value=Math.exp(0.9177-4.279*Am-1.38*Am**2);
      }
    else
      {
        p_value=Math.exp(1.2937-5.709*Am+0.0186*Am**2);
      }
  }

  const Threshold = 0.05;
  let isNormal = true;
  if (p_value < Threshold) {
    isNormal= false;
  }
  return { isNormal, adStatistic: AD_value, pValue: p_value };
}

export function calculateMeanConfidenceInterval(mean: number, stdDev: number, n: number, significance: number

): {lower:number; upper:number}
{
  let CI_minus = 0;
  let CI_plus = 0;
  const tCI = jStat.studentt.inv(1 - significance/2, n - 1); // for sample
  const standardError = stdDev / Math.sqrt(n)
  
  CI_minus = mean - tCI * standardError;
  CI_plus = mean + tCI * standardError;

  if (CI_minus > CI_plus) {
    const lowestval = CI_plus;
    CI_plus = CI_minus;
    CI_minus = lowestval;
  }
  
return { lower: CI_minus, upper: CI_plus };
};

export function calculateStdevConfidenceInterval(stdDev: number, n: number, significance: number

): {lower:number; upper:number}
{
  if (n <= 1) {
    throw new Error("Sample size must be greater than 1");
  }
  
  if (stdDev <= 0) {
    throw new Error("Standard deviation must be positive");
  }
  const df = n - 1; // degrees of freedom
  const alpha = significance; // significance level (e.g., 0.05 for 95% CI)
  
  // For standard deviation CI, we use the chi-square distribution
  // The formula is: sqrt((n-1)*s²/χ²) where s² is sample variance
  
  // Chi-square critical values
  const chiSquareUpper = jStat.chisquare.inv(1 - alpha/2, df); // Upper critical value
  const chiSquareLower = jStat.chisquare.inv(alpha/2, df);     // Lower critical value
  
  // Sample variance
  const sampleVariance = stdDev * stdDev;
  
  // Confidence interval for standard deviation
  // Lower bound uses upper chi-square value (inverse relationship)
  const CI_lower = Math.sqrt((df * sampleVariance) / chiSquareUpper);
  
  // Upper bound uses lower chi-square value (inverse relationship)  
  const CI_upper = Math.sqrt((df * sampleVariance) / chiSquareLower);
  
  return { 
    lower: CI_lower, 
    upper: CI_upper 
  };
};

// Method: Wilcoxon Signed-Rank based CI (for symmetric distributions)
export function calculateMedianConfidenceInterval(data: number[], n: number, significance: number
): {lower: number; upper: number} {
  
  if (data.length < 6) {
    throw new Error("Wilcoxon method requires at least 6 data points");
  }
  
  //const n = data.length;
  const sortedData = [...data].sort((a, b) => a - b);
  
  // Calculate all possible pairwise averages (Walsh averages)
  const walshAverages: number[] = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      walshAverages.push((sortedData[i] + sortedData[j]) / 2);
    }
  }
  
  walshAverages.sort((a, b) => a - b);
  
  // Use normal approximation for Wilcoxon critical value
  const z = jStat.normal.inv(1 - significance/2, 0, 1);
  const wilcoxonSE = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const k = Math.floor(n * (n + 1) / 4 - z * wilcoxonSE);
  
  const lowerIndex = Math.max(0, k - 1);
  const upperIndex = Math.min(walshAverages.length - 1, walshAverages.length - k);
  
  return {
    lower: walshAverages[lowerIndex],
    upper: walshAverages[upperIndex],
  };
};

/**
 * Calculate Z-score for Long Term and Short Term based on data term, normality, and specification limits
 */
export function calculateZScoreLongShortTerm(
  values: number[],
  meanVal: number,
  stdDev: number,
  lsl: number | undefined,
  usl: number | undefined,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  zLongTerm: number;
  zLSL_LT: number | undefined;
  zUSL_LT: number | undefined;
  zShortTerm: number;
  zLSL_ST: number | undefined;
  zUSL_ST: number | undefined;
} {
  if (values.length === 0 || stdDev === 0) {
    return {
      zLongTerm: 0,
      zLSL_LT: undefined,
      zUSL_LT: undefined,
      zShortTerm: 0,
      zLSL_ST: undefined,
      zUSL_ST: undefined,
    };
  }
  
  // Calculate Z values based on specification limits
  let zLsl: number | undefined;
  zLsl=undefined;
  let zUsl: number | undefined;
  zUsl= undefined;
  let zTotal=0;
  let pdLSL = 0;
  let pdUSL = 0;
  
  if (lsl !== undefined && !isNaN(lsl)) {
    zLsl = (meanVal - lsl) / stdDev;
    zTotal = zLsl;
    zUsl = undefined;
  }
  
  if (usl !== undefined && !isNaN(usl)) {
    zUsl = (usl - meanVal) / stdDev;
    zTotal = zUsl;
    zLsl= undefined;
  }
  if ((lsl !== undefined && !isNaN(lsl)) && (usl !== undefined && !isNaN(usl))) {
    pdLSL = 1 - normalCDF(zLsl!);
    pdUSL = 1 - normalCDF(zUsl!);
    zTotal = inverseNormCDF(1 - (pdLSL+pdUSL));
  }
  // Take the minimum Z (worst case) - only consider finite values
  //const validZValues = [zLsl, zUsl].filter(z => isFinite(z));
  //const zMinimum = validZValues.length > 0 ? Math.min(...validZValues) : 0;
  
  // Calculate Long Term and Short Term Z scores
  let zLongTerm = 0;
  let zShortTerm = 0;
  let zLSL_LT = undefined;
  let zUSL_LT = undefined;
  let zLSL_ST = undefined;
  let zUSL_ST = undefined;
    
  if (dataSetTerm === "Long Term") {
    // Long term data already includes variation
    zLongTerm = zTotal;
    zLSL_LT = zLsl;
    zUSL_LT = zUsl;
    zShortTerm = zLongTerm + zShift; // Add shift to get short term Z
  } else {
    // Short term data - add shift to get long term
    zShortTerm = zTotal;
    zLongTerm = zShortTerm - zShift; // Subtract shift to get long term Z
    zLSL_ST = zLsl;
    zUSL_ST = zUsl;
    }
  
  return {
    zLongTerm: zLongTerm,
    zLSL_LT: zLSL_LT,
    zUSL_LT: zUSL_LT,
    zShortTerm: zShortTerm,
    zLSL_ST: zLSL_ST,
    zUSL_ST: zUSL_ST,    
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
 * Assess process variation to determine if process is in control and stable
 * @param values Array of data values
 * @returns Process variation assessment object
 */
export function assessProcessVariation(values: number[]): {
  isInControl: boolean;
  isStable: boolean;
  outOfControlPoints: number[];
  unstableRanges: number[];
  individualLimits: { centerLine: number; ucl: number; lcl: number };
  movingRangeLimits: { centerLine: number; ucl: number; lcl: number };
  assessment: string;
} {
  if (values.length < 2) {
    return {
      isInControl: true,
      isStable: true,
      outOfControlPoints: [],
      unstableRanges: [],
      individualLimits: { centerLine: 0, ucl: 0, lcl: 0 },
      movingRangeLimits: { centerLine: 0, ucl: 0, lcl: 0 },
      assessment: "Insufficient data for process variation analysis"
    };
  }

  // Calculate control limits
  const individualLimits = calculateIndividualControlLimits(values);
  const movingRanges = calculateMovingRange(values);
  const movingRangeLimits = calculateMovingRangeControlLimits(values);

  // Check for out of control points (Rule 1: any point exceeds UCL or LCL)
  const outOfControlPoints: number[] = [];
  values.forEach((value, index) => {
    if (value > individualLimits.ucl || value < individualLimits.lcl) {
      outOfControlPoints.push(index + 1); // 1-based indexing for user display
    }
  });

  // Check for unstable ranges (Rule 2: any moving range exceeds MR UCL)
  const unstableRanges: number[] = [];
  movingRanges.forEach((range, index) => {
    if (range > movingRangeLimits.ucl) {
      unstableRanges.push(index + 2); // +2 because moving range starts from point 2
    }
  });

  const isInControl = outOfControlPoints.length === 0;
  const isStable = unstableRanges.length === 0;

  // Generate assessment text
  let assessment = "";
  if (isInControl && isStable) {
    assessment = "Process is in statistical control and stable. All data points and moving ranges are within control limits.";
  } else {
    const issues: string[] = [];
    
    if (!isInControl) {
      issues.push(`Process is OUT OF CONTROL: ${outOfControlPoints.length} data point(s) exceed individual control limits (points: ${outOfControlPoints.join(", ")})`);
    }
    
    if (!isStable) {
      issues.push(`Process is UNSTABLE: ${unstableRanges.length} moving range(s) exceed the moving range UCL (between points: ${unstableRanges.map(p => `${p-1}-${p}`).join(", ")})`);
    }
    
    assessment = issues.join(". ") + ". Process improvement actions are recommended before conducting capability analysis.";
  }

  return {
    isInControl,
    isStable,
    outOfControlPoints,
    unstableRanges,
    individualLimits,
    movingRangeLimits,
    assessment
  };
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
 * Calculates the Z value from a probability of defects
 * @param p Probability/percentage (0 to 1, where 0.01 = 1% defects)
 * @returns Z-score corresponding to the given probability
 */
export function inverseNormCDF(p: number): number {
  // Handle edge cases
  if (p <= 0.00000000000001) return -Infinity;
  if (p >= (1-0.00000000000001)) return Infinity;
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
};
// Helper function to format non-conformity rate values
  export function formatnonconformrate (nonconformrate: number) {
    if (isNaN(nonconformrate) || nonconformrate === null || nonconformrate === undefined) {
      return "N/A";
    }
    const decimalPlaces = nonconformrate === 0  || nonconformrate === null ? 0
      : nonconformrate <= 0.001 ? 6
      : nonconformrate <= 0.01 ? 4
      : nonconformrate <= 0.1 ? 4
      : nonconformrate <= 1 ? 3
      : nonconformrate <= 10 ? 3
      : nonconformrate <= 100 ? 3
      : 0;
  
    return nonconformrate.toFixed(decimalPlaces);
  };

// Helper function to format dpu values
  export function formatdpu (dpu: number) {
    if (isNaN(dpu) || dpu === null || dpu === undefined) {
      return "N/A";
    }
    const decimalPlaces = dpu <= 0.000001 ? 8
      : dpu <= 0.00001 ? 7
      : dpu <= 0.0001 ? 6
      : dpu <= 0.001 ? 5
      : dpu <= 0.10 ? 4
      : dpu <= 1 ? 3
      : 3;
  
    return dpu.toFixed(decimalPlaces);
  };

// Helper functions you'll need to implement:

export function calculate1STCriticalValue(
  significanceLevel: number,
  degreesOfFreedom: number,
  alternative: "Less than" | "Greater than" | "Different"
): number | { lower: number; upper: number } {
  // Validate inputs
  if (significanceLevel <= 0 || significanceLevel >= 1) {
    throw new Error('Significance level must be between 0 and 1');
  }
  if (degreesOfFreedom <= 0) {
    throw new Error('Degrees of freedom must be positive');
  }

  let alpha: number;

  switch (alternative) {
    case "Different":
      // Two-tailed test: split alpha
      alpha = significanceLevel / 2;
      // Get the critical value for upper tail
      const up = jStat.studentt.inv(1 - alpha, degreesOfFreedom);
      const low = jStat.studentt.inv(alpha, degreesOfFreedom);
      if (up<low) {
        return {
          lower: jStat.studentt.inv(1 - alpha, degreesOfFreedom),
          upper: jStat.studentt.inv(alpha, degreesOfFreedom)
        };
      }
      else {
        
      return {
        lower: jStat.studentt.inv(alpha, degreesOfFreedom),
        upper: jStat.studentt.inv(1 - alpha, degreesOfFreedom)
        };
      };

    case "Less than":
      // Left-tailed test: critical value is negative
      return jStat.studentt.inv(significanceLevel, degreesOfFreedom);

    case "Greater than":
      // Right-tailed test: critical value is positive
      return jStat.studentt.inv(1 - significanceLevel, degreesOfFreedom);

    default:
      throw new Error(`Unknown alternative hypothesis: ${alternative}`);
  }
}

export function calculate1SMeanConfidenceInterval(
  mean: number,
  SE: number,
  tCritical: number | {lower: number; upper: number},
  alternative: "Less than" | "Greater than" | "Different"
): { lower: number; upper: number } {
  // Handle one-sided vs two-sided CIs based on alternative
  if (alternative === "Different") {
    // For two-sided test, use the upper critical value (positive t-value)
    const criticalValue = typeof tCritical === 'number' ? Math.abs(tCritical) : Math.abs(tCritical.upper);
    const margin = criticalValue * SE;
    return {
      lower: mean - margin,
      upper: mean + margin
    };
  } else {
    // For one-sided tests, return -Infinity or +Infinity for the unbounded side
    const criticalValue = typeof tCritical === 'number' ? Math.abs(tCritical) : Math.abs(tCritical.upper);
    const margin = criticalValue * SE;
    return alternative === "Less than" 
      ? { lower: -Infinity, upper: mean + margin }
      : { lower: mean - margin, upper: Infinity };
  }
}

export function calculate1SMeanPValue(
  tStatistic: number,
  degreesOfFreedom: number,
  alternative: "Less than" | "Greater than" | "Different"
): number {
  // Get the cumulative probability up to the t-statistic
  const cumulativeProbability = jStat.studentt.cdf(
    Math.abs(tStatistic), // jStat uses absolute value
    degreesOfFreedom
  );

  let pValue: number;

  switch (alternative) {
    case "Less than":
      // Left-tailed test: P(T ≤ t)
      pValue = jStat.studentt.cdf(tStatistic, degreesOfFreedom);
      break;

    case "Greater than":
      // Right-tailed test: P(T ≥ t) = 1 - P(T ≤ t)
      pValue = 1 - jStat.studentt.cdf(tStatistic, degreesOfFreedom);
      break;

    case "Different":
      // Two-tailed test: 2 * P(T ≥ |t|)
      pValue = 2 * (1 - cumulativeProbability);
      break;

    default:
      throw new Error(`Unknown alternative hypothesis: ${alternative}`);
  }

  // Ensure p-value is between 0 and 1
  return Math.min(1, Math.max(0, pValue));
}

export function calculate1SvarChiSquareValue(
  df: number,
  sampleVariance: number,
  targetstdev: number,  
): number {
  return (df * sampleVariance) / (targetstdev*targetstdev);
}

export function calculate1SvarChiSquareCriticalValue(
  significance: number,
  df: number,
  alternative: "Less than" | "Greater than" | "Different"
): number | { lower: number; upper: number } {
  switch (alternative) {
    case "Less than":
      // Left-tailed test: χ²(α, df)
      return chiSquareInverse(significance, df);
    
    case "Greater than":
      // Right-tailed test: χ²(1-α, df)
      return chiSquareInverse(1 - significance, df);
    
    case "Different":
      // Two-tailed test: χ²(α/2, df) and χ²(1-α/2, df)
      return {
        lower: chiSquareInverse(1 - significance / 2, df),
        upper: chiSquareInverse(significance / 2, df)
      };
    
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

/**
 * Calculate the p-value for chi-square test
 * @param chiSquareStatistic - Chi-square test statistic
 * @param df - Degrees of freedom
 * @param alternative - Alternative hypothesis type
 * @returns p-value
 */
export function calculate1SvarChiSquarePValue(
  chiSquareStatistic: number,
  df: number,
  alternative: "Less than" | "Greater than" | "Different"
): number {
  switch (alternative) {
    case "Less than":
      // P(χ² ≤ test statistic)
      return 1 - chiSquareCDF(chiSquareStatistic, df);
    
    case "Greater than":
      // P(χ² ≥ test statistic)
      return chiSquareCDF(chiSquareStatistic, df);
    
    case "Different":
      // Two-tailed: 2 × min(P(χ² ≤ test statistic), P(χ² ≥ test statistic))
      const leftTail = chiSquareCDF(chiSquareStatistic, df);
      const rightTail = 1 - leftTail;
      return 2 * Math.min(leftTail, rightTail);
    
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

/**
 * Calculate confidence interval for variance
 * @param sampleVariance - Sample variance
 * @param significance - Significance level
 * @param df - Degrees of freedom
 * @returns Confidence interval for variance
 */
export function calculate1SvarChiSquareConfidenceInterval(
  sampleVariance: number,
  significance: number,
  df: number,
  alternative: "Less than" | "Greater than" | "Different"
): { lower: number; upper: number } {
  const alpha = significance;
  if (alternative === "Greater than") {
    
    const chiSquareLower = chiSquareInverse(alpha / 2, df);
    return {
      lower: Math.sqrt((df * sampleVariance) / chiSquareLower),
      upper: Infinity
      };
  }
  else if (alternative === "Less than") {
    const chiSquareUpper = chiSquareInverse(1 - alpha / 2, df);
    return {
      lower: 0,
      upper:  Math.sqrt((df * sampleVariance) / chiSquareUpper)
      };
  }
  else{
    const chiSquareUpper = chiSquareInverse(1 - alpha / 2, df);
    const chiSquareLower = chiSquareInverse(alpha / 2, df);
    return {
      lower:  Math.sqrt((df * sampleVariance) / chiSquareLower),
      upper:  Math.sqrt((df * sampleVariance) / chiSquareUpper)
      };
  }
  
}

// Helper functions for chi-square distribution
/**
 * Chi-square cumulative distribution function
 * Using approximation for chi-square CDF
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (df <= 0) throw new Error("Degrees of freedom must be positive");
  
  // Use gamma function relationship: χ²(df) = 2 × Gamma(df/2, 2)
  // For simplicity, using Wilson-Hilferty approximation
  const h = 2 / (9 * df);
  const z = (Math.pow(x / df, 1/3) - 1 + h) / Math.sqrt(h);
  
  return 1-normalCDF(z);
}

/**
 * Chi-square inverse cumulative distribution function
 * Approximation using Newton-Raphson method
 */
function chiSquareInverse(p: number, df: number): number {
  if (p <= 0 || p >= 1) throw new Error("Probability must be between 0 and 1");
  if (df <= 0) throw new Error("Degrees of freedom must be positive");
  
  // Initial guess using Wilson-Hilferty transformation
  const h = 2 / (9 * df);
  const z = inverseNormCDF(1-p);
  let x = df * Math.pow(1 - h + z * Math.sqrt(h), 3);
  
  // Newton-Raphson iterations
  for (let i = 0; i < 10; i++) {
    const fx = chiSquareCDF(x, df) - p;
    const fpx = chiSquarePDF(x, df);
    
    if (Math.abs(fx) < 1e-10) break;
    
    x = x - fx / fpx;
    if (x <= 0) x = 0.001; // Keep positive
  }
  
  return x;
}

/**
 * Chi-square probability density function
 */
function chiSquarePDF(x: number, df: number): number {
  if (x <= 0) return 0;
  
  const k = df / 2;
  const coefficient = Math.pow(x, k - 1) * Math.exp(-x / 2);
  const denominator = Math.pow(2, k) * gamma(k);
  
  return coefficient / denominator;
}

/**
 * Gamma function approximation using Lanczos approximation
 */
function gamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
             771.32342877765313, -176.61502916214059, 12.507343278686905,
             -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  const sqrt2pi = Math.sqrt(2 * Math.PI);
  
  return sqrt2pi * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
};

interface PowerAnalysisResult {
  sampleSize: number;
  actualPower: number;
}

export function calculate1SMeanSampleSize(
  power1SMeanPower: string,
  power1SMeanHa: string,
  power1SMeanMean: number,
  power1SMeanH0: number,
  power1SMeanStdev: number,
  power1SMeanAlpha: string
): PowerAnalysisResult {
  const oneSMeanPower = parseFloat(power1SMeanPower);
  const oneSMeanAlpha = parseFloat(power1SMeanAlpha);

  // Input validation
  if (oneSMeanPower <= 0 || oneSMeanPower >= 1) {
    throw new Error("Power must be between 0 and 1");
  }
  if (oneSMeanAlpha <= 0 || oneSMeanAlpha >= 1) {
    throw new Error("Alpha must be between 0 and 1");
  }
  if (power1SMeanStdev <= 0) {
    return { sampleSize: 0, actualPower: 0 };
  }

  // Calculate effect size
  const effectSize = Math.abs(power1SMeanMean - power1SMeanH0) / power1SMeanStdev;

  // Critical values
  let zAlpha: number;
  let zBeta: number;

  switch (power1SMeanHa) {
    case "<":
      zAlpha = jStat.normal.inv(oneSMeanAlpha, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
    case ">":
      zAlpha = jStat.normal.inv(1 - oneSMeanAlpha, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
    case "≠":
    default:
      zAlpha = jStat.normal.inv(1 - oneSMeanAlpha / 2, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
  }
    
    // Calculate initial sample size using normal approximation
    let n: number;
    
    if (power1SMeanHa === "≠") {
      // Two-tailed test
      n = Math.pow((zAlpha + zBeta) / effectSize, 2);
    } else {
      // One-tailed test
      n = Math.pow((Math.abs(zAlpha) + zBeta) / effectSize, 2);
    }
    
    // Round up to next integer for initial estimate
    n = Math.ceil(n);
    
    // Iterative refinement using t-distribution
    // Start with normal approximation and refine using actual t-distribution
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;
    let actualPower = 0;
    
    while (!converged && iterations < maxIterations) {
      const df = n - 1;
      let tAlpha: number;
      
      // Get t-critical values
      switch (power1SMeanHa) {
        case "<":
          tAlpha = jStat.studentt.inv(oneSMeanAlpha, df);
          break;
          
        case ">":
          tAlpha = jStat.studentt.inv(1 - oneSMeanAlpha, df);
          break;
          
        case "≠":
        default:
          tAlpha = jStat.studentt.inv(1 - oneSMeanAlpha / 2, df);
          break;
      }
      
      // Calculate non-centrality parameter
      const delta = effectSize * Math.sqrt(n);
      
      // Calculate actual power with current n
      //let actualPower: number;
      
      if (power1SMeanHa === "≠") {
        // Two-tailed test - power is more complex for non-central t
        // Approximate using Student
        const criticalValue = Math.abs(tAlpha);
        {/*
          actualPower = 1 - jStat.normal.cdf(criticalValue - delta, 0, 1) + 
                    jStat.normal.cdf(-criticalValue - delta, 0, 1); */}
          actualPower = 1 - jStat.studentt.cdf(criticalValue - delta, df) + 
                    jStat.studentt.cdf(-criticalValue - delta, df);
          
      } else {
        // One-tailed test
        if (power1SMeanMean > power1SMeanH0) {
          actualPower = 1 - jStat.studentt.cdf(tAlpha - delta, df);
        } else {
          actualPower = jStat.studentt.cdf(tAlpha + delta, df);
        }
      }
      
      // Check convergence
      if (Math.abs(actualPower - oneSMeanPower) < 0.001) {
        converged = true;
      } else if (actualPower < oneSMeanPower) {
        n += 1;
      } else {
        converged = true; // Close enough
      }
      
      iterations++;
    }
    
    // Ensure minimum sample size
    n = Math.max(n, 2);
    
    //return { sampleSize: Math.ceil(n) };
    return {
    sampleSize: n,
    actualPower: actualPower
    };
};

export function calculate1SVarianceSampleSize(
  power1SVariancePower: string,
  power1SVarianceHa: string,
  power1SVarianceStdev: number,
  power1SVarianceH0: number,
  power1SVarianceAlpha: string
): PowerAnalysisResult {
  const oneSVariancePower = parseFloat(power1SVariancePower);
  const oneSVarianceAlpha = parseFloat(power1SVarianceAlpha);

  // Input validation
  if (oneSVariancePower <= 0 || oneSVariancePower >= 1) {
    //throw new Error("Power must be between 0 and 1");
    return { sampleSize: 0, actualPower: 0 };
  }
  if (oneSVarianceAlpha <= 0 || oneSVarianceAlpha >= 1) {
    //throw new Error("Alpha must be between 0 and 1");
    return { sampleSize: 0, actualPower: 0 };
  }
  if (power1SVarianceStdev === power1SVarianceH0) {
    return { sampleSize: 0, actualPower: 0 };
  }
  // Calculate variance ratio
  const sigma0Squared = power1SVarianceH0 * power1SVarianceH0;  // H0 variance
  const sigma1Squared = power1SVarianceStdev * power1SVarianceStdev;  // H1 variance
  const varianceRatio = sigma1Squared / sigma0Squared;

  /**
   * Calculate power for a given sample size using Chi-square distribution
   * Test statistic: χ² = (n-1)s²/σ₀² ~ χ²(n-1) under H0
   * Under H1: χ² ~ χ²(n-1, λ) where λ is non-centrality parameter
   */
  function calculatePowerForN(n: number): number {
    if (n < 2) return 0; // Need at least 2 observations for variance test
    
    const df = n - 1; // degrees of freedom
    
    try {
      // Find critical values under H0
      let criticalLower: number, criticalUpper: number;
      
      switch (power1SVarianceHa) {
        case "<":
          // H1: σ² < σ₀² (left-tailed test)
          criticalLower = jStat.chisquare.inv(oneSVarianceAlpha, df);
          criticalUpper = Infinity;
          break;
        case ">":
          // H1: σ² > σ₀² (right-tailed test)
          criticalUpper = jStat.chisquare.inv(1 - oneSVarianceAlpha, df);
          criticalLower = 0;
          break;
        case "≠":
        default:
          // Two-sided test: split alpha
          const alphaPerSide = oneSVarianceAlpha / 2;
          criticalLower = jStat.chisquare.inv(alphaPerSide, df);
          criticalUpper = jStat.chisquare.inv(1 - alphaPerSide, df);
          break;
      }
      
      // Calculate power under alternative hypothesis
      // Under H1, the test statistic follows a scaled chi-square distribution
      // χ² = (n-1)s²/σ₀² has distribution (1/varianceRatio) * χ²(n-1) under H1
      
      let power = 0;
      
      switch (power1SVarianceHa) {
        case "<":
          // Power = P(χ² < criticalLower/varianceRatio) under H1
          const scaledLowerLess = criticalLower / varianceRatio;
          power = jStat.chisquare.cdf(scaledLowerLess, df);
          break;
        case ">":
          // Power = P(χ² > criticalUpper/varianceRatio) under H1
          const scaledUpperGreater = criticalUpper / varianceRatio;
          power = 1 - jStat.chisquare.cdf(scaledUpperGreater, df);
          break;
        case "≠":
        default:
          // Power = P(χ² < criticalLower/varianceRatio) + P(χ² > criticalUpper/varianceRatio)
          const scaledLower = criticalLower / varianceRatio;
          const scaledUpper = criticalUpper / varianceRatio;
          
          const powerLower = jStat.chisquare.cdf(scaledLower, df);
          const powerUpper = 1 - jStat.chisquare.cdf(scaledUpper, df);
          power = powerLower + powerUpper;
          break;
      }
      
      return Math.max(0, Math.min(1, power));
      
    } catch (error) {
      console.error("Error calculating power:", error);
      return 0;
    }
  }

  // Binary search for minimum sample size that achieves desired power
  let lowerBound = 2;
  let upperBound = 50;
  
  // First, find a reasonable upper bound
  while (calculatePowerForN(upperBound) < oneSVariancePower && upperBound < 10000) {
    upperBound = Math.min(upperBound * 2, upperBound + 100);
  }
  
  // If we couldn't reach desired power even with large sample
  if (calculatePowerForN(upperBound) < oneSVariancePower) {
    // Try with maximum reasonable sample size
    upperBound = 10000;
    const maxPower = calculatePowerForN(upperBound);
    if (maxPower < oneSVariancePower) {
      // Return the maximum achievable power
      return {
        sampleSize: upperBound,
        actualPower: Math.round(maxPower * 10000) / 10000
      };
    }
  }
  
  // Binary search for optimal sample size
  let bestN = upperBound;
  
  while (upperBound - lowerBound > 1) {
    const midN = Math.floor((lowerBound + upperBound) / 2);
    const power = calculatePowerForN(midN);
    
    if (power >= oneSVariancePower) {
      bestN = midN;
      upperBound = midN;
    } else {
      lowerBound = midN;
    }
  }
  
  // Check both bounds to ensure we have the minimum n
  const powerLower = calculatePowerForN(lowerBound);
  const powerUpper = calculatePowerForN(upperBound);
  
  if (powerLower >= oneSVariancePower) {
    bestN = lowerBound;
  } else if (powerUpper >= oneSVariancePower) {
    bestN = upperBound;
  }
  
  // Calculate final actual power
  const actualPower = calculatePowerForN(bestN);
  
  return {
    sampleSize: bestN,
    actualPower: Math.round(actualPower * 10000) / 10000
  };
}

export function calculate2SMeanSampleSize(
  power2SMeanPower: string,
  power2SMeanHa: string,
  power2SMeanMean1: number,
  power2SMeanMean2: number,
  power2SMeanStdev: number,
  power2SMeanAlpha: string
): PowerAnalysisResult {
  const targetPower = parseFloat(power2SMeanPower);
  const alpha = parseFloat(power2SMeanAlpha);

  // Input validation
  if (targetPower <= 0 || targetPower >= 1) {
    throw new Error("Power must be between 0 and 1");
  }
  if (alpha <= 0 || alpha >= 1) {
    throw new Error("Alpha must be between 0 and 1");
  }
  if (power2SMeanStdev <= 0) {
    return { sampleSize: 0, actualPower: 0 };
  }

    // Calculate effect size (Cohen's d)
  const meanDifference = Math.abs(power2SMeanMean1 - power2SMeanMean2);
  const effectSize = meanDifference / power2SMeanStdev;

  // Determine direction for one-sided tests
  const isGroup1Greater = power2SMeanMean1 > power2SMeanMean2;

  /**
   * Calculate critical t-values for given degrees of freedom and alpha
   */
  function getCriticalValues(df: number): { tLower: number, tUpper: number } {
    let tLower = -Infinity;
    let tUpper = Infinity;

    switch (power2SMeanHa) {
      case "<":
        // H1: μ₁ < μ₂
        tLower = jStat.studentt.inv(alpha, df);
        break;
      case ">":
        // H1: μ₁ > μ₂
        tUpper = jStat.studentt.inv(1 - alpha, df);
        break;
      case "≠":
      default:
        // H1: μ₁ ≠ μ₂
        tLower = jStat.studentt.inv(alpha / 2, df);
        tUpper = jStat.studentt.inv(1 - alpha / 2, df);
        break;
    }

    return { tLower, tUpper };
  }

  /**
   * Calculate power for a given sample size per group
   * Uses non-central t-distribution approach
   */
  function calculatePowerForN(nPerGroup: number): number {
    if (nPerGroup < 2) return 0; // Need at least 2 per group
    
    const df = 2 * nPerGroup - 2; // degrees of freedom for two-sample t-test
    const standardError = power2SMeanStdev * Math.sqrt(2 / nPerGroup); // SE of difference
    
    try {
      // Calculate non-centrality parameter
      const delta = meanDifference / standardError;
      
      // Apply direction for one-sided tests
      const signedDelta = (power2SMeanHa === "<") 
        ? (isGroup1Greater ? -delta : delta)
        : (isGroup1Greater ? delta : -delta);

      const { tLower, tUpper } = getCriticalValues(df);
      
      let power = 0;

      switch (power2SMeanHa) {
        case "<":
          // Power = P(T < tLower | H1 true)
          // Under H1, T ~ t(df, δ) where δ is non-centrality parameter
          // Approximate using normal distribution for large df
          if (df >= 30) {
            const adjustedT = (tLower - signedDelta);
            power = jStat.normal.cdf(adjustedT, 0, 1);
          } else {
            // For small df, use approximation
            const adjustedT = (tLower - signedDelta) / Math.sqrt(1 + signedDelta * signedDelta / (2 * df));
            power = jStat.studentt.cdf(adjustedT, df);
          }
          break;

        case ">":
          // Power = P(T > tUpper | H1 true)
          if (df >= 30) {
            const adjustedT = (tUpper - signedDelta);
            power = 1 - jStat.normal.cdf(adjustedT, 0, 1);
          } else {
            const adjustedT = (tUpper - signedDelta) / Math.sqrt(1 + signedDelta * signedDelta / (2 * df));
            power = 1 - jStat.studentt.cdf(adjustedT, df);
          }
          break;

        case "≠":
        default:
          // Power = P(T < tLower | H1) + P(T > tUpper | H1)
          if (df >= 30) {
            const adjustedTLower = (tLower - signedDelta);
            const adjustedTUpper = (tUpper - signedDelta);
            const powerLower = jStat.normal.cdf(adjustedTLower, 0, 1);
            const powerUpper = 1 - jStat.normal.cdf(adjustedTUpper, 0, 1);
            power = powerLower + powerUpper;
          } else {
            const adjustmentFactor = Math.sqrt(1 + signedDelta * signedDelta / (2 * df));
            const adjustedTLower = (tLower - signedDelta) / adjustmentFactor;
            const adjustedTUpper = (tUpper - signedDelta) / adjustmentFactor;
            const powerLower = jStat.studentt.cdf(adjustedTLower, df);
            const powerUpper = 1 - jStat.studentt.cdf(adjustedTUpper, df);
            power = powerLower + powerUpper;
          }
          break;
      }
      
      return Math.max(0, Math.min(1, power));
      
    } catch (error) {
      console.error("Error calculating power:", error);
      return 0;
    }
  }

  /**
   * Alternative approach using standard power formula
   * More reliable for most practical scenarios
   */
  function calculatePowerForNSimple(nPerGroup: number): number {
    if (nPerGroup < 2) return 0;
    
    const df = 2 * nPerGroup - 2;
    
    try {
      // Standard error of the difference between means
      const se = power2SMeanStdev * Math.sqrt(2 / nPerGroup);
      
      // Standardized effect size
      const delta = meanDifference / se;
      
      let tCritical: number;
      let power = 0;

      switch (power2SMeanHa) {
        case "<":      
          tCritical = jStat.studentt.inv(alpha, df);
          // Power calculation for one-sided test
          power = jStat.normal.cdf((tCritical + delta), 0, 1);
          break;

        case ">":        
          tCritical = jStat.studentt.inv(1 - alpha, df);
          // Power calculation for one-sided test
          power = 1 - jStat.normal.cdf((tCritical - delta), 0, 1);
          break;

        case "≠":
        default:
          tCritical = jStat.studentt.inv(1 - alpha / 2, df);
          // Power calculation for two-sided test
          const powerUpper = 1 - jStat.normal.cdf((tCritical - delta), 0, 1);
          const powerLower = jStat.normal.cdf((-tCritical - delta), 0, 1);
          power = powerUpper + powerLower;
          break;
      }
      
      return Math.max(0, Math.min(1, power));
      
    } catch (error) {
      console.error("Error in simple power calculation:", error);
      return 0;
    }
  }

  // Binary search for minimum sample size that achieves desired power
  let lowerBound = 2;
  let upperBound = 50;
  
  // Find reasonable upper bound
  while (calculatePowerForNSimple(upperBound) < targetPower && upperBound < 10000) {
    upperBound = Math.min(upperBound * 2, upperBound + 100);
  }
  
  // If we couldn't reach desired power even with large sample
  if (calculatePowerForNSimple(upperBound) < targetPower) {
    upperBound = 10000;
    const maxPower = calculatePowerForNSimple(upperBound);
    if (maxPower < targetPower) {
      return {
        sampleSize: upperBound,
        actualPower: Math.round(maxPower * 10000) / 10000
      };
    }
  }
  
  // Binary search for optimal sample size
  let bestN = upperBound;
  
  while (upperBound - lowerBound > 1) {
    const midN = Math.floor((lowerBound + upperBound) / 2);
    const power = calculatePowerForNSimple(midN);
    
    if (power >= targetPower) {
      bestN = midN;
      upperBound = midN;
    } else {
      lowerBound = midN;
    }
  }
  
  // Check both bounds to ensure we have the minimum n
  const powerLower = calculatePowerForNSimple(lowerBound);
  const powerUpper = calculatePowerForNSimple(upperBound);
  
  if (powerLower >= targetPower) {
    bestN = lowerBound;
  } else if (powerUpper >= targetPower) {
    bestN = upperBound;
  }
  
  // Calculate final actual power
  const actualPower = calculatePowerForNSimple(bestN);
  
  return {
    sampleSize: bestN, // Sample size per group
    actualPower: Math.round(actualPower * 10000) / 10000
  };
};

export function calculate2SVarianceSampleSize(
  power2SVariancePower: string,
  power2SVarianceHa: string,
  power2SVarianceStdev1: number,
  power2SVarianceStdev2: number,
  power2SVarianceAlpha: string
): PowerAnalysisResult {
  const targetPower = parseFloat(power2SVariancePower);
  const alpha = parseFloat(power2SVarianceAlpha);

  // Input validation
  if (targetPower <= 0 || targetPower >= 1) {
    //throw new Error("Power must be between 0 and 1");
    return { sampleSize: 0, actualPower: 0 };
  }
  if (alpha <= 0 || alpha >= 1) {
    //throw new Error("Alpha must be between 0 and 1");
    return { sampleSize: 0, actualPower: 0 };
  }
  if (typeof power2SVarianceStdev1 !== 'number' || isNaN(power2SVarianceStdev1) || power2SVarianceStdev1 <= 0) {
    return { sampleSize: 0, actualPower: 0 };
  }
  
  if (typeof power2SVarianceStdev2 !== 'number' || isNaN(power2SVarianceStdev2) || power2SVarianceStdev2 <= 0) {
    return { sampleSize: 0, actualPower: 0 };
  }
  
  if (power2SVarianceStdev1 === power2SVarianceStdev2) {
    return { sampleSize: 0, actualPower: 0 };
  }
  // Calculate variance ratio
  const sigma1Squared = power2SVarianceStdev1 * power2SVarianceStdev1;
  const sigma2Squared = power2SVarianceStdev2 * power2SVarianceStdev2;
  const varianceRatio = sigma1Squared / sigma2Squared; // σ₁²/σ₂²

  /**
   * Calculate critical F-values for given degrees of freedom and alpha
   */
  function getCriticalValues(df1: number, df2: number): { fLower: number, fUpper: number } {
    let fLower = 0;
    let fUpper = Infinity;

    try {
      switch (power2SVarianceHa) {
        case "<":
          // H1: σ₁² < σ₂² (left-tailed test)
          fUpper = jStat.centralF.inv(alpha, df1, df2);
          break;
        case ">":
          // H1: σ₁² > σ₂² (right-tailed test)
          fLower = jStat.centralF.inv(1 - alpha, df1, df2);
          break;
        case "≠":
        default:
          // H1: σ₁² ≠ σ₂² (two-tailed test)
          fLower = jStat.centralF.inv(alpha / 2, df1, df2);
          fUpper = jStat.centralF.inv(1 - alpha / 2, df1, df2);
          break;
      }
    } catch (error) {
      console.error("Error calculating critical F-values:", error);
    }

    return { fLower, fUpper };
  }

  /**
   * Calculate power for a given sample size per group
   * Uses F-distribution with variance ratio scaling
   */
  function calculatePowerForN(nPerGroup: number): number {
    if (nPerGroup < 2) return 0; // Need at least 2 per group
    
    const df1 = nPerGroup - 1; // degrees of freedom for group 1
    const df2 = nPerGroup - 1; // degrees of freedom for group 2
    
    try {
      const { fLower, fUpper } = getCriticalValues(df1, df2);
      
      // Under H1, the test statistic F = (s₁²/σ₁²) / (s₂²/σ₂²) * (σ₁²/σ₂²)
      // follows a scaled F-distribution
      
      let power = 0;

      switch (power2SVarianceHa) {
        case "<":
          // Power = P(F < fUpper/varianceRatio | H1)
          // Under H1, F is scaled by varianceRatio
          const scaledFUpperLess = fUpper / varianceRatio;
          power = jStat.centralF.cdf(scaledFUpperLess, df1, df2);
          break;

        case ">":
          // Power = P(F > fLower/varianceRatio | H1)
          const scaledFLowerGreater = fLower / varianceRatio;
          power = 1 - jStat.centralF.cdf(scaledFLowerGreater, df1, df2);
          break;

        case "≠":
        default:
          // Power = P(F < fLower/varianceRatio) + P(F > fUpper/varianceRatio | H1)
          const scaledFLower = fLower / varianceRatio;
          const scaledFUpper = fUpper / varianceRatio;
          
          const powerLower = jStat.centralF.cdf(scaledFLower, df1, df2);
          const powerUpper = 1 - jStat.centralF.cdf(scaledFUpper, df1, df2);
          power = powerLower + powerUpper;
          break;
      }
      
      return Math.max(0, Math.min(1, power));
      
    } catch (error) {
      console.error("Error calculating power:", error);
      return 0;
    }
  }

  // Binary search for minimum sample size that achieves desired power
  let lowerBound = 2;
  let upperBound = 50;
  
  // Find reasonable upper bound
  while (calculatePowerForN(upperBound) < targetPower && upperBound < 5000) {
    upperBound = Math.min(upperBound * 2, upperBound + 100);
  }
  
  // If we couldn't reach desired power even with large sample
  if (calculatePowerForN(upperBound) < targetPower) {
    upperBound = 5000;
    const maxPower = calculatePowerForN(upperBound);
    if (maxPower < targetPower) {
      return {
        sampleSize: upperBound,
        actualPower: Math.round(maxPower * 10000) / 10000
      };
    }
  }
  
  // Binary search for optimal sample size
  let bestN = upperBound;
  
  while (upperBound - lowerBound > 1) {
    const midN = Math.floor((lowerBound + upperBound) / 2);
    const power = calculatePowerForN(midN);
    
    if (power >= targetPower) {
      bestN = midN;
      upperBound = midN;
    } else {
      lowerBound = midN;
    }
  }
  
  // Check both bounds to ensure we have the minimum n
  const powerLower = calculatePowerForN(lowerBound);
  const powerUpper = calculatePowerForN(upperBound);
  
  if (powerLower >= targetPower) {
    bestN = lowerBound;
  } else if (powerUpper >= targetPower) {
    bestN = upperBound;
  }
  
  // Calculate final actual power
  const actualPower = calculatePowerForN(bestN);
  
  return {
    sampleSize: bestN, // Sample size per group
    actualPower: Math.round(actualPower * 10000) / 10000
  };
};

export function calculate2StCriticalValue(
  significance: number,
  degreesOfFreedom: number,
  alternativemean: "Less than" | "Greater than" | "Different"
): number | { lower: number; upper: number } {
  // Validate inputs
  if (significance <= 0 || significance >= 1) {
    throw new Error('Significance level must be between 0 and 1');
  }
  if (degreesOfFreedom <= 0) {
    throw new Error('Degrees of freedom must be positive');
  }
    
    // Calculate critical values and p-value based on alternative hypothesis using jStat
  let tCriteria: number | {lower: number; upper: number};
  
  switch (alternativemean) {
    case "Less than":
      // H1: μ1 - μ2 < δ0 (left-tailed)
      tCriteria = jStat.studentt.inv(significance, degreesOfFreedom);
      break;
      
    case "Greater than":
      // H1: μ1 - μ2 > δ0 (right-tailed)
      tCriteria = jStat.studentt.inv(1 - significance, degreesOfFreedom);
      break;
      
    case "Different":
      // H1: μ1 - μ2 ≠ δ0 (two-tailed)
      const tCrit = jStat.studentt.inv(1 - significance/2, degreesOfFreedom);
      tCriteria = {lower: -tCrit, upper: tCrit};
      break;
      
    default:
      throw new Error("Invalid alternative hypothesis");
  }
  return tCriteria;
  };

export function calculate2SMeanPValue(
  tStatistic: number,
  degreesOfFreedom: number,
  alternativemean: "Less than" | "Greater than" | "Different"
): number {
  // Validate inputs
  if (degreesOfFreedom <= 0) {
    throw new Error('Degrees of freedom must be positive');
  }
    
    // Calculate critical values and p-value based on alternative hypothesis using jStat
  let tp_Value: number;
  
  switch (alternativemean) {
    case "Less than":
      // H1: μ1 - μ2 < δ0 (left-tailed)
      tp_Value = jStat.studentt.cdf(tStatistic, degreesOfFreedom);
      break;
      
    case "Greater than":
      // H1: μ1 - μ2 > δ0 (right-tailed)
      tp_Value = 1 - jStat.studentt.cdf(tStatistic, degreesOfFreedom);
      break;
      
    case "Different":
      // H1: μ1 - μ2 ≠ δ0 (two-tailed)
      tp_Value = 2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), degreesOfFreedom));
      break;
      
    default:
      throw new Error("Invalid alternative hypothesis");
  }
  return tp_Value;
};

export function calculate2SDiffConfidenceInterval(
    difference: number,
      pooledSE: number,
      tCriteria:  number | { lower: number; upper: number }, 
      alternativemean: "Less than" | "Greater than" | "Different",
): { lower1: number; upper1: number } {
  // Validate inputs
  let diffCI_minus: number = 0;
  let diffCI_plus: number = 0;

  switch(alternativemean) {
    case "Less than":
      // H1: μ1 - μ2 < δ0 (left-tailed)      
      diffCI_minus = -Infinity; // No upper limit for left-tailed
      if (typeof tCriteria === 'number') {
        diffCI_plus = difference + tCriteria * pooledSE; 
      }
      break;  

    case "Greater than":
      // H1: μ1 - μ2 > δ0 (right-tailed)
      if (typeof tCriteria === 'number') {
        diffCI_minus = difference - tCriteria * pooledSE;
      }
      diffCI_plus = Infinity; // No upper limit for right-tailed
      break;

    case "Different":
      // H1: μ1 - μ2 ≠ δ0 (two-tailed)
      // H1: μ1 - μ2 > δ0 (right-tailed)

      // Calculate confidence intervals for means difference
      if (typeof tCriteria === 'object') {
        // Two-tailed case
        diffCI_minus = difference - tCriteria.upper * pooledSE;
        diffCI_plus = difference + tCriteria.upper * pooledSE;
      };
      break;
    default:
      // Calculate confidence intervals for means difference
      if (typeof tCriteria === 'object') {
        // Two-tailed case
        diffCI_minus = difference - tCriteria.upper * pooledSE;
        diffCI_plus = difference + tCriteria.upper * pooledSE;
      }
      else{
        diffCI_minus = difference - tCriteria * pooledSE;
        diffCI_plus = difference + tCriteria * pooledSE;
      };
      break;
  }
   
  if (diffCI_minus > diffCI_plus) {
    const low = diffCI_plus;
    diffCI_plus = diffCI_minus;
    diffCI_minus = low;   
  }

  return {
    lower1: diffCI_minus,
    upper1: diffCI_plus,
  };
};
// Helper function to calculate sample statistics
export function calculateSampleStats(data: number[]) {
  const n = data.length;
  const mean = jStat.mean(data);
  const variance = jStat.variance(data); // true for sample variance (n-1)
  const standardError = Math.sqrt(variance / n);
  
  return { mean, variance, standardError, n };
}

// F-test for equality of variances using proper F-distribution
export function testEqualVariances(var1: number, var2: number, n1: number, n2: number, alpha: number) {
  // Calculate F-stat value using jStat
  const fStat = Math.max(var1, var2) / Math.min(var1, var2);

  // Calculate F-critical value using jStat
  const df1 = Math.max(var1, var2) === var1 ? n1 - 1 : n2 - 1;
  const df2 = Math.max(var1, var2) === var1 ? n2 - 1 : n1 - 1;
  
  // Calculate critical value for F-distribution
  const fCritical = jStat.centralF.inv(1 - alpha/2, df1, df2); 

  // Calculate p-Value for F-distribution wit a 2-tailed test
  const pValue = 2 * (1 - jStat.centralF.cdf(fStat, df1, df2));

  return {fStat, fCritical, pValue, equalVariances: fStat <= fCritical};
}
// Helper function implementations using jStat

export function calculate2SvarFischerValue(var1: number, var2: number, ratioVariance0: number): number {
  // F-statistic for Fischer test: (s1²/s2²) / ratio0
  const observedRatio = var1 / var2;
  return observedRatio / ratioVariance0;
}

export function calculate2SvarFischerCriticalValue(significance: number, df1: number, df2: number, alternativevariance: string): number | {lower: number; upper: number} {
  switch (alternativevariance) {
    case "Less than":
      // Left-tailed test
      return jStat.centralF.inv(significance, df1, df2);
    case "Greater than":
      // Right-tailed test
      return jStat.centralF.inv(1 - significance, df1, df2);
    case "Different":
      // Two-tailed test
      const fLower = jStat.centralF.inv(significance/2, df1, df2);
      const fUpper = jStat.centralF.inv(1 - significance/2, df1, df2);
      return {lower: fLower, upper: fUpper};
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

export function calculate2SvarFischerPValue(fStat: number, df1: number, df2: number, alternativevariance: string): number {
  switch (alternativevariance) {
    case "Less than":
      return jStat.centralF.cdf(fStat, df1, df2);
    case "Greater than":
      return 1 - jStat.centralF.cdf(fStat, df1, df2);
    case "Different":
      // Two-tailed test
      const leftTail = jStat.centralF.cdf(fStat, df1, df2);
      const rightTail = 1 - jStat.centralF.cdf(fStat, df1, df2);
      return 2 * Math.min(leftTail, rightTail);
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

export function calculate2SvarFischerConfidenceInterval(
  var1: number, 
  var2: number, 
  df1: number, 
  df2: number, 
  significance: number
): {lower: number; upper: number} {
  const alpha = significance;
  const fLower = jStat.centralF.inv(alpha/2, df1, df2);
  const fUpper = jStat.centralF.inv(1 - alpha/2, df1, df2);
  
  const ratio = var1 / var2;
  
  return {
    lower: ratio / fUpper,
    upper: ratio / fLower
  };
}

export function calculate2SvarLeveneValue(data1: number[], data2: number[]): number {
  // Levene's test statistic calculation
  // Calculate absolute deviations from median for each group
  const median1 = jStat.median(data1);
  const median2 = jStat.median(data2);
  
  const deviations1 = data1.map(x => Math.abs(x - median1));
  const deviations2 = data2.map(x => Math.abs(x - median2));
  
  const n1 = data1.length;
  const n2 = data2.length;
  const n = n1 + n2;
  
  const meanDev1 = jStat.mean(deviations1);
  const meanDev2 = jStat.mean(deviations2);
  const grandMeanDev = (n1 * meanDev1 + n2 * meanDev2) / n;
  
  // Between-group sum of squares
  const ssBetween = n1 * Math.pow(meanDev1 - grandMeanDev, 2) + n2 * Math.pow(meanDev2 - grandMeanDev, 2);
  
  // Within-group sum of squares
  const ssWithin1 = deviations1.reduce((sum, dev) => sum + Math.pow(dev - meanDev1, 2), 0);
  const ssWithin2 = deviations2.reduce((sum, dev) => sum + Math.pow(dev - meanDev2, 2), 0);
  const ssWithin = ssWithin1 + ssWithin2;
  
  // Levene's test statistic
  const msBetween = ssBetween / (2 - 1); // k-1 where k=2 groups
  const msWithin = ssWithin / (n - 2);   // n-k where k=2 groups
  
  return msBetween / msWithin;
}

export function calculate2SvarLeveneCriticalValue(significance: number, df1: number, df2: number, alternativevariance: string): number | {lower: number; upper: number} {
  // Levene's test uses F-distribution
  switch (alternativevariance) {
    case "Less than":
      return jStat.centralF.inv(significance, df1, df2);
    case "Greater than":
      return jStat.centralF.inv(1 - significance, df1, df2);
    case "Different":
      const fLower = jStat.centralF.inv(significance/2, df1, df2);
      const fUpper = jStat.centralF.inv(1 - significance/2, df1, df2);
      return {lower: fLower, upper: fUpper};
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

export function calculate2SvarLevenePValue(fStat: number, df1: number, df2: number, alternativevariance: string): number {
  switch (alternativevariance) {
    case "Less than":
      return jStat.centralF.cdf(fStat, df1, df2);
    case "Greater than":
      return 1 - jStat.centralF.cdf(fStat, df1, df2);
    case "Different":
      const leftTail = jStat.centralF.cdf(fStat, df1, df2);
      const rightTail = 1 - jStat.centralF.cdf(fStat, df1, df2);
      return 2 * Math.min(leftTail, rightTail);
    default:
      throw new Error("Invalid alternative hypothesis");
  }
}

export function calculate2SvarLeveneConfidenceInterval(
  data1: number[], 
  data2: number[], 
  significance: number
): {lower: number; upper: number} {
  // For Levene's test, confidence intervals are typically not calculated
  // as it tests equality of variances, not the ratio itself
  // Returning placeholder values
  const var1 = variance(data1);
  const var2 = variance(data2);
  const ratio = var1 / var2;
  let constant: number;
  switch (significance) {
    case 0.01:
      constant = 3.29;
      break;
    case 0.05:
      constant = 1.96;
      break;
    case 0.10:
      constant = 1.645;
      break;
    default:
      constant = 1.96; // Default to 95% CI
      break;    
  }
  
  // Simple approximation - in practice, you might want bootstrap CI
  const margin = constant * Math.sqrt(ratio); // rough approximation
  
  return {
    lower: Math.max(0, ratio - margin),
    upper: ratio + margin
  };
};

export function calculate2SMeanConfidenceInterval(
  significance: number,
  stats1: { mean: number; standardError: number; n: number },
  stats2: { mean: number; standardError: number; n: number }  
): { lower1: number; upper1: number; lower2: number; upper2: number } {
  // Validate inputs
  if (significance <= 0 || significance >= 1) {
    throw new Error('Significance level must be between 0 and 1');
  }
  
  // Calculate confidence intervals for individual means using jStat
  const tCI = jStat.studentt.inv(1 - significance/2, stats1.n - 1); // for sample 1
  const tCI2 = jStat.studentt.inv(1 - significance/2, stats2.n - 1); // for sample 2
  
  const mean1CI_minus = stats1.mean - tCI * stats1.standardError;
  const mean1CI_plus = stats1.mean + tCI * stats1.standardError;
  
  const mean2CI_minus = stats2.mean - tCI2 * stats2.standardError;
  const mean2CI_plus = stats2.mean + tCI2 * stats2.standardError;

  return {
    lower1: mean1CI_minus,
    upper1: mean1CI_plus,
    lower2: mean2CI_minus,
    upper2: mean2CI_plus,
  };
};

// Helper function to calculate median
export function calculateMedian(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2
    : sorted[Math.floor(n/2)];
}

export function calculate2SMedianStatistic(
  dataValues1: number[],
  dataValues2: number[],
  alternativemedian: "Less than" | "Greater than" | "Different"
): {  testStatistic: number; pValue: number} {
  const n1 = dataValues1.length;
  const n2 = dataValues2.length;
  
  // Combine and rank all observations
  const combined: Array<{value: number, group: number, rank?: number}> = [
    ...dataValues1.map(x => ({value: x, group: 1})), 
    ...dataValues2.map(x => ({value: x, group: 2}))
  ];
  
  combined.sort((a, b) => a.value - b.value);
  
  // Assign ranks (handle ties by averaging ranks)
  let currentRank = 1;
  for (let i = 0; i < combined.length; i++) {
    let tieCount = 1;
    while (i + tieCount < combined.length && 
           combined[i].value === combined[i + tieCount].value) {
      tieCount++;
    }
    
    const avgRank = currentRank + (tieCount - 1) / 2;
    for (let j = i; j < i + tieCount; j++) {
      combined[j].rank = avgRank;
    }
    
    currentRank += tieCount;
    i += tieCount - 1;
  }
  
  // Calculate sum of ranks for group 1
  const R1 = combined.filter(x => x.group === 1)
                    .reduce((sum, x) => sum + (x.rank || 0), 0);
  
  // Calculate U statistics
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  
  // For large samples, use normal approximation
  let testStatistic: number;
  let pValue: number;
  
  if (n1 > 8 && n2 > 8) {
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    testStatistic = Math.abs(U - meanU) / stdU;
    
    switch (alternativemedian) {
      case "Different":
        pValue = 2 * (1 - jStat.normal.cdf(testStatistic, 0, 1));
        break;
      case "Less than":
        pValue = jStat.normal.cdf(testStatistic, 0, 1);
        break;
      case "Greater than":
        pValue = 1 - jStat.normal.cdf(testStatistic, 0, 1);
        break;
      default:
        pValue = 0;
    }
  } else {
    // For small samples, would need exact tables (simplified here)
    testStatistic = U;
    pValue = 0.5; // Placeholder - would need exact calculation
  }
  return {
    testStatistic,
    pValue,
  };
}

// Calculate critical value for 2-sample Mann-Whitney median test
export function calculate2SMedianCriticalValue(
  significance: number, 
): number {
const criticalValue = jStat.normal.inv(1 - significance/2, 0, 1);
return criticalValue;
};

// Calculate confidence interval for median difference (using Wilcoxon-Mann-Whitney approach)
export function calculate2SMedianConfidenceInterval(
  dataValues1: number[], 
  dataValues2: number[], 
  significance: number,
  alternativemedian: "Less than" | "Greater than" | "Different"
): {lower: number; upper: number} {
  
  // Calculate all pairwise differences (Hodges-Lehmann estimator)
  const differences: number[] = [];
  
  for (const x1 of dataValues1) {
    for (const x2 of dataValues2) {
      differences.push(x1 - x2);
    }
  }
  
  differences.sort((a, b) => a - b);
  const m = differences.length;
  
  if (m === 0) {
    return { lower: 0, upper: 0 };
  }
  
  // For large samples, use normal approximation
  const n1 = dataValues1.length;
  const n2 = dataValues2.length;
  
  let alpha: number;
  switch (alternativemedian) {
    case "Different":
      alpha = significance;
      break;
    case "Less than":
    case "Greater than":
      alpha = significance * 2; // Convert one-tailed to two-tailed
      break;
    default:
      alpha = significance;
  }
  
  if (n1 >= 8 && n2 >= 8) {
    // Normal approximation for large samples
    const z = jStat.normal.inv(1 - alpha/2, 0, 1);
    const se = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    const w = z * se;
    
    const lowerIndex = Math.max(0, Math.floor((m - 1)/2 - w));
    const upperIndex = Math.min(m - 1, Math.ceil((m - 1)/2 + w));
    
    return {
      lower: differences[lowerIndex],
      upper: differences[upperIndex]
    };
  } else {
    // Exact method for small samples (simplified)
    const lowerIndex = Math.max(0, Math.floor(m * alpha/2));
    const upperIndex = Math.min(m - 1, Math.floor(m * (1 - alpha/2)));
    
    return {
      lower: differences[lowerIndex],
      upper: differences[upperIndex]
    };
  }
}

export function calculatePairedSMeanSampleSize(
  power1SMeanPower: string,
  power1SMeanHa: string,
  power1SMeanMean: number,
  power1SMeanH0: number,
  power1SMeanStdev: number,
  power1SMeanAlpha: string
): PowerAnalysisResult {
  const oneSMeanPower = parseFloat(power1SMeanPower);
  const oneSMeanAlpha = parseFloat(power1SMeanAlpha);

  // Input validation
  if (oneSMeanPower <= 0 || oneSMeanPower >= 1) {
    throw new Error("Power must be between 0 and 1");
  }
  if (oneSMeanAlpha <= 0 || oneSMeanAlpha >= 1) {
    throw new Error("Alpha must be between 0 and 1");
  }
  if (power1SMeanStdev <= 0) {
    return { sampleSize: 0, actualPower: 0 };
  }

  // Calculate effect size
  const effectSize = Math.abs(power1SMeanMean - power1SMeanH0) / power1SMeanStdev;

  // Critical values
  let zAlpha: number;
  let zBeta: number;

  switch (power1SMeanHa) {
    case "<":
      zAlpha = jStat.normal.inv(oneSMeanAlpha, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
    case ">":
      zAlpha = jStat.normal.inv(1 - oneSMeanAlpha, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
    case "≠":
    default:
      zAlpha = jStat.normal.inv(1 - oneSMeanAlpha / 2, 0, 1);
      zBeta = jStat.normal.inv(oneSMeanPower, 0, 1);
      break;
  }
    
    // Calculate initial sample size using normal approximation
    let n: number;
    
    if (power1SMeanHa === "≠") {
      // Two-tailed test
      n = Math.pow((zAlpha + zBeta) / effectSize, 2);
    } else {
      // One-tailed test
      n = Math.pow((Math.abs(zAlpha) + zBeta) / effectSize, 2);
    }
    
    // Round up to next integer for initial estimate
    n = Math.ceil(n);
    
    // Iterative refinement using t-distribution
    // Start with normal approximation and refine using actual t-distribution
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;
    let actualPower = 0;
    
    while (!converged && iterations < maxIterations) {
      const df = n - 1;
      let tAlpha: number;
      
      // Get t-critical values
      switch (power1SMeanHa) {
        case "<":
          tAlpha = jStat.studentt.inv(oneSMeanAlpha, df);
          break;
          
        case ">":
          tAlpha = jStat.studentt.inv(1 - oneSMeanAlpha, df);
          break;
          
        case "≠":
        default:
          tAlpha = jStat.studentt.inv(1 - oneSMeanAlpha / 2, df);
          break;
      }
      
      // Calculate non-centrality parameter
      const delta = effectSize * Math.sqrt(n);
      
      // Calculate actual power with current n
      //let actualPower: number;
      
      if (power1SMeanHa === "≠") {
        // Two-tailed test - power is more complex for non-central t
        // Approximate using Student
        const criticalValue = Math.abs(tAlpha);
        {/*
          actualPower = 1 - jStat.normal.cdf(criticalValue - delta, 0, 1) + 
                    jStat.normal.cdf(-criticalValue - delta, 0, 1); */}
          actualPower = 1 - jStat.studentt.cdf(criticalValue - delta, df) + 
                    jStat.studentt.cdf(-criticalValue - delta, df);
          
      } else {
        // One-tailed test
        if (power1SMeanMean > power1SMeanH0) {
          actualPower = 1 - jStat.studentt.cdf(tAlpha - delta, df);
        } else {
          actualPower = jStat.studentt.cdf(tAlpha + delta, df);
        }
      }
      
      // Check convergence
      if (Math.abs(actualPower - oneSMeanPower) < 0.001) {
        converged = true;
      } else if (actualPower < oneSMeanPower) {
        n += 1;
      } else {
        converged = true; // Close enough
      }
      
      iterations++;
    }
    
    // Ensure minimum sample size
    n = Math.max(n, 2);
    
    //return { sampleSize: Math.ceil(n) };
    return {
    sampleSize: n,
    actualPower: actualPower
    };
};

function noncentralFcdf(x: number, d1: number, d2: number, lambda: number, tol = 1e-8, maxIter = 200): number {
  let sum = 0;
  let weight = Math.exp(-lambda / 2);
  let j = 0;
  let term = weight * jStat.centralF.cdf(x, d1, d2);
  sum += term;

  while (j < maxIter && term > tol) {
    j++;
    weight *= (lambda / 2) / j; // Poisson recursion
    term = weight * jStat.centralF.cdf(x, d1 + 2 * j, d2);
    sum += term;
  }

  return sum;
}

// Custom non-central F CDF implementation
  function GroknonCentralFCDF (x: number, df1: number, df2: number, ncp: number, maxTerms = 100): number {
    if (x < 0 || df1 <= 0 || df2 <= 0 || ncp < 0) return NaN;

    let sum = 0;
    const lambdaHalf = ncp / 2;
    const epsilon = 1e-10; // Convergence threshold

    for (let j = 0; j < maxTerms; j++) {
      // Poisson weight: e^(-λ/2) * (λ/2)^j / j!
      const poissonWeight = Math.exp(-lambdaHalf) * Math.pow(lambdaHalf, j) / (jStat as any).factorial(j);
      // Beta CDF: I(d1*x/(d1*x + d2); (d1 + 2j)/2, d2/2)
      const betaArg = (df1 * x) / (df1 * x + df2);
      const betaCDF = (jStat as any).beta.cdf(betaArg, (df1 + 2 * j) / 2, df2 / 2);
      const term = poissonWeight * betaCDF;
      sum += term;
      if (term < epsilon * sum && j > 0) break; // Stop if term is negligible
    }

    return Math.min(Math.max(sum, 0), 1); // Clamp to [0, 1]
  };

export function calculateMultipleSMeanSampleSize(
          powerPower: string,
          powerNbrDistri: number,    // Number of groups (k)
          powerDifference: number,   // Effect size or difference between means
          powerStdev: number,        // Within-group standard deviation
          powerAlpha: string,
        ) : PowerAnalysisResult {

  const targetPower = parseFloat(powerPower);
  const alpha = parseFloat(powerAlpha);
  const k = powerNbrDistri; // number of groups
  
  // Calculate Cohen's f effect size
  const effectSize = powerDifference / powerStdev;
  //const effectSize = 0.3;
  
  // Validate inputs
  if (k < 2) {
    return {
    sampleSize: 0,
    actualPower: 0,
    };
    //throw new Error("Number of groups must be at least 2 for ANOVA");
  }
  
  if (effectSize <= 0) {
    //throw new Error("Effect size must be positive");
    return {
    sampleSize: 0,
    actualPower: 0,
    };
  }
  
  if (targetPower <= 0 || targetPower >= 1) {
    //throw new Error("Target power must be between 0 and 1");
    return {
    sampleSize: 0,
    actualPower: 0,
    };
  }
  
  // Power calculation function using jStat
  function calculatePower(n: number): number {
    const totalN = n * k;
    const df1 = k - 1;           // between groups degrees of freedom
    const df2 = totalN - k;      // within groups degrees of freedom
    
    // Non-centrality parameter for ANOVA
    const ncp = n * effectSize * effectSize;
    
    // Critical F-value using jStat
    const fCritical = jStat.centralF.inv(1 - alpha, df1, df2);
    //const fCritical = jStat.centralF.inv(1-0.05, 3, 28);
    
    // Power using non-central F distribution
    //const powertest = 1 - jStat.noncentralF.cdf(fCritical, df1, df2, ncp);
    //const power = 1 - noncentralFcdf(fCritical, df1, df2, ncp);
    const power = 1 - GroknonCentralFCDF(fCritical, df1, df2, ncp);
    
    //const power = 1 - noncentralFcdf(2.94, 3, 28, 2.88);
    // Better approximation using normal distribution
    
    return power;
  };
  
  // Binary search for optimal sample size
  let low = 2;
  let high = 1000;
  let bestN = high;
  let bestPower = 0;
  //let currentPower = 0;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currentPower = calculatePower(mid);
    //currentPower = calculatePower(mid);
    
    if (currentPower >= targetPower) {
      bestN = mid;
      bestPower = currentPower;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
 //bestPower = currentPower;  
  // If we didn't find a solution within range, calculate actual power for max n
  if (bestPower < targetPower) {
    bestPower = calculatePower(bestN);
  }
  
  return {
    sampleSize: Math.ceil(bestN),
    actualPower: Math.round(bestPower * 10000) / 10000,
  };
}