import * as jStat from 'jstat'
import { 
  anovaOneWay
} from "@/lib/statisticsUtils";
import {twosampleMeanHypothesisTest} from "./twosampleMeanHypothesisTest";
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MeanTestResults {
  testName: string;
  testStatistic: number;
  pValue: number;
}
    
interface multipleSMeanTestProps {
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

export function multipleSMeanTest({
  datasets,
  normalityResults,
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
  const allNormal = normalityResults.every(result => result.adPValue > significanceLevel);
  let testName = "";
  let results: any;
  if (!allNormal || datasets.length > 2) {
    testName = "ANOVA One-way";
    results = anovaOneWay(datasets, significanceLevel, alternative);
  }
  else if (allNormal && datasets.length === 2) {
    testName = "Two-sample t-test";
    const meanTestResult = twosampleMeanHypothesisTest({
          dataValues1:  datasets[0],
          dataValues2: datasets[1],
          significance:  significanceLevel,
          alternativemean: alternative,
          deltaMean0: 0,
          ADp_Value1: normalityResults[0].adPValue,
          ADp_Value2: normalityResults[1].adPValue,
        });
    results = {
      testStatistic: meanTestResult.tStatistic,
      pValue: meanTestResult.tp_Value
    };
  };
  
  return {
    testName: testName,
    testStatistic: results.testStatistic,
    pValue: results.pValue,
  };  
}