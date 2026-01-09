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
import jStat from 'jstat';

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

// Xbar-S constants based on subgroup size (n=2 to n=25)
const XBAR_S_CONSTANTS: Record<number, { A3: number; B3: number; B4: number; c4: number }> = {
  2: { A3: 2.659, B3: 0, B4: 3.267, c4: 0.7979 },
  3: { A3: 1.954, B3: 0, B4: 2.568, c4: 0.8862 },
  4: { A3: 1.628, B3: 0, B4: 2.266, c4: 0.9213 },
  5: { A3: 1.427, B3: 0, B4: 2.089, c4: 0.9400 },
  6: { A3: 1.287, B3: 0.030, B4: 1.970, c4: 0.9515 },
  7: { A3: 1.182, B3: 0.118, B4: 1.882, c4: 0.9594 },
  8: { A3: 1.099, B3: 0.185, B4: 1.815, c4: 0.9650 },
  9: { A3: 1.032, B3: 0.239, B4: 1.761, c4: 0.9693 },
  10: { A3: 0.975, B3: 0.284, B4: 1.716, c4: 0.9727 },
  11: { A3: 0.927, B3: 0.321, B4: 1.679, c4: 0.9754 },
  12: { A3: 0.886, B3: 0.354, B4: 1.646, c4: 0.9776 },
  13: { A3: 0.850, B3: 0.382, B4: 1.618, c4: 0.9794 },
  14: { A3: 0.817, B3: 0.406, B4: 1.594, c4: 0.9810 },
  15: { A3: 0.789, B3: 0.428, B4: 1.572, c4: 0.9823 },
  16: { A3: 0.763, B3: 0.448, B4: 1.552, c4: 0.9835 },
  17: { A3: 0.739, B3: 0.466, B4: 1.534, c4: 0.9845 },
  18: { A3: 0.718, B3: 0.482, B4: 1.518, c4: 0.9854 },
  19: { A3: 0.698, B3: 0.497, B4: 1.503, c4: 0.9862 },
  20: { A3: 0.680, B3: 0.510, B4: 1.490, c4: 0.9869 },
  21: { A3: 0.663, B3: 0.523, B4: 1.477, c4: 0.9876 },
  22: { A3: 0.647, B3: 0.534, B4: 1.466, c4: 0.9882 },
  23: { A3: 0.633, B3: 0.545, B4: 1.455, c4: 0.9887 },
  24: { A3: 0.619, B3: 0.555, B4: 1.445, c4: 0.9892 },
  25: { A3: 0.606, B3: 0.565, B4: 1.435, c4: 0.9896 },
};

interface XbarSCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
  xScaleValues: string[];
  subgroupIndexValues: string[];
  stageValues: string[];
  stagesEnabled: boolean;
  constantSubgroupSize: boolean;
  subgroupSize: number;
}

type XScaleType = 'index' | 'freeform' | 'date';

interface SubgroupData {
  subgroupIndex: string;
  values: number[];
  xbar: number;
  stdev: number;
  xScaleLabel: string;
  stageName: string;
}

interface StageStats {
  stageName: string;
  startIdx: number;  // 1-based subgroup index for chart
  endIdx: number;
  subgroups: SubgroupData[];
  xbarBar: number;
  sBar: number;
  xbarUCL: number;
  xbarLCL: number;
  xbarCL: number;
  sUCL: number;
  sLCL: number;
  sCL: number;
}

