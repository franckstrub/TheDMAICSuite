import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Undo, Clipboard, Trash2 } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import Plot from 'react-plotly.js';

interface IMRCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
  xScaleValues: string[];
}

type XScaleType = 'index' | 'freeform' | 'date';

export function IMRCard({ projectId, ctqName }: IMRCardProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [dataValues, setDataValues] = useState<number[]>([NaN, NaN, NaN]);
  const [rawInputValues, setRawInputValues] = useState<string[]>(['', '', '']);
  const [xScaleType, setXScaleType] = useState<XScaleType>('index');
  const [xScaleValues, setXScaleValues] = useState<string[]>(['', '', '']);
  const [dataHistory, setDataHistory] = useState<DataHistory[]>([]);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: 'xscale' | 'value' } | null>(null);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [indicatorName, setIndicatorName] = useState<string>(ctqName);
  const [chartDate, setChartDate] = useState<string>('');

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
        setRawInputValues(data.dataValues.map((v: number) => isNaN(v) ? '' : v.toString()));
      }
      if (data?.indicatorName) {
        setIndicatorName(data.indicatorName);
      }
      if (data?.chartDate) {
        setChartDate(data.chartDate);
      }
      if (data?.xScaleType && ['index', 'freeform', 'date'].includes(data.xScaleType)) {
        setXScaleType(data.xScaleType as XScaleType);
      }
      if (data?.xScaleValues && Array.isArray(data.xScaleValues)) {
        setXScaleValues(data.xScaleValues);
      }
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { values: number[]; indicatorName: string; chartDate: string; xScaleType: XScaleType; xScaleValues: string[] }) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`,
        { 
          dataValues: payload.values, 
          indicatorName: payload.indicatorName, 
          chartDate: payload.chartDate,
          xScaleType: payload.xScaleType,
          xScaleValues: payload.xScaleValues,
        }
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
    const currentState = JSON.stringify({ dataValues, xScaleValues });
    if (currentState !== lastSavedState) {
      setDataHistory(prev => [...prev.slice(-19), { values: [...dataValues], xScaleValues: [...xScaleValues] }]);
      setLastSavedState(currentState);
    }
  }, [dataValues, xScaleValues, lastSavedState]);

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
    setRawInputValues(previousState.values.map(v => isNaN(v) ? '' : v.toString()));
    setXScaleValues([...previousState.xScaleValues]);
    setDataHistory(prev => prev.slice(0, -1));
    setLastSavedState('');
    
    toast({
      title: "Undo successful",
      description: "Reverted to previous data state.",
    });
  }, [dataHistory, toast]);

  const handleDataChange = useCallback((index: number, value: string) => {
    saveToHistory();
    
    setRawInputValues(prev => {
      const newRaw = [...prev];
      while (newRaw.length <= index) {
        newRaw.push('');
      }
      newRaw[index] = value;
      return newRaw;
    });
    
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

  const handleXScaleChange = useCallback((index: number, value: string) => {
    saveToHistory();
    setXScaleValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) {
        newValues.push('');
      }
      newValues[index] = value;
      return newValues;
    });
  }, [saveToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, col: 'xscale' | 'value') => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleUndo();
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-cell-index="${index + 1}"][data-cell-col="${col}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      } else {
        saveToHistory();
        setDataValues(prev => [...prev, NaN]);
        setRawInputValues(prev => [...prev, '']);
        setXScaleValues(prev => [...prev, '']);
        setTimeout(() => {
          const newInput = document.querySelector(`[data-cell-index="${index + 1}"][data-cell-col="${col}"]`) as HTMLInputElement;
          if (newInput) newInput.focus();
        }, 0);
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-cell-index="${index - 1}"][data-cell-col="${col}"]`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    } else if (e.key === 'Tab' && !e.shiftKey && col === 'xscale') {
      e.preventDefault();
      const valueInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="value"]`) as HTMLInputElement;
      if (valueInput) valueInput.focus();
    } else if (e.key === 'Tab' && e.shiftKey && col === 'value') {
      e.preventDefault();
      const xscaleInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="xscale"]`) as HTMLInputElement;
      if (xscaleInput) xscaleInput.focus();
    }
  }, [handleUndo, saveToHistory]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    const lines = pastedText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      toast({
        title: "Paste error",
        description: "No valid data found",
        variant: "destructive",
      });
      return;
    }
    
    saveToHistory();
    
    const hasXScale = xScaleType !== 'index';
    const newXScaleValues: string[] = [];
    const newDataValues: number[] = [];
    const newRawValues: string[] = [];
    
    lines.forEach(line => {
      const cells = line.split(/\t/);
      
      if (hasXScale && cells.length >= 2) {
        newXScaleValues.push(cells[0].trim());
        const rawValue = cells[1].trim();
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
      } else if (hasXScale && cells.length === 1) {
        newXScaleValues.push('');
        const rawValue = cells[0].trim();
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
      } else {
        const rawValue = cells[0].trim();
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
      }
    });
    
    setDataValues(newDataValues);
    setRawInputValues(newRawValues);
    if (hasXScale) {
      setXScaleValues(newXScaleValues);
    }
    
    toast({
      title: "Data pasted",
      description: `Successfully pasted ${newDataValues.length} data points`,
    });
  }, [saveToHistory, toast, xScaleType]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        toast({
          title: "Paste error",
          description: "No valid data found",
          variant: "destructive",
        });
        return;
      }
      
      saveToHistory();
      
      const hasXScale = xScaleType !== 'index';
      const newXScaleValues: string[] = [];
      const newDataValues: number[] = [];
      const newRawValues: string[] = [];
      
      lines.forEach(line => {
        const cells = line.split(/\t/);
        
        if (hasXScale && cells.length >= 2) {
          newXScaleValues.push(cells[0].trim());
          const rawValue = cells[1].trim();
          newRawValues.push(rawValue);
          newDataValues.push(parseNumericValue(rawValue));
        } else if (hasXScale && cells.length === 1) {
          newXScaleValues.push('');
          const rawValue = cells[0].trim();
          newRawValues.push(rawValue);
          newDataValues.push(parseNumericValue(rawValue));
        } else {
          const rawValue = cells[0].trim();
          newRawValues.push(rawValue);
          newDataValues.push(parseNumericValue(rawValue));
        }
      });
      
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      if (hasXScale) {
        setXScaleValues(newXScaleValues);
      }
      
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${newDataValues.length} data points`,
      });
    } catch (err) {
      toast({
        title: "Clipboard access denied",
        description: "Please allow clipboard access or use Ctrl+V to paste data directly in the table",
        variant: "destructive",
      });
    }
  }, [saveToHistory, toast, xScaleType]);

  const handleSaveData = useCallback(() => {
    const validIndices: number[] = [];
    dataValues.forEach((v, i) => {
      if (!isNaN(v)) validIndices.push(i);
    });
    const validValues = validIndices.map(i => dataValues[i]);
    
    if (validValues.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 data points for I-MR chart",
        variant: "destructive",
      });
      return;
    }
    
    const validXScaleValues = xScaleType !== 'index' 
      ? validIndices.map(i => xScaleValues[i] || '') 
      : [];
    
    saveMutation.mutate({ 
      values: validValues, 
      indicatorName, 
      chartDate, 
      xScaleType, 
      xScaleValues: validXScaleValues 
    });
  }, [dataValues, indicatorName, chartDate, xScaleType, xScaleValues, saveMutation, toast]);

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
    setRawInputValues(['', '', '']);
    setXScaleValues(['', '', '']);
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

  // Get valid indices where data values are not NaN
  const validIndices = dataValues.map((v, i) => (!isNaN(v) ? i : -1)).filter(i => i !== -1);

  // Get the x-axis values for charts based on scale type
  const getChartXValues = (): (string | number)[] => {
    if (xScaleType === 'index' || xScaleValues.filter(v => v.trim() !== '').length === 0) {
      return validDataValues.map((_, i) => i + 1);
    }
    return validIndices.map((idx, i) => xScaleValues[idx] || `${i + 1}`);
  };

  const chartXValues = getChartXValues();

  // Get arrays of in-control and out-of-control points for I chart
  const getIChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as (string | number)[], y: [] as number[] }, outOfControl: { x: [] as (string | number)[], y: [] as number[] } };
    
    const inControl: { x: (string | number)[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: (string | number)[]; y: number[] } = { x: [], y: [] };
    
    validDataValues.forEach((value, i) => {
      const xVal = chartXValues[i];
      if (isOutOfControl(value, stats.iUCL, stats.iLCL)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(value);
      }
    });
    
    return { inControl, outOfControl };
  };

  // Get arrays of in-control and out-of-control points for MR chart
  const getMRChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as (string | number)[], y: [] as number[] }, outOfControl: { x: [] as (string | number)[], y: [] as number[] } };
    
    const inControl: { x: (string | number)[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: (string | number)[]; y: number[] } = { x: [], y: [] };
    
    stats.movingRanges.forEach((value, i) => {
      const xVal = chartXValues[i + 1];
      if (isOutOfControl(value, stats.mrUCL, stats.mrLCL)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="indicator-name" className="text-sm font-medium">Indicator to Monitor</Label>
              <Input
                id="indicator-name"
                type="text"
                value={indicatorName}
                onChange={(e) => setIndicatorName(e.target.value)}
                className="mt-1"
                placeholder="Enter indicator name"
                data-testid="input-indicator-name"
              />
              <p className="text-xs text-gray-500 mt-1">This name will appear in the chart titles</p>
            </div>
            <div>
              <Label htmlFor="chart-date" className="text-sm font-medium">Chart Date</Label>
              <Input
                id="chart-date"
                type="date"
                value={chartDate}
                onChange={(e) => setChartDate(e.target.value)}
                className="mt-1"
                data-testid="input-chart-date"
              />
              <p className="text-xs text-gray-500 mt-1">Date shown on the control charts</p>
            </div>
            <div>
              <Label className="text-sm font-medium">X-Axis Scale Type</Label>
              <RadioGroup 
                value={xScaleType} 
                onValueChange={(v) => setXScaleType(v as XScaleType)}
                className="mt-2 flex gap-4"
                data-testid="radio-xscale-type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="index" id="xscale-index" />
                  <Label htmlFor="xscale-index" className="text-sm cursor-pointer">Default Index</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="freeform" id="xscale-freeform" />
                  <Label htmlFor="xscale-freeform" className="text-sm cursor-pointer">Free Form</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="xscale-date" />
                  <Label htmlFor="xscale-date" className="text-sm cursor-pointer">Date</Label>
                </div>
              </RadioGroup>
            </div>
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
                  {xScaleType !== 'index' && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-40">
                      {xScaleType === 'date' ? 'Date' : 'X-Scale Label'}
                    </th>
                  )}
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Indicator Value</th>
                </tr>
              </thead>
              <tbody>
                {displayValues.map((value, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-1 text-sm text-gray-600 font-medium">{index + 1}</td>
                    {xScaleType !== 'index' && (
                      <td className="px-4 py-1">
                        <Input
                          type={xScaleType === 'date' ? 'date' : 'text'}
                          value={xScaleValues[index] ?? ''}
                          onChange={(e) => handleXScaleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'xscale')}
                          onFocus={() => setFocusedCell({ row: index, col: 'xscale' })}
                          onBlur={() => setFocusedCell(null)}
                          className="h-8 text-sm"
                          placeholder={xScaleType === 'date' ? '' : 'Enter label'}
                          data-cell-index={index}
                          data-cell-col="xscale"
                          data-testid={`input-imr-xscale-${index}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-1">
                      <Input
                        type="text"
                        value={rawInputValues[index] ?? (isNaN(value) ? '' : value.toString())}
                        onChange={(e) => handleDataChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'value')}
                        onFocus={() => setFocusedCell({ row: index, col: 'value' })}
                        onBlur={() => setFocusedCell(null)}
                        className="h-8 text-sm"
                        placeholder="Enter value"
                        data-cell-index={index}
                        data-cell-col="value"
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
                    x: chartXValues,
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
                    x: [chartXValues[0], chartXValues[chartXValues.length - 1]],
                    y: [stats.iCL, stats.iCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Centerline (X̄)',
                    line: { color: '#16a34a', width: 2 },
                  },
                  {
                    x: [chartXValues[0], chartXValues[chartXValues.length - 1]],
                    y: [stats.iUCL, stats.iUCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'UCL (+3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                  {
                    x: [chartXValues[0], chartXValues[chartXValues.length - 1]],
                    y: [stats.iLCL, stats.iLCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'LCL (-3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                ]}
                layout={{
                  title: { text: `I Chart of ${indicatorName || ctqName}` },
                  xaxis: { 
                    title: { text: xScaleType === 'date' ? 'Date' : (xScaleType === 'freeform' ? 'Label' : 'Observation') }, 
                    ...(xScaleType === 'index' ? { dtick: 1, tick0: 1, rangemode: 'nonnegative' as const } : { type: 'category' as const })
                  },
                  yaxis: { title: { text: 'Value' } },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 50, b: 80, l: 60, r: 100 },
                  height: 350,
                  annotations: [
                    ...(chartDate ? [{
                      x: 1,
                      y: 1.12,
                      xref: 'paper' as const,
                      yref: 'paper' as const,
                      text: `Date: ${chartDate}`,
                      showarrow: false,
                      xanchor: 'right' as const,
                      yanchor: 'top' as const,
                      font: { color: '#374151', size: 11 },
                    }] : []),
                    {
                      x: chartXValues[chartXValues.length - 1],
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
                      x: chartXValues[chartXValues.length - 1],
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
                      x: chartXValues[chartXValues.length - 1],
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
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                toImageButtonOptions: {
                  format: 'png',
                  filename: `I_Control_Card_of_${ctqName}`,
                  height: 500,
                  width: 800,
                  scale: 1
                }
              }}
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
                    x: chartXValues.slice(1),
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
                    x: [chartXValues[1], chartXValues[chartXValues.length - 1]],
                    y: [stats.mrCL, stats.mrCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Centerline (MR̄)',
                    line: { color: '#16a34a', width: 2 },
                  },
                  {
                    x: [chartXValues[1], chartXValues[chartXValues.length - 1]],
                    y: [stats.mrUCL, stats.mrUCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'UCL (+3σ)',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                  {
                    x: [chartXValues[1], chartXValues[chartXValues.length - 1]],
                    y: [stats.mrLCL, stats.mrLCL],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'LCL',
                    line: { color: '#dc2626', width: 2, dash: 'dash' },
                  },
                ]}
                layout={{
                  title: { text: `MR Chart of ${indicatorName || ctqName}` },
                  xaxis: { 
                    title: { text: xScaleType === 'date' ? 'Date' : (xScaleType === 'freeform' ? 'Label' : 'Observation') }, 
                    ...(xScaleType === 'index' ? { dtick: 1, tick0: 2, rangemode: 'nonnegative' as const } : { type: 'category' as const })
                  },
                  yaxis: { title: { text: 'Moving Range' }, rangemode: 'tozero' },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 50, b: 80, l: 60, r: 100 },
                  height: 350,
                  annotations: [
                    ...(chartDate ? [{
                      x: 1,
                      y: 1.12,
                      xref: 'paper' as const,
                      yref: 'paper' as const,
                      text: `Date: ${chartDate}`,
                      showarrow: false,
                      xanchor: 'right' as const,
                      yanchor: 'top' as const,
                      font: { color: '#374151', size: 11 },
                    }] : []),
                    {
                      x: chartXValues[chartXValues.length - 1],
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
                      x: chartXValues[chartXValues.length - 1],
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
                      x: chartXValues[chartXValues.length - 1],
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
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                toImageButtonOptions: {
                  format: 'png',
                  filename: `MR_Control_Card_of_${ctqName}`,
                  height: 500,
                  width: 800,
                  scale: 1
                }
              }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
