import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Trash2, Undo } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { apiRequest } from '@/lib/queryClient';
import { BetaRawContentBlockDeltaEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
import {twosampleMeanHypothesisTest} from "./twosampleMeanHypothesisTest";
import {twosampleVarianceHypothesisTest} from "./twosampleVarianceHypothesisTest";
import {twosampleMedianHypothesisTest} from "./twosampleMedianHypothesisTest";
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
  calculate2SMeanSampleSize,
  calculate2SVarianceSampleSize
} from "@/lib/statisticsUtils";
//import BoxPlotWith2SMeanTest from './BoxPlotWith2SMeanTest';
//import BoxPlotWith2SMedianTest from './BoxPlotWith2SMedianTest';
//import TwoSVarianceTestCI from './twoSVarianceTestCI';

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQTwoSampleHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  enableMeanTest?: boolean;
  enableVarianceTest?: boolean;
  enableMedianTest?: boolean;
  deltaMean0?: number;
  ratioVariance0?: number;
  deltaMedian0?: number;
  dataSet1?: DataPoint[];
  dataset1description?: string;
  dataSet2?: DataPoint[];
  dataset2description?: string;
  enableMean2SPower: boolean;
  power2SMeanMean1: number;
  power2SMeanMean2: number;
  power2SMeanStdev: number;
  enableVariance2SPower: boolean;
  power2SVarianceStdev1: number;
  power2SVarianceStdev2: number;
}

interface ContCTQTwoSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface PowerSampleSizeResults {
  twoSMeansampleSize: number;
  twoSMeanactualPower: number;
  twoSVariancesampleSize: number;
  twoSVarianceactualPower: number;
}

interface RunTestResults {
  sampleSize: number;
  meanValue1: number;
  stdev1: number;
  variance1: number;
  median1: number;
  SEmean1: number;
  SEvariance1: number;
  SEmedian1: number;
  ADvalue1: number;
  ADp_Value1: number;
  tStatistic1: number | {lower: number; upper: number};
  tCriteria1: number | {lower: number; upper: number};
  tp_Value1: number;
  mean1CI_minus: number;
  mean1CI_plus: number;
  df1: number;
  varStatistic: number;
  varCriteria: number | {
    lower: number;
    upper: number;
    };
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
}
interface MeanTestResults {
  meanValue: number;
  SEmean: number;
  tStatistic: number | {lower: number; upper: number};
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  meanCI_minus: number;
  meanCI_plus: number;
}

interface VarianceTestResults {
  
  varStatistic: number;
  varCriteria: number | {
    lower: number;
    upper: number;
    };
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
}

interface MedianTestResults {
  
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
}

