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
  varCriteria: number;
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
}  
    
interface onesampleVarianceHypothesisTestProps {
  dataValues: number[];
  significance: number;
  alternativevariance: "Less than" | "Greater than" | "Different";
  targetstdev: number;
}

export function onesampleVarianceHypothesisTest({
  dataValues,
  significance,
  alternativevariance,                        
  targetstdev,
}: onesampleVarianceHypothesisTestProps): VarianceTestResults {
  
  // Example calculations (replace with your actual statistical calculations)
  //const dataValues = dataPoints.map(point => point.dataValue) || [];
  const n = dataValues.length;
  const Samplevariance = variance(dataValues);
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
    df
  );


  return {
    varStatistic,
    varCriteria: typeof varCriteria === 'number' ? varCriteria : varCriteria.upper,
    varp_Value,
    varianceCI_minus,
    varianceCI_plus,
  };
}