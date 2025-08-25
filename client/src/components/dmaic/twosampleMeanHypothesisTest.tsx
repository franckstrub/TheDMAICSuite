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
  calculate2SDiffConfidenceInterval,
  calculateSampleStats,
  testEqualVariances
} from "@/lib/statisticsUtils";
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MeanTestResults {
  meanValue1: number;
  SEmean1: number;
  meanValue2: number;
  SEmean2: number;
  fStat: number;
  fCritical: number;
  fTestpValue: number;
  equalVariances: boolean;
  pooledSE: number; // Pooled standard error for equal variances
                    // For Welch's t-test (unequal variances), this will be the standard error of the difference in means
  degreesOfFreedom: number;
  tStatistic: number;
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  diffCI_minus: number;
  diffCI_plus: number;
}  
    
interface twosampleMeanHypothesisTestProps {
  dataValues1: number[];
  dataValues2: number[];
  significance: number;
  alternativemean: "Less than" | "Greater than" | "Different";
  deltaMean0: number;
  ADp_Value1: number;
  ADp_Value2: number;
}

export function twosampleMeanHypothesisTest({
  dataValues1,
  dataValues2,
  significance,
  alternativemean,
  deltaMean0,
  ADp_Value1,
  ADp_Value2,
}: twosampleMeanHypothesisTestProps): MeanTestResults {
  
  // Calculate sample statistics
  const stats1 = calculateSampleStats(dataValues1);
  const stats2 = calculateSampleStats(dataValues2);
  
  // Check normality assumptions using Anderson-Darling test results
  const normalityThreshold = significance;
  const isNormal1 = ADp_Value1 >= normalityThreshold;
  const isNormal2 = ADp_Value2 >= normalityThreshold;
  
  if (!isNormal1 || !isNormal2) {
    console.warn("Warning: Normality assumption may be violated. Consider non-parametric tests.");
  }
  
  // Test for equality of variances using proper F-distribution
  const VariancesFtest = testEqualVariances(stats1.variance, stats2.variance, stats1.n, stats2.n, significance);
  
  let difference: number;
  let tStatistic: number;
  let degreesOfFreedom: number;
  let pooledSE: number;
  
  if (VariancesFtest.equalVariances) {
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
  difference = stats1.mean - stats2.mean;
  // Calculate t-statistic
  tStatistic = (difference - deltaMean0) / pooledSE;
  
  // Calculate critical values and p-value based on alternative hypothesis using jStat
  const tCriteria = calculate2StCriticalValue(
    significance,
    degreesOfFreedom,
    alternativemean);

  const tp_Value = calculate2SMeanPValue(tStatistic, degreesOfFreedom, alternativemean);

  const { lower1: diffCI_minus, upper1: diffCI_plus } = calculate2SDiffConfidenceInterval(
      difference,
      pooledSE,
      tCriteria,
      alternativemean,
    );
  
  return {
    meanValue1: stats1.mean,
    SEmean1: stats1.standardError,
    meanValue2: stats2.mean,
    SEmean2: stats2.standardError,
    fStat: VariancesFtest.fStat,
    fCritical: VariancesFtest.fCritical,
    fTestpValue: VariancesFtest.pValue,
    equalVariances: VariancesFtest.equalVariances,
    pooledSE, 
    degreesOfFreedom,
    tStatistic: tStatistic,
    tCriteria: typeof tCriteria === 'number' ? tCriteria : 
               {lower: tCriteria.lower, upper: tCriteria.upper},
    tp_Value,
    diffCI_minus,
    diffCI_plus,
  };
}