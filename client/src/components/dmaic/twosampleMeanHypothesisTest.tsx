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
  
  // Example calculations (replace with your actual statistical calculations)
  //const dataValues = dataPoints.map(point => point.dataValue) || [];
  const n1 = dataValues1.length;
  const meanValue1 = mean(dataValues1);
  const stdDev1 = standardDeviation(dataValues1);
  const SEmean1 = stdDev1 / Math.sqrt(n1);

  const n2 = dataValues2.length;
  const meanValue2 = mean(dataValues2);
  const stdDev2 = standardDeviation(dataValues2);
  const SEmean2 = stdDev2 / Math.sqrt(n2);
  // Perform normality test - will return isNormal, AD value and p_values
  
  // Calculate t-statistic
  const tStatistic = (meanValue1 - deltaMean0) / SEmean1;
  
  // Calculate degrees of freedom
  const df = n1 - 1;
  
  // - t-critical value calculation
  // - p-value calculation
  // - confidence interval calculation
  // You'll need to implement this based on your significance level, the df and Ha
  const tCriteria = calculate1STCriticalValue(significance, df, alternativemean);

  // Calculate p-value based on alternative hypothesis
  const tp_Value = calculate1SMeanPValue(tStatistic, df, alternativemean);

  // Calculate confidence intervals
  const { lower: mean1CI_minus, upper: mean1CI_plus } = calculate1SMeanConfidenceInterval(
    meanValue1,
    SEmean1,
    tCriteria,
    alternativemean
  );

  const { lower: mean2CI_minus, upper: mean2CI_plus } = calculate1SMeanConfidenceInterval(
    meanValue2,
    SEmean2,
    tCriteria,
    alternativemean
  );

  return {
    meanValue1,
    SEmean1,
    meanValue2,
    SEmean2,
    tStatistic,
    tCriteria: typeof tCriteria === 'number' ? tCriteria : { lower: tCriteria.lower, upper: tCriteria.upper },
    tp_Value,
    mean1CI_minus,
    mean1CI_plus,
    mean2CI_minus,
    mean2CI_plus,
  };
}