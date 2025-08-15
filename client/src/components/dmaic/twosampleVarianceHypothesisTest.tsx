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
  calculate1SvarChiSquareValue,
  calculate1SvarChiSquareCriticalValue,
  calculate1SvarChiSquarePValue,
  calculate1SvarChiSquareConfidenceInterval,
} from "@/lib/statisticsUtils";

interface VarianceTestResults {
  varStatistic: number;
  varCriteria: number | {lower: number; upper: number};
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
}  
    
interface twosampleVarianceHypothesisTestProps {
  dataValues1: number[];
  significance: number;
  alternativevariance: "Less than" | "Greater than" | "Different";
  targetstdev: number;
}

export function twosampleVarianceHypothesisTest({
  dataValues1,
  significance,
  alternativevariance,                        
  targetstdev,
}: twosampleVarianceHypothesisTestProps): VarianceTestResults {
  
  // Example calculations (replace with your actual statistical calculations)
  //const dataValues = dataPoints.map(point => point.dataValue) || [];
  const n = dataValues1.length;
  const Samplevariance = variance(dataValues1);
  // Calculate degrees of freedom
  const df = n - 1;
  
  // Calculate f-statistic
  const varStatistic = calculate1SvarChiSquareValue(df, Samplevariance, targetstdev);
  
  // - f-critical value calculation
  const varCriteria = calculate1SvarChiSquareCriticalValue(significance, df, alternativevariance);

  // Calculate p-value based on alternative hypothesis
  const varp_Value = calculate1SvarChiSquarePValue(varStatistic, df, alternativevariance);

  // Calculate confidence intervals
  const { lower: varianceCI_minus, upper: varianceCI_plus } = calculate1SvarChiSquareConfidenceInterval(
    Samplevariance,
    significance,
    df,
    alternativevariance
  );


  return {
    varStatistic,
    varCriteria: typeof varCriteria === 'number' ? varCriteria : { lower: varCriteria.lower, upper: varCriteria.upper },
    varp_Value,
    varianceCI_minus,
    varianceCI_plus,
  };
}