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

interface UControlCardProps {
  projectId: number;
  ctqName: string;
}

interface DataHistory {
  values: number[];
  sampleSizes: number[];
  xScaleValues: string[];
  stageValues: string[];
  stagesEnabled: boolean;
}

type XScaleType = 'index' | 'freeform' | 'date';

export function UControlCard({ projectId, ctqName }: UControlCardProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [dataValues, setDataValues] = useState<number[]>([NaN, NaN, NaN]);
  const [rawInputValues, setRawInputValues] = useState<string[]>(['', '', '']);
  const [sampleSizes, setSampleSizes] = useState<number[]>([NaN, NaN, NaN]);
  const [rawSampleSizeValues, setRawSampleSizeValues] = useState<string[]>(['', '', '']);
  const [xScaleType, setXScaleType] = useState<XScaleType>('index');
  const [xAxisLabel, setXAxisLabel] = useState<string>('');
  const [xScaleValues, setXScaleValues] = useState<string[]>(['', '', '']);
  const [dataHistory, setDataHistory] = useState<DataHistory[]>([]);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: 'xscale' | 'value' | 'sampleSize' | 'stage' } | null>(null);
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [indicatorName, setIndicatorName] = useState<string>(ctqName);
  const [chartDate, setChartDate] = useState<string>('');
  const [stagesEnabled, setStagesEnabled] = useState<boolean>(false);
  const [stageValues, setStageValues] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

  const dataQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}`],
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
      if (data?.sampleSizes && data.sampleSizes.length > 0) {
        setSampleSizes(data.sampleSizes);
        setRawSampleSizeValues(data.sampleSizes.map((v: number) => isNaN(v) ? '' : v.toString()));
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
      if (data?.aiAnalysis && typeof data.aiAnalysis === 'string') {
        setAiAnalysis(data.aiAnalysis);
      }
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { 
      defectCounts: number[];
      sampleSizes: number[];
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
        `/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}`,
        payload
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "U control card data saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}`]
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
        `/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}/ai-analysis`,
        { aiAnalysis: analysis }
      );
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis saved",
        description: "U chart AI analysis saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}`]
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
    const currentState = JSON.stringify({ dataValues, sampleSizes, xScaleValues, stageValues, stagesEnabled });
    if (currentState !== lastSavedState) {
      setDataHistory(prev => [...prev.slice(-19), { values: [...dataValues], sampleSizes: [...sampleSizes], xScaleValues: [...xScaleValues], stageValues: [...stageValues], stagesEnabled }]);
      setLastSavedState(currentState);
    }
  }, [dataValues, sampleSizes, xScaleValues, stageValues, stagesEnabled, lastSavedState]);

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
    setSampleSizes([...previousState.sampleSizes]);
    setRawSampleSizeValues(previousState.sampleSizes.map(v => isNaN(v) ? '' : v.toString()));
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

  const handleSampleSizeChange = useCallback((index: number, value: string) => {
    saveToHistory();
    
    setRawSampleSizeValues(prev => {
      const newRaw = [...prev];
      while (newRaw.length <= index) {
        newRaw.push('');
      }
      newRaw[index] = value;
      return newRaw;
    });
    
    const numValue = parseNumericValue(value);
    const intValue = !isNaN(numValue) ? Math.round(numValue) : NaN;
    setSampleSizes(prev => {
      const newValues = [...prev];
      while (newValues.length <= index) {
        newValues.push(NaN);
      }
      newValues[index] = intValue > 0 ? intValue : NaN;
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, col: 'xscale' | 'value' | 'sampleSize' | 'stage') => {
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
        setSampleSizes(prev => [...prev, NaN]);
        setRawSampleSizeValues(prev => [...prev, '']);
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
    } else if (e.key === 'Tab' && !e.shiftKey && col === 'value') {
      e.preventDefault();
      const sampleSizeInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="sampleSize"]`) as HTMLInputElement;
      if (sampleSizeInput) sampleSizeInput.focus();
    } else if (e.key === 'Tab' && e.shiftKey && col === 'sampleSize') {
      e.preventDefault();
      const valueInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="value"]`) as HTMLInputElement;
      if (valueInput) valueInput.focus();
    } else if (e.key === 'Tab' && !e.shiftKey && col === 'sampleSize' && stagesEnabled) {
      e.preventDefault();
      const stageInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="stage"]`) as HTMLInputElement;
      if (stageInput) stageInput.focus();
    } else if (e.key === 'Tab' && e.shiftKey && col === 'stage') {
      e.preventDefault();
      const sampleSizeInput = document.querySelector(`[data-cell-index="${index}"][data-cell-col="sampleSize"]`) as HTMLInputElement;
      if (sampleSizeInput) sampleSizeInput.focus();
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
          setSampleSizes(prev => [...prev, NaN]);
          setRawSampleSizeValues(prev => [...prev, '']);
        }
        newXScaleValues[targetIndex] = xScaleType === 'date' ? normalizeDate(line) : line;
      });
      setXScaleValues(newXScaleValues);
      if (focusedIndex + lines.length > dataValues.length) {
        const needed = focusedIndex + lines.length - dataValues.length;
        setDataValues(prev => [...prev, ...Array(needed).fill(NaN)]);
        setRawInputValues(prev => [...prev, ...Array(needed).fill('')]);
        setSampleSizes(prev => [...prev, ...Array(needed).fill(NaN)]);
        setRawSampleSizeValues(prev => [...prev, ...Array(needed).fill('')]);
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
      if (focusedIndex + lines.length > sampleSizes.length) {
        const needed = focusedIndex + lines.length - sampleSizes.length;
        setSampleSizes(prev => [...prev, ...Array(needed).fill(NaN)]);
        setRawSampleSizeValues(prev => [...prev, ...Array(needed).fill('')]);
      }
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} defect counts`,
      });
      return;
    }

    if (focusedCol === 'sampleSize' && !hasMultipleColumns) {
      const newSampleSizes = [...sampleSizes];
      const newRawSampleSizeValues = [...rawSampleSizeValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        while (newSampleSizes.length <= targetIndex) {
          newSampleSizes.push(NaN);
          newRawSampleSizeValues.push('');
        }
        newRawSampleSizeValues[targetIndex] = line;
        const numVal = parseNumericValue(line);
        newSampleSizes[targetIndex] = !isNaN(numVal) && numVal > 0 ? Math.round(numVal) : NaN;
      });
      setSampleSizes(newSampleSizes);
      setRawSampleSizeValues(newRawSampleSizeValues);
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} sample sizes`,
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
    const newSampleSizes: number[] = [];
    const newRawSampleSizeValues: string[] = [];
    const newStageValues: string[] = [];
    
    lines.forEach(line => {
      const cells = line.split(/\t/);
      
      if (hasXScale && cells.length >= 3) {
        const xScaleVal = xScaleType === 'date' ? normalizeDate(cells[0]) : cells[0];
        newXScaleValues.push(xScaleVal);
        const rawDefect = cells[1];
        newRawValues.push(rawDefect);
        const numDefect = parseNumericValue(rawDefect);
        newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
        const rawSampleSize = cells[2];
        newRawSampleSizeValues.push(rawSampleSize);
        const numSampleSize = parseNumericValue(rawSampleSize);
        newSampleSizes.push(!isNaN(numSampleSize) && numSampleSize > 0 ? Math.round(numSampleSize) : NaN);
        if (stagesEnabled && cells.length >= 4) {
          newStageValues.push(cells[3].trim());
        } else if (stagesEnabled) {
          newStageValues.push('');
        }
      } else if (!hasXScale && cells.length >= 2) {
        const rawDefect = cells[0];
        newRawValues.push(rawDefect);
        const numDefect = parseNumericValue(rawDefect);
        newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
        const rawSampleSize = cells[1];
        newRawSampleSizeValues.push(rawSampleSize);
        const numSampleSize = parseNumericValue(rawSampleSize);
        newSampleSizes.push(!isNaN(numSampleSize) && numSampleSize > 0 ? Math.round(numSampleSize) : NaN);
        if (stagesEnabled && cells.length >= 3) {
          newStageValues.push(cells[2].trim());
        } else if (stagesEnabled) {
          newStageValues.push('');
        }
      } else {
        const rawDefect = cells[0];
        newRawValues.push(rawDefect);
        const numDefect = parseNumericValue(rawDefect);
        newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
        newSampleSizes.push(NaN);
        newRawSampleSizeValues.push('');
        if (stagesEnabled) {
          newStageValues.push('');
        }
      }
    });
    
    setDataValues(newDataValues);
    setRawInputValues(newRawValues);
    setSampleSizes(newSampleSizes);
    setRawSampleSizeValues(newRawSampleSizeValues);
    if (hasXScale) {
      setXScaleValues(newXScaleValues);
    }
    if (stagesEnabled && newStageValues.length > 0) {
      setStageValues(newStageValues);
    }
    
    toast({
      title: "Data pasted",
      description: `Successfully pasted ${newDataValues.length} data points`,
    });
  }, [saveToHistory, toast, xScaleType, dataValues, rawInputValues, xScaleValues, sampleSizes, rawSampleSizeValues, stagesEnabled, stageValues]);

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
      const newSampleSizes: number[] = [];
      const newRawSampleSizeValues: string[] = [];
      
      lines.forEach(line => {
        const cells = line.split(/\t/);
        
        if (hasXScale && cells.length >= 3) {
          newXScaleValues.push(cells[0].trim());
          const rawDefect = cells[1].trim();
          newRawValues.push(rawDefect);
          const numDefect = parseNumericValue(rawDefect);
          newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
          const rawSampleSize = cells[2].trim();
          newRawSampleSizeValues.push(rawSampleSize);
          const numSampleSize = parseNumericValue(rawSampleSize);
          newSampleSizes.push(!isNaN(numSampleSize) && numSampleSize > 0 ? Math.round(numSampleSize) : NaN);
        } else if (!hasXScale && cells.length >= 2) {
          const rawDefect = cells[0].trim();
          newRawValues.push(rawDefect);
          const numDefect = parseNumericValue(rawDefect);
          newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
          const rawSampleSize = cells[1].trim();
          newRawSampleSizeValues.push(rawSampleSize);
          const numSampleSize = parseNumericValue(rawSampleSize);
          newSampleSizes.push(!isNaN(numSampleSize) && numSampleSize > 0 ? Math.round(numSampleSize) : NaN);
        } else {
          const rawDefect = cells[0].trim();
          newRawValues.push(rawDefect);
          const numDefect = parseNumericValue(rawDefect);
          newDataValues.push(!isNaN(numDefect) && numDefect >= 0 ? Math.round(numDefect) : NaN);
          newSampleSizes.push(NaN);
          newRawSampleSizeValues.push('');
        }
      });
      
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      setSampleSizes(newSampleSizes);
      setRawSampleSizeValues(newRawSampleSizeValues);
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
    setSampleSizes(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length === 0 || !isNaN(filtered[filtered.length - 1])) {
        return [...filtered, NaN];
      }
      return filtered;
    });
    setRawSampleSizeValues(prev => {
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
      if (!isNaN(v) && !isNaN(sampleSizes[i]) && sampleSizes[i] > 0) validIndices.push(i);
    });
    const validValues = validIndices.map(i => dataValues[i]);
    const validSampleSizes = validIndices.map(i => sampleSizes[i]);
    
    if (validValues.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 complete data points (defect count + sample size) for U chart",
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
      defectCounts: validValues,
      sampleSizes: validSampleSizes,
      indicatorName, 
      chartDate, 
      xScaleType, 
      xAxisLabel,
      xScaleValues: validXScaleValues,
      stagesEnabled,
      stageValues: validStageValues,
    });
  }, [dataValues, sampleSizes, indicatorName, chartDate, xScaleType, xAxisLabel, xScaleValues, stagesEnabled, stageValues, saveMutation, toast]);

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
    setSampleSizes([NaN, NaN, NaN]);
    setRawSampleSizeValues(['', '', '']);
    setXScaleValues(['', '', '']);
    setStageValues([]);
    setStagesEnabled(false);
    toast({
      title: "Data cleared",
      description: "All data has been cleared. Use Undo to restore.",
    });
  }, [dataValues, saveToHistory, toast]);

  const generateAIAnalysis = useCallback(async () => {
    const validIndices: number[] = [];
    dataValues.forEach((v, i) => {
      if (!isNaN(v) && !isNaN(sampleSizes[i]) && sampleSizes[i] > 0) validIndices.push(i);
    });
    
    if (validIndices.length < 10) {
      toast({
        title: "Insufficient Data",
        description: `At least 10 complete data points are required for AI control card analysis. Current: ${validIndices.length}`,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAnalysis(true);
    try {
      const validData = validIndices.map(i => dataValues[i]);
      const validSampleSizesArr = validIndices.map(i => sampleSizes[i]);
      
      const totalDefects = validData.reduce((a, b) => a + b, 0);
      const totalSampleSize = validSampleSizesArr.reduce((a, b) => a + b, 0);
      const uBar = totalDefects / totalSampleSize;
      const avgSampleSize = totalSampleSize / validData.length;
      
      const uValues = validData.map((c, i) => c / validSampleSizesArr[i]);
      const avgUCL = uBar + 3 * Math.sqrt(uBar / avgSampleSize);
      const avgLCL = Math.max(0, uBar - 3 * Math.sqrt(uBar / avgSampleSize));
      
      const outOfControl = validData
        .map((_, i) => (uValues[i] > avgUCL || uValues[i] < avgLCL) ? i + 1 : -1)
        .filter(i => i !== -1);

      const localValidIndices = dataValues.map((v, i) => (!isNaN(v) && !isNaN(sampleSizes[i]) && sampleSizes[i] > 0 ? i : -1)).filter(i => i !== -1);
      const stageStatsForAI = stagesEnabled && localValidIndices.length > 0 ? (() => {
        const stageMap = new Map<string, { defects: number[]; sampleSizes: number[] }>();
        localValidIndices.forEach((originalIdx, validIdx) => {
          const stage = stageValues[originalIdx] || '';
          if (stage === '') return;
          if (!stageMap.has(stage)) stageMap.set(stage, { defects: [], sampleSizes: [] });
          stageMap.get(stage)!.defects.push(validData[validIdx]);
          stageMap.get(stage)!.sampleSizes.push(validSampleSizesArr[validIdx]);
        });
        return Array.from(stageMap.entries()).map(([stageName, data]) => {
          const totalDefects = data.defects.reduce((a, b) => a + b, 0);
          const totalN = data.sampleSizes.reduce((a, b) => a + b, 0);
          const stageUBar = totalDefects / totalN;
          const avgN = totalN / data.defects.length;
          const stageUCL = stageUBar + 3 * Math.sqrt(stageUBar / avgN);
          const stageLCL = Math.max(0, stageUBar - 3 * Math.sqrt(stageUBar / avgN));
          return {
            stageName,
            count: data.defects.length,
            mean: stageUBar,
            uBar: stageUBar,
            avgSampleSize: avgN,
            ucl: stageUCL,
            lcl: stageLCL,
          };
        });
      })() : undefined;

      const statsPayload = {
        chartType: 'U' as const,
        sampleCount: validData.length,
        defectCounts: validData,
        sampleSizes: validSampleSizesArr,
        uValues,
        uBar,
        avgSampleSize,
        totalDefects,
        totalSampleSize,
        ucl: avgUCL,
        lcl: avgLCL,
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

      const response = await fetch(`/api/projects/${projectId}/spc/u/${encodeURIComponent(ctqName)}/ai-analysis`, {
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
          description: "U chart analysis has been generated successfully",
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
  }, [dataValues, sampleSizes, stagesEnabled, stageValues, ctqName, indicatorName, chartDate, xScaleType, xAxisLabel, projectId, toast]);

  const validIndices = dataValues.map((v, i) => (!isNaN(v) && !isNaN(sampleSizes[i]) && sampleSizes[i] > 0 ? i : -1)).filter(i => i !== -1);
  const validDataValues = validIndices.map(i => dataValues[i]);
  const validSampleSizes = validIndices.map(i => sampleSizes[i]);
  const hasValidData = validDataValues.length >= 2;

  const calculateUStats = useCallback(() => {
    if (!hasValidData) return null;

    const n = validDataValues.length;
    const totalDefects = validDataValues.reduce((a, b) => a + b, 0);
    const totalSampleSize = validSampleSizes.reduce((a, b) => a + b, 0);
    const uBar = totalDefects / totalSampleSize;
    const avgSampleSize = totalSampleSize / n;
    
    const uValues = validDataValues.map((c, i) => c / validSampleSizes[i]);
    const UCL = validSampleSizes.map(ni => uBar + 3 * Math.sqrt(uBar / ni));
    const LCL = validSampleSizes.map(ni => Math.max(0, uBar - 3 * Math.sqrt(uBar / ni)));
    const avgUCL = uBar + 3 * Math.sqrt(uBar / avgSampleSize);
    const avgLCL = Math.max(0, uBar - 3 * Math.sqrt(uBar / avgSampleSize));

    return {
      uBar,
      uValues,
      UCL,
      LCL,
      avgUCL,
      avgLCL,
      CL: uBar,
      avgSampleSize,
      totalDefects,
      totalSampleSize,
    };
  }, [hasValidData, validDataValues, validSampleSizes]);

  const stats = calculateUStats();

  const isOutOfControl = (uValue: number, ucl: number, lcl: number): boolean => {
    return uValue > ucl || uValue < lcl;
  };

  const validStageValuesAligned = stagesEnabled 
    ? validIndices.map(i => stageValues[i] || '')
    : [];

  interface StageStats {
    stageName: string;
    startIdx: number;
    endIdx: number;
    defectCounts: number[];
    sampleSizes: number[];
    uBar: number;
    avgSampleSize: number;
  }

  const calculateStageStats = useCallback((): StageStats[] => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const stages: StageStats[] = [];
    let currentStage = validStageValuesAligned[0];
    let stageStartIdx = 0;
    
    const processStage = (stageName: string, startIdx: number, endIdx: number) => {
      const stageDefects = validDataValues.slice(startIdx, endIdx + 1);
      const stageSampleSizes = validSampleSizes.slice(startIdx, endIdx + 1);
      if (stageDefects.length < 2) return null;
      
      const totalDefects = stageDefects.reduce((a, b) => a + b, 0);
      const totalN = stageSampleSizes.reduce((a, b) => a + b, 0);
      const uBar = totalDefects / totalN;
      const avgN = totalN / stageDefects.length;
      
      return {
        stageName,
        startIdx: startIdx + 1,
        endIdx: endIdx + 1,
        defectCounts: stageDefects,
        sampleSizes: stageSampleSizes,
        uBar,
        avgSampleSize: avgN,
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
  }, [stagesEnabled, validStageValuesAligned, validDataValues, validSampleSizes]);

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

  const getUChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.uValues.forEach((uValue, i) => {
      const xVal = chartXIndices[i];
      
      let ucl = stats.avgUCL;
      let lcl = stats.avgLCL;
      let skipOOCCheck = false;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          ucl = stageStats.uBar + 3 * Math.sqrt(stageStats.uBar / stageStats.avgSampleSize);
          lcl = Math.max(0, stageStats.uBar - 3 * Math.sqrt(stageStats.uBar / stageStats.avgSampleSize));
        } else if (isInSinglePointStage(xVal)) {
          skipOOCCheck = true;
        }
      }
      
      if (!skipOOCCheck && isOutOfControl(uValue, ucl, lcl)) {
        outOfControl.x.push(xVal);
        outOfControl.y.push(uValue);
      } else {
        inControl.x.push(xVal);
        inControl.y.push(uValue);
      }
    });
    
    return { inControl, outOfControl };
  };

  const uChartPoints = getUChartPointArrays();

  const generateUChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      const xPoints: number[] = [];
      const clValues: number[] = [];
      
      const stageUCL = stageStat.uBar + 3 * Math.sqrt(stageStat.uBar / stageStat.avgSampleSize);
      const stageLCL = Math.max(0, stageStat.uBar - 3 * Math.sqrt(stageStat.uBar / stageStat.avgSampleSize));
      
      for (let i = stageStat.startIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
        clValues.push(stageStat.uBar);
      }
      
      traces.push({
        x: xPoints,
        y: clValues,
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'Centerline (ū)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.uBar.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageUCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageUCL.toFixed(4)}<extra></extra>`,
      });
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageLCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageLCL.toFixed(4)}<extra></extra>`,
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

  const generateGlobalLimitLabels = () => {
    if (!stats || stagesEnabled) return [];
    const xPos = chartXIndices.length + 0.3;
    return [
      {
        x: xPos,
        y: stats.avgUCL,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `UCL≈${stats.avgUCL.toFixed(3)}`,
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
        text: `CL=${stats.CL.toFixed(3)}`,
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
        y: stats.avgLCL,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `LCL≈${stats.avgLCL.toFixed(3)}`,
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
    const xTitle = xScaleType === 'date' ? 'Date' : (xScaleType === 'freeform' ? (xAxisLabel || 'Label') : 'Observation');
    const baseConfig: any = {
      title: { text: xTitle },
      showgrid: true,
      gridcolor: '#e5e7eb',
      zeroline: false,
      dtick: 1,
      tick0: 1,
      rangemode: 'nonnegative' as const,
      ...(xScaleType !== 'index' ? {
        tickmode: 'array' as const,
        tickvals: chartXIndices,
        ticktext: customTickLabels,
        ...(xScaleType === 'date' ? { tickangle: -45 } : {}),
      } : {}),
    };
    
    return baseConfig;
  };

  const uChartTraces: any[] = [];
  
  if (stats) {
    if (stagesEnabled && stageStatsList.length > 0) {
      uChartTraces.push(...generateUChartStageTraces());
    } else {
      uChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.CL),
        type: 'scatter',
        mode: 'lines',
        name: 'Centerline (ū)',
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stats.CL.toFixed(4)}<extra></extra>`,
      });
      uChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.avgUCL),
        type: 'scatter',
        mode: 'lines',
        name: 'UCL',
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stats.avgUCL.toFixed(4)}<extra></extra>`,
      });
      uChartTraces.push({
        x: chartXIndices,
        y: chartXIndices.map(() => stats.avgLCL),
        type: 'scatter',
        mode: 'lines',
        name: 'LCL',
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stats.avgLCL.toFixed(4)}<extra></extra>`,
      });
    }
    
    uChartTraces.push({
      x: uChartPoints.inControl.x,
      y: uChartPoints.inControl.y,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Defects per Unit (u)',
      line: { color: '#2563eb', width: 1.5 },
      marker: { color: '#2563eb', size: 6 },
      hovertemplate: 'Sample %{x}<br>u: %{y:.4f}<extra></extra>',
    });
    
    if (uChartPoints.outOfControl.x.length > 0) {
      uChartTraces.push({
        x: uChartPoints.outOfControl.x,
        y: uChartPoints.outOfControl.y,
        type: 'scatter',
        mode: 'markers',
        name: 'Out of Control',
        marker: { color: '#dc2626', size: 10, symbol: 'circle' },
        hovertemplate: 'Sample %{x}<br>u: %{y:.4f} (OOC)<extra></extra>',
      });
    }
  }

  const uChartLayout = {
    title: {
      text: `U (Defects per Unit) Chart of ${indicatorName}`,
      font: { size: 16 },
    },
    xaxis: getXAxisConfig(),
    yaxis: {
      title: { text: 'Defects per Unit (u)' },
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
      ...generateGlobalLimitLabels(),
    ],
    hovermode: 'closest' as const,
  };

  const maxRows = Math.max(dataValues.length, 3);
  const validDataCount = validIndices.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          U Control Chart
          <span className="text-sm font-normal text-muted-foreground">
            (Defects per Unit with Variable Sample Size)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="indicatorName">Indicator to Monitor</Label>
            <Input
              id="indicatorName"
              value={indicatorName}
              onChange={(e) => setIndicatorName(e.target.value)}
              placeholder="Enter indicator name"
            />
            <p className="text-xs text-muted-foreground">This name will appear in the chart titles</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="chartDate">Chart Date</Label>
            <Input
              id="chartDate"
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Date shown on the control charts</p>
          </div>
          <div className="space-y-1">
            <Label>X-Axis Scale Type</Label>
            <RadioGroup
              value={xScaleType}
              onValueChange={(v) => setXScaleType(v as XScaleType)}
              className="flex items-center gap-4 pt-2"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="index" id="u-index" />
                <Label htmlFor="u-index" className="font-normal text-sm">Default Index</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="freeform" id="u-freeform" />
                <Label htmlFor="u-freeform" className="font-normal text-sm">Free Form</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="date" id="u-date" />
                <Label htmlFor="u-date" className="font-normal text-sm">Date</Label>
              </div>
            </RadioGroup>
            {xScaleType === 'freeform' && (
              <div className="space-y-1">
                <Label htmlFor="xAxisLabel">X-Axis Label</Label>
                <Input
                  id="xAxisLabel"
                  value={xAxisLabel}
                  onChange={(e) => setXAxisLabel(e.target.value)}
                  placeholder="Sample Label"
                  className="max-w-xs"
                />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="u-stagesEnabled"
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
            <Label htmlFor="u-stagesEnabled" className="font-normal">
              Enable Multi-Stage Process Control
            </Label>
            <span className="text-xs text-gray-500">(Display separate control limits per stage)</span>
          </div>
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
            disabled={saveMutation.isPending || validDataCount < 2}
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
        <p className="text-xs text-muted-foreground">Enter defect counts and sample sizes (variable). Supports Excel copy/paste (Ctrl+V). Use Ctrl+Z to undo.</p>

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
                <th className="p-2 text-left">Defect Count</th>
                <th className="p-2 text-left">Sample Size</th>
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
                  <td className="p-1">
                    <Input
                      type="text"
                      value={rawSampleSizeValues[index] || ''}
                      onChange={(e) => handleSampleSizeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'sampleSize')}
                      onFocus={() => setFocusedCell({ row: index, col: 'sampleSize' })}
                      onBlur={() => setFocusedCell(null)}
                      data-cell-index={index}
                      data-cell-col="sampleSize"
                      className="h-8"
                      placeholder="n"
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
                <CardTitle className="text-lg">U Chart (Defects per Unit)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                  <div className="bg-green-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Centerline (ū)</Label>
                    <div className="font-semibold text-green-700">{stats.CL.toFixed(4)}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Avg UCL</Label>
                    <div className="font-semibold text-blue-700">{stats.avgUCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Avg LCL</Label>
                    <div className="font-semibold text-blue-700">{stats.avgLCL.toFixed(4)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs text-gray-600">Avg Sample Size</Label>
                    <div className="font-semibold text-gray-700">{stats.avgSampleSize.toFixed(1)}</div>
                  </div>
                </div>

                <Plot
                  data={uChartTraces}
                  layout={uChartLayout}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `U_Control_Card_of_${ctqName}`,
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

        {/* AI Control Card Analysis */}
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
                  disabled={isGeneratingAnalysis || validDataCount < 10}
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
              placeholder={validDataCount < 10 
                ? "Enter at least 10 complete data points (defect count + sample size) to enable AI control card analysis..."
                : "Click 'Generate Analysis' to get AI-powered insights about your U chart data, including process stability, patterns, and recommendations..."
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
