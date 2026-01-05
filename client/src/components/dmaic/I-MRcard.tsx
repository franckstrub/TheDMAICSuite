import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Undo, Clipboard, Trash2 } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseSingleColumnPaste, parseNumericValue } from '@/lib/excelPasteUtils';
import Plot from 'react-plotly.js';

interface IMRCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
}

export function IMRCard({ projectId, ctqName }: IMRCardProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [dataValues, setDataValues] = useState<number[]>([NaN, NaN, NaN]);
  const [dataHistory, setDataHistory] = useState<DataHistory[]>([]);
  const [focusedCell, setFocusedCell] = useState<number | null>(null);
  const [lastSavedState, setLastSavedState] = useState<string>('');

  const dataQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`],
    retry: false,
  });

  useEffect(() => {
    if (dataQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      const data = dataQuery.data as any;
      if (data?.dataValues && data.dataValues.length > 0) {
        setDataValues(data.dataValues);
      }
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: number[]) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`,
        { dataValues: values }
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "I-MR control card data saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`]
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

  const saveToHistory = useCallback(() => {
    const currentState = JSON.stringify(dataValues);
    if (currentState !== lastSavedState) {
      setDataHistory(prev => [...prev.slice(-19), { values: [...dataValues] }]);
      setLastSavedState(currentState);
    }
  }, [dataValues, lastSavedState]);

  const handleUndo = useCallback(() => {
    if (dataHistory.length === 0) {
      toast({
        title: "Nothing to undo",
        description: "No previous data state available.",
        variant: "destructive",
      });
      return;
    }

    const previousState = dataHistory[dataHistory.length - 1];
    setDataValues([...previousState.values]);
    setDataHistory(prev => prev.slice(0, -1));
    setLastSavedState('');
    
    toast({
      title: "Undo successful",
      description: "Reverted to previous data state.",
    });
  }, [dataHistory, toast]);

  const handleDataChange = useCallback((index: number, value: string) => {
    saveToHistory();
    const numValue = parseNumericValue(value);
    
    setDataValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) {
        newValues.push(NaN);
      }
      newValues[index] = numValue;
      return newValues;
    });
  }, [saveToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleUndo();
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-cell-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      } else {
        saveToHistory();
        setDataValues(prev => [...prev, NaN]);
        setTimeout(() => {
          const newInput = document.querySelector(`[data-cell-index="${index + 1}"]`) as HTMLInputElement;
          if (newInput) newInput.focus();
        }, 0);
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-cell-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }, [handleUndo, saveToHistory]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    const result = parseSingleColumnPaste(pastedText);
    
    if (!result.success || result.data[0].length === 0) {
      toast({
        title: "Paste error",
        description: result.errors.join(', ') || "No valid data found",
        variant: "destructive",
      });
      return;
    }
    
    saveToHistory();
    const newValues = result.data[0];
    setDataValues(newValues);
    
    toast({
      title: "Data pasted",
      description: `Successfully pasted ${newValues.length} data points`,
    });
  }, [saveToHistory, toast]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const result = parseSingleColumnPaste(text);
      
      if (!result.success || result.data[0].length === 0) {
        toast({
          title: "Paste error",
          description: result.errors.join(', ') || "No valid data found",
          variant: "destructive",
        });
        return;
      }
      
      saveToHistory();
      const newValues = result.data[0];
      setDataValues(newValues);
      
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${newValues.length} data points`,
      });
    } catch (err) {
      toast({
        title: "Clipboard access denied",
        description: "Please allow clipboard access or use Ctrl+V to paste data directly in the table",
        variant: "destructive",
      });
    }
  }, [saveToHistory, toast]);

  const handleSaveData = useCallback(() => {
    const validValues = dataValues.filter(v => !isNaN(v));
    if (validValues.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 data points for I-MR chart",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(validValues);
  }, [dataValues, saveMutation, toast]);

  const handleClearAllData = useCallback(() => {
    if (dataValues.filter(v => !isNaN(v)).length === 0) {
      toast({
        title: "No data to clear",
        description: "The data is already empty",
      });
      return;
    }
    saveToHistory();
    setDataValues([NaN, NaN, NaN]);
    toast({
      title: "Data cleared",
      description: "All data has been cleared. Use Undo to restore.",
    });
  }, [dataValues, saveToHistory, toast]);

  const validDataValues = dataValues.filter(v => !isNaN(v));
  const hasValidData = validDataValues.length >= 2;

  const calculateIMRStats = useCallback(() => {
    if (!hasValidData) return null;

    const n = validDataValues.length;
    const mean = validDataValues.reduce((a, b) => a + b, 0) / n;

    const movingRanges: number[] = [];
    for (let i = 1; i < validDataValues.length; i++) {
      movingRanges.push(Math.abs(validDataValues[i] - validDataValues[i - 1]));
    }
    const avgMR = movingRanges.length > 0 
      ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length 
      : 0;

    const d2 = 1.128;
    const D3 = 0;
    const D4 = 3.267;
    const E2 = 2.660;

    const iUCL = mean + E2 * avgMR;
    const iLCL = mean - E2 * avgMR;

    const mrUCL = D4 * avgMR;
    const mrLCL = D3 * avgMR;

    return {
      mean,
      avgMR,
      iUCL,
      iLCL,
      iCL: mean,
      mrUCL,
      mrLCL,
      mrCL: avgMR,
      movingRanges,
    };
  }, [hasValidData, validDataValues]);

  const stats = calculateIMRStats();

  // Helper function to detect out-of-control points
  const isOutOfControl = (value: number, ucl: number, lcl: number): boolean => {
    return value > ucl || value < lcl;
  };

  // Get arrays of in-control and out-of-control points for I chart
  const getIChartPointArrays = () => {
    if (!stats) return { inControl: { x: [], y: [] }, outOfControl: { x: [], y: [] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    validDataValues.forEach((value, i) => {
      if (isOutOfControl(value, stats.iUCL, stats.iLCL)) {
        outOfControl.x.push(i + 1);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(i + 1);
        inControl.y.push(value);
      }
    });
    
    return { inControl, outOfControl };
  };

  // Get arrays of in-control and out-of-control points for MR chart
  const getMRChartPointArrays = () => {
    if (!stats) return { inControl: { x: [], y: [] }, outOfControl: { x: [], y: [] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.movingRanges.forEach((value, i) => {
      if (isOutOfControl(value, stats.mrUCL, stats.mrLCL)) {
        outOfControl.x.push(i + 2);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(i + 2);
        inControl.y.push(value);
      }
    });
    
    return { inControl, outOfControl };
  };

  const iChartPoints = getIChartPointArrays();
  const mrChartPoints = getMRChartPointArrays();

  const displayValues = [...dataValues];
  if (displayValues.length < 3 || !isNaN(displayValues[displayValues.length - 1])) {
    displayValues.push(NaN);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>I-MR Control Chart Data Input</span>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAllData}
                disabled={validDataValues.length === 0}               
                title="Clear all data (can be undone)"
                data-testid="btn-clear-imr"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                data-testid="btn-paste-imr"
              >
                <Clipboard className="h-4 w-4 mr-1" />
                Paste
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={dataHistory.length === 0}
                data-testid="btn-undo-imr"
              >
                <Undo className="h-4 w-4 mr-1" />
                Undo
              </Button>
              <Button
                size="sm"
                onClick={handleSaveData}
                disabled={saveMutation.isPending}
                data-testid="btn-save-imr"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Data
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            Enter individual measurements. Supports Excel copy/paste (Ctrl+V). Use Ctrl+Z to undo.
          </div>
          
          <div 
            ref={tableRef}
            className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto"
            onPaste={handlePaste}
          >
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-20">Index</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">CTQ Value</th>
                </tr>
              </thead>
              <tbody>
                {displayValues.map((value, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-1 text-sm text-gray-600 font-medium">{index + 1}</td>
                    <td className="px-4 py-1">
                      <Input
                        type="text"
                        value={isNaN(value) ? '' : value.toString()}
                        onChange={(e) => handleDataChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onFocus={() => setFocusedCell(index)}
                        onBlur={() => setFocusedCell(null)}
                        className="h-8 text-sm"
                        placeholder="Enter value"
                        data-cell-index={index}
                        data-testid={`input-imr-value-${index}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            {validDataValues.length} valid data point{validDataValues.length !== 1 ? 's' : ''} entered
          </div>
        </CardContent>
      </Card>

      {hasValidData && stats && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">I Chart (Individuals)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">UCL</Label>
                  <div className="font-semibold text-blue-700">{stats.iUCL.toFixed(4)}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">Centerline (X̄)</Label>
                  <div className="font-semibold text-green-700">{stats.iCL.toFixed(4)}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">LCL</Label>
                  <div className="font-semibold text-blue-700">{stats.iLCL.toFixed(4)}</div>
                </div>
              </div>
              
              <Plot
                data={[
                  {
                    x: validDataValues.map((_, i) => i + 1),
                    y: validDataValues,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Individual Values',
                    line: { color: '#2563eb', width: 1.5 },
                    showlegend: false,
                  },
                  {
                    x: iChartPoints.inControl.x,
                    y: iChartPoints.inControl.y,
                    type: 'scatter',
                    mode: 'markers',
                    name: 'In Control',
                    marker: { color: '#2563eb', size: 8, symbol: 'circle' },
                  },
                  ...(iChartPoints.outOfControl.x.length > 0 ? [{
                    x: iChartPoints.outOfControl.x,
                    y: iChartPoints.outOfControl.y,
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    name: 'Out of Control',
                    marker: { color: '#dc2626', size: 10, symbol: 'square' },
                  }] : []),
                  {
                    x: [1, validDataValues.length],
                    y: [stats.iCL, stats.iCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Centerline (X̄)',
                    line: { color: '#16a34a', width: 2 },
                  },
                  {
                    x: [1, validDataValues.length],
                    y: [stats.iUCL, stats.iUCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'UCL (+3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                  {
                    x: [1, validDataValues.length],
                    y: [stats.iLCL, stats.iLCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'LCL (-3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                ]}
                layout={{
                  title: { text: 'I Chart - Individual Values' },
                  xaxis: { title: { text: 'Observation' }, dtick: 1 },
                  yaxis: { title: { text: 'Value' } },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 40, b: 80, l: 60, r: 100 },
                  height: 350,
                  annotations: [
                    {
                      x: validDataValues.length,
                      y: stats.iUCL,
                      xref: 'x',
                      yref: 'y',
                      text: `UCL=${stats.iUCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#dc2626', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#dc2626',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                    {
                      x: validDataValues.length,
                      y: stats.iCL,
                      xref: 'x',
                      yref: 'y',
                      text: `CL=${stats.iCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#16a34a', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#16a34a',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                    {
                      x: validDataValues.length,
                      y: stats.iLCL,
                      xref: 'x',
                      yref: 'y',
                      text: `LCL=${stats.iLCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#dc2626', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#dc2626',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                  ],
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">MR Chart (Moving Range)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">UCL</Label>
                  <div className="font-semibold text-blue-700">{stats.mrUCL.toFixed(4)}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">Centerline (MR̄)</Label>
                  <div className="font-semibold text-green-700">{stats.mrCL.toFixed(4)}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <Label className="text-xs text-gray-600">LCL</Label>
                  <div className="font-semibold text-blue-700">{stats.mrLCL.toFixed(4)}</div>
                </div>
              </div>
              
              <Plot
                data={[
                  {
                    x: stats.movingRanges.map((_, i) => i + 2),
                    y: stats.movingRanges,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Moving Range',
                    line: { color: '#7c3aed', width: 1.5 },
                    showlegend: false,
                  },
                  {
                    x: mrChartPoints.inControl.x,
                    y: mrChartPoints.inControl.y,
                    type: 'scatter',
                    mode: 'markers',
                    name: 'In Control',
                    marker: { color: '#7c3aed', size: 8, symbol: 'circle' },
                  },
                  ...(mrChartPoints.outOfControl.x.length > 0 ? [{
                    x: mrChartPoints.outOfControl.x,
                    y: mrChartPoints.outOfControl.y,
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    name: 'Out of Control',
                    marker: { color: '#dc2626', size: 10, symbol: 'square' },
                  }] : []),
                  {
                    x: [2, validDataValues.length],
                    y: [stats.mrCL, stats.mrCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Centerline (MR̄)',
                    line: { color: '#16a34a', width: 2 },
                  },
                  {
                    x: [2, validDataValues.length],
                    y: [stats.mrUCL, stats.mrUCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'UCL (+3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                  {
                    x: [2, validDataValues.length],
                    y: [stats.mrLCL, stats.mrLCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'LCL',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                ]}
                layout={{
                  title: { text: 'MR Chart - Moving Range' },
                  xaxis: { title: { text: 'Observation' }, dtick: 1 },
                  yaxis: { title: { text: 'Moving Range' }, rangemode: 'tozero' },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 40, b: 80, l: 60, r: 100 },
                  height: 350,
                  annotations: [
                    {
                      x: validDataValues.length,
                      y: stats.mrUCL,
                      xref: 'x',
                      yref: 'y',
                      text: `UCL=${stats.mrUCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#dc2626', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#dc2626',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                    {
                      x: validDataValues.length,
                      y: stats.mrCL,
                      xref: 'x',
                      yref: 'y',
                      text: `CL=${stats.mrCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#16a34a', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#16a34a',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                    {
                      x: validDataValues.length,
                      y: stats.mrLCL,
                      xref: 'x',
                      yref: 'y',
                      text: `LCL=${stats.mrLCL.toFixed(2)}`,
                      showarrow: false,
                      xanchor: 'left',
                      yanchor: 'middle',
                      font: { color: '#dc2626', size: 11 },
                      bgcolor: 'rgba(255,255,255,0.9)',
                      bordercolor: '#dc2626',
                      borderwidth: 1,
                      borderpad: 3,
                    },
                  ],
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