export function XbarSCard({ projectId, ctqName }: XbarSCardProps) {
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
  const [subgroupIndexValues, setSubgroupIndexValues] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

  const dataQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}`],
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
        `/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}`,
        payload
      );
    },
    onSuccess: () => {
      toast({ title: "Data saved", description: "Xbar-S control card data saved successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save data.", variant: "destructive" });
    },
  });

  const saveAiAnalysisMutation = useMutation({
    mutationFn: async (analysis: string) => {
      return apiRequest('PATCH', `/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}/ai-analysis`, { aiAnalysis: analysis });
    },
    onSuccess: () => {
      toast({ title: "AI Analysis saved", description: "Control card AI analysis saved successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}`] });
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
    setSubgroupIndexValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) newValues.push('');
      newValues[index] = value;
      return newValues;
    });
  }, [saveToHistory]);

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
    setDataValues(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Always ensure there's at least one empty row after the last data
      if (filtered.length === 0 || !isNaN(filtered[filtered.length - 1])) {
        return [...filtered, NaN];
      }
      return filtered;
    });
    setRawInputValues(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length === 0 || filtered[filtered.length - 1] !== '') {
        return [...filtered, ''];
      }
      return filtered;
    });
    if (xScaleType !== 'index') {
      setXScaleValues(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        if (filtered.length === 0 || filtered[filtered.length - 1] !== '') {
          return [...filtered, ''];
        }
        return filtered;
      });
    }
    if (!constantSubgroupSize) {
      setSubgroupIndexValues(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        if (filtered.length === 0 || filtered[filtered.length - 1] !== '') {
          return [...filtered, ''];
        }
        return filtered;
      });
    }
    if (stagesEnabled) {
      setStageValues(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        return filtered;
      });
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
          while (newSubgroupValues.length <= targetIndex) newSubgroupValues.push('');
          newSubgroupValues[targetIndex] = line.trim();
        });
        setSubgroupIndexValues(newSubgroupValues);
        toast({ title: "Data pasted", description: `Pasted ${lines.length} subgroup values` });
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
      if (hasSubgroupCol) while (newSubgroupIndexValues.length <= targetIndex) newSubgroupIndexValues.push('');
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
        newSubgroupIndexValues[targetIndex] = cells[cellIdx].trim();
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
      toast({ title: "Insufficient data", description: "Need at least 2 data points for Xbar-S chart", variant: "destructive" });
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
        const stdev =jStat.stdev(values);
        const xScaleLabel = xScaleValues[groupIndices[0]] || '';
        const stageName = stagesEnabled ? (stageValues[groupIndices[0]] || '') : '';
        
        subgroups.push({ subgroupIndex: String(subgroupIdx), values, xbar, stdev, xScaleLabel, stageName });
        subgroupIdx++;
      }
    } else {
      // Group by subgroup column (textual - groups by same string value)
      const subgroupMap = new Map<string, { indices: number[]; values: number[]; firstIndex: number }>();
      const subgroupOrder: string[] = [];
      
      validIndices.forEach(idx => {
        const subgroupKey = subgroupIndexValues[idx] || '';
        if (!subgroupMap.has(subgroupKey)) {
          subgroupMap.set(subgroupKey, { indices: [], values: [], firstIndex: idx });
          subgroupOrder.push(subgroupKey);
        }
        subgroupMap.get(subgroupKey)!.indices.push(idx);
        subgroupMap.get(subgroupKey)!.values.push(dataValues[idx]);
      });
      
      // Maintain order of first appearance
      subgroupOrder.forEach(subgroupKey => {
        const { indices, values } = subgroupMap.get(subgroupKey)!;
        if (values.length < 2) return; // Skip single-point subgroups
        
        const xbar = values.reduce((a, b) => a + b, 0) / values.length;
        const stdev =jStat.stdev(values);
        const xScaleLabel = xScaleValues[indices[0]] || '';
        const stageName = stagesEnabled ? (stageValues[indices[0]] || '') : '';
        
        subgroups.push({ subgroupIndex: subgroupKey, values, xbar, stdev, xScaleLabel, stageName });
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
  const constants = XBAR_S_CONSTANTS[effectiveSubgroupSize] || XBAR_S_CONSTANTS[5];

  // Calculate Xbar-S statistics
  const calculateStats = useCallback(() => {
    if (subgroups.length < 2) return null;
    
    const xbars = subgroups.map(sg => sg.xbar);
    const stdevs = subgroups.map(sg => sg.stdev);
    
    const xbarBar = xbars.reduce((a, b) => a + b, 0) / xbars.length; // Grand mean
    const sBar = stdevs.reduce((a, b) => a + b, 0) / stdevs.length; // Average range
    
    const xbarUCL = xbarBar + constants.A3 * sBar;
    const xbarLCL = xbarBar - constants.A3 * sBar;
    const sUCL = constants.B4 * sBar;
    const sLCL = constants.B3 * sBar;
    
    return {
      xbarBar,
      sBar,
      xbarUCL,
      xbarLCL,
      xbarCL: xbarBar,
      sUCL,
      sLCL,
      sCL: sBar,
      xbars,
      stdevs,
      subgroupCount: subgroups.length,
    };
  }, [subgroups, constants]);

  const stats = calculateStats();

  // Calculate per-stage statistics for Xbar-S charts
  const calculateStageStats = useCallback((): StageStats[] => {
    if (!stagesEnabled || subgroups.length < 2) return [];
    
    const stages: StageStats[] = [];
    let currentStage = subgroups[0]?.stageName || '';
    let stageStartIdx = 0;
    
    const processStage = (stageName: string, startIdx: number, endIdx: number): StageStats | null => {
      const stageSubgroups = subgroups.slice(startIdx, endIdx + 1);
      if (stageSubgroups.length < 2) return null; // Need at least 2 subgroups for control limits
      
      const xbars = stageSubgroups.map(sg => sg.xbar);
      const stdevs = stageSubgroups.map(sg => sg.stdev);
      
      const xbarBar = xbars.reduce((a, b) => a + b, 0) / xbars.length;
      const sBar = stdevs.reduce((a, b) => a + b, 0) / stdevs.length;
      
      return {
        stageName,
        startIdx: startIdx + 1, // 1-based for chart
        endIdx: endIdx + 1,
        subgroups: stageSubgroups,
        xbarBar,
        sBar,
        xbarUCL: xbarBar + constants.A3 * sBar,
        xbarLCL: xbarBar - constants.A3 * sBar,
        xbarCL: xbarBar,
        sUCL: constants.B4 * sBar,
        sLCL: constants.B3 * sBar,
        sCL: sBar,
      };
    };
    
    for (let i = 1; i <= subgroups.length; i++) {
      const nextStage = i < subgroups.length ? (subgroups[i]?.stageName || '') : '';
      
      if (nextStage !== currentStage || i === subgroups.length) {
        if (currentStage !== '') {
          const stageStats = processStage(currentStage, stageStartIdx, i - 1);
          if (stageStats) stages.push(stageStats);
        }
        stageStartIdx = i;
        currentStage = nextStage;
      }
    }
    
    return stages;
  }, [stagesEnabled, subgroups, constants]);

  const stageStatsList = calculateStageStats();

  // Helper to find stage stats for a given chart index (1-based subgroup index)
  const getStageStatsForIndex = (chartIdx: number): StageStats | null => {
    if (!stagesEnabled || stageStatsList.length === 0) return null;
    return stageStatsList.find(s => chartIdx >= s.startIdx && chartIdx <= s.endIdx) || null;
  };

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
      const outOfControlS = stats.stdevs.map((v, i) => (v > stats.sUCL || v < stats.sLCL) ? i + 1 : -1).filter(i => i !== -1);

      const statsPayload = {
        chartType: 'Xbar-S',
        subgroupCount: stats.subgroupCount,
        subgroupSize: effectiveSubgroupSize,
        constantSubgroupSize,
        xbarBar: stats.xbarBar,
        sBar: stats.sBar,
        xbarUCL: stats.xbarUCL,
        xbarLCL: stats.xbarLCL,
        sUCL: stats.sUCL,
        sLCL: stats.sLCL,
        outOfControlXbar,
        outOfControlS,
        xbars: stats.xbars,
        stdDevs: stats.stdevs,
        stagesEnabled,
        stageStats: stagesEnabled ? stageStatsList : undefined,
      };

      const contextPayload = {
        indicatorName,
        chartDate,
        stagesEnabled,
      };

      const response = await apiRequest('POST', `/api/projects/${projectId}/spc/xbar-s/${encodeURIComponent(ctqName)}/ai-analysis`, {
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
  }, [subgroups, stats, effectiveSubgroupSize, indicatorName, chartDate, stagesEnabled, stageStatsList, constantSubgroupSize, projectId, ctqName, toast]);

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
      let ucl = stats.xbarUCL;
      let lcl = stats.xbarLCL;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          ucl = stageStats.xbarUCL;
          lcl = stageStats.xbarLCL;
        }
      }
      
      if (isOutOfControl(value, ucl, lcl)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(value);
      }
    });
    return { inControl, outOfControl };
  };

  const getSChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.stdevs.forEach((value, i) => {
      const xVal = chartXIndices[i];
      let ucl = stats.sUCL;
      let lcl = stats.sLCL;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          ucl = stageStats.sUCL;
          lcl = stageStats.sLCL;
        }
      }
      
      if (isOutOfControl(value, ucl, lcl)) {
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
  const sChartPoints = getSChartPointArrays();

  // Generate per-stage control limit traces for X̄ chart
  const generateXbarChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      const xPoints: number[] = [];
      for (let i = stageStat.startIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
      }
      
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.xbarCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'CL (X̄)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.xbarCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.xbarUCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageStat.xbarUCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.xbarLCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageStat.xbarLCL.toFixed(4)}<extra></extra>`,
      });
    });
    
    return traces;
  };

  // Generate per-stage control limit traces for R chart
  const generateSChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      const xPoints: number[] = [];
      for (let i = stageStat.startIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
      }
      
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.sCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'CL (S̄)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.sCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.sUCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageStat.sUCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.sLCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageStat.sLCL.toFixed(4)}<extra></extra>`,
      });
    });
    
    return traces;
  };

  // Generate vertical separator lines between stages
  const generateStageSeparatorShapes = () => {
    if (!stagesEnabled || subgroups.length === 0) return [];
    
    const shapes: any[] = [];
    
    for (let i = 1; i < subgroups.length; i++) {
      const prevStage = subgroups[i - 1]?.stageName || '';
      const currStage = subgroups[i]?.stageName || '';
      
      if (prevStage !== '' && currStage !== '' && prevStage !== currStage) {
        const xPos = i + 0.5;
        shapes.push({
          type: 'line',
          x0: xPos,
          x1: xPos,
          y0: 0,
          y1: 1,
          xref: 'x',
          yref: 'paper',
          line: { color: '#6b7280', width: 2, dash: 'dash' },
        });
      }
    }
    
    return shapes;
  };

  // Generate stage name annotations
  const generateStageAnnotations = () => {
    if (!stagesEnabled || subgroups.length === 0) return [];
    
    const stageStdevs: { stageName: string; startIdx: number; endIdx: number }[] = [];
    let currentStage = subgroups[0]?.stageName || '';
    let startIdx = 0;
    
    for (let i = 1; i <= subgroups.length; i++) {
      const nextStage = i < subgroups.length ? (subgroups[i]?.stageName || '') : '';
      if (nextStage !== currentStage) {
        if (currentStage !== '') {
          stageStdevs.push({
            stageName: currentStage,
            startIdx: startIdx + 1,
            endIdx: i,
          });
        }
        startIdx = i;
        currentStage = nextStage;
      }
    }
    
    return stageStdevs.map(stdev => ({
      x: (stdev.startIdx + stdev.endIdx) / 2,
      y: 1.05,
      xref: 'x' as const,
      yref: 'paper' as const,
      text: stdev.stageName,
      showarrow: false,
      font: { color: '#6b7280', size: 10 },
    }));
  };

  const generateXbarChartStageLimitLabels = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    const annotations: any[] = [];
    stageStatsList.forEach(stageStat => {
      annotations.push(
        {
          x: stageStat.endIdx,
          y: stageStat.xbarUCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `UCL=${stageStat.xbarUCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: stageStat.endIdx,
          y: stageStat.xbarCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `CL=${stageStat.xbarCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#16a34a', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#16a34a',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: stageStat.endIdx,
          y: stageStat.xbarLCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `LCL=${stageStat.xbarLCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        }
      );
    });
    return annotations;
  };

  const generateSChartStageLimitLabels = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    const annotations: any[] = [];
    stageStatsList.forEach(stageStat => {
      annotations.push(
        {
          x: stageStat.endIdx,
          y: stageStat.sUCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `UCL=${stageStat.sUCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: stageStat.endIdx,
          y: stageStat.sCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `CL=${stageStat.sCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#16a34a', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#16a34a',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: stageStat.endIdx,
          y: stageStat.sLCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `LCL=${stageStat.sLCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 10 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        }
      );
    });
    return annotations;
  };

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
            <span>Xbar-S Control Chart Data Input</span>
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleClearAllData} disabled={validDataValues.length === 0} title="Clear all data" data-testid="btn-clear-xbars">
                <Trash2 className="h-4 w-4 mr-1" />Clear All Data
              </Button>
              <Button variant="outline" size="sm" onClick={handlePasteFromClipboard} data-testid="btn-paste-xbars">
                <Clipboard className="h-4 w-4 mr-1" />Paste
              </Button>
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={dataHistory.length === 0} data-testid="btn-undo-xbars">
                <Undo className="h-4 w-4 mr-1" />Undo
              </Button>
              <Button size="sm" onClick={handleSaveData} disabled={saveMutation.isPending} data-testid="btn-save-xbars">
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Data
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            Enter individual measurements. Data will be grouped into subgroups for Xbar-S analysis. Supports Excel copy/paste.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="indicator-name" className="text-sm font-medium">Indicator to Monitor</Label>
              <Input id="indicator-name" type="text" value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} className="mt-1" placeholder="Enter indicator name" data-testid="input-xbars-indicator-name" />
              <p className="text-xs text-gray-500 mt-1">This name will appear in the chart titles</p>
            </div>
            <div>
              <Label htmlFor="chart-date" className="text-sm font-medium">Chart Date</Label>
              <Input id="chart-date" type="date" value={chartDate} onChange={(e) => setChartDate(e.target.value)} className="mt-1" data-testid="input-xbars-chart-date" />
              <p className="text-xs text-gray-500 mt-1">Date shown on the control charts</p>
            </div>
            <div>
              <Label className="text-sm font-medium">X-Axis Scale Type</Label>
              <RadioGroup value={xScaleType} onValueChange={(v) => setXScaleType(v as XScaleType)} className="mt-2 flex gap-4" data-testid="radio-xbars-xscale-type">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="index" id="xbars-xscale-index" />
                  <Label htmlFor="xbars-xscale-index" className="text-sm cursor-pointer">Default Index</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="freeform" id="xbars-xscale-freeform" />
                  <Label htmlFor="xbars-xscale-freeform" className="text-sm cursor-pointer">Free Form</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="xbars-xscale-date" />
                  <Label htmlFor="xbars-xscale-date" className="text-sm cursor-pointer">Date</Label>
                </div>
              </RadioGroup>
              {xScaleType === 'freeform' && (
                <div className="mt-3">
                  <Label htmlFor="xbars-x-axis-label" className="text-sm font-medium">X-Axis Label</Label>
                  <Input id="xbars-x-axis-label" type="text" value={xAxisLabel} onChange={(e) => setXAxisLabel(e.target.value)} placeholder="e.g., Batch, Week..." className="mt-1 max-w-xs" data-testid="input-xbars-x-axis-label" />
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
              <Checkbox id="xbars-stages-enabled" checked={stagesEnabled} onCheckedChange={(checked) => {
                const enabled = checked === true;
                setStagesEnabled(enabled);
                if (enabled) {
                  // Initialize empty stage values when enabling stages
                  const numRows = Math.max(dataValues.length, 3);
                  setStageValues(Array(numRows).fill(''));
                }
              }} data-testid="checkbox-xbars-stages-enabled" />
              <div>
                <Label htmlFor="xbars-stages-enabled" className="text-sm font-medium cursor-pointer">Enable Stages</Label>
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
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-32">Subgroup</th>
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
                        }} className="h-8 text-sm" placeholder={xScaleType === 'date' ? 'YYYY-MM-DD' : 'Enter label'} data-cell-index={index} data-cell-col="xscale" data-testid={`input-xbars-xscale-${index}`} />
                      </td>
                    )}
                    <td className="px-4 py-1">
                      <Input type="text" value={rawInputValues[index] ?? (isNaN(value) ? '' : value.toString())} onChange={(e) => handleDataChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'value')} onFocus={() => setFocusedCell({ row: index, col: 'value' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm" placeholder="Enter value" data-cell-index={index} data-cell-col="value" data-testid={`input-xbars-value-${index}`} />
                    </td>
                    {!constantSubgroupSize && (
                      <td className="px-4 py-1">
                        <Input type="text" value={subgroupIndexValues[index] || ''} onChange={(e) => handleSubgroupIndexChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'subgroup')} onFocus={() => setFocusedCell({ row: index, col: 'subgroup' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm w-24" placeholder="Subgroup" data-cell-index={index} data-cell-col="subgroup" data-testid={`input-xbars-subgroup-${index}`} />
                      </td>
                    )}
                    {stagesEnabled && (
                        <td className="px-4 py-1">
                          <Input type="text" value={stageValues[index] || ''} onChange={(e) => handleStageChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index, 'stage')} onFocus={() => setFocusedCell({ row: index, col: 'stage' })} onBlur={() => setFocusedCell(null)} className="h-8 text-sm w-24" placeholder="Stage" data-cell-index={index} data-cell-col="stage" data-testid={`input-xbars-stage-${index}`} />
                        </td>
                    )}
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete row"
                        data-testid={`button-xbars-delete-row-${index}`}
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
                Xbar-S Control Chart Summary
                {chartDate && <span className="text-gray-500 ml-2">({chartDate})</span>}
              </h3>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-gray-600">Total Subgroups</div>
                  <div className="text-lg font-semibold">{stats.subgroupCount}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-gray-600">Subgroup Size (n)</div>
                  <div className="text-lg font-semibold">{constantSubgroupSize ? effectiveSubgroupSize : 'variable'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              {/* <CardTitle className="text-lg">X̄ Chart (Subgroup Means)</CardTitle> */}
              <CardTitle className="text-lg">Xbar Chart (Subgroup Means)</CardTitle>
            </CardHeader>
            <CardContent>
              {stagesEnabled && stageStatsList.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {stageStatsList.map(stageStat => (
                    <div key={stageStat.stageName} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{stageStat.stageName}</div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">UCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.xbarUCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">CL (X̄)</Label>
                          <div className="font-semibold text-green-700">{stageStat.xbarCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">LCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.xbarLCL.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">UCL</Label>
                    <div className="font-semibold text-blue-700">{stats.xbarUCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Centerline (X̄)</Label>
                    <div className="font-semibold text-green-700">{stats.xbarCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">LCL</Label>
                    <div className="font-semibold text-blue-700">{stats.xbarLCL.toFixed(4)}</div>
                  </div>
                </div>
              )}
              <Plot
                data={[
                  { x: xbarChartPoints.inControl.x, y: xbarChartPoints.inControl.y, type: 'scatter', mode: 'markers', name: 'In Control', marker: { color: '#2563eb', size: 8 } },
                  { x: xbarChartPoints.outOfControl.x, y: xbarChartPoints.outOfControl.y, type: 'scatter', mode: 'markers', name: 'Out of Control', marker: { color: '#dc2626', size: 10, symbol: 'diamond' } },
                  { x: chartXIndices, y: stats.xbars, type: 'scatter', mode: 'lines', name: 'X̄ Values', line: { color: '#2563eb', width: 1 }, showlegend: false },
                  ...(stagesEnabled && stageStatsList.length > 0 
                    ? generateXbarChartStageTraces()
                    : [
                        { x: chartXIndices, y: chartXIndices.map(() => stats.xbarCL), type: 'scatter', mode: 'lines', name: 'CL (X̄)', line: { color: '#16a34a', width: 2 }, hovertemplate: `CL: ${stats.xbarCL.toFixed(4)}<extra></extra>` },
                        { x: chartXIndices, y: chartXIndices.map(() => stats.xbarUCL), type: 'scatter', mode: 'lines', name: 'UCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `UCL: ${stats.xbarUCL.toFixed(4)}<extra></extra>` },
                        { x: chartXIndices, y: chartXIndices.map(() => stats.xbarLCL), type: 'scatter', mode: 'lines', name: 'LCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `LCL: ${stats.xbarLCL.toFixed(4)}<extra></extra>` },
                      ]
                  ),
                ]}
                layout={{
                  autosize: true,
                  height: 350,
                  margin: { l: 60, r: 100, t: 50, b: 50 },
                  title: { text: `Xbar (X̄) Chart of ${indicatorName || ctqName}`, font: { size: 14 } },
                  xaxis: {
                    title: { text: getXAxisTitle(), font: { size: 12 } },
                    tickmode: xScaleType !== 'index' ? 'array' : undefined,
                    tickvals: xScaleType !== 'index' ? chartXIndices : undefined,
                    ticktext: xScaleType !== 'index' ? customTickLabels : undefined,
                  },
                  yaxis: { title: { text: 'Subgroup Mean (X̄)', font: { size: 12 } } },
                  legend: { orientation: 'h', y: -0.3 },
                  showlegend: true,
                  shapes: generateStageSeparatorShapes(),
                  annotations: [
                    ...generateStageAnnotations(),
                    ...generateXbarChartStageLimitLabels(),
                    ...(!stagesEnabled ? [
                      {
                        x: chartXIndices.length,
                        y: stats.xbarUCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `UCL=${stats.xbarUCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#dc2626', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#dc2626',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                      {
                        x: chartXIndices.length,
                        y: stats.xbarCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `CL=${stats.xbarCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#16a34a', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#16a34a',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                      {
                        x: chartXIndices.length,
                        y: stats.xbarLCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `LCL=${stats.xbarLCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#dc2626', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#dc2626',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                    ] : []),
                  ],
                }}
                config={{ responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'], displaylogo: false, toImageButtonOptions: { format: 'png', filename: `xbar_chart_${indicatorName || ctqName}`, scale: 1 } }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">S Chart (Standard Deviation)</CardTitle>
            </CardHeader>
            <CardContent>
              {stagesEnabled && stageStatsList.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {stageStatsList.map(stageStat => (
                    <div key={stageStat.stageName} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{stageStat.stageName}</div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">UCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.sUCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">CL (S̄)</Label>
                          <div className="font-semibold text-green-700">{stageStat.sCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">LCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.sLCL.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">UCL</Label>
                    <div className="font-semibold text-blue-700">{stats.sUCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Centerline (S̄)</Label>
                    <div className="font-semibold text-green-700">{stats.sCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">LCL</Label>
                    <div className="font-semibold text-blue-700">{stats.sLCL.toFixed(4)}</div>
                  </div>
                </div>
              )}
              <Plot
                data={[
                  { x: sChartPoints.inControl.x, y: sChartPoints.inControl.y, type: 'scatter', mode: 'markers', name: 'In Control', marker: { color: '#2563eb', size: 8 } },
                  { x: sChartPoints.outOfControl.x, y: sChartPoints.outOfControl.y, type: 'scatter', mode: 'markers', name: 'Out of Control', marker: { color: '#dc2626', size: 10, symbol: 'diamond' } },
                  { x: chartXIndices, y: stats.stdevs, type: 'scatter', mode: 'lines', name: 'R Values', line: { color: '#2563eb', width: 1 }, showlegend: false },
                  ...(stagesEnabled && stageStatsList.length > 0 
                    ? generateSChartStageTraces()
                    : [
                        { x: chartXIndices, y: chartXIndices.map(() => stats.sCL), type: 'scatter', mode: 'lines', name: 'CL (S̄)', line: { color: '#16a34a', width: 2 }, hovertemplate: `CL: ${stats.sCL.toFixed(4)}<extra></extra>` },
                        { x: chartXIndices, y: chartXIndices.map(() => stats.sUCL), type: 'scatter', mode: 'lines', name: 'UCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `UCL: ${stats.sUCL.toFixed(4)}<extra></extra>` },
                        { x: chartXIndices, y: chartXIndices.map(() => stats.sLCL), type: 'scatter', mode: 'lines', name: 'LCL', line: { color: '#dc2626', width: 2, dash: 'dash' }, hovertemplate: `LCL: ${stats.sLCL.toFixed(4)}<extra></extra>` },
                      ]
                  ),
                ]}
                layout={{
                  autosize: true,
                  height: 350,
                  margin: { l: 60, r: 100, t: 50, b: 50 },
                  title: { text: `S (Standard Deviation) Chart of ${indicatorName || ctqName}`, font: { size: 14 } },
                  xaxis: {
                    title: { text: getXAxisTitle(), font: { size: 12 } },
                    tickmode: xScaleType !== 'index' ? 'array' : undefined,
                    tickvals: xScaleType !== 'index' ? chartXIndices : undefined,
                    ticktext: xScaleType !== 'index' ? customTickLabels : undefined,
                  },
                  yaxis: { title: { text: 'Std Dev (S)', font: { size: 12 } } },
                  legend: { orientation: 'h', y: -0.3 },
                  showlegend: true,
                  shapes: generateStageSeparatorShapes(),
                  annotations: [
                    ...generateStageAnnotations(),
                    ...generateSChartStageLimitLabels(),
                    ...(!stagesEnabled ? [
                      {
                        x: chartXIndices.length,
                        y: stats.sUCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `UCL=${stats.sUCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#dc2626', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#dc2626',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                      {
                        x: chartXIndices.length,
                        y: stats.sCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `CL=${stats.sCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#16a34a', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#16a34a',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                      {
                        x: chartXIndices.length,
                        y: stats.sLCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `LCL=${stats.sLCL.toFixed(2)}`,
                        showarrow: false,
                        xanchor: 'left' as const,
                        yanchor: 'middle' as const,
                        font: { color: '#dc2626', size: 11 },
                        bgcolor: 'rgba(255,255,255,0.9)',
                        bordercolor: '#dc2626',
                        borderwidth: 1,
                        borderpad: 3,
                      },
                    ] : []),
                  ],
                }}
                config={{ responsive: true, displayModeBar: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'], displaylogo: false, toImageButtonOptions: { format: 'png', filename: `s_chart_${indicatorName || ctqName}`, scale: 1 } }}
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
                  <Button type="button" variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); generateAIAnalysis(); }} disabled={isGeneratingAnalysis || subgroups.length < 5} data-testid="btn-xbars-ai-control-analysis">
                    {isGeneratingAnalysis ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-600" />}
                    <span className="ml-1">{isGeneratingAnalysis ? "Generating..." : "Generate Analysis"}</span>
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveAiAnalysisMutation.mutate(aiAnalysis); }} disabled={saveAiAnalysisMutation.isPending || !aiAnalysis.trim()} data-testid="btn-xbars-save-ai-analysis">
                    {saveAiAnalysisMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-1">{saveAiAnalysisMutation.isPending ? "Saving..." : "Save AI-Analysis"}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <Textarea value={aiAnalysis} onChange={(e) => setAiAnalysis(e.target.value)} placeholder={subgroups.length < 5 ? "Enter at least 5 subgroups to enable AI control card analysis..." : "Click 'Generate Analysis' to get AI-powered insights about your Xbar-S control chart data..."} className="min-h-[200px] w-full font-mono text-sm" data-testid="textarea-xbars-ai-control-analysis" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
