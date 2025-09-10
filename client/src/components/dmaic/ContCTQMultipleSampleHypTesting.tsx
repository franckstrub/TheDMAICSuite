import React, { useState, useEffect, useRef } from 'react';
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
  const [alternateMean, setAlternateMean] = useState("Different");
  const [alternateVariance, setAlternateVariance] = useState("Different");
  const [alternateMedian, setAlternateMedian] = useState("Different");
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
  
  // Ref for auto-scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Sync array states when numDatasets changes
  useEffect(() => {
    const currentLength = datasets.length;
    
    if (numDatasets !== currentLength) {
      // Resize all arrays to match numDatasets
      setDatasets(prev => {
        const newDatasets = [...prev];
        while (newDatasets.length < numDatasets) {
          newDatasets.push([]);
        }
        return newDatasets.slice(0, numDatasets);
      });
      
      setDatasetDescriptions(prev => {
        const newDescs = [...prev];
        while (newDescs.length < numDatasets) {
          newDescs.push(`Dataset ${newDescs.length + 1}`);
        }
        return newDescs.slice(0, numDatasets);
      });
      
      setFocusedCells(prev => {
        const newFocused = [...prev];
        while (newFocused.length < numDatasets) {
          newFocused.push(-1);
        }
        return newFocused.slice(0, numDatasets);
      });
      
      setEditingCells(prev => {
        const newEditing = [...prev];
        while (newEditing.length < numDatasets) {
          newEditing.push(-1);
        }
        return newEditing.slice(0, numDatasets);
      });
      
      setEditValues(prev => {
        const newEditValues = [...prev];
        while (newEditValues.length < numDatasets) {
          newEditValues.push('');
        }
        return newEditValues.slice(0, numDatasets);
      });
      
      setInputValues(prev => {
        const newInputValues = [...prev];
        while (newInputValues.length < numDatasets) {
          newInputValues.push('');
        }
        return newInputValues.slice(0, numDatasets);
      });
    }
  }, [numDatasets]);

  // Keyboard shortcuts for paste and undo
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+V/Cmd+V for paste - only when this specific component has focus
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && (activeTab === ctqName)) {
        
        // Check if this Multiple Sample component should handle the paste based on global context
        const focusedComponent = (window as any).focusedComponent;
        
        // Check if any of our datasets is focused
        for (let i = 0; i < numDatasets; i++) {
          if (focusedComponent === `multiple-sample-dataset${i}`) {
            event.preventDefault();
            navigator.clipboard.readText().then(clipboardData => {
              if (clipboardData.trim()) {
                handlePasteData(i)({ clipboardData: { getData: () => clipboardData }, preventDefault: () => {} } as any);
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
                description: "Please use Ctrl+V to paste data or manually enter values.",
                variant: "default",
              });
            });
            break;
          }
        }
      }

      // Handle Ctrl+Z/Cmd+Z for undo - works both in and outside input fields and this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && Object.keys(undoStates).length > 0 && (activeTab === ctqName)) {
        event.preventDefault();
        
        // Find the most recent undo state to revert
        const availableUndos = Object.keys(undoStates);
        if (availableUndos.length > 0) {
          const lastDatasetIndex = parseInt(availableUndos[availableUndos.length - 1]);
          undoDatasetChange(lastDatasetIndex);
        } else {
          toast({
            title: "Nothing to Undo",
            description: "No operations available to undo.",
            variant: "default",
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [undoStates, activeTab, ctqName, numDatasets]);

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
    alternateMean: "Different",
    enableVarianceTest: false,
    alternateVariance: "Different",
    enableMedianTest: false,
    alternateMedian: "Different",
    datasets: [[], []], 
    datasetDescriptions: ['Dataset 1', 'Dataset 2'],
  } 
  }));

  // TanStack Query for loading data from database
  const { data: configData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/multiple-sample-hypothesis-config`],
    enabled: !!projectId && !!ctqId,
    retry: false,
  });

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
      significanceLevel: significanceLevel,
      alternateMean: alternateMean,
      enableVarianceTest: currentConfig.enableVarianceTest,
      alternateVariance: alternateVariance,
      enableMedianTest: currentConfig.enableMedianTest,
      alternateMedian: alternateMedian,
      datasets,
      datasetDescriptions,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  // Load configuration data from database when available
  useEffect(() => {
    if (configData && (configData as any).config && !isLoading) {
      setTimeout(() => {
        const config = (configData as any).config;
        
        // Update local state variables from database
        if (config.significanceLevel) {
          setSignificanceLevel(config.significanceLevel);
        }
        if (config.alternateMean) {
          setAlternateMean(config.alternateMean);
        }
        if (config.alternateVariance) {
          setAlternateVariance(config.alternateVariance);
        }
        if (config.alternateMedian) {
          setAlternateMedian(config.alternateMedian);
        }
        
        // Update datasets from database
        if (config.datasets && Array.isArray(config.datasets)) {
          setDatasets(config.datasets);
          setNumDatasets(config.datasets.length);
        }
        
        // Update dataset descriptions from database
        if (config.datasetDescriptions && Array.isArray(config.datasetDescriptions)) {
          setDatasetDescriptions(config.datasetDescriptions);
        }
        
        // Update power analysis state variables from database
        if (config.PowerMultipleSMeanPower) {
          setPowerMultipleSMeanPower(config.PowerMultipleSMeanPower);
        }
        if (config.powerMultipleSMeanAlpha) {
          setPowerMultipleSMeanAlpha(config.powerMultipleSMeanAlpha);
        }
        
        // Update ContCTQMultipleSampleHypTestData from database
        setContCTQMultipleSampleHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            ...prev[ctqId],
            enableMeanTest: config.enableMeanTest ?? false,
            enableVarianceTest: config.enableVarianceTest ?? false,
            enableMedianTest: config.enableMedianTest ?? false,
            enableMeanMultipleSPower: config.enableMeanMultipleSPower ?? false,
            powerPower: config.powerPower || "0.90",
            powerAlpha: config.powerAlpha || "0.05",
            powerNbrDistri: config.powerNbrDistri || 2,
            powerDifference: config.powerDifference || 0,
            powerStdev: config.powerStdev || 0,
            significanceLevel: config.significanceLevel || "0.05",
            alternateMean: config.alternateMean || "Different",
            alternateVariance: config.alternateVariance || "Different",
            alternateMedian: config.alternateMedian || "Different",
            datasets: config.datasets || [[], []],
            datasetDescriptions: config.datasetDescriptions || ['Dataset 1', 'Dataset 2'],
          }
        }));
        
        // Run tests after loading config from database
        setTimeout(() => {
          const hasData = config.datasets && config.datasets.some((dataset: any) => dataset.length > 0);
          const hasEnabledTests = config.enableMeanTest || config.enableVarianceTest || config.enableMedianTest;
          
          if (hasData && hasEnabledTests) {
            console.log("Running handleRunTest after loading config from database");
            handleRunTest(
              config.enableMeanTest ?? false,
              config.enableVarianceTest ?? false,
              config.enableMedianTest ?? false,
              config.datasets || [[], []],
              parseFloat(config.significanceLevel || "0.05"),
              config.alternateMean || "Different",
              config.alternateVariance || "Different",
              config.alternateMedian || "Different"
            );
          }
        }, 100);
      }, 0);
    }
  }, [configData, ctqId, isLoading]);

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
    const newNumDatasets = numDatasets + 1;
    
    setDatasets(prev => [...prev, []]);
    setDatasetDescriptions(prev => [...prev, `Dataset ${prev.length + 1}`]);
    setFocusedCells(prev => [...prev, -1]);
    setEditingCells(prev => [...prev, -1]);
    setEditValues(prev => [...prev, '']);
    setInputValues(prev => [...prev, '']);
    setNumDatasets(prev => prev + 1);
    
    // Test: Show toast for any dataset addition to verify toast is working
    toast({
      title: `Dataset ${newNumDatasets} Added`,
      description: `You now have ${newNumDatasets} datasets`,
      variant: newNumDatasets === 10 ? "destructive" : "default",
    });
    
    // Show special warning when reaching the 10 dataset limit
    if (newNumDatasets === 10) {
      setTimeout(() => {
        toast({
          title: "Dataset Limit Reached",
          description: "You have reached the maximum limit of 10 datasets for multiple-sample hypothesis testing.",
          variant: "destructive",
        });
      }, 1000);
    }
  };

  const removeDataset = (index: number) => {
    if (numDatasets <= 2) return; // Don't allow removing if only 2 datasets remain
    
    setDatasets(prev => prev.filter((_, i) => i !== index));
    setDatasetDescriptions(prev => {
      const filteredDescriptions = prev.filter((_, i) => i !== index);
      // Re-index descriptions to match dataset positions
      return filteredDescriptions.map((_, i) => `Dataset ${i + 1}`);
    });
    setFocusedCells(prev => prev.filter((_, i) => i !== index));
    setEditingCells(prev => prev.filter((_, i) => i !== index));
    setEditValues(prev => prev.filter((_, i) => i !== index));
    setInputValues(prev => prev.filter((_, i) => i !== index));
    setNumDatasets(prev => prev - 1);
  };

  // Handle paste from Excel functionality for each dataset
  const handlePasteData = (datasetIndex: number) => (event: React.ClipboardEvent) => {
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
            indexNumber: (datasets[datasetIndex]?.length || 0) + index + 1,
            dataValue: numericValue
          });
        }
      });
      
      if (newDataPoints.length > 0) {
        // Save current state before making changes
        setUndoStates(prev => ({
          ...prev,
          [datasetIndex]: datasets[datasetIndex] || []
        }));
        
        setDatasets(prev => {
          const newDatasets = [...prev];
          if (!newDatasets[datasetIndex]) {
            newDatasets[datasetIndex] = [];
          }
          newDatasets[datasetIndex] = [...newDatasets[datasetIndex], ...newDataPoints];
          return newDatasets;
        });
        
        setPasteInput("");
        toast({
          title: `Data Imported to Dataset ${datasetIndex + 1}`,
          description: `Successfully imported ${newDataPoints.length} data points from Excel.`,
        });
        
        // Auto-scroll to show the newly added rows after a short delay
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        });
      }
    }
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
    if (!datasets || !Array.isArray(datasets)) {
      return [];
    }
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

  const handleRunTest = (
    enableMeanTest: boolean,
    enableVarianceTest: boolean,
    enableMedianTest: boolean,
    datasetsParam: DataPoint[][],
    significance: number,
    HaMean: string,
    HaVariance: string,
    HaMedian: string
  ) => {
    console.log("handleRunTest called with params:", { enableMeanTest, enableVarianceTest, enableMedianTest, significance });
    
    // Calculate normality tests
    const normalityResults = calculateNormalityTests(datasetsParam);

    // Perform hypothesis tests if enabled
    const meanTest = enableMeanTest 
      ? performMultipleSampleMeanTest(datasetsParam, significance, HaMean)
      : { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: 'Test not enabled' };

    const varianceTest = enableVarianceTest 
      ? performMultipleSampleVarianceTest(datasetsParam, significance, HaVariance)
      : { testStatistic: 0, pValue: 0, criticalValue: 0, conclusion: 'Test not enabled' };

    const medianTest = enableMedianTest 
      ? performMultipleSampleMedianTest(datasetsParam, significance, HaMedian)
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

  // Synchronize local state with main state
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (currentConfig) {
      if (currentConfig.significanceLevel && currentConfig.significanceLevel !== significanceLevel) {
        setSignificanceLevel(currentConfig.significanceLevel);
      }
      if (currentConfig.alternateMean && currentConfig.alternateMean !== alternateMean) {
        setAlternateMean(currentConfig.alternateMean);
      }
      if (currentConfig.alternateVariance && currentConfig.alternateVariance !== alternateVariance) {
        setAlternateVariance(currentConfig.alternateVariance);
      }
      if (currentConfig.alternateMedian && currentConfig.alternateMedian !== alternateMedian) {
        setAlternateMedian(currentConfig.alternateMedian);
      }
    }
  }, [ContCTQMultipleSampleHypTestData[ctqId]?.significanceLevel, ContCTQMultipleSampleHypTestData[ctqId]?.alternateMean, ContCTQMultipleSampleHypTestData[ctqId]?.alternateVariance, ContCTQMultipleSampleHypTestData[ctqId]?.alternateMedian]);

  // useEffect to trigger test calculations when significance or alternative hypotheses change
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig || datasets.length === 0 || !datasets.some(dataset => dataset.length > 0)) return;
    //if (!currentConfig || datasets[0].length < 2 || datasets[1].length < 2 ) return;

    const hasEnabledTests = currentConfig.enableMeanTest || currentConfig.enableVarianceTest || currentConfig.enableMedianTest;
    if (!hasEnabledTests) return;

    console.log("Running handleRunTest from useEffect - significance level:", significanceLevel);
    handleRunTest(
      currentConfig.enableMeanTest ?? false,
      currentConfig.enableVarianceTest ?? false,
      currentConfig.enableMedianTest ?? false,
      datasets,
      parseFloat(significanceLevel),
      alternateMean,
      alternateVariance,
      alternateMedian
    );
    //setTestResults(testResults);
  }, [
    datasets,
    significanceLevel,
    alternateMean,
    alternateVariance,
    alternateMedian,
    ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest,
    ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest,
    ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest,
  ]);

  // useEffect to run handleRunTest on component mount/rendering
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
      console.log("Running handleRunTest on component render/mount");
      handleRunTest(
        currentConfig.enableMeanTest ?? false,
        currentConfig.enableVarianceTest ?? false,
        currentConfig.enableMedianTest ?? false,
        datasets,
        parseFloat(significanceLevel),
        alternateMean,
        alternateVariance,
        alternateMedian
      );
    }
  }, []); // Empty dependency array means this runs only on mount

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
                 
        {((ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest) || (ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest) || (ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest)) && (  
        <div>
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
            <Label htmlFor="alternativeHa">Alternative Ha (applies to all tests)</Label>
            <Select value="Different" onValueChange={(value) => {
              // Always set all three alternatives to the selected value
              setAlternateMean(value);
              setAlternateVariance(value);
              setAlternateMedian(value);
            }}>
            <SelectTrigger id="alternativeHa">
                <SelectValue placeholder="Select alternative" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
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
                        try {
                          const clipboardData = await navigator.clipboard.readText();
                          if (clipboardData.trim()) {
                            handlePasteData(datasetIndex)({ clipboardData: { getData: () => clipboardData }, preventDefault: () => {} } as any);
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
                    >
                      📋 Paste data from Excel
                    </Button>
                  </div>

                  {/* Excel Import Instructions */}
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                    <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                    <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                    <div className="text-blue-600 text-xs mt-1">
                      Ctrl+V (Cmd+V on Mac) to paste <br></br>
                      Ctrl+Z (Cmd+Z on Mac) to undo <br></br>
                      Click any cell in the table to paste
                    </div>
                  </div>


                  {/* Data Table */}
                  <div className="border rounded-md max-h-[300px] overflow-y-auto bg-white">
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
                      <tbody className="divide-y divide-gray-200">
                        {!datasets[datasetIndex] || datasets[datasetIndex].length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center text-gray-500 py-4">
                              <div
                                className="cursor-pointer hover:bg-blue-50 rounded p-2"
                                onClick={() => {
                                  document.getElementById(`add-data-input-${datasetIndex}`)?.focus();
                                  (window as any).focusedComponent = `multiple-sample-dataset${datasetIndex}`;
                                }}
                                onPaste={handlePasteData(datasetIndex)}
                                tabIndex={0}
                                title="Click to focus input or paste data here"
                              >
                                No data - click to add values
                              </div>
                            </td>
                          </tr>
                        ) : (
                          datasets[datasetIndex]?.map((point, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs text-gray-900">
                                {point.indexNumber}
                              </td>
                              <td 
                                className="px-4 py-2 text-xs text-gray-900 cursor-pointer"
                                onClick={() => {
                                  const newFocused = [...focusedCells];
                                  newFocused[datasetIndex] = index;
                                  setFocusedCells(newFocused);
                                  (window as any).focusedComponent = `multiple-sample-dataset${datasetIndex}`;
                                }}
                                onDoubleClick={() => {
                                  const newEditingCells = [...editingCells];
                                  newEditingCells[datasetIndex] = index;
                                  setEditingCells(newEditingCells);
                                  const newEditValues = [...editValues];
                                  newEditValues[datasetIndex] = datasets[datasetIndex][index].dataValue.toString();
                                  setEditValues(newEditValues);
                                }}
                                style={{
                                  backgroundColor: focusedCells[datasetIndex] === index ? '#dbeafe' : 'transparent'
                                }}
                                title="Click to focus for paste | Double-click to edit value | Use Ctrl+V to paste from focused position"
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
                              <td className="px-4 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDataPoint(datasetIndex, index)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  title="Delete this data point"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Add Data Row - Integrated within the table */}
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {(datasets[datasetIndex]?.length || 0) + 1}
                          </td>
                          <td className="px-4 py-2">
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
                              onFocus={() => {
                                const newFocused = [...focusedCells];
                                newFocused[datasetIndex] = datasets[datasetIndex]?.length || 0;
                                setFocusedCells(newFocused);
                                (window as any).focusedComponent = `multiple-sample-dataset${datasetIndex}`;
                              }}
                              onPaste={(e) => {
                                e.preventDefault();
                                const pastedData = e.clipboardData.getData('text/plain');
                                const lines = pastedData.trim().split('\\n');

                                if (lines.length > 1) {
                                  // Multiple values - use the general paste handler
                                  handlePasteData(datasetIndex)(e);
                                } else {
                                  // Single value - set it in the input field
                                  const value = lines[0]?.trim();
                                  if (value) {
                                    const newInputValues = [...inputValues];
                                    newInputValues[datasetIndex] = value;
                                    setInputValues(newInputValues);
                                  }
                                }
                              }}
                              placeholder="Enter numeric value"
                              className={`w-full ${focusedCells[datasetIndex] === (datasets[datasetIndex]?.length || 0) ? 'ring-2 ring-blue-500' : ''}`}
                              step="any"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              onClick={() => addDataPoint(datasetIndex, inputValues[datasetIndex] || "")}
                              size="sm"
                              disabled={!inputValues[datasetIndex]?.trim()}
                            >
                              Add
                            </Button>
                          </td>
                        </tr>
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {/* Add Dataset Button and Undo All Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {/* Add Dataset Button */}
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={addDataset}
                  disabled={numDatasets >= 10}
                  className="border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                  title={numDatasets >= 10 ? "Maximum limit of 10 datasets reached" : "Add a new dataset"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dataset
                </Button>
              </div>
              
              {/* Undo All Button - Always visible but disabled when needed */}
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
                  // After undoing all changes, disable the button
                  setShowUndoButton(false);
                }}
                disabled={!showUndoButton}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300 disabled:text-gray-400 disabled:border-gray-300 disabled:hover:bg-transparent"
              >
                <Undo className="h-4 w-4 mr-1" />
                Undo All
              </Button>
              </div>            
  
            <Button 
                className="w-full" 
                onClick={saveConfiguration} 
                disabled={saveConfigMutation.isPending}
                //variant="outline"
              >
                {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
            </Button>
          </div>          
          </div>
          
          {/* Results for Multiple Sample Hypothesis Test of Means, Variances and Medians */}
          {testResults && (
            <div className="space-y-6 mt-8 border border-gray-200 rounded-md bg-gray-50">
              {/* Normality Test Results */}
              {testResults?.normalityResults && testResults.normalityResults.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
              {testResults.normalityResults.map((result: any, index: number) => (
                <div key={index} className="flex-shrink-0 space-y-2 p-2" style={{ minWidth: '404px' }}>
                {testResults?.normalityResults[index] && testResults?.normalityResults[index].sampleSize >= 2 && (
                <Card className="p-2">
                  <CardTitle className="text-lg">Normality test results:</CardTitle>    
                  <Badge
                    variant="default"
                    className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
                    title={
                      testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel)
                        ? `Dataset ${index+1} distribution follows normal distribution (P-Value ≥ ${significanceLevel})`
                        : `Dataset ${index+1} distribution does not follow normal distribution (P-Value < ${significanceLevel})`
                    }
                  >
                    {testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel)
                      ? `Dataset ${index+1} follows normal distribution`
                      : `Dataset ${index+1} does not follow normal distribution`}
                  </Badge>
                  <div className="text-gray-600 font-medium">Dataset {index+1} description:&nbsp;
                  {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]}</div>
                  <div className="text-gray-600 font-medium">Sample size:&nbsp;
                  {testResults.normalityResults[index].sampleSize}</div>
                  <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                  {parseFloat(significanceLevel)*100}%</div>
                  <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
                  {testResults.normalityResults[index].adValue.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
                  {testResults.normalityResults[index].adPValue.toFixed(3)}</div> 
                  </Card>
                )}
                </div>
              ))}              
              </div>
              )}              

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

            </div>
          )}
          
          </div>
        </div>
        )}      
        </div>
      </CardContent>
    </Card>
  );
}