export function ContCTQTwoSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQTwoSampleHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternativemean, setAlternativemean] = useState("Less than");
  const [alternativevariance, setAlternativevariance] = useState("Less than");
  const [alternativemedian, setAlternativemedian] = useState("Less than");
  const [power2SMeanPower, setPower2SMeanPower] = useState("0.90");
  const [power2SMeanAlpha, setPower2SMeanAlpha] = useState("0.05");
  const [power2SMeanHa, setPower2SMeanHa] = useState('≠');
  const [power2SVariancePower, setPower2SVariancePower] = useState("0.90");
  const [power2SVarianceAlpha, setPower2SVarianceAlpha] = useState("0.05");
  const [power2SVarianceHa, setPower2SVarianceHa] = useState('≠');

  const [PowerSampleSizeResults, setPowerSampleSizeResults] = useState<PowerSampleSizeResults>({
    twoSMeansampleSize: 0,
    twoSMeanactualPower: 0,
    twoSVariancesampleSize: 0,
    twoSVarianceactualPower: 0,
  });
  
  const [testResults, setTestResults] = useState<RunTestResults>({
    sampleSize: 0,
    meanValue1: 0,
    stdev1: 0,
    variance1:0,
    median1: 0,
    SEmean1: 0,
    SEvariance1: 0,
    SEmedian1: 0,
    ADvalue1: 0,
    ADp_Value1: 0,
    tStatistic1: 0,
    tCriteria1: 0,
    tp_Value1: 0,
    mean1CI_minus: 0,
    mean1CI_plus: 0,
    df1: 0,
    varStatistic: 0,
    varCriteria: 0,
    varp_Value: 0,
    varianceCI_minus: 0,
    varianceCI_plus: 0,
    medianStatistic: 0,
    medianCriteria: 0,
    medianp_Value: 0,
    medianCI_minus: 0,
    medianCI_plus: 0
  });
  const [twosampleMeanTestresult, setTwosampleMeanTestresult] = useState<MeanTestResults | null>(null); // Initialize with null
  const [twosampleVarianceTestresult, setTwosampleVarianceTestresult] = useState<VarianceTestResults | null>(null); // Initialize with null
  const [twosampleMedianTestresult, setTwosampleMedianTestresult] = useState<MedianTestResults | null>(null); // Initialize with null
  // Data input state for Two Sample test
  const [dataSet1, setDataSet1] = useState<DataPoint[]>([]);
  const [dataSet2, setDataSet2] = useState<DataPoint[]>([]);
  const [inputValue1, setInputValue1] = useState("");
  const [inputValue2, setInputValue2] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [focusedCell1, setFocusedCell1] = useState<number>(-1);
  const [focusedCell2, setFocusedCell2] = useState<number>(-1);
  const [editingCell1, setEditingCell1] = useState<number>(-1);
  const [editingCell2, setEditingCell2] = useState<number>(-1);
  const [editValue1, setEditValue1] = useState<string>("");
  const [editValue2, setEditValue2] = useState<string>("");
  const [undoState1, setUndoState1] = useState<DataPoint[] | null>(null);
  const [undoState2, setUndoState2] = useState<DataPoint[] | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [showBoxPlot, setShowBoxPlot] = useState(false);
  
  // Ref for the scrollable table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Initialize ContCTQTwoSampleHypTestData with default values
  const [ContCTQTwoSampleHypTestData, setContCTQTwoSampleHypTestData] = useState<{ [ctqId: number]: ContCTQTwoSampleHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "Two Sample Hyp-Test",
      enableMeanTest: false,
      enableVarianceTest: false,
      enableMedianTest: false,
      deltaMean0: 0,
      ratioVariance0: 1,
      deltaMedian0: 0,
      dataset1description: "",
      dataset2description: "",
      enableMean2SPower: false,
      power2SMeanMean1: 0,
      power2SMeanMean2: 0,
      power2SMeanStdev: 0,
      enableVariance2SPower: false,
      power2SVarianceStdev1: 0,
      power2SVarianceStdev2: 0,
    }
  }));

  // TanStack Query for loading data from database
  const { data: configData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/two-sample-hypothesis-config`],
    enabled: !!projectId && !!ctqId,
    retry: false,
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/two-sample-hypothesis-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Two-sample hypothesis testing configuration has been saved successfully.",
      });
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/two-sample-hypothesis-config`] });
    },
    onError: (error: any) => {
      console.error('Save configuration error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load configuration data from database when available
  useEffect(() => {
    if (configData && (configData as any).config && !isLoading) {
      setTimeout(() => {
        const config = (configData as any).config;
        
        // Update significanceLevel and alternative options from database
        if (config.significanceLevel) {
          setSignificanceLevel(config.significanceLevel);
        }
        if (config.alternativemean) {
          setAlternativemean(config.alternativemean);
        }
        if (config.alternativevariance) {
          setAlternativevariance(config.alternativevariance);
        }
        if (config.alternativemedian) {
          setAlternativemedian(config.alternativemedian);
        }
        // Update data points from database
        if (config.dataSet1 && Array.isArray(config.dataSet1)) {
          setDataSet1(config.dataSet1);
        }

        // Update local power analysis state variables from database
        if (config.power2SMeanPower) {
          setPower2SMeanPower(config.power2SMeanPower);
        }
        if (config.power2SMeanHa) {
          setPower2SMeanHa(config.power2SMeanHa);
        }
        if (config.power2SMeanAlpha) {
          setPower2SMeanAlpha(config.power2SMeanAlpha);
        }

        // Update local power analysis state variables from database
        if (config.power2SVariancePower) {
          setPower2SVariancePower(config.power2SVariancePower);
        }
        if (config.power2SVarianceHa) {
          setPower2SVarianceHa(config.power2SVarianceHa);
        }
        if (config.power2SVarianceAlpha) {
          setPower2SVarianceAlpha(config.power2SVarianceAlpha);
        }
        
        // Update ContCTQTwoSampleHypTestData from database
        setContCTQTwoSampleHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            ...prev[ctqId],
            enableMeanTest: config.enableMeanTest ?? true,
            enableVarianceTest: config.enableVarianceTest ?? true,
            enableMedianTest: config.enableMedianTest ?? true,
            deltaMean0: config.deltaMean0 || 0,
            ratioVariance0: config.ratioVariance0 || 1,
            deltaMedian0: config.deltaMedian0 || 0,
            dataset1description: config.dataset1Description || "",
            dataset2description: config.dataset2Description || "",
            enableMean2SPower: config.enableMean2SPower ?? true,
            power2SMeanMean1: config.power2SMeanMean1 || 0,
            power2SMeanMean2: config.power2SMeanMean2 || 0,
            power2SMeanStdev: config.power2SMeanStdev || 0, 
            enableVariance2SPower: config.enableVariance2SPower ?? true,
            power2SVarianceStdev1: config.power2SVarianceStdev1 || 0,
            power2SVarianceStdev2: config.power2SVarianceStdev2 || 0,
          }
        }));
      }, 0);
    }
  }, [configData, ctqId, isLoading]);

  // Function to save current configuration to database
  const saveConfiguration = () => {
    const currentConfig = ContCTQTwoSampleHypTestData[ctqId];
    if (!currentConfig) return;
    
    const configToSave = {
      testType: currentConfig.testType,
      enableMeanTest: currentConfig.enableMeanTest,
      enableVarianceTest: currentConfig.enableVarianceTest,
      enableMedianTest: currentConfig.enableMedianTest,
      significanceLevel,
      alternativemean,
      alternativevariance,
      alternativemedian,
      deltaMean0: currentConfig.deltaMean0,
      ratioVariance0: currentConfig.ratioVariance0,
      deltaMedian0: currentConfig.deltaMedian0,
      dataSet1,
      dataset1Description: currentConfig.dataset1description || "",
      dataSet2,
      dataset2Description: currentConfig.dataset2description || "",
      enableMean2SPower: currentConfig.enableMean2SPower ?? true,
      power2SMeanPower,
      power2SMeanHa,
      power2SMeanMean1: currentConfig.power2SMeanMean1,
      power2SMeanMean2: currentConfig.power2SMeanMean2,
      power2SMeanStdev: currentConfig.power2SMeanStdev,
      power2SMeanAlpha,
      enableVariance2SPower: currentConfig.enableVariance2SPower ?? true,
      power2SVariancePower,
      power2SVarianceHa,
      power2SVarianceStdev1: currentConfig.power2SVarianceStdev1,
      power2SVarianceStdev2: currentConfig.power2SVarianceStdev2,
      power2SVarianceAlpha,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateContCTQTwoSampleHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQTwoSampleHypTestData, 
    value: any
  ) => {
    setContCTQTwoSampleHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  const handlePowerSampleSize = (
  enableMean2SPower: boolean,
  power2SMeanPower:string,
  power2SMeanHa: string,
  power2SMeanMean1: number,
  power2SMeanMean2: number,
  power2SMeanStdev: number,
  power2SMeanAlpha: string,
  enableVariance2SPower: boolean,
  power2SVariancePower:string,
  power2SVarianceHa: string,
  power2SVarianceStdev1: number,
  power2SVarianceStdev2: number,
  power2SVarianceAlpha: string,
): PowerSampleSizeResults => {

  // Initialize with default values
  
  let nMean = 0;
  let actualMeanPower=0;
  let nVariance = 0;
  let actualVariancePower=0;

  if(enableMean2SPower) {
    if(isNaN(parseFloat(power2SMeanPower))) {
      toast({
        title: "Mean Power & Sample Size test run Unsuccessfully",
        description: "No valid Mean Power value. The Mean Power & Sample Size test has not been executed.",
      });
    }
    else {
      const result = calculate2SMeanSampleSize(
        power2SMeanPower,
        power2SMeanHa,
        power2SMeanMean1,
        power2SMeanMean2,
        power2SMeanStdev,
        power2SMeanAlpha
      );
      nMean=result.sampleSize;
      actualMeanPower= result.actualPower;      
    }
  };

  if(enableVariance2SPower) {
    if(isNaN(parseFloat(power2SVariancePower))) {
      toast({
        title: "Variance Power & Sample Size test run Unsuccessfully",
        description: "No valid Variance Power value. The Variance Power & Sample Size test has not been executed.",
      });
    }
    else {
      const result = calculate2SVarianceSampleSize(
        power2SVariancePower,
        power2SVarianceHa,
        power2SVarianceStdev1,
        power2SVarianceStdev2,
        power2SVarianceAlpha
      );
      nVariance=result.sampleSize;
      actualVariancePower= result.actualPower;      
    }
  };

  setPowerSampleSizeResults(PowerSampleSizeResults);
  toast({
        title: "Power & Sample Size test Run Successfully",
        description: "The Power & Sample Size tests have been executed.",
      });
  return {
    twoSMeansampleSize: nMean,
    twoSMeanactualPower: actualMeanPower,
    twoSVariancesampleSize: nVariance,
    twoSVarianceactualPower: actualVariancePower,
  };

}

{/* on input change, update ContCTQTwoSampleHypTestData state */}
useEffect(() => {
  const currentConfig = ContCTQTwoSampleHypTestData[ctqId];
  if (!currentConfig) return;

  const results = handlePowerSampleSize(
    currentConfig.enableMean2SPower ?? false,
    power2SMeanPower,
    power2SMeanHa,
    currentConfig.power2SMeanMean1 ?? 0,
    currentConfig.power2SMeanMean2 ?? 0,
    currentConfig.power2SMeanStdev ?? 0,
    power2SMeanAlpha,
    currentConfig.enableVariance2SPower ?? false,
    power2SVariancePower,
    power2SVarianceHa,
    currentConfig.power2SVarianceStdev1 ?? 0,
    currentConfig.power2SVarianceStdev2 ?? 0,
    power2SVarianceAlpha,
  );

  setPowerSampleSizeResults(results);
}, [
  ContCTQTwoSampleHypTestData[ctqId]?.enableMean2SPower,
  power2SMeanPower,
  power2SMeanHa,
  ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean1,
  ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean2,
  ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanStdev,
  power2SMeanAlpha,
  ContCTQTwoSampleHypTestData[ctqId]?.enableVariance2SPower,
  power2SVariancePower,
  power2SVarianceHa,
  ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev1,
  ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev2,
  power2SVarianceAlpha,
]);

  const handleRunTest = (
  enableMeanTest: boolean,
  enableVarianceTest: boolean,
  enableMedianTest: boolean,
  dataset1: DataPoint[],
  dataset2: DataPoint[],
  significance: number,
  HaMean: "Less than" | "Greater than" | "Different",
  HaVariance: "Less than" | "Greater than" | "Different",
  HaMedian: "Less than" | "Greater than" | "Different",
  deltaMean0: number,
  ratioVariance0: number,
  deltaMedian0: number,
): RunTestResults => {

  // Initialize with default values
  let sampleSize: number = 0;
  let meanValue1: number = 0;
  let stdev1: number = 0;
  let variance1: number = 0;
  let median1: number = 0;
  let SEmean1: number = 0;
  let SEvariance1: number = 0;
  let SEmedian1: number = 0;
  let ADvalue1: number = 0;
  let ADp_Value1: number = 0;
  let tStatistic1: number | {lower: number; upper: number} = 0;
  let tCriteria1: number | {lower: number; upper: number} = 0;
  let tp_Value1: number = 0;
  let mean1CI_minus: number = 0;
  let mean1CI_plus: number = 0;
  let df1: number = 0;
  let varStatistic: number = 0;
  let varCriteria: number | {lower: number; upper: number} = 0;
  let varp_Value: number = 0;
  let varianceCI_minus: number = 0;
  let varianceCI_plus: number = 0;
  let medianStatistic: number = 0;
  let medianCriteria: number = 0;
  let medianp_Value: number = 0;
  let medianCI_minus: number = 0;
  let medianCI_plus: number = 0;
  let quartiles: { median: number } = { median: 0 };

  if (!dataset1 || dataset1.length === 0) {
    toast({
      title: "Test Run Unsuccessfully",
      description: "No data set. The hypothesis test has not been executed.",
    });
    return {
      sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  else if (dataset1.length === 1) {
    toast({
      title: "Need two data at least to run Hypothesis Testing",
      description: "Need two data at least to run Hypothesis Testing"
    });
    return {
      sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  const dataValues = dataset1.map(point => point.dataValue) || [];
  const n = dataValues.length;
  const meanVal = mean(dataValues);
  const stdDev = standardDeviation(dataValues);
  


  // Perform normality test - will return isNormal, AD value and p_values
  const normalityTest = performNormalityTest(dataValues, meanVal, stdDev);
  ADvalue1 = normalityTest.adStatistic;
  ADp_Value1 = normalityTest.pValue;

  if (enableMeanTest && n > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaMean as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Mean test.",
        variant: "destructive",
      });
      return {
        sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const meanTestResult = twosampleMeanHypothesisTest({
      dataValues,
      significance,
      alternativemean: HaMean as "Less than" | "Greater than" | "Different",
      targetMean: 1,
      ADvalue: ADvalue1,
      ADp_Value: ADp_Value1,
    });
    
    // Update the variables with actual calculated values
    sampleSize = n;
    meanValue1 = meanVal;
    stdev1 = stdDev;
    SEmean1 = meanTestResult.SEmean;
    tStatistic1 = meanTestResult.tStatistic;
    if(typeof meanTestResult.tStatistic === 'number') {
      tStatistic1 = meanTestResult.tStatistic;
    }
    else if(meanTestResult.tStatistic && typeof meanTestResult.tStatistic === 'object') {
      tStatistic1 = {
        lower: meanTestResult.tStatistic.lower,
        upper: meanTestResult.tStatistic.upper
      };
    }
    
    if(typeof meanTestResult.tCriteria === 'number') {
      tCriteria1 = meanTestResult.tCriteria;
    }
    else if(meanTestResult.tCriteria && typeof meanTestResult.tCriteria === 'object') {
      tCriteria1 = {
        lower: meanTestResult.tCriteria.lower,
        upper: meanTestResult.tCriteria.upper
      };
    }
    tp_Value1 = meanTestResult.tp_Value;
    mean1CI_minus = meanTestResult.meanCI_minus;
    mean1CI_plus = meanTestResult.meanCI_plus;
    
    // Update state as well
    setTwosampleMeanTestresult(meanTestResult);
  }
  if (enableVarianceTest && n > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaVariance as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Variance test.",
        variant: "destructive",
      });
      return {
        sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const varianceTestResult = twosampleVarianceHypothesisTest({
      dataValues,
      significance,
      alternativevariance: HaVariance as "Less than" | "Greater than" | "Different",
      targetstdev: 1,
    });
    
    // Update the variables with actual calculated values
    
    sampleSize = n;
    df1 = n-1;
    stdev1 = stdDev;
    variance1=stdDev*stdDev;
    varStatistic = varianceTestResult.varStatistic;
    if(typeof varianceTestResult.varCriteria === 'number') {
      varCriteria = varianceTestResult.varCriteria;
    }
    else if(varianceTestResult.varCriteria && typeof varianceTestResult.varCriteria === 'object') {
      varCriteria = {
        lower: varianceTestResult.varCriteria.lower,
        upper: varianceTestResult.varCriteria.upper
      };
    }
    varp_Value = varianceTestResult.varp_Value;
    varianceCI_minus = varianceTestResult.varianceCI_minus;
    varianceCI_plus = varianceTestResult.varianceCI_plus;
    
    // Update state as well
    setTwosampleVarianceTestresult(varianceTestResult);
  }

  if (enableMedianTest && n > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaMedian as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Median test.",
        variant: "destructive",
      });
      return {
        sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const medianTestResult = twosampleMedianHypothesisTest({
      dataValues,
      significance,
      alternativemedian: HaMedian as "Less than" | "Greater than" | "Different",
      targetMedian: 1,
      useWilcoxon: true,
    });
    
    // Update the variables with actual calculated values
    
    sampleSize = n;
    df1 = n-1;
    stdev1 = stdDev;
    variance1=stdDev*stdDev;
    quartiles = calculateQuartiles(dataValues);
    median1 = quartiles.median;
    medianStatistic = medianTestResult.medianStatistic;
    medianCriteria = medianTestResult.medianCriteria;
    medianp_Value = medianTestResult.medianp_Value;
    medianCI_minus = medianTestResult.medianCI_minus;
    medianCI_plus = medianTestResult.medianCI_plus;
    
    // Update state as well
    setTwosampleMedianTestresult(medianTestResult);
  }

  toast({
    title: "Test Run Successfully",
    description: "The hypothesis test has been executed.",
  });

  return {
      sampleSize, meanValue1, stdev1, variance1, median1, SEmean1, SEvariance1, SEmedian1, ADvalue1, ADp_Value1,
      tStatistic1, tCriteria1, tp_Value1, mean1CI_minus, mean1CI_plus,
      df1, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
  };
};
{/* on input change, update ContCTQTwoSampleHypTestData state */}
useEffect(() => {
  const currentConfig = ContCTQTwoSampleHypTestData[ctqId];
  if (!currentConfig || dataSet1.length === 0) return;

  const results = handleRunTest(
    currentConfig.enableMeanTest ?? false,
    currentConfig.enableVarianceTest ?? false,
    currentConfig.enableMedianTest ?? false,
    dataSet1,
    dataSet2,
    parseFloat(significanceLevel),
    Ha(alternativemean),
    Ha(alternativevariance),
    Ha(alternativemedian),
    currentConfig.deltaMean0 ?? 0,
    currentConfig.ratioVariance0 ?? 1,
    currentConfig.deltaMedian0 ?? 0
  );

  setTestResults(results);
  setShowBoxPlot(true);
}, [
  dataSet1,
  significanceLevel,
  alternativemean,
  alternativevariance,
  alternativemedian,
  ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest,
  ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest,
  ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest,
  ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0,
  ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0,
  ContCTQTwoSampleHypTestData[ctqId]?.deltaMedian0
]);

// Undo functions - restore to previous state and clear undo state
  const handleUndo1 = () => {
    if (undoState1) {
      setDataSet1(JSON.parse(JSON.stringify(undoState1)));
      setUndoState1(null); // Clear the undo state after using it
      setShowUndoButton(false);
      
      toast({
        title: "Undo Complete",
        description: "Previous operation on Dataset 1 has been undone",
      });
    }
  };

  const handleUndo2 = () => {
    if (undoState2) {
      setDataSet2(JSON.parse(JSON.stringify(undoState2)));
      setUndoState2(null); // Clear the undo state after using it
      setShowUndoButton(false);
      
      toast({
        title: "Undo Complete",
        description: "Previous operation on Dataset 2 has been undone",
      });
    }
  };

  // Clear all data functions
  const handleClearAllData1 = () => {
    if (dataSet1.length > 0) {
      // Save current state before clearing
      setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
      setShowUndoButton(true);
      
      // Clear all data for dataset 1
      setDataSet1([]);
      setInputValue1("");
      setPasteInput("");
      setFocusedCell1(-1);
      setEditingCell1(-1);
      setEditValue1("");
      
      toast({
        title: "Dataset 1 Cleared",
        description: "All data in Dataset 1 has been cleared. Use Undo to restore if needed.",
      });
    }
  };

  const handleClearAllData2 = () => {
    if (dataSet2.length > 0) {
      // Save current state before clearing
      setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
      setShowUndoButton(true);
      
      // Clear all data for dataset 2
      setDataSet2([]);
      setInputValue2("");
      setPasteInput("");
      setFocusedCell2(-1);
      setEditingCell2(-1);
      setEditValue2("");
      
      toast({
        title: "Dataset 2 Cleared",
        description: "All data in Dataset 2 has been cleared. Use Undo to restore if needed.",
      });
    }
  };

  // Functions for data input
  const addDataPoint1 = (value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Save current state before making changes
    setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
    
    setDataSet1(prev => [
      ...prev,
      { indexNumber: prev.length + 1, dataValue: numericValue }
    ]);
    
    setInputValue1("");
    
    // Auto-scroll to show the newly added row after a short delay
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const addDataPoint2 = (value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Save current state before making changes
    setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
    
    setDataSet2(prev => [
      ...prev,
      { indexNumber: prev.length + 1, dataValue: numericValue }
    ]);
    
    setInputValue2("");
    
    // Auto-scroll to show the newly added row after a short delay
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleDeleteDataPoint1 = (index: number) => {
    // Save current state before making changes
    setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
    
    setDataSet1(prev => {
      const updatedPoints = prev.filter((_, i) => i !== index);
      // Re-index the remaining points
      const reindexedPoints = updatedPoints.map((point, i) => ({
        ...point,
        indexNumber: i + 1
      }));
      return reindexedPoints;
    });
    
    toast({
      title: "Data Point Deleted",
      description: "The data point has been removed and the list has been re-indexed.",
    });
  };

  const handleDeleteDataPoint2 = (index: number) => {
    // Save current state before making changes
    setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
    
    setDataSet2(prev => {
      const updatedPoints = prev.filter((_, i) => i !== index);
      // Re-index the remaining points
      const reindexedPoints = updatedPoints.map((point, i) => ({
        ...point,
        indexNumber: i + 1
      }));
      return reindexedPoints;
    });
    
    toast({
      title: "Data Point Deleted",
      description: "The data point has been removed and the list has been re-indexed.",
    });
  };

  // Handle paste from Excel functionality for Dataset 1
  const handlePasteData1 = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newDataPoints: DataPoint[] = [];
      
      lines.forEach((line, index) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        
        if (!isNaN(numericValue)) {
          newDataPoints.push({
            indexNumber: dataSet1.length + index + 1,
            dataValue: numericValue
          });
        }
      });
      
      if (newDataPoints.length > 0) {
        // Save current state before making changes
        setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
        
        setDataSet1(prev => [...prev, ...newDataPoints]);
        setPasteInput("");
        toast({
          title: "Data Imported to Dataset 1",
          description: `Successfully imported ${newDataPoints.length} data points from Excel.`,
        });
        
        // Auto-scroll to show the newly added rows after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
          }
        }, 100);
      }
      else {
       toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    }
  };

  // Handle paste from Excel functionality for Dataset 2
  const handlePasteData2 = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newDataPoints: DataPoint[] = [];
      
      lines.forEach((line, index) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        
        if (!isNaN(numericValue)) {
          newDataPoints.push({
            indexNumber: dataSet2.length + index + 1,
            dataValue: numericValue
          });
        }
      });
      
      if (newDataPoints.length > 0) {
        // Save current state before making changes
        setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
        
        setDataSet2(prev => [...prev, ...newDataPoints]);
        setPasteInput("");
        toast({
          title: "Data Imported to Dataset 2",
          description: `Successfully imported ${newDataPoints.length} data points from Excel.`,
        });
        
        // Auto-scroll to show the newly added rows after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
          }
        }, 100);
      }
      else {
       toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    }
  };

  // Handle paste specifically for editing cells - Dataset 1
  const handleCellPaste1 = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats (French regional settings support)
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state before making changes
        setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
        
        setDataSet1(prev => {
          const updatedPoints = [...prev];
          
          // Update existing cells starting from the clicked index
          newValues.forEach((value, i) => {
            const targetIndex = index + i;
            if (targetIndex < updatedPoints.length) {
              // Update existing cell
              updatedPoints[targetIndex] = {
                ...updatedPoints[targetIndex],
                dataValue: value
              };
            } else {
              // Create new data point with correct indexNumber
              updatedPoints.push({
                indexNumber: targetIndex + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted to Dataset 1",
          description: `Successfully pasted ${newValues.length} values starting from row ${index + 1}.`,
        });
        
        // Auto-scroll to show the newly pasted data after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            const lastPastedIndex = index + newValues.length - 1;
            // Calculate the position of the last pasted row
            const rowHeight = 50; // Approximate row height
            const scrollPosition = lastPastedIndex * rowHeight;
            tableContainerRef.current.scrollTop = scrollPosition;
          }
        }, 100);
      }
      else {
       toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    }
  };

  // Handle paste specifically for editing cells - Dataset 2
  const handleCellPaste2 = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats (French regional settings support)
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state before making changes
        setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
        
        setDataSet2(prev => {
          const updatedPoints = [...prev];
          
          // Update existing cells starting from the clicked index
          newValues.forEach((value, i) => {
            const targetIndex = index + i;
            if (targetIndex < updatedPoints.length) {
              // Update existing cell
              updatedPoints[targetIndex] = {
                ...updatedPoints[targetIndex],
                dataValue: value
              };
            } else {
              // Create new data point with correct indexNumber
              updatedPoints.push({
                indexNumber: targetIndex + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted to Dataset 2",
          description: `Successfully pasted ${newValues.length} values starting from row ${index + 1}.`,
        });
        
        // Auto-scroll to show the newly pasted data after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            const lastPastedIndex = index + newValues.length - 1;
            // Calculate the position of the last pasted row
            const rowHeight = 50; // Approximate row height
            const scrollPosition = lastPastedIndex * rowHeight;
            tableContainerRef.current.scrollTop = scrollPosition;
          }
        }, 100);
      }
      else {
       toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    }
  };

  // Handle focused cell paste for Dataset 1 - similar to One Sample functionality
  const handleFocusedCellPaste1 = (pasteData: string) => {
    if (focusedCell1 === -1) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell in Dataset 1 first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }

    try {
      const lines = pasteData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats (French regional settings support)
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state before making changes
        setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
        
        setDataSet1(prev => {
          const updatedPoints = [...prev];
          
          // Update existing cells starting from the focused index
          newValues.forEach((value, i) => {
            const targetIndex = focusedCell1 + i;
            if (targetIndex < updatedPoints.length) {
              // Update existing cell
              updatedPoints[targetIndex] = {
                ...updatedPoints[targetIndex],
                dataValue: value
              };
            } else {
              // Create new data point with correct indexNumber
              updatedPoints.push({
                indexNumber: targetIndex + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted to Dataset 1",
          description: `Successfully pasted ${newValues.length} values starting from row ${focusedCell1 + 1}.`,
        });
        
        // Maintain focus after paste operation
        setTimeout(() => {
          const lastPastedIndex = focusedCell1 + newValues.length - 1;
          if (lastPastedIndex < dataSet1.length + newValues.length) {
            setFocusedCell1(lastPastedIndex);
          }
        }, 50);
        
        // Auto-scroll to show the newly pasted data after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            const lastPastedIndex = focusedCell1 + newValues.length - 1;
            // Calculate the position of the last pasted row
            const rowHeight = 50; // Approximate row height
            const scrollPosition = lastPastedIndex * rowHeight;
            tableContainerRef.current.scrollTop = scrollPosition;
          }
        }, 100);
      } else {
        toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    } catch (error) {
      toast({
        title: "Paste Error",
        description: "An error occurred while pasting data to Dataset 1.",
        variant: "destructive",
      });
    }
  };

  // Handle focused cell paste for Dataset 2 - similar to One Sample functionality
  const handleFocusedCellPaste2 = (pasteData: string) => {
    if (focusedCell2 === -1) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell in Dataset 2 first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }

    try {
      const lines = pasteData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        
        // Handle different decimal separators and number formats (French regional settings support)
        let processedValue = value;
        
        // Handle European format with comma as decimal separator (but not thousands separator)
        if (value.includes(',') && !value.includes('.')) {
          processedValue = value.replace(',', '.');
        }
        
        // Remove any thousands separators (spaces, apostrophes)
        processedValue = processedValue.replace(/[\s']/g, '');
        
        // Handle thousands separators with commas (US format: 1,234.56)
        if (processedValue.includes(',') && processedValue.includes('.')) {
          const parts = processedValue.split('.');
          if (parts.length === 2) {
            const integerPart = parts[0].replace(/,/g, '');
            processedValue = integerPart + '.' + parts[1];
          }
        }
        
        const numericValue = parseFloat(processedValue);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state before making changes
        setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
        
        setDataSet2(prev => {
          const updatedPoints = [...prev];
          
          // Update existing cells starting from the focused index
          newValues.forEach((value, i) => {
            const targetIndex = focusedCell2 + i;
            if (targetIndex < updatedPoints.length) {
              // Update existing cell
              updatedPoints[targetIndex] = {
                ...updatedPoints[targetIndex],
                dataValue: value
              };
            } else {
              // Create new data point with correct indexNumber
              updatedPoints.push({
                indexNumber: targetIndex + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted to Dataset 2",
          description: `Successfully pasted ${newValues.length} values starting from row ${focusedCell2 + 1}.`,
        });
        
        // Maintain focus after paste operation
        setTimeout(() => {
          const lastPastedIndex = focusedCell2 + newValues.length - 1;
          if (lastPastedIndex < dataSet2.length + newValues.length) {
            setFocusedCell2(lastPastedIndex);
          }
        }, 50);
        
        // Auto-scroll to show the newly pasted data after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            const lastPastedIndex = focusedCell2 + newValues.length - 1;
            // Calculate the position of the last pasted row
            const rowHeight = 50; // Approximate row height
            const scrollPosition = lastPastedIndex * rowHeight;
            tableContainerRef.current.scrollTop = scrollPosition;
          }
        }, 100);
      } else {
        toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        }); 
      }
    } catch (error) {
      toast({
        title: "Paste Error",
        description: "An error occurred while pasting data to Dataset 2.",
        variant: "destructive",
      });
    }
  };

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+V/Cmd+V for paste - when this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && activeTab === ctqName) {
        event.preventDefault();
        console.log('Keyboard paste triggered for activeTab:', activeTab, 'ctqName:', ctqName);
        
        // Get clipboard data
        navigator.clipboard.readText().then(clipboardData => {
          if (clipboardData.trim()) {
            // Create a synthetic paste event
            const syntheticEvent = {
              preventDefault: () => {},
              clipboardData: {
                getData: (format: string) => clipboardData
              }
            } as unknown as React.ClipboardEvent;
            
            // Check for focused cells first, then input fields
            console.log('Keyboard paste: focusedCell1:', focusedCell1, 'focusedCell2:', focusedCell2);
            if (focusedCell1 >= 0) {
              // Focused cell in Dataset 1 - use focused cell paste
              console.log('Using handleFocusedCellPaste1 for cell:', focusedCell1);
              handleFocusedCellPaste1(clipboardData);
            } else if (focusedCell2 >= 0) {
              // Focused cell in Dataset 2 - use focused cell paste
              console.log('Using handleFocusedCellPaste2 for cell:', focusedCell2);
              handleFocusedCellPaste2(clipboardData);
            } else {
              // No focused cell - determine based on input field or container focus
              const activeElement = document.activeElement as HTMLElement;
              const isDataset1Input = activeElement?.id === 'add-data-input-1' || 
                                    activeElement?.closest('[data-dataset="1"]');
              const isDataset2Input = activeElement?.id === 'add-data-input-2' || 
                                    activeElement?.closest('[data-dataset="2"]');
              
              if (isDataset1Input) {
                handlePasteData1(syntheticEvent);
              } else if (isDataset2Input) {
                handlePasteData2(syntheticEvent);
              } else {
                // Default to dataset 1 if no specific input is focused
                handlePasteData1(syntheticEvent);
                toast({
                  title: "Data Pasted to Dataset 1",
                  description: "Data was pasted to Dataset 1. Click on Dataset 2 input to paste there instead.",
                  variant: "default",
                });
              }
            }
          }
        }).catch(error => {
          console.error('Clipboard access failed:', error);
          toast({
            title: "Clipboard Access",
            description: "Please use the 'Paste data from Excel' button or paste directly into the table.",
            variant: "default",
          });
        });
      }

      // Handle Ctrl+Z/Cmd+Z for undo - works both in and outside input fields and this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && (undoState1 || undoState2) && activeTab === ctqName) {
        event.preventDefault();
        
        // Determine which dataset to undo based on which input field is focused
        const activeElement = document.activeElement as HTMLElement;
        const isDataset1Input = activeElement?.id === 'add-data-input-1' || 
                              activeElement?.closest('[data-dataset="1"]');
        const isDataset2Input = activeElement?.id === 'add-data-input-2' || 
                              activeElement?.closest('[data-dataset="2"]');
        
        if (isDataset1Input) {
          if (undoState1) {
            handleUndo1();
          } else {
            toast({
              title: "Nothing to Undo",
              description: "No operations available to undo in Dataset 1.",
              variant: "default",
            });
          }
        } else if (isDataset2Input) {
          if (undoState2) {
            handleUndo2();
          } else {
            toast({
              title: "Nothing to Undo",
              description: "No operations available to undo in Dataset 2.",
              variant: "default",
            });
          }
        } else {
          // Only when not focused on any specific dataset, fall back to available undo
          if (undoState1) {
            handleUndo1();
            toast({
              title: "Undoing Dataset 1",
              description: "Undid the last operation on Dataset 1. Focus on a specific dataset input to undo there.",
              variant: "default",
            });
          } else if (undoState2) {
            handleUndo2();
            toast({
              title: "Undoing Dataset 2", 
              description: "Undid the last operation on Dataset 2. Focus on a specific dataset input to undo there.",
              variant: "default",
            });
          } else {
            toast({
              title: "Nothing to Undo",
              description: "No operations available to undo.",
              variant: "default",
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [undoState1, undoState2, activeTab, ctqName]);

  // Handle cell editing for Dataset 1
  const startEditing1 = (index: number, currentValue: number) => {
    setEditingCell1(index);
    setEditValue1(currentValue.toString());
  };

  const saveEdit1 = (index: number) => {
    const numericValue = parseFloat(editValue1);
    if (!isNaN(numericValue)) {
      // Save current state before making changes
      setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
      
      setDataSet1(prev => 
        prev.map((point, i) => 
          i === index ? { ...point, dataValue: numericValue } : point
        )
      );
    }
    setEditingCell1(-1);
    setEditValue1("");
  };

  const cancelEdit1 = () => {
    setEditingCell1(-1);
    setEditValue1("");
  };

  // Handle cell editing for Dataset 2
  const startEditing2 = (index: number, currentValue: number) => {
    setEditingCell2(index);
    setEditValue2(currentValue.toString());
  };

  const saveEdit2 = (index: number) => {
    const numericValue = parseFloat(editValue2);
    if (!isNaN(numericValue)) {
      // Save current state before making changes
      setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
      
      setDataSet2(prev => 
        prev.map((point, i) => 
          i === index ? { ...point, dataValue: numericValue } : point
        )
      );
    }
    setEditingCell2(-1);
    setEditValue2("");
  };

  const cancelEdit2 = () => {
    setEditingCell2(-1);
    setEditValue2("");
  };
  type AlternativeMeanOption = "Less than" | "Greater than" | "Different";

const Ha = (alternative: string): AlternativeMeanOption => {
  switch (alternative) {
    case "Less than":
      return "Less than";
    case "Greater than":
      return "Greater than";
    default:
      return "Different";
  }
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Sample Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
        </p>

        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant between two samples.
        </p>
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-3">
            Statistical parameter to test (Select Multiple)
          </label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-3 gap-12">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MeanTest`}
                  checked={ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest || false}
                  onCheckedChange={(checked) => updateContCTQTwoSampleHypTestDataField(ctqId, "enableMeanTest", checked)}
                />
                <Label htmlFor={`${ctqId}-enableMeanTest`} className="text-sm font-medium text-gray-700">
                  Mean
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-VarianceTest`}
                  checked={ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest || false}
                  onCheckedChange={(checked) => updateContCTQTwoSampleHypTestDataField(ctqId, "enableVarianceTest", checked)}
                />
                <Label htmlFor={`${ctqId}-VarianceTest`} className="text-sm font-medium text-gray-700">
                  Variance/Standard Deviation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MedianTest`}
                  checked={ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest || false}
                  onCheckedChange={(checked) => updateContCTQTwoSampleHypTestDataField(ctqId, "enableMedianTest", checked)}
                />
                <Label htmlFor={`${ctqId}-MedianTest`} className="text-sm font-medium text-gray-700">
                  Median
                </Label>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-12 items-stretch">
              <div className="flex items-top ml-1 h-full space-x-1">
              <Checkbox
                id={`${ctqId}-enableMean2SPower`}
                checked={ContCTQTwoSampleHypTestData[ctqId]?.enableMean2SPower || false}
                onCheckedChange={(checked) => updateContCTQTwoSampleHypTestDataField(ctqId, "enableMean2SPower", checked)}
              />
              {!ContCTQTwoSampleHypTestData[ctqId]?.enableMean2SPower ? (
                <Label htmlFor={`${ctqId}-enableMean2SPower`} className="items-top text-sm font-sm text-gray-400">
                  Power & Sample Size
                </Label>
                ) : (
                <div>
                  <Label htmlFor={`${ctqId}-enableMean2SPower`} className="text-sm font-medium text-gray-700">
                  Power & Sample Size
                  </Label>
                  <Card className="bg-gray-50 min-h-[560px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-sm">Power & Sample Size 2-Sample Mean Hypothesis Testing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <tr>
                        <Label htmlFor='power2SMeanPower'>Power of test(1-β):</Label>
                        <Select value={power2SMeanPower} onValueChange={(value: string) => {
                          setPower2SMeanPower(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanPower', value);
                        }}>
                        <SelectTrigger id='power2SMeanPower'>
                            <SelectValue placeholder="Select Power of test" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.99">99%</SelectItem>
                          <SelectItem value="0.95">95%</SelectItem>
                          <SelectItem value="0.90">90%</SelectItem>
                          <SelectItem value="0.85">85%</SelectItem>
                          <SelectItem value="0.80">80%</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      <tr>
                        <Label htmlFor="power2SMeanHa">Ha:</Label>
                        <Select value={power2SMeanHa} onValueChange={(value: string) => {
                          setPower2SMeanHa(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanHa', value);
                        }}>
                        <SelectTrigger id="power2SMeanHa">
                            <SelectValue placeholder="Select Ha (Alternative Hypothesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="≠">≠</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      <tr>
                        <Label htmlFor="power2SMeanAlpha">Alpha (α):</Label> 
                        <Select value={power2SMeanAlpha} onValueChange={(value: string) => {
                          setPower2SMeanAlpha(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanAlpha', value);
                        }}>
                        <SelectTrigger id="power2SMeanAlpha">
                            <SelectValue placeholder="Select Alpha significance level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.01">1%</SelectItem>
                          <SelectItem value="0.05">5%</SelectItem>
                          <SelectItem value="0.10">10%</SelectItem>
                          <SelectItem value="0.15">15%</SelectItem>
                          <SelectItem value="0.20">20%</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      
                      <tr>Mean 1 (μ1): 
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean1 ?? ''}
                          onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                              ctqId, 
                              "power2SMeanMean1", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter mean 1 value (μ1)"
                          className="mt-1"
                        />
                      </tr>
                      <tr>Mean 2 (μ2): 
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean2 ?? ''}
                          onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                              ctqId, 
                              "power2SMeanMean2", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter mean 2 value (μ2)"
                          className="mt-1"
                        />
                      </tr>
                      
                      <tr>Standard Deviation (σ): 
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanStdev ?? ''}
                          onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                              ctqId, 
                              "power2SMeanStdev", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation value (σ)"
                          className="mt-1"
                        />
                      </tr>

                      <tr className="font-medium text-sm">δ = (μ1-μ2): {(ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean1 -  ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean2).toFixed(3)}
                      </tr>
                      <tr className="font-medium text-sm">
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated Sample Size" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.twoSMeansampleSize.toFixed(1)} <br />
                        Actual Power: {(PowerSampleSizeResults.twoSMeanactualPower*100).toFixed(2)}%
                      </Badge>
                      </tr>
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>

              <div className="flex items-top ml-1 space-x-1">
              <Checkbox
                id={`${ctqId}-enableVariance2SPower`}
                checked={ContCTQTwoSampleHypTestData[ctqId]?.enableVariance2SPower || false}
                onCheckedChange={(checked) => updateContCTQTwoSampleHypTestDataField(ctqId, "enableVariance2SPower", checked)}
              />
              {!ContCTQTwoSampleHypTestData[ctqId]?.enableVariance2SPower ? (
                <Label htmlFor={`${ctqId}-enableVariance2SPower`} className="items-top text-sm font-sm text-gray-400">
                  Power & Sample Size
                </Label>
                ) : (
                <div>
                  <Label htmlFor={`${ctqId}-enableVariance2SPower`} className="text-sm font-medium text-gray-700">
                  Power & Sample Size
                  </Label>
                  <Card className="bg-gray-50 min-h-[560px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-sm">Power & Sample Size 2-Sample Variance Hypothesis Testing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <tr>
                        <Label htmlFor='power2SVariancePower'>Power of test(1-β):</Label>
                        <Select value={power2SVariancePower} onValueChange={(value: string) => {
                          setPower2SVariancePower(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanPower', value);
                        }}>
                        <SelectTrigger id='power2SVariancePower'>
                            <SelectValue placeholder="Select Power of test" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.99">99%</SelectItem>
                          <SelectItem value="0.95">95%</SelectItem>
                          <SelectItem value="0.90">90%</SelectItem>
                          <SelectItem value="0.85">85%</SelectItem>
                          <SelectItem value="0.80">80%</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      <tr>
                        <Label htmlFor="power2SVarianceHa">Ha:</Label>
                        <Select value={power2SVarianceHa} onValueChange={(value: string) => {
                          setPower2SVarianceHa(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanHa', value);
                        }}>
                        <SelectTrigger id="power2SVarianceHa">
                            <SelectValue placeholder="Select Ha (Alternative Hypothesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="≠">≠</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      <tr>
                        <Label htmlFor="power2SVarianceAlpha">Alpha (α):</Label> 
                        <Select value={power2SVarianceAlpha} onValueChange={(value: string) => {
                          setPower2SVarianceAlpha(value);
                          //updateContCTQTwoSampleHypTestDataField(ctqId, 'power2SMeanAlpha', value);
                        }}>
                        <SelectTrigger id="power2SVarianceAlpha">
                            <SelectValue placeholder="Select Alpha significance level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.01">1%</SelectItem>
                          <SelectItem value="0.05">5%</SelectItem>
                          <SelectItem value="0.10">10%</SelectItem>
                          <SelectItem value="0.15">15%</SelectItem>
                          <SelectItem value="0.20">20%</SelectItem>
                        </SelectContent>
                        </Select>  
                      </tr>
                      
                      <tr>Standard Deviation 1 (σ1): 
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev1 ?? ''}
                          onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                              ctqId, 
                              "power2SVarianceStdev1", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation 1 value (σ1)"
                          className="mt-1"
                        />
                      </tr>
                      <tr>Standard Deviation 2 (σ2): 
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev2 ?? ''}
                          onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                              ctqId, 
                              "power2SVarianceStdev2", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation 2 value (σ2)"
                          className="mt-1"
                        />
                      </tr>
                      <tr className="font-medium text-sm">Std dev Ratio (σ1/σ2): {(ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev1 /  ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev2).toFixed(3)}
                      </tr>
                      <tr className="font-medium text-sm">
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated Sample Size" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.twoSVariancesampleSize.toFixed(1)} <br />
                        Actual Power: {(PowerSampleSizeResults.twoSVarianceactualPower*100).toFixed(2)}%
                      </Badge>
                      </tr>
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>
          </div>
          {(ContCTQTwoSampleHypTestData[ctqId]?.enableMean2SPower || 
            ContCTQTwoSampleHypTestData[ctqId]?.enableVariance2SPower) && (    
            <Button 
                className="w-full" 
                onClick={saveConfiguration} 
                disabled={saveConfigMutation.isPending}
                //variant="outline"
              >
                {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
            </Button>
          )}
          <div className="flex flex-wrap items-end"> {/* Changed from space-y-3 to flexbox */}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ? (
                <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Hypothesized difference δ0 (H0):</Label>
                  <Input
                      type="number"
                      step="any"
                      value={ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0 ?? ''}
                      onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                          ctqId, 
                          "deltaMean0", 
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                      )}
                      placeholder="Enter Hypothesized difference δ0 (H0):"
                      className="mt-1"
                  />
              </div>
                ) : (
                <div className="w-1/3 min-w-[100px] pr-4">
                </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ? (
                <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>H0 - Hypthesized ratio σ1/σ2:</Label>
                  <Input
                      type="number"
                      min="0"
                      step="any"
                      value={ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0 ?? ''}
                      onChange={(e) => {
                          const inputValue = e.target.value;
                          
                          // Allow empty input for clearing
                          if (inputValue === '') {
                              updateContCTQTwoSampleHypTestDataField(ctqId, "ratioVariance0", '');
                              return;
                          }
                          
                          const value = parseFloat(inputValue);
                          
                          if (isNaN(value)) {
                              // Invalid input - don't update
                              return;
                          } else if (value < 0) {
                              // Display toast message for negative input
                              toast({
                                  title: "Target Standard Deviation",
                                  description: `Standard deviation cannot be negative. Please enter a positive value.`
                              });
                              // Don't update the field, keeping the previous value
                              return;
                          } else {
                              // Valid non-negative number
                              updateContCTQTwoSampleHypTestDataField(ctqId, "ratioVariance0", value);
                          }
                      }}
                      placeholder="Enter H0 - Hypthetized ratio σ1/σ2"
                      className="mt-1"
                  />
              </div>
            ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ? (
              <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Hypothesized difference δ0 (H0):</Label>
                  <Input
                      type="number"
                      step="any"
                      value={ContCTQTwoSampleHypTestData[ctqId]?.deltaMedian0 ?? ''}
                      onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                          ctqId, 
                          "deltaMedian0", 
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                      )}
                      placeholder="Enter Hypothesized difference δ0 (H0) against which ():"
                      className="mt-1"
                  />
              </div>
              ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
          </div>   
          <div className="grid grid-cols-3 pr-10 gap-12">
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativemean">Ha hypothesis for Means</Label>
            <Select value={alternativemean} onValueChange={setAlternativemean}>
            <SelectTrigger id="alternativemean">
                <SelectValue placeholder="Select Ha alternate hypothesis for means" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
                <SelectItem value="Less than">Less than</SelectItem>
                <SelectItem value="Greater than">Greater than</SelectItem>
            </SelectContent>
            </Select>
            </div>
            ) : (
            <div className="w-1/3 min-w-[200px] pr-4">
            </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativevariance">Ha hypothesis for Variances</Label>
            <Select value={alternativevariance} onValueChange={setAlternativevariance}>
            <SelectTrigger id="alternativevariance">
                <SelectValue placeholder="Select Ha alternate hypothesis for variances" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
                <SelectItem value="Less than">Less than</SelectItem>
                <SelectItem value="Greater than">Greater than</SelectItem>
            </SelectContent>
            </Select>
            </div>
            ) : (
            <div className="w-1/3 min-w-[200px] pr-4">
            </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativemedian">Ha hypothesis for Medians</Label>
            <Select value={alternativemedian} onValueChange={setAlternativemedian}>
            <SelectTrigger id="alternativemedian">
                <SelectValue placeholder="Select Ha alternate hypothesis for medians" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
                <SelectItem value="Less than">Less than</SelectItem>
                <SelectItem value="Greater than">Greater than</SelectItem>
            </SelectContent>
            </Select>
            </div>
            ) : (
            <div className="w-1/3 min-w-[200px] pr-4">
            </div>
            )}
          </div>
          
          <div>
           <div className="grid grid-cols-2 gap-4 pr-4">
            <div>
            <Label htmlFor="significance">Significance Level (α)</Label>
            <Select value={significanceLevel} onValueChange={setSignificanceLevel}>
            <SelectTrigger id="significance">
                <SelectValue placeholder="Select significance level" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="0.01">1%</SelectItem>
                <SelectItem value="0.05">5%</SelectItem>
                <SelectItem value="0.10">10%</SelectItem>
            </SelectContent>
            </Select>
            </div>
            <div></div>

            <div>
            <Label>Description of your dataset 1:</Label>
            <Input
                type="text"
                value={ContCTQTwoSampleHypTestData[ctqId]?.dataset1description || ""}
                onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                    ctqId, 
                    "dataset1description", 
                    e.target.value
                )}
                placeholder="Enter a description of your dataset 1"
                className="mt-0"
            />
            </div>
            <div>
            <Label>Description of your dataset 2:</Label>
            <Input
                type="text"
                value={ContCTQTwoSampleHypTestData[ctqId]?.dataset2description || ""}
                onChange={(e) => updateContCTQTwoSampleHypTestDataField(
                    ctqId, 
                    "dataset2description", 
                    e.target.value
                )}
                placeholder="Enter a description of your dataset 2"
                className="mt-0"
            />
            </div>            
            
            <label className="block text-sm font-medium">Dataset 1 Input:</label>            
            <label className="block text-sm font-medium">Dataset 2 Input:</label>

           {/* Data Input Section for Two Sample Hypothesis Test */}
           <div className="space-y-4" data-dataset="1">
            <div>
            <div className="flex justify-between items-center">
                
                {/* Clear All Data, Undo and Paste from Excel Section */}
                <div className="flex gap-2 mb-2">
                {dataSet1.length > 0 && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllData1}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    title="Clear all data in Dataset 1 (can be undone)"
                    >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All Data
                    </Button>
                )}
                {undoState1 && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndo1}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    >
                    <Undo className="h-4 w-4 mr-1" />
                    Undo
                    </Button>
                )}
                <Button
                    onClick={async () => {
                    try {
                        const clipboardData = await navigator.clipboard.readText();
                        if (clipboardData.trim()) {
                        // Create a synthetic paste event
                        const syntheticEvent = {
                            preventDefault: () => {},
                            clipboardData: {
                            getData: (format: string) => clipboardData
                            }
                        };
                        handlePasteData1(syntheticEvent as any);
                        }
                    } catch (error) {
                        toast({
                        title: "Clipboard Access",
                        description: "Please use Ctrl+V to paste data or manually enter values.",
                        });
                    }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-400 text-gray-700 hover:bg-gray-100"
                >
                    📋 Paste data from Excel
                </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                <div className="text-blue-600 text-xs mt-1">
                Ctrl+V (Cmd+V on Mac) to paste | Ctrl+Z (Cmd+Z on Mac) to undo | Click table cell to paste
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
                Enter dataset 1 values and click Add, then Save Data to persist to database
            </p>

            {/* Data Table */}
            <div ref={tableContainerRef} className="border rounded-md max-h-[500px] overflow-y-auto">
                <table className="min-w-full table-auto">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Index
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Data Value
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Actions
                    </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dataSet1.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="text-center text-gray-500">
                        <div
                            className="cursor-pointer hover:bg-blue-50 rounded" // Added padding for better click target
                            onClick={() => document.getElementById('add-data-input-1')?.focus()}
                            onPaste={(e) => handlePasteData1(e)}
                            tabIndex={0}
                            title="Click to focus input or paste data here"
                        >
                        </div>
                        </td>
                    </tr>
                    ) : (
                    dataSet1.map((point, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {point.indexNumber}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {editingCell1 === index ? (
                            <Input
                                type="number"
                                value={editValue1}
                                onChange={(e) => setEditValue1(e.target.value)}
                                onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    saveEdit1(index);
                                } else if (e.key === 'Escape') {
                                    cancelEdit1();
                                }
                                }}
                                onBlur={() => saveEdit1(index)}
                                className="w-20 h-7 text-xs"
                                step="any"
                                autoFocus
                            />
                            ) : (
                            <div
                                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${focusedCell1 === index ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                                onClick={() => startEditing1(index, point.dataValue)}
                                onFocus={() => {
                                  console.log('Dataset 1 cell focused:', index);
                                  setFocusedCell1(index);
                                }}
                                onBlur={(e) => {
                                  // Don't clear focus immediately - allow multiple paste operations
                                  setTimeout(() => {
                                    // Only clear if user clicked elsewhere and not in related elements
                                    const activeElement = document.activeElement;
                                    const isInputFocused = activeElement?.id === 'add-data-input-1' || activeElement?.id === 'add-data-input-2';
                                    const isInDatasetContainer = activeElement?.closest('[data-dataset]');
                                    
                                    if (!isInputFocused && !isInDatasetContainer && activeElement !== e.currentTarget) {
                                      console.log('Dataset 1 cell blur - clearing focus');
                                      setFocusedCell1(-1);
                                    }
                                  }, 200);
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pasteData = e.clipboardData.getData('text');
                                  setFocusedCell1(index);
                                  handleFocusedCellPaste1(pasteData);
                                }}
                                tabIndex={0}
                                title="Click to edit this value or focus and paste data"
                            >
                                {point.dataValue}
                            </div>
                            )}
                        </td>
                        <td className="px-4 py-2">
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDataPoint1(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete this data point"
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </td>
                        </tr>
                    ))
                    )}

                    {/* Add Data Row - Integrated within the main table */}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-2 text-sm text-gray-500">
                        {dataSet1.length + 1}
                    </td>
                    <td className="px-4 py-2">
                        <Input
                        id="add-data-input-1"
                        type="number"
                        value={inputValue1}
                        onChange={(e) => setInputValue1(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                            addDataPoint1(inputValue1);
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text/plain');
                            const lines = pastedData.trim().split('\n');

                            if (lines.length > 1) {
                            // Multiple values - use the general paste handler
                            handlePasteData1(e);
                            } else {
                            // Single value - set it in the input field
                            const value = lines[0]?.trim();
                            if (value) {
                                setInputValue1(value);
                            }
                            }
                        }}
                        placeholder="Enter numeric value"
                        className="w-full"
                        step="any"
                        />
                    </td>
                    <td className="px-4 py-2">
                        <Button
                        onClick={() => addDataPoint1(inputValue1)}
                        disabled={!inputValue1.trim()}
                        size="sm"
                        >
                        Add
                        </Button>
                    </td>
                    </tr>
                </tbody>
                </table>
            </div>

            {/* Excel Import Instructions */}
            <div className="text-xs text-blue-600 mt-2 space-y-1">
                <div><strong>Excel Import Instructions:</strong></div>
                <div>• <strong>Focus a cell</strong> by clicking on any measurement input field</div>
                <div>• <strong>Paste data</strong> using Ctrl+V (or Cmd+V on Mac) - data will start from the focused cell</div>
                <div>• <strong>Undo changes</strong> using Ctrl+Z (or Cmd+Z on Mac) after pasting</div>
                <div>• <strong>Data will automatically create new rows</strong> if needed</div>
            </div>
            
            {dataSet1.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                <strong>Sample size:</strong> {dataSet1.length} data points
                </div>
            )}
            </div>
           </div>

           <div className="space-y-4" data-dataset="2">
            <div>
            <div className="flex justify-between items-center">
                
                {/* Clear All Data, Undo and Paste from Excel Section */}
                <div className="flex gap-2 mb-2">
                {dataSet2.length > 0 && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllData2}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    title="Clear all data in Dataset 2 (can be undone)"
                    >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All Data
                    </Button>
                )}
                {undoState2 && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndo2}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    >
                    <Undo className="h-4 w-4 mr-1" />
                    Undo
                    </Button>
                )}
                <Button
                    onClick={async () => {
                    try {
                        const clipboardData = await navigator.clipboard.readText();
                        if (clipboardData.trim()) {
                        // Create a synthetic paste event
                        const syntheticEvent = {
                            preventDefault: () => {},
                            clipboardData: {
                            getData: (format: string) => clipboardData
                            }
                        };
                        handlePasteData2(syntheticEvent as any);
                        }
                    } catch (error) {
                        toast({
                        title: "Clipboard Access",
                        description: "Please use Ctrl+V to paste data or manually enter values.",
                        });
                    }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-400 text-gray-700 hover:bg-gray-100"
                >
                    📋 Paste data from Excel
                </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                <div className="text-blue-600 text-xs mt-1">
                Ctrl+V (Cmd+V on Mac) to paste | Ctrl+Z (Cmd+Z on Mac) to undo | Click table cell to paste
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
                Enter dataset 2 values and click Add, then Save Data to persist to database
            </p>

            {/* Data Table */}
            <div ref={tableContainerRef} className="border rounded-md max-h-[500px] overflow-y-auto">
                <table className="min-w-full table-auto">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Index
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Data Value
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                        Actions
                    </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dataSet2.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="text-center text-gray-500">
                        <div
                            className="cursor-pointer hover:bg-blue-50 rounded" // Added padding for better click target
                            onClick={() => document.getElementById('add-data-input-2')?.focus()}
                            onPaste={(e) => handlePasteData2(e)}
                            tabIndex={0}
                            title="Click to focus input or paste data here"
                        >
                        </div>
                        </td>
                    </tr>
                    ) : (
                    dataSet2.map((point, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {point.indexNumber}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {editingCell2 === index ? (
                            <Input
                                type="number"
                                value={editValue2}
                                onChange={(e) => setEditValue2(e.target.value)}
                                onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    saveEdit2(index);
                                } else if (e.key === 'Escape') {
                                    cancelEdit2();
                                }
                                }}
                                onBlur={() => saveEdit2(index)}
                                className="w-20 h-7 text-xs"
                                step="any"
                                autoFocus
                            />
                            ) : (
                            <div
                                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${focusedCell2 === index ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                                onClick={() => startEditing2(index, point.dataValue)}
                                onFocus={() => {
                                  console.log('Dataset 2 cell focused:', index);
                                  setFocusedCell2(index);
                                }}
                                onBlur={(e) => {
                                  // Don't clear focus immediately - allow multiple paste operations
                                  setTimeout(() => {
                                    // Only clear if user clicked elsewhere and not in related elements
                                    const activeElement = document.activeElement;
                                    const isInputFocused = activeElement?.id === 'add-data-input-1' || activeElement?.id === 'add-data-input-2';
                                    const isInDatasetContainer = activeElement?.closest('[data-dataset]');
                                    
                                    if (!isInputFocused && !isInDatasetContainer && activeElement !== e.currentTarget) {
                                      console.log('Dataset 2 cell blur - clearing focus');
                                      setFocusedCell2(-1);
                                    }
                                  }, 200);
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pasteData = e.clipboardData.getData('text');
                                  setFocusedCell2(index);
                                  handleFocusedCellPaste2(pasteData);
                                }}
                                tabIndex={0}
                                title="Click to edit this value or focus and paste data"
                            >
                                {point.dataValue}
                            </div>
                            )}
                        </td>
                        <td className="px-4 py-2">
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDataPoint2(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete this data point"
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </td>
                        </tr>
                    ))
                    )}

                    {/* Add Data Row - Integrated within the main table */}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="px-4 py-2 text-sm text-gray-500">
                        {dataSet2.length + 1}
                    </td>
                    <td className="px-4 py-2">
                        <Input
                        id="add-data-input-2"
                        type="number"
                        value={inputValue2}
                        onChange={(e) => setInputValue2(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                            addDataPoint2(inputValue2);
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text/plain');
                            const lines = pastedData.trim().split('\n');

                            if (lines.length > 1) {
                            // Multiple values - use the general paste handler
                            handlePasteData2(e);
                            } else {
                            // Single value - set it in the input field
                            const value = lines[0]?.trim();
                            if (value) {
                                setInputValue2(value);
                            }
                            }
                        }}
                        placeholder="Enter numeric value"
                        className="w-full"
                        step="any"
                        />
                    </td>
                    <td className="px-4 py-2">
                        <Button
                        onClick={() => addDataPoint2(inputValue2)}
                        disabled={!inputValue2.trim()}
                        size="sm"
                        >
                        Add
                        </Button>
                    </td>
                    </tr>
                </tbody>
                </table>
            </div>

            {/* Excel Import Instructions */}
            <div className="text-xs text-blue-600 mt-2 space-y-1">
                <div><strong>Excel Import Instructions:</strong></div>
                <div>• <strong>Focus a cell</strong> by clicking on any measurement input field</div>
                <div>• <strong>Paste data</strong> using Ctrl+V (or Cmd+V on Mac) - data will start from the focused cell</div>
                <div>• <strong>Undo changes</strong> using Ctrl+Z (or Cmd+Z on Mac) after pasting</div>
                <div>• <strong>Data will automatically create new rows</strong> if needed</div>
            </div>
            
            {dataSet2.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                <strong>Sample size:</strong> {dataSet2.length} data points
                </div>
            )}
            </div>
           </div>

          </div>
          
          <div className="mt-2 mb-3">
            <Button 
              className="w-full" 
              onClick={saveConfiguration} 
              disabled={saveConfigMutation.isPending}
              //variant="outline"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
            </Button>
            {/* Run Test Button 
            <Button
              className={`w-full ${!ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest} &
                ${!ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest} &
                ${!ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest} ? 'opacity-50 cursor-not-allowed' : ''
              `}
              disabled={!ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest &&
                !ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest &&
                !ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest}
              onClick={() => { // Use a block to perform multiple actions
                  const results = handleRunTest(
                      ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ?? false,
                      ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ?? false, // Matches corrected function signature
                      ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ?? false,
                      dataSet1,
                      parseFloat(significanceLevel),
                      Ha(alternativemean),
                      Ha(alternativevariance),
                      Ha(alternativemedian),
                      ContCTQTwoSampleHypTestData[ctqId]?.targetMean ?? 0,
                      ContCTQTwoSampleHypTestData[ctqId]?.targetstdev ?? 0,
                      ContCTQTwoSampleHypTestData[ctqId]?.targetMedian ?? 0
                  );
                  setTestResults(results); // Store the returned results in your state
                  setShowBoxPlot(true); // Show the BoxPlot comptwont after running the test
              }}
            >
                Run Test
            </Button>
            */}
          </div>
          {((ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ||
            ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ||
            ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest) && (twosampleMeanTestresult || twosampleVarianceTestresult || twosampleMedianTestresult) && ( testResults.sampleSize > 1)) && ( 
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50 grid grid-cols-1 gap-2 text-sm">
            <Card className="p-2">
            <CardTitle className="text-lg">Results:</CardTitle>    
            <Badge
              variant="default"
              className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.ADp_Value1 >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
              title={
                testResults.ADp_Value1 >= parseFloat(significanceLevel)
                  ? "Data distribution 1 follows normal distribution (P-Value ≥ ${significanceLevel})"
                  : "Data distribution 1 does not follow normal distribution (P-Value < ${significanceLevel})"
              }
            >
              {testResults.ADp_Value1 >= parseFloat(significanceLevel)
                ? "Data follows normal distribution"
                : "Data does not follow normal distribution"}
            </Badge>
            <div className="text-gray-600 font-medium">Dataset 1 Description:&nbsp;
            {ContCTQTwoSampleHypTestData[ctqId]?.dataset1description}</div>
            <div className="text-gray-600 font-medium">Sample size:&nbsp;
            {testResults.sampleSize}</div>
            <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
            {testResults.ADvalue1.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
            {testResults.ADp_Value1.toFixed(3)}</div>
            
            </Card>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Mean test:</CardTitle>
                <div className="text-lg justify-left">Student T-test:</div>
                <div className="text-gray-600 font-medium">Mean1:&nbsp;
                  {testResults.meanValue1.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Mean2:&nbsp;
                  {testResults.meanValue1.toFixed(3)}</div>
                 <div className="text-gray-600 font-medium">Delta:&nbsp;
                  {ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0}</div>
                <div>
                 <Badge
                  variant="default"
                  className={`mt-4 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.tp_Value1 < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                  title={
                    testResults.tp_Value1 < parseFloat(significanceLevel)
                      ? `Reject H0. Accept Ha (P-Value ${testResults.tp_Value1.toFixed(4)} < ${significanceLevel})`
                      : `Accept H0. Reject Ha (P-Value ${testResults.tp_Value1.toFixed(4)} ≥ ${significanceLevel})`
                  }
                 >
                  {alternativemean==='Less than' ? "Ha: Mean < "
                  : ( alternativemean==='Greater than' ? "Ha: Mean >"
                    :"Ha: Mean ≠ " )} Target<br></br>
                  {testResults.tp_Value1 < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.tp_Value1.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.tp_Value1.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                <div className="text-gray-600 font-medium">SE Mean 1:&nbsp;
                  {testResults.SEmean1.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">T-statistic 1:&nbsp;
                  {typeof testResults.tStatistic1 === 'number' 
                    ? testResults.tStatistic1.toFixed(3) 
                    : `[${testResults.tStatistic1.lower.toFixed(3)} ; ${testResults.tStatistic1.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">T-criteria at significance:&nbsp;
                  {typeof testResults.tCriteria1 === 'number' 
                    ? testResults.tCriteria1.toFixed(3) 
                    : `[${testResults.tCriteria1.lower.toFixed(3)} ; ${testResults.tCriteria1.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">T-test P-value:&nbsp;
                  {testResults.tp_Value1.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">μ1 Lower CI:&nbsp;
                {testResults.mean1CI_minus.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">μ1 Upper CI:&nbsp;
                  {testResults.mean1CI_plus.toFixed(3)}</div>
              </Card>
              )}
              {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Variance test:</CardTitle>
                <div className="text-lg justify-left">χ² (Chi Square) test:</div>
                <div className="text-gray-600 font-medium">Standard Deviation 1:&nbsp;
                  {testResults.stdev1.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Standard Deviation 2:&nbsp;
                  {testResults.stdev1.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Standard Deviations ratio:&nbsp;
                  {ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0}</div>
                <div>
                 <Badge
                  variant="default"
                  className={`mt-4 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.varp_Value < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                  title={
                    testResults.varp_Value < parseFloat(significanceLevel)
                      ? `Reject H0. Accept Ha (P-Value ${testResults.varp_Value.toFixed(4)} < ${significanceLevel})`
                      : `Accept H0. Reject Ha (P-Value ${testResults.varp_Value.toFixed(4)} ≥ ${significanceLevel})`
                  }
                 >
                  {alternativevariance==='Less than' ? "Ha: Standard Deviation < "
                  : ( alternativevariance==='Greater than' ? "Ha: Standard Deviatitwo >"
                    :"Ha: Variance ≠ " )} Target<br></br>
                  {testResults.varp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.varp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.varp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                
                <div className="text-gray-600 font-medium">χ² Degrees of Freedom:&nbsp;
                  {/* df1 error to be fixed */}
                  {testResults.df1.toFixed(0)}</div>
                <div className="text-gray-600 font-medium">χ² statistic:&nbsp;
                  {testResults.varStatistic.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">χ² criteria at significance:&nbsp;
                  {typeof testResults.varCriteria === 'number' 
                    ? testResults.varCriteria.toFixed(3) 
                    : `[${testResults.varCriteria.lower.toFixed(3)} ; ${testResults.varCriteria.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">χ² P-value:&nbsp;
                  {testResults.varp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">Standard deviation Lower CI:&nbsp;
                {testResults.varianceCI_minus.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Standard deviation Upper CI:&nbsp;
                  {testResults.varianceCI_plus.toFixed(3)}</div>
              </Card>
              )}
              {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Median-test:</CardTitle>
                <div className="text-lg justify-left">Wilcoxon test:</div>
                <div className="text-gray-600 font-medium">Median:&nbsp;
                  {testResults.median1.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Delta:&nbsp;
                  {ContCTQTwoSampleHypTestData[ctqId]?.deltaMedian0}</div>
                <div>
                 <Badge
                  variant="default"
                  className={`mt-4 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.medianp_Value < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                  title={
                    testResults.medianp_Value < parseFloat(significanceLevel)
                      ? `Reject H0. Accept Ha (P-Value ${testResults.medianp_Value.toFixed(4)} < ${significanceLevel})`
                      : `Accept H0. Reject Ha (P-Value ${testResults.medianp_Value.toFixed(4)} ≥ ${significanceLevel})`
                  }
                 >
                  {alternativemedian==='Less than' ? "Ha: Median < "
                  : ( alternativemedian==='Greater than' ? "Ha: Median >"
                    :"Ha: Median ≠ " )} Target<br></br>
                  {testResults.medianp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.medianp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.medianp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                <div className="text-gray-600 font-medium">Wilcoxon-statistic:&nbsp;
                  {testResults.medianStatistic.toFixed(3)}</div>
                  <div className="text-gray-600 font-medium">Wilcoxon-criteria at significance:&nbsp;
                  {testResults.medianCriteria.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Wilcoxon-test P-value:&nbsp;
                  {testResults.medianp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">Lower CI:&nbsp;
                  {testResults.medianCI_minus.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Upper CI:&nbsp;
                  {testResults.medianCI_plus.toFixed(3)}</div>
              </Card>
              )}            
            </div>
          </div>
          )}

          {/* 2 sample Student mean test BoxPlot visualization when showBoxPlot is true */}
          {/*
          {showBoxPlot && dataSet1.length > 1 && ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest && (
            <div className="mt-6">
              <BoxPlotWith2SMeanTest
                data={dataSet1.map(point => point.dataValue)}
                ctqName={ctqName}
                mean1={testResults.meanValue1}
                Ha={Ha(alternativemean)}
                h0Value={ContCTQTwoSampleHypTestData[ctqId]?.targetMean ?? 0}
                confidenceInterval={[testResults.mean1CI_minus, testResults.mean1CI_plus]}
                title={`2-Sample Mean T-Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.tp_Value1}
                alphalevel={significanceLevel}
              />
            </div>
          )}
          */}

          {/* 2 sample χ² variance test BoxPlot visualization when showBoxPlot is true */}
          {/*
          {showBoxPlot && dataSet1.length > 1 && ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest && (
            <div className="mt-6">
              <TwoSVarianceTestCI
                data={dataSet1.map(point => point.dataValue)}
                ctqName={ctqName}
                stdev={testResults.stdev1}
                Ha={Ha(alternativevariance)}
                h0Value={ContCTQTwoSampleHypTestData[ctqId]?.targetstdev ?? 0}
                confidenceInterval={[testResults.varianceCI_minus, testResults.varianceCI_plus]}
                title={`2-Sample χ² Variance Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.varp_Value}
                alphalevel={significanceLevel}
              />
            </div>
          )}
          */}
          
          {/* 2 sample Wilcoxon median test BoxPlot visualization when showBoxPlot is true */}
          {/*
          {showBoxPlot && dataSet1.length > 1 && ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest && (
            <div className="mt-6">
              <BoxPlotWith2SMedianTest
                data={dataSet1.map(point => point.dataValue)}
                ctqName={ctqName}
                median={testResults.median1}
                Ha={Ha(alternativemedian)}
                h0Value={ContCTQTwoSampleHypTestData[ctqId]?.targetMedian ?? 0}
                confidenceInterval={[testResults.medianCI_minus, testResults.medianCI_plus]}
                title={`2-Sample Wilcoxon Median Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.medianp_Value}
                alphalevel={significanceLevel}
              />
            </div>
          )}
            */}
          </div>         
        </div>
      </CardContent>
    </Card>
  );
}