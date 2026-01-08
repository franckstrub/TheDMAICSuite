import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Undo, Clipboard, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import Plot from 'react-plotly.js';

function normalizeDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (match) {
    const [, d, mon, y] = match;
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monthNum = months[mon.toLowerCase()];
    if (monthNum) {
      const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
      return `${year}-${monthNum}-${d.padStart(2, '0')}`;
    }
  }
  return trimmed;
}

// Xbar-R constants based on subgroup size (n=2 to n=25)
const XBAR_R_CONSTANTS: Record<number, { A2: number; D3: number; D4: number; d2: number }> = {
  2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
  11: { A2: 0.285, D3: 0.256, D4: 1.744, d2: 3.173 },
  12: { A2: 0.266, D3: 0.283, D4: 1.717, d2: 3.258 },
  13: { A2: 0.249, D3: 0.307, D4: 1.693, d2: 3.336 },
  14: { A2: 0.235, D3: 0.328, D4: 1.672, d2: 3.407 },
  15: { A2: 0.223, D3: 0.347, D4: 1.653, d2: 3.472 },
  16: { A2: 0.212, D3: 0.363, D4: 1.637, d2: 3.532 },
  17: { A2: 0.203, D3: 0.378, D4: 1.622, d2: 3.588 },
  18: { A2: 0.194, D3: 0.391, D4: 1.609, d2: 3.640 },
  19: { A2: 0.187, D3: 0.403, D4: 1.597, d2: 3.689 },
  20: { A2: 0.180, D3: 0.415, D4: 1.585, d2: 3.735 },
  21: { A2: 0.173, D3: 0.425, D4: 1.575, d2: 3.778 },
  22: { A2: 0.167, D3: 0.434, D4: 1.566, d2: 3.819 },
  23: { A2: 0.162, D3: 0.443, D4: 1.557, d2: 3.858 },
  24: { A2: 0.157, D3: 0.451, D4: 1.549, d2: 3.895 },
  25: { A2: 0.153, D3: 0.459, D4: 1.541, d2: 3.931 },
};

interface XbarRCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
  xScaleValues: string[];
  subgroupIndexValues: number[];
  stageValues: string[];
  stagesEnabled: boolean;
  constantSubgroupSize: boolean;
  subgroupSize: number;
}

type XScaleType = 'index' | 'freeform' | 'date';

interface SubgroupData {
  subgroupIndex: number;
  values: number[];
  xbar: number;
  range: number;
  xScaleLabel: string;
  stageName: string;
}

