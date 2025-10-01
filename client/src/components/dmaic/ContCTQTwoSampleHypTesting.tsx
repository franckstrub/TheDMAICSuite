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
  calculateMovingRange,
  calculateIndividualControlLimits,
  calculateMovingRangeControlLimits,
  calculateZScoreLongShortTerm,
  calculatePerformanceMetrics,
  calculateCapabilityIndexes,
  calculateObservedPerformanceMetrics,
  assessProcessVariation,
  inverseNormCDF,
  calculateMedian,
  calculate2SMeanSampleSize,
  calculate2SVarianceSampleSize
} from "@/lib/statisticsUtils";
import BoxPlotWith2SMeanTest from './BoxPlotWith2SMeanTest';
import BoxPlotWith2SMedianTest from './BoxPlotWith2SMedianTest';
import TwoSVarianceTestCI from './twoSVarianceTestCI';

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
  sampleSize1: number;
  meanValue1: number;
  mean1CI: { lower: number, upper: number };
  stdev1: number;
  variance1CI: { lower: number, upper: number };
  median1: number;
  median1CI: { lower: number, upper: number };
  SEmean1: number;
  ADvalue1: number;
  ADp_Value1: number;
  tStatistic: number;
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  sampleSize2: number;
  meanValue2: number;
  mean2CI: { lower: number, upper: number };
  stdev2: number;
  variance2CI: { lower: number, upper: number };
  median2: number;
  median2CI: { lower: number, upper: number };
  SEmean2: number;
  ADvalue2: number;
  ADp_Value2: number;
  diffCI_minus: number;
  diffCI_plus: number;
  fStat: number;
  fCritical: number;
  fTestpValue: number;
  equalVariances: boolean;
  pooledSE: number;
  degreesOfFreedom: number;
  varTestName: string;
  varDF1: number;
  varDF2: number;
  varStatistic: number;
  varCriteria: number | {
    lower: number;
    upper: number;
    };
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
  grandMedian: number;
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
}
interface MeanTestResults {
  meanValue1: number;
  mean1CI: { lower: number, upper: number };
  SEmean1: number;
  meanValue2: number;
  mean2CI: { lower: number, upper: number };
  SEmean2: number;
  fStat: number;
  fCritical: number;
  fTestpValue: number;
  equalVariances: boolean;
  pooledSE: number; // Pooled standard error for equal variances
                    // For Welch's t-test (unequal variances), this will be the standard error of the difference in means
  degreesOfFreedom: number;
  tStatistic: number;
  tCriteria: number | {lower: number; upper: number};
  tp_Value: number;
  diffCI_minus: number;
  diffCI_plus: number;
}

interface VarianceTestResults {
  
  varTestName: string;
  varDF1: number;
  varDF2: number;
  varStatistic: number;
  varCriteria: number | {
    lower: number;
    upper: number;
    };
  varp_Value: number;
  varianceCI_minus: number;
  varianceCI_plus: number;
  variance1CI: { lower: number, upper: number };
  variance2CI: { lower: number, upper: number };
}

interface MedianTestResults {
  
  grandMedian: number;
  medianStatistic: number;
  medianCriteria: number;
  medianp_Value: number;
  medianCI_minus: number;
  medianCI_plus: number;
  median1CI: { lower: number, upper: number };
  median2CI: { lower: number, upper: number };
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
    sampleSize1: 0,
    meanValue1: 0,
    mean1CI: { lower: 0, upper: 0 },
    stdev1: 0,
    variance1CI: { lower: 0, upper: 0 },
    median1: 0,
    median1CI: { lower: 0, upper: 0 },
    SEmean1: 0,
    ADvalue1: 0,
    ADp_Value1: 0,
    tStatistic: 0,
    tCriteria: 0,
    tp_Value: 0,
    sampleSize2: 0,
    meanValue2: 0,
    mean2CI: { lower: 0, upper: 0 },
    stdev2: 0,
    variance2CI: { lower: 0, upper: 0 },
    median2: 0,
    median2CI: { lower: 0, upper: 0 },
    SEmean2: 0,
    ADvalue2: 0,
    ADp_Value2: 0,
    diffCI_minus: 0,
    diffCI_plus: 0,
    fStat: 0,
    fCritical: 0,
    fTestpValue: 0,
    equalVariances: true,
    pooledSE: 0, // Pooled standard error for equal variances;    
    degreesOfFreedom: 0,
    varTestName: "",
    varDF1: 0,
    varDF2: 0,
    varStatistic: 0,
    varCriteria: 0,
    varp_Value: 0,
    varianceCI_minus: 0,
    varianceCI_plus: 0,
    grandMedian: 0,
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
  const [isDualColumnPaste, setIsDualColumnPaste] = useState(false);
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

