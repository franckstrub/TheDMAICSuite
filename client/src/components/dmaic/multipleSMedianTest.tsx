
import {twosampleMedianHypothesisTest} from "./twosampleMedianHypothesisTest";
import {kruskalWallisTest} from "@/lib/statisticsUtils";
import {mannWhitneyCI} from "@/lib/statisticsUtils";

import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MedianTestResults {
    testName: string;
    testStatistic: number;
    pValue: number;
    criticalValue: number; 
    medianConfidenceIntervals: Array<{
      groupIndex: number;
      median: number;
      lower: number;
      upper: number;
    }>; 
    df1?: number;
}
    
interface multipleSMedianTestProps {
  datasets: number[][];
  normalityResults: Array<{
        sampleSize: number;
        mean: number;
        stdev: number;
        median: number;
        adValue: number;
        adPValue: number;
      }>;
  significanceLevel: number;
  alternative: string;
}

export function multipleSMedianTest({
  datasets,
  normalityResults,
  significanceLevel,
  alternative,
}: multipleSMedianTestProps): MedianTestResults {

  if (datasets.length < 2) {
    throw new Error("At least two datasets are required for Median test.");
  }
  // Calculate sample statistics
  if (significanceLevel <= 0 || significanceLevel >= 1) {
    throw new Error("Significance level must be between 0 and 1.");
  }
  if(alternative  !== "Less than" && alternative !== "Greater than" && alternative !== "Different") {
    throw new Error("Alternative hypothesis must be 'Less than', 'Greater than', or 'Different'.");
  } 
  // Check normality results
  const allNormal = normalityResults.every(result => result.adPValue > significanceLevel); 
  let medianTestResult: any = null;


  if (datasets.length === 2) {
    
    medianTestResult = twosampleMedianHypothesisTest({
          dataValues1:  datasets[0],
          dataValues2: datasets[1],
          significance:  significanceLevel,
          alternativemedian: alternative,
        });
    const medianConfidenceIntervals = mannWhitneyCI(datasets, significanceLevel);
    return {
          testName: 'Mann-Whitney',
          testStatistic: medianTestResult.medianStatistic,
          pValue: medianTestResult.medianp_Value,
          criticalValue: medianTestResult.medianCriteria,
          medianConfidenceIntervals: medianConfidenceIntervals,
          df1: 0,
          };  
  }
  else {
    
    medianTestResult = kruskalWallisTest(datasets, significanceLevel, alternative);
    return {
      testName: medianTestResult.medianTestName,
      testStatistic: medianTestResult.medianStatistic,
      pValue: medianTestResult.medianp_Value,
      criticalValue: medianTestResult.medianCriteria,
      medianConfidenceIntervals: medianTestResult.medianConfidenceIntervals,
      df1: medianTestResult.dfKruskal,
    };  
  }
}