import * as jStat from 'jstat'
import { 
  anovaOneWay
} from "@/lib/statisticsUtils";
import {twosampleVarianceHypothesisTest} from "./twosampleVarianceHypothesisTest";
import {bartlettTest} from "@/lib/statisticsUtils";
import {leveneTest} from "@/lib/statisticsUtils";
import {Bonferroni} from "@/lib/statisticsUtils";
bartlettTest
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface VarianceTestResults {
    testName: string;
    testStatistic: number;
    pValue: number;
    criticalValue: number; 
    varianceConfidenceIntervals: Array<{
      groupIndex: number;
      variance: number;
      lower: number;
      upper: number;
    }>; 
    df1?: number;
    df2?: number;
}
    
interface multipleSVarianceTestProps {
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

export function multipleSVarianceTest({
  datasets,
  normalityResults,
  significanceLevel,
  alternative,
}: multipleSVarianceTestProps): VarianceTestResults {

  if (datasets.length < 2) {
    throw new Error("At least two datasets are required for Variance test.");
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
  let testName = "Bartlett";
  let varianceTestResult: any = null;


  if (allNormal && datasets.length === 2) {
    testName = "Fisher";
    const ratio = normalityResults[0].stdev/normalityResults[1].stdev;
    varianceTestResult = twosampleVarianceHypothesisTest({
          dataValues1:  datasets[0],
          dataValues2: datasets[1],
          significance:  significanceLevel,
          alternativevariance: alternative,
          ratioVariance0: ratio,
          ADp_Value1: normalityResults[0].adPValue,
          ADp_Value2: normalityResults[1].adPValue,
        });
    const varConfidenceIntervals = Bonferroni(datasets, significanceLevel);
    return {
          testName: varianceTestResult.varTestName,
          testStatistic: varianceTestResult.varStatistic,
          pValue: varianceTestResult.varp_Value,
          criticalValue: varianceTestResult.varCriteria,
          varianceConfidenceIntervals: varConfidenceIntervals.varianceConfidenceIntervals,
          df1: varianceTestResult.varDF1,
          df2: varianceTestResult.varDF2,
          };  
  }
  else if (allNormal) {
    testName = "Bartlett";
    varianceTestResult = bartlettTest(datasets, significanceLevel, alternative);
    return {
      testName: varianceTestResult.varTestName,
      testStatistic: varianceTestResult.varStatistic,
      pValue: varianceTestResult.varp_Value,
      criticalValue: varianceTestResult.varCriteria,
      varianceConfidenceIntervals: varianceTestResult.varianceConfidenceIntervals,
      df1: varianceTestResult.vardfBarlett,
      df2: varianceTestResult.varDF2,
    };  
  }
  else {
    testName = "Levene";
      varianceTestResult = leveneTest(datasets, significanceLevel, alternative,'median');
      return {
        testName: varianceTestResult.varTestName,
        testStatistic: varianceTestResult.varStatistic,
        pValue: varianceTestResult.varp_Value,
        criticalValue: varianceTestResult.varCriteria,
        varianceConfidenceIntervals: varianceTestResult.varianceConfidenceIntervals,
        df1: varianceTestResult.vardfBetween,
        df2: varianceTestResult.vardfWithin,
     };  
  };
}