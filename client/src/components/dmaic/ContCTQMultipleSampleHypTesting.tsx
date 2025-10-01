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
  calculateMedian,
  calculateMultipleSMeanSampleSize,
  performNormalityTest,    
  } from "@/lib/statisticsUtils";
import {multipleSMeanTest} from "./multipleSMeanTest";
import {multipleSVarianceTest} from "./multipleSVarianceTest";
import {multipleSMedianTest} from "./multipleSMedianTest";
import { stdev } from 'jstat';
import BoxPlotWithNSMeanTest from './BoxPlotWithNSMeanTest.tsx';
import ConfidenceIntervalsNSMean from './ConfidenceIntervalsNSMean.tsx';
import ConfidenceIntervalsNSVariance from './ConfidenceIntervalsNSVariance';
import BoxPlotWithNSMedianTest from './BoxPlotWithNSMedianTest';
import ConfidenceIntervalsNSMedian from './ConfidenceIntervalsNSMedian.tsx';

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
  factorOfClassification: string;
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
  anovagroupMeans: number[];
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
  anovaEqualVariances: boolean;
  studentTestdone: boolean;
  studentStatistic: number;
  studentpooledSE: number;
  studentDegreesOfFreedom: number;
  studenttCriteria: number | {lower: number; upper: number};
  studentmeanCI: Array<{ lower: number; upper: number }>;
  studentdiffCI_minus: number;
  studentdiffCI_plus: number;
  studentpValue: number;
  studentVarEquality: boolean;
  studentfStat: number;
  studentfTestpValue: number;
  };
  
  varianceTest: {
    testName: string;
    testStatistic: number;
    pValue: number;
    criticalValue: number | {lower: number; upper: number};
    confidenceIntervals: Array<{ // confidence intervals for each group variance 
      groupIndex: number; 
      variance: number;
      lower: number;
      upper: number;
    }>;
    df1?: number;
    df2?: number;
  };
  
  medianTest: {
    testName: string;
    testStatistic: number;
    pValue: number;
    criticalValue: number;
    confidenceIntervals?: Array<{ 
      groupIndex: number;
      median: number;
      lower: number;
      upper: number;
    }>;
    df1?: number;
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
  const [factorOfClassification, setFactorOfClassification] = useState("Miscellaneous");
  
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
    meanTest: { anovagroupMeans: [],
              anovaPooledStdev: 0,
              anovaFStatistic: 0,
              anovagrandMean: 0,
              anovadfBetween: 0,
              anovadfWithin: 0,
              anovassBetween: 0,
              anovassWithin: 0,
              anovamsBetween: 0,
              anovamsWithin: 0,
              anovarSquared: 0,
              anovarSquaredAdj: 0,
              anovarSquaredPred: 0,
              anovapValue: 0,
              anovaconfidenceIntervals: [],
              anovaEqualVariances: true,
              studentTestdone: false,
              studentStatistic: 0,
              studentpooledSE: 0,
              studentDegreesOfFreedom: 0,
              studenttCriteria: 0,
              studentmeanCI: [],
              studentdiffCI_minus: 0,
              studentdiffCI_plus: 0,
              studentpValue: 0,
              studentVarEquality: true,
              studentfStat: 0,
              studentfTestpValue: 0,},
    varianceTest: { testName: "Fisher", testStatistic: 0, pValue: 0, criticalValue: 0, confidenceIntervals: [], df1: 0, df2: 0 },
    medianTest: { testName: "Mann-Whitney", testStatistic: 0, pValue: 0, criticalValue: 0, confidenceIntervals: [], df1: 0, }
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
    factorOfClassification: "Miscellaneous",
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
      factorOfClassification: factorOfClassification,
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
        if (config.factorOfClassification) {
          setFactorOfClassification(config.factorOfClassification);
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
            factorOfClassification: config.factorOfClassification || "Miscellaneous",
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
              config.alternateMedian || "Different",
              config.factorOfClassification || "Miscellaneous",
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
      
      // Check if this is multi-column data (detect tabs in any line)
      const hasMultipleColumns = lines.some(line => line.includes('\t'));
      
      if (hasMultipleColumns) {
        // Delegate to multi-column paste handler
        handleFocusedCellPaste(datasetIndex, pastedData);
        return;
      }
      
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

  // Handle focused cell paste for multi-column capability
  const handleFocusedCellPaste = (datasetIndex: number, pasteData: string) => {
    // If no cell is focused, check if this dataset is the active one (via global focus indicator)
    const focusedComponent = (window as any).focusedComponent;
    const isThisDatasetActive = focusedComponent === `multiple-sample-dataset${datasetIndex}`;
    
    if (focusedCells[datasetIndex] === -1 && !isThisDatasetActive) {
      toast({
        title: "No Cell Focused",
        description: "Please click on a data cell first to set the starting position for paste.",
        variant: "destructive",
      });
      return;
    }
    
    // If dataset is empty or no specific cell is focused, start from position 0
    const startPosition = focusedCells[datasetIndex] === -1 ? 0 : focusedCells[datasetIndex];

    // Parse the pasted data with robust Excel format support (tab-separated and multi-line)
    const rows = pasteData.trim().split('\n');
    
    // First pass: determine number of columns
    let maxColumns = 0;
    const parsedRows: string[][] = [];
    
    rows.forEach((row, rowIdx) => {
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
      
      maxColumns = Math.max(maxColumns, cells.length);
      parsedRows.push(cells);
    });
    
    // Create array for ALL columns in clipboard (not limited by current numDatasets)
    const datasetValues: number[][] = Array.from({ length: maxColumns }, () => []);
    
    // Second pass: process values into columns
    parsedRows.forEach(cells => {
      cells.forEach((cell, colIndex) => {
        const trimmedCell = cell.trim();
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
            datasetValues[colIndex].push(numericValue);
          }
        }
      });
    });

    // Check if we have any valid data
    const totalValues = datasetValues.reduce((sum, arr) => sum + arr.length, 0);
    if (totalValues === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid numeric data found in clipboard.",
        variant: "destructive",
      });
      return;
    }

    // Save current state for undo for all affected datasets
    const affectedDatasets = datasetValues
      .map((values, idx) => ({ idx, values }))
      .filter(({ values }) => values.length > 0);
    
    const newUndoStates = { ...undoStates };
    affectedDatasets.forEach(({ idx }) => {
      newUndoStates[idx] = JSON.parse(JSON.stringify(datasets[idx] || []));
    });
    setUndoStates(newUndoStates);

    // Use focused cell as starting position for all datasets
    const startIndex = startPosition;
    
    // Extend datasets array if clipboard has more columns than current datasets
    const newDatasets = [...datasets];
    while (newDatasets.length < maxColumns) {
      newDatasets.push([]);
    }
    
    // Update all affected datasets - each maintains its own length from clipboard
    affectedDatasets.forEach(({ idx, values }) => {
      const updatedPoints = [...(newDatasets[idx] || [])];
      const endIndex = startIndex + values.length - 1;
      
      // Extend array if necessary for this specific dataset
      while (updatedPoints.length <= endIndex) {
        updatedPoints.push({
          indexNumber: updatedPoints.length + 1,
          dataValue: 0
        });
      }

      // Paste values - respecting the specific length of this column
      values.forEach((value, i) => {
        const targetIndex = startIndex + i;
        updatedPoints[targetIndex] = {
          indexNumber: targetIndex + 1,
          dataValue: value
        };
      });

      newDatasets[idx] = updatedPoints;
    });

    setDatasets(newDatasets);
    
    // Update numDatasets if we added new datasets
    if (maxColumns > numDatasets) {
      setNumDatasets(maxColumns);
      
      // Extend other arrays to match
      setDatasetDescriptions(prev => {
        const newDescs = [...prev];
        while (newDescs.length < maxColumns) {
          newDescs.push(`Dataset ${newDescs.length + 1}`);
        }
        return newDescs;
      });
      
      setFocusedCells(prev => {
        const newFocused = [...prev];
        while (newFocused.length < maxColumns) {
          newFocused.push(-1);
        }
        return newFocused;
      });
      
      setEditingCells(prev => {
        const newEditing = [...prev];
        while (newEditing.length < maxColumns) {
          newEditing.push(-1);
        }
        return newEditing;
      });
      
      setEditValues(prev => {
        const newEdit = [...prev];
        while (newEdit.length < maxColumns) {
          newEdit.push('');
        }
        return newEdit;
      });
      
      setInputValues(prev => {
        const newInputs = [...prev];
        while (newInputs.length < maxColumns) {
          newInputs.push('');
        }
        return newInputs;
      });
    }
    
    // Show appropriate toast message
    if (affectedDatasets.length === 1) {
      toast({
        title: `Data Pasted to Dataset ${affectedDatasets[0].idx + 1}`,
        description: `Pasted ${affectedDatasets[0].values.length} values starting from position ${startIndex + 1}.`,
      });
    } else {
      const datasetNames = affectedDatasets.map(({ idx }) => idx + 1).join(', ');
      const message = affectedDatasets
        .map(({ idx, values }) => `Dataset ${idx + 1}: ${values.length} values`)
        .join(', ');
      toast({
        title: "Data Pasted to Multiple Datasets",
        description: `Pasted to ${affectedDatasets.length} datasets. ${message} starting from position ${startIndex + 1}.`,
      });
    }
  };

  // Handle paste specifically for editing cells
  const handleCellPaste = (datasetIndex: number) => (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      // Use focused cell paste for consistent behavior
      handleFocusedCellPaste(datasetIndex, pastedData);
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
      
      const newDatasets = [...datasets];
      newDatasets[datasetIndex] = [];
      
      setDatasets(newDatasets);
      
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
      
      // Re-run tests with cleared dataset to update results
      const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
      if (currentConfig && (currentConfig.enableMeanTest || currentConfig.enableVarianceTest || currentConfig.enableMedianTest)) {
        handleRunTest(
          currentConfig.enableMeanTest ?? false,
          currentConfig.enableVarianceTest ?? false,
          currentConfig.enableMedianTest ?? false,
          newDatasets,
          parseFloat(significanceLevel),
          currentConfig.alternateMean || "Different",
          currentConfig.alternateVariance || "Different",
          currentConfig.alternateMedian || "Different",
          factorOfClassification,
        );
      }
      
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
  const performMultipleSampleMeanTest = (datasets: DataPoint[][],
    normalityResults: Array<{
      sampleSize: number;
      mean: number;
      stdev: number;
      median: number;
      adValue: number;
      adPValue: number;
    }>,
    significanceLevel: number, alternative: string) => {
    // Convert datasets to numeric arrays
    const numericDatasets = datasets.map(dataset => dataset.map(d => d.dataValue));
    const multipleSMeanTestResult = multipleSMeanTest({
      datasets: numericDatasets, 
      normalityResults: normalityResults, 
      significanceLevel, 
      alternative
    });
    
    return {
      anovagroupMeans: multipleSMeanTestResult.anovagroupMeans,
      anovaPooledStdev: multipleSMeanTestResult.anovaPooledStdev,
      anovagrandMean: multipleSMeanTestResult.anovagrandMean,
      anovadfBetween: multipleSMeanTestResult.anovadfBetween,
      anovadfWithin: multipleSMeanTestResult.anovadfWithin,
      anovassBetween: multipleSMeanTestResult.anovassBetween,
      anovassWithin: multipleSMeanTestResult.anovassWithin,
      anovamsBetween: multipleSMeanTestResult.anovamsBetween,
      anovamsWithin: multipleSMeanTestResult.anovamsWithin,
      anovarSquared: multipleSMeanTestResult.anovarSquared,
      anovarSquaredAdj: multipleSMeanTestResult.anovarSquaredAdj,
      anovarSquaredPred: multipleSMeanTestResult.anovarSquaredPred,
      anovaFStatistic: multipleSMeanTestResult.anovaFStatistic,
      anovapValue: multipleSMeanTestResult.anovapValue,
      anovaconfidenceIntervals: multipleSMeanTestResult.anovaconfidenceIntervals,
      anovaEqualVariances: multipleSMeanTestResult.anovaEqualVariances,
      studentTestdone: multipleSMeanTestResult.studentTestdone,
      studentStatistic: multipleSMeanTestResult.studentStatistic,
      studentpooledSE: multipleSMeanTestResult.studentpooledSE,
      studentDegreesOfFreedom: multipleSMeanTestResult.studentDegreesOfFreedom,
      studenttCriteria: multipleSMeanTestResult.studenttCriteria,
      studentmeanCI: multipleSMeanTestResult.studentmeanCI,
      studentdiffCI_minus: multipleSMeanTestResult.studentdiffCI_minus,
      studentdiffCI_plus: multipleSMeanTestResult.studentdiffCI_plus,
      studentpValue: multipleSMeanTestResult.studentpValue,
      studentVarEquality: multipleSMeanTestResult.studentVarEquality,
      studentfStat: multipleSMeanTestResult.studentfStat,
      studentfTestpValue: multipleSMeanTestResult.studentfTestpValue,
    };
  };

  const performMultipleSampleVarianceTest = (datasets: DataPoint[][],
    normalityResults: Array<{
      sampleSize: number;
      mean: number;
      stdev: number;
      median: number;
      adValue: number;
      adPValue: number;
    }>,
    significanceLevel: number, alternative: string) => {
    const numericDatasets = datasets.map(dataset => dataset.map(d => d.dataValue));
    const multipleSVarianceTestResult = multipleSVarianceTest({
      datasets: numericDatasets, 
      normalityResults: normalityResults, 
      significanceLevel, 
      alternative
    });
    
    return {
      testName: multipleSVarianceTestResult.testName,
      testStatistic: multipleSVarianceTestResult.testStatistic,
      pValue: multipleSVarianceTestResult.pValue,
      criticalValue: typeof multipleSVarianceTestResult.criticalValue === 'number' ? multipleSVarianceTestResult.criticalValue : { lower: multipleSVarianceTestResult.criticalValue.lower, upper: multipleSVarianceTestResult.criticalValue.upper },
      confidenceIntervals: multipleSVarianceTestResult.varianceConfidenceIntervals,
      df1: multipleSVarianceTestResult.df1,
      df2: multipleSVarianceTestResult.df2,
    };
  };

  const performMultipleSampleMedianTest = (datasets: DataPoint[][], 
    normalityResults: Array<{
      sampleSize: number;
      mean: number;
      stdev: number;
      median: number;
      adValue: number;
      adPValue: number;
    }>,
    significanceLevel: number,
    alternative: string) => {
    const numericDatasets = datasets.map(dataset => dataset.map(d => d.dataValue));
    const multipleSMedianTestResult = multipleSMedianTest({
      datasets: numericDatasets, 
      normalityResults: normalityResults, 
      significanceLevel, 
      alternative
    });
    
    return {
      testName: multipleSMedianTestResult.testName,
      testStatistic: multipleSMedianTestResult.testStatistic,
      pValue: multipleSMedianTestResult.pValue,
      criticalValue: multipleSMedianTestResult.criticalValue,
      confidenceIntervals: multipleSMedianTestResult.medianConfidenceIntervals,
      df1: multipleSMedianTestResult.df1,
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
      //const sortedValues = [...values].sort((a, b) => a - b);
      //const medianVal = sortedValues.length % 2 === 0
      //  ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
      //  : sortedValues[Math.floor(sortedValues.length / 2)];

      // Fake Anderson-Darling test results
      //const adValue = Math.random() * 2 + 0.1; // Random between 0.1 and 2.1
      //const adPValue = Math.random() * 0.5; // Random p-value between 0 and 0.5

      //const dataValues = datasetsParam[0].map(point => point.dataValue) || [];    
      //const n = dataValues.length;
      //const meanVal = mean(dataValues);
      //const stdDev = standardDeviation(dataValues);
    
      // Perform normality test - will return isNormal, AD value and p_values
      const normalityTest = performNormalityTest(values, meanVal, stdevVal);
      const medianVal = calculateMedian(values);

      return {
        sampleSize: dataset.length,
        mean: meanVal,
        stdev: stdevVal,
        median: medianVal,
        adValue: normalityTest.adStatistic,
        adPValue: normalityTest.pValue,
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
    HaMedian: string,
    factorOfClassification: string,
  ) => {
    // console.log("handleRunTest called with params:", { enableMeanTest, enableVarianceTest, enableMedianTest, significance });
    
    // Calculate normality tests
    const normalityResults = calculateNormalityTests(datasetsParam);

    // Perform hypothesis tests if enabled
    const meanTest = enableMeanTest 
      ? performMultipleSampleMeanTest(datasetsParam, normalityResults, significance, HaMean)
      : { anovagroupMeans: [],
          anovaPooledStdev: 0,
          anovagrandMean: 0,
          anovadfBetween: 0,
          anovadfWithin: 0,
          anovassBetween: 0,
          anovassWithin: 0,
          anovamsBetween: 0,
          anovamsWithin: 0,
          anovarSquared: 0,
          anovarSquaredAdj: 0,
          anovarSquaredPred: 0,
          anovaFStatistic: 0,
          anovapValue: 0,
          anovaconfidenceIntervals: [],
          anovaEqualVariances: true,
          studentTestdone: false,
          studentStatistic: 0,
          studentpooledSE: 0,
          studentDegreesOfFreedom: 0,
          studenttCriteria: 0,
          studentmeanCI: [],
          studentdiffCI_minus: 0,
          studentdiffCI_plus: 0,
          studentpValue: 0,
          studentVarEquality: true,
          studentfStat: 0,
          studentfTestpValue:  0, };

    const varianceTest = enableVarianceTest 
      ? performMultipleSampleVarianceTest(datasetsParam, normalityResults, significance, HaVariance)
      : { testName: "", testStatistic: 0, pValue: 0, criticalValue: 0, confidenceIntervals: [], df1: 0, df2: 0 };

    const medianTest = enableMedianTest 
      ? performMultipleSampleMedianTest(datasetsParam, normalityResults, significance, HaMedian)
      : { testName: "", testStatistic: 0, pValue: 0, criticalValue: 0, confidenceIntervals: [], df1: 0, };

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
      if (currentConfig.factorOfClassification && currentConfig.factorOfClassification !== factorOfClassification) {
        setFactorOfClassification(currentConfig.factorOfClassification);
      }
    }
  }, [ContCTQMultipleSampleHypTestData[ctqId]?.significanceLevel, ContCTQMultipleSampleHypTestData[ctqId]?.alternateMean, ContCTQMultipleSampleHypTestData[ctqId]?.alternateVariance, ContCTQMultipleSampleHypTestData[ctqId]?.alternateMedian, ContCTQMultipleSampleHypTestData[ctqId]?.factorOfClassification]);

  // useEffect to trigger test calculations when significance or alternative hypotheses change
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig || datasets.length === 0 || !datasets.some(dataset => dataset.length > 0)) return;
    //if (!currentConfig || datasets[0].length < 2 || datasets[1].length < 2 ) return;

    const hasEnabledTests = currentConfig.enableMeanTest || currentConfig.enableVarianceTest || currentConfig.enableMedianTest;
    if (!hasEnabledTests) return;

    handleRunTest(
      currentConfig.enableMeanTest ?? false,
      currentConfig.enableVarianceTest ?? false,
      currentConfig.enableMedianTest ?? false,
      datasets,
      parseFloat(significanceLevel),
      alternateMean,
      alternateVariance,
      alternateMedian,
      factorOfClassification,
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
    factorOfClassification,
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
        alternateMedian,
        factorOfClassification,
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
          <div className="mt-2 space-y-1">
            <h3 className="text-lg font-semibold">Data Input</h3>
            
            {/* Number of Datasets Control */}
            <div className="grid grid-cols-2 gap-4">
              <div> 
                <Label htmlFor="num-datasets">Number of Datasets (Maximum: 13)</Label>                           
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
                    onClick={() => setNumDatasets(Math.min(13, numDatasets + 1))}
                    disabled={numDatasets >= 13}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm mb-4">Factor used for dataset classifications:
                <Input
                  id={`dataset-desc-${factorOfClassification}`}
                  type="text"
                  value={factorOfClassification || ""}
                  onChange={(e) => {
                    setFactorOfClassification(e.target.value);
                  }}
                  placeholder={`Factor used for dataset classifications`}
                  className="text-sm"
                />
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
                    <div className="text-blue-700">Copy single or multiple columns of numeric values from Excel</div>
                    <div className="text-blue-600 text-xs mt-1">
                      <strong>Multi-column paste:</strong> Click any cell in Dataset 1, then Ctrl+V to paste multiple columns to all datasets<br></br>
                      Ctrl+V (Cmd+V on Mac) to paste • Ctrl+Z (Cmd+Z on Mac) to undo<br></br>
                      Click any cell in the table to set paste starting position
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
                                  // Clear ALL dataset focus states before focusing this one
                                  const newFocused = new Array(numDatasets).fill(-1);
                                  setFocusedCells(newFocused);
                                  
                                  const newEditing = new Array(numDatasets).fill(-1);
                                  setEditingCells(newEditing);
                                  
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
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Clear ALL dataset focus states, then set only this one
                                  const newFocused = new Array(numDatasets).fill(-1);
                                  newFocused[datasetIndex] = index;
                                  setFocusedCells(newFocused);
                                  
                                  // Also clear editing states for all other datasets
                                  const newEditing = new Array(numDatasets).fill(-1);
                                  setEditingCells(newEditing);
                                  
                                  (window as any).focusedComponent = `multiple-sample-dataset${datasetIndex}`;
                                  // Make this div focusable and focus it to maintain focus state
                                  e.currentTarget.focus();
                                }}
                                onDoubleClick={() => {
                                  const newEditingCells = [...editingCells];
                                  newEditingCells[datasetIndex] = index;
                                  setEditingCells(newEditingCells);
                                  const newEditValues = [...editValues];
                                  newEditValues[datasetIndex] = datasets[datasetIndex][index].dataValue.toString();
                                  setEditValues(newEditValues);
                                }}
                                onPaste={handleCellPaste(datasetIndex)}
                                tabIndex={0}
                                onFocus={() => {
                                  // Clear ALL dataset focus states, then set only this one
                                  const newFocused = new Array(numDatasets).fill(-1);
                                  newFocused[datasetIndex] = index;
                                  setFocusedCells(newFocused);
                                  
                                  // Also clear editing states for all other datasets
                                  const newEditing = new Array(numDatasets).fill(-1);
                                  setEditingCells(newEditing);
                                  
                                  (window as any).focusedComponent = `multiple-sample-dataset${datasetIndex}`;
                                }}
                                style={{
                                  backgroundColor: focusedCells[datasetIndex] === index ? '#dbeafe' : 'transparent'
                                }}
                                title="Single click to focus (blue background), then Ctrl+V to paste data starting from this row. Double-click to edit value."
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
                                // Clear ALL dataset focus states, then set only this one
                                const newFocused = new Array(numDatasets).fill(-1);
                                newFocused[datasetIndex] = datasets[datasetIndex]?.length || 0;
                                setFocusedCells(newFocused);
                                
                                // Also clear editing states for all other datasets
                                const newEditing = new Array(numDatasets).fill(-1);
                                setEditingCells(newEditing);
                                
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
              {/* <div className="text-center">
                <Button
                  variant="outline"
                  onClick={addDataset}
                  disabled={numDatasets >= 13}
                  className="border-dashed border-2 border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dataset (Max. 13)
                </Button>
              </div> */}

              {/* Number of Datasets Control */}
              <div className="space-y-2">
                <Label htmlFor="num-datasets">Number of Datasets (Max.: 13)</Label>
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
                    onClick={() => setNumDatasets(Math.min(13, numDatasets + 1))}
                    disabled={numDatasets >= 13}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {testResults.normalityResults.map((result: any, index: number) => (
                <div key={index} className="flex-shrink-0 space-y-1 p-4" style={{ minWidth: '404px' }}>
                {testResults.normalityResults[index] && testResults.normalityResults[index].sampleSize > 1 ? (
                <Card className="p-2">
                  <CardTitle className="text-lg">Normality test results:</CardTitle>    
                  <Badge
                    variant="default"
                    className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center ${testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel) ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
                    title={
                      testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel)
                        ? `Dataset ${index + 1} distribution follows normal distribution (P-Value ≥ ${significanceLevel})`
                        : `Dataset ${index + 1} distribution does not follow normal distribution (P-Value < ${significanceLevel})`
                    }
                  >
                    {testResults.normalityResults[index].adPValue >= parseFloat(significanceLevel)
                      ? `Dataset ${index + 1} follows normal distribution`
                      : `Dataset ${index + 1} does not follow normal distribution`}
                  </Badge>
                  <div className="text-gray-600 font-medium">Dataset {index + 1} description:&nbsp;
                  {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]}</div>
                  <div className="text-gray-600 font-medium">Sample size:&nbsp;
                  {testResults.normalityResults[index].sampleSize}</div>
                  <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                  {parseFloat(significanceLevel)*100}%</div>
                  <div className="text-gray-600 font-medium">Normality test (Anderson-Darling):<br></br> &nbsp;&nbsp; . AD value:&nbsp;
                  {testResults.normalityResults[index].adValue.toFixed(3)} <br></br> &nbsp;&nbsp; . P-value:&nbsp;&nbsp;&nbsp;
                  {testResults.normalityResults[index].adPValue.toFixed(3)}</div> 
                </Card>
                ) : (
                <Card className="p-2">
                  <CardTitle className="text-lg">Normality test results:</CardTitle>    
                  <Badge
                    variant="default"
                    className={`mt-2 mb-2 p-2 font-medium text-xs text-center justify-center text-white bg-red-600`}
                    title={
                       `Cannot test Normality of Dataset ${index + 1} distribution`                        
                    }
                  >                    
                    N/A. Cannot test Normality of Dataset {index + 1} distribution
                  </Badge>
                  <div className="text-gray-600 font-medium">Dataset {index + 1} description:&nbsp;
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
              <div className="pl-4 pr-4 grid grid-cols-3 gap-1 text-sm">
                {ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest && testResults.meanTest &&
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
                testResults.normalityResults &&
                testResults.normalityResults.length > 1 &&
                testResults.normalityResults[0] &&
                testResults.normalityResults[1] && 
                testResults.normalityResults[0].sampleSize > 1 &&
                testResults.normalityResults[1].sampleSize > 1 &&
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
                  <Card className="p-2">                
                    <CardTitle className="text-lg">Multiple Sample Mean test:</CardTitle>
                    {!testResults.meanTest.studentTestdone ? (
                    <>
                    <div className="text-lg justify-left mb-7">ANOVA One-Way:</div>
                    <div className="text-gray-600 font-medium">Number of Distributions:&nbsp;
                      {numDatasets}</div>
                    <div className="text-gray-600 font-medium">Factor of classifications:&nbsp;
                      {factorOfClassification} </div>
                    {testResults.meanTest.anovagroupMeans && testResults.meanTest.anovagroupMeans.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Group Statistics:</div>
                        <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Factor</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[60px]">Mean (μ<sub>i</sub>)</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[90px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}%</th>
                              <th className="border border-gray-300 px-1 py-1 text-left">Sample Size (n)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testResults.meanTest.anovagroupMeans.map((mean: number, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                  {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index] ? (
                                     ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]
                                  ) : (
                                    `Dataset ${index+1}`
                                  )}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  μ<sub>{index + 1}</sub>: {mean.toFixed(3)}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  [{testResults.meanTest.anovaconfidenceIntervals[index].lower.toFixed(3)}, {testResults.meanTest.anovaconfidenceIntervals[index].upper.toFixed(3)}]
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[10px]">
                                  {testResults.normalityResults[index].sampleSize}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                      {parseFloat(significanceLevel)*100}%</div>
                    <div>
                      <Badge
                      variant="default"
                      className={`mt-5 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.meanTest.anovapValue < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                      title={
                        testResults.meanTest.anovapValue < parseFloat(significanceLevel)
                          ? `Reject H0. Accept Ha (P-Value ${testResults.meanTest.anovapValue.toFixed(4)} < ${significanceLevel})`
                          : `Accept H0. Reject Ha (P-Value ${testResults.meanTest.anovapValue.toFixed(4)} ≥ ${significanceLevel})`
                      }
                      >
                      H0: (μ1 = μ2 = ... = μn) <br></br>
                      Ha: At least one group mean is different (μi ≠ μj for some i ≠ j) <br></br>
                      {testResults.meanTest.anovapValue < parseFloat(significanceLevel)
                        ? `Result => Reject H0. Accept Ha (P-Value ${testResults.meanTest.anovapValue.toFixed(4)} < ${significanceLevel})`
                        : `Result => Accept H0. Reject Ha (P-Value ${testResults.meanTest.anovapValue.toFixed(4)} ≥ ${significanceLevel})`}
                      
                      </Badge>
                    </div>
                     <div className="text-gray-600 font-medium mt-1">Pooled Standard Dev. (σ <sub>pooled</sub>):&nbsp;
                      {testResults.meanTest.anovaPooledStdev.toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">F-Test Statistic (F):&nbsp;
                      {testResults.meanTest.anovaFStatistic.toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">P-Value:&nbsp;
                      {testResults.meanTest.anovapValue.toFixed(4)}</div>
                    <div className="text-sm font-medium text-gray-700 mt-2 mb-2"> 
                      Analysis of Variance:
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-1 py-1 text-left min-w-[100px]">Component</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">DF</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">SS</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">MS</th>
                          </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                {factorOfClassification} (Between)
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovadfBetween}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovassBetween.toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovamsBetween.toFixed(3)}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                Error (Within)
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovadfWithin}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovassWithin.toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovamsWithin.toFixed(3)}
                              </td> 
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                Total
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {(testResults.meanTest.anovadfBetween + testResults.meanTest.anovadfWithin)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {(testResults.meanTest.anovassBetween + testResults.meanTest.anovassWithin).toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                -
                              </td> 
                            </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-sm font-medium text-gray-700 mb-2"> 
                      Model Summary:
                      <table className="w-full text-xs border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-1 py-1 text-left">S (pooled)</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">R-sqr</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">R-sqr(adj)</th>
                            <th className="border border-gray-300 px-1 py-1 text-left">R-sqr(pred)</th>
                          </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                {testResults.meanTest.anovaPooledStdev.toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovarSquared.toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovarSquaredAdj.toFixed(3)}
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                {testResults.meanTest.anovarSquaredPred.toFixed(3)}
                              </td>
                            </tr>
                        </tbody>
                      </table>
                    </div>
                    </>
                    ) 
                    : (
                    <>
                    <div className="text-lg justify-left mb-7">Student T-test:</div>                    
                    <div className="text-gray-600 font-medium">Number of Distributions:&nbsp;
                      {numDatasets}</div>
                    <div className="text-gray-600 font-medium">Factor of classifications:&nbsp;
                      {factorOfClassification} </div>
                    <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Group Statistics:</div>
                    
                    <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Factor</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[55px]">Mean (μ<sub>i</sub>)</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[30px] text-[9px]">SE Mean</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[45px] text-[9px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}%</th>
                          <th className="border border-gray-300 px-1 py-1 text-left min-w-[30px] text-[9px]">Std Dev (σ<sub>i</sub>)</th>
                          <th className="border border-gray-300 px-1 py-1 text-left text-[9px]">(n)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.normalityResults.map((result: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index] ? (
                                    ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]
                                ) : (
                                  `Dataset ${index+1}`
                                )}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                              μ<sub>{index + 1}</sub>: {testResults.normalityResults[index].mean.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                              {(Math.sqrt(Math.pow(testResults.normalityResults[index].stdev,2)/testResults.normalityResults[index].sampleSize)).toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                              [{testResults.meanTest.studentmeanCI[index].lower.toFixed(3)},{testResults.meanTest.studentmeanCI[index].upper.toFixed(3)}]
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[8px]">
                              {testResults.normalityResults[index].stdev.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[8px]">
                              {testResults.normalityResults[index].sampleSize}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>

                    <div className="text-gray-600 font-medium">Difference (μ1-μ2):&nbsp;
                      {(testResults.normalityResults[0].mean - testResults.normalityResults[1].mean).toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                      {parseFloat(significanceLevel)*100}%</div>
                    <div>
                      <Badge
                      variant="default"
                      className={`mt-1 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.meanTest.studentpValue < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                      title={
                        testResults.meanTest.studentpValue < parseFloat(significanceLevel)
                          ? `Reject H0. Accept Ha (P-Value ${testResults.meanTest.studentpValue.toFixed(4)} < ${significanceLevel})`
                          : `Accept H0. Reject Ha (P-Value ${testResults.meanTest.studentpValue.toFixed(4)} ≥ ${significanceLevel})`
                      }
                      >
                      H0: All group means are equal (μ1 = μ2) <br></br>
                      Ha: (μ1 ≠ μ2) <br></br><br></br>
                      {testResults.meanTest.studentpValue < parseFloat(significanceLevel)
                        ? `Result => Reject H0. Accept Ha (P-Value ${testResults.meanTest.studentpValue.toFixed(4)} < ${significanceLevel})`
                        : `Result => Accept H0. Reject Ha (P-Value ${testResults.meanTest.studentpValue.toFixed(4)} ≥ ${significanceLevel})`}
                      
                      </Badge>
                    </div>
                    {testResults.meanTest.studentVarEquality ?
                      (<div className="text-gray-600 font-medium">Equal Variances (F-stat: {testResults.meanTest.studentfStat.toFixed(3)}, p-Value: {testResults.meanTest.studentfTestpValue.toFixed(3)})
                      </div>                  
                      ) : (
                      <div className="text-gray-600 font-medium">Unequal Variances (F-stat: {testResults.meanTest.studentfStat.toFixed(3)}, p-Value: {testResults.meanTest.studentfTestpValue.toFixed(3)})
                      </div>
                    )}
                    <div className="text-gray-600 font-medium">T-Statistic:&nbsp;
                      {testResults.meanTest.studentStatistic.toFixed(3)}</div>                   
                    <div className="text-gray-600 font-medium">T-test Degrees of Freedom:&nbsp;
                      {testResults.meanTest.studentDegreesOfFreedom.toFixed(0)}</div>
                    <div className="text-gray-600 font-medium">T-test Pooled Standard Deviation:&nbsp;
                      {testResults.meanTest.studentpooledSE.toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">T-criteria
                      (T<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, T<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{typeof testResults.meanTest.studenttCriteria === 'object' ? testResults.meanTest.studenttCriteria.lower.toFixed(3) : testResults.meanTest.studenttCriteria.toFixed(3)}, {typeof testResults.meanTest.studenttCriteria === 'object' ? testResults.meanTest.studenttCriteria.upper.toFixed(3) : testResults.meanTest.studenttCriteria.toFixed(3)}]
                    </div>
                    <div className="text-gray-600 font-medium">P-Value:&nbsp;
                      {testResults.meanTest.studentpValue.toFixed(4)}</div>
                    <div className="text-gray-600 font-medium">CI {(100*(1-parseFloat(significanceLevel)))}% for (μ1 - μ2): [
                    {testResults.meanTest.studentdiffCI_minus.toFixed(3)}, {testResults.meanTest.studentdiffCI_plus.toFixed(3)}]</div>
                    </>
                    )}
                  </Card>                
                )}

                {ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest && testResults.varianceTest && 
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
                testResults.normalityResults &&
                testResults.normalityResults.length > 1 &&
                testResults.normalityResults[0] &&
                testResults.normalityResults[1] && 
                testResults.normalityResults[0].sampleSize > 1 &&
                testResults.normalityResults[1].sampleSize > 1 &&
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
                ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
                  <Card className="p-2">                
                    <CardTitle className="text-lg">Multiple Sample Variance test:</CardTitle>
                    <div className="text-lg justify-left">{testResults.varianceTest.testName}'s test for Homogeneity of Variance:</div>                    
                    <div className="text-gray-600 font-medium">Number of Distributions:&nbsp;
                      {numDatasets}</div>
                    <div className="text-gray-600 font-medium">Factor of classifications:&nbsp;
                      {factorOfClassification} </div>
                    {testResults.varianceTest && testResults.normalityResults.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Group Statistics:</div>
                        <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Factor</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[60px]">Std Dev (σ<sub>i</sub>)</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[90px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}% (Bonferroni)</th>
                              <th className="border border-gray-300 px-1 py-1 text-left">Sample Size (n)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testResults.normalityResults.map((result: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                  {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index] ? (
                                     ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]
                                  ) : (
                                    `Dataset ${index+1}`
                                  )}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  σ<sub>{index + 1}</sub>: {result.stdev.toFixed(3)}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  {testResults.varianceTest.confidenceIntervals && testResults.varianceTest.confidenceIntervals[index] ? `[${testResults.varianceTest.confidenceIntervals[index].lower.toFixed(3)}, ${testResults.varianceTest.confidenceIntervals[index].upper.toFixed(3)}]` : 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[10px]">
                                  {testResults.normalityResults[index].sampleSize}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                      {parseFloat(significanceLevel)*100}%</div>
                    <div>
                      <Badge
                      variant="default"
                      className={`mt-5 mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.varianceTest.pValue < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                      title={
                       `Accept H0. Reject Ha (P-Value {testResults.varianceTest.pValue} ≥ ${significanceLevel}`
                      }
                      >
                      H0: (σ1² = σ2² = ... = σn²) <br></br>
                      Ha: At least one group variance is different (σi² ≠ σj² for some i ≠ j) <br></br>
                      {testResults.varianceTest.pValue < parseFloat(significanceLevel)
                        ? `Result => Reject H0. Accept Ha (P-Value ${testResults.varianceTest.pValue.toFixed(4)} < ${significanceLevel})`
                        : `Result => Accept H0. Reject Ha (P-Value ${testResults.varianceTest.pValue.toFixed(4)} ≥ ${significanceLevel})`
                      }                      
                      </Badge>
                    </div>
                    
                    <div className="text-gray-600 font-medium">{testResults.varianceTest.testName}'s Test Statistic:&nbsp;
                      {testResults.varianceTest.testStatistic.toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">{testResults.varianceTest.testName}'s Test-criteria
                    {testResults.varianceTest.testName === "Fisher" ?
                    (
                      <>
                      {typeof testResults.varianceTest.criticalValue === 'number'
                        ? (alternateVariance==='Less than' ? <> (F<sub>{significanceLevel}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)} </> : <> (F<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)}</>)
                        : <> (F<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, F<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.varianceTest.criticalValue.lower.toFixed(3)}, {testResults.varianceTest.criticalValue.upper.toFixed(3)}]</>
                      }
                      </>
                    ) : (
                      <>
                      {testResults.varianceTest.testName === "Bartlett" ?
                        <>
                        {typeof testResults.varianceTest.criticalValue === 'number'
                          ? (alternateVariance==='Less than' ? <> (B<sub>{significanceLevel}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)} </> : <> (B<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)}</>)
                          : <> (B<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, B<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.varianceTest.criticalValue.lower.toFixed(3)}, {testResults.varianceTest.criticalValue.upper.toFixed(3)}]</>
                        }
                        </>
                        :
                        <>
                        {typeof testResults.varianceTest.criticalValue === 'number'
                          ? (alternateVariance==='Less than' ? <> (L<sub>{significanceLevel}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)} </> : <> (L<sub>{(1 - parseFloat(significanceLevel)).toFixed(2)}</sub>): {testResults.varianceTest.criticalValue.toFixed(3)}</>)
                          : <> (L<sub>{(parseFloat(significanceLevel)/2).toFixed(3)}</sub>, L<sub>{(1-parseFloat(significanceLevel)/2).toFixed(3)}</sub>): [{testResults.varianceTest.criticalValue.lower.toFixed(3)}, {testResults.varianceTest.criticalValue.upper.toFixed(3)}]</>
                        }
                        </>}
                      </>)}
                    </div>
                    <div className="text-gray-600 font-medium">P-Value:&nbsp;
                      {testResults.varianceTest.pValue.toFixed(4)}</div>
                    <div className="text-gray-600 font-medium">Degrees of Freedom:
                      {testResults.varianceTest.testName === "Fisher" ? (
                        <>
                        <div>. df1: {testResults.varianceTest.df1}</div>
                        <div>. df2: {testResults.varianceTest.df2}</div>
                        </>
                      ) : (
                      testResults.varianceTest.testName === "Bartlett" ?  (
                        <div>  
                        . Bartlett df: {testResults.varianceTest.df1}
                        </div>
                      ):(
                        <>  
                        <div>. df Between: {testResults.varianceTest.df1}</div>
                        <div>. df Within: {testResults.varianceTest.df2}</div>
                        </>
                        )
                      )}
                    </div>                    
                    </Card>
                    )}

                    {ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest && testResults.medianTest && 
                    ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
                    testResults.normalityResults &&
                    testResults.normalityResults.length > 1 &&
                    testResults.normalityResults[0] &&
                    testResults.normalityResults[1] && 
                    testResults.normalityResults[0].sampleSize > 1 &&
                    testResults.normalityResults[1].sampleSize > 1 &&
                    ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
                    ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
                  <Card className="p-2">                
                    <CardTitle className="text-lg">Multiple Sample Median test:</CardTitle>
                    <div className="text-lg justify-left mb-7">{testResults.medianTest.testName}'s test:</div>                    
                    <div className="text-gray-600 font-medium">Number of Distributions:&nbsp;
                      {numDatasets}</div>
                    <div className="text-gray-600 font-medium">Factor of classifications:&nbsp;
                      {factorOfClassification} </div>
                    {testResults.medianTest && testResults.normalityResults.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Group Statistics:</div>
                        <table className="w-full text-xs border-collapse border border-gray-300 mb-2">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[70px]">Factor</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[60px]">Median (η<sub>i</sub>)</th>
                              <th className="border border-gray-300 px-1 py-1 text-left min-w-[90px]">CI {((1-parseFloat(significanceLevel))*100).toFixed(0)}%</th>
                              <th className="border border-gray-300 px-1 py-1 text-left">Sample Size (n)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testResults.normalityResults.map((result: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-[10px]">
                                  {ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index] ? (
                                     ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions[index]
                                  ) : (
                                    `Dataset ${index+1}`
                                  )}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  η<sub>{index + 1}</sub>: {result.median.toFixed(3)}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 font-medium text-[10px]">
                                  {testResults.medianTest.confidenceIntervals && testResults.medianTest.confidenceIntervals[index] && testResults.medianTest.confidenceIntervals[index].lower !== undefined && testResults.medianTest.confidenceIntervals[index].upper !== undefined ? `[${testResults.medianTest.confidenceIntervals[index].lower.toFixed(3)}, ${testResults.medianTest.confidenceIntervals[index].upper.toFixed(3)}]` : 'N/A'}
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-gray-600 text-center text-[10px]">
                                  {testResults.normalityResults[index].sampleSize}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {testResults.medianTest.confidenceIntervals && numDatasets === 2 && testResults.medianTest.confidenceIntervals[0] && testResults.medianTest.confidenceIntervals[1] && (
                    <div className="text-gray-600 font-medium">Difference (η1-η2):&nbsp;
                      {(testResults.medianTest.confidenceIntervals[0].median - testResults.medianTest.confidenceIntervals[1].median).toFixed(3)}</div>
                    )}
                    <div className="text-gray-600 font-medium">Significance Level (α):&nbsp;
                      {parseFloat(significanceLevel)*100}%</div>
                    <div>
                      <Badge
                      variant="default"
                      className={`mb-4 p-2 font-medium text-xs text-center justify-center ${testResults.medianTest.pValue < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"} ${numDatasets ===2 ? "mt-1" : "mt-5"}`}
                      title={
                       `Accept H0. Reject Ha (P-Value {testResults.medianTest.pValue} ≥ ${significanceLevel}`
                      }
                      >
                      H0: (η1 = η2 = ... = ηn) <br></br>
                      Ha: At least one group variance is different (ηi² ≠ ηj² for some i ≠ j) <br></br>
                      {testResults.medianTest.pValue < parseFloat(significanceLevel)
                        ? `Result => Reject H0. Accept Ha (P-Value ${testResults.medianTest.pValue.toFixed(4)} < ${significanceLevel})`
                        : `Result => Accept H0. Reject Ha (P-Value ${testResults.medianTest.pValue.toFixed(4)} ≥ ${significanceLevel})`
                      }                      
                      </Badge>
                    </div>
                    
                    <div className="text-gray-600 font-medium">{testResults.medianTest.testName}'s Test Statistic:&nbsp;
                      {testResults.medianTest.testStatistic.toFixed(3)}</div>
                    <div className="text-gray-600 font-medium">
                      {testResults.medianTest.testName === 'Mann-Whitney' ? (
                        <>{testResults.medianTest.testName}'s Test-criteria (M-W<sub>{1-parseFloat(significanceLevel)}</sub>): {testResults.medianTest.criticalValue.toFixed(3)}</>
                      ) : (
                        <>{testResults.medianTest.testName}'s Test-criteria (K-W<sub>{1-parseFloat(significanceLevel)}</sub>): {testResults.medianTest.criticalValue.toFixed(3)}</>  
                      )}
                    </div>
                    <div className="text-gray-600 font-medium">P-Value:&nbsp;
                      {testResults.medianTest.pValue.toFixed(4)}</div>
                    <div className="text-gray-600 font-medium">
                      {testResults.medianTest.testName === "Kruskal-Wallis" && (
                      <>  
                        <div className="text-gray-600 font-medium">Degrees of Freedom:
                        </div>
                        <div>  
                        . Kruskal-Wallis df: {testResults.medianTest.df1}
                        </div>
                      </>
                      )}
                    </div>                   
                    </Card>
                    )}

              </div>
            </div>
          )}  
          </div>
        </div>
        )}  
        {/* multiple sample mean test BoxPlot visualization when showBoxPlot is true */}
                  
        {datasets.length > 1 && ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest &&
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
        testResults.normalityResults &&
        testResults.normalityResults.length > 1 &&
        testResults.normalityResults[0] &&
        testResults.normalityResults[1] && 
        testResults.normalityResults[0].sampleSize > 1 &&
        testResults.normalityResults[1].sampleSize > 1 &&
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
          <div className="mt-6 space-y-6">
            {/* Box Plots */}
            <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="boxplot-section">
              <h3 className="text-lg font-semibold mb-4">Box Plot Analysis</h3>
              <BoxPlotWithNSMeanTest
                data={datasets.map(dataset => dataset.map(d => d.dataValue))}
                ctqName={ctqName}
                means={testResults.normalityResults.map(mean => mean.mean)}
                Ha={alternateMean}
                title={testResults.meanTest.studentTestdone ? `Multiple-Sample Mean Student Test (Box Plots)`
                      : `Multiple-Sample Mean Anova Test (Box Plots)`}
                pValue={testResults.meanTest.studentTestdone ? testResults.meanTest.studentpValue
                      : testResults.meanTest.anovapValue}
                alphalevel={significanceLevel}
                descriptions={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions}
                equalVariances={testResults.meanTest.studentpValue ? testResults.meanTest.studentVarEquality
                  : testResults.meanTest.anovaEqualVariances}
              />
            </div>
            
            {/* Confidence Intervals */}
            <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="confidence-intervals-section">
              <h3 className="text-lg font-semibold mb-4">Confidence Intervals</h3>
              <ConfidenceIntervalsNSMean
                ctqName={ctqName}
                means={testResults.normalityResults.map(mean => mean.mean)}
                confidenceIntervals={testResults.meanTest.studentTestdone ? testResults.meanTest.studentmeanCI : testResults.meanTest.anovaconfidenceIntervals}
                Ha={alternateMean}
                title={testResults.meanTest.studentTestdone ? `Multiple-Sample Mean Student Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`
                      : `Multiple-Sample Mean Anova Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.meanTest.studentTestdone ? testResults.meanTest.studentpValue
                      : testResults.meanTest.anovapValue}
                alphalevel={significanceLevel}
                descriptions={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions}
                equalVariances={testResults.meanTest.studentpValue ? testResults.meanTest.studentVarEquality
                  : testResults.meanTest.anovaEqualVariances}
              />
            </div>
          </div>
        )} 
        {datasets.length > 1 && ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest && 
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
        testResults.normalityResults &&
        testResults.normalityResults.length > 1 &&
        testResults.normalityResults[0] &&
        testResults.normalityResults[1] && 
        testResults.normalityResults[0].sampleSize > 1 &&
        testResults.normalityResults[1].sampleSize > 1 &&
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
          <div className="mt-6 g-white rounded-lg border border-gray-200 p-4" data-testid="confidence-intervals-var-section">
            <h3 className="text-lg font-semibold mb-4">Confidence Intervals</h3>
            <ConfidenceIntervalsNSVariance
              ctqName={ctqName}
              stdevs={testResults.normalityResults.map(stdev => stdev.stdev)}
              confidenceIntervals={testResults.varianceTest.confidenceIntervals}
              Ha={alternateVariance}
              title={`Multiple-Sample ${testResults.varianceTest.testName}'s Test for homogeneity of variances (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
              pValue={testResults.varianceTest.pValue}
              alphalevel={significanceLevel}
              descriptions={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions}
              df1={testResults.varianceTest.df1}
              df2={testResults.varianceTest.df2}
            />
          </div>  
        )}  
        {datasets.length > 1 && ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest && 
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets.length > 1 &&
        testResults.normalityResults &&
        testResults.normalityResults.length > 1 &&
        testResults.normalityResults[0] &&
        testResults.normalityResults[1] && 
        testResults.normalityResults[0].sampleSize > 1 &&
        testResults.normalityResults[1].sampleSize > 1 &&
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[0].length > 1 && 
        ContCTQMultipleSampleHypTestData[ctqId]?.datasets[1].length > 1 && (
          <div className="mt-6 space-y-6">
            {/* Box Plots */}
            <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="boxplot-median-section">
              <h3 className="text-lg font-semibold mb-4">Box Plot Analysis</h3>
              <BoxPlotWithNSMedianTest
                data={datasets.map(dataset => dataset.map(d => d.dataValue))}
                ctqName={ctqName}
                medians={testResults.normalityResults.map(median => median.median)}
                Ha={alternateMedian}
                title={`Multiple-Sample Median ${testResults.medianTest.testName}'s Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.medianTest.pValue}
                alphalevel={significanceLevel}
                descriptions={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions}
                df1={testResults.medianTest.df1}
              />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4" data-testid="boxplot-median-section">
              <h3 className="text-lg font-semibold mb-4">Confidence Intervals</h3>
              <ConfidenceIntervalsNSMedian
                ctqName={ctqName}
                medians={testResults.normalityResults.map(median => median.median)}
                confidenceIntervals={testResults.medianTest.confidenceIntervals || []}
                descriptions={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescriptions}                
                title={`Multiple-Sample Median ${testResults.medianTest.testName}'s Test (Conf. Level: ${(100-(parseFloat(significanceLevel) * 100)).toFixed(0)}%)`}
                pValue={testResults.medianTest.pValue}
                alphalevel={significanceLevel}
                Ha={alternateMedian}                
              />
            </div>
          </div>
        )} 
        </div>
      </CardContent>
    </Card>
  );
}