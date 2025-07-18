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
  calculate1STCriticalValue,
  calculate1SMeanPValue,
  calculate1SMeanConfidenceInterval,
} from "@/lib/statisticsUtils";
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MeanTestResults {
  meanValue: number;
  SEmean: number;
  tStatistic: number | {lower: number; upper: number};
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  meanCI_minus: number;
  meanCI_plus: number;
}  
    
interface onesampleMeanHypothesisTestProps {
  dataValues: number[];
  significance: number;
  alternativemean: "Less than" | "Greater than" | "Different";
  targetMean: number;
  ADvalue: number;
  ADp_Value: number;
}

export function onesampleMeanHypothesisTest({
  dataValues,
  significance,
  alternativemean,                        
  targetMean,
  ADvalue,
  ADp_Value,
}: onesampleMeanHypothesisTestProps): MeanTestResults {
  
  // Example calculations (replace with your actual statistical calculations)
  //const dataValues = dataPoints.map(point => point.dataValue) || [];
  const n = dataValues.length;
  const meanValue = mean(dataValues);
  const stdDev = standardDeviation(dataValues);
  const SEmean = stdDev / Math.sqrt(n);
  // Perform normality test - will return isNormal, AD value and p_values
  
  // Calculate t-statistic
  const tStatistic = (meanValue - targetMean) / SEmean;
  
  // Calculate degrees of freedom
  const df = n - 1;
  
  // - t-critical value calculation
  // - p-value calculation
  // - confidence interval calculation
  // You'll need to implement this based on your significance level, the df and Ha
  const tCriteria = calculate1STCriticalValue(significance, df, alternativemean);

  // Calculate p-value based on alternative hypothesis
  const tp_Value = calculate1SMeanPValue(tStatistic, df, alternativemean);

  // Calculate confidence intervals
  const { lower: meanCI_minus, upper: meanCI_plus } = calculate1SMeanConfidenceInterval(
    meanValue,
    SEmean,
    tCriteria,
    alternativemean
  );

  return {
    meanValue,
    SEmean,
    tStatistic,
    tCriteria: typeof tCriteria === 'number' ? tCriteria : { lower: tCriteria.lower, upper: tCriteria.upper },
    tp_Value,
    meanCI_minus,
    meanCI_plus,
  };
}