import { 
  mean, 
  standardDeviation, 
  variance,
  parseNumericValue,
  calculateMode,
  performNormalityTest,
  getHistogramData,
  calculateQuartiles,
  calculateMovingRange,
  calculateIndividualControlLimits,
  calculateMovingRangeControlLimits,
  calculateZScoreLongShortTerm,
  calculatePerformanceMetrics,
  calculateCapabilityIndexes,
  calculateObservedPerformanceMetrics,
  assessProcessVariation,
  normalCDF,
  inverseNormCDF,
  calculate1STCriticalValue,
  calculate1SMeanPValue,
  calculate1SMeanConfidenceInterval,
} from "@/lib/statisticsUtils";
import { numeric } from "drizzle-orm/sqlite-core";

// Import jStat for statistical functions
import * as jStat from 'jstat';

interface MedianTestResults {
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
}  
    
interface onesampleMedianHypothesisTestProps {
  dataValues: number[];
  significance: number;
  alternativemedian: "Less than" | "Greater than" | "Different";
  targetMedian: number;
  useWilcoxon?: boolean; // Option to use Wilcoxon instead of sign test
}

// Binomial quantile function implementation since jStat doesn't have binomial.inv
function binomialQuantile(p: number, n: number, prob: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  
  // Use cumulative distribution function to find quantile
  let cumProb = 0;
  for (let k = 0; k <= n; k++) {
    cumProb += jStat.binomial.pdf(k, n, prob);
    if (cumProb >= p) {
      return k;
    }
  }
  return n;
}

// Calculate critical value for sign test using binomial distribution
function calculateSignTestCriticalValue(n: number, alpha: number,
  alternative: "Less than" | "Greater than" | "Different"): number {
  if (alternative === "Different") {
    alpha = alpha / 2; // Two-tailed test
  }
  
  // Use our custom binomial quantile function
  if (alternative === "Less than") {
    return binomialQuantile(alpha, n, 0.5);
  } else if (alternative === "Greater than") {
    return n - binomialQuantile(alpha, n, 0.5);
  } else { // "Different"
    return binomialQuantile(alpha, n, 0.5);    
  }
}

// Calculate confidence interval for median using jStat
function calculateMedianConfidenceInterval(
  sortedData: number[],
  alpha: number,
  alternative: "Less than" | "Greater than" | "Different",
): { lower: number; upper: number } {
  const n = sortedData.length;
  
  if (alternative === "Different") {
    // Two-sided confidence interval
    const k = binomialQuantile(alpha / 2, n, 0.5);
    const lowerIndex = Math.max(0, Math.floor(k));
    const upperIndex = Math.min(n - 1, Math.floor(n - k - 1));
    
    return {
      lower: lowerIndex >= 0 ? sortedData[lowerIndex] : -Infinity,
      upper: upperIndex < n ? sortedData[upperIndex] : Infinity
    };
  } else if (alternative === "Less than") {
    // Upper bound only
    const k = binomialQuantile(alpha, n, 0.5);
    const upperIndex = Math.min(n - 1, Math.floor(n - k - 1));
    
    return {
      lower: -Infinity,
      upper: upperIndex < n ? sortedData[upperIndex] : Infinity
    };
  } else { // "Greater than"
    // Lower bound only
    const k = binomialQuantile(alpha, n, 0.5);
    const lowerIndex = Math.max(0, Math.floor(k));
    
    return {
      lower: lowerIndex >= 0 ? sortedData[lowerIndex] : -Infinity,
      upper: Infinity
    };
  }
}

