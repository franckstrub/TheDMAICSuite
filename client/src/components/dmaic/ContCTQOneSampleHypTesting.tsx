import React, { useState, useEffect } from 'react';
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
  inverseNormCDF
} from "@/lib/statisticsUtils";
import BoxPlotWith1SMeanTest from './BoxPlotWith1SMeanTest';

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
  targetVariance?: number;
  targetMedian?: number;
  dataPoints?: DataPoint[];
  datasetdescription?: string;
}

interface ContCTQOneSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface RunTestResults {
  sampleSize: number;
  meanValue: number;
  stdev: number;
  median: number;
  SEmean: number;
  SEvariance: number;
  SEmedian: number;
  ADvalue: number;
  ADp_Value: number;
  tStatistic: number;
  tCriteria: number;
  tp_Value: number;
  meanCI_minus: number;
  meanCI_plus: number;
  varStatistic: number;
  varCriteria: number;
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
  tStatistic: number;
  tCriteria: number;
  tp_Value: number;
  meanCI_minus: number;
  meanCI_plus: number;
}

export function ContCTQOneSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQOneSampleHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternativemean, setAlternativemean] = useState("Less than");
  const [alternativevariance, setAlternativevariance] = useState("Less than");
  const [alternativemedian, setAlternativemedian] = useState("Less than");
  const [testResult, setTestResult] = useState({
    tStatistic: -3.45,
    pValue: 0.002,
    conclusion: "Reject null hypothesis",
    explanation: "There is a statistically significant difference between the before and after measurements."
  });

