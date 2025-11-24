import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Info, Plus, Clipboard, Undo, XCircle } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { HypothesisTestingTabs } from './common/HypothesisTestingTabs';
import { anovaTwoWay, type AnovaTwoWayResult } from '@/lib/anovaUtils';
import Plot from 'react-plotly.js';
import jStat from 'jstat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseExcelPaste } from '@/lib/excelPasteUtils';

interface DataRow {
  id: number;
  factorA: string;
  factorB: string;
  response: number;
}

interface ANOVATwoWayProps {
  projectId: number;
  solutionId: string;
}

export function ANOVATwoWay({ projectId, solutionId }: ANOVATwoWayProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const lastLoadedKey = useRef<string>('');
  
  const [factorAName, setFactorAName] = useState("Factor A");
  const [factorBName, setFactorBName] = useState("Factor B");
  const [responseVariableName, setResponseVariableName] = useState("Y Response");
  
  const [factorALevels, setFactorALevels] = useState<string[]>(["Level 1", "Level 2"]);
  const [factorBLevels, setFactorBLevels] = useState<string[]>(["Level 1", "Level 2"]);
  
  const [dataRows, setDataRows] = useState<DataRow[]>([]);
  const [nextId, setNextId] = useState(1);
  const [previousDataRows, setPreviousDataRows] = useState<DataRow[]>([]);
  
  const [cellData, setCellData] = useState<Record<string, number[]>>({});
  const [includeInteraction, setIncludeInteraction] = useState(true);
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  
  const [anovaResult, setAnovaResult] = useState<AnovaTwoWayResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [showResidualsVsFits, setShowResidualsVsFits] = useState(false);
  const [showResidualsVsOrder, setShowResidualsVsOrder] = useState(false);
  const [showNormalProbPlot, setShowNormalProbPlot] = useState(false);

  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/anova-two-way`],
    retry: false,
  });

  // Helper function to create default rows based on factor levels
  const createDefaultRows = (aLevels: string[], bLevels: string[], startId: number = 1): DataRow[] => {
    const rows: DataRow[] = [];
    let id = startId;
    
    for (const levelA of aLevels) {
      for (const levelB of bLevels) {
        rows.push({
          id: id++,
          factorA: levelA,
          factorB: levelB,
          response: NaN,
        });
      }
    }
    
    return rows;
  };

  // Convert dataRows to cellData format for ANOVA calculation
  useEffect(() => {
    const newCellData: Record<string, number[]> = {};
    
    dataRows.forEach(row => {
      // Only include rows with valid (non-NaN) response values
      if (!isNaN(row.response)) {
        const key = `${row.factorA}-${row.factorB}`;
        if (!newCellData[key]) {
          newCellData[key] = [];
        }
        newCellData[key].push(row.response);
      }
    });
    
    setCellData(newCellData);
  }, [dataRows]);

  useEffect(() => {
    const currentKey = `${projectId}-${solutionId}`;
    
    // Reset loadedRef if we're viewing a different project/solution
    if (lastLoadedKey.current !== currentKey) {
      loadedRef.current = false;
      lastLoadedKey.current = currentKey;
    }
    
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      setFactorAName(config.factorAName || "Factor A");
      setFactorBName(config.factorBName || "Factor B");
      setResponseVariableName(config.responseVariableName || "Y Response");
      
      if (config.factorALevels && config.factorALevels.length > 0) {
        setFactorALevels(config.factorALevels);
      }
      if (config.factorBLevels && config.factorBLevels.length > 0) {
        setFactorBLevels(config.factorBLevels);
      }
      
      // Load data rows (or convert from old cellData format if needed)
      if (config.dataRows && config.dataRows.length > 0) {
        setDataRows(config.dataRows);
        const maxId = Math.max(...config.dataRows.map((r: DataRow) => r.id), 0);
        setNextId(maxId + 1);
      } else if (config.cellData && Object.keys(config.cellData).length > 0) {
        // Convert old cellData format to new dataRows format
        const rows: DataRow[] = [];
        let id = 1;
        Object.entries(config.cellData).forEach(([key, values]: [string, any]) => {
          const [factorA, factorB] = key.split('-');
          (values as number[]).forEach((response: number) => {
            rows.push({ id: id++, factorA, factorB, response });
          });
        });
        setDataRows(rows);
        setNextId(id);
      } else {
        // Initialize with default rows based on factor levels if no data exists
        const aLevels = config.factorALevels && config.factorALevels.length > 0 
          ? config.factorALevels 
          : factorALevels;
        const bLevels = config.factorBLevels && config.factorBLevels.length > 0 
          ? config.factorBLevels 
          : factorBLevels;
        const defaultRows = createDefaultRows(aLevels, bLevels, 1);
        setDataRows(defaultRows);
        setNextId(defaultRows.length + 1);
      }
      
      setIncludeInteraction(config.includeInteraction ?? true);
      setSignificanceLevel(config.significanceLevel ?? 0.05);
    } else if (configQuery.isSuccess && !loadedRef.current) {
      // Query succeeded but no saved config exists - initialize with defaults
      loadedRef.current = true;
      const defaultRows = createDefaultRows(factorALevels, factorBLevels, 1);
      setDataRows(defaultRows);
      setNextId(defaultRows.length + 1);
    }
  }, [configQuery.data, configQuery.isSuccess, projectId, solutionId, factorALevels, factorBLevels]);

  // Update data rows when factor levels change
  useEffect(() => {
    // Only run after initial load is complete
    if (!loadedRef.current) return;
    
    // Get all expected combinations
    const expectedCombinations = new Set<string>();
    for (const levelA of factorALevels) {
      for (const levelB of factorBLevels) {
        expectedCombinations.add(`${levelA}-${levelB}`);
      }
    }
    
    // Find which combinations already exist (with or without data)
    const existingCombinations = new Set<string>();
    dataRows.forEach(row => {
      existingCombinations.add(`${row.factorA}-${row.factorB}`);
    });
    
    // Find missing combinations
    const missingCombinations: Array<{factorA: string, factorB: string}> = [];
    expectedCombinations.forEach(combo => {
      if (!existingCombinations.has(combo)) {
        const [factorA, factorB] = combo.split('-');
        missingCombinations.push({ factorA, factorB });
      }
    });
    
    // Add rows for missing combinations
    if (missingCombinations.length > 0) {
      const newRows: DataRow[] = [];
      let id = nextId;
      
      for (const combo of missingCombinations) {
        newRows.push({
          id: id++,
          factorA: combo.factorA,
          factorB: combo.factorB,
          response: NaN,
        });
      }
      
      setDataRows([...dataRows, ...newRows]);
      setNextId(id);
    }
  }, [factorALevels, factorBLevels]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/anova-two-way`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Your ANOVA configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/anova-two-way`]
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

  const saveDataMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/anova-two-way`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "Your data has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/anova-two-way`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save data",
        variant: "destructive",
      });
    },
  });

  const handleSaveSetup = () => {
    saveConfigMutation.mutate({
      factorAName,
      factorBName,
      responseVariableName,
      factorALevels,
      factorBLevels,
      includeInteraction,
      significanceLevel,
    });
  };

  const handleSaveData = () => {
    calculateANOVA();
    saveDataMutation.mutate({
      factorAName,
      factorBName,
      responseVariableName,
      factorALevels,
      factorBLevels,
      dataRows,
      cellData,
      includeInteraction,
      significanceLevel,
    });
  };

  const addDataRow = () => {
    setPreviousDataRows([...dataRows]);
    const newRow: DataRow = {
      id: nextId,
      factorA: '',
      factorB: '',
      response: NaN,
    };
    setDataRows([...dataRows, newRow]);
    setNextId(nextId + 1);
  };

  const updateDataRow = (id: number, field: keyof DataRow, value: string | number | null) => {
    setDataRows(dataRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const deleteDataRow = (id: number) => {
    setPreviousDataRows([...dataRows]);
    setDataRows(dataRows.filter(row => row.id !== id));
  };

  const handleUndo = () => {
    if (previousDataRows.length > 0) {
      setDataRows(previousDataRows);
      setPreviousDataRows([]);
    }
  };

  const handleClearAll = () => {
    setPreviousDataRows([...dataRows]);
    const defaultRows = createDefaultRows(factorALevels, factorBLevels, nextId);
    setDataRows(defaultRows);
    setNextId(nextId + defaultRows.length);
  };

  const parseThreeColumnPaste = (pastedText: string): {
    success: boolean;
    rows: DataRow[];
    errors: string[];
  } => {
    const errors: string[] = [];
    const rows: DataRow[] = [];
    
    if (!pastedText || pastedText.trim() === '') {
      return {
        success: false,
        rows: [],
        errors: ['No data to paste'],
      };
    }
    
    const delimiter = pastedText.includes('\t') ? '\t' : ',';
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    
    let id = nextId;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split(delimiter).map(cell => cell.trim());
      
      if (cells.length < 3) {
        errors.push(`Row ${i + 1}: Expected 3 columns (Y Response, Factor A, Factor B), found ${cells.length}`);
        continue;
      }
      
      // Column order is now: Response, Factor A, Factor B
      const responseText = cells[0].replace(/,/g, '.');
      const responseValue = parseFloat(responseText);
      const factorAValue = cells[1];
      const factorBValue = cells[2];
      
      if (isNaN(responseValue)) {
        errors.push(`Row ${i + 1}: Response "${cells[0]}" is not a valid number`);
        continue;
      }
      
      rows.push({
        id: id++,
        factorA: factorAValue,
        factorB: factorBValue,
        response: responseValue,
      });
    }
    
    setNextId(id);
    
    return {
      success: errors.length === 0,
      rows,
      errors,
    };
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    const result = parseThreeColumnPaste(pastedText);
    
    if (!result.success) {
      toast({
        title: "Paste error",
        description: result.errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    if (result.rows.length > 0) {
      setPreviousDataRows([...dataRows]);
      setDataRows(result.rows);
      
      // Extract unique factor levels from pasted data
      const uniqueFactorA = Array.from(new Set(result.rows.map(r => r.factorA).filter(f => f)));
      const uniqueFactorB = Array.from(new Set(result.rows.map(r => r.factorB).filter(f => f)));
      
      // Update factor levels if new ones were found
      if (uniqueFactorA.length > 0) {
        setFactorALevels(uniqueFactorA);
      }
      if (uniqueFactorB.length > 0) {
        setFactorBLevels(uniqueFactorB);
      }
      
      toast({
        title: "Success",
        description: `Successfully pasted ${result.rows.length} data rows`,
      });
    }
  };

  const handlePasteFromExcel = async () => {
    try {
      const text = await navigator.clipboard.readText();
      
      const result = parseThreeColumnPaste(text);
      
      if (!result.success) {
        toast({
          title: "Paste error",
          description: result.errors.join(', '),
          variant: "destructive",
        });
        return;
      }
      
      if (result.rows.length > 0) {
        setPreviousDataRows([...dataRows]);
        setDataRows(result.rows);
        
        // Extract unique factor levels from pasted data
        const uniqueFactorA = Array.from(new Set(result.rows.map(r => r.factorA).filter(f => f)));
        const uniqueFactorB = Array.from(new Set(result.rows.map(r => r.factorB).filter(f => f)));
        
        // Update factor levels if new ones were found
        if (uniqueFactorA.length > 0) {
          setFactorALevels(uniqueFactorA);
        }
        if (uniqueFactorB.length > 0) {
          setFactorBLevels(uniqueFactorB);
        }
        
        toast({
          title: "Success",
          description: `Successfully pasted ${result.rows.length} data rows`,
        });
      }
    } catch (error) {
      toast({
        title: "Clipboard error",
        description: "Failed to read from clipboard. Please use Ctrl+V instead.",
        variant: "destructive",
      });
    }
  };

  const addFactorALevel = () => {
    const newLevel = `A${factorALevels.length + 1}`;
    setFactorALevels([...factorALevels, newLevel]);
  };

  const addFactorBLevel = () => {
    const newLevel = `B${factorBLevels.length + 1}`;
    setFactorBLevels([...factorBLevels, newLevel]);
  };

  const removeFactorALevel = (index: number) => {
    if (factorALevels.length <= 2) {
      return;
    }
    const newLevels = factorALevels.filter((_, i) => i !== index);
    setFactorALevels(newLevels);
    
    // Clean up cell data
    const newCellData = { ...cellData };
    const levelToRemove = factorALevels[index];
    for (const levelB of factorBLevels) {
      delete newCellData[`${levelToRemove}-${levelB}`];
    }
    setCellData(newCellData);
  };

  const removeFactorBLevel = (index: number) => {
    if (factorBLevels.length <= 2) {
      return;
    }
    const newLevels = factorBLevels.filter((_, i) => i !== index);
    setFactorBLevels(newLevels);
    
    // Clean up cell data
    const newCellData = { ...cellData };
    const levelToRemove = factorBLevels[index];
    for (const levelA of factorALevels) {
      delete newCellData[`${levelA}-${levelToRemove}`];
    }
    setCellData(newCellData);
  };

  const updateFactorALevel = (index: number, value: string) => {
    const oldLevel = factorALevels[index];
    const newLevels = [...factorALevels];
    newLevels[index] = value;
    setFactorALevels(newLevels);
    
    // Update cell data keys
    const newCellData = { ...cellData };
    for (const levelB of factorBLevels) {
      const oldKey = `${oldLevel}-${levelB}`;
      const newKey = `${value}-${levelB}`;
      if (oldKey in newCellData) {
        newCellData[newKey] = newCellData[oldKey];
        delete newCellData[oldKey];
      }
    }
    setCellData(newCellData);
  };

  const updateFactorBLevel = (index: number, value: string) => {
    const oldLevel = factorBLevels[index];
    const newLevels = [...factorBLevels];
    newLevels[index] = value;
    setFactorBLevels(newLevels);
    
    // Update cell data keys
    const newCellData = { ...cellData };
    for (const levelA of factorALevels) {
      const oldKey = `${levelA}-${oldLevel}`;
      const newKey = `${levelA}-${value}`;
      if (oldKey in newCellData) {
        newCellData[newKey] = newCellData[oldKey];
        delete newCellData[oldKey];
      }
    }
    setCellData(newCellData);
  };

  const updateCellValue = (levelA: string, levelB: string, index: number, value: string) => {
    const key = `${levelA}-${levelB}`;
    const currentData = cellData[key] || [];
    const newData = [...currentData];
    newData[index] = parseFloat(value) || 0;
    
    setCellData({
      ...cellData,
      [key]: newData,
    });
  };

  const addReplication = (levelA: string, levelB: string) => {
    const key = `${levelA}-${levelB}`;
    const currentData = cellData[key] || [];
    
    setCellData({
      ...cellData,
      [key]: [...currentData, 0],
    });
  };

  const removeReplication = (levelA: string, levelB: string, index: number) => {
    const key = `${levelA}-${levelB}`;
    const currentData = cellData[key] || [];
    if (currentData.length <= 1) {
      return;
    }
    
    const newData = currentData.filter((_, i) => i !== index);
    setCellData({
      ...cellData,
      [key]: newData,
    });
  };

  const calculateANOVA = () => {
    setAnalysisError(null);
    try {
      const result = anovaTwoWay(factorALevels, factorBLevels, cellData, includeInteraction, factorAName || 'Factor A', factorBName || 'factor B');
      setAnovaResult(result);
    } catch (error: any) {
      setAnalysisError(error.message);
      setAnovaResult(null);
    }
  };

  const getDesignStatus = () => {
    const totalRows = Object.values(cellData).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalRows === 0) {
      return { status: 'insufficient', message: 'Not enough data to analyze', replicates: 0 };
    }

    const replicationCounts: number[] = [];
    let hasEmptyCells = false;

    for (const levelA of factorALevels) {
      for (const levelB of factorBLevels) {
        const key = `${levelA}-${levelB}`;
        const count = cellData[key]?.length || 0;
        if (count === 0) {
          hasEmptyCells = true;
        }
        replicationCounts.push(count);
      }
    }

    if (hasEmptyCells || totalRows < factorALevels.length * factorBLevels.length) {
      return { status: 'insufficient', message: 'Not enough data to analyze', replicates: 0 };
    }

    const minReps = Math.min(...replicationCounts);
    const maxReps = Math.max(...replicationCounts);

    if (minReps === maxReps) {
      return { status: 'balanced', message: 'Balanced design', replicates: minReps };
    } else {
      return { status: 'unbalanced', message: 'Unbalanced design', replicates: 0 };
    }
  };

  const designStatus = getDesignStatus();

  useEffect(() => {
    if (Object.keys(cellData).length > 0) {
      calculateANOVA();
    }
  }, [cellData, factorALevels, factorBLevels, includeInteraction]);

  // Setup Tab Content
  const setupContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Variable Names</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="factorAName" data-testid="label-factor-a-name">Factor A Name</Label>
              <Input
                id="factorAName"
                data-testid="input-factor-a-name"
                value={factorAName}
                onChange={(e) => setFactorAName(e.target.value)}
                placeholder="Y Response e.g., Temperature"
              />
            </div>
            <div>
              <Label htmlFor="factorBName" data-testid="label-factor-b-name">Factor B Name</Label>
              <Input
                id="factorBName"
                data-testid="input-factor-b-name"
                value={factorBName}
                onChange={(e) => setFactorBName(e.target.value)}
                placeholder="Factor A e.g., Pressure"
              />
            </div>
            <div>
              <Label htmlFor="responseVariable" data-testid="label-response-variable">Response Variable</Label>
              <Input
                id="responseVariable"
                data-testid="input-response-variable"
                value={responseVariableName}
                onChange={(e) => setResponseVariableName(e.target.value)}
                placeholder="Factor B e.g., Yield"
              />
            </div>
          </div>
        </CardContent>
      </Card>

<Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted">
      <Card>
        <CardHeader>
          <CardTitle>{factorAName} Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {factorALevels.map((level, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={level}
                data-testid={`input-factor-a-level-${index}`}
                onChange={(e) => updateFactorALevel(index, e.target.value)}
                placeholder={`Level ${index + 1}`}
              />
              <Button
                variant="outline"
                size="icon"
                data-testid={`button-remove-factor-a-level-${index}`}
                onClick={() => removeFactorALevel(index)}
                disabled={factorALevels.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addFactorALevel} data-testid="button-add-factor-a-level" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {factorAName} Level
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{factorBName} Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {factorBLevels.map((level, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={level}
                data-testid={`input-factor-b-level-${index}`}
                onChange={(e) => updateFactorBLevel(index, e.target.value)}
                placeholder={`Level ${index + 1}`}
              />
              <Button
                variant="outline"
                size="icon"
                data-testid={`button-remove-factor-b-level-${index}`}
                onClick={() => removeFactorBLevel(index)}
                disabled={factorBLevels.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button onClick={addFactorBLevel} data-testid="button-add-factor-b-level" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {factorBName} Level
          </Button>
        </CardContent>
      </Card>
</Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeInteraction"
              data-testid="checkbox-include-interaction"
              checked={includeInteraction}
              onCheckedChange={(checked) => setIncludeInteraction(checked as boolean)}
            />
            <Label htmlFor="includeInteraction" className="cursor-pointer">
              Include Interaction Effect ({factorAName} × {factorBName})
            </Label>
          </div>
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
                <SelectItem value="0.01" data-testid="option-significance-0.01">1%</SelectItem>
                <SelectItem value="0.05" data-testid="option-significance-0.05">5%</SelectItem>
                <SelectItem value="0.10" data-testid="option-significance-0.10">10%</SelectItem>
                <SelectItem value="0.20" data-testid="option-significance-0.20">20%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveSetup}
        data-testid="button-save-setup"
        disabled={saveConfigMutation.isPending}
        className="w-full"
      >
        {saveConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Configuration
      </Button>
    </div>
  );

  // Data Tab Content
  const dataContent = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Data Entry</span>
            <div className="flex items-center gap-2">
              {designStatus.status === 'balanced' && (
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md" data-testid="flag-balanced-design">
                    {designStatus.message} ({designStatus.replicates} replicates)
                  </span>
                </div>
              )}
              {designStatus.status === 'unbalanced' && (
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-md" data-testid="flag-unbalanced-design">
                    {designStatus.message}
                  </span>
                </div>
              )}
              {designStatus.status === 'insufficient' && (
                <div className="flex items-center gap-2 text-sm font-normal">
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md" data-testid="flag-insufficient-data">
                    {designStatus.message}
                  </span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex-wrap">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-600 dark:text-blue-400 flex-1">
              Paste Excel data: Copy 3 columns (Y Response, Factor A, Factor B) from Excel in clipboard with Ctrl+C, then paste them with Ctrl+V or use the button "Paste from Excel".
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromExcel}
                data-testid="button-paste-from-excel"
              >
                <Clipboard className="mr-2 h-4 w-4" />
                Paste from Excel
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto" onPaste={handlePaste}>
            <div className="max-h-[500px] w-full rounded-md border overflow-y-auto overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="w-[60px] px-4 py-2 text-left text-sm font-medium">#</th>
                    <th className="w-[200px] px-4 py-2 text-left text-sm font-medium">{responseVariableName || 'Y Response'}</th>
                    <th className="w-[250px] px-4 py-2 text-left text-sm font-medium">{factorAName || 'Factor A'}</th>
                    <th className="w-[250px] px-4 py-2 text-left text-sm font-medium">{factorBName || 'Factor B'}</th>
                    <th className="w-[80px] px-4 py-2 text-left text-sm font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, index) => (
                    <tr key={row.id} className="border-b">
                      <td className="text-center text-sm text-muted-foreground p-4">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          value={isNaN(row.response) ? '' : row.response}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value === '-') {
                              updateDataRow(row.id, 'response', NaN);
                            } else {
                              const parsed = parseFloat(value);
                              updateDataRow(row.id, 'response', parsed);
                            }
                          }}
                          data-testid={`input-response-${row.id}`}
                          placeholder={`Enter ${responseVariableName || 'Y Response'} value:`}
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          value={row.factorA}
                          onChange={(e) => updateDataRow(row.id, 'factorA', e.target.value)}
                          data-testid={`input-factor-a-${row.id}`}
                          placeholder={`${factorAName || 'Factor A'} level: ${factorALevels.join(' or ')}`}
                          list={`factor-a-list-${row.id}`}
                        />
                        <datalist id={`factor-a-list-${row.id}`}>
                          {factorALevels.map((level) => (
                            <option key={level} value={level} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-4">
                        <Input
                          value={row.factorB}
                          onChange={(e) => updateDataRow(row.id, 'factorB', e.target.value)}
                          data-testid={`input-factor-b-${row.id}`}
                          placeholder={`${factorBName || 'Factor A'} level: ${factorBLevels.join(' or ')}`}
                          list={`factor-b-list-${row.id}`}
                        />
                        <datalist id={`factor-b-list-${row.id}`}>
                          {factorBLevels.map((level) => (
                            <option key={level} value={level} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDataRow(row.id)}
                          data-testid={`button-delete-row-${row.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={addDataRow}
                data-testid="button-add-row"
              >
                Add Row
              </Button>
              <Button
                variant="outline"
                onClick={handleUndo}
                disabled={previousDataRows.length === 0}
                data-testid="button-undo"
              >
                <Undo className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearAll}
                data-testid="button-clear-all"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Calculate Y-axis range for consistent scaling across plots
  const getYAxisRange = () => {
    if (!anovaResult) return undefined;
    
    const allMeans: number[] = [];
    
    // Main effect means for Factor A
    factorALevels.forEach((levelA) => {
      const values: number[] = [];
      factorBLevels.forEach((levelB) => {
        const key = `${levelA}-${levelB}`;
        const cellValues = cellData[key] || [];
        values.push(...cellValues);
      });
      if (values.length > 0) {
        allMeans.push(values.reduce((a, b) => a + b, 0) / values.length);
      }
    });
    
    // Main effect means for Factor B
    factorBLevels.forEach((levelB) => {
      const values: number[] = [];
      factorALevels.forEach((levelA) => {
        const key = `${levelA}-${levelB}`;
        const cellValues = cellData[key] || [];
        values.push(...cellValues);
      });
      if (values.length > 0) {
        allMeans.push(values.reduce((a, b) => a + b, 0) / values.length);
      }
    });
    
    // If interaction is included, add cell means
    if (includeInteraction) {
      Object.values(anovaResult.cellMeans).forEach((mean) => {
        allMeans.push(mean);
      });
    }
    
    if (allMeans.length === 0) return undefined;
    
    const minMean = Math.min(...allMeans);
    const maxMean = Math.max(...allMeans);
    const range = maxMean - minMean;
    const padding = range * 0.1;
    
    return [minMean - padding, maxMean + padding];
  };

  const yAxisRange = getYAxisRange();

  // Graph Tab Content
  const graphContent = (
    <div className="space-y-6">
      {!anovaResult ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter data to view main effect plots{includeInteraction ? ', interaction plot,' : ''} and residual plots</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Effect Plots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Main Effect Plot</CardTitle>
              </CardHeader>
              <CardContent>
                <Plot
                  data={[
                    {
                      x: factorALevels,
                      y: factorALevels.map((levelA) => {
                        const values: number[] = [];
                        factorBLevels.forEach((levelB) => {
                          const key = `${levelA}-${levelB}`;
                          const cellValues = cellData[key] || [];
                          values.push(...cellValues);
                        });
                        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      }),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: { width: 3, color: '#2563eb' },
                      marker: { size: 10, color: '#2563eb' },
                    },
                  ]}
                  layout={{
                    title:{ text: `<b>Main Effect Plot - ${factorAName || 'Factor A'}</b>` },
                    xaxis: { 
                      title: { text: factorAName || 'Factor A' },
                      type: 'category',
                      tickmode: 'array',
                      tickvals: factorALevels,
                      ticktext: factorALevels,
                    },
                    yaxis: { 
                      title: { text: responseVariableName || 'Y Response' },
                      range: yAxisRange,
                    },
                    showlegend: false,
                    hovermode: 'closest',
                    margin: { l: 60, r: 40, t: 40, b: 60 },
                  }}
                 config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `ANOVA_2_Way_Main_Effect_Plot_of_${factorAName || 'Factor A'} on ${responseVariableName || 'Y Response'}`,
                      height: 500,
                      width: 660,
                      scale: 1
                    }
                  }}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Main Effect Plot</CardTitle>
              </CardHeader>
              <CardContent>
                <Plot
                  data={[
                    {
                      x: factorBLevels,
                      y: factorBLevels.map((levelB) => {
                        const values: number[] = [];
                        factorALevels.forEach((levelA) => {
                          const key = `${levelA}-${levelB}`;
                          const cellValues = cellData[key] || [];
                          values.push(...cellValues);
                        });
                        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      }),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: { width: 3, color: '#16a34a' },
                      marker: { size: 10, color: '#16a34a' },
                    },
                  ]}
                  layout={{
                    title:{ text: `<b>Main Effect Plot - ${factorBName || 'Factor B'}</b>` },
                    xaxis: { 
                      title: { text: factorBName || 'Factor B' },
                      type: 'category',
                      tickmode: 'array',
                      tickvals: factorBLevels,
                      ticktext: factorBLevels,
                    },
                    yaxis: { 
                      title: { text: responseVariableName || 'Y Response' },
                      range: yAxisRange,
                    },
                    showlegend: false,
                    hovermode: 'closest',
                    margin: { l: 60, r: 40, t: 40, b: 60 },
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `ANOVA_2_Way_Main_Effect_Plot_of_${factorBName || 'Factor B'} on ${responseVariableName || 'Y Response'}`,
                      height: 500,
                      width: 660,
                      scale: 1
                    }
                  }}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Interaction Plot - Only show when interaction is included */}
          {includeInteraction && (
            <Card>
              <CardHeader>
                <CardTitle>Interaction Plot</CardTitle>
              </CardHeader>
              <CardContent>
                <Plot
                  data={factorALevels.map((levelA) => ({
                    x: factorBLevels,
                    y: factorBLevels.map((levelB) => {
                      const key = `${levelA}-${levelB}`;
                      return anovaResult.cellMeans[key] || 0;
                    }),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: levelA,
                    line: { width: 2 },
                    marker: { size: 8 },
                  }))}
                  layout={{
                    title: { text: `<b>${factorAName  || 'Factor A'} × ${factorBName || 'Factor B'} Interaction</b>` },
                    xaxis: { 
                      title: { text: factorBName || 'Factor B' },
                      type: 'category',
                      tickmode: 'array',
                      tickvals: factorBLevels,
                      ticktext: factorBLevels,
                    },
                    yaxis: { 
                      title: { text: responseVariableName || 'Y Response' },
                      range: yAxisRange,
                    },
                    showlegend: true,
                    legend: { title: { text: factorAName || 'Factor A' } },
                    hovermode: 'closest',
                    margin: { l: 60, r: 160, t: 60, b: 60 },
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `ANOVA_2_Way_Interaction_Plot_of_${factorAName || 'Factor A'}x${factorBName || 'Factor B'} on ${responseVariableName || 'Y Response'}`,
                      height: 500,
                      width: 800,
                      scale: 1
                    }
                  }}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  // Analysis Tab Content
  const analysisContent = (
    <div className="space-y-6">
      {analysisError ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            <Info className="h-12 w-12 mx-auto mb-4" />
            <p className="font-semibold">Analysis Error</p>
            <p className="text-sm mt-2">{analysisError}</p>
          </CardContent>
        </Card>
      ) : !anovaResult ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter data and save to view ANOVA results</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
                      <TableHead className="text-right">SS</TableHead>
                      <TableHead className="text-right">MS</TableHead>
                      <TableHead className="text-right">F</TableHead>
                      <TableHead className="text-right">P-Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{factorAName || 'Factor A'}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorADF}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorASS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorAMS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorAF.toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <span className={anovaResult.factorAPValue < significanceLevel ? "text-green-600 font-semibold" : ""}>
                          {anovaResult.factorAPValue.toFixed(4)}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{factorBName || 'Factor B'}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorBDF}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorBSS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorBMS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{anovaResult.factorBF.toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        <span className={anovaResult.factorBPValue < significanceLevel ? "text-green-600 font-semibold" : ""}>
                          {anovaResult.factorBPValue.toFixed(4)}
                        </span>
                      </TableCell>
                    </TableRow>
                    {includeInteraction && (
                      <TableRow>
                        <TableCell className="font-medium">{factorAName || 'Factor A'} × {factorBName || 'Factor B'}</TableCell>
                        <TableCell className="text-right">{anovaResult.interactionDF}</TableCell>
                        <TableCell className="text-right">{anovaResult.interactionSS.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{anovaResult.interactionMS.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{anovaResult.interactionF.toFixed(4)}</TableCell>
                        <TableCell className="text-right">
                          <span className={anovaResult.interactionPValue < significanceLevel ? "text-green-600 font-semibold" : ""}>
                            {anovaResult.interactionPValue.toFixed(4)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">Error</TableCell>
                      <TableCell className="text-right">{anovaResult.errorDF}</TableCell>
                      <TableCell className="text-right">{anovaResult.errorSS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">{anovaResult.errorMS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right">{anovaResult.totalDF}</TableCell>
                      <TableCell className="text-right">{anovaResult.totalSS.toFixed(4)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle>Interpretation (α = {significanceLevel})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{factorAName} Effect:</p>
                <p className={anovaResult.factorAPValue < significanceLevel ? "text-green-600" : "text-muted-foreground"}>
                  {anovaResult.factorAPValue < significanceLevel
                    ? `✓ Significant (p = ${anovaResult.factorAPValue.toFixed(4)}). ${factorAName || 'Factor A'} has a significant effect on ${responseVariableName || 'Y Response'}.`
                    : `✗ Not significant (p = ${anovaResult.factorAPValue.toFixed(4)}). ${factorAName || 'Factor A'} does not have a significant effect on ${responseVariableName || 'Y Response'}.`
                  }
                </p>
              </div>
              <div>
                <p className="font-semibold">{factorBName} Effect:</p>
                <p className={anovaResult.factorBPValue < significanceLevel ? "text-green-600" : "text-muted-foreground"}>
                  {anovaResult.factorBPValue < significanceLevel
                    ? `✓ Significant (p = ${anovaResult.factorBPValue.toFixed(4)}). ${factorBName || 'Factor B'} has a significant effect on ${responseVariableName || 'Y Response'}.`
                    : `✗ Not significant (p = ${anovaResult.factorBPValue.toFixed(4)}). ${factorBName || 'Factor B'} does not have a significant effect on ${responseVariableName || 'Y Response'}.`
                  }
                </p>
              </div>
              {includeInteraction && (
                <div>
                  <p className="font-semibold">Interaction Effect:</p>
                  <p className={anovaResult.interactionPValue < significanceLevel ? "text-green-600" : "text-muted-foreground"}>
                    {anovaResult.interactionPValue < significanceLevel
                      ? `✓ Significant (p = ${anovaResult.interactionPValue.toFixed(4)}). There is a significant interaction between ${factorAName || 'Factor A'} and ${factorBName || 'Factor B'}.`
                      : `✗ Not significant (p = ${anovaResult.interactionPValue.toFixed(4)}). There is no significant interaction between ${factorAName || 'Factor A'} and ${factorBName || 'Factor B'}.`
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Model Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">R-Squared</p>
                  <p className="text-2xl font-bold">{(anovaResult.rSquared * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">R-Squared Adjusted</p>
                  <p className="text-2xl font-bold">{(anovaResult.rSquaredAdjusted * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Root MSE</p>
                  <p className="text-2xl font-bold">{Math.sqrt(anovaResult.errorMS).toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coefficients Table */}
          {anovaResult.coefficients && anovaResult.coefficients.length > 0 && (
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anovaResult.coefficients.map((coef, idx) => (
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
                            {coef.tValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`coef-pvalue-${idx}`}>
                            <span className={coef.pValue < significanceLevel ? "text-green-600 font-semibold" : ""}>
                              {coef.pValue < 0.0001 ? coef.pValue.toExponential(2) : coef.pValue.toFixed(4)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cell Means */}
          <Card>
            <CardHeader>
              <CardTitle>Cell Means</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Grand Mean</p>
                <p className="text-xl font-bold" data-testid="text-grand-mean">{anovaResult.grandMean.toFixed(4)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{factorAName || 'Factor A'} ↓ \ {factorBName || 'Factor B'} →</TableHead>
                      {factorBLevels.map((levelB, idx) => (
                        <TableHead key={idx} className="text-right">{levelB}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factorALevels.map((levelA, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{levelA}</TableCell>
                        {factorBLevels.map((levelB, idxB) => {
                          const key = `${levelA}-${levelB}`;
                          return (
                            <TableCell key={idxB} className="text-right">
                              {anovaResult.cellMeans[key]?.toFixed(4) || '-'}
                              <span className="text-xs text-muted-foreground ml-1">
                                (n={anovaResult.cellNs[key] || 0})
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Analysis of Residuals */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis of Residuals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-2">Residuals Analysis:</p>
                <table className="w-full border-collapse bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <tbody>
                    <th className="text-sm text-muted-foreground py-2 pr-4 w-1/4">Standard Deviation:</th>
                    <th className="text-sm text-muted-foreground py-2 pr-4 align-top w-3/4">Normality Test (Anderson-Darling):</th>
                    <tr>
                      <td className="font-medium py-2 text-center">{anovaResult.residualStd.toFixed(6)}</td>
                      <table className="w-full">
                        <tbody>                         
                          <th className="text-sm text-muted-foreground pb-1 w-1/5">AD Statistic:</th>
                          <th className="text-sm text-muted-foreground pb-1 w 1/5">p-value:</th>
                          <th className="text-sm text-muted-foreground pb-1 w-3/5">Conclusion (5% significance (α)):</th>
                          <tr>
                            <td className="font-medium pb-1 text-center">{anovaResult.andersonDarlingStatistic.toFixed(4)}</td>
                            <td className="font-medium pb-1 text-center">{anovaResult.andersonDarlingPValue.toFixed(4)}</td>
                            <td className={`font-medium pb-1  text-center ${
                              anovaResult.andersonDarlingNormality === 'Normal' ? 'text-green-600 dark:text-green-400' :
                              anovaResult.andersonDarlingNormality === 'Not Normal' ? 'text-red-600 dark:text-red-400' :
                              'text-yellow-600 dark:text-yellow-400'
                              }`}>
                              {anovaResult.andersonDarlingNormality}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="residuals-vs-fits"
                    checked={showResidualsVsFits}
                    onCheckedChange={(checked) => setShowResidualsVsFits(checked as boolean)}
                    data-testid="checkbox-residuals-vs-fits"
                  />
                  <Label htmlFor="residuals-vs-fits" className="cursor-pointer">
                    Graph of residuals versus fitted values (check the homogeneity of the variance of the residuals and their random distribution)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="residuals-vs-order"
                    checked={showResidualsVsOrder}
                    onCheckedChange={(checked) => setShowResidualsVsOrder(checked as boolean)}
                    data-testid="checkbox-residuals-vs-order"
                  />
                  <Label htmlFor="residuals-vs-order" className="cursor-pointer">
                    Graph of residuals versus order of data (verify the independence of the residuals)
                  </Label>
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

              {(showResidualsVsFits || showResidualsVsOrder || showNormalProbPlot) && anovaResult.residuals && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showResidualsVsFits && (
                    <div>
                      <Plot
                        data={[{
                          x: anovaResult.fittedValues,
                          y: anovaResult.residuals,
                          mode: 'markers',
                          type: 'scatter',
                          name: 'Residuals',
                          marker: { color: '#2563eb', size: 8 },
                        },
                        {
                          x: anovaResult.fittedValues,
                          y: Array(anovaResult.fittedValues.length).fill(0),
                          mode: 'lines',
                          type: 'scatter',
                          name: 'Zero Line',
                          line: { color: 'black', width: 1, dash: 'dash' },
                        }]}
                        layout={{
                          title: { text: '<b>Residuals vs Fitted Values</b>' },
                          xaxis: { title: { text: '<b>Fitted Values</b>' } },
                          yaxis: { title: { text: '<b>Residuals</b>' } },
                          showlegend: false,
                          hovermode: 'closest',
                          margin: { l: 60, r: 80, t: 50, b: 60 },
                        }}
                        useResizeHandler
                        style={{ width: '100%', height: '400px' }}
                        config={{ 
                          displayModeBar: true,
                          toImageButtonOptions: {
                            filename: `Residuals vs Fitted Values_${responseVariableName || 'Y Response'}_ANOVA Two-Way`,
                            height: 500,
                            width: 600,
                            scale: 1
                          }
                        }}
                      />
                    </div>
                  )}

                  {showResidualsVsOrder && (
                    <div>
                      <Plot
                        data={[{
                          x: anovaResult.residuals.map((_, i) => i + 1),
                          y: anovaResult.residuals,
                          mode: 'markers',
                          type: 'scatter',
                          name: 'Residuals',
                          marker: { color: '#2563eb', size: 8 },
                        },
                        {
                          x: [1, anovaResult.residuals.length],
                          y: [0, 0],
                          mode: 'lines',
                          type: 'scatter',
                          name: 'Zero Line',
                          line: { color: 'black', width: 1, dash: 'dash' },
                        }]}
                        layout={{
                          title: { text: '<b>Residuals vs Observation Order</b>' },
                          xaxis: { title: { text: '<b>Observation Order</b>' } },
                          yaxis: { title: { text: '<b>Residuals</b>' } },
                          showlegend: false,
                          hovermode: 'closest',
                          margin: { l: 60, r: 80, t: 50, b: 60 },
                        }}
                        useResizeHandler
                        style={{ width: '100%', height: '400px' }}
                        config={{ 
                          displayModeBar: true,
                          toImageButtonOptions: {
                            filename: `Residuals vs Observation Order_${responseVariableName || 'Y Response'}_ANOVA Two-Way`,
                            height: 500,
                            width: 600,
                            scale: 1
                          }
                        }}
                      />
                    </div>
                  )}

                  {showNormalProbPlot && (() => {
                    const sorted = [...anovaResult.residuals].sort((a, b) => a - b);
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
                    const lineX = [anovaResult.residualMean-3*anovaResult.residualStd, anovaResult.residualMean+3*anovaResult.residualStd];
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
                            title: { text: '<b>Residuals/<b>' },
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
                            filename: `ANOVA 2-Way Normal_Probability_Plot_${responseVariableName || 'Y Response'}_Residuals`,
                            height: 500,
                            width: 800,
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
        </>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <HypothesisTestingTabs
        projectId={projectId}
        ctqId={0}
        testType={`anova-two-way-${solutionId}`}
        setupContent={setupContent}
        dataContent={dataContent}
        chartContent={graphContent}
        analysisContent={analysisContent}
      />
    </div>
  );
}
