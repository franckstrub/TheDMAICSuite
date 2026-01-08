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

// Helper to normalize various date formats to YYYY-MM-DD
function normalizeDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Excel serial number (days since 1899-12-30)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Try parsing with Date constructor
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  // Try common formats manually
  // M/D/YYYY or MM/DD/YYYY
  let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // D/M/YYYY (European) - assume if day > 12
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, first, second, y] = match;
    const firstNum = parseInt(first, 10);
    const secondNum = parseInt(second, 10);
    if (firstNum > 12 && secondNum <= 12) {
      return `${y}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
    }
  }
  
  // D-M-YYYY or DD-MM-YYYY
  match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // DD-Mon-YY or DD-Mon-YYYY (e.g., 15-Jan-24)
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
  
  // Return original if we can't parse
  return trimmed;
}

interface IMRCardProps {
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

export function IMRCard({ projectId, ctqName }: IMRCardProps) {
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
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState<boolean>(false);

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
        setStageValues(data.stageValues);
      }
      if (data?.aiAnalysis && typeof data.aiAnalysis === 'string') {
        setAiAnalysis(data.aiAnalysis);
      }
    }
  }, [dataQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { values: number[]; indicatorName: string; chartDate: string; xScaleType: XScaleType; xAxisLabel: string; xScaleValues: string[]; stagesEnabled: boolean; stageValues: string[] }) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`,
        { 
          dataValues: payload.values, 
          indicatorName: payload.indicatorName, 
          chartDate: payload.chartDate,
          xScaleType: payload.xScaleType,
          xAxisLabel: payload.xAxisLabel,
          xScaleValues: payload.xScaleValues,
          stagesEnabled: payload.stagesEnabled,
          stageValues: payload.stageValues,
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

  const saveAiAnalysisMutation = useMutation({
    mutationFn: async (analysis: string) => {
      return apiRequest(
        'PATCH',
        `/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}/ai-analysis`,
        { aiAnalysis: analysis }
      );
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis saved",
        description: "Control card AI analysis saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}`]
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
    
    // Split by newlines but keep empty lines to preserve cell positions
    let lines = pastedText.split(/\r?\n/);
    // Remove trailing empty line if exists (common with Excel copy)
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
    
    // Check if pasting multi-column data (has tabs)
    const hasMultipleColumns = lines.some(line => line.includes('\t'));
    
    if (focusedCol === 'xscale' && hasXScale && !hasMultipleColumns) {
      // Pasting single column into x-scale column - only update x-scale values
      const newXScaleValues = [...xScaleValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        // Expand arrays if needed
        while (newXScaleValues.length <= targetIndex) {
          newXScaleValues.push('');
        }
        while (dataValues.length <= targetIndex) {
          setDataValues(prev => [...prev, NaN]);
          setRawInputValues(prev => [...prev, '']);
        }
        // Normalize dates if date scale type is selected
        newXScaleValues[targetIndex] = xScaleType === 'date' ? normalizeDate(line) : line;
      });
      setXScaleValues(newXScaleValues);
      // Ensure dataValues and rawInputValues arrays are long enough
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
      // Pasting single column into value column - only update values
      const newDataValues = [...dataValues];
      const newRawValues = [...rawInputValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        // Expand arrays if needed
        while (newDataValues.length <= targetIndex) {
          newDataValues.push(NaN);
          newRawValues.push('');
        }
        newRawValues[targetIndex] = line;
        newDataValues[targetIndex] = parseNumericValue(line);
      });
      setDataValues(newDataValues);
      setRawInputValues(newRawValues);
      // Ensure xScaleValues array is long enough
      if (hasXScale && focusedIndex + lines.length > xScaleValues.length) {
        const needed = focusedIndex + lines.length - xScaleValues.length;
        setXScaleValues(prev => [...prev, ...Array(needed).fill('')]);
      }
      toast({
        title: "Data pasted",
        description: `Successfully pasted ${lines.length} data points`,
      });
      return;
    }
    
    if (focusedCol === 'stage' && stagesEnabled && !hasMultipleColumns) {
      // Pasting single column into stage column - only update stage values (free-form strings)
      const newStageValues = [...stageValues];
      lines.forEach((line, i) => {
        const targetIndex = focusedIndex + i;
        // Expand array if needed
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
    
    // Multi-column paste - replace all data
    const newXScaleValues: string[] = [];
    const newDataValues: number[] = [];
    const newRawValues: string[] = [];
    const newStageValues: string[] = [];
    
    // Determine expected column count based on current settings
    const expectedColsWithStage = hasXScale ? 3 : 2; // xscale + value + stage OR value + stage
    const expectedColsWithoutStage = hasXScale ? 2 : 1;
    
    // Check if the pasted data includes stage column (detect by column count)
    const firstLine = lines[0]?.split(/\t/) || [];
    const hasStageColumn = stagesEnabled && firstLine.length >= expectedColsWithStage;
    
    lines.forEach(line => {
      const cells = line.split(/\t/);
      
      if (hasXScale && cells.length >= 2) {
        // Normalize dates if date scale type is selected
        const xScaleVal = xScaleType === 'date' ? normalizeDate(cells[0]) : cells[0];
        newXScaleValues.push(xScaleVal);
        const rawValue = cells[1];
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
        // Check for stage value in 3rd column (free-form string)
        if (hasStageColumn && cells.length >= 3) {
          newStageValues.push(cells[2].trim());
        } else if (stagesEnabled) {
          newStageValues.push('');
        }
      } else if (hasXScale && cells.length === 1) {
        newXScaleValues.push('');
        const rawValue = cells[0];
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
        if (stagesEnabled) {
          newStageValues.push('');
        }
      } else {
        const rawValue = cells[0];
        newRawValues.push(rawValue);
        newDataValues.push(parseNumericValue(rawValue));
        // Check for stage value in 2nd column (no xscale, free-form string)
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
      description: `Successfully pasted ${newDataValues.length} data points`,
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
    
    const validStageValues = stagesEnabled
      ? validIndices.map(i => stageValues[i] || '') // Default to empty if unset
      : [];
    
    saveMutation.mutate({ 
      values: validValues, 
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
      const movingRanges: number[] = [];
      for (let i = 1; i < validData.length; i++) {
        movingRanges.push(Math.abs(validData[i] - validData[i - 1]));
      }
      
      const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
      const mrMean = movingRanges.length > 0 
        ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length 
        : 0;
      
      const E2 = 2.660;
      const D4 = 3.267;
      const ucl = mean + E2 * mrMean;
      const lcl = mean - E2 * mrMean;
      const mrUcl = D4 * mrMean;
      const mrLcl = 0;
      
      const outOfControlIndividuals = validData
        .map((v, i) => (v > ucl || v < lcl) ? i + 1 : -1)
        .filter(i => i !== -1);
      const outOfControlMR = movingRanges
        .map((v, i) => v > mrUcl ? i + 2 : -1)
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
          const stageMean = values.reduce((a, b) => a + b, 0) / values.length;
          const stageMRs: number[] = [];
          for (let i = 1; i < values.length; i++) {
            stageMRs.push(Math.abs(values[i] - values[i - 1]));
          }
          const stageMrMean = stageMRs.length > 0 ? stageMRs.reduce((a, b) => a + b, 0) / stageMRs.length : 0;
          return {
            stageName,
            count: values.length,
            mean: stageMean,
            ucl: stageMean + E2 * stageMrMean,
            lcl: stageMean - E2 * stageMrMean,
            mrMean: stageMrMean,
            mrUcl: D4 * stageMrMean,
            mrLcl: 0,
          };
        });
      })() : undefined;

      const statsPayload = {
        dataValues: validData,
        movingRanges,
        mean,
        mrMean,
        ucl,
        lcl,
        mrUcl,
        mrLcl,
        outOfControlIndividuals,
        outOfControlMR,
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

      const response = await fetch(`/api/projects/${projectId}/spc/imr/${encodeURIComponent(ctqName)}/ai-analysis`, {
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
          description: "Control card analysis has been generated successfully",
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
  }, [dataValues, stagesEnabled, stageValues, ctqName, indicatorName, chartDate, xScaleType, xAxisLabel, projectId, toast]);

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
  
  // Get valid stage values aligned with valid data indices
  const validStageValuesAligned = stagesEnabled 
    ? validIndices.map(i => stageValues[i] || '')
    : [];

  // Calculate per-stage statistics
  interface StageStats {
    stageName: string;
    startIdx: number;  // Index in validDataValues array (1-based for chart)
    endIdx: number;
    values: number[];
    mean: number;
    avgMR: number;
    iUCL: number;
    iLCL: number;
    iCL: number;
    mrUCL: number;
    mrLCL: number;
    mrCL: number;
    movingRanges: number[];
  }

  const calculateStageStats = useCallback((): StageStats[] => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const stages: StageStats[] = [];
    let currentStage = validStageValuesAligned[0];
    let stageStartIdx = 0;
    
    const d2 = 1.128;
    const D3 = 0;
    const D4 = 3.267;
    const E2 = 2.660;
    
    const processStage = (stageName: string, startIdx: number, endIdx: number) => {
      const stageDataValues = validDataValues.slice(startIdx, endIdx + 1);
      if (stageDataValues.length < 2) return null;
      
      const mean = stageDataValues.reduce((a, b) => a + b, 0) / stageDataValues.length;
      
      const movingRanges: number[] = [];
      for (let i = 1; i < stageDataValues.length; i++) {
        movingRanges.push(Math.abs(stageDataValues[i] - stageDataValues[i - 1]));
      }
      const avgMR = movingRanges.length > 0 
        ? movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length 
        : 0;
      
      return {
        stageName,
        startIdx: startIdx + 1,  // Convert to 1-based for chart
        endIdx: endIdx + 1,
        values: stageDataValues,
        mean,
        avgMR,
        iUCL: mean + E2 * avgMR,
        iLCL: mean - E2 * avgMR,
        iCL: mean,
        mrUCL: D4 * avgMR,
        mrLCL: D3 * avgMR,
        mrCL: avgMR,
        movingRanges,
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

  // Always use numeric indices for data point positioning
  const chartXIndices = validDataValues.map((_, i) => i + 1);
  
  // Get custom tick labels for freeform/date modes (blank where no value provided)
  const getCustomTickLabels = (): string[] => {
    return validIndices.map((idx) => xScaleValues[idx] || '');
  };
  
  const customTickLabels = getCustomTickLabels();

  // Helper to find stage stats for a given chart index (1-based)
  // Returns the stage stats if the point belongs to a stage with computed limits, null otherwise
  const getStageStatsForIndex = (chartIdx: number) => {
    if (!stagesEnabled || stageStatsList.length === 0) return null;
    return stageStatsList.find(s => chartIdx >= s.startIdx && chartIdx <= s.endIdx) || null;
  };
  
  // Helper to check if a chart index is in a single-point stage (has stage name but no stats)
  const isInSinglePointStage = (chartIdx: number) => {
    const arrayIdx = chartIdx - 1; // Convert 1-based chart index to 0-based array index
    if (arrayIdx < 0 || arrayIdx >= validStageValuesAligned.length) return false;
    const stageName = validStageValuesAligned[arrayIdx];
    if (stageName === '') return false; // No stage assigned
    // Check if this stage has stats (meaning it has 2+ points)
    const hasStats = stageStatsList.some(s => chartIdx >= s.startIdx && chartIdx <= s.endIdx);
    return !hasStats; // Single-point stage if no stats
  };

  // Get arrays of in-control and out-of-control points for I chart
  const getIChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    validDataValues.forEach((value, i) => {
      const xVal = chartXIndices[i];
      
      // Default to global stats
      let ucl = stats.iUCL;
      let lcl = stats.iLCL;
      let skipOOCCheck = false;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          // Point is in a stage with computed stats - use per-stage limits
          ucl = stageStats.iUCL;
          lcl = stageStats.iLCL;
        } else if (isInSinglePointStage(xVal)) {
          // Point is in a single-point stage - skip OOC check (indeterminate)
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

  // Get arrays of in-control and out-of-control points for MR chart
  const getMRChartPointArrays = () => {
    if (!stats) return { inControl: { x: [] as number[], y: [] as number[] }, outOfControl: { x: [] as number[], y: [] as number[] } };
    
    const inControl: { x: number[]; y: number[] } = { x: [], y: [] };
    const outOfControl: { x: number[]; y: number[] } = { x: [], y: [] };
    
    stats.movingRanges.forEach((value, i) => {
      const xVal = chartXIndices[i + 1];
      
      // Default to global stats
      let ucl = stats.mrUCL;
      let lcl = stats.mrLCL;
      let skipOOCCheck = false;
      
      if (stagesEnabled) {
        const stageStats = getStageStatsForIndex(xVal);
        if (stageStats) {
          // Point is in a stage with computed stats - use per-stage limits
          ucl = stageStats.mrUCL;
          lcl = stageStats.mrLCL;
        } else if (isInSinglePointStage(xVal)) {
          // Point is in a single-point stage - skip OOC check (indeterminate)
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

  const iChartPoints = getIChartPointArrays();
  const mrChartPoints = getMRChartPointArrays();

  // Generate per-stage control limit traces for I chart
  const generateIChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      // Generate x array with all points in this stage range
      const xPoints: number[] = [];
      for (let i = stageStat.startIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
      }
      
      // Centerline for this stage
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.iCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'Centerline (X̄)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.iCL.toFixed(4)}<extra></extra>`,
      });
      // UCL for this stage
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.iUCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL (+3σ)' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageStat.iUCL.toFixed(4)}<extra></extra>`,
      });
      // LCL for this stage
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.iLCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL (-3σ)' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageStat.iLCL.toFixed(4)}<extra></extra>`,
      });
    });
    
    return traces;
  };

  // Generate per-stage control limit traces for MR chart
  const generateMRChartStageTraces = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const traces: any[] = [];
    
    stageStatsList.forEach((stageStat, idx) => {
      const mrStartIdx = Math.max(stageStat.startIdx, 2); // MR starts at index 2
      
      // Generate x array with all points in this stage range (MR starts at 2)
      const xPoints: number[] = [];
      for (let i = mrStartIdx; i <= stageStat.endIdx; i++) {
        xPoints.push(i);
      }
      
      if (xPoints.length === 0) return; // Skip if no points in range
      
      // Centerline for this stage
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.mrCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'Centerline (R̄)' : undefined,
        showlegend: idx === 0,
        line: { color: '#16a34a', width: 2 },
        hovertemplate: `CL: ${stageStat.mrCL.toFixed(4)}<extra></extra>`,
      });
      // UCL for this stage
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.mrUCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'UCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `UCL: ${stageStat.mrUCL.toFixed(4)}<extra></extra>`,
      });
      // LCL for this stage (usually 0)
      traces.push({
        x: xPoints,
        y: xPoints.map(() => stageStat.mrLCL),
        type: 'scatter',
        mode: 'lines',
        name: idx === 0 ? 'LCL' : undefined,
        showlegend: idx === 0,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
        hovertemplate: `LCL: ${stageStat.mrLCL.toFixed(4)}<extra></extra>`,
      });
    });
    
    return traces;
  };

  // Generate vertical dashed lines between stages (uses raw stage values, not stageStatsList)
  const generateStageSeparatorShapes = () => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    const shapes: any[] = [];
    
    // Find all stage transition points (where stage name changes)
    for (let i = 1; i < validStageValuesAligned.length; i++) {
      const prevStage = validStageValuesAligned[i - 1];
      const currStage = validStageValuesAligned[i];
      
      // Add separator when stage changes (and both have valid stage names)
      if (prevStage !== '' && currStage !== '' && prevStage !== currStage) {
        const xPos = i + 0.5; // Position between points (i is 0-based, chart is 1-based)
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

  // Generate stage annotations showing stage names (uses raw stage values for all transitions)
  const generateStageAnnotations = () => {
    if (!stagesEnabled || validStageValuesAligned.length === 0) return [];
    
    // Group contiguous points by stage name
    const stageRanges: { stageName: string; startIdx: number; endIdx: number }[] = [];
    let currentStage = validStageValuesAligned[0];
    let startIdx = 0;
    
    for (let i = 1; i <= validStageValuesAligned.length; i++) {
      const nextStage = i < validStageValuesAligned.length ? validStageValuesAligned[i] : '';
      if (nextStage !== currentStage) {
        if (currentStage !== '') {
          stageRanges.push({
            stageName: currentStage,
            startIdx: startIdx + 1, // 1-based for chart
            endIdx: i, // 1-based for chart
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

  // Generate UCL, CL, LCL labels at the right end of each stage (for I chart)
  const generateIChartStageLimitLabels = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const annotations: any[] = [];
    stageStatsList.forEach(stageStat => {
      const xPos = stageStat.endIdx + 0.3; // Position slightly to the right of last point
      annotations.push(
        {
          x: xPos,
          y: stageStat.iUCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `UCL=${stageStat.iUCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        },
        {
          x: xPos,
          y: stageStat.iCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `CL=${stageStat.iCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#16a34a', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        },
        {
          x: xPos,
          y: stageStat.iLCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `LCL=${stageStat.iLCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        }
      );
    });
    return annotations;
  };

  // Generate UCL, CL, LCL labels at the right end of each stage (for MR chart)
  const generateMRChartStageLimitLabels = () => {
    if (!stagesEnabled || stageStatsList.length === 0) return [];
    
    const annotations: any[] = [];
    stageStatsList.forEach(stageStat => {
      const xPos = stageStat.endIdx + 0.3; // Position slightly to the right of last point
      annotations.push(
        {
          x: xPos,
          y: stageStat.mrUCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `UCL=${stageStat.mrUCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        },
        {
          x: xPos,
          y: stageStat.mrCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `CL=${stageStat.mrCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#16a34a', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        },
        {
          x: xPos,
          y: stageStat.mrLCL,
          xref: 'x' as const,
          yref: 'y' as const,
          text: `LCL=${stageStat.mrLCL.toFixed(2)}`,
          showarrow: false,
          xanchor: 'left' as const,
          yanchor: 'middle' as const,
          font: { color: '#dc2626', size: 9 },
          bgcolor: 'rgba(255,255,255,0.9)',
        }
      );
    });
    return annotations;
  };

  const iChartStageTraces = generateIChartStageTraces();
  const mrChartStageTraces = generateMRChartStageTraces();

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
              {xScaleType === 'freeform' && (
                <div className="mt-3">
                  <Label htmlFor="x-axis-label" className="text-sm font-medium">X-Axis Label</Label>
                  <Input
                    id="x-axis-label"
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    placeholder="e.g., Batch, Week, Sample ID..."
                    className="mt-1 max-w-xs"
                    data-testid="input-x-axis-label"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="stages-enabled"
                checked={stagesEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setStagesEnabled(enabled);
                  if (enabled) {
                    // Set all stage cells to 1 by default when enabling stages
                    const numRows = Math.max(dataValues.length, 3);
                    setStageValues(Array(numRows).fill(1));
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                data-testid="checkbox-stages-enabled"
              />
              <Label htmlFor="stages-enabled" className="text-sm cursor-pointer">Enable Stages</Label>
              <span className="text-xs text-gray-500">(Display separate control limits per stage)</span>
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
                      {xScaleType === 'date' ? 'Date' : (xAxisLabel || 'Label')}
                    </th>
                  )}
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Indicator Value</th>
                  {stagesEnabled && (
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 w-24">Stage</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayValues.map((value, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-1 text-sm text-gray-600 font-medium">{index + 1}</td>
                    {xScaleType !== 'index' && (
                      <td className="px-4 py-1">
                        <Input
                          type="text"
                          value={xScaleValues[index] ?? ''}
                          onChange={(e) => handleXScaleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'xscale')}
                          onFocus={() => setFocusedCell({ row: index, col: 'xscale' })}
                          onBlur={() => {
                            setFocusedCell(null);
                            if (xScaleType === 'date' && xScaleValues[index]) {
                              const normalized = normalizeDate(xScaleValues[index]);
                              if (normalized !== xScaleValues[index]) {
                                handleXScaleChange(index, normalized);
                              }
                            }
                          }}
                          className="h-8 text-sm"
                          placeholder={xScaleType === 'date' ? 'YYYY-MM-DD' : 'Enter label'}
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
                    {stagesEnabled && (
                        <td className="px-4 py-1">
                          <Input
                            type="text"
                            value={stageValues[index] || ''}
                            onChange={(e) => handleStageChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, 'stage')}
                            onFocus={() => setFocusedCell({ row: index, col: 'stage' })}
                            onBlur={() => setFocusedCell(null)}
                            className="h-8 text-sm w-24"
                            placeholder="Stage"
                            data-cell-index={index}
                            data-cell-col="stage"
                            data-testid={`input-imr-stage-${index}`}
                          />
                        </td>
                    )}
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
              {stagesEnabled && stageStatsList.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {stageStatsList.map(stageStat => (
                    <div key={stageStat.stageName} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{stageStat.stageName}</div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">UCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.iUCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">CL (X̄)</Label>
                          <div className="font-semibold text-green-700">{stageStat.iCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">LCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.iLCL.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
              
              <Plot
                data={[
                  {
                    x: chartXIndices,
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
                  // Use per-stage control limits if stages enabled, otherwise use global stats
                  ...(stagesEnabled && iChartStageTraces.length > 0 ? iChartStageTraces : [
                    {
                      x: chartXIndices,
                      y: chartXIndices.map(() => stats.iCL),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Centerline (X̄)',
                      line: { color: '#16a34a', width: 2 },
                      hovertemplate: `CL: ${stats.iCL.toFixed(4)}<extra></extra>`,
                    },
                    {
                      x: chartXIndices,
                      y: chartXIndices.map(() => stats.iUCL),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'UCL (+3σ)',
                      line: { color: '#dc2626', width: 2, dash: 'dash' },
                      hovertemplate: `UCL: ${stats.iUCL.toFixed(4)}<extra></extra>`,
                    },
                    {
                      x: chartXIndices,
                      y: chartXIndices.map(() => stats.iLCL),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'LCL (-3σ)',
                      line: { color: '#dc2626', width: 2, dash: 'dash' },
                      hovertemplate: `LCL: ${stats.iLCL.toFixed(4)}<extra></extra>`,
                    },
                  ]),
                ]}
                layout={{
                  title: { text: `I Chart (Individuals) of ${indicatorName || ctqName}` },
                  xaxis: { 
                    title: { text: xScaleType === 'date' ? 'Date' : (xScaleType === 'freeform' ? (xAxisLabel || 'Label') : 'Observation') }, 
                    dtick: 1, 
                    tick0: 1, 
                    rangemode: 'nonnegative' as const,
                    ...(xScaleType !== 'index' ? { 
                      tickmode: 'array' as const, 
                      tickvals: chartXIndices, 
                      ticktext: customTickLabels 
                    } : {})
                  },
                  yaxis: { title: { text: 'Value' } },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 60, b: 80, l: 60, r: 100 },
                  height: 400,
                  shapes: generateStageSeparatorShapes(),
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
                    ...generateStageAnnotations(),
                    ...generateIChartStageLimitLabels(),
                    // Only show global stats labels if stages not enabled
                    ...(!stagesEnabled ? [
                      {
                        x: chartXIndices.length,
                        y: stats.iUCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `UCL=${stats.iUCL.toFixed(2)}`,
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
                        y: stats.iCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `CL=${stats.iCL.toFixed(2)}`,
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
                        y: stats.iLCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `LCL=${stats.iLCL.toFixed(2)}`,
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
              {stagesEnabled && stageStatsList.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {stageStatsList.map(stageStat => (
                    <div key={stageStat.stageName} className="border rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{stageStat.stageName}</div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">UCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.mrUCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">CL (MR̄)</Label>
                          <div className="font-semibold text-green-700">{stageStat.mrCL.toFixed(4)}</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <Label className="text-xs text-gray-600">LCL</Label>
                          <div className="font-semibold text-blue-700">{stageStat.mrLCL.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
              
              <Plot
                data={[
                  {
                    x: chartXIndices.slice(1),
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
                  // Use per-stage control limits if stages enabled, otherwise use global stats
                  ...(stagesEnabled && mrChartStageTraces.length > 0 ? mrChartStageTraces : (() => {
                    const mrXIndices = chartXIndices.slice(1); // MR starts at index 2
                    return [
                      {
                        x: mrXIndices,
                        y: mrXIndices.map(() => stats.mrCL),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Centerline (MR̄)',
                        line: { color: '#16a34a', width: 2 },
                        hovertemplate: `CL: ${stats.mrCL.toFixed(4)}<extra></extra>`,
                      },
                      {
                        x: mrXIndices,
                        y: mrXIndices.map(() => stats.mrUCL),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'UCL (+3σ)',
                        line: { color: '#dc2626', width: 2, dash: 'dash' },
                        hovertemplate: `UCL: ${stats.mrUCL.toFixed(4)}<extra></extra>`,
                      },
                      {
                        x: mrXIndices,
                        y: mrXIndices.map(() => stats.mrLCL),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'LCL',
                        line: { color: '#dc2626', width: 2, dash: 'dash' },
                        hovertemplate: `LCL: ${stats.mrLCL.toFixed(4)}<extra></extra>`,
                      },
                    ];
                  })()),
                ]}
                layout={{
                  title: { text: `MR Chart (Moving Range) of ${indicatorName || ctqName}` },
                  xaxis: { 
                    title: { text: xScaleType === 'date' ? 'Date' : (xScaleType === 'freeform' ? (xAxisLabel || 'Label') : 'Observation') }, 
                    dtick: 1, 
                    tick0: 2, 
                    rangemode: 'nonnegative' as const,
                    ...(xScaleType !== 'index' ? { 
                      tickmode: 'array' as const, 
                      tickvals: chartXIndices.slice(1), 
                      ticktext: customTickLabels.slice(1) 
                    } : {})
                  },
                  yaxis: { title: { text: 'Moving Range' }, rangemode: 'tozero' },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2 },
                  margin: { t: 60, b: 80, l: 60, r: 100 },
                  height: 400,
                  shapes: generateStageSeparatorShapes(),
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
                    ...generateStageAnnotations(),
                    ...generateMRChartStageLimitLabels(),
                    // Only show global stats labels if stages not enabled
                    ...(!stagesEnabled ? [
                      {
                        x: chartXIndices.length,
                        y: stats.mrUCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `UCL=${stats.mrUCL.toFixed(2)}`,
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
                        y: stats.mrCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `CL=${stats.mrCL.toFixed(2)}`,
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
                        y: stats.mrLCL,
                        xref: 'x' as const,
                        yref: 'y' as const,
                        text: `LCL=${stats.mrLCL.toFixed(2)}`,
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
                  : "Click 'Generate Analysis' to get AI-powered insights about your control chart data, including process stability, patterns, and recommendations..."
                }
                className="min-h-[200px] w-full font-mono text-sm"
                data-testid="textarea-ai-control-analysis"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