        // Update data points from database
        if (config.dataSet2 && Array.isArray(config.dataSet2)) {
          setDataSet2(config.dataSet2);
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

  // Handle clicks outside the tables to unfocus cells
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't unfocus if clicking on buttons, inputs, or interactive elements
      if (target.closest('button') || 
          target.closest('input') || 
          target.closest('select') || 
          target.closest('[role="button"]') ||
          target.closest('.paste-button') ||
          target.closest('.clear-button') ||
          target.closest('.undo-button')) {
        return;
      }
      
      const table1 = document.querySelector('.data-table-container-1');
      const table2 = document.querySelector('.data-table-container-2');
      
      if (table1 && !table1.contains(target)) {
        setFocusedCell1(-1);
        setFocusedCell2(-1);
      }
      if (table2 && !table2.contains(target)) {
        setFocusedCell2(-1);
        setFocusedCell1(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        title: "2S-Mean Power & Sample Size test run Unsuccessfully",
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
): RunTestResults => {

  // Initialize with default values
  let sampleSize1: number = 0;
  let meanValue1: number = 0;
  let mean1CI: { lower: number; upper: number } = { lower: 0, upper: 0 };
  let stdev1: number = 0;
  let variance1CI: { lower: number; upper: number } = { lower: 0, upper: 0 };
  let median1: number = 0;
  let median1CI: { lower: number; upper: number } = { lower: 0, upper: 0 };
  let SEmean1: number = 0;
  let ADvalue1: number = 0;
  let ADp_Value1: number = 0;
  let tStatistic: number=0;
  let tCriteria: number | {lower: number; upper: number} = 0;
  let tp_Value: number = 0;
  let sampleSize2: number = 0;
  let meanValue2: number = 0;
  let mean2CI: { lower: number; upper: number } = { lower: 0, upper: 0 };;
  let stdev2: number = 0;
  let variance2CI: { lower: number; upper: number } = { lower: 0, upper: 0 };
  let median2: number = 0;
  let median2CI: { lower: number; upper: number } = { lower: 0, upper: 0 };
  let SEmean2: number = 0;
  let ADvalue2: number = 0;
  let ADp_Value2: number = 0;
  let diffCI_minus: number = 0;
  let diffCI_plus: number = 0;
  let fStat: number = 0;
  let fCritical: number = 0;
  let fTestpValue: number = 0;
  let equalVariances: boolean = true;
  let pooledSE= 0; // Pooled standard error for equal variances;    
  let degreesOfFreedom: number = 0;
  let varTestName: string = "";
  let varDF1: number = 0;
  let varDF2: number = 0;
  let varStatistic: number = 0;
  let varCriteria: number | {lower: number; upper: number} = 0;
  let varp_Value: number = 0;
  let varianceCI_minus: number = 0;
  let varianceCI_plus: number = 0;
  let grandMedian: number = 0;
  let medianStatistic: number = 0;
  let medianCriteria: number = 0;
  let medianp_Value: number = 0;
  let medianCI_minus: number = 0;
  let medianCI_plus: number = 0;  

  if (!dataset1 || dataset1.length === 0 || !dataset2 || dataset2.length === 0) {
    toast({
      title: "Test Run Unsuccessfully",
      description: "No dataset 1 or 2. The hypothesis test has not been executed.",
    });
    return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  else if (dataset1.length === 1 || dataset2.length === 1) {
    toast({
      title: "Need two data at least in each dataset to run Hypothesis Testing",
      description: "Need two data at least in each dataset to run Hypothesis Testing"
    });
    return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
  }
  const dataValues1 = dataset1.map(point => point.dataValue) || [];
  const n1 = dataValues1.length;
  const meanVal1 = mean(dataValues1);
  const stdDev1 = standardDeviation(dataValues1);

  const dataValues2 = dataset2.map(point => point.dataValue) || [];
  const n2 = dataValues2.length;
  const meanVal2 = mean(dataValues2);
  const stdDev2 = standardDeviation(dataValues2);

  // Perform normality test - will return isNormal, AD value and p_values
  const normalityTest = performNormalityTest(dataValues1, meanVal1, stdDev1);
  ADvalue1 = normalityTest.adStatistic;
  ADp_Value1 = normalityTest.pValue;

  const normalityTest2 = performNormalityTest(dataValues2, meanVal2, stdDev2);
  ADvalue2 = normalityTest2.adStatistic;
  ADp_Value2 = normalityTest2.pValue;

  if (enableMeanTest && n1 > 1 && n2 > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaMean as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Mean test.",
        variant: "destructive",
      });
      return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
    }
    
    const meanTestResult = twosampleMeanHypothesisTest({
      dataValues1,
      dataValues2,
      significance,
      alternativemean: HaMean as "Less than" | "Greater than" | "Different",
      deltaMean0,
      ADp_Value1: ADp_Value1,
      ADp_Value2: ADp_Value2, // Placeholder for second dataset
    });
    
    // Update the variables with actual calculated values
    sampleSize1 = n1;
    meanValue1 = meanVal1;
    mean1CI = {
        lower: meanTestResult.mean1CI.lower,
        upper: meanTestResult.mean1CI.upper
      };
    stdev1 = stdDev1;
    SEmean1 = meanTestResult.SEmean1;
    tStatistic = meanTestResult.tStatistic;
    
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
    sampleSize2 = n2;
    meanValue2 = meanVal2;
    mean2CI = {
        lower: meanTestResult.mean2CI.lower,
        upper: meanTestResult.mean2CI.upper
      };
    stdev2 = stdDev2;
    SEmean2 = meanTestResult.SEmean2;
    diffCI_minus = meanTestResult.diffCI_minus;
    diffCI_plus = meanTestResult.diffCI_plus;
    fStat = meanTestResult.fStat;
    fCritical = meanTestResult.fCritical;
    fTestpValue = meanTestResult.fTestpValue;
    equalVariances = meanTestResult.equalVariances;
    pooledSE = meanTestResult.pooledSE; // Pooled standard error for equal variances;
    degreesOfFreedom = meanTestResult.degreesOfFreedom;    
    // Update state as well
    setTwosampleMeanTestresult(meanTestResult);
  }
  if (enableVarianceTest && n1 > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaVariance as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Variance test.",
        variant: "destructive",
      });
      return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
    }
    
    const varianceTestResult = twosampleVarianceHypothesisTest({
      dataValues1,
      dataValues2,
      significance,
      alternativevariance: HaVariance as "Less than" | "Greater than" | "Different",
      ratioVariance0,
      ADp_Value1: ADp_Value1,
      ADp_Value2: ADp_Value2,
    });
    
    // Update the variables with actual calculated values
    
    varTestName = varianceTestResult.varTestName; 
    sampleSize1 = n1;
    varDF1 = varianceTestResult.varDF1;
    stdev1 = stdDev1;
    
    sampleSize2 = n2;
    varDF2 = varianceTestResult.varDF2;
    stdev2 = stdDev2;

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

    variance1CI = {
      lower: varianceTestResult.variance1CI.lower,
      upper: varianceTestResult.variance1CI.upper
    };
    variance2CI = {
      lower: varianceTestResult.variance2CI.lower,
      upper: varianceTestResult.variance2CI.upper
    };
    
    // Update state as well
    setTwosampleVarianceTestresult(varianceTestResult);
  }

  if (enableMedianTest && n1 > 1) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaMedian as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for Median test.",
        variant: "destructive",
      });
      return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
    }
    
    sampleSize1 = n1;
    sampleSize2 = n2;
    median1 = calculateMedian(dataValues1);
    median2 = calculateMedian(dataValues2);
    const medianTestResult = twosampleMedianHypothesisTest({
      dataValues1,
      dataValues2,
      significance,
      alternativemedian: HaMedian as "Less than" | "Greater than" | "Different",
      });
    
    // Update the variables with actual calculated values
    
    sampleSize1 = n1;
    stdev1 = stdDev1;
    grandMedian = medianTestResult.grandMedian;
    medianStatistic = medianTestResult.medianStatistic;
    medianCriteria = medianTestResult.medianCriteria;
    medianp_Value = medianTestResult.medianp_Value;
    medianCI_minus = medianTestResult.medianCI_minus;
    medianCI_plus = medianTestResult.medianCI_plus;
    median1CI = {
      lower: medianTestResult.median1CI.lower,
      upper: medianTestResult.median1CI.upper
    };
    median2CI = {
      lower: medianTestResult.median2CI.lower,
      upper: medianTestResult.median2CI.upper
    };
    
    // Update state as well
    setTwosampleMedianTestresult(medianTestResult);
  }

  toast({
    title: "Test Run Successfully",
    description: "The hypothesis test has been executed.",
  });

  return {
      sampleSize1, meanValue1, mean1CI, stdev1, variance1CI, median1, median1CI, SEmean1, ADvalue1, ADp_Value1, tStatistic, tCriteria, tp_Value,
      sampleSize2, meanValue2, mean2CI, stdev2, variance2CI, median2, median2CI, SEmean2, ADvalue2, ADp_Value2,
      diffCI_minus, diffCI_plus, fStat, fCritical, fTestpValue, equalVariances, pooledSE, degreesOfFreedom,
      varTestName, varDF1, varDF2, varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
      grandMedian, medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
    };
};
{/* on input change, update ContCTQTwoSampleHypTestData state */}
useEffect(() => {
  const currentConfig = ContCTQTwoSampleHypTestData[ctqId];
  if (!currentConfig || dataSet1.length === 0 || dataSet2.length ===0) return;

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
  );

  setTestResults(results);
  setShowBoxPlot(true);
  setFocusedCell1(-1);
  setFocusedCell2(-1);
}, [
  dataSet1,
  dataSet2,
  significanceLevel,
  alternativemean,
  alternativevariance,
  alternativemedian,
  ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest,
  ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest,
  ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest,
  ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0,
  ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0,
]);

