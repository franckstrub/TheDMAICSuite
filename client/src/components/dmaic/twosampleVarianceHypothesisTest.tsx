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
  calculate2SvarFisherValue,
  calculate2SvarFisherCriticalValue,
  calculate2SvarFisherPValue,
  calculate2SvarFisherConfidenceInterval,
  calculate2SvarLeveneValue,
  calculate2SvarLeveneCriticalValue,
  calculate2SvarLevenePValue,
  calculate2SvarLeveneConfidenceInterval,
  Bonferroni,
} from "@/lib/statisticsUtils";

interface VarianceTestResults {
  varTestName: string;
  varn1: number;
  varDF1: number;
  varStdev1: number;
  varn2: number;
  varDF2: number;
  varStdev2: number;
  varStatistic: number;
  varCriteria: number | {lower: number; upper: number};
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
  variance1CI: {lower: number, upper: number};
  variance2CI: {lower: number, upper: number};
}  
    
interface twosampleVarianceHypothesisTestProps {
  dataValues1: number[];
  dataValues2: number[];
  significance: number;
  alternativevariance: "Less than" | "Greater than" | "Different";
  ratioVariance0: number;
  ADp_Value1: number;
  ADp_Value2: number;
}

export function twosampleVarianceHypothesisTest({
  dataValues1,
  dataValues2,
  significance,
  alternativevariance,                        
  ratioVariance0,
  ADp_Value1,
  ADp_Value2,
}: twosampleVarianceHypothesisTestProps): VarianceTestResults {
  
  const n1 = dataValues1.length;  
  const n2 = dataValues2.length;
  
  // Calculate sample variances
  const sample1Variance = variance(dataValues1);
  const sample2Variance = variance(dataValues2);
  
  // Initialize variables
  let varTestName: string;
  let df1: number;
  let df2: number;
  let varStatistic: number;
  let varCriteria: number | {lower: number; upper: number};
  let varp_Value: number;
  let varianceCI_minus: number;
  let varianceCI_plus: number;
  
  if (ADp_Value1 >= significance && ADp_Value2 >= significance) {
    // Use Fisher (F-test) for normal data
    varTestName = "Fisher";
    df1 = n1 - 1;
    df2 = n2 - 1;
    
    // Calculate F-statistic
    varStatistic = calculate2SvarFisherValue(sample1Variance, sample2Variance, ratioVariance0);
    
    // Calculate F-critical value
    varCriteria = calculate2SvarFisherCriticalValue(significance, df1, df2, alternativevariance);

    // Calculate p-value
    varp_Value = calculate2SvarFisherPValue(varStatistic, df1, df2, alternativevariance);

    // Calculate confidence intervals
    const confidenceInterval = calculate2SvarFisherConfidenceInterval(
      sample1Variance,
      sample2Variance,
      df1,
      df2,
      significance
    );
    varianceCI_minus = confidenceInterval.lower;
    varianceCI_plus = confidenceInterval.upper;
    
  } else {
    // Use Levene's test for non-normal data
    varTestName = "Levene";
    df1 = 1; // k-1 where k=2 groups
    df2 = n1 + n2 - 2; // n-k where k=2 groups
    
    // Calculate Levene statistic
    varStatistic = calculate2SvarLeveneValue(dataValues1, dataValues2);
    
    // Calculate critical value
    varCriteria = calculate2SvarLeveneCriticalValue(significance, df1, df2, alternativevariance);

    // Calculate p-value
    varp_Value = calculate2SvarLevenePValue(varStatistic, df1, df2, alternativevariance);

    // Calculate confidence intervals
    const confidenceInterval = calculate2SvarLeveneConfidenceInterval(
      dataValues1,
      dataValues2,
      significance
    );
    varianceCI_minus = confidenceInterval.lower;
    varianceCI_plus = confidenceInterval.upper;
  } 
  const varianceConfidenceIntervals = Bonferroni([dataValues1, dataValues2], significance);

  return {
    varTestName,
    varn1: n1,
    varDF1: df1,
    varStdev1: Math.sqrt(sample1Variance),
    varn2: n2,
    varDF2: df2,
    varStdev2: Math.sqrt(sample2Variance),
    varStatistic,
    varCriteria: typeof varCriteria === 'number' ? varCriteria : { lower: varCriteria.lower, upper: varCriteria.upper },
    varp_Value,
    varianceCI_minus,
    varianceCI_plus,
    variance1CI: {
      lower: varianceConfidenceIntervals.varianceConfidenceIntervals[0].lower,
      upper: varianceConfidenceIntervals.varianceConfidenceIntervals[0].upper
    },
    variance2CI: {
      lower: varianceConfidenceIntervals.varianceConfidenceIntervals[1].lower,
      upper: varianceConfidenceIntervals.varianceConfidenceIntervals[1].upper
    },
  };
}