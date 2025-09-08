import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Undo, Plus, Minus, X, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  mean, 
  standardDeviation, 
  variance,
  calculateMultipleSMeanSampleSize,
} from "@/lib/statisticsUtils";


interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQMultipleSampleHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: 'Multiple-Sample Hyp test'
  enableMeanTest: boolean;
  enableMeanMultipleSPower: boolean;
  powerPower: string;
  powerAlpha: string;
  powerNbrDistri: number;
  powerDifference: number;
  powerStdev: number;
  significanceLevel: string;
  alternateMean: string;
  enableVarianceTest?: boolean;
  alternateVariance: string;
  enableMedianTest: boolean;
  alternateMedian: string;
  datasets: DataPoint[][];
  datasetDescriptions: string[];
}

interface PowerSampleSizeResults {
  multipleSMeansampleSize: number;
  multipleSMeanactualPower: number;
}

interface TestResults {
  // Normality test results for each dataset
  normalityResults: Array<{
    sampleSize: number;
    mean: number;
    stdev: number;
    median: number;
    adValue: number;
    adPValue: number;
  }>;
  
  // Test results
  meanTest: {
    testStatistic: number;
    pValue: number;
    criticalValue: number;
    conclusion: string;
  };
  
  varianceTest: {
    testStatistic: number;
    pValue: number;
    criticalValue: number;
    conclusion: string;
  };
  
  medianTest: {
    testStatistic: number;
    pValue: number;
    criticalValue: number;
    conclusion: string;
  };
}

