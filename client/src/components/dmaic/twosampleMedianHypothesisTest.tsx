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
  mannWhitneyCI,
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
  median1CI: {lower: number, upper: number};
  median2CI: {lower: number, upper: number};
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

  // Fix: Use correct variable names and pass the right parameters
  const medianConfidenceIntervals = mannWhitneyCI([dataValues1, dataValues2], significance);

  return {
    grandMedian,
    medianStatistic: medianStatistic.testStatistic,
    medianCriteria,
    medianp_Value: medianStatistic.pValue,
    medianCI_minus,
    medianCI_plus,
    // Fix: Correct syntax for object properties and use proper array indexing
    median1CI: {
      lower: medianConfidenceIntervals[0].lower,
      upper: medianConfidenceIntervals[0].upper
    },
    median2CI: {
      lower: medianConfidenceIntervals[1].lower,
      upper: medianConfidenceIntervals[1].upper
    },
  };
}