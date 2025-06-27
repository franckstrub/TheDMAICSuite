// Simple statistics utilities for Lean Six Sigma calculations

/**
 * Safely parse numeric value from either string or number
 * @param value Value to parse
 * @param defaultValue Default value if parsing fails
 * @returns Parsed number or default value
 */
export function parseNumericValue(value: any, defaultValue: number | null): number | null {
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
  if (dataPointsArray.length < 30 || lsl >= usl || stdDev === 0) {
    return { cp: null, cpk: null, pp: null, ppk: null };
  }
  if (dataSetTerm === "Long Term") {
     // Calculate Pp (Process Performance)
    let pp: number | null;
    if (!isNaN(usl) && !isNaN(lsl)) {
      pp = (usl - lsl) / (6 * stdDev);  
    }
    else {
      pp = null;
    }
    
    // Calculate Ppk (Process Performance Index)
    const ppupper = (usl - meanValue) / (3 * stdDev);
    const pplower = (meanValue - lsl) / (3 * stdDev);
    let ppk: number | null;
    if (!isNaN(lsl) && !isNaN(usl)) {
      ppk = Math.min(ppupper, pplower); 
    }
    else if (!isNaN(usl)) {
      ppk = ppupper; 
    }
    else if (!isNaN(lsl)) {
      ppk = pplower; 
    }
    else {
      ppk = null;
    }
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

    let cp: number | null;
    if (!isNaN(usl) && !isNaN(lsl)) {
      cp = (usl - lsl) / (6 * stdDev);  
    }
    else {
      cp = null;
    }
    
    // Calculate Cpk (Process Performance Index)
    const cpupper = (usl - meanValue) / (3 * stdDev);
    const cplower = (meanValue - lsl) / (3 * stdDev);
    let cpk: number | null;
    if (!isNaN(lsl) && !isNaN(usl)) {
      cpk = Math.min(cpupper, cplower); 
    }
    else if (!isNaN(usl)) {
      cpk = cpupper; 
    }
    else if (!isNaN(lsl)) {
      cpk = cplower; 
    }
    else {
      cpk = null;
    }
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
  lsl: number | null,
  usl: number | null,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  longTerm: { obsyield: number | null; obsdpmo: number | null;
              obspercentDefects: number | null; ZequivLT: number | null; 
              obspdLSL_LT: number | null; obspdUSL_LT: number | null;
              ZequivLSL_LT: number | null; ZequivUSL_LT: number | null;
            };
  shortTerm: { obsyield: number | null; obsdpmo: number | null; 
               obspercentDefects: number | null; ZequivST: number | null; 
               obspdLSL_ST: number | null; obspdUSL_ST: number | null;
               ZequivLSL_ST: number | null; ZequivUSL_ST: number | null;
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
    let ZequivLSL_LT: number | null;
    if (lsl) {
       ZequivLSL_LT = inverseNormCDF(1-observedDefectRate.pdLSL);
    }
    else {
      ZequivLSL_LT = null;
    };
    let ZequivUSL_LT: number | null;
    if (usl) {
       ZequivUSL_LT = inverseNormCDF(1-observedDefectRate.pdUSL);
    }
    else {
       ZequivUSL_LT = null;
    };
    //const ZequivLSL_LT = inverseNormCDF(1-observedDefectRate.pdLSL);
    //const ZequivUSL_LT = inverseNormCDF(1-observedDefectRate.pdUSL);

    let shortTermYield: number | null;
    let shortTermDpmo: number | null;
    let shortTermPercentDefects: number | null;
    let ZequivST: number | null;
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
          obsyield: null,
          obsdpmo: null, 
          obspercentDefects: null,
          ZequivST: null,
          obspdLSL_ST: null,
          obspdUSL_ST: null,
          ZequivLSL_ST: null,
          ZequivUSL_ST: null,
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
    let ZequivLSL_ST: number | null;
    if (lsl) {
       ZequivLSL_ST = inverseNormCDF(1-observedDefectRate.pdLSL);
    }
    else {
      ZequivLSL_ST = null;
    };
    let ZequivUSL_ST: number | null;
    if (usl) {
       ZequivUSL_ST = inverseNormCDF(1-observedDefectRate.pdUSL);
    }
    else {
       ZequivUSL_ST = null;
    };
    let longTermYield: number | null;
    let longTermDpmo: number | null;
    let longTermPercentDefects: number | null;
    let ZequivLT: number | null;
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

/**
 * Calculate Z-score for Long Term and Short Term based on data term, normality, and specification limits
 */
export function calculateZScoreLongShortTerm(
  values: number[],
  meanVal: number,
  stdDev: number,
  lsl: number | null,
  usl: number | null,
  dataSetTerm: "Long Term" | "Short Term",
  zShift: number,
): {
  zLongTerm: number;
  zLSL_LT: number | null;
  zUSL_LT: number | null;
  zShortTerm: number;
  zLSL_ST: number | null;
  zUSL_ST: number | null;
} {
  if (values.length === 0 || stdDev === 0) {
    return {
      zLongTerm: 0,
      zLSL_LT: null,
      zUSL_LT: null,
      zShortTerm: 0,
      zLSL_ST: null,
      zUSL_ST: null,
    };
  }
  
  // Calculate Z values based on specification limits
  let zLsl: number | null;
  zLsl=null;
  let zUsl: number | null;
  zUsl= null;
  let zTotal=0;
  let pdLSL = 0;
  let pdUSL = 0;
  
  if (lsl !== null && !isNaN(lsl)) {
    zLsl = (meanVal - lsl) / stdDev;
    zTotal = zLsl;
    zUsl = null;
  }
  
  if (usl !== null && !isNaN(usl)) {
    zUsl = (usl - meanVal) / stdDev;
    zTotal = zUsl;
    zLsl= null;
  }
  if ((lsl !== null && !isNaN(lsl)) && (usl !== null && !isNaN(usl))) {
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
  let zLSL_LT: number | null = null;
  let zUSL_LT: number | null = null;
  let zLSL_ST: number | null = null;
  let zUSL_ST: number | null = null;
    
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
// Helper function to format percentage values
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