export function onesampleMedianHypothesisTest({
  dataValues,
  significance,
  alternativemedian,                        
  targetMedian,
  useWilcoxon,
}: onesampleMedianHypothesisTestProps): MedianTestResults {
  
  const n = dataValues.length;
  const quartiles = calculateQuartiles(dataValues);
  const actualMedian = quartiles.median;
  
  if (useWilcoxon) {
    // Wilcoxon Signed-Rank Test implementation using jStat
    // Calculate differences from target median
    const differences = dataValues
      .map(x => x - targetMedian)
      .filter(d => d !== 0); // Remove zeros
    
    const m = differences.length; // Effective sample size after removing zeros
    
    if (m === 0) {
      // All values equal to target median
      return {
        medianStatistic: 0,
        medianCriteria: 0,
        medianp_Value: 1,
        medianCI_minus: targetMedian,
        medianCI_plus: targetMedian,
      };
    }
    
    // Rank absolute differences
    const absRanks = differences
      .map((d, i) => ({ value: Math.abs(d), originalIndex: i, sign: Math.sign(d) }))
      .sort((a, b) => a.value - b.value)
      .map((item, rank) => ({ ...item, rank: rank + 1 }));
    
    // Calculate W+ (sum of positive ranks) and W- (sum of negative ranks)
    const WPlus = absRanks
      .filter(item => item.sign > 0)
      .reduce((sum, item) => sum + item.rank, 0);

    const WMinus = absRanks
      .filter(item => item.sign < 0)
      .reduce((sum, item) => sum + item.rank, 0);

    // Test statistic depends on alternative hypothesis
    let medianStatistic: number;
    if (alternativemedian === "Less than") {
      // H1: median < target, expect more negative differences (larger W-)
      medianStatistic = WMinus;
    } else if (alternativemedian === "Greater than") {
      // H1: median > target, expect more positive differences (larger W+)
      medianStatistic = WPlus;
    } else { // "Different"
      // Two-tailed: use the smaller of W+ and W-
      medianStatistic = Math.min(WPlus, WMinus);
    }
    
    // Calculate critical value based on alternative hypothesis
    let medianCriteria: number;
    const mu = m * (m + 1) / 4; // Expected value under null
    const sigma = Math.sqrt(m * (m + 1) * (2 * m + 1) / 24);

    if (alternativemedian === "Less than") {
      // Critical value for one-tailed test (lower tail)
      const z_alpha = jStat.normal.inv(significance, 0, 1);
      medianCriteria = mu + z_alpha * sigma;
    } else if (alternativemedian === "Greater than") {
      // Critical value for one-tailed test (upper tail)
      const z_alpha = jStat.normal.inv(1 - significance, 0, 1);
      medianCriteria = mu + z_alpha * sigma;
    } else { // "Different"
      // Critical value for two-tailed test
      //const z_alpha_1 = jStat.normal.inv(1 - (significance / 2), 0, 1);
      const z_alpha_2 = jStat.normal.inv(significance / 2, 0, 1);
      medianCriteria = mu + z_alpha_2 * sigma;  // Lower critical value
    }
    // Update p-value calculation to use the correct test statistic
    let medianp_Value: number;
    if (m >= 20) {      
      if (alternativemedian === "Less than") {
        // Use W- for "Less than" test
        const z = (WMinus - mu) / sigma;
        medianp_Value = 1 - jStat.normal.cdf(z, 0, 1);
        //medianp_Value = 1 - normalCDF(z);
      } else if (alternativemedian === "Greater than") {
        // Use W+ for "Greater than" test
        const z = (WPlus - mu) / sigma;
        medianp_Value = 1 - jStat.normal.cdf(z, 0, 1);
        //medianp_Value = normalCDF(z);
      } else { // "Different"
        // For two-tailed test, use the smaller of W+ and W-
        const minW = Math.min(WPlus, WMinus);
        const z = (minW - mu) / sigma;
        medianp_Value = 2 * jStat.normal.cdf(z, 0, 1);
        //medianp_Value = 2 * (1 - normalCDF(z));
      }
    } else {
      // For small samples, use normal approximation with continuity correction      
      if (alternativemedian === "Less than") {
        // Use W- with continuity correction
        //const z = (WMinus + 0.5 - mu) / sigma;
        const z = (mu - (WMinus + 0.5)) / sigma;
        medianp_Value = jStat.normal.cdf(z, 0, 1);
        //medianp_Value = 1 - normalCDF(z)
      } else if (alternativemedian === "Greater than") {
        // Use W+ with continuity correction
        const z = (WPlus - 0.5 - mu) / sigma;
        medianp_Value = 1 - jStat.normal.cdf(z, 0, 1);
        //medianp_Value = normalCDF(z)
      } else { // "Different"
        // For two-tailed test, use the smaller of W+ and W-
        const minW = Math.min(WPlus, WMinus);
        const z = (minW + 0.5 - mu) / sigma; // Continuity correction
        medianp_Value = 2 * jStat.normal.cdf(z, 0, 1);
        //medianp_Value = 2 * (1 - normalCDF(z));
      }
    }
    
    // Confidence interval
    const sortedData = [...dataValues].sort((a, b) => a - b);
    const { lower: medianCI_minus, upper: medianCI_plus } = 
      calculateMedianConfidenceInterval(sortedData, significance, alternativemedian);
    
    return {
      medianStatistic,
      medianCriteria,
      medianp_Value,
      medianCI_minus,
      medianCI_plus,
    };
    
  } else {
    // Sign Test implementation using jStat
    // Count observations above and below target median
    let above = 0;
    let below = 0;
    let equal = 0;
    
    for (const value of dataValues) {
      if (value > targetMedian) above++;
      else if (value < targetMedian) below++;
      else equal++;
    }
    
    // Effective sample size (excluding values equal to target median)
    const effectiveN = above + below;
    
    if (effectiveN === 0) {
      // All values equal to target median
      return {
        medianStatistic: 0,
        medianCriteria: 0,
        medianp_Value: 1,
        medianCI_minus: targetMedian,
        medianCI_plus: targetMedian,
      };
    }
    
    // Test statistic depends on alternative hypothesis
    let S: number;
    if (alternativemedian === "Less than") {
      S = below; // Number of values below target
    } else if (alternativemedian === "Greater than") {
      S = above; // Number of values above target
    } else { // "Different"
      S = Math.min(above, below); // Minimum of above and below
    }
    
    const medianStatistic = S;
    
    // Calculate p-value using jStat binomial functions
    let medianp_Value: number;
    if (effectiveN >= 20) {
      // Use normal approximation for large samples
      const mu = effectiveN * 0.5;
      const sigma = Math.sqrt(effectiveN * 0.25);
      
      if (alternativemedian === "Less than") {
        const z = (S + 0.5 - mu) / sigma; // Continuity correction
        medianp_Value = jStat.normal.cdf(z, 0, 1);
        //medianp_Value = 1 - normalCDF(z);
      } else if (alternativemedian === "Greater than") {
        const z = (S - 0.5 - mu) / sigma; // Continuity correction
        medianp_Value = 1 - jStat.normal.cdf(z, 0, 1);
        //medianp_Value = normalCDF(z);
      } else { // "Different"
        const z1 = (S + 0.5 - mu) / sigma;
        const z2 = (S - 0.5 - mu) / sigma;
        medianp_Value = 2 * Math.min(jStat.normal.cdf(z1, 0, 1), 1 - jStat.normal.cdf(z2, 0, 1));
        //medianp_Value = 2 * Math.min(1 - normalCDF(z1), normalCDF(z2));
      }
    } else {
      // Use exact binomial calculation with jStat for small sample (n<20)
      if (alternativemedian === "Less than") {
        medianp_Value = jStat.binomial.cdf(S, effectiveN, 0.5);
      } else if (alternativemedian === "Greater than") {
        medianp_Value = 1 - jStat.binomial.cdf(S - 1, effectiveN, 0.5);
      } else { // "Different"
        medianp_Value = 2 * jStat.binomial.cdf(S, effectiveN, 0.5);
      }
    }
    
    // Calculate critical value using jStat
    const medianCriteria = calculateSignTestCriticalValue(effectiveN, significance, alternativemedian);
    
    // Calculate confidence interval
    const sortedData = [...dataValues].sort((a, b) => a - b);
    const { lower: medianCI_minus, upper: medianCI_plus } = 
      calculateMedianConfidenceInterval(sortedData, significance, alternativemedian);
    
    return {
      medianStatistic,
      medianCriteria,
      medianp_Value,
      medianCI_minus,
      medianCI_plus,
    };
  }
}