export function XbarRCard({ projectId, ctqName }: XbarRCardProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [dataValues, setDataValues] = useState<number[]>([NaN, NaN, NaN]);
  const [rawInputValues, setRawInputValues] = useState<string[]>(['', '', '']);
  const [xScaleType, setXScaleType] = useState<XScaleType>('index');
  const [xAxisLabel, setXAxisLabel] = useState<string>('');
  const [xScaleValues, setXScaleValues] = useState<string[]>(['', '', '']);
  const [dataHistory, setDataHistory] = useState<DataHistory[]>([]);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: 'xscale' | 'value' | 'subgroup' | 'stage' } | null>(null);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [indicatorName, setIndicatorName] = useState<string>(ctqName);
  const [chartDate, setChartDate] = useState<string>('');
  const [stagesEnabled, setStagesEnabled] = useState<boolean>(false);
  const [stageValues, setStageValues] = useState<string[]>([]);
  const [constantSubgroupSize, setConstantSubgroupSize] = useState<boolean>(false);
  const [subgroupSize, setSubgroupSize] = useState<number>(5);
  const [subgroupIndexValues, setSubgroupIndexValues] = useState<number[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

  const dataQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}`],
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
      if (data?.indicatorName) setIndicatorName(data.indicatorName);
      if (data?.chartDate) setChartDate(data.chartDate);
      if (data?.xScaleType && ['index', 'freeform', 'date'].includes(data.xScaleType)) {
        setXScaleType(data.xScaleType as XScaleType);
      }
      if (data?.xAxisLabel) setXAxisLabel(data.xAxisLabel);
      if (data?.xScaleValues && Array.isArray(data.xScaleValues)) setXScaleValues(data.xScaleValues);
      if (typeof data?.constantSubgroupSize === 'boolean') setConstantSubgroupSize(data.constantSubgroupSize);
      if (typeof data?.subgroupSize === 'number') setSubgroupSize(data.subgroupSize);
      if (data?.subgroupIndexValues && Array.isArray(data.subgroupIndexValues)) setSubgroupIndexValues(data.subgroupIndexValues);
      if (typeof data?.stagesEnabled === 'boolean') setStagesEnabled(data.stagesEnabled);
      if (data?.stageValues && Array.isArray(data.stageValues)) {
        // Convert any numeric values to strings, filter out zeros (legacy empty values)
        setStageValues(data.stageValues.map((v: any) => {
          if (v === 0 || v === '0' || v === null || v === undefined) return '';
          return String(v);
        }));
      }
      if (data?.aiAnalysis && typeof data.aiAnalysis === 'string') setAiAnalysis(data.aiAnalysis);
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}`,
        payload
      );
    },
    onSuccess: () => {
      toast({ title: "Data saved", description: "Xbar-R control card data saved successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save data.", variant: "destructive" });
    },
  });

  const saveAiAnalysisMutation = useMutation({
    mutationFn: async (analysis: string) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}/ai-analysis`, { aiAnalysis: analysis });
    },
    onSuccess: () => {
      toast({ title: "AI Analysis saved", description: "Control card AI analysis saved successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save AI analysis.", variant: "destructive" });
    },
  });

  const saveToHistory = useCallback(() => {
    const currentState = JSON.stringify({ dataValues, xScaleValues, subgroupIndexValues, stageValues, stagesEnabled, constantSubgroupSize, subgroupSize });
    if (currentState !== lastSavedState) {
      setDataHistory(prev => [...prev.slice(-19), { 
        values: [...dataValues], 
        xScaleValues: [...xScaleValues], 
        subgroupIndexValues: [...subgroupIndexValues],
        stageValues: [...stageValues], 
        stagesEnabled,
        constantSubgroupSize,
        subgroupSize
      }]);
      setLastSavedState(currentState);
    }
  }, [dataValues, xScaleValues, subgroupIndexValues, stageValues, stagesEnabled, constantSubgroupSize, subgroupSize, lastSavedState]);

  const handleUndo = useCallback(() => {
    if (dataHistory.length === 0) {
      toast({ title: "Nothing to undo", description: "No previous data state available.", variant: "destructive" });
      return;
    }
    const previousState = dataHistory[dataHistory.length - 1];
    setDataValues([...previousState.values]);
    setRawInputValues(previousState.values.map(v => isNaN(v) ? '' : v.toString()));
    setXScaleValues([...previousState.xScaleValues]);
    setSubgroupIndexValues([...previousState.subgroupIndexValues]);
    setStageValues([...previousState.stageValues]);
    setStagesEnabled(previousState.stagesEnabled);
    setConstantSubgroupSize(previousState.constantSubgroupSize);
    setSubgroupSize(previousState.subgroupSize);
    setDataHistory(prev => prev.slice(0, -1));
    setLastSavedState('');
    toast({ title: "Undo successful", description: "Reverted to previous data state." });
  }, [dataHistory, toast]);

  const handleDataChange = useCallback((index: number, value: string) => {
    saveToHistory();
    setRawInputValues(prev => {
      const newRaw = [...prev];
      while (newRaw.length <= index) newRaw.push('');
      newRaw[index] = value;
      return newRaw;
    });
    setDataValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) newValues.push(NaN);
      newValues[index] = parseNumericValue(value);
      return newValues;
    });
  }, [saveToHistory]);

  const handleXScaleChange = useCallback((index: number, value: string) => {
    saveToHistory();
    setXScaleValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) newValues.push('');
      newValues[index] = value;
      return newValues;
    });
  }, [saveToHistory]);

  const handleSubgroupIndexChange = useCallback((index: number, value: string) => {
    saveToHistory();
    const numVal = parseInt(value, 10);
    setSubgroupIndexValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) newValues.push(1);
      if (value === '' || isNaN(numVal) || numVal < 1) {
        newValues[index] = 1;
      } else {
        const prevIdx = index > 0 ? newValues[index - 1] : 1;
        if (numVal === prevIdx || numVal === prevIdx + 1) {
          newValues[index] = numVal;
        } else if (numVal < prevIdx) {
          newValues[index] = prevIdx;
          toast({ title: "Invalid subgroup index", description: `Index must be at least ${prevIdx}`, variant: "destructive" });
        } else {
          newValues[index] = prevIdx + 1;
          toast({ title: "Invalid subgroup index", description: `Index must be ${prevIdx} or ${prevIdx + 1}`, variant: "destructive" });
        }
      }
      return newValues;
    });
  }, [saveToHistory, toast]);

  const handleStageChange = useCallback((index: number, value: string) => {
    saveToHistory();
    setStageValues(prev => {
      const newStages = [...prev];
      while (newStages.length <= index) newStages.push('');
      newStages[index] = value;
      return newStages;
    });
  }, [saveToHistory]);

  const handleDeleteRow = useCallback((index: number) => {
    saveToHistory();
    setDataValues(prev => prev.filter((_, i) => i !== index));
    setRawInputValues(prev => prev.filter((_, i) => i !== index));
    if (xScaleType !== 'index') {
      setXScaleValues(prev => prev.filter((_, i) => i !== index));
    }
    if (!constantSubgroupSize) {
      setSubgroupIndexValues(prev => prev.filter((_, i) => i !== index));
    }
    if (stagesEnabled) {
      setStageValues(prev => prev.filter((_, i) => i !== index));
    }
  }, [saveToHistory, xScaleType, constantSubgroupSize, stagesEnabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, col: 'xscale' | 'value' | 'subgroup' | 'stage') => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextRow = document.querySelector(`[data-cell-index="${index + 1}"][data-cell-col="${col}"]`) as HTMLInputElement;
      nextRow?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = document.querySelector(`[data-cell-index="${index - 1}"][data-cell-col="${col}"]`) as HTMLInputElement;
      prevRow?.focus();
    } else if (e.key === 'Tab') {
      if (!e.shiftKey) {
        const cols: ('xscale' | 'value' | 'subgroup' | 'stage')[] = [];
        if (xScaleType !== 'index') cols.push('xscale');
        cols.push('value');
        if (!constantSubgroupSize) cols.push('subgroup');
        if (stagesEnabled) cols.push('stage');
        const currentColIdx = cols.indexOf(col);
        if (currentColIdx < cols.length - 1) {
          e.preventDefault();
          const nextCol = cols[currentColIdx + 1];
          const nextCell = document.querySelector(`[data-cell-index="${index}"][data-cell-col="${nextCol}"]`) as HTMLInputElement;
          nextCell?.focus();
        }
      }
    }
  }, [xScaleType, constantSubgroupSize, stagesEnabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    saveToHistory();
    
    const target = e.target as HTMLInputElement;
    const focusedCol = target?.getAttribute('data-cell-col') || 'value';
    const focusedIndex = parseInt(target?.getAttribute('data-cell-index') || '0', 10);
    
    let lines = text.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines = lines.slice(0, -1);
    }
    if (lines.length === 0) return;
    
    const hasXScale = xScaleType !== 'index';
    const hasSubgroupCol = !constantSubgroupSize;
    const hasStageColumn = stagesEnabled;
    const hasMultipleColumns = lines.some(line => line.includes('\t'));
    
    // Single column paste - insert into focused column starting at focused row
    if (!hasMultipleColumns) {
      if (focusedCol === 'xscale' && hasXScale) {
        const newXScaleValues = [...xScaleValues];
        lines.forEach((line, i) => {
          const targetIndex = focusedIndex + i;
          while (newXScaleValues.length <= targetIndex) newXScaleValues.push('');
          newXScaleValues[targetIndex] = xScaleType === 'date' ? normalizeDate(line.trim()) : line.trim();
        });
        setXScaleValues(newXScaleValues);
        const maxIndex = focusedIndex + lines.length;
        if (maxIndex > dataValues.length) {
          const needed = maxIndex - dataValues.length;
          setDataValues(prev => [...prev, ...Array(needed).fill(NaN)]);
          setRawInputValues(prev => [...prev, ...Array(needed).fill('')]);
        }
        toast({ title: "Data pasted", description: `Pasted ${lines.length} x-scale values` });
        return;
      }
      if (focusedCol === 'value') {
        const newDataValues = [...dataValues];
        const newRawValues = [...rawInputValues];
        lines.forEach((line, i) => {
          const targetIndex = focusedIndex + i;
          while (newDataValues.length <= targetIndex) {
            newDataValues.push(NaN);
            newRawValues.push('');
          }
          newRawValues[targetIndex] = line.trim();
          newDataValues[targetIndex] = parseNumericValue(line.trim());
        });
        setDataValues(newDataValues);
        setRawInputValues(newRawValues);
        toast({ title: "Data pasted", description: `Pasted ${lines.length} values` });
        return;
      }
      if (focusedCol === 'subgroup' && hasSubgroupCol) {
        const newSubgroupValues = [...subgroupIndexValues];
        lines.forEach((line, i) => {
          const targetIndex = focusedIndex + i;
          while (newSubgroupValues.length <= targetIndex) newSubgroupValues.push(1);
          const val = parseInt(line.trim(), 10);
          newSubgroupValues[targetIndex] = !isNaN(val) && val >= 1 ? val : 1;
        });
        setSubgroupIndexValues(newSubgroupValues);
        toast({ title: "Data pasted", description: `Pasted ${lines.length} subgroup indices` });
        return;
      }
      if (focusedCol === 'stage' && hasStageColumn) {
        const newStageValues = [...stageValues];
        lines.forEach((line, i) => {
          const targetIndex = focusedIndex + i;
          while (newStageValues.length <= targetIndex) newStageValues.push('');
          newStageValues[targetIndex] = line.trim();
        });
        setStageValues(newStageValues);
        toast({ title: "Data pasted", description: `Pasted ${lines.length} stage values` });
        return;
      }
    }
    
    // Multi-column paste - insert starting at focused row
    const newXScaleValues = [...xScaleValues];
    const newDataValues = [...dataValues];
    const newRawValues = [...rawInputValues];
    const newSubgroupIndexValues = [...subgroupIndexValues];
    const newStageValues = [...stageValues];
    
    lines.forEach((line, lineIdx) => {
      const targetIndex = focusedIndex + lineIdx;
      const cells = line.split(/\t/);
      let cellIdx = 0;
      
      // Expand arrays if needed
      while (newDataValues.length <= targetIndex) {
        newDataValues.push(NaN);
        newRawValues.push('');
      }
      if (hasXScale) while (newXScaleValues.length <= targetIndex) newXScaleValues.push('');
      if (hasSubgroupCol) while (newSubgroupIndexValues.length <= targetIndex) newSubgroupIndexValues.push(1);
      if (hasStageColumn) while (newStageValues.length <= targetIndex) newStageValues.push('');
      
      if (hasXScale && cells.length > cellIdx) {
        newXScaleValues[targetIndex] = xScaleType === 'date' ? normalizeDate(cells[cellIdx].trim()) : cells[cellIdx].trim();
        cellIdx++;
      }
      
      if (cells.length > cellIdx) {
        const rawValue = cells[cellIdx].trim();
        newRawValues[targetIndex] = rawValue;
        newDataValues[targetIndex] = parseNumericValue(rawValue);
        cellIdx++;
      }
      
      if (hasSubgroupCol && cells.length > cellIdx) {
        const subgroupVal = parseInt(cells[cellIdx].trim(), 10);
        newSubgroupIndexValues[targetIndex] = !isNaN(subgroupVal) && subgroupVal >= 1 ? subgroupVal : 1;
        cellIdx++;
      }
      
      if (hasStageColumn && cells.length > cellIdx) {
        newStageValues[targetIndex] = cells[cellIdx].trim();
      }
    });
    
    setDataValues(newDataValues);
    setRawInputValues(newRawValues);
    if (hasXScale) setXScaleValues(newXScaleValues);
    if (hasSubgroupCol) setSubgroupIndexValues(newSubgroupIndexValues);
    if (hasStageColumn) setStageValues(newStageValues);
    
    toast({ title: "Data pasted", description: `Pasted ${lines.length} data points starting at row ${focusedIndex + 1}` });
  }, [saveToHistory, toast, xScaleType, constantSubgroupSize, stagesEnabled, xScaleValues, dataValues, rawInputValues, subgroupIndexValues, stageValues]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) {
        toast({ title: "Paste error", description: "No valid data found", variant: "destructive" });
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
        } else {
          const rawValue = cells[0].trim();
          newRawValues.push(rawValue);
          newDataValues.push(parseNumericValue(rawValue));
        }
      });
      
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      if (hasXScale) setXScaleValues(newXScaleValues);
      toast({ title: "Data pasted", description: `Successfully pasted ${newDataValues.length} data points` });
    } catch (err) {
      toast({ title: "Clipboard access denied", description: "Please allow clipboard access or use Ctrl+V to paste data directly in the table", variant: "destructive" });
    }
  }, [saveToHistory, toast, xScaleType]);

  const handleSaveData = useCallback(() => {
    const validIndices: number[] = [];
    dataValues.forEach((v, i) => { if (!isNaN(v)) validIndices.push(i); });
    const validValues = validIndices.map(i => dataValues[i]);
    
    if (validValues.length < 2) {
      toast({ title: "Insufficient data", description: "Need at least 2 data points for Xbar-R chart", variant: "destructive" });
      return;
    }
    
    const validXScaleValues = xScaleType !== 'index' ? validIndices.map(i => xScaleValues[i] || '') : [];
    const validSubgroupIndexValues = !constantSubgroupSize ? validIndices.map(i => subgroupIndexValues[i] || 1) : [];
    const validStageValues = stagesEnabled ? validIndices.map(i => stageValues[i] || '') : [];
    
    saveMutation.mutate({ 
      dataValues: validValues, 
      indicatorName, 
      chartDate, 
      xScaleType, 
      xAxisLabel,
      xScaleValues: validXScaleValues,
      constantSubgroupSize,
      subgroupSize,
      subgroupIndexValues: validSubgroupIndexValues,
      stagesEnabled,
      stageValues: validStageValues,
    });
  }, [dataValues, indicatorName, chartDate, xScaleType, xAxisLabel, xScaleValues, constantSubgroupSize, subgroupSize, subgroupIndexValues, stagesEnabled, stageValues, saveMutation, toast]);

  const handleClearAllData = useCallback(() => {
    if (dataValues.filter(v => !isNaN(v)).length === 0) {
      toast({ title: "No data to clear", description: "The data is already empty" });
      return;
    }
    saveToHistory();
    setDataValues([NaN, NaN, NaN]);
    setRawInputValues(['', '', '']);
    setXScaleValues(['', '', '']);
    setSubgroupIndexValues([]);
    setStageValues([]);
    setStagesEnabled(false);
    toast({ title: "Data cleared", description: "All data has been cleared. Use Undo to restore." });
  }, [dataValues, saveToHistory, toast]);

  // Calculate subgroups from individual data points
  const calculateSubgroups = useCallback((): SubgroupData[] => {
    const validIndices: number[] = [];
    dataValues.forEach((v, i) => { if (!isNaN(v)) validIndices.push(i); });
    if (validIndices.length < 2) return [];
    
    const subgroups: SubgroupData[] = [];
    
    if (constantSubgroupSize) {
      // Group by constant subgroup size
      let subgroupIdx = 1;
      for (let i = 0; i < validIndices.length; i += subgroupSize) {
        const groupIndices = validIndices.slice(i, i + subgroupSize);
        const values = groupIndices.map(idx => dataValues[idx]);
        if (values.length < 2) continue; // Skip incomplete subgroups
        
        const xbar = values.reduce((a, b) => a + b, 0) / values.length;
        const range = Math.max(...values) - Math.min(...values);
        const xScaleLabel = xScaleValues[groupIndices[0]] || '';
        const stageName = stagesEnabled ? (stageValues[groupIndices[0]] || '') : '';
        
        subgroups.push({ subgroupIndex: subgroupIdx, values, xbar, range, xScaleLabel, stageName });
        subgroupIdx++;
      }
    } else {
      // Group by subgroup index column
      const subgroupMap = new Map<number, { indices: number[]; values: number[] }>();
      
      validIndices.forEach(idx => {
        const subgroupIdx = subgroupIndexValues[idx] || 1;
        if (!subgroupMap.has(subgroupIdx)) {
          subgroupMap.set(subgroupIdx, { indices: [], values: [] });
        }
        subgroupMap.get(subgroupIdx)!.indices.push(idx);
        subgroupMap.get(subgroupIdx)!.values.push(dataValues[idx]);
      });
      
      Array.from(subgroupMap.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([subgroupIdx, { indices, values }]) => {
          if (values.length < 2) return; // Skip single-point subgroups
          
          const xbar = values.reduce((a, b) => a + b, 0) / values.length;
          const range = Math.max(...values) - Math.min(...values);
          const xScaleLabel = xScaleValues[indices[0]] || '';
          const stageName = stagesEnabled ? (stageValues[indices[0]] || '') : '';
          
          subgroups.push({ subgroupIndex: subgroupIdx, values, xbar, range, xScaleLabel, stageName });
        });
    }
    
    return subgroups;
  }, [dataValues, constantSubgroupSize, subgroupSize, subgroupIndexValues, xScaleValues, stagesEnabled, stageValues]);

  const subgroups = calculateSubgroups();
  const validDataValues = dataValues.filter(v => !isNaN(v));
  
  // Determine the effective subgroup size for constants
  const getEffectiveSubgroupSize = (): number => {
    if (constantSubgroupSize) return Math.min(25, Math.max(2, subgroupSize));
    if (subgroups.length > 0) {
      const avgSize = subgroups.reduce((sum, sg) => sum + sg.values.length, 0) / subgroups.length;
      return Math.min(25, Math.max(2, Math.round(avgSize)));
    }
    return 5;
  };
  
  const effectiveSubgroupSize = getEffectiveSubgroupSize();
  const constants = XBAR_R_CONSTANTS[effectiveSubgroupSize] || XBAR_R_CONSTANTS[5];

  // Calculate Xbar-R statistics
  const calculateStats = useCallback(() => {
    if (subgroups.length < 2) return null;
    
    const xbars = subgroups.map(sg => sg.xbar);
    const ranges = subgroups.map(sg => sg.range);
    
    const xbarBar = xbars.reduce((a, b) => a + b, 0) / xbars.length; // Grand mean
    const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length; // Average range
    
    const xbarUCL = xbarBar + constants.A2 * rBar;
    const xbarLCL = xbarBar - constants.A2 * rBar;
    const rUCL = constants.D4 * rBar;
    const rLCL = constants.D3 * rBar;
    
    return {
      xbarBar,
      rBar,
      xbarUCL,
      xbarLCL,
      xbarCL: xbarBar,
      rUCL,
      rLCL,
      rCL: rBar,
      xbars,
      ranges,
      subgroupCount: subgroups.length,
    };
  }, [subgroups, constants]);

  const stats = calculateStats();

  const isOutOfControl = (value: number, ucl: number, lcl: number) => value > ucl || value < lcl;

  // Generate AI Analysis
  const generateAIAnalysis = useCallback(async () => {
    if (subgroups.length < 5) {
      toast({ title: "Insufficient Data", description: `At least 5 subgroups are required. Current: ${subgroups.length}`, variant: "destructive" });
      return;
    }
    if (!stats) return;

    setIsGeneratingAnalysis(true);
    try {
      const outOfControlXbar = stats.xbars.map((v, i) => (v > stats.xbarUCL || v < stats.xbarLCL) ? i + 1 : -1).filter(i => i !== -1);
      const outOfControlR = stats.ranges.map((v, i) => (v > stats.rUCL || v < stats.rLCL) ? i + 1 : -1).filter(i => i !== -1);

      const statsPayload = {
        chartType: 'Xbar-R',
        subgroupCount: stats.subgroupCount,
        subgroupSize: effectiveSubgroupSize,
        xbarBar: stats.xbarBar,
        rBar: stats.rBar,
        xbarUCL: stats.xbarUCL,
        xbarLCL: stats.xbarLCL,
        rUCL: stats.rUCL,
        rLCL: stats.rLCL,
        outOfControlXbar,
        outOfControlR,
        xbars: stats.xbars,
        ranges: stats.ranges,
      };

      const contextPayload = {
        indicatorName,
        chartDate,
        stagesEnabled,
      };

      const response = await apiRequest('POST', `/api/projects/${projectId}/spc/xbar-r/${encodeURIComponent(ctqName)}/ai-analysis`, {
        stats: statsPayload,
        context: contextPayload,
      });

      const result = await response.json();
      if (result.success && result.assessment) {
        setAiAnalysis(result.assessment);
        toast({ title: "Analysis Generated", description: "AI control card analysis has been generated." });
      } else {
        throw new Error(result.error || "Failed to generate analysis");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate AI analysis", variant: "destructive" });
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }, [subgroups, stats, effectiveSubgroupSize, indicatorName, chartDate, stagesEnabled, projectId, ctqName, toast]);

  // Chart data
  const chartXIndices = subgroups.map((_, i) => i + 1);
  const getCustomTickLabels = (): string[] => subgroups.map(sg => sg.xScaleLabel || '');
  const customTickLabels = getCustomTickLabels();

  const getXbarChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.xbars.forEach((value, i) => {
      const xVal = chartXIndices[i];
      if (isOutOfControl(value, stats.xbarUCL, stats.xbarLCL)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(value);
      }
    });
    return { inControl, outOfControl };
  };

  const getRChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.ranges.forEach((value, i) => {
      const xVal = chartXIndices[i];
      if (isOutOfControl(value, stats.rUCL, stats.rLCL)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(value);
      }
    });
    return { inControl, outOfControl };
  };

  const xbarChartPoints = getXbarChartPointArrays();
  const rChartPoints = getRChartPointArrays();

  const displayValues = [...dataValues];
  if (displayValues.length < 3 || !isNaN(displayValues[displayValues.length - 1])) {
    displayValues.push(NaN);
  }

  const getXAxisTitle = () => {
    if (xScaleType === 'freeform' && xAxisLabel) return xAxisLabel;
    if (xScaleType === 'date') return 'Date';
    return 'Subgroup';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Xbar-R Control Chart Data Input</span>
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleClearAllData} disabled={validDataValues.length === 0} title="Clear all data" data-testid="btn-clear-xbarr">
                <Trash2 className="h-4 w-4 mr-1" />Clear All Data
              </Button>
              <Button variant="outline" size="sm" onClick={handlePasteFromClipboard} data-testid="btn-paste-xbarr">
                <Clipboard className="h-4 w-4 mr-1" />Paste
              </Button>
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={dataHistory.length === 0} data-testid="btn-undo-xbarr">
                <Undo className="h-4 w-4 mr-1" />Undo
              </Button>
              <Button size="sm" onClick={handleSaveData} disabled={saveMutation.isPending} data-testid="btn-save-xbarr">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Data
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            Enter individual measurements. Data will be grouped into subgroups for Xbar-R analysis. Supports Excel copy/paste.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="indicator-name" className="text-sm font-medium">Indicator to Monitor</Label>
              <Input id="indicator-name" type="text" value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} className="mt-1" placeholder="Enter indicator name" data-testid="input-xbarr-indicator-name" />
              <p className="text-xs text-gray-500 mt-1">This name will appear in the chart titles</p>
            </div>
            <div>
              <Label htmlFor="chart-date" className="text-sm font-medium">Chart Date</Label>
              <Input id="chart-date" type="date" value={chartDate} onChange={(e) => setChartDate(e.target.value)} className="mt-1" data-testid="input-xbarr-chart-date" />
              <p className="text-xs text-gray-500 mt-1">Date shown on the control charts</p>
            </div>
            <div>
              <Label className="text-sm font-medium">X-Axis Scale Type</Label>
              <RadioGroup value={xScaleType} onValueChange={(v) => setXScaleType(v as XScaleType)} className="mt-2 flex gap-4" data-testid="radio-xbarr-xscale-type">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="index" id="xbarr-xscale-index" />
                  <Label htmlFor="xbarr-xscale-index" className="text-sm cursor-pointer">Default Index</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="freeform" id="xbarr-xscale-freeform" />
                  <Label htmlFor="xbarr-xscale-freeform" className="text-sm cursor-pointer">Free Form</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="xbarr-xscale-date" />
                  <Label htmlFor="xbarr-xscale-date" className="text-sm cursor-pointer">Date</Label>
                </div>
              </RadioGroup>
              {xScaleType === 'freeform' && (
                <div className="mt-3">
                  <Label htmlFor="xbarr-x-axis-label" className="text-sm font-medium">X-Axis Label</Label>
                  <Input id="xbarr-x-axis-label" type="text" value={xAxisLabel} onChange={(e) => setXAxisLabel(e.target.value)} placeholder="e.g., Batch, Week..." className="mt-1 max-w-xs" data-testid="input-xbarr-x-axis-label" />
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
              <Checkbox id="constant-subgroup-size" checked={constantSubgroupSize} onCheckedChange={(checked) => {
                const isChecked = checked === true;
                setConstantSubgroupSize(isChecked);
                if (!isChecked) {
                  // Initialize subgroup index values when switching to variable mode
                  const numRows = Math.max(dataValues.length, 3);
                  setSubgroupIndexValues(Array(numRows).fill(1));
                }
              }} data-testid="checkbox-constant-subgroup-size" />
              <div>
                <Label htmlFor="constant-subgroup-size" className="text-sm font-medium cursor-pointer">Constant Subgroup Size</Label>
                <p className="text-xs text-gray-500">All subgroups have the same number of measurements</p>
              </div>
            </div>
            
            {constantSubgroupSize && (
              <div className="p-3 border rounded-lg bg-blue-50">
                <Label htmlFor="subgroup-size" className="text-sm font-medium">Subgroup Size (n)</Label>
                <Input id="subgroup-size" type="number" min={2} max={25} value={subgroupSize} onChange={(e) => setSubgroupSize(Math.min(25, Math.max(2, parseInt(e.target.value) || 5)))} className="mt-1 max-w-[100px]" data-testid="input-subgroup-size" />
                <p className="text-xs text-gray-500 mt-1">Number of measurements per subgroup (2-25)</p>
              </div>
            )}
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
              <Checkbox id="xbarr-stages-enabled" checked={stagesEnabled} onCheckedChange={(checked) => {
                const enabled = checked === true;
                setStagesEnabled(enabled);
                if (enabled) {
                  // Initialize empty stage values when enabling stages
                  const numRows = Math.max(dataValues.length, 3);
                  setStageValues(Array(numRows).fill(''));
                }
              }} data-testid="checkbox-xbarr-stages-enabled" />
              <div>
                <Label htmlFor="xbarr-stages-enabled" className="text-sm font-medium cursor-pointer">Enable Stages</Label>
                <p className="text-xs text-gray-500">Display separate control limits per stage</p>
              </div>
            </div>
          </div>
          
          <div ref={tableRef} className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto" onPaste={handlePaste}>
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-20">Index</th>
                  {xScaleType !== 'index' && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-40">
                      {xScaleType === 'date' ? 'Date' : (xAxisLabel || 'Label')}
                    </th>
                  )}
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Indicator Value</th>
                  {!constantSubgroupSize && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">Subgroup Index</th>
                  )}
                  {stagesEnabled && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">Stage</th>
                  )}
                  <th className="px-2 py-2 text-center text-sm font-medium text-gray-700 w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayValues.map((value, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-1 text-sm text-gray-600 font-medium">{index + 1}</td>
                    {xScaleType !== 'index' && (
                      <td className="px-4 py-1">
                        <Input type="text" value={xScaleValues[index] ?? ''} onChange={(e) => handleXScaleChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'xscale')} onFocus={() => setFocusedCell({ row: index, col: 'xscale' })} onBlur={() => {
                          setFocusedCell(null);
                          if (xScaleType === 'date' && xScaleValues[index]) {
                            const normalized = normalizeDate(xScaleValues[index]);
                            if (normalized !== xScaleValues[index]) handleXScaleChange(index, normalized);
                          }
                        }} className="h-8 text-sm" placeholder={xScaleType === 'date' ? 'YYYY-MM-DD' : 'Enter label'} data-cell-index={index} data-cell-col="xscale" data-testid={`input-xbarr-xscale-${index}`} />
                      </td>
                    )}
                    <td className="px-4 py-1">
                      <Input type="text" value={rawInputValues[index] ?? (isNaN(value) ? '' : value.toString())} onChange={(e) => handleDataChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'value')} onFocus={() => setFocusedCell({ row: index, col: 'value' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm" placeholder="Enter value" data-cell-index={index} data-cell-col="value" data-testid={`input-xbarr-value-${index}`} />
                    </td>
                    {!constantSubgroupSize && (() => {
                      const prevIdx = index > 0 ? (subgroupIndexValues[index - 1] || 1) : 1;
                      return (
                        <td className="px-4 py-1">
                          <Input type="number" min={1} value={subgroupIndexValues[index] > 0 ? subgroupIndexValues[index] : ''} onChange={(e) => handleSubgroupIndexChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'subgroup')} onFocus={() => setFocusedCell({ row: index, col: 'subgroup' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm w-20" placeholder={String(prevIdx)} data-cell-index={index} data-cell-col="subgroup" data-testid={`input-xbarr-subgroup-${index}`} />
                        </td>
                      );
                    })()}
                    {stagesEnabled && (
                        <td className="px-4 py-1">
                          <Input type="text" value={stageValues[index] || ''} onChange={(e) => handleStageChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'stage')} onFocus={() => setFocusedCell({ row: index, col: 'stage' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm w-24" placeholder="Stage" data-cell-index={index} data-cell-col="stage" data-testid={`input-xbarr-stage-${index}`} />
                        </td>
                    )}
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete row"
                        data-testid={`button-xbarr-delete-row-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {stats && subgroups.length >= 2 && (
        <>
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <h3 className="text-sm font-medium">
                Xbar-R Control Chart Statistics
                {chartDate && <span className="text-gray-500 ml-2">({chartDate})</span>}
              </h3>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-gray-600">Subgroups</div>
                  <div className="text-lg font-semibold">{stats.subgroupCount}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-gray-600">Subgroup Size (n)</div>
                  <div className="text-lg font-semibold">{effectiveSubgroupSize}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-gray-600">X̄ (Grand Mean)</div>
                  <div className="text-lg font-semibold">{stats.xbarBar.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-gray-600">R̄ (Avg Range)</div>
                  <div className="text-lg font-semibold">{stats.rBar.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-gray-600">X̄ UCL</div>
                  <div className="text-lg font-semibold text-red-600">{stats.xbarUCL.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-gray-600">X̄ LCL</div>
                  <div className="text-lg font-semibold text-red-600">{stats.xbarLCL.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-gray-600">R UCL</div>
                  <div className="text-lg font-semibold text-orange-600">{stats.rUCL.toFixed(4)}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-gray-600">R LCL</div>
                  <div className="text-lg font-semibold text-orange-600">{stats.rLCL.toFixed(4)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <h3 className="text-sm font-medium">X̄ Chart - {indicatorName || ctqName}</h3>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <Plot
                data={[
                  { x: xbarChartPoints.inControl.x, y: xbarChartPoints.inControl.y, type: 'scatter', mode: 'markers', name: 'In Control', marker: { color: '#2563eb', size: 8 } },
                  { x: xbarChartPoints.outOfControl.x, y: xbarChartPoints.outOfControl.y, type: 'scatter', mode: 'markers', name: 'Out of Control', marker: { color: '#dc2626', size: 10, symbol: 'diamond' } },
                  { x: chartXIndices, y: stats.xbars, type: 'scatter', mode: 'lines', name: 'X̄ Values', line: { color: '#2563eb', width: 1 }, showlegend: false },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.xbarCL), type: 'scatter', mode: 'lines', name: 'CL (X̄)', line: { color: '#16a34a', width: 2 }, hovertemplate: `CL: ${stats.xbarCL.toFixed(4)}<extra></extra>` },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.xbarUCL), type: 'scatter', mode: 'lines', name: 'UCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `UCL: ${stats.xbarUCL.toFixed(4)}<extra></extra>` },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.xbarLCL), type: 'scatter', mode: 'lines', name: 'LCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `LCL: ${stats.xbarLCL.toFixed(4)}<extra></extra>` },
                ]}
                layout={{
                  autosize: true,
                  height: 350,
                  margin: { l: 60, r: 30, t: 40, b: 50 },
                  title: { text: `X̄ Chart - ${indicatorName || ctqName}`, font: { size: 14 } },
                  xaxis: {
                    title: { text: getXAxisTitle(), font: { size: 12 } },
                    tickmode: xScaleType !== 'index' ? 'array' : undefined,
                    tickvals: xScaleType !== 'index' ? chartXIndices : undefined,
                    ticktext: xScaleType !== 'index' ? customTickLabels : undefined,
                  },
                  yaxis: { title: { text: 'Subgroup Mean (X̄)', font: { size: 12 } } },
                  legend: { orientation: 'h', y: -0.2 },
                  showlegend: true,
                }}
                config={{ responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'], displaylogo: false, toImageButtonOptions: { format: 'png', filename: `xbar_chart_${indicatorName || ctqName}`, scale: 1 } }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <h3 className="text-sm font-medium">R Chart - {indicatorName || ctqName}</h3>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <Plot
                data={[
                  { x: rChartPoints.inControl.x, y: rChartPoints.inControl.y, type: 'scatter', mode: 'markers', name: 'In Control', marker: { color: '#2563eb', size: 8 } },
                  { x: rChartPoints.outOfControl.x, y: rChartPoints.outOfControl.y, type: 'scatter', mode: 'markers', name: 'Out of Control', marker: { color: '#dc2626', size: 10, symbol: 'diamond' } },
                  { x: chartXIndices, y: stats.ranges, type: 'scatter', mode: 'lines', name: 'R Values', line: { color: '#2563eb', width: 1 }, showlegend: false },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.rCL), type: 'scatter', mode: 'lines', name: 'CL (R̄)', line: { color: '#16a34a', width: 2 }, hovertemplate: `CL: ${stats.rCL.toFixed(4)}<extra></extra>` },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.rUCL), type: 'scatter', mode: 'lines', name: 'UCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `UCL: ${stats.rUCL.toFixed(4)}<extra></extra>` },
                  { x: chartXIndices, y: chartXIndices.map(() => stats.rLCL), type: 'scatter', mode: 'lines', name: 'LCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `LCL: ${stats.rLCL.toFixed(4)}<extra></extra>` },
                ]}
                layout={{
                  autosize: true,
                  height: 350,
                  margin: { l: 60, r: 30, t: 40, b: 50 },
                  title: { text: `R Chart - ${indicatorName || ctqName}`, font: { size: 14 } },
                  xaxis: {
                    title: { text: getXAxisTitle(), font: { size: 12 } },
                    tickmode: xScaleType !== 'index' ? 'array' : undefined,
                    tickvals: xScaleType !== 'index' ? chartXIndices : undefined,
                    ticktext: xScaleType !== 'index' ? customTickLabels : undefined,
                  },
                  yaxis: { title: { text: 'Range (R)', font: { size: 12 } } },
                  legend: { orientation: 'h', y: -0.2 },
                  showlegend: true,
                }}
                config={{ responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'], displaylogo: false, toImageButtonOptions: { format: 'png', filename: `r_chart_${indicatorName || ctqName}`, scale: 1 } }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Control Card Analysis
                </h3>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); generateAIAnalysis(); }} disabled={isGeneratingAnalysis || subgroups.length < 5} data-testid="btn-xbarr-ai-control-analysis">
                    {isGeneratingAnalysis ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                    <span className="ml-1">{isGeneratingAnalysis ? "Generating..." : "Generate Analysis"}</span>
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveAiAnalysisMutation.mutate(aiAnalysis); }} disabled={saveAiAnalysisMutation.isPending || !aiAnalysis.trim()} data-testid="btn-xbarr-save-ai-analysis">
                    {saveAiAnalysisMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-1">{saveAiAnalysisMutation.isPending ? "Saving..." : "Save AI-Analysis"}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <Textarea value={aiAnalysis} onChange={(e) => setAiAnalysis(e.target.value)} placeholder={subgroups.length < 5 ? "Enter at least 5 subgroups to enable AI control card analysis..." : "Click 'Generate Analysis' to get AI-powered insights about your Xbar-R control chart data..."} className="min-h-[200px] w-full font-mono text-sm" data-testid="textarea-xbarr-ai-control-analysis" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
