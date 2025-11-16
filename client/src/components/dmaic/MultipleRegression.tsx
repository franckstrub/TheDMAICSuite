import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Info, Clipboard, Undo, Plus, Minus } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { multipleRegression, type MultipleRegressionResult } from '@/lib/multipleRegressionUtils';
import jStat from 'jstat';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Plot from 'react-plotly.js';

interface MultipleRegressionProps {
  projectId: number;
  solutionId: string;
}

export function MultipleRegression({ projectId, solutionId }: MultipleRegressionProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const dataEntryRef = useRef<HTMLDivElement>(null);
  
  // Variable names
  const [responseVariableName, setResponseVariableName] = useState("");
  const [predictorNames, setPredictorNames] = useState<any[]>(["X1", "X2"]);
  
  // Data (column-major: dataX[predictorIdx][rowIdx])
  const [dataY, setDataY] = useState<number[]>([NaN, NaN, NaN, NaN]);
  const [dataX, setDataX] = useState<number[][]>([
    [NaN, NaN],
    [NaN, NaN],
    [NaN, NaN],
    [NaN, NaN],
  ]);
  
  // Selected predictors (indices into dataX and predictorNames)
  const [selectedPredictors, setSelectedPredictors] = useState<number[]>([0, 1]);
  
  // Analysis options
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  
  // UI state
  const [dataHistory, setDataHistory] = useState<{ dataY: number[], dataX: number[][] }[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showResidualsVsFits, setShowResidualsVsFits] = useState(false);
  const [showResidualsVsOrder, setShowResidualsVsOrder] = useState(false);
  const [showNormalProbPlot, setShowNormalProbPlot] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("setup");
  
  // 3D plot selection
  const [plot3DFactorX, setPlot3DFactorX] = useState(0);
  const [plot3DFactorY, setPlot3DFactorY] = useState(1);

  // Solve for X state
  const [targetY, setTargetY] = useState<number | null>(null);
  const [solveForPredictorIdx, setSolveForPredictorIdx] = useState<number | null>(null);
  const [constraintValues, setConstraintValues] = useState<Record<number, number | null>>({});
  const [solvedX, setSolvedX] = useState<number | null>(null);
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`],
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data) {
      const config = configQuery.data as any;
      
      // Only set loadedRef after we've actually loaded the data
      if (!loadedRef.current) {
        loadedRef.current = true;
      }
      
      if (config.responseVariableName) {
        setResponseVariableName(config.responseVariableName);
      }
      
      if (config.predictorNames && Array.isArray(config.predictorNames)) {
        setPredictorNames(config.predictorNames);
      }
      
      if (config.dataY && Array.isArray(config.dataY)) {
        // Convert null back to NaN after JSON deserialization
        setDataY(config.dataY.map((v: any) => v === null ? NaN : v));
      }
      
      if (config.dataX && Array.isArray(config.dataX)) {
        // Convert null back to NaN after JSON deserialization
        setDataX(config.dataX.map((col: any) => col.map((v: any) => v === null ? NaN : v)));
      }
      
      if (config.selectedPredictors && Array.isArray(config.selectedPredictors)) {
        setSelectedPredictors(config.selectedPredictors);
      } else {
        // Default: select all available predictors
        const allIndices = (config.predictorNames || predictorNames).map((_: any, idx: number) => idx);
        setSelectedPredictors(allIndices);
      }
      
      if (config.significanceLevel !== null && config.significanceLevel !== undefined) {
        setSignificanceLevel(config.significanceLevel);
      }
      
      // Load Solve for X settings
      if (config.targetY !== null && config.targetY !== undefined) {
        setTargetY(config.targetY);
      }
      
      if (config.solveForPredictorIdx !== null && config.solveForPredictorIdx !== undefined) {
        setSolveForPredictorIdx(config.solveForPredictorIdx);
      }
      
      if (config.constraintValues && typeof config.constraintValues === 'object') {
        // Convert string keys back to numbers
        const constraints: Record<number, number | null> = {};
        Object.entries(config.constraintValues).forEach(([key, value]) => {
          const numKey = parseInt(key);
          // Handle both null and numeric values
          if (value === null || value === undefined) {
            constraints[numKey] = null;
          } else {
            constraints[numKey] = Number(value);
          }
        });
        setConstraintValues(constraints);
      }
    }
  }, [configQuery.data]);

  // Save mutation
  const saveDataMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Setup & Data saved",
        description: "Your setup and data have been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save data.",
        variant: "destructive",
      });
    },
  });

  // Save selected coefficients mutation
  const saveSelectedCoefficientsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`,
        {
          selectedPredictors,
          targetY: targetY !== null ? targetY : undefined,
          solveForPredictorIdx: solveForPredictorIdx !== null ? solveForPredictorIdx : undefined,
          constraintValues
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Coefficient selections saved",
        description: "Your coefficient selections have been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save coefficient selections.",
        variant: "destructive",
      });
    },
  });

  // Calculate regression results using useMemo for efficiency
  const regressionResult = useMemo<MultipleRegressionResult | null>(() => {
    try {
      if (selectedPredictors.length === 0) {
        return null;
      }
      
      // Check if we have enough valid data (filter out both NaN and null)
      const validCount = dataY.filter((y, i) => {
        if (isNaN(y) || y === null) return false;
        return selectedPredictors.every(predIdx => 
          dataX[predIdx] && !isNaN(dataX[predIdx][i]) && dataX[predIdx][i] !== null
        );
      }).length;
      
      if (validCount < selectedPredictors.length + 2) {
        return null;
      }
      
      return multipleRegression(
        dataY,
        dataX,
        predictorNames,
        selectedPredictors,
        responseVariableName
      );
    } catch (error) {
      return null;
    }
  }, [dataY, dataX, predictorNames, selectedPredictors, responseVariableName]);

  // Save to history
  const saveToHistory = () => {
    const MAX_HISTORY = 20;
    setDataHistory(prev => {
      const newHistory = [...prev, { 
        dataY: JSON.parse(JSON.stringify(dataY)), 
        dataX: JSON.parse(JSON.stringify(dataX))
      }];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (dataHistory.length === 0) {
      toast({
        title: "Nothing to undo",
        description: "No previous data state available.",
        variant: "destructive",
      });
      return;
    }

    const previousState = dataHistory[dataHistory.length - 1];
    setDataY(JSON.parse(JSON.stringify(previousState.dataY)));
    setDataX(JSON.parse(JSON.stringify(previousState.dataX)));
    setDataHistory(prev => prev.slice(0, -1));
    
    toast({
      title: "Undo successful",
      description: "Reverted to previous data state.",
    });
  };

  const handleSaveData = async () => {
    // Convert NaN to null for JSON serialization
    const data = {
      responseVariableName,
      predictorNames,
      dataY: dataY.map(v => isNaN(v) ? null : v),
      dataX: dataX.map(col => col.map(v => isNaN(v) ? null : v)),
      selectedPredictors,
      significanceLevel,
      // Solve for X settings
      targetY,
      solveForPredictorIdx,
      constraintValues,
    };
    
    await saveDataMutation.mutateAsync(data);
  };

  const handleClearData = () => {
    saveToHistory();
    setDataY(Array(dataY.length).fill(NaN));
    setDataX(dataX.map(col => Array(col.length).fill(NaN)));
    setShowClearDialog(false);
    toast({
      title: "Data cleared",
      description: "All data has been cleared.",
    });
  };

  const handleAddRow = () => {
    saveToHistory();
    setDataY([...dataY, NaN]);
    setDataX(dataX.map(col => [...col, NaN]));
  };

  const handleRemoveRow = () => {
    if (dataY.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "Must have at least one row.",
        variant: "destructive",
      });
      return;
    }
    saveToHistory();
    setDataY(dataY.slice(0, -1));
    setDataX(dataX.map(col => col.slice(0, -1)));
  };

  const handleAddPredictor = () => {
    saveToHistory();
    const newIdx = predictorNames.length;
    setPredictorNames([...predictorNames, `X${newIdx + 1}`]);
    setDataX([...dataX, Array(dataY.length).fill(NaN)]);
    setSelectedPredictors([...selectedPredictors, newIdx]);
  };

  const handleRemovePredictor = () => {
    if (predictorNames.length <= 2) {
      toast({
        title: "Cannot remove",
        description: "Must have at least two predictors.",
        variant: "destructive",
      });
      return;
    }
    saveToHistory();
    const lastIdx = predictorNames.length - 1;
    setPredictorNames(predictorNames.slice(0, -1));
    setDataX(dataX.slice(0, -1));
    setSelectedPredictors(selectedPredictors.filter(idx => idx !== lastIdx));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    try {
      const lines = pastedText.trim().split('\n');
      const rows = lines.map(line => line.split('\t').map(cell => {
        const num = parseFloat(cell.trim().replace(',', '.'));
        return isNaN(num) ? NaN : num;
      }));
      
      if (rows.length === 0 || rows[0].length < 2) {
        throw new Error('Invalid paste data');
      }
      
      saveToHistory();
      
      const numCols = rows[0].length;
      const numPredictors = numCols - 1;
      
      // Prepare new predictor names and data arrays
      const currentPredictorCount = predictorNames.length;
      const newPredictorNames = [...predictorNames];
      const newSelectedPredictors = [...selectedPredictors];
      
      if (numPredictors > currentPredictorCount) {
        // Add new predictors if needed
        for (let i = currentPredictorCount; i < numPredictors; i++) {
          newPredictorNames.push(`X${i + 1}`);
          newSelectedPredictors.push(i);
        }
      }
      
      // Extract data - Response is in first column (index 0)
      const newDataY = rows.map(row => row[0]);
      const newDataX: number[][] = [];
      
      for (let predIdx = 0; predIdx < numPredictors; predIdx++) {
        newDataX.push(rows.map(row => row[predIdx + 1]));
      }
      
      // Update all state at once
      setPredictorNames(newPredictorNames);
      setSelectedPredictors(newSelectedPredictors);
      setDataY(newDataY);
      setDataX(newDataX);
      
      toast({
        title: "Data pasted",
        description: `Pasted ${rows.length} rows with ${numPredictors} predictors.`,
      });
    } catch (error) {
      toast({
        title: "Paste error",
        description: "Could not parse pasted data. Ensure it's in tab-separated format with response in the first column and predictors in subsequent columns.",
        variant: "destructive",
      });
    }
  };

  const handlePasteFromExcel = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      
      const lines = pastedText.trim().split('\n');
      const rows = lines.map(line => line.split('\t').map(cell => {
        const num = parseFloat(cell.trim().replace(',', '.'));
        return isNaN(num) ? NaN : num;
      }));
      
      if (rows.length === 0 || rows[0].length < 2) {
        throw new Error('Invalid paste data');
      }
      
      saveToHistory();
      
      const numCols = rows[0].length;
      const numPredictors = numCols - 1;
      
      // Ensure we have enough predictor columns
      const currentPredictorCount = predictorNames.length;
      const newPredictorNames = [...predictorNames];
      const newDataX = [...dataX];
      
      if (numPredictors > currentPredictorCount) {
        // Add new predictors if needed
        for (let i = currentPredictorCount; i < numPredictors; i++) {
          newPredictorNames.push(`X${i + 1}`);
          newDataX.push(Array(dataY.length).fill(NaN));
        }
        setPredictorNames(newPredictorNames);
      }
      
      // Extract data - Response is in first column (index 0)
      const newDataY = rows.map(row => row[0]);
      const finalDataX: number[][] = [];
      
      for (let predIdx = 0; predIdx < numPredictors; predIdx++) {
        finalDataX.push(rows.map(row => row[predIdx + 1]));
      }
      
      // Preserve existing predictors beyond the pasted ones
      for (let predIdx = numPredictors; predIdx < newPredictorNames.length; predIdx++) {
        finalDataX.push(newDataX[predIdx] || Array(newDataY.length).fill(NaN));
      }
      
      setDataY(newDataY);
      setDataX(finalDataX);
      
      // Update selected predictors to include the newly pasted ones
      const newSelectedPredictors = [...selectedPredictors];
      for (let i = 0; i < numPredictors; i++) {
        if (!newSelectedPredictors.includes(i)) {
          newSelectedPredictors.push(i);
        }
      }
      setSelectedPredictors(newSelectedPredictors.sort((a, b) => a - b));
      
      toast({
        title: "Data pasted",
        description: `Pasted ${rows.length} rows with ${numPredictors} predictors.`,
      });
    } catch (error) {
      toast({
        title: "Paste error",
        description: "Could not parse pasted data. Ensure it's in tab-separated format with response in the first column and predictors in subsequent columns.",
        variant: "destructive",
      });
    }
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string, isResponse: boolean) => {
    const num = parseFloat(value.replace(',', '.'));
    const finalValue = value.trim() === '' ? NaN : (isNaN(num) ? NaN : num);
    
    if (isResponse) {
      const newDataY = [...dataY];
      newDataY[rowIdx] = finalValue;
      setDataY(newDataY);
    } else {
      const newDataX = dataX.map(col => [...col]);
      newDataX[colIdx][rowIdx] = finalValue;
      setDataX(newDataX);
    }
  };

  const togglePredictor = (predIdx: number) => {
    if (selectedPredictors.includes(predIdx)) {
      // Deselect - ensure at least one remains
      if (selectedPredictors.length <= 1) {
        toast({
          title: "Cannot deselect",
          description: "At least one predictor must be selected.",
          variant: "destructive",
        });
        return;
      }
      setSelectedPredictors(selectedPredictors.filter(idx => idx !== predIdx));
      
      // Clear constraint value for deselected predictor
      const newConstraintValues = { ...constraintValues };
      delete newConstraintValues[predIdx];
      setConstraintValues(newConstraintValues);
    } else {
      // Select
      setSelectedPredictors([...selectedPredictors, predIdx].sort((a, b) => a - b));
    }
  };

  // Update 3D plot defaults when selected predictors change
  useEffect(() => {
    const selected = selectedPredictors.filter(idx => idx < predictorNames.length).sort((a, b) => a - b);
    if (selected.length >= 2) {
      setPlot3DFactorX(selected[0]);
      setPlot3DFactorY(selected[1]);
    } else if (selected.length === 1) {
      setPlot3DFactorX(selected[0]);
      setPlot3DFactorY(selected[0]);
    }
  }, [selectedPredictors, predictorNames]);

    const saveSolvingSetupMutation = useMutation({
      mutationFn: async (data: any) => {
        return apiRequest(
          'POST',
          `/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`,
          data
        );
      },
      onSuccess: () => {
        toast({
          title: "Solving setup saved",
          description: "Your solving setup (target Y, predictor selection, and constraints) has been saved successfully.",
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`]
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to save solving setup",
          variant: "destructive",
        });
      },
    });
  // Compute solved predictor value
  const computeSolvedPredictor = () => {
    // Check for valid inputs - targetY can be 0, so check for null/undefined specifically
    if (targetY === null || targetY === undefined || !Number.isFinite(targetY) || !regressionResult || solveForPredictorIdx === null) {
      setSolvedX(null);
      return;
    }

    try {
      const coefficients = regressionResult.coefficients;
      const intercept = coefficients[0].estimate; // β0
      
      // Get coefficient for the predictor we're solving for
      const solveCoeffIdx = selectedPredictors.indexOf(solveForPredictorIdx);
      if (solveCoeffIdx === -1) {
        setSolvedX(null);
        return;
      }
      
      const betaI = coefficients[solveCoeffIdx + 1].estimate; // +1 because intercept is first
      
      // Guard against coefficient too close to zero
      if (Math.abs(betaI) < 1e-10) {
        setSolvedX(null);
        return;
      }
      
      // Check all constraints are provided for other selected predictors
      let sum = intercept;
      for (const predIdx of selectedPredictors) {
        if (predIdx === solveForPredictorIdx) continue;
        
        const constraintValue = constraintValues[predIdx];
        if (constraintValue === null || constraintValue === undefined || !Number.isFinite(constraintValue)) {
          // Missing constraint
          setSolvedX(null);
          return;
        }
        
        const coeffIdx = selectedPredictors.indexOf(predIdx);
        const betaJ = coefficients[coeffIdx + 1].estimate; // +1 for intercept
        sum += betaJ * constraintValue;
      }
      
      // Solve: targetY = β0 + Σ_{j≠i} βj * constraint_j + βi * Xi
      // Xi = (targetY - β0 - Σ_{j≠i} βj * constraint_j) / βi
      const solved = (targetY - sum) / betaI;
      setSolvedX(solved);
      
    } catch (error) {
      setSolvedX(null);
    }
  };

  // Auto-calculate solution when inputs change
  useEffect(() => {
    computeSolvedPredictor();
  }, [targetY, solveForPredictorIdx, constraintValues, regressionResult, selectedPredictors]);

  const handleSaveSolvingSetup = async () => {
    // Get current config data from loaded data
    const config = configQuery.data as any;
    
    const configData = {
      responseVariableName: config?.responseVariableName || responseVariableName,
      predictorNames: config?.predictorNames || predictorNames,
      dataX: config?.dataX || [],
      dataY: config?.dataY || [],
      selectedPredictors: config?.selectedPredictors || selectedPredictors,
      significanceLevel: config?.significanceLevel || significanceLevel,
      // Solve for X settings
      targetY,
      solveForPredictorIdx,
      constraintValues,
    };
    
    await saveSolvingSetupMutation.mutateAsync(configData);
  };

  // Load active tab from localStorage on mount
  useEffect(() => {
    const storageKey = `multipleRegression:activeTab:${projectId}:${solutionId}`;
    const savedTab = localStorage.getItem(storageKey);
    if (savedTab && ['setup', 'data', 'chart', 'analysis'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, [projectId, solutionId]);

  // Save active tab to localStorage when it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const storageKey = `multipleRegression:activeTab:${projectId}:${solutionId}`;
    localStorage.setItem(storageKey, value);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Data Entry</TabsTrigger>
          <TabsTrigger value="chart" data-testid="tab-chart">Chart</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-4">
            {/* Variable Names */}
            <Card>
              <CardHeader>
                <CardTitle>Variable Names</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Y Response Variable Name</Label>
                  <Input
                    value={responseVariableName}
                    onChange={(e) => setResponseVariableName(e.target.value)}
                    placeholder="Y Response"
                    data-testid="input-response-name"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>X Predictor Variable Names</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddPredictor}
                        data-testid="button-add-predictor"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemovePredictor}
                        data-testid="button-remove-predictor"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {predictorNames.map((name, idx) => (
                    <Input
                      key={idx}
                      value={name}
                      onChange={(e) => {
                        const newNames = [...predictorNames];
                        newNames[idx] = e.target.value;
                        setPredictorNames(newNames);
                      }}
                      placeholder={`X${idx + 1} Predictor`}
                      data-testid={`input-predictor-name-${idx}`}
                    />
                  ))}
                  <div>
                    <Label htmlFor="significanceLevel" data-testid="label-significance-level">Significance Level (α)</Label>
                    <Select
                      value={significanceLevel.toString()}
                      onValueChange={(value) => setSignificanceLevel(parseFloat(value))}
                    >
                      <SelectTrigger id="significanceLevel" data-testid="select-significance-level">
                        <SelectValue placeholder="Select significance level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.01" data-testid="option-significance-0.01">0.01</SelectItem>
                        <SelectItem value="0.05" data-testid="option-significance-0.05">0.05</SelectItem>
                        <SelectItem value="0.10" data-testid="option-significance-0.10">0.10</SelectItem>
                        <SelectItem value="0.20" data-testid="option-significance-0.20">0.20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={handleSaveData}
                      disabled={saveDataMutation.isPending}
                      data-testid="button-save-data"
                    >
                      {saveDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Setup
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
            {/* Data Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Data Entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Paste Excel data: Copy columns from Excel (Y Response in first column, then X predictors) to the clipboard (Ctrl+C), then click on a cell in the table below and paste (Ctrl+V) or use the "Paste from Excel" button.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handlePasteFromExcel}
                    data-testid="button-paste-from-excel"
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    Paste from Excel
                  </Button>
                </div>

                <div className="overflow-auto max-h-96" onPaste={handlePaste}>
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="w-16 px-4 py-2 text-left text-sm font-medium">#</th>
                        {responseVariableName ?
                          <th className="min-w-32 px-4 py-2 text-left text-sm font-medium">{responseVariableName}</th>
                          :
                          <th className="min-w-32 px-4 py-2 text-left text-sm font-medium">Y Response</th>
                        }
                        
                        {predictorNames.map((name, idx) => (
                          name ? <th key={idx} className="min-w-32 px-4 py-2 text-left text-sm font-medium">{name}</th>
                          :
                          <th key={idx} className="min-w-32 px-4 py-2 text-left text-sm font-medium">{`X${idx + 1}`}</th>
                        ))}
                        <th className="w-[80px] px-4 py-2 text-left text-sm font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataY.map((_, rowIdx) => (
                        <tr key={rowIdx}>
                          <td className="text-center text-muted-foreground">
                            {rowIdx + 1}
                          </td>
                          <td>
                            <Input
                              type="number"
                              value={isNaN(dataY[rowIdx]) ? '' : String(dataY[rowIdx])}
                              onChange={(e) => handleCellChange(rowIdx, -1, e.target.value, true)}
                              placeholder="Enter value"
                              className="w-full"
                              data-testid={`input-y-${rowIdx}`}
                            />
                          </td>
                          {predictorNames.map((_, colIdx) => (
                            <td key={colIdx}>
                              <Input
                                type="number"
                                value={isNaN(dataX[colIdx][rowIdx]) ? '' : String(dataX[colIdx][rowIdx])}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value, false)}
                                placeholder="Enter value"
                                className="w-full"
                                data-testid={`input-x${colIdx}-${rowIdx}`}
                              />
                            </td>
                          ))}
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleRemoveRow}
                              data-testid="button-remove-row"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleAddRow}
                    data-testid="button-add-row"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUndo}
                    disabled={dataHistory.length === 0}
                    data-testid="button-undo"
                  >
                    <Undo className="mr-2 h-4 w-4" />
                    Undo
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowClearDialog(true)}
                    data-testid="button-clear-data"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                  <Button
                    onClick={handleSaveData}
                    disabled={saveDataMutation.isPending}
                    data-testid="button-save-data"
                  >
                    {saveDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Data
                  </Button>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
            {regressionResult && selectedPredictors.length >= 2 ? (
              <Card>
                <CardHeader>
                  <CardTitle>3D Scatter Plot of Y Response (Z-axis)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Predictor A (X-Axis)</Label>
                      <Select
                        value={String(plot3DFactorX)}
                        onValueChange={(val) => setPlot3DFactorX(parseInt(val))}
                      >
                        <SelectTrigger data-testid="select-3d-factor-x">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPredictors.map(predIdx => (
                            <SelectItem key={predIdx} value={String(predIdx)}>
                              {predictorNames[predIdx]  || `X${predIdx + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Predictor B (Y-Axis)</Label>
                      <Select
                        value={String(plot3DFactorY)}
                        onValueChange={(val) => setPlot3DFactorY(parseInt(val))}
                      >
                        <SelectTrigger data-testid="select-3d-factor-y">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPredictors.map(predIdx => (
                            <SelectItem key={predIdx} value={String(predIdx)}>
                              {predictorNames[predIdx]  || `X${predIdx + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Plot
                    data={[
                      {
                        type: 'scatter3d',
                        mode: 'markers',
                        x: dataX[plot3DFactorX]?.filter((_, i) => 
                          !isNaN(dataY[i]) && 
                          selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [],
                        y: dataX[plot3DFactorY]?.filter((_, i) => 
                          !isNaN(dataY[i]) && 
                          selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [],
                        z: dataY.filter((y, i) => 
                          !isNaN(y) && 
                          selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [],
                        marker: {
                          size: 4,
                          color: 'rgb(59, 130, 246)',
                          opacity: 0.8,
                        },
                        name: 'Regression point',
                        hoverlabel: {
                          namelength: -1,  // Show full text without truncation
                          // You can also add:
                          //font: { size: 12 },
                          //bgcolor: 'white',
                          //bordercolor: 'black',
                        },
                        hovertemplate:
                        `Regression point:<br>` +
                          `${predictorNames[plot3DFactorX] || `X${plot3DFactorX + 1}`}: %{x}<br>` +
                          `${predictorNames[plot3DFactorY] || `X${plot3DFactorY + 1}`}: %{y}<br>` +
                          `${responseVariableName || `Y Response`}: %{z}<extra></extra>`,
                      } as any,

                      // Regression surface mesh (only for 1 or 2 predictors)
                      ...(regressionResult && selectedPredictors.length <= 2 && (() => {
                        // Check if the displayed axes match the selected predictors
                        const displayedPredictors = [plot3DFactorX, plot3DFactorY];
                        const allDisplayedAreSelected = displayedPredictors.every(p => selectedPredictors.includes(p));
                        
                        if (!allDisplayedAreSelected) return [];
                        
                        // Get data ranges
                        const xData = dataX[plot3DFactorX]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        const yData = dataX[plot3DFactorY]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        
                        if (xData.length === 0 || yData.length === 0) return [];
                        
                        const xMin = Math.min(...xData);
                        const xMax = Math.max(...xData);
                        const yMin = Math.min(...yData);
                        const yMax = Math.max(...yData);
                        
                        // Create grid
                        const gridSize = 20;
                        const xGrid = [];
                        const yGrid = [];
                        const zGrid = [];
                        
                        for (let i = 0; i <= gridSize; i++) {
                          const xRow = [];
                          const yRow = [];
                          const zRow = [];
                          
                          for (let j = 0; j <= gridSize; j++) {
                            const x = xMin + (xMax - xMin) * i / gridSize;
                            const y = yMin + (yMax - yMin) * j / gridSize;
                            
                            // Calculate Z using regression equation
                            let z = regressionResult.coefficients[0].estimate; // Intercept
                            
                            // Add contribution from each selected predictor
                            selectedPredictors.forEach((predIdx, idx) => {
                              const coeff = regressionResult.coefficients[idx + 1].estimate;
                              if (predIdx === plot3DFactorX) {
                                z += coeff * x;
                              } else if (predIdx === plot3DFactorY) {
                                z += coeff * y;
                              } else {
                                // Use constraint value for other predictors
                                z += coeff * (constraintValues[predIdx] ?? 0);
                              }
                            });
                            
                            xRow.push(x);
                            yRow.push(y);
                            zRow.push(z);
                          }
                          
                          xGrid.push(xRow);
                          yGrid.push(yRow);
                          zGrid.push(zRow);
                        }
                        
                        return [{
                          type: 'surface',
                          x: xGrid,
                          y: yGrid,
                          z: zGrid,
                          opacity: 0.5,
                          colorscale: 'Viridis',
                          name: 'Regression model',
                          showscale: false,
                          showlegend: true,
                          hoverlabel: {
                            namelength: -1,  // Show full text without truncation
                            // You can also add:
                            //font: { size: 12 },
                            //bgcolor: 'white',
                            //bordercolor: 'black',
                          },
                          hovertemplate: 
                          `Regression equation:<br>` +
                          `${responseVariableName || `Y`} = ${regressionResult.coefficients[0].estimate.toFixed(4)}` +
                          `${selectedPredictors.map((predIdx, i) => {
                            const coeff = regressionResult.coefficients[i + 1].estimate;
                            const sign = coeff >= 0 ? ' + ' : ' - ';
                            return `${sign}${Math.abs(coeff).toFixed(4)}*${predictorNames[predIdx]}`;
                          }).join('')}<br>` +
                            `${predictorNames[plot3DFactorX] || `X${plot3DFactorX + 1}`}: %{x:.2f}<br>` +
                            `${predictorNames[plot3DFactorY] || `X${plot3DFactorY + 1}`}: %{y:.2f}<br>` +
                            `Predicted ${responseVariableName || 'Y'}: %{z:.2f}<extra></extra>`,
                        }];
                      })() || []),

                      // Target Y plane (horizontal)
                      ...(targetY !== null && (() => {
                        const xData = dataX[plot3DFactorX]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        const yData = dataX[plot3DFactorY]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        
                        if (xData.length === 0 || yData.length === 0) return [];
                        
                        const x = solveForPredictorIdx === plot3DFactorX ? solvedX! : constraintValues[plot3DFactorX]! ?? NaN;
                        const y = solveForPredictorIdx === plot3DFactorY ? solvedX! : constraintValues[plot3DFactorY]! ?? NaN;
                        const xMin = Math.min(...xData, x);
                        const xMax = Math.max(...xData, x);

                        const yMin = Math.min(...yData, y);
                        const yMax = Math.max(...yData, y);
                        
                        return [{
                          //type: 'mesh3d',
                          type: 'scatter3d',
                          mode: 'lines',
                          x: [xMin, xMax, xMax, xMin, xMin],
                          y: [yMin, yMin, yMax, yMax, yMin],
                          z: [targetY, targetY, targetY, targetY, targetY],
                          //opacity: 0.3,
                          //color: 'orange',
                          line: { color: 'orange', width: 4, dash: 'dash' },
                          name: `Target Y = ${targetY.toFixed(4)}`,
                          hoverlabel: {
                            namelength: -1,  // Show full text without truncation
                            // You can also add:
                            //font: { size: 12 },
                            //bgcolor: 'white',
                            //bordercolor: 'black',
                          },
                          hoverinfo: 'name',
                          showlegend: true,
                        }];
                      })() || []),
                      // Constraint line or Solved for Predictor plot3DFactorX (if it has a value)
                      ...((() => {
                        const xVal = solveForPredictorIdx === plot3DFactorX ? solvedX : constraintValues[plot3DFactorX];
                        
                        if (xVal === null || xVal === undefined) return [];

                        const yData = dataX[plot3DFactorY]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        const zData = dataY.filter((y, i) => 
                          !isNaN(y) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        
                        if (yData.length === 0 || zData.length === 0) return [];
                        
                        const y = solveForPredictorIdx === plot3DFactorY ? solvedX! : constraintValues[plot3DFactorY]! ?? NaN;
                        const yMin = Math.min(...yData, y);
                        const yMax = Math.max(...yData, y);
                        const zMin = Math.min(...zData, targetY !== null ? targetY : NaN);
                        const zMax = Math.max(...zData, targetY !== null ? targetY : NaN);                        

                        const myName = solveForPredictorIdx === plot3DFactorX ? `Solving for ` : `Constraint `; 

                        return [{
                          type: 'scatter3d',
                          mode: 'lines',
                          x: [xVal, xVal, xVal, xVal, xVal],
                          y: [yMin, yMin, yMax, yMax, yMin],
                          z: [zMin, zMax, zMax, zMin, zMin],
                          line: { color: 'red', width: 4, dash: 'dash' },
                          name: myName + `${predictorNames[plot3DFactorX]} = ${xVal.toFixed(2)}`,
                          hoverlabel: {
                            namelength: -1,  // Show full text without truncation
                            // You can also add:
                            //font: { size: 12 },
                            //bgcolor: 'white',
                            //bordercolor: 'black',
                          },
                          hoverinfo: 'name',
                        }];
                      })() || []),
                      // Constraint line or Solved for Predictor plot3DFactorY (if it has a value)
                      ...((() => {
                        const yVal = solveForPredictorIdx === plot3DFactorY ? solvedX : constraintValues[plot3DFactorY];
                        
                        if (yVal === null || yVal === undefined) return [];
                        
                        const xData = dataX[plot3DFactorX]?.filter((_, i) => 
                          !isNaN(dataY[i]) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        const zData = dataY.filter((y, i) => 
                          !isNaN(y) && selectedPredictors.every(predIdx => !isNaN(dataX[predIdx][i]))
                        ) || [];
                        
                        if (xData.length === 0 || zData.length === 0) return [];
                        
                        const x = solveForPredictorIdx === plot3DFactorX ? solvedX! : constraintValues[plot3DFactorX]! ?? NaN;
                        
                        const xMin = Math.min(...xData, x);
                        const xMax = Math.max(...xData, x);
                        const zMin = Math.min(...zData, targetY !== null ? targetY : NaN);
                        const zMax = Math.max(...zData, targetY !== null ? targetY : NaN);
                        const myName = solveForPredictorIdx === plot3DFactorY ? `Solving for ` : `Constraint `;  
                        
                        return [{
                          type: 'scatter3d',
                          mode: 'lines',
                          x: [xMin, xMin, xMax, xMax, xMin],
                          y: [yVal, yVal, yVal, yVal, yVal],
                          z: [zMin, zMax, zMax, zMin, zMin],
                          line: { color: 'green', width: 4, dash: 'dash' },
                          name: myName + `${predictorNames[plot3DFactorY]} = ${yVal.toFixed(2)}`,
                          hoverlabel: {
                            namelength: -1,  // Show full text without truncation
                            // You can also add:
                            //font: { size: 12 },
                            //bgcolor: 'white',
                            //bordercolor: 'black',
                          },
                          hoverinfo: 'name',
                        }];
                      })() || []),
                      // Solved point (always show when available)
                      ...(solvedX !== null && targetY !== null && solveForPredictorIdx !== null ? [{
                        type: 'scatter3d',
                        mode: 'markers',
                        x: [solveForPredictorIdx === plot3DFactorX ? solvedX : (constraintValues[plot3DFactorX] ?? 0)],
                        y: [solveForPredictorIdx === plot3DFactorY ? solvedX : (constraintValues[plot3DFactorY] ?? 0)],
                        z: [targetY],
                        marker: {
                          size: 6,
                          color: 'purple',
                          symbol: 'diamond',
                        },
                        name: `Solution point`,
                        hoverlabel: {
                          namelength: -1,  // Show full text without truncation
                          // You can also add:
                          //font: { size: 12 },
                          //bgcolor: 'white',
                          //bordercolor: 'black',
                        },
                        hovertemplate:
                        `Solution point:<br>` +
                          `${predictorNames[plot3DFactorX] || `X${plot3DFactorX + 1}`}: %{x}<br>` +
                          `${predictorNames[plot3DFactorY] || `X${plot3DFactorY + 1}`}: %{y}<br>` +
                          `Target ${responseVariableName || 'Y'}: %{z}<extra></extra>`,
                      } as any] : []),
                      // Legend entry for solved predictor if not displayed on axes
                      ...(solvedX !== null && solveForPredictorIdx !== null && 
                          solveForPredictorIdx !== plot3DFactorX && 
                          solveForPredictorIdx !== plot3DFactorY ? [{
                        type: 'scatter3d',
                        mode: 'markers',
                        x: [null],
                        y: [null],
                        z: [null],
                        marker: { size: 0 },
                        name: `Solved ${predictorNames[solveForPredictorIdx]} = ${solvedX.toFixed(4)}`,
                        showlegend: true,
                        hoverinfo: 'skip',
                      } as any] : []),
                      // Legend entries for constraints on selected predictors (not displayed on axes)
                      ...(Object.entries(constraintValues)
                        .filter(([predIdxStr, value]) => {
                          const predIdx = parseInt(predIdxStr);
                          return value !== null && value !== undefined && 
                                 predIdx !== plot3DFactorX && predIdx !== plot3DFactorY &&
                                 selectedPredictors.includes(predIdx);
                        })
                        .map(([predIdxStr, value]) => {
                          const predIdx = parseInt(predIdxStr);
                          return {
                            type: 'scatter3d',
                            mode: 'markers',
                            x: [null],
                            y: [null],
                            z: [null],
                            marker: { size: 0 },
                            name: `Constraint ${predictorNames[predIdx]} = ${(value as number).toFixed(2)}`,
                            showlegend: true,
                            hoverinfo: 'skip',
                          } as any;
                        })
                      ),
                    ]}
                  layout={{
                      autosize: true,
                      title: { text: '<b>3D Scatter Plot of ' + (responseVariableName || 'Y Response') + '</b>', font: { size: 16 } },
                      scene: {
                        xaxis: { title: { text: '<b>'+(predictorNames[plot3DFactorX] || `X${plot3DFactorX + 1}`) + '</b>' } },
                        yaxis: { title: { text: '<b>'+(predictorNames[plot3DFactorY] || `X${plot3DFactorY + 1}`) + '</b>' } },
                        zaxis: { title: { text: '<b>'+(responseVariableName || 'Y Response')+'</b>' } },
                      },
                      legend: { title: {text: 'Click on any legend below<br>to show/hide the 3D graph<br>elements'}, font: { size: 10 },
                      x: 0.9, y: 0.47 },
                      margin: { l: 0, r: 0, b: 0, t: 40 },
                    }}   
                    /*scene: {
                        xaxis: { title: { text: {predictorNames[plot3DFactorX] ? (`<b>${predictorNames[plot3DFactorX]}</b>`) : (`<b>X${plot3DFactorX + 1}</b>`) } }},
                        yaxis: { title: { text: `<b>${predictorNames[plot3DFactorY]}</b>` || `<b>X${plot3DFactorY + 1}</b>` } },
                        zaxis: { title: { text: `<b>${responseVariableName}</b>` || "<b>Y Response</b>" } },
                      }, */               
                    useResizeHandler
                    style={{ width: '100%', height: '500px' }}
                    config={{
                      responsive: true,
                      displayModeBar: true,
                      displaylogo: false,
                      toImageButtonOptions: {
                        format: 'png',
                        filename: `Multiple_Regression_Chart_${responseVariableName || 'Y Response'}=f(${predictorNames[plot3DFactorX] || 'X'}${plot3DFactorX + 1}, ${predictorNames[plot3DFactorY] || 'X'}${plot3DFactorY + 1})`,
                        height: 500,
                        width: 800,
                        scale: 1
                      }
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {selectedPredictors.length < 2 
                      ? "Select at least 2 predictors in the Analysis tab to view the 3D chart of Y Response"
                      : "Enter data in the Data Entry tab to view the 3D chart"
                    }
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
            {regressionResult ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Regression Equation
                      {selectedPredictors.length < predictorNames.length && (
                        <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-4 text-sm font-normal">Reduced Model</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-mono">
                        Y = {regressionResult.coefficients[0].estimate.toFixed(4)}
                        {regressionResult.coefficients.slice(1).map((coef, idx) => {
                          const sign = coef.estimate >= 0 ? ' + ' : ' - ';
                          const absValue = Math.abs(coef.estimate).toFixed(4);
                          return `${sign}${absValue}(${coef.term})`;
                        }).join('')}
                      </p>
                      <p className="text-lg font-mono text-blue-600 dark:text-blue-400 mt-1">
                        {responseVariableName || `Y Response`} = {regressionResult.coefficients[0].estimate.toFixed(4)}
                        {regressionResult.coefficients.slice(1).map((coef, idx) => {
                          const sign = coef.estimate >= 0 ? ' + ' : ' - ';
                          const absValue = Math.abs(coef.estimate).toFixed(4);
                          return `${sign}${absValue}*${predictorNames[selectedPredictors[idx]] || coef.term}`;
                        }).join('')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        where {regressionResult.coefficients[0].estimate.toFixed(4)} is the intercept
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Coefficients Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                      Coefficients
                      {selectedPredictors.length < predictorNames.length && (
                        <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                      )}
                    </CardTitle>
                    <Button
                      onClick={() => saveSelectedCoefficientsMutation.mutate()}
                      disabled={saveSelectedCoefficientsMutation.isPending}
                      size="sm"
                      data-testid="button-save-selected-coefficients"
                    >
                      {saveSelectedCoefficientsMutation.isPending ? "Saving..." : "Save Selected Coefficients"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>                            
                            <TableHead>Term</TableHead>
                            <TableHead className="text-right">Coefficient</TableHead>
                            <TableHead className="text-right">Std. Error</TableHead>
                            <TableHead className="text-right">T-value</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                            <TableHead className="text-right">VIF</TableHead>
                            <TableHead className="text-center">Include</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Intercept (always included) */}
                          {regressionResult.coefficients.length > 0 && (() => {
                            const coef = regressionResult.coefficients[0];
                            const isPValueSignificant = coef.pValue < significanceLevel;
                            
                            return (
                              <TableRow key={0}>
                                <TableCell className="font-medium" data-testid={`coef-term-0`}>
                                  {coef.term}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-estimate-0`}>
                                  {coef.estimate.toFixed(6)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-stderr-0`}>
                                  {coef.stdError.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-tvalue-0`}>
                                  {coef.tValue.toFixed(4)}
                                </TableCell>
                                <TableCell 
                                  className={`text-right ${isPValueSignificant ? 'text-green-600 font-semibold' : ''}`}
                                  data-testid={`coef-pvalue-0`}
                                >
                                  {coef.pValue.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-vif-0`}>
                                  -
                                </TableCell>
                                 <TableCell className="text-center">
                                  -
                                </TableCell>
                              </TableRow>
                            );
                          })()}
                          
                          {/* All predictors (selected and deselected) */}
                          {predictorNames.map((predName, predIdx) => {
                            const isSelected = selectedPredictors.includes(predIdx);
                            const coefIndex = isSelected ? selectedPredictors.indexOf(predIdx) + 1 : -1;
                            const coef = coefIndex > 0 ? regressionResult.coefficients[coefIndex] : null;
                            
                            if (isSelected && coef) {
                              const isPValueSignificant = coef.pValue < significanceLevel;
                              const isHighVIF = coef.vif !== null && coef.vif > 5;
                              const isModerateVIF = coef.vif !== null && coef.vif > 1 && coef.vif <= 5;
                              
                              return (
                                <TableRow key={predIdx}>
                                  <TableCell className="font-medium" data-testid={`coef-term-${predIdx}`}>
                                    {predName ? predName : `X${predIdx + 1}`}
                                  </TableCell>
                                  <TableCell className="text-right" data-testid={`coef-estimate-${predIdx}`}>
                                    {coef.estimate.toFixed(6)}
                                  </TableCell>
                                  <TableCell className="text-right" data-testid={`coef-stderr-${predIdx}`}>
                                    {coef.stdError.toFixed(4)}
                                  </TableCell>
                                  <TableCell className="text-right" data-testid={`coef-tvalue-${predIdx}`}>
                                    {coef.tValue.toFixed(4)}
                                  </TableCell>
                                  <TableCell 
                                    className={`text-right ${isPValueSignificant ? 'text-green-600 font-semibold' : ''}`}
                                    data-testid={`coef-pvalue-${predIdx}`}
                                  >
                                    {coef.pValue.toFixed(4)}
                                  </TableCell>
                                  <TableCell 
                                    className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}
                                    data-testid={`coef-vif-${predIdx}`}
                                  >
                                    {coef.vif !== null ? coef.vif.toFixed(2) : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => togglePredictor(predIdx)}
                                      data-testid={`checkbox-coef-${predIdx}`}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            } else {
                              // Deselected predictor - show grayed out row
                              return (
                                <TableRow key={predIdx} className="bg-gray-50 dark:bg-gray-900/50">
                                  <TableCell className="font-medium text-muted-foreground" data-testid={`coef-term-${predIdx}`}>
                                    {predName || `X${predIdx + 1}`}
                                  </TableCell>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground italic">
                                    <span className="text-sm">Term not included</span>
                                  </TableCell>
                                   <TableCell className="text-center">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => togglePredictor(predIdx)}
                                      data-testid={`checkbox-coef-${predIdx}`}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      VIF &gt; 5 indicates problematic multicollinearity (high correlation between predictors - shown in red)<br></br>
                      &gt; 1 VIF &le; 5 indicates moderate multicollinearity (correlation between predictors - shown in yellow)<br></br>
                      VIF &le; 1 indicates no multicollinearity (no correlation between predictors - shown in black)
                    </div>
                  </CardContent>
                </Card>
                
                {/* Model Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Goodness of Fit
                      {selectedPredictors.length < predictorNames.length && (
                        <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">R²</div>
                        <div className="text-2xl font-bold" data-testid="stat-r-squared">
                          {(regressionResult.rSquared * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Adjusted R²</div>
                        <div className="text-2xl font-bold" data-testid="stat-adj-r-squared">
                          {(regressionResult.rSquaredAdjusted * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Sample Size</div>
                        <div className="text-2xl font-bold" data-testid="stat-n">
                          {regressionResult.n}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Predictors</div>
                        <div className="text-2xl font-bold" data-testid="stat-k">
                          {regressionResult.k}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ANOVA Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      ANOVA Table
                      {selectedPredictors.length < predictorNames.length && (
                        <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">DF</TableHead>
                            <TableHead className="text-right">Sum of Squares</TableHead>
                            <TableHead className="text-right">Mean Square</TableHead>
                            <TableHead className="text-right">F-value</TableHead>
                            <TableHead className="text-right">p-value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {regressionResult.anovaTable.map((row, idx) => {
                            const isPredictor = row.source.startsWith('  ');
                            const isPValueSignificant = row.pValue !== null && row.pValue < significanceLevel;
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className={isPredictor ? "pl-8" : "font-medium"} data-testid={`anova-source-${idx}`}>
                                  {row.source}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`anova-df-${idx}`}>
                                  {row.df}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`anova-ss-${idx}`}>
                                  {row.ss.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`anova-ms-${idx}`}>
                                  {row.ms.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`anova-f-${idx}`}>
                                  {row.fValue !== null ? row.fValue.toFixed(4) : '-'}
                                </TableCell>
                                <TableCell 
                                  className={`text-right ${isPValueSignificant ? 'text-green-600 font-semibold' : ''}`}
                                  data-testid={`anova-p-${idx}`}
                                >
                                  {row.pValue !== null ? row.pValue.toFixed(4) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Residual Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Residual Analysis
                      {selectedPredictors.length < predictorNames.length && (
                        <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold mb-2">Residuals Analysis:</p>
                      <table className="w-full border-collapse">
                        <tbody>
                          <th className="text-sm text-muted-foreground py-2 pr-4 w-1/4">Standard Deviation:</th>
                          <th className="text-sm text-muted-foreground py-2 pr-4 align-top w-3/4">Normality Test (Anderson-Darling):</th>
                          <tr>
                            <td className="font-medium py-2">{regressionResult.residualStd.toFixed(6)}</td>
                            <table className="w-full">
                              <tbody>                         
                                <th className="text-sm text-muted-foreground pb-1 w-1/5">AD Statistic:</th>
                                <th className="text-sm text-muted-foreground pb-1 w 1/5">p-value:</th>
                                <th className="text-sm text-muted-foreground pb-1 w-3/5">Conclusion (5% significance (α)):</th>
                                <tr>
                                  <td className="font-medium pb-1 text-center">{regressionResult.andersonDarlingStatistic.toFixed(4)}</td>
                                  <td className="font-medium pb-1 text-center">{regressionResult.andersonDarlingPValue.toFixed(4)}</td>
                                  <td className={`font-medium pb-1  text-center ${
                                    regressionResult.andersonDarlingNormality === 'Normal' ? 'text-green-600 dark:text-green-400' :
                                    regressionResult.andersonDarlingNormality === 'Not Normal' ? 'text-red-600 dark:text-red-400' :
                                    'text-yellow-600 dark:text-yellow-400'
                                    }`}>
                                    {regressionResult.andersonDarlingNormality}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="residuals-vs-fits"
                          checked={showResidualsVsFits}
                          onCheckedChange={(checked) => setShowResidualsVsFits(!!checked)}
                          data-testid="checkbox-residuals-vs-fits"
                        />
                        <Label htmlFor="residuals-vs-fits">Residuals vs Fitted Values</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="residuals-vs-order"
                          checked={showResidualsVsOrder}
                          onCheckedChange={(checked) => setShowResidualsVsOrder(!!checked)}
                          data-testid="checkbox-residuals-vs-order"
                        />
                        <Label htmlFor="residuals-vs-order">Residuals vs Order</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="normal-prob-plot"
                          checked={showNormalProbPlot}
                          onCheckedChange={(checked) => setShowNormalProbPlot(!!checked)}
                          data-testid="checkbox-normal-prob-plot"
                        />
                        <Label htmlFor="normal-prob-plot">Normal Probability Plot</Label>
                      </div>
                    </div>
                    {(showResidualsVsFits || showResidualsVsOrder || showNormalProbPlot) && regressionResult.residuals && (  
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {showResidualsVsFits && (
                        <Plot
                          data={[
                            {
                              type: 'scatter',
                              mode: 'markers',
                              x: regressionResult.fittedValues,
                              y: regressionResult.residuals,
                              marker: { color: 'rgb(59, 130, 246)', size: 6 },
                            } as any,
                            {
                              type: 'scatter',
                              mode: 'lines',
                              x: regressionResult.fittedValues,
                              y: Array(regressionResult.fittedValues.length).fill(0),
                              line: { color: 'red', dash: 'dash' },
                            } as any,
                          ]}
                          layout={{
                            title: { text: '<b>Residuals vs Fitted Values</b>' },
                            xaxis: { title: { text: '<b>Fitted Values</b>' } },
                            yaxis: { title: { text: '<b>Residuals</b>' } },
                            showlegend: false,
                            margin: { l: 60, r: 80, t: 50, b: 60 },
                          }}
                          style={{ width: '100%', height: '400px' }}
                          useResizeHandler
                          config={{
                            responsive: true,
                            displayModeBar: true,
                            displaylogo: false,
                            toImageButtonOptions: {
                              format: 'png',
                              filename: `Multiple_Regression_${responseVariableName || 'Y Response'}=f(X predictors)_Residuals_vs_Fitted`,
                              height: 500,
                              width: 800,
                              scale: 1
                            }
                          }}
                        />
                      )}
                      
                      {showResidualsVsOrder && (
                        <Plot
                          data={[
                            {
                              type: 'scatter',
                              mode: 'lines+markers',
                              x: Array.from({ length: regressionResult.residuals.length }, (_, i) => i + 1),
                              y: regressionResult.residuals,
                              marker: { color: 'rgb(59, 130, 246)', size: 6 },
                              line: { color: 'rgb(59, 130, 246)' },
                            } as any,
                            {
                              type: 'scatter',
                              mode: 'lines',
                              x: [1, regressionResult.residuals.length],
                              y: [0, 0],
                              line: { color: 'red', dash: 'dash' },
                            } as any,
                          ]}
                          layout={{
                            title: { text: '<b>Residuals vs Observation Order</b>' },
                            xaxis: { title: { text: '<b>Observation Order</b>' } },
                            yaxis: { title: { text: '<b>Residuals</b>' } },
                            showlegend: false,
                            margin: { l: 60, r: 80, t: 50, b: 60 },
                          }}
                          style={{ width: '100%', height: '400px' }}
                          useResizeHandler
                          config={{
                            responsive: true,
                            displayModeBar: true,
                            displaylogo: false,
                            toImageButtonOptions: {
                              format: 'png',
                              filename: `Multiple_Regression_${responseVariableName || 'Y Response'}=f(X predictors)_Residuals_vs_Observation_Order`,
                              height: 500,
                              width: 800,
                              scale: 1
                            }
                          }}
                        />
                      )}

                      {showNormalProbPlot && (() => {
                        const sorted = [...regressionResult.residuals].sort((a, b) => a - b);
                        const n = sorted.length;
                        
                        // Calculate theoretical quantiles (z-scores) for each data point
                        const theoreticalQuantiles = sorted.map((_, i) => {
                          const p = (i + 0.5) / n; // plotting position
                          return jStat.normal.inv(p, 0, 1); // standard normal quantile (z-score)
                        });
                        
                        // Calculate reference line for perfect normality
                        // Line passes through Q1 and Q3 of the data
                        {/*const q1Index = Math.floor(n * 0.25);
                        const q3Index = Math.floor(n * 0.75);
                        const q1Data = sorted[q1Index];
                        const q3Data = sorted[q3Index];
                        const q1Theoretical = jStat.normal.inv(0.25, 0, 1);
                        const q3Theoretical = jStat.normal.inv(0.75, 0, 1);
                        
                        // Calculate slope and intercept
                        const slope = (q3Data - q1Data) / (q3Theoretical - q1Theoretical);
                        const intercept = q1Data - slope * q1Theoretical;
                        
                        // Generate reference line points
                        const minQ = Math.min(...theoreticalQuantiles);
                        const maxQ = Math.max(...theoreticalQuantiles);
                        //const lineY = [minQ, maxQ];
                        //const lineX = lineY.map(x => slope * x + intercept);
                        */}

                        // x-pos at residuals mean. +/- 3 standard deviation
                        const lineX = [regressionResult.residualMean-3*regressionResult.residualStd, regressionResult.residualMean+3*regressionResult.residualStd];
                        const lineY = [-3,3]; //Z=-3 and Z=3 y-pos
                        return (
                          <Plot
                            data={[
                              {
                                type: 'scatter',
                                mode: 'markers',
                                x: sorted,
                                y: theoreticalQuantiles,          
                                marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                name: 'Residuals'
                              } as any,
                              { 
                                type: 'scatter',
                                mode: 'lines',
                                x: lineX,
                                y: lineY,
                                line: { color: 'red', dash: 'dash', width: 2 },
                                name: 'Normal line'
                              } as any,
                            ]}
                            
                            layout={{
                              title: {text:'<b>Normal Probaility (Q-Q) Plot</b>'},
                              xaxis: {
                                title: { text: '<b>Residuals</b>' },
                                zeroline: true,
                                showgrid: true,
                              },
                              yaxis: { 
                                title: { text: '<b>Theoritical Quantiles (Z)</b>' },
                                zeroline: true,
                                showgrid: true,
                              },
                              showlegend: false,
                              margin: { l: 70, r: 80, t: 50, b: 60 },
                            }}

                            useResizeHandler
                            config={{
                              responsive: true,
                              displayModeBar: true,
                              displaylogo: false,
                              toImageButtonOptions: {
                                format: 'png',
                                filename: `Multiple_Regression Normal_Probability_Plot_${responseVariableName || 'Y Response'}_Residuals`,
                                height: 500,
                                width: 600,
                                scale: 1
                              }
                            }}
                            style={{ width: '100%', height: '400px' }}
                          />
                        );
                      })()}
                    
                    </div>
                    )}                    
                  </CardContent>
                </Card>

                <Card className={regressionResult ? '' : 'opacity-60'}>
                  <CardHeader>
                    <CardTitle>Solve for X (given target Y)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!regressionResult && (
                      <div className="p-3 bg-muted rounded-md mb-4">
                        <p className="text-sm text-muted-foreground">
                          Insufficient data for solving equations. Please ensure you have valid regression results in the Graph tab.
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="target-y">Target Y Value (solutions calculated for one Predictor X<sup>i</sup> with constraints on all other predictors)</Label>
                      <Input
                        id="target-y"
                        type="number"
                        step="any"
                        value={targetY || ''}
                        onChange={(e) => setTargetY(parseFloat(e.target.value) || null)}
                        placeholder="Enter target Y value"
                        disabled={!regressionResult}
                        data-testid="input-target-y"
                      />
                    </div>

                    {/* Select Predictor to Solve For */}
                    {targetY !== null && regressionResult && selectedPredictors.length > 0 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="solve-for-predictor">Select Predictor to Solve For</Label>
                          <Select
                            value={solveForPredictorIdx !== null ? String(solveForPredictorIdx) : undefined}
                            onValueChange={(value) => {
                              const idx = parseInt(value);
                              setSolveForPredictorIdx(idx);
                              // Initialize constraint values for other predictors if not set
                              const newConstraints = { ...constraintValues };
                              selectedPredictors.forEach(predIdx => {
                                if (predIdx !== idx && !(predIdx in newConstraints)) {
                                  newConstraints[predIdx] = null;
                                }
                              });
                              setConstraintValues(newConstraints);
                            }}
                          >
                            <SelectTrigger id="solve-for-predictor" data-testid="select-solve-for-predictor">
                              <SelectValue placeholder="Select a predictor" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedPredictors.map(predIdx => (
                                <SelectItem key={predIdx} value={String(predIdx)}>
                                  {predictorNames[predIdx]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Constraint Inputs for Other Predictors */}
                        {solveForPredictorIdx !== null && (
                          <div className="space-y-3">
                            <Label>Set Constraint Values for Other Predictors</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {selectedPredictors
                                .filter(predIdx => predIdx !== solveForPredictorIdx)
                                .map(predIdx => (
                                  <div key={predIdx} className="space-y-1">
                                    <Label htmlFor={`constraint-${predIdx}`} className="text-sm">
                                      {predictorNames[predIdx]}
                                    </Label>
                                    <Input
                                      id={`constraint-${predIdx}`}
                                      type="number"
                                      step="any"
                                      value={constraintValues[predIdx] ?? ''}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                        setConstraintValues({
                                          ...constraintValues,
                                          [predIdx]: value
                                        });
                                      }}
                                      placeholder={`Enter ${predictorNames[predIdx]} value`}
                                      data-testid={`input-constraint-${predIdx}`}
                                    />
                                  </div>
                                ))}
                            </div>

                            {/* Target Y & X Predictor to Solve For information message */}
                            {targetY !== null && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  ℹ️ Target Y value set to <strong>{targetY.toFixed(4)}</strong><br></br>
                                  ℹ️ X Predictor to Solve For set to <strong>{predictorNames[solveForPredictorIdx]}</strong><br></br>
                                  ℹ️ Constraints on other X Predictors: <strong>{Object.entries(constraintValues)
                                    .filter(([predIdxStr]) => parseInt(predIdxStr) !== solveForPredictorIdx)
                                    .map(([predIdxStr, value]) => `${predictorNames[parseInt(predIdxStr)]} = ${value?.toFixed(2) ?? 'not set'}`)
                                    .join(', ')}</strong><br></br>
                                  The solution is presented below and displayed as a diamond-shaped marker on the 3D regression graph.
                                </p>
                              </div>
                            )}

                            
                            {/* Save Solving Setup Button */}
                            <Button
                              onClick={handleSaveSolvingSetup}
                              disabled={saveSolvingSetupMutation.isPending || !regressionResult}
                              className="w-full"
                              data-testid="button-save-solving-setup"
                            >
                              {saveSolvingSetupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Solving Setup
                            </Button>
                          </div>
                        )}

                        {/* Display error messages when no solution */}
                        {solveForPredictorIdx !== null && solvedX === null && targetY !== null && regressionResult && (() => {
                          // Check why no solution
                          const solveCoeffIdx = selectedPredictors.indexOf(solveForPredictorIdx);
                          if (solveCoeffIdx === -1) return null;
                          
                          const betaI = regressionResult.coefficients[solveCoeffIdx + 1].estimate;
                          
                          // Check if coefficient is near zero
                          if (Math.abs(betaI) < 1e-10) {
                            return (
                              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  ❌ <strong>Cannot solve:</strong> The coefficient for {predictorNames[solveForPredictorIdx]} is too close to zero ({betaI.toExponential(2)}). This predictor cannot be uniquely solved. Please select a different predictor.
                                </p>
                              </div>
                            );
                          }
                          
                          // Check for missing constraints
                          const missingConstraints = selectedPredictors
                            .filter(predIdx => predIdx !== solveForPredictorIdx)
                            .filter(predIdx => {
                              const val = constraintValues[predIdx];
                              return val === null || val === undefined || !Number.isFinite(val);
                            });
                          
                          if (missingConstraints.length > 0) {
                            return (
                              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  ⚠️ <strong>Missing constraints:</strong> Please set values for the following predictors: {missingConstraints.map(idx => predictorNames[idx]).join(', ')}
                                </p>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}

                        {/* Display Solution */}
                        {solveForPredictorIdx !== null && solvedX !== null && (() => {
                          // Check if solution is within inference space
                          const validData = dataX[solveForPredictorIdx].filter(v => !isNaN(v));
                          const minX = Math.min(...validData);
                          const maxX = Math.max(...validData);
                          const isInInferenceSpace = solvedX >= minX && solvedX <= maxX;
                          
                          // Check if coefficient is significant
                          const solveCoeffIdx = selectedPredictors.indexOf(solveForPredictorIdx);
                          const coeffRow = regressionResult.coefficients[solveCoeffIdx + 1];
                          const pValue = coeffRow.pValue;
                          const isSignificant = pValue < significanceLevel;
                          
                          return (
                            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg space-y-2 border border-green-200 dark:border-green-800">
                              <p className="font-medium mb-2">Solution:</p>
                              <div className="space-y-2">
                                <p className="text-lg">
                                  <strong>{predictorNames[solveForPredictorIdx]}</strong> = <strong>{solvedX.toFixed(4)}</strong>
                                </p>
                                
                                {!isInInferenceSpace && (
                                  <div className="p-2 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded">
                                    <p className="text-sm text-orange-800 dark:text-orange-200">
                                      ⚠️ <strong>Warning:</strong> Solved value is outside the inference space [{minX.toFixed(4)}, {maxX.toFixed(4)}]. This is extrapolation and may not be reliable.
                                    </p>
                                  </div>
                                )}
                                
                                {!isSignificant && (
                                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                      ⚠️ <strong>Note:</strong> The coefficient for {predictorNames[solveForPredictorIdx]} is not statistically significant (p = {pValue.toFixed(4)}). Consider using a different predictor.
                                    </p>
                                  </div>
                                )}
                                
                                <div className="pt-2 text-sm text-muted-foreground">
                                  <p>Regression equation used:</p>
                                  <p className="font-mono text-xs mt-1">
                                    {responseVariableName || 'Y'} = {regressionResult.coefficients[0].estimate.toFixed(4)}
                                    {selectedPredictors.map((predIdx, i) => {
                                      const coeff = regressionResult.coefficients[i + 1].estimate;
                                      const sign = coeff >= 0 ? ' + ' : ' - ';
                                      return `${sign}${Math.abs(coeff).toFixed(4)}*${predictorNames[predIdx]}`;
                                    }).join('')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {selectedPredictors.length === 0 
                    ? "Please select at least one predictor in the ANOVA table to perform regression analysis."
                    : "Enter data in the Setup tab to perform regression analysis. Need at least " + (selectedPredictors.length + 2) + " valid data points."}
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>

      {/* Clear Data Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all entered data. This action can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData}>Clear Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
