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
  testName: string;
  testStatistic: number;
  pValue: number;
}
    
interface multipleSMeanTestProps {
  datasets: number[][];
  normalityresults: number[];
  significanceLevel: number;
  alternative: string;
}

export function multipleSMeanTest({
  datasets,
  normalityresults,
  significanceLevel,
  alternative,
}: multipleSMeanTestProps): MeanTestResults {

  if (datasets.length < 2) {
    throw new Error("At least two datasets are required for ANOVA.");
  }
  // Calculate sample statistics
  if (significanceLevel <= 0 || significanceLevel >= 1) {
    throw new Error("Significance level must be between 0 and 1.");
  }
  if(alternative  !== "Less than" && alternative !== "Greater than" && alternative !== "Different") {
    throw new Error("Alternative hypothesis must be 'Less than', 'Greater than', or 'Different'.");
  } 
  // Check normality results
  const allNormal = normalityresults.every(p => p > significanceLevel);
  if (!allNormal) {
    console.warn("Not all groups passed the normality test. ANOVA may not be appropriate.");
  }

  // Perform ANOVA using jStat
  //const anovaResult = jStat.anovaftest(...datasets);
  
  return {
    testName: "ANOVA One-Way",
    testStatistic: 0.045,
    pValue: 0.045,
  };  
}