// Undo functions - restore to previous state and clear undo state
  const handleUndo1 = () => {
    if (undoState1) {
      setDataSet1(JSON.parse(JSON.stringify(undoState1)));
      setUndoState1(null); // Clear the undo state after using it
      
      // If this was a dual-column paste, also undo Dataset 2
      if (isDualColumnPaste && undoState2) {
        setDataSet2(JSON.parse(JSON.stringify(undoState2)));
        setUndoState2(null);
        setIsDualColumnPaste(false);
        
        toast({
          title: "Dual-Column Undo Complete",
          description: "Previous dual-column paste operation has been undone for both datasets",
        });
      } else {
        toast({
          title: "Undo Complete",
          description: "Previous operation on Dataset 1 has been undone",
        });
      }
      
      setShowUndoButton(false);
    }
  };

  const handleUndo2 = () => {
    if (undoState2) {
      setDataSet2(JSON.parse(JSON.stringify(undoState2)));
      setUndoState2(null); // Clear the undo state after using it
      setShowUndoButton(false);
      
      // Reset dual-column flag if it was set (though this shouldn't be the main undo for dual-column)
      if (isDualColumnPaste) {
        setIsDualColumnPaste(false);
      }
      
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
      setIsDualColumnPaste(false); // Clear dual-column flag for this operation
      setShowUndoButton(true);
      
      // Clear all data for dataset 1
      setDataSet1([]);
      setInputValue1("");
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
      setIsDualColumnPaste(false); // Clear dual-column flag for this operation
      setShowUndoButton(true);
      
      // Clear all data for dataset 2
      setDataSet2([]);
      setInputValue2("");
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
    setIsDualColumnPaste(false); // Clear dual-column flag for this operation
    
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
    setIsDualColumnPaste(false); // Clear dual-column flag for this operation
    
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

  // Handle focused cell paste for Dataset 1 (with dual-column paste capability)
  const handleFocusedCellPaste1 = (pasteData: string) => {
    if (focusedCell1 === -1) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }

    // Parse the pasted data with robust Excel format support (tab-separated and multi-line)
    const rows = pasteData.trim().split('\n');
    const dataset1Values: number[] = [];
    const dataset2Values: number[] = [];
    let hasMoreThanTwoColumns = false;
    
    rows.forEach(row => {
      let cells: string[] = [];
      
      if (row.includes('\t')) {
        // Excel data with tabs - standard Excel copy format
        cells = row.split('\t');
      } else {
        // No tabs - could be single column or comma-separated
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
          const tempCells = [];
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            
            // Check if this part combined with next part could be a French decimal
            if (i < parts.length - 1) {
              const nextPart = parts[i + 1].trim();
              const combined = part + ',' + nextPart;
              
              // If combined looks like a French decimal, combine them
              if (/^-?\d+,\d+$/.test(combined) && !part.includes(' ') && !nextPart.includes(' ')) {
                tempCells.push(combined);
                i++; // Skip next part as we combined it
                continue;
              }
            }
            
            // Otherwise, treat as separate cell
            if (part !== '') {
              tempCells.push(part);
            }
          }
          cells = tempCells;
        } else {
          // No commas, treat as single cell
          cells = [trimmedRow];
        }
      }
      
      // Check for multiple columns and handle accordingly
      if (cells.length > 2) {
        hasMoreThanTwoColumns = true;
        // Use only first two columns
        cells = [cells[0], cells[1]];
      }
      
      // Process first column (Dataset 1)
      if (cells[0]) {
        const trimmedCell = cells[0].trim();
        if (!(trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null')) {
          // Handle different decimal separators and number formats (French regional settings support)
          let processedValue = trimmedCell;
          
          // Handle French decimal format (comma to dot conversion)
          if (trimmedCell.includes(',') && !trimmedCell.includes('.')) {
            processedValue = trimmedCell.replace(',', '.');
          }
          
          // Remove any thousands separators
          processedValue = processedValue.replace(/[\s']/g, '');
          
          // Handle thousands separators with commas (US format)
          if (processedValue.includes(',') && processedValue.includes('.')) {
            const parts = processedValue.split('.');
            if (parts.length === 2) {
              const integerPart = parts[0].replace(/,/g, '');
              processedValue = integerPart + '.' + parts[1];
            }
          }

          const numericValue = parseFloat(processedValue);
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            dataset1Values.push(numericValue);
          }
        }
      }
      
      // Process second column (Dataset 2) if it exists
      if (cells[1]) {
        const trimmedCell = cells[1].trim();
        if (!(trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null')) {
          // Handle different decimal separators and number formats (French regional settings support)
          let processedValue = trimmedCell;
          
          // Handle French decimal format (comma to dot conversion)
          if (trimmedCell.includes(',') && !trimmedCell.includes('.')) {
            processedValue = trimmedCell.replace(',', '.');
          }
          
          // Remove any thousands separators
          processedValue = processedValue.replace(/[\s']/g, '');
          
          // Handle thousands separators with commas (US format)
          if (processedValue.includes(',') && processedValue.includes('.')) {
            const parts = processedValue.split('.');
            if (parts.length === 2) {
              const integerPart = parts[0].replace(/,/g, '');
              processedValue = integerPart + '.' + parts[1];
            }
          }

          const numericValue = parseFloat(processedValue);
          if (!isNaN(numericValue) && isFinite(numericValue)) {
            dataset2Values.push(numericValue);
          }
        }
      }
    });

    if (dataset1Values.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid numeric data found in clipboard.",
        variant: "destructive",
      });
      return;
    }

    // Save current state for undo
    setUndoState1(JSON.parse(JSON.stringify(dataSet1)));
    if (dataset2Values.length > 0) {
      setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
      setIsDualColumnPaste(true); // Mark this as a dual-column paste
    } else {
      setIsDualColumnPaste(false); // Single column paste
    }

    // Use focused cell as starting position for both datasets
    const startIndex = focusedCell1;
    
    // Update Dataset 1
    const updatedPoints1 = [...dataSet1];
    const endIndex1 = startIndex + dataset1Values.length - 1;
    while (updatedPoints1.length <= endIndex1) {
      updatedPoints1.push({
        indexNumber: updatedPoints1.length + 1,
        dataValue: 0
      });
    }

    dataset1Values.forEach((value, i) => {
      const targetIndex = startIndex + i;
      updatedPoints1[targetIndex] = {
        indexNumber: targetIndex + 1,
        dataValue: value
      };
    });

    setDataSet1(updatedPoints1);
    
    // Update Dataset 2 if second column data exists
    if (dataset2Values.length > 0) {
      const updatedPoints2 = [...dataSet2];
      const endIndex2 = startIndex + dataset2Values.length - 1;
      while (updatedPoints2.length <= endIndex2) {
        updatedPoints2.push({
          indexNumber: updatedPoints2.length + 1,
          dataValue: 0
        });
      }

      dataset2Values.forEach((value, i) => {
        const targetIndex = startIndex + i;
        updatedPoints2[targetIndex] = {
          indexNumber: targetIndex + 1,
          dataValue: value
        };
      });

      setDataSet2(updatedPoints2);
      
      toast({
        title: "Data Pasted to Both Datasets",
        description: `Pasted ${dataset1Values.length} values to Dataset 1 and ${dataset2Values.length} values to Dataset 2 starting from position ${focusedCell1 + 1}.`,
      });
    } else {
      toast({
        title: "Data Pasted to Dataset 1",
        description: `Pasted ${dataset1Values.length} values starting from position ${focusedCell1 + 1}.`,
      });
    }

    // Show warning if more than two columns were detected
    if (hasMoreThanTwoColumns) {
      setTimeout(() => {
        toast({
          title: "Warning",
          description: "Warning: Clipboard contains more than two columns. Only two first copied columns were pasted!",
          variant: "destructive",
        });
      }, 500);
    }
  };

  // Handle focused cell paste for Dataset 2
  const handleFocusedCellPaste2 = (pasteData: string) => {
    if (focusedCell2 === -1) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }

    // Parse the pasted data with robust Excel format support (tab-separated and multi-line)
    const rows = pasteData.trim().split('\n');
    const newValues: number[] = [];
    let hasMultipleColumns = false;
    
    rows.forEach(row => {
      let cells: string[] = [];
      
      if (row.includes('\t')) {
        // Excel data with tabs - standard Excel copy format
        const allCells = row.split('\t');
        // Check if there are multiple columns
        if (allCells.length > 1) {
          hasMultipleColumns = true;
          // Only use the first column for Dataset 2
          cells = [allCells[0]];
        } else {
          cells = allCells;
        }
      } else {
        // No tabs - could be single column or comma-separated
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
          const tempCells = [];
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            
            // Check if this part combined with next part could be a French decimal
            if (i < parts.length - 1) {
              const nextPart = parts[i + 1].trim();
              const combined = part + ',' + nextPart;
              
              // If combined looks like a French decimal, combine them
              if (/^-?\d+,\d+$/.test(combined) && !part.includes(' ') && !nextPart.includes(' ')) {
                tempCells.push(combined);
                i++; // Skip next part as we combined it
                continue;
              }
            }
            
            // Otherwise, treat as separate cell
            if (part !== '') {
              tempCells.push(part);
            }
          }
          
          // Check if there are multiple columns after processing
          if (tempCells.length > 1) {
            hasMultipleColumns = true;
            // Only use the first column
            cells = [tempCells[0]];
          } else {
            cells = tempCells;
          }
        } else {
          // No commas, treat as single cell
          cells = [trimmedRow];
        }
      }
      
      // Process each cell value (first column only)
      cells.forEach(cell => {
        const trimmedCell = cell.trim();
        if (trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null') {
          return; // Skip empty cells
        } else {
          // Handle different decimal separators and number formats (French regional settings support)
          let processedValue = trimmedCell;
          
          // Handle French decimal format (comma to dot conversion)
          if (trimmedCell.includes(',') && !trimmedCell.includes('.')) {
            processedValue = trimmedCell.replace(',', '.');
          }
          
          // Remove any thousands separators
          processedValue = processedValue.replace(/[\s']/g, '');
          
          // Handle thousands separators with commas (US format)
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
        }
      });
    });

    if (newValues.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid numeric data found in clipboard.",
        variant: "destructive",
      });
      return;
    }

    // Save current state for undo
    setUndoState2(JSON.parse(JSON.stringify(dataSet2)));
    setIsDualColumnPaste(false); // Clear dual-column flag for single-dataset operation

    // Use focused cell as starting position (like One Sample component)
    const startIndex = focusedCell2;
    const updatedPoints = [...dataSet2];
    
    // Extend array if necessary
    const endIndex = startIndex + newValues.length - 1;
    while (updatedPoints.length <= endIndex) {
      updatedPoints.push({
        indexNumber: updatedPoints.length + 1,
        dataValue: 0
      });
    }

    // Replace/insert values starting from focused position
    newValues.forEach((value, i) => {
      const targetIndex = startIndex + i;
      updatedPoints[targetIndex] = {
        indexNumber: targetIndex + 1,
        dataValue: value
      };
    });

    setDataSet2(updatedPoints);
    
    toast({
      title: "Data Pasted to Dataset 2",
      description: `Pasted ${newValues.length} values starting from position ${focusedCell2 + 1}.`,
    });

    // Show warning if multiple columns were detected
    if (hasMultipleColumns) {
      setTimeout(() => {
        toast({
          title: "Warning",
          description: "Warning: only first copied column was pasted!",
          variant: "destructive",
        });
      }, 500);
    }
  };

  // Handle paste specifically for editing cells - Dataset 1
  const handleCellPaste1 = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      // Use focused cell paste for consistent behavior
      handleFocusedCellPaste1(pastedData);
    }
  };

  // Handle paste specifically for editing cells - Dataset 2
  const handleCellPaste2 = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      // Use focused cell paste for consistent behavior
      handleFocusedCellPaste2(pastedData);
    }
  };

  // Set component focus context when cells are focused
  useEffect(() => {
    if (focusedCell1 >= 0) {
      // Set global context for focused component
      (window as any).focusedComponent = 'two-sample-dataset1';
      (window as any).focusedCellIndex = focusedCell1;
    } else if (focusedCell2 >= 0) {
      (window as any).focusedComponent = 'two-sample-dataset2';
      (window as any).focusedCellIndex = focusedCell2;
    } else {
      // Clear context when no cells are focused
      if ((window as any).focusedComponent?.startsWith('two-sample')) {
        (window as any).focusedComponent = null;
        (window as any).focusedCellIndex = -1;
      }
    }
  }, [focusedCell1, focusedCell2]);

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+V/Cmd+V for paste - only when this specific component has focus
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && (activeTab === ctqName)) {
        
        // Check if this Two Sample component should handle the paste based on global context
        const focusedComponent = (window as any).focusedComponent;
        
        if (focusedComponent === 'two-sample-dataset1') {
          // Dataset 1 has focused cell
          event.preventDefault();
          navigator.clipboard.readText().then(clipboardData => {
            if (clipboardData.trim()) {
              handleFocusedCellPaste1(clipboardData);
            } else {
              toast({
                title: "No Data Found",
                description: "No valid numeric data found in clipboard. Please copy measurement data from Excel first.",
                variant: "destructive",
              });
            }
          }).catch(error => {
            toast({
              title: "Clipboard Access",
              description: "Please use the 'Paste data from Excel' button or paste directly into the table.",
              variant: "default",
            });
          });
        } else if (focusedComponent === 'two-sample-dataset2') {
          // Dataset 2 has focused cell
          event.preventDefault();
          navigator.clipboard.readText().then(clipboardData => {
            if (clipboardData.trim()) {
              handleFocusedCellPaste2(clipboardData);
            } else {
              toast({
                title: "No Data Found",
                description: "No valid numeric data found in clipboard. Please copy measurement data from Excel first.",
                variant: "destructive",
              });
            }
          }).catch(error => {
            toast({
              title: "Clipboard Access",
              description: "Please use the 'Paste data from Excel' button or paste directly into the table.",
              variant: "default",
            });
          });
        }
      }

      // Handle Ctrl+Z/Cmd+Z for undo - works both in and outside input fields and this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && (undoState1 || undoState2) && (activeTab === ctqName)) {
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
  }, [undoState1, undoState2, activeTab, ctqName, focusedCell1, focusedCell2]);

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
    <Card data-component="two-sample">
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
                      <div>
                        
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
                      
                      </div>
                      <div>
                      
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
                      
                      </div>
                      <div>
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
                      </div>
                      
                      <div>Mean 1 (μ1): 
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
                      </div>
                      <div>Mean 2 (μ2): 
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
                      </div>
                      
                      <div>Standard Deviation (σ): 
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
                      </div>

                      <div className="font-medium text-sm">δ = (μ1 - μ2): {(ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean1 -  ContCTQTwoSampleHypTestData[ctqId]?.power2SMeanMean2).toFixed(3)}
                      </div>
                      <div className="font-medium text-sm">
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated minimum size of each data sample and actual power of the test" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.twoSMeansampleSize.toFixed(0)} <br />
                        Actual Power: {(PowerSampleSizeResults.twoSMeanactualPower*100).toFixed(2)}%
                      </Badge>
                      </div>
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
                      <div>
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
                      </div>
                      <div>
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
                      </div>
                      <div>
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
                      </div>
                      
                      <div>Standard Deviation 1 (σ1): 
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
                      </div>
                      <div>
                        Standard Deviation 2 (σ2): 
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
                      </div>
                      <div className="font-medium text-sm">Std dev Ratio (σ1/σ2): {(ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev1 /  ContCTQTwoSampleHypTestData[ctqId]?.power2SVarianceStdev2).toFixed(3)}
                      </div>
                      <div className="font-medium text-sm">
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated minimum size of each data sample and actual power of the test" }
                      >
                        Sample Size (n): {PowerSampleSizeResults.twoSVariancesampleSize.toFixed(0)} <br />
                        Actual Power: {(PowerSampleSizeResults.twoSVarianceactualPower*100).toFixed(2)}%
                      </Badge>
                      </div>
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
                      placeholder="Enter Hypothesized difference δ0 (H0)"
                      className="mt-1"
                  />
              </div>
                ) : (
                <div className="w-1/3 min-w-[100px] pr-4">
                </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ? (
                <div className="w-1/3 min-w-[100px] pr-4">
                  <Label>Hypothesized ratio σ1/σ2 (H0):</Label>
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
                                  title: "Hypothesized Standard Deviation ratio",
                                  description: `Standard deviation ratio cannot be negative. Please enter a positive value.`
                              });
                              // Don't update the field, keeping the previous value
                              return;
                          } else {
                              // Valid non-negative number
                              updateContCTQTwoSampleHypTestDataField(ctqId, "ratioVariance0", value);
                          }
                      }}
                      placeholder="Enter Hypothesized ratio σ1/σ2 (H0)"
                      className="mt-1"
                  />
              </div>
            ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ? (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
              ) : (
              <div className="w-1/3 min-w-[100px] pr-4">
              </div>
            )}
          </div>   
          <div className="grid grid-cols-3 pr-10 gap-12">
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ? (
            <div className="w-1/3 min-w-[260px] pr-4">
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
            <div className="w-1/3 min-w-[260px] pr-4">
            </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ? (
            <div className="w-1/3 min-w-[260px] pr-4">
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
            <div className="w-1/3 min-w-[260px] pr-4">
            </div>
            )}
            {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ? (
            <div className="w-1/3 min-w-[260px] pr-4">
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
            <div className="w-1/3 min-w-[260px] pr-4">
            </div>
            )}
          </div>
          
          {(ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest || ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest || ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest) && (
          <div>
           <div className="grid grid-cols-1 gap-4 pr-4">
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
           </div>
            
           <div className="grid grid-cols-2 gap-4 pr-4">
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

                    if (focusedCell1 < 0) {
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
                        handleFocusedCellPaste1(clipboardData);
                        } else {
                        toast({
                            title: "No Data Found",
                            description: "No valid numeric data found in clipboard. Please copy measurement data from Excel first.",
                            variant: "destructive",
                        });
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
                    disabled={focusedCell1 < 0}
                >
                    📋 Paste data from Excel
                </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                <div className="text-blue-600 text-xs mt-1">
                Ctrl+V (Cmd+V on Mac) to paste | Ctrl+Z (Cmd+Z on Mac) to undo | Click any cell in the table to paste
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
                Enter dataset 1 values and click Add, then Save Data to persist to database
            </p>

            {/* Data Table */}
            <div ref={tableContainerRef} className="data-table-container-1 border rounded-md max-h-[500px] overflow-y-auto">
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
                                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${focusedCell1 === index ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFocusedCell1(index);
                                  setFocusedCell2(-1);
                                  // Make this div focusable and focus it to maintain focus state
                                  e.currentTarget.focus();
                                }}
                                onPaste={(e) => handleCellPaste1(e, index)}
                                tabIndex={0}
                                title="Single click to focus (blue ring), then Ctrl+V to paste data starting from this row. Double-click to edit value."
                                onDoubleClick={() => startEditing1(index, point.dataValue)}
                                onFocus={() => {
                                  // Ensure focused cell is set when this div gets focus
                                  setFocusedCell1(index);
                                  setFocusedCell2(-1);
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
                        onFocus={() => {
                                  // Ensure focused cell is set when this div gets focus
                                  setFocusedCell1(dataSet1.length);
                                  setFocusedCell2(-1);
                                }} // Focus input area at end position
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
                        className={`w-full ${focusedCell1 === dataSet1.length ? 'ring-2 ring-blue-500' : ''}`}
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
                <div>• <strong>Focus a cell</strong> by clicking on any cell in the table</div>
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
                    if (focusedCell2 < 0) {
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
                        handleFocusedCellPaste2(clipboardData);
                        } else {
                        toast({
                            title: "No Data Found",
                            description: "No valid numeric data found in clipboard. Please copy measurement data from Excel first.",
                            variant: "destructive",
                        });
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
                    disabled={focusedCell2 < 0}
                >
                    📋 Paste data from Excel
                </Button>
                </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                <div className="text-blue-600 text-xs mt-1">
                Ctrl+V (Cmd+V on Mac) to paste | Ctrl+Z (Cmd+Z on Mac) to undo | Click any cell in the table to paste
                </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">
                Enter dataset 2 values and click Add, then Save Data to persist to database
            </p>

            {/* Data Table */}
            <div ref={tableContainerRef} className="data-table-container-2 border rounded-md max-h-[500px] overflow-y-auto">
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
                                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${focusedCell2 === index ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setFocusedCell2(index);
                                  setFocusedCell1(-1);
                                  // Make this div focusable and focus it to maintain focus state
                                  e.currentTarget.focus();
                                }}
                                onPaste={(e) => handleCellPaste2(e, index)}
                                tabIndex={0}
                                title="Single click to focus (blue ring), then Ctrl+V to paste data starting from this row. Double-click to edit value."
                                onDoubleClick={() => startEditing2(index, point.dataValue)}
                                onFocus={() => {
                                  // Ensure focused cell is set when this div gets focus
                                  setFocusedCell2(index);
                                  setFocusedCell1(-1);
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
                        onFocus={() => {setFocusedCell2(dataSet2.length);
                                        setFocusedCell1(-1);
                                } 
                        } // Focus input area at end position
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
                        className={`w-full ${focusedCell2 === dataSet2.length ? 'ring-2 ring-blue-500' : ''}`}
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
                <div>• <strong>Focus a cell</strong> by clicking on any cell in the table</div>
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
              className={`w-full ${(!ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest && !ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest && !ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest &&
                !ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest &&
                !ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest}
              onClick={() => { // Use a block to perform multiple actions
                  const results = handleRunTest(
                      ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest ?? false,
                      ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest ?? false, // Matches corrected function signature
                      ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest ?? false,
                      dataSet1,
                      dataSet2,
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
          {((twosampleMeanTestresult || twosampleVarianceTestresult || twosampleMedianTestresult)  && ( testResults.sampleSize1 > 1) && ( testResults.sampleSize2 > 1)) && ( 
          <div className="border border-gray-200 rounded-md bg-gray-50">          
            <div className =  "p-4 grid grid-cols-2 gap-4 text-sm">
            <Card className="p-2">
            <CardTitle className="text-lg">Results:</CardTitle>    
            <Badge
              variant="default"
              className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.ADp_Value1 >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
              title={
                testResults.ADp_Value1 >= parseFloat(significanceLevel)
                  ? `Dataset 1 distribution follows normal distribution (P-Value ≥ ${significanceLevel})`
                  : `Dataset 1 distribution does not follow normal distribution (P-Value < ${significanceLevel})`
              }
            >
              {testResults.ADp_Value1 >= parseFloat(significanceLevel)
                ? "Dataset 1 follows normal distribution"
                : "Dataset 1 does not follow normal distribution"}
            </Badge>
            <div className="text-gray-600 font-medium">Dataset 1 description:&nbsp;
            {ContCTQTwoSampleHypTestData[ctqId]?.dataset1description}</div>
            <div className="text-gray-600 font-medium">Sample size:&nbsp;
            {testResults.sampleSize1}</div>
            <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
            {parseFloat(significanceLevel)*100}%</div>
            <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
            {testResults.ADvalue1.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
            {testResults.ADp_Value1.toFixed(3)}</div> 
            </Card>

            <Card className="p-2">
            <CardTitle className="text-lg">Results:</CardTitle>    
            <Badge
              variant="default"
              className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.ADp_Value2 >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
              title={
                testResults.ADp_Value2 >= parseFloat(significanceLevel)
                  ? `Dataset 2 distribution follows normal distribution (P-Value ≥ ${significanceLevel})`
                  : `Dataset 2 distribution does not follow normal distribution (P-Value < ${significanceLevel})`
              }
            >
              {testResults.ADp_Value2 >= parseFloat(significanceLevel)
                ? "Dataset 2 follows normal distribution"
                : "Dataset 2 does not follow normal distribution"}
            </Badge>
            <div className="text-gray-600 font-medium">Dataset 2 description:&nbsp;
            {ContCTQTwoSampleHypTestData[ctqId]?.dataset2description}</div>
            <div className="text-gray-600 font-medium">Sample size:&nbsp;
            {testResults.sampleSize2}</div>
            <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
            {parseFloat(significanceLevel)*100}%</div>
            <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
            {testResults.ADvalue2.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
            {testResults.ADp_Value2.toFixed(3)}</div> 
            </Card>
            </div>

            <div className="pl-4 pr-4 grid grid-cols-3 gap-1 text-sm">
              {ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Mean test:</CardTitle>
                <div className="text-lg justify-left">Student T-test:</div>

                  <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Dataset</th>
                        <th className="border border-gray-300 px-1 py-1 text-left min-w-[55px]">Mean (μ<sub>i</sub>)</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[30px] text-[9px]">SE Mean</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[45px] text-[9px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}%</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[30px] text-[9px]">Std Dev (σ<sub>i</sub>)</th>
                          <th className="border border-gray-300 px-1 py-1 text-left text-[9px]">(n)</th>
                      </tr>
                    </thead>
                    <tbody>                    
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                          {ContCTQTwoSampleHypTestData[ctqId]?.dataset1description ? (
                              ContCTQTwoSampleHypTestData[ctqId]?.dataset1description
                          ) : (
                            `Dataset 1`
                          )}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          μ<sub>1</sub>: {testResults.meanValue1.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          {testResults.SEmean1.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                              [{testResults.mean1CI.lower.toFixed(3)},{testResults.mean1CI.upper.toFixed(3)}]
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          {testResults.stdev1.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                          {testResults.sampleSize1.toFixed(0)}
                        </td>
                      </tr> 
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                          {ContCTQTwoSampleHypTestData[ctqId]?.dataset2description ? (
                              ContCTQTwoSampleHypTestData[ctqId]?.dataset2description
                          ) : (
                            `Dataset 2`
                          )}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          μ<sub>2</sub>: {testResults.meanValue2.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          {testResults.SEmean2.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                              [{testResults.mean2CI.lower.toFixed(3)},{testResults.mean2CI.upper.toFixed(3)}]
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                          {testResults.stdev2.toFixed(3)}
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                          {testResults.sampleSize2.toFixed(0)}
                        </td>
                      </tr>                    
                    </tbody>
                  </table>

                <div className="text-gray-600 font-medium">Difference (μ1-μ2):&nbsp;
                  {(testResults.meanValue1 - testResults.meanValue2).toFixed(3)}</div>
                 <div className="text-gray-600 font-medium">Hypothesized Difference (δ0):&nbsp;
                  {ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0}</div>
                <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                  {parseFloat(significanceLevel)*100}%</div>
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
                  {alternativemean==='Less than' ? "H0: (μ1 - μ2) ≥ "
                  : ( alternativemean==='Greater than' ? "H0: (μ1 - μ2) ≤ "
                    :"H0: (μ1 - μ2) = " )} {ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0}<br></br>
                  {alternativemean==='Less than' ? "Ha: (μ1 - μ2) < "
                  : ( alternativemean==='Greater than' ? "Ha: (μ1 - μ2) > "
                    :"Ha: (μ1 - μ2) ≠ " )} {ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0}<br></br>
                  {testResults.tp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                
                {testResults.equalVariances ?
                  (<div className="text-gray-600 font-medium">Equal Variances (F-stat: {testResults.fStat.toFixed(3)}, p-Value: {testResults.fTestpValue.toFixed(3)})
                  </div>                  
                  ) : (
                  <div className="text-gray-600 font-medium">Unequal Variances (F-stat: {testResults.fStat.toFixed(3)}, p-Value: {testResults.fTestpValue.toFixed(3)})
                  </div>
                )}
                <div className="text-gray-600 font-medium">T-statistic: {testResults.tStatistic.toFixed(3)}
                </div>
                <div className="text-gray-600 font-medium">T-test Degrees of Freedom:&nbsp;
                  {testResults.degreesOfFreedom.toFixed(0)}</div>
                <div className="text-gray-600 font-medium">T-test Pooled Standard Deviation:&nbsp;
                  {testResults.pooledSE.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">T-criteria
                  {typeof testResults.tCriteria === 'number' 
                    ? (alternativemean==='Less than' ? <> (T<sub>{significanceLevel}</sub>): {testResults.tCriteria.toFixed(3)} </> : <> (T<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.tCriteria.toFixed(3)}</>)
                    : <> (T<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, T<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.tCriteria.lower.toFixed(3)}, {testResults.tCriteria.upper.toFixed(3)}]</>
                  }
                </div>
                <div className="text-gray-600 font-medium">T-test P-value:&nbsp;
                  {testResults.tp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">CI {(100*(1-parseFloat(significanceLevel)))}% for (μ1 - μ2): [
                {testResults.diffCI_minus.toFixed(3)}, {testResults.diffCI_plus.toFixed(3)}]</div>
              </Card>
              )}
              {ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Variance test:</CardTitle>
                <div className="text-lg justify-left">{testResults.varTestName}'s test:</div>
                <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Dataset</th>
                      <th className="border border-gray-300 px-1 py-1 text-left min-w-[55px]">Std Dev. (σ<sub>i</sub>)</th>
                      <th className="border border-gray-300 px-1 py-1 text-left min-w-[60px] text-[9px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}% (Bonferroni)</th>                   
                      <th className="border border-gray-300 px-1 py-1 text-left min-w-[55px] text-[9px]">Variance (σ<sup>2</sup><sub>i</sub>)</th>  
                      <th className="border border-gray-300 px-1 py-1 text-left text-[9px]">(n)</th>
                    </tr>
                  </thead>
                  <tbody>                    
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                        {ContCTQTwoSampleHypTestData[ctqId]?.dataset1description ? (
                            ContCTQTwoSampleHypTestData[ctqId]?.dataset1description
                        ) : (
                          `Dataset 1`
                        )}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                        σ<sub>1</sub>: {testResults.stdev1.toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {testResults.variance1CI ? `[${testResults.variance1CI.lower.toFixed(3)}, ${testResults.variance1CI.upper.toFixed(3)}]` : 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {(testResults.stdev1*testResults.stdev1).toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                        {testResults.sampleSize1.toFixed(0)}
                      </td>
                    </tr> 
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                        {ContCTQTwoSampleHypTestData[ctqId]?.dataset2description ? (
                            ContCTQTwoSampleHypTestData[ctqId]?.dataset2description
                        ) : (
                          `Dataset 2`
                        )}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                        σ<sub>2</sub>: {testResults.stdev2.toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {testResults.variance2CI ? `[${testResults.variance2CI.lower.toFixed(3)}, ${testResults.variance2CI.upper.toFixed(3)}]` : 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {(testResults.stdev2*testResults.stdev2).toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                        {testResults.sampleSize2.toFixed(0)}
                      </td>                   
                    </tr>
                  </tbody>
                </table> 
                
                <div className="text-gray-600 font-medium">Variance ratio (σ1<sup>2</sup>/σ2<sup>2</sup>):&nbsp;
                  {((testResults.stdev1*testResults.stdev1)/(testResults.stdev2*testResults.stdev2)).toFixed(2)}</div>
                <div className="text-gray-600 font-medium">Hypothesized Std Dev Ratio:&nbsp;
                  {ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0}</div>
                <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                  {parseFloat(significanceLevel)*100}%</div>
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
                  {alternativevariance==='Less than' ? "H0: σ1/σ2 ≥ "
                  : ( alternativevariance==='Greater than' ? "H0: σ1/σ2 ≤ "
                    :"H0: σ1/σ2 = " )} {ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0}<br></br>
                  {alternativevariance==='Less than' ? "Ha: σ1/σ2 < "
                  : ( alternativevariance==='Greater than' ? "Ha: σ1/σ2 > "
                    :"Ha: σ1/σ2 ≠ " )} {ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0}<br></br>
                  {testResults.varp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.varp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.varp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                
                <div className="text-gray-600 font-medium">Degrees of Freedom 1:&nbsp;
                  {testResults.varDF1.toFixed(0)}</div>
                <div className="text-gray-600 font-medium">Degrees of Freedom 2:&nbsp;
                  {testResults.varDF2.toFixed(0)}</div>
                <div className="text-gray-600 font-medium">{testResults.varTestName} Test-statistic:&nbsp;
                  {testResults.varStatistic.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">{testResults.varTestName} Test-criteria
                {testResults.varTestName === "Fisher" ?
                (
                  <>
                  {typeof testResults.varCriteria === 'number'
                    ? (alternativemean==='Less than' ? <> (F<sub>{significanceLevel}</sub>): {testResults.varCriteria.toFixed(3)} </> : <> (F<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.varCriteria.toFixed(3)}</>)
                    : <> (F<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, F<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.varCriteria.lower.toFixed(3)}, {testResults.varCriteria.upper.toFixed(3)}]</>
                  }
                  </>
                ) : (
                  <>
                  {typeof testResults.varCriteria === 'number'
                    ? (alternativemean==='Less than' ? <> (L<sub>{significanceLevel}</sub>): {testResults.varCriteria.toFixed(3)} </> : <> (L<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.varCriteria.toFixed(3)}</>)
                    : <> (L<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, L<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.varCriteria.lower.toFixed(3)}, {testResults.varCriteria.upper.toFixed(3)}]</>
                  }
                  </>
                )
                }
                </div>
                
                <div className="text-gray-600 font-medium">P-value:&nbsp;
                  {testResults.varp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">CI {(100*(1-parseFloat(significanceLevel)))}% for (σ1<sup>2</sup>/σ2<sup>2</sup>): [
                {testResults.varianceCI_minus.toFixed(3)}, {testResults.varianceCI_plus.toFixed(3)}]</div>
              </Card>
              )}

              {ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest && (
              <Card className="p-2">                
                <CardTitle className="text-lg">Two-Sample Median-test:</CardTitle>
                <div className="text-lg justify-left">Mann-Whitney test:</div>

                <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                  <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Dataset</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[60px]">Median (η<sub>i</sub>)</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[90px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}%</th>
                              <th className="border border-gray-300 px-1 py-1 text-left">Sample Size (n)</th>
                            </tr>
                          </thead>
                  <tbody>                    
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                        {ContCTQTwoSampleHypTestData[ctqId]?.dataset1description ? (
                            ContCTQTwoSampleHypTestData[ctqId]?.dataset1description
                        ) : (
                          `Dataset 1`
                        )}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                        η<sub>1</sub>: {testResults.median1.toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {testResults.median1CI ? `[${testResults.median1CI.lower.toFixed(3)}, ${testResults.median1CI.upper.toFixed(3)}]` : 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                        {testResults.sampleSize1.toFixed(0)}
                      </td>
                    </tr> 
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                        {ContCTQTwoSampleHypTestData[ctqId]?.dataset2description ? (
                            ContCTQTwoSampleHypTestData[ctqId]?.dataset2description
                        ) : (
                          `Dataset 2`
                        )}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                        η<sub>2</sub>: {testResults.median2.toFixed(3)}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                        {testResults.median2CI ? `[${testResults.median2CI.lower.toFixed(3)}, ${testResults.median2CI.upper.toFixed(3)}]` : 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                        {testResults.sampleSize2.toFixed(0)}
                      </td>
                    </tr>                    
                  </tbody>
                </table>

                <div className="text-gray-600 font-medium">Difference (η1 - η2):&nbsp;
                  {(testResults.median1 - testResults.median2).toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Grand Median (ηG):&nbsp;
                  {testResults.grandMedian.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                  {parseFloat(significanceLevel)*100}%</div>
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
                  {alternativemedian==='Less than' ? "H0: η1 ≥ η2"
                  : ( alternativemedian==='Greater than' ? "H0: η1 ≤ η2"
                    :"H0: η1 = η2" )} <br></br>
                  {alternativemedian==='Less than' ? "Ha: η1 < η2"
                  : ( alternativemedian==='Greater than' ? "Ha: η1 > η2"
                    :"Ha: η1 ≠ η2" )} <br></br>
                  {testResults.medianp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.medianp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.medianp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                <div className="text-gray-600 font-medium">Mann-Whitney-statistic (M-W):&nbsp;
                  {testResults.medianStatistic.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Mann-Whitney-criteria (M-W<sub>{1-parseFloat(significanceLevel)/2}</sub>): {testResults.medianCriteria.toFixed(3)}
                </div>
                <div className="text-gray-600 font-medium">Mann-Whitney P-value:&nbsp;
                  {testResults.medianp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">CI {(100*(1-parseFloat(significanceLevel)))}% for (η1 - η2): [
                  {testResults.medianCI_minus.toFixed(3)}, {testResults.medianCI_plus.toFixed(3)}]</div>
              </Card>
              )}            
            </div>
          </div>
          )}

          {/* 2 sample Student mean test BoxPlot visualization when showBoxPlot is true */}
          
          {showBoxPlot && dataSet1.length > 1 && dataSet2.length > 1 && ContCTQTwoSampleHypTestData[ctqId]?.enableMeanTest && (
            <div className="mt-6">
              <BoxPlotWith2SMeanTest
                data1={dataSet1.map(point => point.dataValue)}
                data2={dataSet2.map(point => point.dataValue)}
                ctqName={ctqName}
                mean1={testResults.meanValue1}
                mean2={testResults.meanValue2}
                Ha={Ha(alternativemean)}
                h0Value={ContCTQTwoSampleHypTestData[ctqId]?.deltaMean0 ?? 0}
                confidenceInterval={[testResults.diffCI_minus, testResults.diffCI_plus]}
                title={`2-Sample Mean T-Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.tp_Value}
                alphalevel={significanceLevel}
                description1={ContCTQTwoSampleHypTestData[ctqId]?.dataset1description}
                description2={ContCTQTwoSampleHypTestData[ctqId]?.dataset2description}
                equalVariances={testResults.equalVariances}
              />
            </div>
          )}

          {/* 2 sample Fisher or Levene variance test visualization when showBoxPlot is true */}
          
          {showBoxPlot && dataSet1.length > 2  && dataSet2.length > 2 && ContCTQTwoSampleHypTestData[ctqId]?.enableVarianceTest && (
            <div className="mt-6">
              <TwoSVarianceTestCI
                ctqName={ctqName}
                stdev1={testResults.stdev1}
                stdev2={testResults.stdev2}
                ratioVariance0={ContCTQTwoSampleHypTestData[ctqId]?.ratioVariance0}
                Ha={Ha(alternativevariance)}
                confidenceInterval={[testResults.varianceCI_minus, testResults.varianceCI_plus]}
                title={`2-Sample Variance ${testResults.varTestName} (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.varp_Value}
                alphalevel={significanceLevel}
                description1={ContCTQTwoSampleHypTestData[ctqId]?.dataset1description}
                description2={ContCTQTwoSampleHypTestData[ctqId]?.dataset2description}
              />
            </div>
          )}
          
          {/* 2 sample Mann-Whitney Median test BoxPlot visualization when showBoxPlot is true */}
          
          {showBoxPlot && dataSet1.length > 1  && dataSet2.length > 1 && ContCTQTwoSampleHypTestData[ctqId]?.enableMedianTest && (
            <div className="mt-6">
              <BoxPlotWith2SMedianTest
                data1={dataSet1.map(point => point.dataValue)}
                data2={dataSet2.map(point => point.dataValue)}
                ctqName={ctqName}
                median1={testResults.median1}
                median2={testResults.median2}
                grandMedian={testResults.grandMedian}
                Ha={Ha(alternativemedian)}                
                confidenceInterval={[testResults.medianCI_minus, testResults.medianCI_plus]}
                title={`2-Sample Mann-Whitney Median Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.medianp_Value}
                alphalevel={significanceLevel}
                description1={ContCTQTwoSampleHypTestData[ctqId]?.dataset1description}
                description2={ContCTQTwoSampleHypTestData[ctqId]?.dataset2description}
              />
            </div>
          )}
          
          </div>  
          )}       
        </div>
      </CardContent>
    </Card>
  );
}