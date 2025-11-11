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
  const [responseVariableName, setResponseVariableName] = useState("Y");
  const [predictorNames, setPredictorNames] = useState<string[]>(["X1", "X2"]);
  
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
  
  // 3D plot selection
  const [plot3DFactorX, setPlot3DFactorX] = useState(0);
  const [plot3DFactorY, setPlot3DFactorY] = useState(1);
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/multiple-regression`],
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      
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
      
      // Ensure we have enough predictor columns
      while (predictorNames.length < numPredictors) {
        handleAddPredictor();
      }
      
      // Extract data
      const newDataY = rows.map(row => row[row.length - 1]);
      const newDataX: number[][] = [];
      
      for (let predIdx = 0; predIdx < numPredictors; predIdx++) {
        newDataX.push(rows.map(row => row[predIdx]));
      }
      
      setDataY(newDataY);
      setDataX(newDataX);
      
      toast({
        title: "Data pasted",
        description: `Pasted ${rows.length} rows with ${numPredictors} predictors.`,
      });
    } catch (error) {
      toast({
        title: "Paste error",
        description: "Could not parse pasted data. Ensure it's in tab-separated format with predictors in columns and response in the last column.",
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
      
      // Extract data
      const newDataY = rows.map(row => row[row.length - 1]);
      const finalDataX: number[][] = [];
      
      for (let predIdx = 0; predIdx < numPredictors; predIdx++) {
        finalDataX.push(rows.map(row => row[predIdx]));
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
        description: "Could not parse pasted data. Ensure it's in tab-separated format with predictors in columns and response in the last column.",
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="setup" className="w-full">
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
                  <Label>Response Variable Name</Label>
                  <Input
                    value={responseVariableName}
                    onChange={(e) => setResponseVariableName(e.target.value)}
                    placeholder="Y"
                    data-testid="input-response-name"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Predictor Variable Names</Label>
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
                      placeholder={`X${idx + 1}`}
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

                <div className="overflow-auto max-h-96" onPaste={handlePaste}>
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        {predictorNames.map((name, idx) => (
                          <TableHead key={idx} className="min-w-32">{name}</TableHead>
                        ))}
                        <TableHead className="min-w-32">{responseVariableName}</TableHead>
                        <TableHead className="w-[80px] px-4 py-2 text-left text-sm font-medium">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataY.map((_, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="text-center text-muted-foreground">
                            {rowIdx + 1}
                          </TableCell>
                          {predictorNames.map((_, colIdx) => (
                            <TableCell key={colIdx}>
                              <Input
                                type="number"
                                value={isNaN(dataX[colIdx][rowIdx]) ? '' : String(dataX[colIdx][rowIdx])}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value, false)}
                                placeholder="Enter value"
                                className="w-full"
                                data-testid={`input-x${colIdx}-${rowIdx}`}
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Input
                              type="number"
                              value={isNaN(dataY[rowIdx]) ? '' : String(dataY[rowIdx])}
                              onChange={(e) => handleCellChange(rowIdx, -1, e.target.value, true)}
                              placeholder="Enter value"
                              className="w-full"
                              data-testid={`input-y-${rowIdx}`}
                            />
                          </TableCell>
                          <TableCell className="p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleRemoveRow}
                              data-testid="button-remove-row"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <CardTitle>3D Scatter Plot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Factor A (X-Axis)</Label>
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
                              {predictorNames[predIdx]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Factor B (Y-Axis)</Label>
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
                              {predictorNames[predIdx]}
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
                          size: 5,
                          color: 'rgb(59, 130, 246)',
                          opacity: 0.8,
                        },
                      } as any,
                    ]}
                    layout={{
                      autosize: true,
                      scene: {
                        xaxis: { title: { text: predictorNames[plot3DFactorX] || 'Factor A' } },
                        yaxis: { title: { text: predictorNames[plot3DFactorY] || 'Factor B' } },
                        zaxis: { title: { text: responseVariableName || 'Response' } },
                      },
                      margin: { l: 0, r: 0, b: 0, t: 0 },
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%', height: '500px' }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {selectedPredictors.length < 2 
                      ? "Select at least 2 predictors in the Analysis tab to view the 3D chart"
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
                {/* Model Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Model Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">R²</div>
                        <div className="text-2xl font-bold" data-testid="stat-r-squared">
                          {regressionResult.rSquared.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Adjusted R²</div>
                        <div className="text-2xl font-bold" data-testid="stat-adj-r-squared">
                          {regressionResult.rSquaredAdjusted.toFixed(4)}
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
                    <CardTitle>ANOVA Table</CardTitle>
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
                            <TableHead className="text-center">Include</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {regressionResult.anovaTable.map((row, idx) => {
                            const isPredictor = row.source.startsWith('  ');
                            const predictorName = isPredictor ? row.source.trim() : null;
                            const predictorIdx = predictorName ? 
                              predictorNames.findIndex(name => name === predictorName) : -1;
                            const isSelected = predictorIdx >= 0 && selectedPredictors.includes(predictorIdx);
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
                                <TableCell className="text-center">
                                  {isPredictor && predictorIdx >= 0 && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => togglePredictor(predictorIdx)}
                                      data-testid={`checkbox-predictor-${predictorIdx}`}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Coefficients Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Coefficients</CardTitle>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {regressionResult.coefficients.map((coef, idx) => {
                            const isPValueSignificant = coef.pValue < significanceLevel;
                            const isHighVIF = coef.vif !== null && coef.vif > 10;
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium" data-testid={`coef-term-${idx}`}>
                                  {coef.term}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-estimate-${idx}`}>
                                  {coef.estimate.toFixed(6)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-stderr-${idx}`}>
                                  {coef.stdError.toFixed(4)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`coef-tvalue-${idx}`}>
                                  {coef.tValue.toFixed(4)}
                                </TableCell>
                                <TableCell 
                                  className={`text-right ${isPValueSignificant ? 'text-green-600 font-semibold' : ''}`}
                                  data-testid={`coef-pvalue-${idx}`}
                                >
                                  {coef.pValue.toFixed(4)}
                                </TableCell>
                                <TableCell 
                                  className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : ''}`}
                                  data-testid={`coef-vif-${idx}`}
                                >
                                  {coef.vif !== null ? coef.vif.toFixed(2) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      VIF &gt; 10 indicates problematic multicollinearity (shown in red)
                    </div>
                  </CardContent>
                </Card>

                {/* Residual Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Residual Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Residual Mean</div>
                        <div className="text-lg font-semibold" data-testid="residual-mean">
                          {regressionResult.residualMean.toFixed(6)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Residual Std Dev</div>
                        <div className="text-lg font-semibold" data-testid="residual-std">
                          {regressionResult.residualStd.toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">AD Normality</div>
                        <div className={`text-lg font-semibold ${
                          regressionResult.andersonDarlingNormality === 'Normal' ? 'text-green-600' : 'text-red-600'
                        }`} data-testid="residual-normality">
                          {regressionResult.andersonDarlingNormality}
                        </div>
                      </div>
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
                            xaxis: { title: { text: 'Fitted Values' } },
                            yaxis: { title: { text: 'Residuals' } },
                            showlegend: false,
                            margin: { l: 60, r: 20, t: 20, b: 60 },
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '400px' }}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="residuals-vs-order"
                          checked={showResidualsVsOrder}
                          onCheckedChange={(checked) => setShowResidualsVsOrder(!!checked)}
                          data-testid="checkbox-residuals-vs-order"
                        />
                        <Label htmlFor="residuals-vs-order">Residuals vs Order</Label>
                      </div>
                      
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
                            xaxis: { title: { text: 'Observation Order' } },
                            yaxis: { title: { text: 'Residuals' } },
                            showlegend: false,
                            margin: { l: 60, r: 20, t: 20, b: 60 },
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '400px' }}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="normal-prob-plot"
                          checked={showNormalProbPlot}
                          onCheckedChange={(checked) => setShowNormalProbPlot(!!checked)}
                          data-testid="checkbox-normal-prob-plot"
                        />
                        <Label htmlFor="normal-prob-plot">Normal Probability Plot</Label>
                      </div>
                      
                      {showNormalProbPlot && (() => {
                        const sorted = [...regressionResult.residuals].sort((a, b) => a - b);
                        const n = sorted.length;
                        const theoreticalQuantiles = sorted.map((_, i) => {
                          const p = (i + 0.5) / n;
                          return jStat.normal.inv(p, 0, 1);
                        });
                        
                        return (
                          <Plot
                            data={[
                              {
                                type: 'scatter',
                                mode: 'markers',
                                x: theoreticalQuantiles,
                                y: sorted,
                                marker: { color: 'rgb(59, 130, 246)', size: 6 },
                              } as any,
                            ]}
                            layout={{
                              xaxis: { title: { text: 'Theoretical Quantiles' } },
                              yaxis: { title: { text: 'Sample Quantiles' } },
                              showlegend: false,
                              margin: { l: 60, r: 20, t: 20, b: 60 },
                            }}
                            config={{ responsive: true }}
                            style={{ width: '100%', height: '400px' }}
                          />
                        );
                      })()}
                    </div>
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
