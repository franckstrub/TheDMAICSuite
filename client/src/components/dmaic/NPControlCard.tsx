import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Undo, Clipboard, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import Plot from 'react-plotly.js';

function normalizeDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
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

interface NPControlCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
  xScaleValues: string[];
  stageValues: string[];
  stagesEnabled: boolean;
}

type XScaleType = 'index' | 'freeform' | 'date';

export function NPControlCard({ projectId, ctqName }: NPControlCardProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [dataValues, setDataValues] = useState<number[]>([NaN, NaN, NaN]);
  const [rawInputValues, setRawInputValues] = useState<string[]>(['', '', '']);
  const [xScaleType, setXScaleType] = useState<XScaleType>('index');
  const [xAxisLabel, setXAxisLabel] = useState<string>('');
  const [xScaleValues, setXScaleValues] = useState<string[]>(['', '', '']);
  const [dataHistory, setDataHistory] = useState<DataHistory[]>([]);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: 'xscale' | 'value' | 'stage' } | null>(null);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [indicatorName, setIndicatorName] = useState<string>(ctqName);
  const [chartDate, setChartDate] = useState<string>('');
  const [stagesEnabled, setStagesEnabled] = useState<boolean>(false);
  const [stageValues, setStageValues] = useState<string[]>([]);
  const [sampleSize, setSampleSize] = useState<number>(50);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

  const dataQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}`],
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
      if (data?.xAxisLabel) {
        setXAxisLabel(data.xAxisLabel);
      }
      if (data?.xScaleValues && Array.isArray(data.xScaleValues)) {
        setXScaleValues(data.xScaleValues);
      }
      if (typeof data?.stagesEnabled === 'boolean') {
        setStagesEnabled(data.stagesEnabled);
      }
      if (data?.stageValues && Array.isArray(data.stageValues)) {
        setStageValues(data.stageValues.map((v: any) => {
          if (v === 0 || v === '0' || v === null || v === undefined) return '';
          return String(v);
        }));
      }
      if (typeof data?.sampleSize === 'number' && data.sampleSize > 0) {
        setSampleSize(data.sampleSize);
      }
      if (data?.aiAnalysis && typeof data.aiAnalysis === 'string') {
        setAiAnalysis(data.aiAnalysis);
      }
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { 
      defectiveCounts: number[]; 
      sampleSize: number;
      indicatorName: string; 
      chartDate: string; 
      xScaleType: XScaleType; 
      xAxisLabel: string; 
      xScaleValues: string[]; 
      stagesEnabled: boolean; 
      stageValues: string[];
    }) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}`,
        payload
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "NP control card data saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}`]
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

  const saveAiAnalysisMutation = useMutation({
    mutationFn: async (analysis: string) => {
      return apiRequest(
        'PATCH',
        `/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}/ai-analysis`,
        { aiAnalysis: analysis }
      );
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis saved",
        description: "NP chart AI analysis saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save AI analysis.",
        variant: "destructive",
      });
    },
  });

  const saveToHistory = useCallback(() => {
    const currentState = JSON.stringify({ dataValues, xScaleValues, stageValues, stagesEnabled });
    if (currentState !== lastSavedState) {
      setDataHistory(prev => [...prev.slice(-19), { values: [...dataValues], xScaleValues: [...xScaleValues], stageValues: [...stageValues], stagesEnabled }]);
      setLastSavedState(currentState);
    }
  }, [dataValues, xScaleValues, stageValues, stagesEnabled, lastSavedState]);

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
    setStageValues([...previousState.stageValues]);
    setStagesEnabled(previousState.stagesEnabled);
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
    const intValue = !isNaN(numValue) ? Math.round(numValue) : NaN;
    setDataValues(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) {
        newValues.push(NaN);
      }
      newValues[index] = intValue >= 0 ? intValue : NaN;
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, col: 'xscale' | 'value' | 'stage') => {
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
        setStageValues(prev => [...prev, '']);
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
    } else if (e.key === 'Tab' && !e.shiftKey && col === 'value' && stagesEnabled) {
      e.preventDefault();
      const stageInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="stage"]`) as HTMLInputElement;
      if (stageInput) stageInput.focus();
    } else if (e.key === 'Tab' && e.shiftKey && col === 'stage') {
      e.preventDefault();
      const valueInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="value"]`) as HTMLInputElement;
      if (valueInput) valueInput.focus();
    }
  }, [handleUndo, saveToHistory, stagesEnabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const target = e.target as HTMLInputElement;
    const focusedCol = target?.getAttribute('data-cell-col') || 'value';
    const focusedIndex = parseInt(target?.getAttribute('data-cell-index') || '0', 10);
    
    let lines = pastedText.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines = lines.slice(0, -1);
    }
    
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
    const hasMultipleColumns = lines.some(line => line.includes('\t'));
    
    if (focusedCol === 'xscale' && hasXScale && !hasMultipleColumns) {
      const newXScaleValues = [...xScaleValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        while (newXScaleValues.length <= targetIndex) {
          newXScaleValues.push('');
        }
        while (dataValues.length <= targetIndex) {
          setDataValues(prev => [...prev, NaN]);
          setRawInputValues(prev => [...prev, '']);
        }
        newXScaleValues[targetIndex] = xScaleType === 'date' ? normalizeDate(line) : line;
      });
      setXScaleValues(newXScaleValues);
      if (focusedIndex + lines.length > dataValues.length) {
        const needed = focusedIndex + lines.length - dataValues.length;
        setDataValues(prev => [...prev, ...Array(needed).fill(NaN)]);
        setRawInputValues(prev => [...prev, ...Array(needed).fill('')]);
      }
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} x-scale values`,
      });
      return;
    }
    
    if (focusedCol === 'value' && !hasMultipleColumns) {
      const newDataValues = [...dataValues];
      const newRawValues = [...rawInputValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        while (newDataValues.length <= targetIndex) {
          newDataValues.push(NaN);
          newRawValues.push('');
        }
        newRawValues[targetIndex] = line;
        const numVal = parseNumericValue(line);
        newDataValues[targetIndex] = !isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN;
      });
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      if (hasXScale && focusedIndex + lines.length > xScaleValues.length) {
        const needed = focusedIndex + lines.length - xScaleValues.length;
        setXScaleValues(prev => [...prev, ...Array(needed).fill('')]);
      }
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} defective counts`,
      });
      return;
    }
    
    if (focusedCol === 'stage' && stagesEnabled && !hasMultipleColumns) {
      const newStageValues = [...stageValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        while (newStageValues.length <= targetIndex) {
          newStageValues.push('');
        }
        newStageValues[targetIndex] = line.trim();
      });
      setStageValues(newStageValues);
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} stage values`,
      });
      return;
    }
    
    const newXScaleValues: string[] = [];
    const newDataValues: number[] = [];
    const newRawValues: string[] = [];
    const newStageValues: string[] = [];
    
    const expectedColsWithStage = hasXScale ? 3 : 2;
    const firstLine = lines[0]?.split(/\t/) || [];
    const hasStageColumn = stagesEnabled && firstLine.length >= expectedColsWithStage;
    
    lines.forEach(line => {
      const cells = line.split(/\t/);
      
      if (hasXScale && cells.length >= 2) {
        const xScaleVal = xScaleType === 'date' ? normalizeDate(cells[0]) : cells[0];
        newXScaleValues.push(xScaleVal);
        const rawValue = cells[1];
        newRawValues.push(rawValue);
        const numVal = parseNumericValue(rawValue);
        newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        if (hasStageColumn && cells.length >= 3) {
          newStageValues.push(cells[2].trim());
        } else if (stagesEnabled) {
          newStageValues.push('');
        }
      } else if (hasXScale && cells.length === 1) {
        newXScaleValues.push('');
        const rawValue = cells[0];
        newRawValues.push(rawValue);
        const numVal = parseNumericValue(rawValue);
        newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        if (stagesEnabled) {
          newStageValues.push('');
        }
      } else {
        const rawValue = cells[0];
        newRawValues.push(rawValue);
        const numVal = parseNumericValue(rawValue);
        newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        if (hasStageColumn && cells.length >= 2) {
          newStageValues.push(cells[1].trim());
        } else if (stagesEnabled) {
          newStageValues.push('');
        }
      }
    });
    
    setDataValues(newDataValues);
    setRawInputValues(newRawValues);
    if (hasXScale) {
      setXScaleValues(newXScaleValues);
    }
    if (stagesEnabled && newStageValues.length > 0) {
      setStageValues(newStageValues);
    }
    
    toast({
      title: "Data pasted",
      description: `Successfully pasted ${newDataValues.length} defective counts`,
    });
  }, [saveToHistory, toast, xScaleType, dataValues, rawInputValues, xScaleValues, stagesEnabled, stageValues]);

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
          const numVal = parseNumericValue(rawValue);
          newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        } else if (hasXScale && cells.length === 1) {
          newXScaleValues.push('');
          const rawValue = cells[0].trim();
          newRawValues.push(rawValue);
          const numVal = parseNumericValue(rawValue);
          newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        } else {
          const rawValue = cells[0].trim();
          newRawValues.push(rawValue);
          const numVal = parseNumericValue(rawValue);
          newDataValues.push(!isNaN(numVal) && numVal >= 0 ? Math.round(numVal) : NaN);
        }
      });
      
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      if (hasXScale) {
        setXScaleValues(newXScaleValues);
      }
      
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${newDataValues.length} defective counts`,
      });
    } catch (err) {
      toast({
        title: "Clipboard access denied",
        description: "Please allow clipboard access or use Ctrl+V to paste data directly in the table",
        variant: "destructive",
      });
    }
  }, [saveToHistory, toast, xScaleType]);

  const handleStageChange = useCallback((index: number, value: string) => {
    saveToHistory();
    setStageValues(prev => {
      const newStages = [...prev];
      while (newStages.length <= index) {
        newStages.push('');
      }
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
    if (stagesEnabled) {
      setStageValues(prev => {
        const filtered = prev.filter((_, i) => i !== index);
        return filtered;
      });
    }
  }, [saveToHistory, xScaleType, stagesEnabled]);

  const handleSaveData = useCallback(() => {
    const validIndices: number[] = [];
    dataValues.forEach((v, i) => {
      if (!isNaN(v)) validIndices.push(i);
    });
    const validValues = validIndices.map(i => dataValues[i]);
    
    if (validValues.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 data points for NP chart",
        variant: "destructive",
      });
      return;
    }
    
    const validXScaleValues = xScaleType !== 'index' 
      ? validIndices.map(i => xScaleValues[i] || '') 
      : [];
    
    const validStageValues = stagesEnabled
      ? validIndices.map(i => stageValues[i] || '')
      : [];
    
    saveMutation.mutate({ 
      defectiveCounts: validValues, 
      sampleSize,
      indicatorName, 
      chartDate, 
      xScaleType, 
      xAxisLabel,
      xScaleValues: validXScaleValues,
      stagesEnabled,
      stageValues: validStageValues,
    });
  }, [dataValues, indicatorName, chartDate, xScaleType, xAxisLabel, xScaleValues, stagesEnabled, stageValues, saveMutation, toast]);

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
    setStageValues([]);
    setStagesEnabled(false);
    toast({
      title: "Data cleared",
      description: "All data has been cleared. Use Undo to restore.",
    });
  }, [dataValues, saveToHistory, toast]);

  const generateAIAnalysis = useCallback(async () => {
    const validData = dataValues.filter(v => !isNaN(v));
    if (validData.length < 10) {
      toast({
        title: "Insufficient Data",
        description: `At least 10 data points are required for AI control card analysis. Current: ${validData.length}`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      const npBar = validData.reduce((a, b) => a + b, 0) / validData.length;
      const pBar = npBar / sampleSize;
      const ucl = npBar + 3 * Math.sqrt(npBar * (1 - pBar));
      const lcl = Math.max(0, npBar - 3 * Math.sqrt(npBar * (1 - pBar)));
      
      const outOfControl = validData
        .map((v, i) => (v > ucl || v < lcl) ? i + 1 : -1)
        .filter(i => i !== -1);

      const localValidIndices = dataValues.map((v, i) => (!isNaN(v) ? i : -1)).filter(i => i !== -1);
      const stageStatsForAI = stagesEnabled && localValidIndices.length > 0 ? (() => {
        const stageMap = new Map<string, number[]>();
        localValidIndices.forEach((originalIdx, validIdx) => {
          const stage = stageValues[originalIdx] || '';
          if (stage === '') return;
          if (!stageMap.has(stage)) stageMap.set(stage, []);
          stageMap.get(stage)!.push(validData[validIdx]);
        });
        return Array.from(stageMap.entries()).map(([stageName, values]) => {
          const stageNpBar = values.reduce((a, b) => a + b, 0) / values.length;
          const stagePBar = stageNpBar / sampleSize;
          return {
            stageName,
            count: values.length,
            mean: stageNpBar,
            pBar: stagePBar,
            ucl: stageNpBar + 3 * Math.sqrt(stageNpBar * (1 - stagePBar)),
            lcl: Math.max(0, stageNpBar - 3 * Math.sqrt(stageNpBar * (1 - stagePBar))),
          };
        });
      })() : undefined;

      const statsPayload = {
        chartType: 'NP' as const,
        sampleCount: validData.length,
        sampleSize: sampleSize,
        defectiveCounts: validData,
        npBar,
        pBar,
        ucl,
        lcl,
        outOfControl,
        stagesEnabled,
        stageStats: stageStatsForAI,
      };

      const contextPayload = {
        ctqName,
        indicatorName,
        chartDate,
        xScaleType,
        xAxisLabel,
      };

      const response = await fetch(`/api/projects/${projectId}/spc/np/${encodeURIComponent(ctqName)}/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stats: statsPayload, context: contextPayload }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data?.assessment) {
        setAiAnalysis(data.assessment);
        toast({
          title: "AI Analysis Generated",
          description: "NP chart analysis has been generated successfully",
        });
      } else {
        throw new Error("No analysis received from server");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI analysis",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }, [dataValues, stagesEnabled, stageValues, sampleSize, ctqName, indicatorName, chartDate, xScaleType, xAxisLabel, projectId, toast]);

  const validDataValues = dataValues.filter(v => !isNaN(v));
  const hasValidData = validDataValues.length >= 2;

  const calculateNPStats = useCallback(() => {
    if (!hasValidData) return null;

    const k = validDataValues.length;
    const totalDefectives = validDataValues.reduce((a, b) => a + b, 0);
    const npBar = totalDefectives / k;
    const pBar = npBar / sampleSize;
    
    const UCL = npBar + 3 * Math.sqrt(npBar * (1 - pBar));
    const LCL = Math.max(0, npBar - 3 * Math.sqrt(npBar * (1 - pBar)));

    return {
      npBar,
      pBar,
      UCL,
      LCL,
      CL: npBar,
      sampleSize,
    };
  }, [hasValidData, validDataValues, sampleSize]);

  const stats = calculateNPStats();

  const isOutOfControl = (value: number, ucl: number, lcl: number): boolean => {
    return value > ucl || value < lcl;
  };

  const validIndices = dataValues.map((v, i) => (!isNaN(v) ? i : -1)).filter(i => i !== -1);
  
  const validStageValuesAligned = stagesEnabled 
    ? validIndices.map(i => stageValues[i] || '')
    : [];

  interface StageStats {
    stageName: string;
    startIdx: number;
    endIdx: number;
    values: number[];
    npBar: number;
    pBar: number;
    UCL: number;
    LCL: number;
    CL: number;
  }

  const calculateStageStats = useCallback((): StageStats[] => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const stages: StageStats[] = [];
    let currentStage = validStageValuesAligned[0];
    let stageStartIdx = 0;
    
    const processStage = (stageName: string, startIdx: number, endIdx: number) => {
      const stageDataValues = validDataValues.slice(startIdx, endIdx + 1);
      if (stageDataValues.length < 2) return null;
      
      const npBar = stageDataValues.reduce((a, b) => a + b, 0) / stageDataValues.length;
      const pBar = npBar / sampleSize;
      
      return {
        stageName,
        startIdx: startIdx + 1,
        endIdx: endIdx + 1,
        values: stageDataValues,
        npBar,
        pBar,
        UCL: npBar + 3 * Math.sqrt(npBar * (1 - pBar)),
        LCL: Math.max(0, npBar - 3 * Math.sqrt(npBar * (1 - pBar))),
        CL: npBar,
      };
    };
    
    for (let i = 1; i <= validStageValuesAligned.length; i++) {
      const nextStage = i < validStageValuesAligned.length ? validStageValuesAligned[i] : '';
      
      if (nextStage !== currentStage || i === validStageValuesAligned.length) {
        if (currentStage !== '') {
          const stageStats = processStage(currentStage, stageStartIdx, i - 1);
          if (stageStats) stages.push(stageStats);
        }
        stageStartIdx = i;
        currentStage = nextStage;
      }
    }
    
    return stages;
  }, [stagesEnabled, validStageValuesAligned, validDataValues]);

  const stageStatsList = calculateStageStats();

  const chartXIndices = validDataValues.map((_, i) => i + 1);
  
  const getCustomTickLabels = (): string[] => {
    return validIndices.map((idx) => xScaleValues[idx] || '');
  };
  
  const customTickLabels = getCustomTickLabels();

  const getStageStatsForIndex = (chartIdx: number) => {
    if (!stagesEnabled || stageStatsList.length === 0) return null;
    return stageStatsList.find(s => chartIdx >= s.startIdx && chartIdx <= s.endIdx) || null;
  };
  
  const isInSinglePointStage = (chartIdx: number) => {
    const arrayIdx = chartIdx - 1;
    if (arrayIdx < 0 || arrayIdx >= validStageValuesAligned.length) return false;
    const stageName = validStageValuesAligned[arrayIdx];
    if (stageName === '') return false;
    const hasStats = stageStatsList.some(s => chartIdx >= s.startIdx && chartIdx <= s.endIdx);
    return !hasStats;
  };

  const getNPChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    validDataValues.forEach((value, i) => {
      const xVal = chartXIndices[i];
      
      let ucl = stats.UCL;
      let lcl = stats.LCL;
      let skipOOCCheck = false;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          ucl = stageStats.UCL;
          lcl = stageStats.LCL;
        } else if (isInSinglePointStage(xVal)) {
          skipOOCCheck = true;
        }
      }
      
      if (!skipOOCCheck && isOutOfControl(value, ucl, lcl)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(value);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(value);
      }
    });
    
    return { inControl, outOfControl };
  };

  const npChartPoints = getNPChartPointArrays();

  const generateNPChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      const xPoints: number[] = [];
      for (let i = stageStat.startIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
      }
      
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.CL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'Centerline (np̄)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.CL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.UCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageStat.UCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.LCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageStat.LCL.toFixed(4)}<extra></extra>`,
      });
    });
    
    return traces;
  };

  const generateStageSeparatorShapes = () => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const shapes: any[] = [];
    
    for (let i = 1; i < validStageValuesAligned.length; i++) {
      const prevStage = validStageValuesAligned[i - 1];
      const currStage = validStageValuesAligned[i];
      
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
          line: {
            color: '#6b7280',
            width: 2,
            dash: 'dash',
          },
        });
      }
    }
    
    return shapes;
  };

  const generateStageAnnotations = () => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const stageRanges: { stageName: string; startIdx: number; endIdx: number }[] = [];
    let currentStage = validStageValuesAligned[0];
    let startIdx = 0;
    
    for (let i = 1; i <= validStageValuesAligned.length; i++) {
      const nextStage = i < validStageValuesAligned.length ? validStageValuesAligned[i] : '';
      if (nextStage !== currentStage) {
        if (currentStage !== '') {
          stageRanges.push({
            stageName: currentStage,
            startIdx: startIdx + 1,
            endIdx: i,
          });
        }
        startIdx = i;
        currentStage = nextStage;
      }
    }
    
    return stageRanges.map(range => ({
      x: (range.startIdx + range.endIdx) / 2,
      y: 1.05,
      xref: 'x' as const,
      yref: 'paper' as const,
      text: range.stageName,
      showarrow: false,
      font: { color: '#6b7280', size: 10 },
    }));
  };

  const generateNPChartStageLimitLabels = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const annotations: any[] = [];
    stageStatsList.forEach(stageStat => {
      const xPos = stageStat.endIdx + 0.3;
      annotations.push(
        {
          x: xPos,
          y: stageStat.UCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `UCL=${stageStat.UCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: xPos,
          y: stageStat.CL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `CL=${stageStat.CL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#16a34a', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#16a34a',
          borderwidth: 1,
          borderpad: 2,
        },
        {
          x: xPos,
          y: stageStat.LCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `LCL=${stageStat.LCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#dc2626',
          borderwidth: 1,
          borderpad: 2,
        }
      );
    });
    return annotations;
  };

  const generateGlobalLimitLabels = () => {
    if (!stats || stagesEnabled) return [];
    const xPos = chartXIndices.length + 0.3;
    return [
      {
        x: xPos,
        y: stats.UCL,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `UCL=${stats.UCL.toFixed(2)}`,
        showarrow: false,
        xanchor: 'left' as const,
        yanchor: 'middle' as const,
        font: { color: '#dc2626', size: 9 },
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: '#dc2626',
        borderwidth: 1,
        borderpad: 2,
      },
      {
        x: xPos,
        y: stats.CL,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `CL=${stats.CL.toFixed(2)}`,
        showarrow: false,
        xanchor: 'left' as const,
        yanchor: 'middle' as const,
        font: { color: '#16a34a', size: 9 },
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: '#16a34a',
        borderwidth: 1,
        borderpad: 2,
      },
      {
        x: xPos,
        y: stats.LCL,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `LCL=${stats.LCL.toFixed(2)}`,
        showarrow: false,
        xanchor: 'left' as const,
        yanchor: 'middle' as const,
        font: { color: '#dc2626', size: 9 },
        bgcolor: 'rgba(255,255,255,0.9)',
        bordercolor: '#dc2626',
        borderwidth: 1,
        borderpad: 2,
      },
    ];
  };

  const getXAxisConfig = () => {
    const baseConfig: any = {
      title: xAxisLabel || (xScaleType === 'index' ? 'Sample Number' : xScaleType === 'date' ? 'Date' : 'Sample'),
      showgrid: true,
      gridcolor: '#e5e7eb',
      zeroline: false,
    };
    
    if (xScaleType !== 'index' && customTickLabels.length > 0) {
      const hasLabels = customTickLabels.some(l => l !== '');
      if (hasLabels) {
        baseConfig.tickmode = 'array';
        baseConfig.tickvals = chartXIndices;
        baseConfig.ticktext = customTickLabels.map((label, i) => label || (i + 1).toString());
        if (xScaleType === 'date') {
          baseConfig.tickangle = -45;
        }
      }
    }
    
    return baseConfig;
  };

  const npChartTraces: any[] = [];
  
  if (stats) {
    if (stagesEnabled && stageStatsList.length > 0) {
      npChartTraces.push(...generateNPChartStageTraces());
    } else {
      npChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.CL),
        type: 'scatter',
        mode: 'lines',
        name: 'Centerline (np̄)',
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stats.CL.toFixed(4)}<extra></extra>`,
      });
      npChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.UCL),
        type: 'scatter',
        mode: 'lines',
        name: 'UCL',
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stats.UCL.toFixed(4)}<extra></extra>`,
      });
      npChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.LCL),
        type: 'scatter',
        mode: 'lines',
        name: 'LCL',
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stats.LCL.toFixed(4)}<extra></extra>`,
      });
    }
    
    // Continuous line trace connecting ALL points
    npChartTraces.push({
      x: chartXIndices,
      y: validDataValues,
      type: 'scatter',
      mode: 'lines',
      name: 'Data Line',
      line: { color: '#2563eb', width: 1.5 },
      showlegend: false,
      hoverinfo: 'skip',
    });
    
    // In-control points (markers only)
    npChartTraces.push({
      x: npChartPoints.inControl.x,
      y: npChartPoints.inControl.y,
      type: 'scatter',
      mode: 'markers',
      name: 'Defective Units',
      marker: { color: '#2563eb', size: 6 },
      hovertemplate: 'Sample %{x}<br>Defectives: %{y}<extra></extra>',
    });
    
    // Out-of-control points (markers only, red)
    if (npChartPoints.outOfControl.x.length > 0) {
      npChartTraces.push({
        x: npChartPoints.outOfControl.x,
        y: npChartPoints.outOfControl.y,
        type: 'scatter',
        mode: 'markers',
        name: 'Out of Control',
        marker: { color: '#dc2626', size: 10, symbol: 'circle' },
        hovertemplate: 'Sample %{x}<br>Defectives: %{y} (OOC)<extra></extra>',
      });
    }
  }

  const npChartLayout = {
    title: {
      text: `NP (Defective Units) Chart of ${indicatorName}`,
      font: { size: 16 },
    },
    xaxis: getXAxisConfig(),
    yaxis: {
      title: { text: 'Defective Units (np)' },
      showgrid: true,
      gridcolor: '#e5e7eb',
      zeroline: true,
      rangemode: 'tozero' as const,
    },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
      x: 0.5,
      xanchor: 'center' as const,
    },
    margin: { l: 60, r: 40, t: 60, b: 80 },
    shapes: stagesEnabled ? generateStageSeparatorShapes() : [],
    annotations: [
      ...(stagesEnabled ? generateStageAnnotations() : []),
      ...(stagesEnabled ? generateNPChartStageLimitLabels() : generateGlobalLimitLabels()),
    ],
    hovermode: 'closest' as const,
  };

  const maxRows = Math.max(dataValues.length, 3);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          NP Control Chart
          <span className="text-sm font-normal text-muted-foreground">
            (Defective Units per Sample)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="np-indicatorName">Indicator to Monitor</Label>
            <Input
              id="np-indicatorName"
              value={indicatorName}
              onChange={(e) => setIndicatorName(e.target.value)}
              placeholder="Enter indicator name"
            />
            <p className="text-xs text-muted-foreground">This name will appear in the chart titles</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-chartDate">Chart Date</Label>
            <Input
              id="np-chartDate"
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Date shown on the control charts</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-sampleSize">Sample Size (n)</Label>
            <Input
              id="np-sampleSize"
              type="number"
              min="1"
              value={sampleSize}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) {
                  setSampleSize(val);
                }
              }}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">Constant sample size for all subgroups</p>
          </div>
          <div className="space-y-1">
            <Label>X-Axis Scale Type</Label>
            <RadioGroup
              value={xScaleType}
              onValueChange={(v) => setXScaleType(v as XScaleType)}
              className="flex items-center gap-4 pt-2"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="index" id="np-index" />
                <Label htmlFor="np-index" className="font-normal text-sm">Default Index</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="freeform" id="np-freeform" />
                <Label htmlFor="np-freeform" className="font-normal text-sm">Free Form</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="date" id="np-date" />
                <Label htmlFor="np-date" className="font-normal text-sm">Date</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {xScaleType !== 'index' && (
          <div className="space-y-1">
            <Label htmlFor="np-xAxisLabel">X-Axis Label</Label>
            <Input
              id="np-xAxisLabel"
              value={xAxisLabel}
              onChange={(e) => setXAxisLabel(e.target.value)}
              placeholder={xScaleType === 'date' ? 'Date' : 'Sample Label'}
              className="max-w-xs"
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="np-stagesEnabled"
            checked={stagesEnabled}
            onChange={(e) => {
              saveToHistory();
              setStagesEnabled(e.target.checked);
              if (e.target.checked && stageValues.length < dataValues.length) {
                setStageValues(prev => {
                  const newStages = [...prev];
                  while (newStages.length < dataValues.length) {
                    newStages.push('');
                  }
                  return newStages;
                });
              }
            }}
            className="h-4 w-4"
          />
          <Label htmlFor="np-stagesEnabled" className="font-normal">
            Enable Multi-Stage Process Control
          </Label>
          <span className="text-xs text-gray-500">(Display separate control limits per stage)</span>
        </div>        


        <div className="flex flex-wrap items-center gap-2">
          <Button variant="destructive" size="sm" onClick={handleClearAllData}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All Data
          </Button>
          <Button variant="outline" size="sm" onClick={handlePasteFromClipboard}>
            <Clipboard className="h-4 w-4 mr-1" />
            Paste
          </Button>
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={dataHistory.length === 0}>
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            size="sm"
            onClick={handleSaveData}
            disabled={saveMutation.isPending || validDataValues.length < 2}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Data
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Excel copy/paste</p>

        <div 
          ref={tableRef}
          className="border rounded-md overflow-auto max-h-[400px]"
          onPaste={handlePaste}
        >
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left w-12">#</th>
                {xScaleType !== 'index' && (
                  <th className="p-2 text-left">{xScaleType === 'date' ? 'Date' : 'Label'}</th>
                )}
                <th className="p-2 text-left">Defective Count</th>
                {stagesEnabled && <th className="p-2 text-left">Stage</th>}
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, index) => (
                <tr key={index} className="border-t hover:bg-muted/50">
                  <td className="p-2 text-muted-foreground">{index + 1}</td>
                  {xScaleType !== 'index' && (
                    <td className="p-1">
                      <Input
                        type={xScaleType === 'date' ? 'date' : 'text'}
                        value={xScaleValues[index] || ''}
                        onChange={(e) => handleXScaleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'xscale')}
                        onFocus={() => setFocusedCell({ row: index, col: 'xscale' })}
                        onBlur={() => setFocusedCell(null)}
                        data-cell-index={index}
                        data-cell-col="xscale"
                        className="h-8"
                        placeholder={xScaleType === 'date' ? '' : 'Label'}
                      />
                    </td>
                  )}
                  <td className="p-1">
                    <Input
                      type="text"
                      value={rawInputValues[index] || ''}
                      onChange={(e) => handleDataChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'value')}
                      onFocus={() => setFocusedCell({ row: index, col: 'value' })}
                      onBlur={() => setFocusedCell(null)}
                      data-cell-index={index}
                      data-cell-col="value"
                      className="h-8"
                      placeholder="0"
                    />
                  </td>
                  {stagesEnabled && (
                    <td className="p-1">
                      <Input
                        type="text"
                        value={stageValues[index] || ''}
                        onChange={(e) => handleStageChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, 'stage')}
                        onFocus={() => setFocusedCell({ row: index, col: 'stage' })}
                        onBlur={() => setFocusedCell(null)}
                        data-cell-index={index}
                        data-cell-col="stage"
                        className="h-8"
                        placeholder="Stage name"
                      />
                    </td>
                  )}
                  <td className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasValidData && stats && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">NP Chart (Defective Count)</CardTitle>
              </CardHeader>
              <CardContent>
                {stagesEnabled && stageStatsList.length > 0 ? (
                  <div className="mb-4 space-y-2">
                    {stageStatsList.map(stageStat => (
                      <div key={stageStat.stageName} className="border rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">{stageStat.stageName}</div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div className="bg-blue-50 p-2 rounded">
                            <Label className="text-xs text-gray-600">UCL</Label>
                            <div className="font-semibold text-blue-700">{stageStat.UCL.toFixed(4)}</div>
                          </div>
                          <div className="bg-green-50 p-2 rounded">
                            <Label className="text-xs text-gray-600">CL (np̄)</Label>
                            <div className="font-semibold text-green-700">{stageStat.CL.toFixed(4)}</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <Label className="text-xs text-gray-600">LCL</Label>
                            <div className="font-semibold text-blue-700">{stageStat.LCL.toFixed(4)}</div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded">
                            <Label className="text-xs text-gray-600">p̄</Label>
                            <div className="font-semibold text-purple-700">{stageStat.pBar.toFixed(6)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-4 mb-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <Label className="text-xs text-gray-600">UCL</Label>
                      <div className="font-semibold text-blue-700">{stats.UCL.toFixed(4)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <Label className="text-xs text-gray-600">Centerline (np̄)</Label>
                      <div className="font-semibold text-green-700">{stats.CL.toFixed(4)}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <Label className="text-xs text-gray-600">LCL</Label>
                      <div className="font-semibold text-blue-700">{stats.LCL.toFixed(4)}</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <Label className="text-xs text-gray-600">p̄ (proportion)</Label>
                      <div className="font-semibold text-purple-700">{stats.pBar.toFixed(6)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <Label className="text-xs text-gray-600">Sample Size (n)</Label>
                      <div className="font-semibold text-gray-700">{stats.sampleSize}</div>
                    </div>
                  </div>
                )}

                <Plot
                  data={npChartTraces}
                  layout={npChartLayout}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `NP_Control_Card_of_${ctqName}`,
                      height: 500,
                      width: 800,
                      scale: 1
                    }
                  }}
                  style={{ width: '100%', height: '400px' }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mt-4">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Control Card Analysis
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    generateAIAnalysis();
                  }}
                  disabled={isGeneratingAnalysis || validDataValues.length < 10}
                  data-testid="btn-ai-control-analysis"
                >
                  {isGeneratingAnalysis ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  )}
                  <span className="ml-1">
                    {isGeneratingAnalysis ? "Generating..." : "Generate Analysis"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    saveAiAnalysisMutation.mutate(aiAnalysis);
                  }}
                  disabled={saveAiAnalysisMutation.isPending || !aiAnalysis.trim()}
                  data-testid="btn-save-ai-analysis"
                >
                  {saveAiAnalysisMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-1">
                    {saveAiAnalysisMutation.isPending ? "Saving..." : "Save AI-Analysis"}
                  </span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Textarea
              value={aiAnalysis}
              onChange={(e) => setAiAnalysis(e.target.value)}
              placeholder={validDataValues.length < 10 
                ? "Enter at least 10 data points to enable AI control card analysis..."
                : "Click 'Generate Analysis' to get AI-powered insights about your NP chart data, including process stability, patterns, and recommendations..."
              }
              className="min-h-[200px] w-full font-mono text-sm"
              data-testid="textarea-ai-control-analysis"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
