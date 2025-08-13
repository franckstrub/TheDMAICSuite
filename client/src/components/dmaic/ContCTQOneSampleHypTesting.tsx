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
import {onesampleMeanHypothesisTest} from "./onesampleMeanHypothesisTest";
import {onesampleVarianceHypothesisTest} from "./onesampleVarianceHypothesisTest";
import {onesampleMedianHypothesisTest} from "./onesampleMedianHypothesisTest";
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
  calculate1SMeanSampleSize,
  calculate1SVarianceSampleSize
} from "@/lib/statisticsUtils";
import BoxPlotWith1SMeanTest from './BoxPlotWith1SMeanTest';
import BoxPlotWith1SMedianTest from './BoxPlotWith1SMedianTest';
import OneSVarianceTestCI from './oneSVarianceTestCI';

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQOneSampleHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  enableMeanTest?: boolean;
  enableVarianceTest?: boolean;
  enableMedianTest?: boolean;
  targetMean?: number;
  targetstdev?: number;
  targetMedian?: number;
  dataPoints?: DataPoint[];
  datasetdescription?: string;
  enableMean1SPower: boolean;
  power1SMeanMean: number;
  power1SMeanH0: number;
  power1SMeanStdev: number;
  enableVariance1SPower: boolean;
  power1SVarianceStdev: number;
  power1SVarianceH0: number;
}

interface ContCTQOneSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface PowerSampleSizeResults {
  oneSMeansampleSize: number;
  oneSMeanactualPower: number;
  oneSVariancesampleSize: number;
  oneSVarianceactualPower: number;
}