const [testResults, setTestResults] = useState<RunTestResults>({
  sampleSize: 0,
  meanValue: 0,
  stdev: 0,
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

  // Initialize ContCTQOneSampleHypTestData with default values
  const [ContCTQOneSampleHypTestData, setContCTQOneSampleHypTestData] = useState<{ [ctqId: number]: ContCTQOneSampleHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "One Sample Hyp-Test",
      enableMeanTest: true,
      enableVarianceTest: false,
      enableMedianTest: false,
      targetMean: 0,
      targetVariance: 0,
      targetMedian: 0,
      datasetdescription: "",
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
    if (configData?.config && !isLoading) {
      setTimeout(() => {
        const config = configData.config;
        
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
        
        // Update ContCTQOneSampleHypTestData from database
        setContCTQOneSampleHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            ...prev[ctqId],
            enableMeanTest: config.enableMeanTest ?? true,
            enableVarianceTest: config.enableVarianceTest ?? false,
            enableMedianTest: config.enableMedianTest ?? false,
            targetMean: config.targetMean || 0,
            targetVariance: config.targetVariance || 0,
            targetMedian: config.targetMedian || 0,
            datasetdescription: config.datasetDescription || "",
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
      targetVariance: currentConfig.targetVariance,
      targetMedian: currentConfig.targetMedian,
      significanceLevel,
      alternativemean,
      alternativevariance,
      alternativemedian,
      dataPoints,
      datasetDescription: currentConfig.datasetdescription || "",
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
  targetvariance: number,
  targetmedian: number,
): RunTestResults => {

  // Initialize with default values
  let sampleSize: number = 0;
  let meanValue: number = 0;
  let stdev: number = 0;
  let median: number = 0;
  let SEmean: number = 0;
  let SEvariance: number = 0;
  let SEmedian: number = 0;
  let ADvalue: number = 0;
  let ADp_Value: number = 0;
  let tStatistic: number = 0;
  let tCriteria: number = 0;
  let tp_Value: number = 0;
  let meanCI_minus: number = 0;
  let meanCI_plus: number = 0;
  let varStatistic: number = 0;
  let varCriteria: number = 0;
  let varp_Value: number = 0;
  let varianceCI_minus: number = 0;
  let varianceCI_plus: number = 0;
  let medianStatistic: number = 0;
  let medianCriteria: number = 0;
  let medianp_Value: number = 0;
  let medianCI_minus: number = 0;
  let medianCI_plus: number = 0;

  if (!dataset || dataset.length === 0) {
    toast({
      title: "Test Run Unsuccessfully",
      description: "No data set. The hypothesis test has not been executed.",
    });
    return {
      sampleSize, meanValue, stdev, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
      tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
      varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
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

  if (enableMeanTest) {
    // Validate and type cast the string to the expected union type
    const validAlternatives = ["Less than", "Greater than", "Different"] as const;
    if (!validAlternatives.includes(HaMean as any)) {
      toast({
        title: "Invalid Alternative Hypothesis",
        description: "Invalid alternative hypothesis for meanValue test.",
        variant: "destructive",
      });
      return {
        sampleSize,meanValue, stdev, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
        tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
        varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
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
    SEmean = meanTestResult.SEmean;
    tStatistic = meanTestResult.tStatistic;
    tCriteria = meanTestResult.tCriteria;
    tp_Value = meanTestResult.tp_Value;
    meanCI_minus = meanTestResult.meanCI_minus;
    meanCI_plus = meanTestResult.meanCI_plus;
    
    // Update state as well
    setOnesampleMeanTestresult(meanTestResult);
  }

  toast({
    title: "Test Run Successfully",
    description: "The hypothesis test has been executed.",
  });

  return {
    sampleSize, meanValue, stdev, median, SEmean, SEvariance, SEmedian, ADvalue, ADp_Value,
    tStatistic, tCriteria, tp_Value, meanCI_minus, meanCI_plus,
    varStatistic, varCriteria, varp_Value, varianceCI_minus, varianceCI_plus,
    medianStatistic, medianCriteria, medianp_Value, medianCI_minus, medianCI_plus
  };
};

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
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          newDataPoints.push({
            indexNumber: dataPoints.length + index + 1,
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

  // Handle paste specifically for editing cells - handles multiple values starting from clicked cell
  const handleCellPaste = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state before making changes
        setUndoState(JSON.parse(JSON.stringify(dataPoints)));
        
        setDataPoints(prev => {
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
              // Create new data point
              updatedPoints.push({
                indexNumber: updatedPoints.length + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted",
          description: `Successfully pasted ${newValues.length} values starting from row ${index + 1}.`,
        });
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

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+V/Cmd+V for paste - when this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && activeTab === ctqName) {
        event.preventDefault();
        
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
            
            handlePasteData(syntheticEvent);
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
  }, [undoState, activeTab, ctqName]);

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
                  Variance
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

          <div className="flex flex-wrap items-end"> {/* Changed from space-y-3 to flexbox */}
            {ContCTQOneSampleHypTestData[ctqId]?.enableMeanTest && (
                <div className="w-1/3 min-w-[100px] pr-4"> {/* Added flex-1 and min-width for responsiveness */}
                    <Label>Target value for mean:</Label>
                    <Input
                        type="number"
                        value={ContCTQOneSampleHypTestData[ctqId]?.targetMean || 0}
                        onChange={(e) => updateContCTQOneSampleHypTestDataField(
                            ctqId, 
                            "targetMean", 
                            parseFloat(e.target.value) || 0
                        )}
                        placeholder="Enter target mean"
                        className="mt-1"
                    />
                </div>
            )}
            {ContCTQOneSampleHypTestData[ctqId]?.enableVarianceTest && (
                <div className="w-1/3 min-w-[100px] pr-4"> {/* Added flex-1 and min-width */}
                    <Label>Target value for variance:</Label>
                    <Input
                        type="number"
                        min="-1"
                        value={ContCTQOneSampleHypTestData[ctqId]?.targetVariance || 0}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (isNaN(value)) {
                                // If input is empty or invalid number, update to 0 or undefined based on your state logic
                                updateContCTQOneSampleHypTestDataField(ctqId, "targetVariance", 0); 
                            } else if (value < 0) {
                                // Display toast message for negative input
                                toast({
                                title: "Target Variance",
                                description: `Variance cannot be negative. Please enter a non-negative value.`
                                });
                                // Optionally, keep the previous valid value or set to 0
                                updateContCTQOneSampleHypTestDataField(ctqId, "targetVariance", 0); // Reset to 0
                            } else {
                                // Valid non-negative number
                                updateContCTQOneSampleHypTestDataField(ctqId, "targetVariance", value);
                            }
                        }}
                        placeholder="Enter target variance"
                        className="mt-1"
                    />
                </div>
            )}
            {ContCTQOneSampleHypTestData[ctqId]?.enableMedianTest && (
                <div className="w-1/3 min-w-[100px] pr-4"> {/* Added flex-1 and min-width */}
                    <Label>Target value for median:</Label>
                    <Input
                        type="number"
                        value={ContCTQOneSampleHypTestData[ctqId]?.targetMedian || 0}
                        onChange={(e) => updateContCTQOneSampleHypTestDataField(
                            ctqId, 
                            "targetMedian", 
                            parseFloat(e.target.value) || 0
                        )}
                        placeholder="Enter target median"
                        className="mt-1"
                    />
                </div>
            )}
          </div>            

          <div className="grid grid-cols-3 pr-4 gap-4">
            
            <div>
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
            <div>
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
            <div>
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
            <Label>Characterize your tested dataset:</Label>
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
                {/* Undo and Paste from Excel Section */}
                <div className="flex gap-2 mt-2 mb-2">
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
                        handlePasteData(syntheticEvent as any);
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
                Enter data values and click Add, then Save Data to persist to database
            </p>

            {/* Data Table */}
            <div className="border rounded-md max-h-[500px] overflow-y-auto">
                <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Index
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Value
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                onClick={() => startEditing(index, point.dataValue)}
                                onPaste={(e) => handleCellPaste(e, index)}
                                tabIndex={0}
                                title="Click to edit this value"
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
                            // Single value - set it in the input field
                            const value = lines[0]?.trim();
                            if (value) {
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
                <div>• <strong>Focus a cell</strong> by clicking on any measurement input field</div>
                <div>• <strong>Paste data</strong> using Ctrl+V (or Cmd+V on Mac) - data will start from the focused cell</div>
                <div>• <strong>Undo changes</strong> using Ctrl+Z (or Cmd+Z on Mac) after pasting</div>
                <div>• <strong>Data will automatically create new rows</strong> if needed</div>
            </div>
            
            {dataPoints.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                <strong>Sample size:</strong> {dataPoints.length} data points
                </div>
            )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={saveConfiguration} 
              disabled={saveConfigMutation.isPending}
              variant="outline"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
            </Button>

            <Button
                className="w-full"
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
                        ContCTQOneSampleHypTestData[ctqId]?.targetVariance ?? 0,
                        ContCTQOneSampleHypTestData[ctqId]?.targetMedian ?? 0
                    );
                    setTestResults(results); // Store the returned results in your state
                    setShowBoxPlot(true); // Show the BoxPlot component after running the test
                }}
            >
                Run Test
            </Button>

          </div>

          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h4 className="font-medium text-sm mb-2">Results</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Badge
                variant="default"
                className={`font-medium text-xs text-center justify-center ${testResults.ADp_Value >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
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
              <div> </div>
              <div className="text-gray-600">Sample size:</div>
              <div className="font-medium">{testResults.sampleSize}</div>
              <div className="text-gray-600">Normality test (Anderson Darling) AD value:</div>
              <div className="font-medium">{testResults.ADvalue.toFixed(3)}</div>
              <div className="text-gray-600">Normality test (Anderson Darling) p_Value:</div>
              <div className="font-medium">{testResults.ADp_Value.toFixed(3)}</div>
              <div className="text-gray-600">Mean of sample:</div>
              <div className="font-medium">{testResults.meanValue.toFixed(3)}</div>
              <div className="text-gray-600">Target:</div>
              <div className="font-medium">{ContCTQOneSampleHypTestData[ctqId]?.targetMean}</div>
              <Badge
                variant="default"
                className={`font-medium text-xs text-center justify-center ${testResults.tp_Value < parseFloat(significanceLevel) ? "text-white bg-blue-600 " : "text-white bg-blue-300"}`}
                title={
                  testResults.tp_Value < parseFloat(significanceLevel)
                    ? `Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                    : `Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                }
              >
                <div>{alternativemean==='less than' ? "Ha: Mean < "
                : ( alternativemean==='greater than' ? "Ha: Mean >"
                  :"Ha: Mean ≠ " )} Target<br></br>
                {testResults.tp_Value < parseFloat(significanceLevel)
                  ? `Result => Reject H0. Accept Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`
                  : `Result => Accept H0. Reject Ha (P-Value ${testResults.tp_Value.toFixed(4)} < ${significanceLevel})`}
                </div>
              </Badge>
              <div> </div>
              <div className="text-gray-600">SE Mean of sample:</div>
              <div className="font-medium">{testResults.SEmean.toFixed(3)}</div>
              <div className="text-gray-600">one-sample t-statistic:</div>
              <div className="font-medium">{testResults.tStatistic.toFixed(3)}</div>
              <div className="text-gray-600">one-sample t-criteria at significance:</div>
              <div className="font-medium">{testResults.tCriteria.toFixed(3)}</div>
              <div className="text-gray-600">t test p-value:</div>
              <div className="font-medium text-green-600">{testResults.tp_Value.toFixed(3)}</div>
              <div className="text-gray-600">Lower CI:</div>
              <div className="font-medium text-green-600">{testResults.meanCI_minus.toFixed(3)}</div>
              <div className="text-gray-600">Upper CI:</div>
              <div className="font-medium text-green-600">{testResults.meanCI_plus.toFixed(3)}</div>
            
            </div>
          </div>

          {/* BoxPlot visualization when showBoxPlot is true */}
          {showBoxPlot && dataPoints.length > 0 && (
            <div className="mt-6">
              <BoxPlotWith1SMeanTest
                data={dataPoints.map(point => point.dataValue)}
                ctqName={ctqName}
                mean={testResults.meanValue}
                Ha={Ha(alternativemean)}
                h0Value={ContCTQOneSampleHypTestData[ctqId]?.targetMean ?? 0}
                confidenceInterval={[testResults.meanCI_minus, testResults.meanCI_plus]}
                title={`1-Sample T-Test Mean vs H0 (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.tp_Value}
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