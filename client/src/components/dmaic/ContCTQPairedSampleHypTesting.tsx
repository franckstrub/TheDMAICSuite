import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Undo } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {onesampleMeanHypothesisTest} from "./onesampleMeanHypothesisTest";
import BoxPlotWithPairedSMeanTest from './BoxPlotWithPairedSMeanTest';
import { 
  mean, 
  standardDeviation, 
  performNormalityTest,
  calculatePairedSMeanSampleSize,
} from "@/lib/statisticsUtils";
import { isNumber } from 'util';

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQPairedSampleHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  dataSet1?: DataPoint[];
  dataSet2?: DataPoint[];
  dataset1description?: string;
  dataset2description?: string;
  H0difference?: number;
  enableMean1SPower: boolean;
  power1SMeanMean: number;
  power1SMeanH0: number;
  power1SMeanStdev: number;
}

interface ContCTQPairedSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface PowerSampleSizeResults {
  oneSMeansampleSize: number;
  oneSMeanactualPower: number;
}

interface RunTestResults {
  dataValues: number[];
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
  sampleSize1: number;
  ADvalue1: number;
  ADp_Value1: number;
  sampleSize2: number;
  ADvalue2: number;
  ADp_Value2: number;
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

export function ContCTQPairedSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQPairedSampleHypTestingProps) {
  const { toast } = useToast();
    const queryClient = useQueryClient();
    const [significanceLevel, setSignificanceLevel] = useState("0.05");
    const [alternativemean, setAlternativemean] = useState("Less than");
    const [power1SMeanPower, setPower1SMeanPower] = useState("0.90");
    const [power1SMeanAlpha, setPower1SMeanAlpha] = useState("0.05");
    const [power1SMeanHa, setPower1SMeanHa] = useState('≠');
  
    const [PowerSampleSizeResults, setPowerSampleSizeResults] = useState<PowerSampleSizeResults>({
      oneSMeansampleSize: 0,
      oneSMeanactualPower: 0,
    });
    
    const [testResults, setTestResults] = useState<RunTestResults>({
      dataValues: [],
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
      sampleSize1: 0,
      ADvalue1: 0,
      ADp_Value1: 0,
      sampleSize2: 0,
      ADvalue2: 0,
      ADp_Value2: 0,
    });
    const [pairedsampleMeanTestresult, setPairedsampleMeanTestresult] = useState<MeanTestResults | null>(null); // Initialize with null

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
  
    // Initialize ContCTQPairedSampleHypTestData with default values
    const [ContCTQPairedSampleHypTestData, setContCTQPairedSampleHypTestData] = useState<{ [ctqId: number]: ContCTQPairedSampleHypTestData }>(() => ({
      [ctqId]: {
        ctq: ctqName,
        H0difference: 0,
        dataset1description: "",
        dataset2description: "",
        enableMean1SPower: false,
        power1SMeanMean: 0,
        power1SMeanH0: 0,
        power1SMeanStdev: 0,
      }
    }));

  // TanStack Query for loading data from database
    const { data: configData, isLoading, error } = useQuery({
      queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/paired-sample-hypothesis-config`],
      enabled: !!projectId && !!ctqId,
      retry: false,
    });
  
    // Mutation for saving data to database
    const saveConfigMutation = useMutation({
      mutationFn: async (configData: any) => {
        const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/paired-sample-hypothesis-config`, {
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
          description: "Paired-sample hypothesis testing configuration has been saved successfully.",
        });
        // Invalidate the query to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/paired-sample-hypothesis-config`] });
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
          // Update data points from database
          if (config.dataSet1 && Array.isArray(config.dataSet1)) {
            setDataSet1(config.dataSet1);
          }
          if (config.dataSet2 && Array.isArray(config.dataSet2)) {
            setDataSet2(config.dataSet2);
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
          
          // Update ContCTQPairedSampleHypTestData from database
          setContCTQPairedSampleHypTestData(prev => ({
            ...prev,
            [ctqId]: {
              ...prev[ctqId],
              H0difference: config.H0difference || 0,
              dataset1description: config.dataset1Description || "",
              dataset2description: config.dataset2Description || "",
              enableMean1SPower: config.enableMean1SPower ?? true,
              power1SMeanMean: config.power1SMeanMean || 0,
              power1SMeanH0: config.power1SMeanH0 || 0,
              power1SMeanStdev: config.power1SMeanStdev || 0, 
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
    const currentConfig = ContCTQPairedSampleHypTestData[ctqId];
    if (!currentConfig) return;
    
    const configToSave = {
      H0difference: currentConfig.H0difference,
      significanceLevel,
      alternativemean,
      dataSet1,
      dataSet2,
      dataset1Description: currentConfig.dataset1description || "",
      dataset2Description: currentConfig.dataset2description || "",
      enableMean1SPower: currentConfig.enableMean1SPower ?? true,
      power1SMeanPower,
      power1SMeanHa,
      power1SMeanMean: currentConfig.power1SMeanMean,
      power1SMeanH0: currentConfig.power1SMeanH0,
      power1SMeanStdev: currentConfig.power1SMeanStdev,
      power1SMeanAlpha,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateContCTQPairedSampleHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQPairedSampleHypTestData, 
    value: any
  ) => {
    setContCTQPairedSampleHypTestData(prev => ({
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
  ): PowerSampleSizeResults => {
  
    // Initialize with default values
    
    let nMean = 0;
    let actualMeanPower=0;
    let nVariance = 0;
    let actualVariancePower=0;
  
    if(enableMean1SPower) {
      if(isNaN(parseFloat(power1SMeanPower))) {
        toast({
          title: "Paired-Sample Mean Power & Sample Size test run Unsuccessfully",
          description: "No valid Mean Power value. The Mean Power & Sample Size test has not been executed.",
        });
      }
      else {
        const result = calculatePairedSMeanSampleSize(
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
  
    setPowerSampleSizeResults(PowerSampleSizeResults);
    toast({
          title: "Power & Sample Size test Run Successfully",
          description: "The Power & Sample Size tests have been executed.",
        });
    return {
      oneSMeansampleSize: nMean,
      oneSMeanactualPower: actualMeanPower,
    };
  
  }
  
  {/* on input change, update ContCTQPairedSampleHypTestData state */}
  useEffect(() => {
    const currentConfig = ContCTQPairedSampleHypTestData[ctqId];
    if (!currentConfig) return;
  
    const results = handlePowerSampleSize(
      currentConfig.enableMean1SPower ?? false,
      power1SMeanPower,
      power1SMeanHa,
      currentConfig.power1SMeanMean ?? 0,
      currentConfig.power1SMeanH0 ?? 0,
      currentConfig.power1SMeanStdev ?? 0,
      power1SMeanAlpha,
    );
  
    setPowerSampleSizeResults(results);
  }, [
    power1SMeanPower,
    power1SMeanHa,
    ContCTQPairedSampleHypTestData[ctqId]?.power1SMeanMean,
    ContCTQPairedSampleHypTestData[ctqId]?.power1SMeanH0,
    ContCTQPairedSampleHypTestData[ctqId]?.power1SMeanStdev,
    power1SMeanAlpha,
  ]);

  const handleRunTest = (
    dataset1: DataPoint[],
    dataset2: DataPoint[],
    significance: number,
    HaMean: "Less than" | "Greater than" | "Different",
    H0difference: number,
  ): RunTestResults => {
  
    // Initialize with default values
    let dataValues : number[] = [0];
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
    let sampleSize1: number =0;
    let ADvalue1: number = 0;
    let ADp_Value1: number = 0;
    let sampleSize2: number =0;
    let ADvalue2: number = 0;
    let ADp_Value2: number = 0;
  
    if (!dataset1 || dataset1.length === 0 || !dataset2 || dataset2.length === 0) {
      toast({
        title: "Paired-Sample Test Run Unsuccessfully",
        description: "No data set. The hypothesis test has not been executed.",
      });
      return {
        dataValues, sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus, sampleSize1, ADvalue1, ADp_Value1, sampleSize2, ADvalue2, ADp_Value2,
      };
    }
    else if (dataset1.length === 1 || dataset2.length === 1) {
      toast({
        title: "Need two data in each dataset at least to run Hypothesis Testing",
        description: "Need two data in each dataset at least to run Hypothesis Testing"
      });
      return {
        dataValues, sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus, sampleSize1, ADvalue1, ADp_Value1, sampleSize2, ADvalue2, ADp_Value2,
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
    const normalityTest1 = performNormalityTest(dataValues1, meanVal1, stdDev1);
    ADvalue1 = normalityTest1.adStatistic;
    ADp_Value1 = normalityTest1.pValue;
    sampleSize1 = n1;
  
    const normalityTest2 = performNormalityTest(dataValues2, meanVal2, stdDev2);
    ADvalue2 = normalityTest2.adStatistic;
    ADp_Value2 = normalityTest2.pValue;
    sampleSize2 = n2;

    //const dataValues[] = dataset1[] - dataset2[];
    const maxLength = Math.min(dataSet1.length, dataSet2.length);
    dataValues = Array.from({ length: maxLength }, (_, index) => {
      const value1 = dataSet1[index]?.dataValue || 0;
      const value2 = dataSet2[index]?.dataValue || 0;
      return value1 - value2;
    });
    const n = dataValues.length;
    const meanVal = mean(dataValues);
    const stdDev = standardDeviation(dataValues); 
  
    // Perform normality test - will return isNormal, AD value and p_values
    const normalityTest = performNormalityTest(dataValues, meanVal, stdDev);
    ADvalue = normalityTest.adStatistic;
    ADp_Value = normalityTest.pValue;
  
    if (n > 1) {
      // Validate and type cast the string to the expected union type
      const validAlternatives = ["Less than", "Greater than", "Different"] as const;
      if (!validAlternatives.includes(HaMean as any)) {
        toast({
          title: "Invalid Alternative Hypothesis",
          description: "Invalid alternative hypothesis for Mean test.",
          variant: "destructive",
        });
        return {
          dataValues, sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
          tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus, sampleSize1, ADvalue1, ADp_Value1, sampleSize2, ADvalue2, ADp_Value2,
        };
      }
      
      const meanTestResult = onesampleMeanHypothesisTest({
        dataValues,
        significance,
        alternativemean: HaMean as "Less than" | "Greater than" | "Different",
        targetMean: H0difference,
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
      setPairedsampleMeanTestresult(meanTestResult);
    }
    toast({
    title: "Test Run Successfully",
    description: "The hypothesis test has been executed.",
    });

    return {
      dataValues, sampleSize, meanValue, stdev, variance, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
      tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus, sampleSize1, ADvalue1, ADp_Value1, sampleSize2, ADvalue2, ADp_Value2,
    };
  };

  {/* on input change, update ContCTQPairedSampleHypTestData state */}
  useEffect(() => {
    const currentConfig = ContCTQPairedSampleHypTestData[ctqId];
    if (!currentConfig || dataSet1.length === 0) return;
  
    const results = handleRunTest(
      dataSet1,
      dataSet2,
      parseFloat(significanceLevel),
      Ha(alternativemean),
      currentConfig.H0difference ?? 0,
    );
  
    setTestResults(results);
    setShowBoxPlot(true);
  }, [
    dataSet1,
    dataSet2,
    significanceLevel,
    alternativemean,
    ContCTQPairedSampleHypTestData[ctqId]?.H0difference,
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
  
      // Use focused cell as starting position (like Paired Sample component)
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
    <Card data-component="paired-sample">
      <CardHeader>
        <CardTitle>Paired-Sample Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
        </p>

        <p className="text-sm text-gray-500 mb-4">
          Determine whether the mean of the differences between two paired samples differs from 0 (or a target value) and is statistically significant or insignificant.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-12 items-stretch">
              <div className="flex items-top ml-1 h-full space-x-1">
              <Checkbox
                id={`${ctqId}-enableMean1SPower`}
                checked={ContCTQPairedSampleHypTestData[ctqId]?.enableMean1SPower || false}
                onCheckedChange={(checked) => updateContCTQPairedSampleHypTestDataField(ctqId, "enableMean1SPower", checked)}
              />
              {!ContCTQPairedSampleHypTestData[ctqId]?.enableMean1SPower ? (
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
                      <CardTitle className="text-sm">Power & Sample Size Paired-Sample Mean Hypothesis Testing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <div>
                      
                        <Label htmlFor='power1SMeanPower'>Power of test(1-β):</Label>
                        
                        <Select value={power1SMeanPower} onValueChange={(value: string) => {
                          setPower1SMeanPower(value);
                          //updateContCTQPairedSampleHypTestDataField(ctqId, 'power1SMeanPower', value);
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
                          //updateContCTQPairedSampleHypTestDataField(ctqId, 'power1SMeanHa', value);
                        }}>
                        <SelectTrigger id="power1SMeanHa">
                            <SelectValue placeholder="Select Ha (Alternative Hypothesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">&gt; 0</SelectItem>
                          <SelectItem value="≠">≠ 0</SelectItem>
                          <SelectItem value="<">&lt; 0</SelectItem>
                        </SelectContent>
                        </Select> 
                        
                      </div>
                      <div>                      
                        <Label htmlFor="power1SMeanAlpha">Alpha (α):</Label> 
                        
                        <Select value={power1SMeanAlpha} onValueChange={(value: string) => {
                          setPower1SMeanAlpha(value);
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
                      Mean of paired difference (μ<sub>d</sub>): 
                        
                        <Input
                          type="number"
                          step="any"
                          value={ContCTQPairedSampleHypTestData[ctqId]?.power1SMeanMean ?? ''}
                          onChange={(e) => updateContCTQPairedSampleHypTestDataField(
                              ctqId, 
                              "power1SMeanMean", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter mean of difference (μsub>d</sub>)"
                          className="mt-1"
                        />
                        
                      </div>
                      <div>
                      Standard Deviation of paired difference (σ<sub>d</sub>): 
                        
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={ContCTQPairedSampleHypTestData[ctqId]?.power1SMeanStdev ?? ''}
                          onChange={(e) => updateContCTQPairedSampleHypTestDataField(
                              ctqId, 
                              "power1SMeanStdev", 
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                          )}
                          placeholder="Enter standard deviation of difference (σ<sub>d</sub>)"
                          className="mt-1"
                        />
                        
                      </div>
                     
                      <div>                      
                        Hypothesized difference δ0 (H0): 0
                      </div>

                      <div className="font-medium text-sm">
                      
                      <Badge
                        variant="default"
                        className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                        title={ "Estimated minimum size of each data sample and and Actual Power of the test" }
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
          </div>
          {(ContCTQPairedSampleHypTestData[ctqId]?.enableMean1SPower) && (    
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
            
          <div className="w-1/2 min-w-[200px] pr-4">
            <Label>Hypothesized difference δ0 (H0):</Label>
            <Input
                type="number"
                step="any"
                value={ContCTQPairedSampleHypTestData[ctqId]?.H0difference ?? ''}
                onChange={(e) => updateContCTQPairedSampleHypTestDataField(
                    ctqId, 
                    "H0difference", 
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                )}
                placeholder="Enter Hypothesized difference δ0 (H0)"
                className="mt-1"
            />
          </div>
          
          {/* <div className="grid grid-cols-3 pr-10 gap-12"> */}
            
          <div className="w-1/2 min-w-[200px] pr-4">
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
          </div> 
          {/*</div>*/}

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

           {/* Data Input Section for Paired Sample Hypothesis Test */}
           <div className="grid grid-cols-2 gap-4 pr-4">
            <div>
            <Label>Description of your dataset 1:</Label>
            <Input
                type="text"
                value={ContCTQPairedSampleHypTestData[ctqId]?.dataset1description || ""}
                onChange={(e) => updateContCTQPairedSampleHypTestDataField(
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
                value={ContCTQPairedSampleHypTestData[ctqId]?.dataset2description || ""}
                onChange={(e) => updateContCTQPairedSampleHypTestDataField(
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
           </div>
           {((pairedsampleMeanTestresult) && ( testResults.sampleSize > 1) && ( testResults.sampleSize1 > 1) && ( testResults.sampleSize2 > 1)) && ( 
           <div className="p-4 border border-gray-200 rounded-md bg-gray-50 grid grid-cols-1 gap-2 text-sm">
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
              <div className="text-gray-600 font-medium">Dataset 1 Description:&nbsp;
              {ContCTQPairedSampleHypTestData[ctqId]?.dataset1description}</div>
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
              <div className="text-gray-600 font-medium">Dataset 2 Description:&nbsp;
              {ContCTQPairedSampleHypTestData[ctqId]?.dataset2description}</div>
              <div className="text-gray-600 font-medium">Sample size:&nbsp;
              {testResults.sampleSize2}</div>
              <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
              {parseFloat(significanceLevel)*100}%</div>
              <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
              {testResults.ADvalue2.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
              {testResults.ADp_Value2.toFixed(3)}</div> 
              </Card>
              </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              
              <Card className="p-2">                
                <CardTitle className="text-lg">Paired-Sample Mean test:</CardTitle>
                <div className="text-lg justify-left">Student T-test:</div>
                <div className="text-gray-600 font-medium">Mean of paired difference (μ<sub>d</sub>):&nbsp;
                  {testResults.meanValue.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">SE Mean:&nbsp;
                  {testResults.SEmean.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Standard Deviation of paired difference (σ<sub>d</sub>):&nbsp;
                  {testResults.stdev.toFixed(3)}</div>
                <div className="text-gray-600 font-medium">Hypothesized difference δ0 (H0):&nbsp;
                  {ContCTQPairedSampleHypTestData[ctqId]?.H0difference}</div>
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
                  {alternativemean==='Less than' ? 'H0: μd ≥ '
                  : ( alternativemean==='Greater than' ? "H0: μd ≤ "
                    :"H0: μd = " )} {ContCTQPairedSampleHypTestData[ctqId]?.H0difference}<br></br>
                  {alternativemean==='Less than' ? "Ha: μd < "
                  : ( alternativemean==='Greater than' ? "Ha: μd > "
                    :"Ha: μd ≠ " )} {ContCTQPairedSampleHypTestData[ctqId]?.H0difference}<br></br>
                  {testResults.tp_Value < parseFloat(significanceLevel)
                    ? `Result => Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Result => Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} ≥ ${significanceLevel})`}
                  
                 </Badge>
                </div>
                <div className="text-gray-600 font-medium">T-statistic:&nbsp;
                  {typeof testResults.tStatistic === 'number' 
                    ? testResults.tStatistic.toFixed(3) 
                    : `[${testResults.tStatistic.lower.toFixed(3)} ; ${testResults.tStatistic.upper.toFixed(3)}]`
                  }
                </div>
                <div className="text-gray-600 font-medium">T-criteria
                  {typeof testResults.tCriteria === 'number' 
                    ? (alternativemean==='Less than' ? <> (T<sub>{significanceLevel}</sub>): {testResults.tCriteria.toFixed(3)} </> : <> (T<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.tCriteria.toFixed(3)}</>)
                    : <> (T<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, T<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.tCriteria.lower.toFixed(3)}, {testResults.tCriteria.upper.toFixed(3)}]</>
                  }
                </div>
                <div className="text-gray-600 font-medium">T-test P-value:&nbsp;
                  {testResults.tp_Value.toFixed(4)}</div>
                <div className="text-gray-600 font-medium">CI {(100*(1-parseFloat(significanceLevel)))}% for μ<sub>d</sub>: [
                {testResults.meanCI_minus.toFixed(3)}, {testResults.meanCI_plus.toFixed(3)}]</div>
              </Card>       
            </div>
           </div>
           )}

           {/* Paired sample Student mean test BoxPlot visualization when showBoxPlot is true */}
           {showBoxPlot && testResults.dataValues.length > 1 && (
            <div className="mt-6">
              <BoxPlotWithPairedSMeanTest
                data={testResults.dataValues}
                ctqName={ctqName}
                mean={testResults.meanValue}
                Ha={Ha(alternativemean)}
                h0Value={ContCTQPairedSampleHypTestData[ctqId]?.H0difference ?? 0}
                confidenceInterval={[testResults.meanCI_minus, testResults.meanCI_plus]}
                title={`Paired-Sample Mean T-Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.tp_Value}
                alphalevel={significanceLevel}
                description1={ContCTQPairedSampleHypTestData[ctqId]?.dataset1description}
                description2={ContCTQPairedSampleHypTestData[ctqId]?.dataset2description}
              />
            </div>
           )}
          </div> 
                 
        </div>
      </CardContent>
    </Card>
  );
}