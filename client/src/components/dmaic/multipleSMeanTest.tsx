import * as jStat from 'jstat'
import { 
  anovaOneWay
} from "@/lib/statisticsUtils";
import {twosampleMeanHypothesisTest} from "./twosampleMeanHypothesisTest";
import { NumericKeys } from "node_modules/react-hook-form/dist/types/path/common";

interface MeanTestResults {
  anovagroupMeans:  number[];
  anovaPooledStdev: number;
  anovagrandMean: number;
  anovadfBetween: number;
  anovadfWithin: number;
  anovassBetween: number;
  anovassWithin: number;
  anovamsBetween: number;
  anovamsWithin: number;
  anovarSquared: number;        // R-squared (optional)
  anovarSquaredAdj: number;     // Adjusted R-squared (optional)
  anovarSquaredPred: number;    // Predicted R-squared (optional)
  anovaFStatistic: number;
  anovapValue: number;
  anovaconfidenceIntervals: Array<{  // confidence intervals for each group mean
    lower: number;
    upper: number;
  }>;
  studentTestdone: boolean;
  studentStatistic: number;
  studentpooledSE: number;
  studentDegreesOfFreedom: number;
  studenttCriteria: number | {lower: number; upper: number};
  studentdiffCI_minus: number;
  studentdiffCI_plus: number;
  studentpValue: number;
  studentVarEquality: boolean;
  studentfStat: number;
  studentfTestpValue: number;
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
  const studentTestdone = allNormal && datasets.length === 2;
  let meanTestResult: any = null;
  let anovaResults: any = null;
  
  if (allNormal && datasets.length === 2) { //let's do a Student test if 2 distrib. and all are normal
    meanTestResult = twosampleMeanHypothesisTest({
          dataValues1:  datasets[0],
          dataValues2: datasets[1],
          significance:  significanceLevel,
          alternativemean: alternative,
          deltaMean0: 0,
          ADp_Value1: normalityResults[0].adPValue,
          ADp_Value2: normalityResults[1].adPValue,
        });
  }
  else { //do an ANOVA 1-way
    anovaResults = anovaOneWay(datasets, significanceLevel, alternative);
  }
  
  return {
    anovagroupMeans: anovaResults?.groupMeans || [],
    anovaPooledStdev: anovaResults?.pooledstdev || 0,
    anovagrandMean: anovaResults?.grandMean || 0,
    anovadfBetween: anovaResults?.dfBetween || 0,
    anovadfWithin: anovaResults?.dfWithin || 0,
    anovassBetween: anovaResults?.ssBetween || 0,
    anovassWithin: anovaResults?.ssWithin || 0,
    anovamsBetween: anovaResults?.msBetween || 0,
    anovamsWithin: anovaResults?.msWithin || 0,
    anovarSquared: anovaResults?.rSquared || 0,
    anovarSquaredAdj: anovaResults?.rSquaredAdj || 0,
    anovarSquaredPred: anovaResults?.rSquaredPred || 0,
    anovaFStatistic: anovaResults?.fStatistic || 0,
    anovapValue: anovaResults?.pValue || 0,
    anovaconfidenceIntervals: anovaResults?.confidenceIntervals || [],
    studentTestdone: studentTestdone,
    studentStatistic: meanTestResult?.tStatistic || 0,
    studentpooledSE: meanTestResult?.pooledSE || 0,
    studentDegreesOfFreedom: meanTestResult?.degreesOfFreedom || 0,
    studenttCriteria: meanTestResult?.tCriteria || 0,
    studentdiffCI_minus: meanTestResult?.diffCI_minus || 0,
    studentdiffCI_plus: meanTestResult?.diffCI_plus || 0,
    studentpValue: meanTestResult?.tp_Value || 0,
    studentVarEquality: meanTestResult?.equalVariances || false,
    studentfStat: meanTestResult?.fStat || 0,
    studentfTestpValue: meanTestResult?.fTestpValue || 0,
  };  
}