interface ContCTQMultipleSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export function ContCTQMultipleSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQMultipleSampleHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternateMean, setAlternateMean] = useState("Less than");
  const [alternateVariance, setAlternateVariance] = useState("Less than");
  const [alternateMedian, setAlternateMedian] = useState("Less than");
  const [PowerMultipleSMeanPower, setPowerMultipleSMeanPower] = useState("0.90");
  const [powerMultipleSMeanAlpha, setPowerMultipleSMeanAlpha] = useState("0.05");
  //const [powerMultipleSMeanHa, setPowerMultipleSMeanHa] = useState('≠');
  const [PowerSampleSizeResults, setPowerSampleSizeResults] = useState<PowerSampleSizeResults>({
      multipleSMeansampleSize: 0,
      multipleSMeanactualPower: 0,
    });
  // State for multiple datasets and UI management
  const [datasets, setDatasets] = useState<DataPoint[][]>([[], []]); // Start with 2 empty datasets
  const [datasetDescriptions, setDatasetDescriptions] = useState<string[]>(['Dataset 1', 'Dataset 2']);
  const [numDatasets, setNumDatasets] = useState(2);
  
  // Focused cell states for each dataset
  const [focusedCells, setFocusedCells] = useState<number[]>(new Array(2).fill(-1));
  const [editingCells, setEditingCells] = useState<number[]>(new Array(2).fill(-1));
  const [editValues, setEditValues] = useState<string[]>(new Array(2).fill(''));
  const [inputValues, setInputValues] = useState<string[]>(new Array(2).fill(''));
  
  // Undo states for each dataset
  const [undoStates, setUndoStates] = useState<{[key: number]: DataPoint[]}>({});
  const [showUndoButton, setShowUndoButton] = useState(false);
  
  // Test results
  const [testResults, setTestResults] = useState<TestResults>({
    normalityResults: [],
    meanTest: { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: '' },
    varianceTest: { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: '' },
    medianTest: { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: '' }
  });
  
  // Paste and clipboard management
  const [pasteInput, setPasteInput] = useState('');
  const [isDualColumnPaste, setIsDualColumnPaste] = useState(false);

  // Initialize ContCTQMultipleSampleHypTestData with default values
  // Fixed state initialization
  const [ContCTQMultipleSampleHypTestData, setContCTQMultipleSampleHypTestData] = useState<{ [ctqId: number]: ContCTQMultipleSampleHypTestData }>(() => ({
  [ctqId]: {
    ctq: ctqName,
    testType: "Multiple-Sample Hyp test", // Fixed: added missing hyphen to match interface
    enableMeanTest: false,
    enableMeanMultipleSPower: false,
    powerPower: "0.90" ,
    powerAlpha: "0.05" ,
    powerNbrDistri: 2,
    powerDifference: 0,
    powerStdev: 0,
    significanceLevel: "0.05",
    alternateMean: "Less than",
    enableVarianceTest: false,
    alternateVariance: "Less than",
    enableMedianTest: false,
    alternateMedian: "Less than",
    datasets: [[], []], 
    datasetDescriptions: ['Dataset 1', 'Dataset 2'],
  } 
  }));

  // Mutation for saving data to database
    const saveConfigMutation = useMutation({
      mutationFn: async (configData: any) => {
        const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/multiple-sample-hypothesis-config`, {
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
          description: "Multiple-sample hypothesis testing configuration has been saved successfully.",
        });
        // Invalidate the query to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/multiple-sample-hypothesis-config`] });
      },
      onError: (error: any) => {
        toast({
          title: "Save Failed",
          description: "Failed to save configuration. Please try again.",
          variant: "destructive",
        });
      },
    });

  // Function to save current configuration to database
  const saveConfiguration = () => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig) return;
    
    const configToSave = {
      testType: currentConfig.testType,
      enableMeanTest: currentConfig.enableMeanTest,
      enableMeanMultipleSPower: currentConfig.enableMeanMultipleSPower,
      powerPower: currentConfig.powerPower,
      powerAlpha: currentConfig.powerAlpha ,
      powerNbrDistri: currentConfig.powerNbrDistri,
      powerDifference: currentConfig.powerDifference,
      powerStdev: currentConfig.powerStdev,
      significanceLevel: currentConfig.significanceLevel,
      alternateMean: currentConfig.alternateMean,
      enableVarianceTest: currentConfig.enableVarianceTest,
      alternateVariance: currentConfig.alternateVariance,
      enableMedianTest: currentConfig.enableMedianTest,
      alternateMedian: currentConfig.alternateMedian,
      datasets,
      datasetDescriptions,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateContCTQMultipleSampleHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQMultipleSampleHypTestData, 
    value: any
  ) => {
    setContCTQMultipleSampleHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  // Functions for managing multiple datasets
  const addDataset = () => {
    setDatasets(prev => [...prev, []]);
    setDatasetDescriptions(prev => [...prev, `Dataset ${prev.length + 1}`]);
    setFocusedCells(prev => [...prev, -1]);
    setEditingCells(prev => [...prev, -1]);
    setEditValues(prev => [...prev, '']);
    setInputValues(prev => [...prev, '']);
    setNumDatasets(prev => prev + 1);
  };

  const removeDataset = (index: number) => {
    if (numDatasets <= 2) return; // Don't allow removing if only 2 datasets remain
    
    setDatasets(prev => prev.filter((_, i) => i !== index));
    setDatasetDescriptions(prev => prev.filter((_, i) => i !== index));
    setFocusedCells(prev => prev.filter((_, i) => i !== index));
    setEditingCells(prev => prev.filter((_, i) => i !== index));
    setEditValues(prev => prev.filter((_, i) => i !== index));
    setInputValues(prev => prev.filter((_, i) => i !== index));
    setNumDatasets(prev => prev - 1);
  };

  const addDataPoint = (datasetIndex: number, value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Save current state for undo
    setUndoStates(prev => ({
      ...prev,
      [datasetIndex]: [...datasets[datasetIndex]]
    }));
    setShowUndoButton(true);
    
    setDatasets(prev => {
      const newDatasets = [...prev];
      newDatasets[datasetIndex] = [
        ...newDatasets[datasetIndex],
        { indexNumber: newDatasets[datasetIndex].length + 1, dataValue: numericValue }
      ];
      return newDatasets;
    });
    
    setInputValues(prev => {
      const newInputValues = [...prev];
      newInputValues[datasetIndex] = '';
      return newInputValues;
    });
  };

  const deleteDataPoint = (datasetIndex: number, pointIndex: number) => {
    // Save current state for undo
    setUndoStates(prev => ({
      ...prev,
      [datasetIndex]: [...datasets[datasetIndex]]
    }));
    setShowUndoButton(true);
    
    setDatasets(prev => {
      const newDatasets = [...prev];
      newDatasets[datasetIndex] = newDatasets[datasetIndex]
        .filter((_, i) => i !== pointIndex)
        .map((point, i) => ({ ...point, indexNumber: i + 1 }));
      return newDatasets;
    });
  };

  const clearDataset = (datasetIndex: number) => {
    if (datasets[datasetIndex].length > 0) {
      // Save current state for undo
      setUndoStates(prev => ({
        ...prev,
        [datasetIndex]: [...datasets[datasetIndex]]
      }));
      setShowUndoButton(true);
      
      setDatasets(prev => {
        const newDatasets = [...prev];
        newDatasets[datasetIndex] = [];
        return newDatasets;
      });
      
      setInputValues(prev => {
        const newInputValues = [...prev];
        newInputValues[datasetIndex] = '';
        return newInputValues;
      });
      
      setFocusedCells(prev => {
        const newFocused = [...prev];
        newFocused[datasetIndex] = -1;
        return newFocused;
      });
      
      toast({
        title: `Dataset ${datasetIndex + 1} Cleared`,
        description: `All data in Dataset ${datasetIndex + 1} has been cleared. Use Undo to restore if needed.`,
      });
    }
  };

  const undoDatasetChange = (datasetIndex: number) => {
    const undoState = undoStates[datasetIndex];
    if (undoState) {
      setDatasets(prev => {
        const newDatasets = [...prev];
        newDatasets[datasetIndex] = [...undoState];
        return newDatasets;
      });
      
      setUndoStates(prev => {
        const newUndoStates = { ...prev };
        delete newUndoStates[datasetIndex];
        return newUndoStates;
      });
      
      toast({
        title: 'Changes Undone',
        description: `Dataset ${datasetIndex + 1} has been restored to its previous state.`,
      });
    }
  };

  const setFocusedCell = (datasetIndex: number, cellIndex: number) => {
    setFocusedCells(prev => {
      const newFocused = [...prev];
      // Clear all other focused cells
      for (let i = 0; i < newFocused.length; i++) {
        newFocused[i] = i === datasetIndex ? cellIndex : -1;
      }
      return newFocused;
    });
  };

  const setEditingCell = (datasetIndex: number, cellIndex: number, value: string = '') => {
    setEditingCells(prev => {
      const newEditing = [...prev];
      newEditing[datasetIndex] = cellIndex;
      return newEditing;
    });
    
    setEditValues(prev => {
      const newEditValues = [...prev];
      newEditValues[datasetIndex] = value;
      return newEditValues;
    });
  };

  const setInputValue = (datasetIndex: number, value: string) => {
    setInputValues(prev => {
      const newInputValues = [...prev];
      newInputValues[datasetIndex] = value;
      return newInputValues;
    });
  };

  const updateDatasetDescription = (datasetIndex: number, description: string) => {
    setDatasetDescriptions(prev => {
      const newDescriptions = [...prev];
      newDescriptions[datasetIndex] = description;
      return newDescriptions;
    });
  };

  const handlePowerSampleSize = (    
    enableMeanMultipleSPower: boolean,
    powerPower:string,
    powerAlpha: string,
    powerNbrDistri: number,
    powerDifference: number,
    powerStdev: number,
  ): PowerSampleSizeResults => {
  
    // Initialize with default values
    
    let nMean = 0;
    let actualMeanPower=0;
  
    if(enableMeanMultipleSPower) {
      if(isNaN(parseFloat(powerPower))) {
        toast({
          title: "Multiple Sample-Mean Power & Sample Size test run Unsuccessfully",
          description: "No valid Mean Power value. The Mean Power & Sample Size test has not been executed.",
        });
      }
      else {
        const result = calculateMultipleSMeanSampleSize(
          powerPower,
          powerNbrDistri,
          powerDifference,
          powerStdev,
          powerAlpha,
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
      multipleSMeansampleSize: nMean,
      multipleSMeanactualPower: actualMeanPower,
    };  
  }

  // Fake test functions (to be implemented later)
  const performMultipleSampleMeanTest = (datasets: DataPoint[][], significanceLevel: number, alternative: string) => {
    // Fake implementation - returns random test results
    const testStatistic = Math.random() * 10 - 5; // Random between -5 and 5
    const pValue = Math.random() * 0.2; // Random p-value between 0 and 0.2
    const criticalValue = 2.576; // Fixed critical value for demonstration
    
    const conclusion = pValue < significanceLevel 
      ? "Reject H0: At least one mean is significantly different"
      : "Accept H0: No significant difference between means";
    
    return {
      testStatistic,
      pValue,
      criticalValue,
      conclusion
    };
  };

  const performMultipleSampleVarianceTest = (datasets: DataPoint[][], significanceLevel: number, alternative: string) => {
    // Fake implementation - returns random test results
    const testStatistic = Math.random() * 20 + 5; // Random between 5 and 25
    const pValue = Math.random() * 0.3; // Random p-value between 0 and 0.3
    const criticalValue = 12.592; // Fixed critical value for demonstration
    
    const conclusion = pValue < significanceLevel 
      ? "Reject H0: Variances are significantly different"
      : "Accept H0: No significant difference between variances";
    
    return {
      testStatistic,
      pValue,
      criticalValue,
      conclusion
    };
  };

  const performMultipleSampleMedianTest = (datasets: DataPoint[][], significanceLevel: number, alternative: string) => {
    // Fake implementation - returns random test results
    const testStatistic = Math.random() * 15 + 2; // Random between 2 and 17
    const pValue = Math.random() * 0.25; // Random p-value between 0 and 0.25
    const criticalValue = 9.488; // Fixed critical value for demonstration
    
    const conclusion = pValue < significanceLevel 
      ? "Reject H0: At least one median is significantly different"
      : "Accept H0: No significant difference between medians";
    
    return {
      testStatistic,
      pValue,
      criticalValue,
      conclusion
    };
  };

  const calculateMean = (dataset: DataPoint[]) => {
    if (dataset.length === 0) return 0;
    const sum = dataset.reduce((acc, point) => acc + point.dataValue, 0);
    return sum / dataset.length;
  };

  const calculateStdDev = (dataset: DataPoint[]) => {
    if (dataset.length <= 1) return 0;
    const mean = calculateMean(dataset);
    const squaredDiffs = dataset.map(point => Math.pow(point.dataValue - mean, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / (dataset.length - 1);
    return Math.sqrt(variance);
  };

  const handleUpdateDataPoint = (datasetIndex: number, pointIndex: number, newValue: string) => {
    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue)) return;
    
    // Save current state for undo
    setUndoStates(prev => ({
      ...prev,
      [datasetIndex]: [...datasets[datasetIndex]]
    }));
    setShowUndoButton(true);
    
    setDatasets(prev => {
      const newDatasets = [...prev];
      newDatasets[datasetIndex] = newDatasets[datasetIndex].map((point, idx) => 
        idx === pointIndex ? { ...point, dataValue: numericValue } : point
      );
      return newDatasets;
    });
    
    // Clear editing state
    const newEditingCells = [...editingCells];
    newEditingCells[datasetIndex] = -1;
    setEditingCells(newEditingCells);
  };

  const handleFocusedCellPaste = (datasetIndex: number, clipboardData: string) => {
    const lines = clipboardData.trim().split('\n');
    const values: number[] = [];
    
    for (const line of lines) {
      // Handle both comma and tab separated values
      const parts = line.split(/[\t,]/);
      for (const part of parts) {
        const cleanedValue = part.trim().replace(/,/g, '.');
        const numericValue = parseFloat(cleanedValue);
        if (!isNaN(numericValue)) {
          values.push(numericValue);
        }
      }
    }
    
    if (values.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid numeric data found in clipboard.",
        variant: "destructive",
      });
      return;
    }
    
    // Save current state for undo
    setUndoStates(prev => ({
      ...prev,
      [datasetIndex]: [...datasets[datasetIndex]]
    }));
    setShowUndoButton(true);
    
    setDatasets(prev => {
      const newDatasets = [...prev];
      const focusedIndex = focusedCells[datasetIndex];
      const currentDataset = [...newDatasets[datasetIndex]];
      
      // Insert values starting from focused cell
      values.forEach((value, index) => {
        const targetIndex = focusedIndex + index;
        if (targetIndex < currentDataset.length) {
          // Replace existing value
          currentDataset[targetIndex] = { ...currentDataset[targetIndex], dataValue: value };
        } else {
          // Add new value
          currentDataset.push({ 
            indexNumber: currentDataset.length + 1, 
            dataValue: value 
          });
        }
      });
      
      // Reindex the dataset
      currentDataset.forEach((point, index) => {
        point.indexNumber = index + 1;
      });
      
      newDatasets[datasetIndex] = currentDataset;
      return newDatasets;
    });
    
    toast({
      title: "Data Pasted",
      description: `${values.length} values pasted successfully into Dataset ${datasetIndex + 1}.`,
    });
  };

  const calculateNormalityTests = (datasets: DataPoint[][]) => {
    return datasets.map((dataset, index) => {
      if (dataset.length === 0) {
        return {
          sampleSize: 0,
          mean: 0,
          stdev: 0,
          median: 0,
          adValue: 0,
          adPValue: 0
        };
      }

      const values = dataset.map(d => d.dataValue);
      const meanVal = mean(values);
      const stdevVal = standardDeviation(values);
      
      // Calculate median
      const sortedValues = [...values].sort((a, b) => a - b);
      const medianVal = sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)];

      // Fake Anderson-Darling test results
      const adValue = Math.random() * 2 + 0.1; // Random between 0.1 and 2.1
      const adPValue = Math.random() * 0.5; // Random p-value between 0 and 0.5

      return {
        sampleSize: dataset.length,
        mean: meanVal,
        stdev: stdevVal,
        median: medianVal,
        adValue,
        adPValue
      };
    });
  };

  const handleRunTest = () => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig) return;

    const significance = parseFloat(significanceLevel);
    
    // Calculate normality tests
    const normalityResults = calculateNormalityTests(datasets);

    // Perform hypothesis tests if enabled
    const meanTest = currentConfig.enableMeanTest 
      ? performMultipleSampleMeanTest(datasets, significance, alternateMean)
      : { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: 'Test not enabled' };

    const varianceTest = currentConfig.enableVarianceTest 
      ? performMultipleSampleVarianceTest(datasets, significance, alternateVariance)
      : { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: 'Test not enabled' };

    const medianTest = currentConfig.enableMedianTest 
      ? performMultipleSampleMedianTest(datasets, significance, alternateMedian)
      : { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: 'Test not enabled' };

    setTestResults({
      normalityResults,
      meanTest,
      varianceTest,
      medianTest
    });

    toast({
      title: "Tests Run Successfully",
      description: "Multiple-sample hypothesis tests have been executed.",
    });
  };
  
  // Synchronize local state with main state
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (currentConfig) {
      if (currentConfig.powerPower && currentConfig.powerPower !== PowerMultipleSMeanPower) {
        setPowerMultipleSMeanPower(currentConfig.powerPower);
      }
      if (currentConfig.powerAlpha && currentConfig.powerAlpha !== powerMultipleSMeanAlpha) {
        setPowerMultipleSMeanAlpha(currentConfig.powerAlpha);
      }
    }
  }, [ContCTQMultipleSampleHypTestData[ctqId]?.powerPower, ContCTQMultipleSampleHypTestData[ctqId]?.powerAlpha, PowerMultipleSMeanPower, powerMultipleSMeanAlpha]);

  {/* on input change, update ContCTQMultipleSampleHypTestData state */}
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig) return;
  
    const results = handlePowerSampleSize(
      //testType: currentConfig.testType,
      //enableMeanTest: currentConfig.enableMeanTest,
      currentConfig.enableMeanMultipleSPower ?? false,
      currentConfig.powerPower ?? "0.90",
      currentConfig.powerAlpha ?? "0.05",
      currentConfig.powerNbrDistri ?? 2,
      currentConfig.powerDifference ?? 0,
      currentConfig.powerStdev ?? 0,
      //currentConfig.significanceLevel,
      //currentConfig.alternateMean,
      //currentConfig.enableVarianceTest,
      //currentConfig.alternateVariance,
      //currentConfig.enableMedianTest,
      //currentConfig.alternateMedian,
      //currentConfig.dataPoints,
      //currentConfig.datasetDescription,
    );
  
    setPowerSampleSizeResults(results);
  }, [
    ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerPower,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerAlpha,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerNbrDistri,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerDifference,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerStdev,
  ]);

  // useEffect to trigger test calculations when significance or alternative hypotheses change
  useEffect(() => {
    // Only run tests if we have data and at least one test is enabled
    const hasData = datasets.some(dataset => dataset.length > 0);
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    const hasEnabledTests = currentConfig && (
      currentConfig.enableMeanTest || 
      currentConfig.enableVarianceTest || 
      currentConfig.enableMedianTest
    );
    
    if (hasData && hasEnabledTests) {
      handleRunTest();
    }
  }, [significanceLevel, alternateMean, alternateVariance, alternateMedian, datasets]);

  // useEffect

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multiple-Sample Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant in N samples.
        </p>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-3">
            Statistical parameter to test (Select Multiple)
          </label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MeanTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMeanTest", checked)}
                />
                <Label htmlFor={`${ctqId}-enableMeanTest`} className="text-sm font-medium text-gray-700">
                  Mean
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-VarianceTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableVarianceTest", checked)}
                />
                <Label htmlFor={`${ctqId}-VarianceTest`} className="text-sm font-medium text-gray-700">
                  Variance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MedianTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMedianTest", checked)}
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
              id={`${ctqId}-enableMeanMultipleSPower`}
              checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower || false}
              onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMeanMultipleSPower", checked)}
            />
            {!ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower ? (
              <Label htmlFor={`${ctqId}-enableMeanMultipleSPower`} className="items-top text-sm font-sm text-gray-400">
                Power & Sample Size
              </Label>
              ) : (
              <div>
                <Label htmlFor={`${ctqId}-enableMeanMultipleSPower`} className="text-sm font-medium text-gray-700">
                Power & Sample Size
                </Label>
                <Card className="bg-gray-50 min-h-[420px] flex flex-col mt-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Power & Sample Size Multiple-Sample Mean Hypothesis Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm font-medium">
                    <div>                      
                      <Label htmlFor='powerMultipleSMeanPower'>Power of test(1-β):</Label>
                      <Select value={PowerMultipleSMeanPower} onValueChange={(value: string) => {
                        setPowerMultipleSMeanPower(value);
                        updateContCTQMultipleSampleHypTestDataField(ctqId, 'powerPower', value);
                      }}>
                      <SelectTrigger id='powerMultipleSMeanPower'>
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

                    <div className="mt-2 mb-2">                    
                      Ha: At least one mean is ≠ than the other means                    
                    </div>

                    <div>
                      <Label htmlFor="powerMultipleSMeanAlpha">Alpha (α):</Label> 
                      <Select value={powerMultipleSMeanAlpha} onValueChange={(value: string) => {
                        setPowerMultipleSMeanAlpha(value);
                        updateContCTQMultipleSampleHypTestDataField(ctqId, 'powerAlpha', value);
                      }}>
                      <SelectTrigger id="powerMultipleSMeanAlpha">
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
                    
                    <div>Number of distributions to test: 
                      <Input
                        type="number"
                        min="2"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerNbrDistri ?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerNbrDistri", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter Number of distributions to test:"
                        className="mt-1"
                      />
                    </div>  
                    
                    <div>Maximum difference between means (δ): 
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerDifference?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerDifference", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter Maximum difference between means (δ)"
                        className="mt-1"
                      />
                    </div>  
                    
                    <div>Standard Deviation (σ): 
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerStdev ?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerStdev", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter standard deviation value (σ)"
                        className="mt-1"
                      />
                    </div>                   

                    <div className="font-medium text-sm">
                    <Badge
                      variant="default"
                      className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                      title={ "Minimum sample size of each data sample and actual power of the test" }
                    >
                      Sample Size (n): {PowerSampleSizeResults.multipleSMeansampleSize.toFixed(0)} <br />
                      Actual Power: {(PowerSampleSizeResults.multipleSMeanactualPower*100).toFixed(2)}%
                    </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            </div>
        </div>
        {(ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower) && (    
          <Button 
              className="w-full" 
              onClick={saveConfiguration} 
              disabled={saveConfigMutation.isPending}
              //variant="outline"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
          </Button>
        )}          

          <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="alternateMean">Alternative Hypothesis</Label>
            <Select value={alternateMean} onValueChange={setAlternateMean}>
            <SelectTrigger id="alternative">
                <SelectValue placeholder="Select alternative" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
                <SelectItem value="Less than">Less than</SelectItem>
                <SelectItem value="Greater than">Greater than</SelectItem>
            </SelectContent>
            </Select>
            </div>
          </div>

          <div>
          {/* Data Input Section for Multiple Sample Hypothesis Test */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Data Input</h3>
            
            {/* Number of Datasets Control */}
            <div className="space-y-2">
              <Label htmlFor="num-datasets">Number of Datasets</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumDatasets(Math.max(2, numDatasets - 1))}
                  disabled={numDatasets <= 2}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium w-12 text-center">
                  {numDatasets}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNumDatasets(Math.min(10, numDatasets + 1))}
                  disabled={numDatasets >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dataset Descriptions and Data Input Tables */}
            <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
              {Array.from({ length: numDatasets }, (_, datasetIndex) => (
                <div key={datasetIndex} className="flex-shrink-0 space-y-4" style={{ minWidth: '320px' }}>
                  {/* Dataset Description */}
                  <div className="space-y-2">
                    <Label htmlFor={`dataset-desc-${datasetIndex}`}>Dataset {datasetIndex + 1} Description</Label>
                    <Input
                      id={`dataset-desc-${datasetIndex}`}
                      type="text"
                      value={datasetDescriptions[datasetIndex] || ""}
                      onChange={(e) => {
                        const newDescriptions = [...datasetDescriptions];
                        newDescriptions[datasetIndex] = e.target.value;
                        setDatasetDescriptions(newDescriptions);
                      }}
                      placeholder={`Description for dataset ${datasetIndex + 1}`}
                      className="text-sm"
                    />
                  </div>
                  
                  {/* Data Input Table */}
                  <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Dataset {datasetIndex + 1}</h4>
                    {numDatasets > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeDataset(datasetIndex)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {datasets[datasetIndex]?.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => clearDataset(datasetIndex)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                    
                    {undoStates[datasetIndex] && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => undoDatasetChange(datasetIndex)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                      >
                        <Undo className="h-4 w-4 mr-1" />
                        Undo
                      </Button>
                    )}

                    <Button
                      onClick={async () => {
                        if (focusedCells[datasetIndex] < 0) {
                          toast({
                            title: "No Cell Focused",
                            description: `Please click on a data cell in Dataset ${datasetIndex + 1} first to set the starting position for paste.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          const clipboardData = await navigator.clipboard.readText();
                          if (clipboardData.trim()) {
                            handleFocusedCellPaste(datasetIndex, clipboardData);
                          } else {
                            toast({
                              title: "No Data Found",
                              description: "No valid numeric data found in clipboard.",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Clipboard Access",
                            description: "Please use Ctrl+V to paste data.",
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={!focusedCells[datasetIndex] || focusedCells[datasetIndex] < 0}
                    >
                      📋 Paste
                    </Button>
                  </div>

                  {/* Data Input */}
                  <div className="flex gap-2">
                    <Input
                      id={`add-data-input-${datasetIndex}`}
                      type="number"
                      value={inputValues[datasetIndex] || ""}
                      onChange={(e) => {
                        const newInputValues = [...inputValues];
                        newInputValues[datasetIndex] = e.target.value;
                        setInputValues(newInputValues);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addDataPoint(datasetIndex, inputValues[datasetIndex] || "");
                        }
                      }}
                      placeholder="Enter value"
                      className="text-sm"
                    />
                    <Button
                      onClick={() => addDataPoint(datasetIndex, inputValues[datasetIndex] || "")}
                      size="sm"
                      disabled={!inputValues[datasetIndex]?.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Data Table */}
                  <div className="border rounded-md max-h-[300px] overflow-y-auto bg-white">
                    <table className="min-w-full table-auto text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                            #
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                            Value
                          </th>
                          <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {!datasets[datasetIndex] || datasets[datasetIndex].length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center text-gray-500 py-4">
                              <div
                                className="cursor-pointer hover:bg-blue-50 rounded p-2"
                                onClick={() => document.getElementById(`add-data-input-${datasetIndex}`)?.focus()}
                                title="Click to focus input or paste data here"
                              >
                                No data - click to add values
                              </div>
                            </td>
                          </tr>
                        ) : (
                          datasets[datasetIndex]?.map((point, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-xs text-gray-900">
                                {point.indexNumber}
                              </td>
                              <td 
                                className="px-2 py-1 text-xs text-gray-900 cursor-pointer"
                                onClick={() => {
                                  const newFocused = [...focusedCells];
                                  newFocused[datasetIndex] = index;
                                  setFocusedCells(newFocused);
                                }}
                                style={{
                                  backgroundColor: focusedCells[datasetIndex] === index ? '#dbeafe' : 'transparent'
                                }}
                              >
                                {editingCells[datasetIndex] === index ? (
                                  <Input
                                    type="number"
                                    value={editValues[datasetIndex] || ""}
                                    onChange={(e) => {
                                      const newEditValues = [...editValues];
                                      newEditValues[datasetIndex] = e.target.value;
                                      setEditValues(newEditValues);
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateDataPoint(datasetIndex, index, editValues[datasetIndex] || "");
                                      }
                                      if (e.key === 'Escape') {
                                        const newEditingCells = [...editingCells];
                                        newEditingCells[datasetIndex] = -1;
                                        setEditingCells(newEditingCells);
                                      }
                                    }}
                                    onBlur={() => {
                                      const newEditingCells = [...editingCells];
                                      newEditingCells[datasetIndex] = -1;
                                      setEditingCells(newEditingCells);
                                    }}
                                    className="w-full text-xs p-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newEditingCells = [...editingCells];
                                      newEditingCells[datasetIndex] = index;
                                      setEditingCells(newEditingCells);
                                      const newEditValues = [...editValues];
                                      newEditValues[datasetIndex] = point.dataValue.toString();
                                      setEditValues(newEditValues);
                                    }}
                                  >
                                    {point.dataValue}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDataPoint(datasetIndex, index)}
                                  className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Data Summary */}
                  {datasets[datasetIndex]?.length > 0 && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                      <div>Count: {datasets[datasetIndex]?.length || 0}</div>
                      <div>Mean: {datasets[datasetIndex] ? calculateMean(datasets[datasetIndex]).toFixed(3) : '0.000'}</div>
                      <div>Std Dev: {datasets[datasetIndex] ? calculateStdDev(datasets[datasetIndex]).toFixed(3) : '0.000'}</div>
                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Dataset Button */}
            {numDatasets < 10 && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={addDataset}
                  className="border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dataset
                </Button>
              </div>
            )}

            {/* Run Test Button */}
            <div className="flex gap-4">
              <Button
                onClick={handleRunTest}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                disabled={datasets.every(dataset => dataset.length === 0)}
              >
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </Button>

              {showUndoButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Undo last change across all datasets
                    Object.keys(undoStates).forEach(key => {
                      const datasetIndex = parseInt(key);
                      if (undoStates[datasetIndex]) {
                        undoDatasetChange(datasetIndex);
                      }
                    });
                  }}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                >
                  <Undo className="h-4 w-4 mr-1" />
                  Undo All
                </Button>
              )}
            </div>
          </div>
          
          {/* Results for Multiple Sample Hypothesis Test of Means, Variances and Medians */}
          {testResults && (
            <div className="space-y-6 mt-8">
              <h3 className="text-lg font-semibold">Test Results</h3>
              
              {/* Mean Test Results */}
              {ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest && testResults.meanTest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mean Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Test Statistic</div>
                        <div className="text-lg font-semibold">{testResults.meanTest.testStatistic.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">P-Value</div>
                        <div className="text-lg font-semibold">{testResults.meanTest.pValue.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Decision</div>
                        <div className={`text-lg font-semibold ${testResults.meanTest.pValue < parseFloat(significanceLevel) ? 'text-red-600' : 'text-green-600'}`}>
                          {testResults.meanTest.pValue < parseFloat(significanceLevel) ? 'Reject H0' : 'Accept H0'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Conclusion</div>
                        <div className="text-sm">{testResults.meanTest.conclusion}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Variance Test Results */}
              {ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest && testResults.varianceTest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Variance Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Test Statistic</div>
                        <div className="text-lg font-semibold">{testResults.varianceTest.testStatistic.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">P-Value</div>
                        <div className="text-lg font-semibold">{testResults.varianceTest.pValue.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Decision</div>
                        <div className={`text-lg font-semibold ${testResults.varianceTest.pValue < parseFloat(significanceLevel) ? 'text-red-600' : 'text-green-600'}`}>
                          {testResults.varianceTest.pValue < parseFloat(significanceLevel) ? 'Reject H0' : 'Accept H0'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Conclusion</div>
                        <div className="text-sm">{testResults.varianceTest.conclusion}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Median Test Results */}
              {ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest && testResults.medianTest && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Median Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">Test Statistic</div>
                        <div className="text-lg font-semibold">{testResults.medianTest.testStatistic.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">P-Value</div>
                        <div className="text-lg font-semibold">{testResults.medianTest.pValue.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Decision</div>
                        <div className={`text-lg font-semibold ${testResults.medianTest.pValue < parseFloat(significanceLevel) ? 'text-red-600' : 'text-green-600'}`}>
                          {testResults.medianTest.pValue < parseFloat(significanceLevel) ? 'Reject H0' : 'Accept H0'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">Conclusion</div>
                        <div className="text-sm">{testResults.medianTest.conclusion}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Normality Test Results */}
              {testResults?.normalityResults && testResults.normalityResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Normality Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {testResults.normalityResults.map((result: any, index: number) => (
                        <div key={index} className="border-b pb-2 last:border-b-0">
                          <h4 className="font-medium text-sm mb-2">Dataset {index + 1}</h4>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                            <div>
                              <div className="font-medium text-gray-700">Sample Size</div>
                              <div>{result.sampleSize}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Mean</div>
                              <div>{result.mean.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Std Dev</div>
                              <div>{result.stdev.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">Median</div>
                              <div>{result.median.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">AD Value</div>
                              <div>{result.adValue.toFixed(3)}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">P-Value</div>
                              <div>{result.adPValue.toFixed(4)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          </div>
        </div>
      </CardContent>
    </Card>
  );
}