interface RunTestResults {
  sampleSize: number;
  meanValue: number;
  stdev: number;
  variance: number;
  median: number;
  SEmean: number;
  SEvariance: number;
  SEmedian: number;
  ADvalue: number;
  ADp_Value: number;
  tStatistic: number | {lower: number; upper: number};
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  meanCI_minus: number;
  meanCI_plus: number;
  df: number;
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

export function ContCTQOneSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQOneSampleHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternativemean, setAlternativemean] = useState("Less than");
  const [alternativevariance, setAlternativevariance] = useState("Less than");
  const [alternativemedian, setAlternativemedian] = useState("Less than");
  const [power1SMeanPower, setPower1SMeanPower] = useState("0.90");
  const [power1SMeanAlpha, setPower1SMeanAlpha] = useState("0.05");
  const [power1SMeanHa, setPower1SMeanHa] = useState('≠');
  const [power1SVariancePower, setPower1SVariancePower] = useState("0.90");
  const [power1SVarianceAlpha, setPower1SVarianceAlpha] = useState("0.05");
  const [power1SVarianceHa, setPower1SVarianceHa] = useState('≠');

  const [PowerSampleSizeResults, setPowerSampleSizeResults] = useState<PowerSampleSizeResults>({
    oneSMeansampleSize: 0,
    oneSMeanactualPower: 0,
    oneSVariancesampleSize: 0,
    oneSVarianceactualPower: 0,
  });
  
  const [testResults, setTestResults] = useState<RunTestResults>({
    sampleSize: 0,
    meanValue: 0,
    stdev: 0,
    variance:0,
    median: 0,
    SEmean: 0,
    SEvariance: 0,
    SEmedian: 0,
    ADvalue: 0,
    ADp_Value: 0,
    tStatistic: 0,
    tCriteria: 0,
    tp_Value: 0,
    meanCI_minus: 0,
    meanCI_plus: 0,
    df: 0,
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
  const [onesampleMeanTestresult, setOnesampleMeanTestresult] = useState<MeanTestResults | null>(null); // Initialize with null
  const [onesampleVarianceTestresult, setOnesampleVarianceTestresult] = useState<VarianceTestResults | null>(null); // Initialize with null
  const [onesampleMedianTestresult, setOnesampleMedianTestresult] = useState<MedianTestResults | null>(null); // Initialize with null
  // Data input state for One Sample test
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [focusedCell, setFocusedCell] = useState<number>(-1);
  const [editingCell, setEditingCell] = useState<number>(-1);
  const [editValue, setEditValue] = useState<string>("");
  const [undoState, setUndoState] = useState<DataPoint[] | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [showBoxPlot, setShowBoxPlot] = useState(false);
  
  // Ref for the scrollable table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Initialize ContCTQOneSampleHypTestData with default values
  const [ContCTQOneSampleHypTestData, setContCTQOneSampleHypTestData] = useState<{ [ctqId: number]: ContCTQOneSampleHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "One Sample Hyp-Test",
      enableMeanTest: false,
      enableVarianceTest: false,
      enableMedianTest: false,
      targetMean: 0,
      targetstdev: 0,
      targetMedian: 0,
      datasetdescription: "",
      enableMean1SPower: false,
      power1SMeanMean: 0,
      power1SMeanH0: 0,
      power1SMeanStdev: 0,
      enableVariance1SPower: false,
      power1SVarianceStdev: 0,
      power1SVarianceH0: 0,
    }
  }));

  // TanStack Query for loading data from database
  const { data: configData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/one-sample-hypothesis-config`],
    enabled: !!projectId && !!ctqId,
    retry: false,
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/one-sample-hypothesis-config`, {
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
        description: "One-sample hypothesis testing configuration has been saved successfully.",
      });
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/one-sample-hypothesis-config`] });
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
        if (config.dataPoints && Array.isArray(config.dataPoints)) {
          setDataPoints(config.dataPoints);
        }

        // Update local power analysis state variables from database
        if (config.power1SMeanPower) {
          setPower1SMeanPower(config.power1SMeanPower);
        }
        if (config.power1SMeanHa) {
          setPower1SMeanHa(config.power1SMeanHa);
        }
        if (config.power1SMeanAlpha) {
          setPower1SMeanAlpha(config.power1SMeanAlpha);
        }

        // Update local power analysis state variables from database
        if (config.power1SVariancePower) {
          setPower1SVariancePower(config.power1SVariancePower);
        }
        if (config.power1SVarianceHa) {
          setPower1SVarianceHa(config.power1SVarianceHa);
        }
        if (config.power1SVarianceAlpha) {
          setPower1SVarianceAlpha(config.power1SVarianceAlpha);
        }
        
        // Update ContCTQOneSampleHypTestData from database
        setContCTQOneSampleHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            ...prev[ctqId],
            enableMeanTest: config.enableMeanTest ?? true,
            enableVarianceTest: config.enableVarianceTest ?? true,
            enableMedianTest: config.enableMedianTest ?? true,
            targetMean: config.targetMean || 0,
            targetstdev: config.targetstdev || 0,
            targetMedian: config.targetMedian || 0,
            datasetdescription: config.datasetDescription || "",
            enableMean1SPower: config.enableMean1SPower ?? true,
            power1SMeanMean: config.power1SMeanMean || 0,
            power1SMeanH0: config.power1SMeanH0 || 0,
            power1SMeanStdev: config.power1SMeanStdev || 0, 
            enableVariance1SPower: config.enableVariance1SPower ?? true,
            power1SVarianceStdev: config.power1SVarianceStdev || 0,
            power1SVarianceH0: config.power1SVarianceH0 || 0,
          }
        }));
      }, 0);
    }
  }, [configData, ctqId, isLoading]);

  // Function to save current configuration to database
  const saveConfiguration = () => {
    const currentConfig = ContCTQOneSampleHypTestData[ctqId];
    if (!currentConfig) return;
    
    const configToSave = {
      testType: currentConfig.testType,
      enableMeanTest: currentConfig.enableMeanTest,
      enableVarianceTest: currentConfig.enableVarianceTest,
      enableMedianTest: currentConfig.enableMedianTest,
      targetMean: currentConfig.targetMean,
      targetstdev: currentConfig.targetstdev,
      targetMedian: currentConfig.targetMedian,
      significanceLevel,
      alternativemean,
      alternativevariance,
      alternativemedian,
      dataPoints,
      datasetDescription: currentConfig.datasetdescription || "",
      enableMean1SPower: currentConfig.enableMean1SPower ?? true,
      power1SMeanPower,
      power1SMeanHa,
      power1SMeanMean: currentConfig.power1SMeanMean,
      power1SMeanH0: currentConfig.power1SMeanH0,
      power1SMeanStdev: currentConfig.power1SMeanStdev,
      power1SMeanAlpha,
      enableVariance1SPower: currentConfig.enableVariance1SPower ?? true,
      power1SVariancePower,
      power1SVarianceHa,
      power1SVarianceStdev: currentConfig.power1SVarianceStdev,
      power1SVarianceH0: currentConfig.power1SVarianceH0,
      power1SVarianceAlpha,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateContCTQOneSampleHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQOneSampleHypTestData, 
    value: any
  ) => {
    setContCTQOneSampleHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  const handlePowerSampleSize = (
  enableMean1SPower: boolean,
  power1SMeanPower:string,
  power1SMeanHa: string,
  power1SMeanMean: number,
  power1SMeanH0: number,
  power1SMeanStdev: number,
  power1SMeanAlpha: string,
  enableVariance1SPower: boolean,
  power1SVariancePower:string,
  power1SVarianceHa: string,
  power1SVarianceStdev: number,
  power1SVarianceH0: number,
  power1SVarianceAlpha: string,
): PowerSampleSizeResults => {

  // Initialize with default values
  
  let nMean = 0;
  let actualMeanPower=0;
  let nVariance = 0;
  let actualVariancePower=0;

  if(enableMean1SPower) {
    if(isNaN(parseFloat(power1SMeanPower))) {
      toast({
        title: "Mean Power & Sample Size test run Unsuccessfully",
        description: "No valid Mean Power value. The Mean Power & Sample Size test has not been executed.",
      });
    }
    else {
      const result = calculate1SMeanSampleSize(
        power1SMeanPower,
        power1SMeanHa,
        power1SMeanMean,
        power1SMeanH0,
        power1SMeanStdev,
        power1SMeanAlpha
      );
      nMean=result.sampleSize;
      actualMeanPower= result.actualPower;      
    }
  };

  if(enableVariance1SPower) {
    if(isNaN(parseFloat(power1SVariancePower))) {
      toast({
        title: "Variance Power & Sample Size test run Unsuccessfully",
        description: "No valid Variance Power value. The Variance Power & Sample Size test has not been executed.",
      });
    }
    else {
      const result = calculate1SVarianceSampleSize(
        power1SVariancePower,
        power1SVarianceHa,
        power1SVarianceStdev,
        power1SVarianceH0,
        power1SVarianceAlpha
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
    oneSMeansampleSize: nMean,
    oneSMeanactualPower: actualMeanPower,
    oneSVariancesampleSize: nVariance,
    oneSVarianceactualPower: actualVariancePower,
  };

}

{/* on input change, update ContCTQOneSampleHypTestData state */}
useEffect(() => {
  const currentConfig = ContCTQOneSampleHypTestData[ctqId];
  if (!currentConfig) return;

  const results = handlePowerSampleSize(
    currentConfig.enableMean1SPower ?? false,
    power1SMeanPower,
    power1SMeanHa,
    currentConfig.power1SMeanMean ?? 0,
    currentConfig.power1SMeanH0 ?? 0,
    currentConfig.power1SMeanStdev ?? 0,
    power1SMeanAlpha,
    currentConfig.enableVariance1SPower ?? false,
    power1SVariancePower,
    power1SVarianceHa,
    currentConfig.power1SVarianceStdev ?? 0,
    currentConfig.power1SVarianceH0 ?? 0,
    power1SVarianceAlpha,
  );

  setPowerSampleSizeResults(results);
}, [
  ContCTQOneSampleHypTestData[ctqId]?.enableMean1SPower,
  power1SMeanPower,
  power1SMeanHa,
  ContCTQOneSampleHypTestData[ctqId]?.power1SMeanMean,
  ContCTQOneSampleHypTestData[ctqId]?.power1SMeanH0,
  ContCTQOneSampleHypTestData[ctqId]?.power1SMeanStdev,
  power1SMeanAlpha,
  ContCTQOneSampleHypTestData[ctqId]?.enableVariance1SPower,
  power1SVariancePower,
  power1SVarianceHa,
  ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceStdev,
  ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceH0,
  power1SVarianceAlpha,
]);

  const handleRunTest = (
  enableMeanTest: boolean,
  enableVarianceTest: boolean,
  enableMedianTest: boolean,
  dataset: DataPoint[],
  significance: number,
  HaMean: "Less than" | "Greater than" | "Different",
  HaVariance: "Less than" | "Greater than" | "Different",
  HaMedian: "Less than" | "Greater than" | "Different",
  targetmean: number,
  targetstdev: number,
  targetmedian: number,
): RunTestResults => {

  // Initialize with default values
  let sampleSize: number = 0;
  let meanValue: number = 0;
  let stdev: number = 0;
  let variance: number = 0;
  let median: number = 0;
  let SEmean: number = 0;
  let SEvariance: number = 0;
  let SEmedian: number = 0;
  let ADvalue: number = 0;
  let ADp_Value: number = 0;
  let tStatistic: number | {lower: number; upper: number} = 0;
  let tCriteria: number | {lower: number; upper: number} = 0;
  let tp_Value: number = 0;
  let meanCI_minus: number = 0;
  let meanCI_plus: number = 0;
  let df: number = 0;
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

  if (!dataset || dataset.length === 0) {
    toast({
      title: "Test Run Unsuccessfully",
      description: "No data set. The hypothesis test has not been executed.",
    });
    return {
      sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
      tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
      df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  else if (dataset.length === 1) {
    toast({
      title: "Need two data at least to run Hypothesis Testing",
      description: "Need two data at least to run Hypothesis Testing"
    });
    return {
      sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
      tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
      df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  const dataValues = dataset.map(point => point.dataValue) || [];
  const n = dataValues.length;
  const meanVal = mean(dataValues);
  const stdDev = standardDeviation(dataValues);
  


  // Perform normality test - will return isNormal, AD value and p_values
  const normalityTest = performNormalityTest(dataValues, meanVal, stdDev);
  ADvalue = normalityTest.adStatistic;
  ADp_Value = normalityTest.pValue;

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
        sampleSize,meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
        df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
        medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const meanTestResult = onesampleMeanHypothesisTest({
      dataValues,
      significance,
      alternativemean: HaMean as "Less than" | "Greater than" | "Different",
      targetMean: targetmean,
      ADvalue,
      ADp_Value,
    });
    
    // Update the variables with actual calculated values
    sampleSize = n;
    meanValue = meanVal;
    stdev = stdDev;
    SEmean = meanTestResult.SEmean;
    tStatistic = meanTestResult.tStatistic;
    if(typeof meanTestResult.tStatistic === 'number') {
      tStatistic = meanTestResult.tStatistic;
    }
    else if(meanTestResult.tStatistic && typeof meanTestResult.tStatistic === 'object') {
      tStatistic = {
        lower: meanTestResult.tStatistic.lower,
        upper: meanTestResult.tStatistic.upper
      };
    }
    
    if(typeof meanTestResult.tCriteria === 'number') {
      tCriteria = meanTestResult.tCriteria;
    }
    else if(meanTestResult.tCriteria && typeof meanTestResult.tCriteria === 'object') {
      tCriteria = {
        lower: meanTestResult.tCriteria.lower,
        upper: meanTestResult.tCriteria.upper
      };
    }
    tp_Value = meanTestResult.tp_Value;
    meanCI_minus = meanTestResult.meanCI_minus;
    meanCI_plus = meanTestResult.meanCI_plus;
    
    // Update state as well
    setOnesampleMeanTestresult(meanTestResult);
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
        sampleSize,meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
        df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
        medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const varianceTestResult = onesampleVarianceHypothesisTest({
      dataValues,
      significance,
      alternativevariance: HaVariance as "Less than" | "Greater than" | "Different",
      targetstdev: targetstdev,
    });
    
    // Update the variables with actual calculated values
    
    sampleSize = n;
    df = n-1;
    stdev = stdDev;
    variance=stdDev*stdDev;
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
    setOnesampleVarianceTestresult(varianceTestResult);
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
        sampleSize,meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
        df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
        medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
      };
    }
    
    const medianTestResult = onesampleMedianHypothesisTest({
      dataValues,
      significance,
      alternativemedian: HaMedian as "Less than" | "Greater than" | "Different",
      targetMedian: targetmedian,
      useWilcoxon: true,
    });
    
    // Update the variables with actual calculated values
    
    sampleSize = n;
    df = n-1;
    stdev = stdDev;
    variance=stdDev*stdDev;
    quartiles = calculateQuartiles(dataValues);
    median = quartiles.median;
    medianStatistic = medianTestResult.medianStatistic;
    medianCriteria = medianTestResult.medianCriteria;
    medianp_Value = medianTestResult.medianp_Value;
    medianCI_minus = medianTestResult.medianCI_minus;
    medianCI_plus = medianTestResult.medianCI_plus;
    
    // Update state as well
    setOnesampleMedianTestresult(medianTestResult);
  }

  toast({
    title: "Test Run Successfully",
    description: "The hypothesis test has been executed.",
  });

  return {
    sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
    tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
    df, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
    medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
  };
};
{/* on input change, update ContCTQOneSampleHypTestData state */}
useEffect(() => {
  const currentConfig = ContCTQOneSampleHypTestData[ctqId];
  if (!currentConfig || dataPoints.length === 0) return;

  const results = handleRunTest(
    currentConfig.enableMeanTest ?? false,
    currentConfig.enableVarianceTest ?? false,
    currentConfig.enableMedianTest ?? false,
    dataPoints,
    parseFloat(significanceLevel),
    Ha(alternativemean),
    Ha(alternativevariance),
    Ha(alternativemedian),
    currentConfig.targetMean ?? 0,
    currentConfig.targetstdev ?? 0,
    currentConfig.targetMedian ?? 0
  );

  setTestResults(results);
  setShowBoxPlot(true);
}, [
  dataPoints,
  significanceLevel,
  alternativemean,
  alternativevariance,
  alternativemedian,
  ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest,
  ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest,
  ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest,
  ContCTQOneSampleHypTestData[ctqId]?.targetMean,
  ContCTQOneSampleHypTestData[ctqId]?.targetstdev,
  ContCTQOneSampleHypTestData[ctqId]?.targetMedian
]);

// Undo function - restore to previous state and clear undo state (like ProcessCapability)
  const handleUndo = () => {
    if (undoState) {
      setDataPoints(JSON.parse(JSON.stringify(undoState)));
      setUndoState(null); // Clear the undo state after using it
      setShowUndoButton(false);
      
      toast({
        title: "Undo Complete",
        description: "Previous operation has been undone",
      });
    }
  };

  // Clear all data function
  const handleClearAllData = () => {
    if (dataPoints.length > 0) {
      // Save current state before clearing
      setUndoState(JSON.parse(JSON.stringify(dataPoints)));
      setShowUndoButton(true);
      
      // Clear all data
      setDataPoints([]);
      setInputValue("");
      setPasteInput("");
      setFocusedCell(-1);
      setEditingCell(-1);
      setEditValue("");
      
      toast({
        title: "Data Cleared",
        description: "All data has been cleared. Use Undo to restore if needed.",
      });
    }
  };

  // Functions for data input
  const addDataPoint = (value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Save current state before making changes
    setUndoState(JSON.parse(JSON.stringify(dataPoints)));
    
    setDataPoints(prev => [
      ...prev,
      { indexNumber: prev.length + 1, dataValue: numericValue }
    ]);
    
    setInputValue("");
    
    // Auto-scroll to show the newly added row after a short delay
    setTimeout(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleDeleteDataPoint = (index: number) => {
    // Save current state before making changes
    setUndoState(JSON.parse(JSON.stringify(dataPoints)));
    
    setDataPoints(prev => {
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

  // Handle paste from Excel functionality
  const handlePasteData = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newDataPoints: DataPoint[] = [];
      
      lines.forEach((line, index) => {
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
          const calculatedIndex = dataPoints.length + index + 1;
          console.log(`Regular paste: creating data point with indexNumber: ${calculatedIndex} (dataPoints.length: ${dataPoints.length}, index: ${index})`);
          newDataPoints.push({
            indexNumber: calculatedIndex,
            dataValue: numericValue
          });
        }
      });
      
      if (newDataPoints.length > 0) {
        // Save current state before making changes
        setUndoState(JSON.parse(JSON.stringify(dataPoints)));
        
        setDataPoints(prev => [...prev, ...newDataPoints]);
        setPasteInput("");
        toast({
          title: "Data Imported",
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

  // Handle focused cell paste - similar to Process Capability functionality
  const handleFocusedCellPaste = (pasteData: string) => {
    console.log(`handleFocusedCellPaste called with focusedCell: ${focusedCell}`);
    
    if (focusedCell === -1) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save current state before making changes
      setUndoState(JSON.parse(JSON.stringify(dataPoints)));
      setShowUndoButton(true);

      // Parse the pasted data
      const rows = pasteData.trim().split('\n');
      const newValues: number[] = [];
      
      rows.forEach(row => {
        let cells: string[] = [];
        
        if (row.includes('\t')) {
          // Excel data with tabs - standard Excel copy format
          cells = row.split('\t');
        } else {
          // No tabs - could be single column or comma-separated
          // First, try to detect if this is a single French decimal number
          const trimmedRow = row.trim();
          
          // Check if this looks like a single French decimal number (digits, optional comma, digits)
          const frenchDecimalPattern = /^-?\d+,\d+$/;
          if (frenchDecimalPattern.test(trimmedRow)) {
            // This is a single French decimal number, don't split by comma
            cells = [trimmedRow];
          } else if (trimmedRow.includes(',')) {
            // Contains commas but doesn't match French decimal pattern
            // Split by comma but be careful about decimal commas
            const parts = trimmedRow.split(',');
            cells = [];
            
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i].trim();
              
              // Check if this part combined with next part could be a French decimal
              if (i < parts.length - 1) {
                const nextPart = parts[i + 1].trim();
                const combined = part + ',' + nextPart;
                
                // If combined looks like a French decimal, combine them
                if (/^-?\d+,\d+$/.test(combined) && !part.includes(' ') && !nextPart.includes(' ')) {
                  cells.push(combined);
                  i++; // Skip next part as we combined it
                  continue;
                }
              }
              
              // Otherwise, treat as separate cell
              if (part !== '') {
                cells.push(part);
              }
            }
          } else {
            // No commas, treat as single cell
            cells = [trimmedRow];
          }
        }
        
        // Process each cell value
        cells.forEach(cell => {
          const trimmedCell = cell.trim();
          if (trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null') {
            return; // Skip empty cells
          } else {
            // Handle different decimal separators and number formats (French regional settings support)
            let processedValue = trimmedCell;
            
            // Handle European format with comma as decimal separator (but not thousands separator)
            if (trimmedCell.includes(',') && !trimmedCell.includes('.')) {
              processedValue = trimmedCell.replace(',', '.');
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
            
            const parsed = parseFloat(processedValue);
            if (!isNaN(parsed) && isFinite(parsed)) {
              newValues.push(parsed);
            }
          }
        });
      });
      
      if (newValues.length === 0) {
        toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy measurement data from Excel first.",
          variant: "destructive",
        });
        return;
      }
      
      // Apply the pasted data starting from the focused cell
      setDataPoints(prev => {
        const updatedPoints = [...prev];
        
        // Calculate the end index for the paste operation
        const endIndex = focusedCell + newValues.length - 1;
        
        // Extend array if needed to accommodate the paste range
        while (updatedPoints.length <= endIndex) {
          updatedPoints.push({
            indexNumber: updatedPoints.length + 1,
            dataValue: 0
          });
        }
        
        // Replace values ONLY from focusedCell to endIndex (inclusive)
        newValues.forEach((value, i) => {
          const targetIndex = focusedCell + i;
          const calculatedIndexNumber = targetIndex + 1;
          console.log(`Focused paste: setting targetIndex ${targetIndex} with indexNumber: ${calculatedIndexNumber}, value: ${value}`);
          updatedPoints[targetIndex] = {
            indexNumber: calculatedIndexNumber,
            dataValue: value
          };
        });
        
        return updatedPoints;
      });
      
      toast({
        title: "Data Pasted",
        description: `Successfully pasted ${newValues.length} values starting from row ${focusedCell + 1} (index ${focusedCell + 1} to ${focusedCell + newValues.length}).`,
      });
      
      // Auto-scroll to show the newly pasted data
      setTimeout(() => {
        if (tableContainerRef.current) {
          const lastPastedIndex = focusedCell + newValues.length - 1;
          const rowHeight = 50;
          const scrollPosition = lastPastedIndex * rowHeight;
          tableContainerRef.current.scrollTop = scrollPosition;
        }
      }, 100);
      
    } catch (error) {
      toast({
        title: "Paste Error",
        description: "Failed to paste data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+V/Cmd+V for paste - only when this CTQ is active AND a cell is focused
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && activeTab === ctqName) {
        event.preventDefault();
        
        if (focusedCell < 0) {
          toast({
            title: "No Cell Focused",
            description: "Please click on a data cell first to set the starting position for paste.",
            variant: "destructive",
          });
          return;
        }
        
        // Get clipboard data
        navigator.clipboard.readText().then(clipboardData => {
          if (clipboardData.trim()) {
            console.log(`Keyboard paste triggered. focusedCell: ${focusedCell}, dataPoints.length: ${dataPoints.length}`);
            console.log('Using focused cell paste');
            handleFocusedCellPaste(clipboardData);
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
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && undoState && activeTab === ctqName) {
        event.preventDefault();
        handleUndo();
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [undoState, activeTab, ctqName, focusedCell]);

  // Handle cell editing
  const startEditing = (index: number, currentValue: number) => {
    setEditingCell(index);
    setEditValue(currentValue.toString());
  };

  const saveEdit = (index: number) => {
    const numericValue = parseFloat(editValue);
    if (!isNaN(numericValue)) {
      // Save current state before making changes
      setUndoState(JSON.parse(JSON.stringify(dataPoints)));
      
      setDataPoints(prev => 
        prev.map((point, i) => 
          i === index ? { ...point, dataValue: numericValue } : point
        )
      );
    }
    setEditingCell(-1);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(-1);
    setEditValue("");
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
        <CardTitle>One-Sample Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
        </p>

        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant between a sample and a target.
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
                  checked={ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest || false}
                  onCheckedChange={(checked) => updateContCTQOneSampleHypTestDataField(ctqId, "enableMeanTest", checked)}
                />
                <Label htmlFor={`${ctqId}-enableMeanTest`} className="text-sm font-medium text-gray-700">
                  Mean
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-VarianceTest`}
                  checked={ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest || false}
                  onCheckedChange={(checked) => updateContCTQOneSampleHypTestDataField(ctqId, "enableVarianceTest", checked)}
                />
                <Label htmlFor={`${ctqId}-VarianceTest`} className="text-sm font-medium text-gray-700">
                  Variance/Standard Deviation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MedianTest`}
                  checked={ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest || false}
                  onCheckedChange={(checked) => updateContCTQOneSampleHypTestDataField(ctqId, "enableMedianTest", checked)}
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
                id={`${ctqId}-enableMean1SPower`}
                checked={ContCTQOneSampleHypTestData[ctqId]?.enableMean1SPower || false}
                onCheckedChange={(checked) => updateContCTQOneSampleHypTestDataField(ctqId, "enableMean1SPower", checked)}
              />
              {!ContCTQOneSampleHypTestData[ctqId]?.enableMean1SPower ? (
                <Label htmlFor={`${ctqId}-enableMean1SPower`} className="items-top text-sm font-sm text-gray-400">
                  Power & Sample Size
                </Label>
                ) : (
                <div>
                  <Label htmlFor={`${ctqId}-enableMean1SPower`} className="text-sm font-medium text-gray-700">
                  Power & Sample Size
                  </Label>
                  <Card className="bg-gray-50 min-h-[540px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-sm">Power & Sample Size 1-Sample Mean Hypothesis Testing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <div>
                      
                        <Label htmlFor='power1SMeanPower'>Power of test(1-β):</Label>
                        
                        <Select value={power1SMeanPower} onValueChange={(value: string) => {
                          setPower1SMeanPower(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanPower', value);
                        }}>
                        <SelectTrigger id='power1SMeanPower'>
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
                       
                      </div>
                      <div>
                      
                        <Label htmlFor="power1SMeanHa">Ha:</Label>
                        
                        <Select value={power1SMeanHa} onValueChange={(value: string) => {
                          setPower1SMeanHa(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanHa', value);
                        }}>
                        <SelectTrigger id="power1SMeanHa">
                            <SelectValue placeholder="Select Ha (Alternative Hypothesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="≠">≠</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                        </SelectContent>
                        </Select> 
                        
                      </div>
                      <div>                      
                        <Label htmlFor="power1SMeanAlpha">Alpha (α):</Label> 
                        
                        <Select value={power1SMeanAlpha} onValueChange={(value: string) => {
                          setPower1SMeanAlpha(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanAlpha', value);
                        }}>
                        <SelectTrigger id="power1SMeanAlpha">
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
                        
                      </div>
                      
                      <div>
                      Mean (μ): 
                        
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQOneSampleHypTestData[ctqId]?.power1SMeanMean ?? ''}
                          onChange={(e) => updateContCTQOneSampleHypTestDataField(
                              ctqId, 
                              "power1SMeanMean", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter mean value (μ)"
                          className="mt-1"
                        />
                        
                      </div>
                      <div>
                      Standard Deviation (σ): 
                        
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQOneSampleHypTestData[ctqId]?.power1SMeanStdev ?? ''}
                          onChange={(e) => updateContCTQOneSampleHypTestDataField(
                              ctqId, 
                              "power1SMeanStdev", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation value (σ)"
                          className="mt-1"
                        />
                        
                      </div>
                      <div>
                      Hypothetized mean H0 (μ0): 
                        
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQOneSampleHypTestData[ctqId]?.power1SMeanH0 ?? ''}
                          onChange={(e) => updateContCTQOneSampleHypTestDataField(
                              ctqId, 
                              "power1SMeanH0", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter hypothetized mean (μ0)"
                          className="mt-1"
                        />
                      </div>

                      <div className="font-medium text-sm">Delta (δ = μ-μ0): {(ContCTQOneSampleHypTestData[ctqId]?.power1SMeanMean -  ContCTQOneSampleHypTestData[ctqId]?.power1SMeanH0).toFixed(3)}
                      </div>
                      <div className="font-medium text-sm">
                      
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated Sample Size" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.oneSMeansampleSize.toFixed(1)} <br />
                        Actual Power: {(PowerSampleSizeResults.oneSMeanactualPower*100).toFixed(2)}%
                      </Badge>
                      
                      </div>
                      
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>

              <div className="flex items-top ml-1 space-x-1">
              <Checkbox
                id={`${ctqId}-enableVariance1SPower`}
                checked={ContCTQOneSampleHypTestData[ctqId]?.enableVariance1SPower || false}
                onCheckedChange={(checked) => updateContCTQOneSampleHypTestDataField(ctqId, "enableVariance1SPower", checked)}
              />
              {!ContCTQOneSampleHypTestData[ctqId]?.enableVariance1SPower ? (
                <Label htmlFor={`${ctqId}-enableVariance1SPower`} className="items-top text-sm font-sm text-gray-400">
                  Power & Sample Size
                </Label>
                ) : (
                <div>
                  <Label htmlFor={`${ctqId}-enableVariance1SPower`} className="text-sm font-medium text-gray-700">
                  Power & Sample Size
                  </Label>
                  <Card className="bg-gray-50 min-h-[540px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-sm">Power & Sample Size 1-Sample Variance Hypothesis Testing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <div>
                      
                        <Label htmlFor='power1SVariancePower'>Power of test(1-β):</Label>
                        
                        <Select value={power1SVariancePower} onValueChange={(value: string) => {
                          setPower1SVariancePower(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanPower', value);
                        }}>
                        <SelectTrigger id='power1SVariancePower'>
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
                       
                      </div>
                      <div>
                      
                        <Label htmlFor="power1SVarianceHa">Ha:</Label>
                        
                        <Select value={power1SVarianceHa} onValueChange={(value: string) => {
                          setPower1SVarianceHa(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanHa', value);
                        }}>
                        <SelectTrigger id="power1SVarianceHa">
                            <SelectValue placeholder="Select Ha (Alternative Hypothesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="≠">≠</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                        </SelectContent>
                        </Select> 
                        
                      </div>

                      <div>                      
                        <Label htmlFor="power1SVarianceAlpha">Alpha (α):</Label> 
                        
                        <Select value={power1SVarianceAlpha} onValueChange={(value: string) => {
                          setPower1SVarianceAlpha(value);
                          //updateContCTQOneSampleHypTestDataField(ctqId, 'power1SMeanAlpha', value);
                        }}>
                        <SelectTrigger id="power1SVarianceAlpha">
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
                        
                      </div>
                      
                      <div>
                      Standard Deviation (σ): 
                        
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceStdev ?? ''}
                          onChange={(e) => updateContCTQOneSampleHypTestDataField(
                              ctqId, 
                              "power1SVarianceStdev", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation value (σ)"
                          className="mt-1"
                        />
                        
                      </div>
                      <div>
                      Hypothetized std dev H0 (σ0): 
                        
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceH0 ?? ''}
                          onChange={(e) => updateContCTQOneSampleHypTestDataField(
                              ctqId, 
                              "power1SVarianceH0", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter hypothetized standard deviation (σ0)"
                          className="mt-1"
                        />
                        
                      </div>
                      <div className="font-medium text-sm">Std dev Ratio (σ/σ0): {(ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceStdev /  ContCTQOneSampleHypTestData[ctqId]?.power1SVarianceH0).toFixed(3)}
                      </div>
                      <div className="font-medium text-sm">
                      
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated Sample Size" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.oneSVariancesampleSize.toFixed(1)} <br />
                        Actual Power: {(PowerSampleSizeResults.oneSVarianceactualPower*100).toFixed(2)}%
                      </Badge>
                      
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>
          </div>
          {(ContCTQOneSampleHypTestData[ctqId]?.enableMean1SPower || 
          ContCTQOneSampleHypTestData[ctqId]?.enableVariance1SPower) && (    
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
            {ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest ? (
                <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Target value for mean:</Label>
                  <Input
                      type="number"
                      step="any"
                      value={ContCTQOneSampleHypTestData[ctqId]?.targetMean ?? ''}
                      onChange={(e) => updateContCTQOneSampleHypTestDataField(
                          ctqId, 
                          "targetMean", 
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                      )}
                      placeholder="Enter target mean"
                      className="mt-1"
                  />
              </div>
                ) : (
                <div className="w-1/3 min-w-[100px] pr-4">
                </div>
            )}
            {ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest ? (
                <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Target value for standard deviation:</Label>
                  <Input
                      type="number"
                      min="0"
                      step="any"
                      value={ContCTQOneSampleHypTestData[ctqId]?.targetstdev ?? ''}
                      onChange={(e) => {
                          const inputValue = e.target.value;
                          
                          // Allow empty input for clearing
                          if (inputValue === '') {
                              updateContCTQOneSampleHypTestDataField(ctqId, "targetstdev", '');
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
                              updateContCTQOneSampleHypTestDataField(ctqId, "targetstdev", value);
                          }
                      }}
                      placeholder="Enter target standard deviation"
                      className="mt-1"
                  />
              </div>
            ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
            {ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest ? (
              <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Target value for median:</Label>
                  <Input
                      type="number"
                      step="any"
                      value={ContCTQOneSampleHypTestData[ctqId]?.targetMedian ?? ''}
                      onChange={(e) => updateContCTQOneSampleHypTestDataField(
                          ctqId, 
                          "targetMedian", 
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                      )}
                      placeholder="Enter target median"
                      className="mt-1"
                  />
              </div>
              ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
          </div> 
          <div className="grid grid-cols-3 pr-10 gap-12">
            {ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativemean">Ha hypothesis for Mean</Label>
            <Select value={alternativemean} onValueChange={setAlternativemean}>
            <SelectTrigger id="alternativemean">
                <SelectValue placeholder="Select Ha hypothesis for mean" />
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
            {ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativevariance">Ha hypothesis for Variance</Label>
            <Select value={alternativevariance} onValueChange={setAlternativevariance}>
            <SelectTrigger id="alternativevariance">
                <SelectValue placeholder="Select Ha hypothesis for variance" />
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
            {ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest ? (
            <div className="w-1/3 min-w-[200px] pr-4">
            <Label htmlFor="alternativemedian">Ha hypothesis for Median</Label>
            <Select value={alternativemedian} onValueChange={setAlternativemedian}>
            <SelectTrigger id="alternativemedian">
                <SelectValue placeholder="Select Ha hypothesis for median" />
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
            <div>
            <Label>Description of your dataset:</Label>
            <Input
                type="text"
                value={ContCTQOneSampleHypTestData[ctqId]?.datasetdescription || ""}
                onChange={(e) => updateContCTQOneSampleHypTestDataField(
                    ctqId, 
                    "datasetdescription", 
                    e.target.value
                )}
                placeholder="Enter a description of your tested dataset"
                className="mt-0"
            />
            </div>
           </div>

          {/* Data Input Section for One Sample Hypothesis Test */}
          <div className="space-y-4">
            <div>
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium mb-2">Data Input</label>
                {/* Clear All Data, Undo and Paste from Excel Section */}
                <div className="flex gap-2 mt-2 mb-2">
                {dataPoints.length > 0 && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllData}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    title="Clear all data (can be undone)"
                    >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All Data
                    </Button>
                )}
                {undoState && (
                    <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndo}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                    >
                    <Undo className="h-4 w-4 mr-1" />
                    Undo
                    </Button>
                )}
                <Button
                    onClick={async () => {
                    if (focusedCell < 0) {
                        toast({
                        title: "No Cell Focused",
                        description: "Please click on a data cell first to set the starting position for paste.",
                        variant: "destructive",
                        });
                        return;
                    }
                    
                    try {
                        const clipboardData = await navigator.clipboard.readText();
                        if (clipboardData.trim()) {
                        // Use focused cell paste since a cell is focused
                        handleFocusedCellPaste(clipboardData);
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
                    className={`border-gray-400 text-gray-700 hover:bg-gray-100 ${
                    focusedCell < 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={focusedCell < 0}
                >
                    📋 Paste data from Excel
                </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                <div className="text-blue-600 text-xs mt-1">
                <strong>Required:</strong> Click table cell to focus (blue ring) first | Then use Ctrl+V or paste button | Ctrl+Z to undo
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
                Enter data values and click Add, then Save Data to persist to database
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
                    {dataPoints.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="text-center text-gray-500">
                        <div
                            className="cursor-pointer hover:bg-blue-50 rounded" // Added padding for better click target
                            onClick={() => document.getElementById('add-data-input')?.focus()}
                            onPaste={(e) => handlePasteData(e)}
                            tabIndex={0}
                            title="Click to focus input or paste data here"
                        >
                        </div>
                        </td>
                    </tr>
                    ) : (
                    dataPoints.map((point, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {point.indexNumber}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                            {editingCell === index ? (
                            <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    saveEdit(index);
                                } else if (e.key === 'Escape') {
                                    cancelEdit();
                                }
                                }}
                                onBlur={() => saveEdit(index)}
                                className="w-20 h-7 text-xs"
                                step="any"
                                autoFocus
                            />
                            ) : (
                            <div
                                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                                  focusedCell === index ? 'ring-2 ring-blue-500 bg-blue-100' : ''
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFocusedCell(index);
                                  // Give visual feedback and log for debugging
                                  console.log(`Focused cell set to index ${index} (row ${point.indexNumber})`);
                                  // Make this div focusable and focus it to maintain focus state
                                  e.currentTarget.focus();
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pasteData = e.clipboardData.getData('text');
                                  setFocusedCell(index);
                                  handleFocusedCellPaste(pasteData);
                                }}
                                tabIndex={0}
                                title="Single click to focus (blue ring), then Ctrl+V to paste data starting from this row. Double-click to edit value."
                                onDoubleClick={() => startEditing(index, point.dataValue)}
                                onBlur={() => {
                                  // Don't immediately clear focus, let user keep it for paste operations
                                  // Only clear if they click elsewhere that sets a new focus
                                }}
                                onFocus={() => {
                                  // Ensure focused cell is set when this div gets focus
                                  setFocusedCell(index);
                                  console.log(`Div focused: setting focusedCell to ${index}`);
                                }}
                            >
                                {point.dataValue}
                            </div>
                            )}
                        </td>
                        <td className="px-4 py-2">
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDataPoint(index)}
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
                        {dataPoints.length + 1}
                    </td>
                    <td className="px-4 py-2">
                        <Input
                        id="add-data-input"
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                            addDataPoint(inputValue);
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text/plain');
                            const lines = pastedData.trim().split('\n');

                            if (lines.length > 1) {
                            // Multiple values - use the general paste handler
                            handlePasteData(e);
                            } else {
                            // Single value - set it in the input field with decimal format handling
                            let value = lines[0]?.trim();
                            if (value) {
                                // Handle French decimal format (comma to dot conversion)
                                if (value.includes(',') && !value.includes('.')) {
                                value = value.replace(',', '.');
                                }
                                setInputValue(value);
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
                        onClick={() => addDataPoint(inputValue)}
                        disabled={!inputValue.trim()}
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
                <div>• <strong>Step 1:</strong> Click on any data value in the table to focus it (blue ring appears)</div>
                <div>• <strong>Step 2:</strong> Use Ctrl+V (or Cmd+V on Mac) or the paste button to paste data</div>
                <div>• <strong>Note:</strong> Paste functionality is disabled until a cell is focused</div>
                <div>• <strong>Data will overwrite</strong> existing values and create new rows as needed</div>
                <div>• <strong>Undo changes</strong> using Ctrl+Z (or Cmd+Z on Mac) after pasting</div>
            </div>
            
            {dataPoints.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                <strong>Sample size:</strong> {dataPoints.length} data points
                </div>
            )}
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
              className={`w-full ${!ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest} &
                ${!ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest} &
                ${!ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest} ? 'opacity-50 cursor-not-allowed' : ''
              `}
              disabled={!ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest &&
                !ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest &&
                !ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest}
              onClick={() => { // Use a block to perform multiple actions
                  const results = handleRunTest(
                      ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest ?? false,
                      ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest ?? false, // Matches corrected function signature
                      ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest ?? false,
                      dataPoints,
                      parseFloat(significanceLevel),
                      Ha(alternativemean),
                      Ha(alternativevariance),
                      Ha(alternativemedian),
                      ContCTQOneSampleHypTestData[ctqId]?.targetMean ?? 0,
                      ContCTQOneSampleHypTestData[ctqId]?.targetstdev ?? 0,
                      ContCTQOneSampleHypTestData[ctqId]?.targetMedian ?? 0
                  );
                  setTestResults(results); // Store the returned results in your state
                  setShowBoxPlot(true); // Show the BoxPlot component after running the test
              }}
            >
                Run Test
            </Button>
            */}
          </div>
          {((ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest ||
            ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest ||
            ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest) && (onesampleMeanTestresult || onesampleVarianceTestresult || onesampleMedianTestresult) && ( testResults.sampleSize > 1)) && ( 
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50 grid grid-cols-1 gap-2 text-sm">
            <Card className="p-2">
            <CardTitle className="text-lg">Results:</CardTitle>    
            <Badge
              variant="default"
              className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.ADp_Value >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
              title={
                testResults.ADp_Value >= parseFloat(significanceLevel)
                  ? "Data follows normal distribution (P-Value ≥ ${significanceLevel})"
                  : "Data does not follow normal distribution (P-Value < ${significanceLevel})"
              }
            >
              {testResults.ADp_Value >= parseFloat(significanceLevel)
                ? "Data follows normal distribution"
                : "Data does not follow normal distribution"}
            </Badge>
            <div className="text-gray-600 font-medium">Dataset Description:&nbsp;
            {ContCTQOneSampleHypTestData[ctqId]?.datasetdescription}</div>
            <div className="text-gray-600 font-medium">Sample size:&nbsp;
            {testResults.sampleSize}</div>
            <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
            {testResults.ADvalue.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
            {testResults.ADp_Value.toFixed(3)}</div>
            
            </Card>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">One-Sample Mean test:</CardTitle>
                <div className="text-lg justify-left">Student T-test:</div>
                <div className="text-gray-600 font-medium">Mean:&nbsp;
                  {testResults.meanValue.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Target:&nbsp;
                  {ContCTQOneSampleHypTestData[ctqId]?.targetMean}</div>
                <div>
                 <Badge
                  variant="default"
                  className={`mt-4 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.tp_Value < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                  title={
                    testResults.tp_Value < parseFloat(significanceLevel)
                      ? `Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                      : `Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} ≥ ${significanceLevel})`
                  }
                 >
                  {alternativemean==='Less than' ? "Ha: Mean < "
                  : ( alternativemean==='Greater than' ? "Ha: Mean >"
                    :"Ha: Mean ≠ " )} Target<br></br>
                  {testResults.tp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                <div className="text-gray-600 font-medium">SE Mean:&nbsp;
                  {testResults.SEmean.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">T-statistic:&nbsp;
                  {typeof testResults.tStatistic === 'number' 
                    ? testResults.tStatistic.toFixed(3) 
                    : `[${testResults.tStatistic.lower.toFixed(3)} ; ${testResults.tStatistic.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">T-criteria at significance:&nbsp;
                  {typeof testResults.tCriteria === 'number' 
                    ? testResults.tCriteria.toFixed(3) 
                    : `[${testResults.tCriteria.lower.toFixed(3)} ; ${testResults.tCriteria.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">T-test P-value:&nbsp;
                  {testResults.tp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">Lower CI:&nbsp;
                {testResults.meanCI_minus.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Upper CI:&nbsp;
                  {testResults.meanCI_plus.toFixed(3)}</div>
              </Card>
              )}
              {ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">One-Sample Variance test:</CardTitle>
                <div className="text-lg justify-left">χ² (Chi Square) test:</div>
                <div className="text-gray-600 font-medium">Standard Deviation:&nbsp;
                  {testResults.stdev.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Standard Deviation Target:&nbsp;
                  {ContCTQOneSampleHypTestData[ctqId]?.targetstdev}</div>
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
                  : ( alternativevariance==='Greater than' ? "Ha: Standard Deviatione >"
                    :"Ha: Variance ≠ " )} Target<br></br>
                  {testResults.varp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.varp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.varp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                
                <div className="text-gray-600 font-medium">χ² Degrees of Freedom:&nbsp;
                  {testResults.df.toFixed(0)}</div>
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
              {ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">One-Sample Median-test:</CardTitle>
                <div className="text-lg justify-left">Wilcoxon test:</div>
                <div className="text-gray-600 font-medium">Median:&nbsp;
                  {testResults.median.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Target:&nbsp;
                  {ContCTQOneSampleHypTestData[ctqId]?.targetMedian}</div>
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

          {/* 1 sample Student mean test BoxPlot visualization when showBoxPlot is true */}
          {showBoxPlot && dataPoints.length > 1 && ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest && (
            <div className="mt-6">
              <BoxPlotWith1SMeanTest
                data={dataPoints.map(point => point.dataValue)}
                ctqName={ctqName}
                mean={testResults.meanValue}
                Ha={Ha(alternativemean)}
                h0Value={ContCTQOneSampleHypTestData[ctqId]?.targetMean ?? 0}
                confidenceInterval={[testResults.meanCI_minus, testResults.meanCI_plus]}
                title={`1-Sample Mean T-Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.tp_Value}
                alphalevel={significanceLevel}
              />
            </div>
          )}

          {/* 1 sample χ² variance test BoxPlot visualization when showBoxPlot is true */}
          {showBoxPlot && dataPoints.length > 1 && ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest && (
            <div className="mt-6">
              <OneSVarianceTestCI
                data={dataPoints.map(point => point.dataValue)}
                ctqName={ctqName}
                stdev={testResults.stdev}
                Ha={Ha(alternativevariance)}
                h0Value={ContCTQOneSampleHypTestData[ctqId]?.targetstdev ?? 0}
                confidenceInterval={[testResults.varianceCI_minus, testResults.varianceCI_plus]}
                title={`1-Sample χ² Variance Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.varp_Value}
                alphalevel={significanceLevel}
              />
            </div>
          )}
          
          {/* 1 sample Wilcoxon median test BoxPlot visualization when showBoxPlot is true */}
          {showBoxPlot && dataPoints.length > 1 && ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest && (
            <div className="mt-6">
              <BoxPlotWith1SMedianTest
                data={dataPoints.map(point => point.dataValue)}
                ctqName={ctqName}
                median={testResults.median}
                Ha={Ha(alternativemedian)}
                h0Value={ContCTQOneSampleHypTestData[ctqId]?.targetMedian ?? 0}
                confidenceInterval={[testResults.medianCI_minus, testResults.medianCI_plus]}
                title={`1-Sample Wilcoxon Median Test vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.medianp_Value}
                alphalevel={significanceLevel}
              />
            </div>
          )}
          </div>         
        </div>
      </CardContent>
    </Card>
  );
}