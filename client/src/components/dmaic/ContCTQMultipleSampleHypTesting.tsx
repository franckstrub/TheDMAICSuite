import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Undo, Plus } from "lucide-react";
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
          
          {/* Results for Multiple Sample Hypothesis Testof Means, Variances and Medians */}
          
          </div>
        </div>
      </CardContent>
    </Card>
  );
}