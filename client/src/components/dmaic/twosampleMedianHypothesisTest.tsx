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
  calculateMedian,
  calculate2SMedianStatistic,
  calculate2SMedianCriticalValue,
  calculate2SMedianConfidenceInterval,
} from "@/lib/statisticsUtils";
import { numeric } from "drizzle-orm/sqlite-core";

// Import jStat for statistical functions
import * as jStat from 'jstat';

interface MedianTestResults {
  grandMedian: number;
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
}  
    
interface twosampleMedianHypothesisTestProps {
  dataValues1: number[];
  dataValues2: number[];
  significance: number;
  alternativemedian: "Less than" | "Greater than" | "Different";
  }

export function twosampleMedianHypothesisTest({
  dataValues1,
  dataValues2,
  significance,
  alternativemedian,
}: twosampleMedianHypothesisTestProps): MedianTestResults {
    const grandMedian = calculateMedian([...dataValues1, ...dataValues2]);

    // Calculate Median test statistic and p-Value (Wilcoxon-Mann-Whitney approach) using jStat
    const medianStatistic = calculate2SMedianStatistic(dataValues1, dataValues2, alternativemedian);

    // Calculate critical value
    const medianCriteria = calculate2SMedianCriticalValue(significance);
    
    // Calculate confidence interval
    const { lower: medianCI_minus, upper: medianCI_plus } = 
      calculate2SMedianConfidenceInterval(dataValues1, dataValues2, significance, alternativemedian);
    
    return {
      grandMedian,
      medianStatistic: medianStatistic.testStatistic,
      medianCriteria,
      medianp_Value: medianStatistic.pValue,
      medianCI_minus,
      medianCI_plus,
    };
  }