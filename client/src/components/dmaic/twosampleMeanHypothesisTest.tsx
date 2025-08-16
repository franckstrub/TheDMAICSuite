import * as jStat from 'jstat'
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
  inverseNormCDF,
  calculate2StCriticalValue,
  calculate2SMeanPValue,
  calculate2SMeanConfidenceInterval,
  calculateSampleStats,
} from "@/lib/statisticsUtils";
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MeanTestResults {
  meanValue1: number;
  SEmean1: number;
  meanValue2: number;
  SEmean2: number;
  tStatistic: number | {lower: number; upper: number};
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  mean1CI_minus: number;
  mean1CI_plus: number;
  mean2CI_minus: number;
  mean2CI_plus: number;
}  
    
interface twosampleMeanHypothesisTestProps {
  dataValues1: number[];
  dataValues2: number[];
  significance: number;
  alternativemean: "Less than" | "Greater than" | "Different";
  deltaMean0: number;
  ADvalue1: number;
  ADp_Value1: number;
  ADvalue2: number;
  ADp_Value2: number;
}

// F-test for equality of variances using proper F-distribution
function testEqualVariances(var1: number, var2: number, n1: number, n2: number, alpha: number = 0.05): boolean {
  const fStat = Math.max(var1, var2) / Math.min(var1, var2);
  const df1 = Math.max(var1, var2) === var1 ? n1 - 1 : n2 - 1;
  const df2 = Math.max(var1, var2) === var1 ? n2 - 1 : n1 - 1;
  
  // Calculate F-critical value using jStat
  const fCritical = jStat.centralF.inv(1 - alpha/2, df1, df2);
  
  return fStat <= fCritical;
}

export function twosampleMeanHypothesisTest({
  dataValues1,
  dataValues2,
  significance,
  alternativemean,
  deltaMean0,
  ADvalue1,
  ADp_Value1,
  ADvalue2,
  ADp_Value2,
}: twosampleMeanHypothesisTestProps): MeanTestResults {
  
  // Calculate sample statistics
  const stats1 = calculateSampleStats(dataValues1);
  const stats2 = calculateSampleStats(dataValues2);
  
  // Check normality assumptions using Anderson-Darling test results
  const normalityThreshold = 0.05;
  const isNormal1 = ADp_Value1 > normalityThreshold;
  const isNormal2 = ADp_Value2 > normalityThreshold;
  
  if (!isNormal1 || !isNormal2) {
    console.warn("Warning: Normality assumption may be violated. Consider non-parametric tests.");
  }
  
  // Test for equality of variances using proper F-distribution
  const equalVariances = testEqualVariances(stats1.variance, stats2.variance, stats1.n, stats2.n, 0.05);
  
  let tStatistic: number;
  let degreesOfFreedom: number;
  let pooledSE: number;
  
  if (equalVariances) {
    // Equal variances assumed (pooled t-test)
    const pooledVariance = ((stats1.n - 1) * stats1.variance + (stats2.n - 1) * stats2.variance) / 
                          (stats1.n + stats2.n - 2);
    pooledSE = Math.sqrt(pooledVariance * (1/stats1.n + 1/stats2.n));
    degreesOfFreedom = stats1.n + stats2.n - 2;
  } else {
    // Unequal variances (Welch's t-test)
    pooledSE = Math.sqrt(stats1.variance/stats1.n + stats2.variance/stats2.n);
    
    // Welch-Satterthwaite degrees of freedom
    const numerator = Math.pow(stats1.variance/stats1.n + stats2.variance/stats2.n, 2);
    const denominator = Math.pow(stats1.variance/stats1.n, 2)/(stats1.n - 1) + 
                       Math.pow(stats2.variance/stats2.n, 2)/(stats2.n - 1);
    degreesOfFreedom = numerator / denominator;
  }
  
  // Calculate t-statistic
  tStatistic = ((stats1.mean - stats2.mean) - deltaMean0) / pooledSE;
  
  // Calculate critical values and p-value based on alternative hypothesis using jStat
  const tCriteria = calculate2StCriticalValue(
    significance,
    degreesOfFreedom,
    alternativemean);

  const tp_Value = calculate2SMeanPValue(tStatistic, degreesOfFreedom, alternativemean);

  const { lower1: mean1CI_minus, upper1: mean1CI_plus, lower2: mean2CI_minus, upper2: mean2CI_plus } = calculate2SMeanConfidenceInterval(
      significance,
      stats1,
      stats2,
    );
  
  return {
    meanValue1: stats1.mean,
    SEmean1: stats1.standardError,
    meanValue2: stats2.mean,
    SEmean2: stats2.standardError,
    tStatistic: typeof tCriteria === 'number' ? tStatistic : 
               {lower: tStatistic, upper: tStatistic}, // For consistency with interface
    tCriteria: typeof tCriteria === 'number' ? tCriteria : 
               {lower: tCriteria.lower, upper: tCriteria.upper},
    tp_Value,
    mean1CI_minus,
    mean1CI_plus,
    mean2CI_minus,
    mean2CI_plus,
  };
}