import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Info, Clipboard, Undo } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { HypothesisTestingTabs } from './common/HypothesisTestingTabs';
import { 
  linearRegression, 
  quadraticRegression, 
  cubicRegression,
  solveLinearForX,
  solveQuadraticForX,
  solveCubicForX,
  type LinearRegressionResult,
  type QuadraticRegressionResult,
  type CubicRegressionResult
} from '@/lib/regressionUtils';
import { parseTwoColumnPaste } from '@/lib/excelPasteUtils';
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

interface SimpleRegressionProps {
  projectId: number;
  solutionId: string;
}

interface DataPoint {
  x: number;
  y: number;
}

export function SimpleRegression({ projectId, solutionId }: SimpleRegressionProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  
  const [enableLinear, setEnableLinear] = useState(false);
  const [enableQuadratic, setEnableQuadratic] = useState(false);
  const [enableCubic, setEnableCubic] = useState(false);
  
  const [datasetYDescription, setDatasetYDescription] = useState("Y Variable");
  const [datasetXDescription, setDatasetXDescription] = useState("X Variable");
  
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  
  const [dataPointsHistory, setDataPointsHistory] = useState<DataPoint[][]>([]);
  
  const [targetY, setTargetY] = useState<number | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const [linearResult, setLinearResult] = useState<LinearRegressionResult | null>(null);
  const [quadraticResult, setQuadraticResult] = useState<QuadraticRegressionResult | null>(null);
  const [cubicResult, setCubicResult] = useState<CubicRegressionResult | null>(null);
  
  const [solvedXLinear, setSolvedXLinear] = useState<number | null>(null);
  const [solvedXQuadratic, setSolvedXQuadratic] = useState<number[]>([]);
  const [solvedXCubic, setSolvedXCubic] = useState<number[]>([]);

  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/simple-regression`],
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      setEnableLinear(config.enableLinear || false);
      setEnableQuadratic(config.enableQuadratic || false);
      setEnableCubic(config.enableCubic || false);
      setDatasetYDescription(config.datasetYDescription || "Y Variable");
      setDatasetXDescription(config.datasetXDescription || "X Variable");
      
      if (config.dataX && config.dataY && config.dataX.length > 0) {
        const points: DataPoint[] = config.dataX.map((x: number, i: number) => ({
          x,
          y: config.dataY[i] || 0
        }));
        setDataPoints(points);
      }
      
      if (config.targetY !== null && config.targetY !== undefined) {
        setTargetY(config.targetY);
      }
    }
  }, [configQuery.data]);

  const saveDataMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/simple-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "Your data has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/simple-regression`]
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

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/simple-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Your regression configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/simple-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const saveTargetYMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/simple-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Target Y saved",
        description: "Target Y value has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/simple-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save target Y",
        variant: "destructive",
      });
    },
  });

  const calculateRegressions = (showErrorToast: boolean = false) => {
    // Filter out empty rows (where BOTH x and y are 0) and invalid numbers
    // Valid points can include (0,0) as actual data, but we exclude placeholder empty rows
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && !isNaN(p.y) && (p.x !== 0 || p.y !== 0));
    
    // Only show error toast when explicitly requested (e.g., from Save Data button)
    if (validPoints.length < 2) {
      if (showErrorToast) {
        toast({
          title: "Insufficient data",
          description: "Need at least 2 valid data points for regression analysis",
          variant: "destructive",
        });
      }
      return;
    }
    
    const validX = validPoints.map(p => p.x);
    const validY = validPoints.map(p => p.y);
    
    try {
      if (enableLinear && validPoints.length >= 2) {
        const result = linearRegression(validX, validY);
        setLinearResult(result);
      } else {
        setLinearResult(null);
      }
      
      if (enableQuadratic && validPoints.length >= 3) {
        const result = quadraticRegression(validX, validY);
        setQuadraticResult(result);
      } else {
        setQuadraticResult(null);
      }
      
      if (enableCubic && validPoints.length >= 4) {
        const result = cubicRegression(validX, validY);
        setCubicResult(result);
      } else {
        setCubicResult(null);
      }
    } catch (error: any) {
      if (showErrorToast) {
        toast({
          title: "Calculation error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    // Silently recalculate when checkboxes or data change (no error toast)
    calculateRegressions(false);
  }, [dataPoints, enableLinear, enableQuadratic, enableCubic]);

  const saveToHistory = () => {
    const MAX_HISTORY = 20;
    setDataPointsHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(dataPoints))];
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (dataPointsHistory.length === 0) {
      toast({
        title: "Nothing to undo",
        description: "No previous data state available.",
        variant: "destructive",
      });
      return;
    }

    const previousState = dataPointsHistory[dataPointsHistory.length - 1];
    setDataPoints(JSON.parse(JSON.stringify(previousState)));
    setDataPointsHistory(prev => prev.slice(0, -1));
    
    toast({
      title: "Undo successful",
      description: "Reverted to previous data state.",
    });
  };

  const handleSaveData = async () => {
    // Remove trailing (0,0) points from the end only
    // This preserves valid (0,0) data points in the middle
    let trimmedPoints = [...dataPoints];
    while (trimmedPoints.length > 0 && 
           trimmedPoints[trimmedPoints.length - 1].x === 0 && 
           trimmedPoints[trimmedPoints.length - 1].y === 0) {
      trimmedPoints.pop();
    }
    
    const xData = trimmedPoints.map(p => p.x);
    const yData = trimmedPoints.map(p => p.y);
    
    const data = {
      enableLinear,
      enableQuadratic,
      enableCubic,
      datasetYDescription,
      datasetXDescription,
      dataX: xData,
      dataY: yData,
      targetY,
    };
    
    await saveDataMutation.mutateAsync(data);
  };

  const handleSaveConfiguration = async () => {
    // Remove trailing (0,0) points from the end only
    // This preserves valid (0,0) data points in the middle
    let trimmedPoints = [...dataPoints];
    while (trimmedPoints.length > 0 && 
           trimmedPoints[trimmedPoints.length - 1].x === 0 && 
           trimmedPoints[trimmedPoints.length - 1].y === 0) {
      trimmedPoints.pop();
    }
    
    const xData = trimmedPoints.map(p => p.x);
    const yData = trimmedPoints.map(p => p.y);
    
    const configData = {
      enableLinear,
      enableQuadratic,
      enableCubic,
      datasetYDescription,
      datasetXDescription,
      dataX: xData,
      dataY: yData,
      targetY,
    };
    
    await saveConfigMutation.mutateAsync(configData);
  };

  const handleClearAll = () => {
    setShowClearDialog(true);
  };

  const confirmClearAll = () => {
    saveToHistory();
    setDataPoints([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    setLinearResult(null);
    setQuadraticResult(null);
    setCubicResult(null);
    setSolvedXLinear(null);
    setSolvedXQuadratic([]);
    setSolvedXCubic([]);
    setTargetY(null);
    setShowClearDialog(false);
    toast({
      title: "Data cleared",
      description: "All data has been cleared successfully.",
    });
  };

  const handleAddRow = () => {
    saveToHistory();
    setDataPoints([...dataPoints, { x: 0, y: 0 }]);
  };

  const handleDeleteRow = (index: number) => {
    if (dataPoints.length > 1) {
      saveToHistory();
      setDataPoints(dataPoints.filter((_, i) => i !== index));
    }
  };

  const handleDataChange = (index: number, field: 'x' | 'y', value: string) => {
    // Convert French decimal format (comma to dot)
    const convertedValue = value.replace(/,/g, '.');
    
    // Parse the value - allow empty string to become 0, otherwise parse as float
    // This supports positive, negative, and decimal numbers
    let numValue: number;
    if (convertedValue === '' || convertedValue === '-') {
      numValue = 0;
    } else {
      const parsed = parseFloat(convertedValue);
      numValue = isNaN(parsed) ? 0 : parsed;
    }
    
    const newPoints = [...dataPoints];
    while (newPoints.length <= index) {
      newPoints.push({ x: 0, y: 0 });
    }
    newPoints[index][field] = numValue;
    setDataPoints(newPoints);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    const result = parseTwoColumnPaste(pastedText);
    
    if (!result.success) {
      toast({
        title: "Paste error",
        description: result.errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    if (result.columnX.length > 0) {
      saveToHistory();
      const newPoints = result.columnX.map((x, i) => ({
        x,
        y: result.columnY[i] || 0
      }));
      setDataPoints(newPoints);
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${newPoints.length} data points`,
      });
    }
  };

  const handlePasteFromExcel = async () => {
    try {
      const text = await navigator.clipboard.readText();
      
      const result = parseTwoColumnPaste(text);
      
      if (!result.success) {
        toast({
          title: "Paste error",
          description: result.errors.join(', '),
          variant: "destructive",
        });
        return;
      }
      
      if (result.columnX.length > 0) {
        saveToHistory();
        const newPoints = result.columnX.map((x, i) => ({
          x,
          y: result.columnY[i] || 0
        }));
        setDataPoints(newPoints);
        toast({
          title: "Data pasted",
          description: `Successfully pasted ${newPoints.length} data points`,
        });
      }
    } catch (err) {
      toast({
        title: "Clipboard access denied",
        description: "Please allow clipboard access or use Ctrl+V to paste data directly in the table",
        variant: "destructive",
      });
    }
  };

  const calculateSolutions = () => {
    if (targetY === null || targetY === 0) {
      setSolvedXLinear(null);
      setSolvedXQuadratic([]);
      setSolvedXCubic([]);
      return;
    }
    
    try {
      if (enableLinear && linearResult) {
        const x = solveLinearForX(linearResult.a, linearResult.b, targetY);
        setSolvedXLinear(x);
      } else {
        setSolvedXLinear(null);
      }
      
      if (enableQuadratic && quadraticResult) {
        const roots = solveQuadraticForX(quadraticResult.a, quadraticResult.b, quadraticResult.c, targetY);
        setSolvedXQuadratic(roots);
      } else {
        setSolvedXQuadratic([]);
      }
      
      if (enableCubic && cubicResult) {
        const roots = solveCubicForX(cubicResult.a, cubicResult.b, cubicResult.c, cubicResult.d, targetY);
        setSolvedXCubic(roots);
      } else {
        setSolvedXCubic([]);
      }
    } catch (error: any) {
      // Silent error - just clear solutions
      setSolvedXLinear(null);
      setSolvedXQuadratic([]);
      setSolvedXCubic([]);
    }
  };

  // Auto-calculate solutions when targetY or regression results change
  useEffect(() => {
    calculateSolutions();
  }, [targetY, linearResult, quadraticResult, cubicResult, enableLinear, enableQuadratic, enableCubic]);

  const handleSaveTargetY = async () => {
    // Get current config data from loaded data
    const config = configQuery.data as any;
    
    const configData = {
      enableLinear: config?.enableLinear || enableLinear,
      enableQuadratic: config?.enableQuadratic || enableQuadratic,
      enableCubic: config?.enableCubic || enableCubic,
      datasetYDescription: config?.datasetYDescription || datasetYDescription,
      datasetXDescription: config?.datasetXDescription || datasetXDescription,
      dataX: config?.dataX || [],
      dataY: config?.dataY || [],
      targetY,
    };
    
    await saveTargetYMutation.mutateAsync(configData);
  };

  const setupContent = (
    <Card>
      <CardHeader>
        <CardTitle>Simple Regression Type Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select the regression models you want to analyze (select multiple):
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-linear"
              checked={enableLinear}
              onCheckedChange={(checked) => setEnableLinear(checked as boolean)}
              data-testid="checkbox-enable-linear"
            />
            <Label htmlFor="enable-linear" className="cursor-pointer">
              Linear Regression (Y = a + bX)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-quadratic"
              checked={enableQuadratic}
              onCheckedChange={(checked) => setEnableQuadratic(checked as boolean)}
              data-testid="checkbox-enable-quadratic"
            />
            <Label htmlFor="enable-quadratic" className="cursor-pointer">
              Quadratic Regression (Y = a + bX + cX²)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-cubic"
              checked={enableCubic}
              onCheckedChange={(checked) => setEnableCubic(checked as boolean)}
              data-testid="checkbox-enable-cubic"
            />
            <Label htmlFor="enable-cubic" className="cursor-pointer">
              Cubic Regression (Y = a + bX + cX² + dX³)
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div>
            <Label htmlFor="y-description">Y Variable Description (Response)</Label>
            <Input
              id="y-description"
              value={datasetYDescription}
              onChange={(e) => setDatasetYDescription(e.target.value)}
              placeholder="Response"
              title="Enter your Y Variable Description (Response)"
              data-testid="input-y-description"
            />
          </div>
          <div>
            <Label htmlFor="x-description">X Variable Description (Predictor)</Label>
            <Input
              id="x-description"
              value={datasetXDescription}
              onChange={(e) => setDatasetXDescription(e.target.value)}
              placeholder="e.g., Input, Predictor, Independent Variable"
              title="Enter your X Variable Description (Predictor). This should be an Independent Variable."
              data-testid="input-x-description"
            />
          </div>
        </div>

        <Button
          onClick={handleSaveConfiguration}
          disabled={saveConfigMutation.isPending}
          className="w-full"
          data-testid="button-save-setup"
        >
          {saveConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );

  const dataContent = (
    <Card>
      <CardHeader>
        <CardTitle>Data Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Paste Excel data: Select cells in Excel, copy them to the clipboard (Ctrl+C), then click on a cell in the table below and paste the content of the clipboard (Ctrl+V) or use the "Paste from Excel" button.
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

        <div className="overflow-auto max-h-[400px] border rounded-lg" onPaste={handlePaste}>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{datasetXDescription}</th>
                <th className="px-4 py-2 text-left text-sm font-medium">{datasetYDescription}</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(dataPoints.length, 10) }, (_, index) => {
                const point = dataPoints[index] || { x: 0, y: 0 };
                const isActualRow = index < dataPoints.length;
                
                return (
                  <tr key={index} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2 text-sm">{index + 1}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="any"
                        value={point.x === 0 ? '' : point.x}
                        onChange={(e) => {
                          if (!isActualRow) {
                            // Auto-add row if typing in empty row
                            const newPoints = [...dataPoints];
                            while (newPoints.length <= index) {
                              newPoints.push({ x: 0, y: 0 });
                            }
                            setDataPoints(newPoints);
                          }
                          handleDataChange(index, 'x', e.target.value);
                        }}
                        className="w-full"
                        data-testid={`input-x-${index}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="any"
                        value={point.y === 0 ? '' : point.y}
                        onChange={(e) => {
                          if (!isActualRow) {
                            // Auto-add row if typing in empty row
                            const newPoints = [...dataPoints];
                            while (newPoints.length <= index) {
                              newPoints.push({ x: 0, y: 0 });
                            }
                            setDataPoints(newPoints);
                          }
                          handleDataChange(index, 'y', e.target.value);
                        }}
                        className="w-full"
                        data-testid={`input-y-${index}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRow(index)}
                        disabled={!isActualRow || dataPoints.length <= 1}
                        data-testid={`button-delete-row-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleAddRow}
            data-testid="button-add-row"
          >
            Add Row
          </Button>
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={dataPointsHistory.length === 0}
            data-testid="button-undo"
          >
            <Undo className="mr-2 h-4 w-4" />
            Undo
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAll}
            data-testid="button-clear-all-data"
          >
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

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all data points and regression results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );

  const graphContent = (
    <Card>
      <CardHeader>
        <CardTitle>Regression Graph</CardTitle>
        {(linearResult || quadraticResult || cubicResult) && (
          <div className="mt-3 space-y-2 text-sm">
            {linearResult && enableLinear && (
              <div className="font-mono text-red-600 dark:text-red-400">
                Linear model: {linearResult.equation} (R²={linearResult.r2.toFixed(4)}) (R²-Adj={linearResult.statistics.r2Adjusted.toFixed(4)}) (Pearson correlation coefficient r={linearResult.pearsonR.toFixed(4)})
              </div>
            )}
            {quadraticResult && enableQuadratic && (
              <div className="font-mono text-green-600 dark:text-green-400">
                Quadratic model: {quadraticResult.equation} (R²={quadraticResult.r2.toFixed(4)}) (R²-Adj={quadraticResult.statistics.r2Adjusted.toFixed(4)})
              </div>
            )}
            {cubicResult && enableCubic && (
              <div className="font-mono text-purple-600 dark:text-purple-400">
                Cubic model: {cubicResult.equation}  (R²={cubicResult.r2.toFixed(4)}) (R²-Adj={cubicResult.statistics.r2Adjusted.toFixed(4)})
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 2 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need at least 2 valid data points to view the regression chart.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please enter data in the Data tab.
            </p>
          </div>
        ) : (() => {
          // Calculate min and max X from valid data points for filtering solutions
          const validPoints = dataPoints.filter(p => p.x !== 0 || p.y !== 0);
          const xValues = validPoints.map(p => p.x);
          const minX = Math.min(...xValues);
          const maxX = Math.max(...xValues);
          
          // Filter solved X values to only show those within data range (interpolation, not extrapolation)
          const filteredSolvedXLinear = (solvedXLinear !== null && solvedXLinear >= minX && solvedXLinear <= maxX) ? solvedXLinear : null;
          const filteredSolvedXQuadratic = solvedXQuadratic.filter(x => x >= minX && x <= maxX);
          const filteredSolvedXCubic = solvedXCubic.filter(x => x >= minX && x <= maxX);
          
          // Calculate Y axis range with 10% margin
          const yValues = validPoints.map(p => p.y);
          const minY = Math.min(...yValues);
          const maxY = Math.max(...yValues);
          const yRange = maxY - minY;
          const yMargin = yRange * 0.1;
          const yAxisMin = minY - yMargin;
          const yAxisMax = maxY + yMargin;
          
          return (
          <div className="space-y-4">
            {/* Warning messages for insufficient data */}
            {(enableLinear && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 2) && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Linear regression requires at least 2 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
                </p>
              </div>
            )}
            {(enableQuadratic && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 3) && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Quadratic regression requires at least 3 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
                </p>
              </div>
            )}
            {(enableCubic && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 4) && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Cubic regression requires at least 4 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
                </p>
              </div>
            )}
            
            <Plot
              data={[
                {
                  x: dataPoints.map(p => p.x),
                  y: dataPoints.map(p => p.y),
                  mode: 'markers',
                  type: 'scatter',
                  name: 'Data Points',
                  marker: { color: 'blue', size: 8 },
                },
                ...(enableLinear && linearResult ? [{
                  x: generateCurvePoints(dataPoints.map(p => p.x)),
                  y: generateCurvePoints(dataPoints.map(p => p.x)).map(x => 
                    linearResult.a + linearResult.b * x
                  ),
                  mode: 'lines' as const,
                  type: 'scatter' as const,
                  name: `Linear model`,
                  line: { color: 'red', width: 2 },
                }] : []),
                ...(enableQuadratic && quadraticResult ? [{
                  x: generateCurvePoints(dataPoints.map(p => p.x)),
                  y: generateCurvePoints(dataPoints.map(p => p.x)).map(x => 
                    quadraticResult.a + quadraticResult.b * x + quadraticResult.c * x * x
                  ),
                  mode: 'lines' as const,
                  type: 'scatter' as const,
                  name: `Quadratic model`,
                  line: { color: 'green', width: 2 },
                }] : []),
                ...(enableCubic && cubicResult ? [{
                  x: generateCurvePoints(dataPoints.map(p => p.x)),
                  y: generateCurvePoints(dataPoints.map(p => p.x)).map(x => 
                    cubicResult.a + cubicResult.b * x + cubicResult.c * x * x + cubicResult.d * x * x * x
                  ),
                  mode: 'lines' as const,
                  type: 'scatter' as const,
                  name: `Cubic model`,
                  line: { color: 'purple', width: 2 },
                }] : []),
                // Target Y horizontal dashed line
                ...(targetY !== null ? [{
                  x: [Math.min(...dataPoints.map(p => p.x)), Math.max(...dataPoints.map(p => p.x))],
                  y: [targetY, targetY],
                  mode: 'lines' as const,
                  type: 'scatter' as const,
                  //name: `Target Y = ${targetY.toFixed(4)}`,
                  name: `Target Y`,
                  line: { color: 'orange', width: 2, dash: 'dash' as const },
                }] : []),
                // Vertical dashed lines for Linear solution (only within data range)
                ...(targetY !== null && filteredSolvedXLinear !== null && enableLinear ? [{
                  x: [filteredSolvedXLinear, filteredSolvedXLinear],
                  y: [yAxisMin, targetY],
                  mode: 'lines' as const,
                  type: 'scatter' as const,
                  name: `Linear Solved X Line`,
                  line: { color: 'red', width: 1.5, dash: 'dash' as const },
                  showlegend: false,
                }] : []),
                // Vertical dashed lines for Quadratic solutions (only within data range)
                ...(targetY !== null && filteredSolvedXQuadratic.length > 0 && enableQuadratic ? 
                  filteredSolvedXQuadratic.map((xVal, idx) => ({
                    x: [xVal, xVal],
                    y: [yAxisMin, targetY],
                    mode: 'lines' as const,
                    type: 'scatter' as const,
                    name: `Quadratic Solved X Line ${idx + 1}`,
                    line: { color: 'green', width: 1.5, dash: 'dash' as const },
                    showlegend: false,
                  }))
                : []),
                // Vertical dashed lines for Cubic solutions (only within data range)
                ...(targetY !== null && filteredSolvedXCubic.length > 0 && enableCubic ? 
                  filteredSolvedXCubic.map((xVal, idx) => ({
                    x: [xVal, xVal],
                    y: [yAxisMin, targetY],
                    mode: 'lines' as const,
                    type: 'scatter' as const,
                    name: `Cubic Solved X Line ${idx + 1}`,
                    line: { color: 'purple', width: 1.5, dash: 'dash' as const },
                    showlegend: false,
                  }))
                : []),
                // Solved X points (intersections) - diamond markers (only within data range)
                ...(targetY !== null && filteredSolvedXLinear !== null && enableLinear ? [{
                  x: [filteredSolvedXLinear],
                  y: [targetY],
                  mode: 'markers' as const,
                  type: 'scatter' as const,
                  name: `Linear solution`,
                  marker: { color: 'red', size: 12, symbol: 'diamond' as const },
                }] : []),
                ...(targetY !== null && filteredSolvedXQuadratic.length > 0 && enableQuadratic ? [{
                  x: filteredSolvedXQuadratic,
                  y: Array(filteredSolvedXQuadratic.length).fill(targetY),
                  mode: 'markers' as const,
                  type: 'scatter' as const,
                  name: `Quadratic solutions`,
                  marker: { color: 'green', size: 12, symbol: 'diamond' as const },
                }] : []),
                ...(targetY !== null && filteredSolvedXCubic.length > 0 && enableCubic ? [{
                  x: filteredSolvedXCubic,
                  y: Array(filteredSolvedXCubic.length).fill(targetY),
                  mode: 'markers' as const,
                  type: 'scatter' as const,
                  name: `Cubic solutions`,
                  marker: { color: 'purple', size: 12, symbol: 'diamond' as const },
                }] : []),
              ]}
              layout={{
                autosize: true,
                title: { text: '<b>Simple Regression Analysis</b>' },
                xaxis: { title: { text: '<b>' + datasetXDescription + '</b>'} },
                yaxis: { 
                  title: { text: '<b>' + datasetYDescription + '</b>'},
                  range: [yAxisMin, yAxisMax]
                },
                showlegend: true,
                legend: { x: 1, y: 0 },
                hovermode: 'closest',
                annotations: [
                  // Target Y label on Y axis
                  ...(targetY !== null ? [{
                    x: minX - (maxX - minX) * 0.05,
                    y: targetY,
                    xref: 'x' as const,
                    yref: 'y' as const,
                    text: `Target Y: ${targetY.toFixed(4)}`,
                    showarrow: true,
                    arrowhead: 2,
                    arrowsize: 1,
                    arrowwidth: 2,
                    arrowcolor: 'orange',
                    ax: -70,
                    ay: 0,
                    font: {
                      size: 12,
                      color: 'orange',
                      family: 'Arial, sans-serif'
                    },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'orange',
                    borderwidth: 1,
                    borderpad: 4,
                  }] : []),
                  // Solved X labels on X axis - Linear
                  ...(targetY !== null && filteredSolvedXLinear !== null && enableLinear ? [{
                    x: filteredSolvedXLinear,
                    y: -0.01,
                    xref: 'x' as const,
                    yref: 'paper' as const,
                    text: `Solved X: ${filteredSolvedXLinear.toFixed(4)}`,
                    showarrow: true,
                    arrowhead: 2,
                    arrowsize: 1,
                    arrowwidth: 2,
                    arrowcolor: 'red',
                    ax: 0,
                    ay: 25,
                    font: {
                      size: 12,
                      color: 'red',
                      family: 'Arial, sans-serif'
                    },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'red',
                    borderwidth: 1,
                    borderpad: 4,
                  }] : []),
                  // Solved X labels on X axis - Quadratic
                  ...(targetY !== null && filteredSolvedXQuadratic.length > 0 && enableQuadratic 
                    ? filteredSolvedXQuadratic.map((xVal, idx) => ({
                        x: xVal,
                        y: -0.01,
                        xref: 'x' as const,
                        yref: 'paper' as const,
                        text: `Solved X: ${xVal.toFixed(4)}`,
                        showarrow: true,
                        arrowhead: 2,
                        arrowsize: 1,
                        arrowwidth: 2,
                        arrowcolor: 'green',
                        ax: 0,
                        ay: 25,
                        font: {
                          size: 12,
                          color: 'green',
                          family: 'Arial, sans-serif'
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        bordercolor: 'green',
                        borderwidth: 1,
                        borderpad: 4,
                      }))
                    : []),
                  // Solved X labels on X axis - Cubic
                  ...(targetY !== null && filteredSolvedXCubic.length > 0 && enableCubic 
                    ? filteredSolvedXCubic.map((xVal, idx) => ({
                        x: xVal,
                        y: -0.01,
                        xref: 'x' as const,
                        yref: 'paper' as const,
                        text: `Solved X: ${xVal.toFixed(4)}`,
                        showarrow: true,
                        arrowhead: 2,
                        arrowsize: 1,
                        arrowwidth: 2,
                        arrowcolor: 'purple',
                        ax: 0,
                        ay: 25,
                        font: {
                          size: 12,
                          color: 'purple',
                          family: 'Arial, sans-serif'
                        },
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        bordercolor: 'purple',
                        borderwidth: 1,
                        borderpad: 4,
                      }))
                    : []),
                ],
              }}
              useResizeHandler
              style={{ width: '100%', height: '500px' }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                toImageButtonOptions: {
                  format: 'png',
                  filename: `Simple_Regression_Chart_${datasetYDescription}_vs_${datasetXDescription}`,
                  height: 500,
                  width: 800,
                  scale: 1
                }
              }}
            />
          </div>
          );
        })()}
      </CardContent>
    </Card>
  );

  const analysisContent = (
    <div className="space-y-4">
      {/* Show message if no regression types selected or insufficient data */}
      {!enableLinear && !enableQuadratic && !enableCubic && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              Please select at least one regression type in the Setup tab
            </p>
          </CardContent>
        </Card>
      )}
      
      {(enableLinear || enableQuadratic || enableCubic) && !linearResult && !quadraticResult && !cubicResult && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              Need at least 2 valid data points for regression analysis. Please enter data in the Data tab.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Warning messages for insufficient data in Analysis tab */}
      {(enableLinear && !linearResult && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 2) && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Linear regression requires at least 2 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
          </p>
        </div>
      )}
      {(enableQuadratic && !quadraticResult && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length >= 2 && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 3) && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Quadratic regression requires at least 3 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
          </p>
        </div>
      )}
      {(enableCubic && !cubicResult && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length >= 2 && dataPoints.filter(p => p.x !== 0 || p.y !== 0).length < 4) && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Cubic regression requires at least 4 valid data points. Currently have {dataPoints.filter(p => p.x !== 0 || p.y !== 0).length}.
          </p>
        </div>
      )}
      
      {enableLinear && linearResult && (
        <Card>
          <CardHeader>
            <CardTitle>Linear Regression Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Equation:</p>
              <p className="text-lg">{linearResult.equation}</p>
              <p className="text-lg text-blue-600 dark:text-blue-400 mt-1">
                {datasetYDescription} = {linearResult.a.toFixed(4)} + {linearResult.b.toFixed(4)}({datasetXDescription})
              </p>
            </div>
            
            <div>
              <p className="font-semibold mb-2">Model Coefficients:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Intercept (a):</p>
                  <p className="font-medium">{linearResult.a.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {linearResult.statistics.coefficientPValues[0].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slope (b):</p>
                  <p className="font-medium">{linearResult.b.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {linearResult.statistics.coefficientPValues[1].toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Goodness of Fit:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">R²:</p>
                  <p className="font-medium">{linearResult.r2.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R² Adjusted:</p>
                  <p className="font-medium">{linearResult.statistics.r2Adjusted.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pearson Correlation coeff. r:</p>
                  <p className="font-medium">{linearResult.pearsonR.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SSE:</p>
                  <p className="font-medium">{linearResult.sse.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Overall Regression Test:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">F-statistic:</p>
                  <p className="font-medium">{linearResult.statistics.fStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{linearResult.statistics.regressionPValue.toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Residuals Analysis:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mean:</p>
                  <p className="font-medium">{linearResult.statistics.residualMean.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Std Deviation:</p>
                  <p className="font-medium">{linearResult.statistics.residualStd.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Normality Test (Anderson-Darling):</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statistic:</p>
                  <p className="font-medium">{linearResult.statistics.andersonDarlingStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{linearResult.statistics.andersonDarlingPValue.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conclusion:</p>
                  <p className={`font-medium ${
                    linearResult.statistics.andersonDarlingNormality === 'Normal' ? 'text-green-600 dark:text-green-400' :
                    linearResult.statistics.andersonDarlingNormality === 'Not Normal' ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {linearResult.statistics.andersonDarlingNormality}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {enableQuadratic && quadraticResult && (
        <Card>
          <CardHeader>
            <CardTitle>Quadratic Regression Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Equation:</p>
              <p className="text-lg">{quadraticResult.equation}</p>
              <p className="text-lg text-blue-600 dark:text-blue-400 mt-1">
                {datasetYDescription} = {quadraticResult.a.toFixed(4)} + {quadraticResult.b.toFixed(4)}({datasetXDescription}) + {quadraticResult.c.toFixed(4)}({datasetXDescription})²
              </p>
            </div>
            
            <div>
              <p className="font-semibold mb-2">Model Coefficients:</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Intercept (a):</p>
                  <p className="font-medium">{quadraticResult.a.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {quadraticResult.statistics.coefficientPValues[0].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Linear (b):</p>
                  <p className="font-medium">{quadraticResult.b.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {quadraticResult.statistics.coefficientPValues[1].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quadratic (c):</p>
                  <p className="font-medium">{quadraticResult.c.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {quadraticResult.statistics.coefficientPValues[2].toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Goodness of Fit:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">R²:</p>
                  <p className="font-medium">{quadraticResult.r2.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R² Adjusted:</p>
                  <p className="font-medium">{quadraticResult.statistics.r2Adjusted.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SSE:</p>
                  <p className="font-medium">{quadraticResult.sse.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Overall Regression Test:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">F-statistic:</p>
                  <p className="font-medium">{quadraticResult.statistics.fStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{quadraticResult.statistics.regressionPValue.toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Residuals Analysis:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mean:</p>
                  <p className="font-medium">{quadraticResult.statistics.residualMean.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Std Deviation:</p>
                  <p className="font-medium">{quadraticResult.statistics.residualStd.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Normality Test (Anderson-Darling):</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statistic:</p>
                  <p className="font-medium">{quadraticResult.statistics.andersonDarlingStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{quadraticResult.statistics.andersonDarlingPValue.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conclusion:</p>
                  <p className={`font-medium ${
                    quadraticResult.statistics.andersonDarlingNormality === 'Normal' ? 'text-green-600 dark:text-green-400' :
                    quadraticResult.statistics.andersonDarlingNormality === 'Not Normal' ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {quadraticResult.statistics.andersonDarlingNormality}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {enableCubic && cubicResult && (
        <Card>
          <CardHeader>
            <CardTitle>Cubic Regression Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Equation:</p>
              <p className="text-lg">{cubicResult.equation}</p>
              <p className="text-lg text-blue-600 dark:text-blue-400 mt-1">
                {datasetYDescription} = {cubicResult.a.toFixed(4)} + {cubicResult.b.toFixed(4)}({datasetXDescription}) + {cubicResult.c.toFixed(4)}({datasetXDescription})² + {cubicResult.d.toFixed(4)}({datasetXDescription})³
              </p>
            </div>
            
            <div>
              <p className="font-semibold mb-2">Model Coefficients:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Intercept (a):</p>
                  <p className="font-medium">{cubicResult.a.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {cubicResult.statistics.coefficientPValues[0].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Linear (b):</p>
                  <p className="font-medium">{cubicResult.b.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {cubicResult.statistics.coefficientPValues[1].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quadratic (c):</p>
                  <p className="font-medium">{cubicResult.c.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {cubicResult.statistics.coefficientPValues[2].toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cubic (d):</p>
                  <p className="font-medium">{cubicResult.d.toFixed(6)}</p>
                  <p className="text-xs text-muted-foreground">p-value: {cubicResult.statistics.coefficientPValues[3].toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Goodness of Fit:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">R²:</p>
                  <p className="font-medium">{cubicResult.r2.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R² Adjusted:</p>
                  <p className="font-medium">{cubicResult.statistics.r2Adjusted.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SSE:</p>
                  <p className="font-medium">{cubicResult.sse.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Overall Regression Test:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">F-statistic:</p>
                  <p className="font-medium">{cubicResult.statistics.fStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{cubicResult.statistics.regressionPValue.toFixed(4)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Residuals Analysis:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mean:</p>
                  <p className="font-medium">{cubicResult.statistics.residualMean.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Std Deviation:</p>
                  <p className="font-medium">{cubicResult.statistics.residualStd.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Normality Test (Anderson-Darling):</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Statistic:</p>
                  <p className="font-medium">{cubicResult.statistics.andersonDarlingStatistic.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">p-value:</p>
                  <p className="font-medium">{cubicResult.statistics.andersonDarlingPValue.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conclusion:</p>
                  <p className={`font-medium ${
                    cubicResult.statistics.andersonDarlingNormality === 'Normal' ? 'text-green-600 dark:text-green-400' :
                    cubicResult.statistics.andersonDarlingNormality === 'Not Normal' ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {cubicResult.statistics.andersonDarlingNormality}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={(linearResult || quadraticResult || cubicResult) ? '' : 'opacity-60'}>
        <CardHeader>
          <CardTitle>Solve for X (given target Y)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!(linearResult || quadraticResult || cubicResult) && (
            <div className="p-3 bg-muted rounded-md mb-4">
              <p className="text-sm text-muted-foreground">
                Insufficient data for solving equations. Please ensure you have valid regression results in the Graph tab.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="target-y">Target Y Value (solutions calculated for all models)</Label>
            <div className="flex gap-2">
              <Input
                id="target-y"
                type="number"
                step="any"
                value={targetY || ''}
                onChange={(e) => setTargetY(parseFloat(e.target.value) || null)}
                placeholder="Enter target Y value"
                disabled={!(linearResult || quadraticResult || cubicResult)}
                data-testid="input-target-y"
                className="flex-1"
              />
              <Button
                onClick={handleSaveTargetY}
                disabled={targetY === null || saveTargetYMutation.isPending || !(linearResult || quadraticResult || cubicResult)}
                data-testid="button-save-target-y"
              >
                {saveTargetYMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Y Target
              </Button>
            </div>
          </div>

          {/* Target Y information message */}
          {targetY !== null && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Target Y value set to <strong>{targetY.toFixed(4)}</strong>. The solved X value(s) are shown below and displayed as diamond markers on the regression graph only if they fall within the inference space.
              </p>
            </div>
          )}

          {solvedXLinear !== null && enableLinear && (() => {
            const validPoints = dataPoints.filter(p => p.x !== 0 || p.y !== 0);
            const xValues = validPoints.map(p => p.x);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const isInInferenceSpace = solvedXLinear >= minX && solvedXLinear <= maxX;
            
            return (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-medium mb-2">Linear Solution:</p>
                <p>
                  X = {isInInferenceSpace ? <strong>{solvedXLinear.toFixed(6)}</strong> : solvedXLinear.toFixed(6)}
                {!isInInferenceSpace && (
                  <span className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    &nbsp;(⚠️ Outside the inference space. Solution not shown on the graph!)
                  </span>
                )}
                </p>
              </div>
            );
          })()}

          {solvedXQuadratic.length > 0 && enableQuadratic && (() => {
            const validPoints = dataPoints.filter(p => p.x !== 0 || p.y !== 0);
            const xValues = validPoints.map(p => p.x);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            
            return (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-medium mb-2">Quadratic Solutions:</p>
                {solvedXQuadratic.map((x, i) => {
                  const isInInferenceSpace = x >= minX && x <= maxX;
                  return (
                    <div key={i} className="mb-2 last:mb-0">
                      <p>
                        X{i + 1} = {isInInferenceSpace ? <strong>{x.toFixed(6)}</strong> : x.toFixed(6)}
                      {!isInInferenceSpace && (
                        <span className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                          &nbsp;(⚠️ Outside the inference space. Solution not shown on the graph!)
                        </span>
                      )}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {solvedXCubic.length > 0 && enableCubic && (() => {
            const validPoints = dataPoints.filter(p => p.x !== 0 || p.y !== 0);
            const xValues = validPoints.map(p => p.x);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            
            return (
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="font-medium mb-2">Cubic Solutions:</p>
                {solvedXCubic.map((x, i) => {
                  const isInInferenceSpace = x >= minX && x <= maxX;
                  return (
                    <div key={i} className="mb-2 last:mb-0">
                      <p>
                        X{i + 1} = {isInInferenceSpace ? <strong>{x.toFixed(6)}</strong> : x.toFixed(6)}
                      {!isInInferenceSpace && (
                        <span className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                          &nbsp;(⚠️ Outside the inference space. Solution not shown on the graph!)
                        </span>
                      )}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HypothesisTestingTabs
        projectId={projectId}
        ctqId={0}
        testType={`simple-regression-${solutionId}`}
        setupContent={setupContent}
        dataContent={dataContent}
        chartContent={graphContent}
        analysisContent={analysisContent}
      />
    </div>
  );
}

function generateCurvePoints(xData: number[]): number[] {
  const min = Math.min(...xData);
  const max = Math.max(...xData);
  const range = max - min;
  const step = range / 100;
  
  const points: number[] = [];
  for (let x = min - range * 0.1; x <= max + range * 0.1; x += step) {
    points.push(x);
  }
  
  return points;
}
