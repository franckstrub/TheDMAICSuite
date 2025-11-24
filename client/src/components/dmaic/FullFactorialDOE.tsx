import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import Plot from 'react-plotly.js';
import { 
  type DOEFactor, 
  generateFullFactorialPlan, 
  decodeValue,
  calculateMainEffects,
  calculateInteractionEffects
} from '@/lib/doeUtils';
import { invertMatrix } from '@/lib/multipleRegressionUtils';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import jStat from 'jstat';
import { 
  transformGeneratedPlanForSaving, 
  reconstructGeneratedPlanFromPersisted,
  getDefaultFactor,
  validateFactorCount,
  parseFactorValue,
  calculateDOEVIF
} from '@/lib/doeSharedUtils';
import { performNormalityTest } from '@/lib/statisticsUtils';

interface FullFactorialDOEProps {
  projectId: number;
  solutionId: string;
}

export function FullFactorialDOE({ projectId, solutionId }: FullFactorialDOEProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const lastLoadedKey = useRef<string>('');
  
  // State for Setup tab
  const [responseVariableName, setResponseVariableName] = useState("Y Response");
  const [factors, setFactors] = useState<DOEFactor[]>([
    { name: "Factor A", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
    { name: "Factor B", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
  ]);
  // UI state for raw string inputs (allows partial numbers like "-", "0.", "1,5")
  const [factorInputs, setFactorInputs] = useState<Record<string, string>>({});
  const [numberOfReplicates, setNumberOfReplicates] = useState(1);
  const [randomizeRuns, setRandomizeRuns] = useState(true);
  const [includeCenterPoints, setIncludeCenterPoints] = useState(false);
  const [numberOfCenterPoints, setNumberOfCenterPoints] = useState(3);
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  
  // State for Data tab
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, number | null>>({});
  // UI state for raw string inputs for responses (allows partial numbers like "-", "0.", "1,5")
  const [responseInputs, setResponseInputs] = useState<Record<number, string>>({});
  const [showUncoded, setShowUncoded] = useState(false); // false = coded, true = uncoded
  
  // Computed runData from generatedPlan + responses (for backward compatibility with existing UI code)
  const runData = useMemo(() => {
    if (!generatedPlan || !generatedPlan.plan) return [];
    return generatedPlan.plan.map((row: any) => ({
      run: row.runOrder,
      factors: factors.map(f => row[f.name] as number),
      response: responses[row.runOrder.toString()] ?? null,
    }));
  }, [generatedPlan, responses, factors]);
  
  // Solver state for Analysis tab
  const [solveFactorIdx, setSolveFactorIdx] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [targetYDisplay, setTargetYDisplay] = useState('');
  const [solverResult, setSolverResult] = useState<number | null>(null);
  const [constraintValues, setConstraintValues] = useState<Record<number, number | null>>({});
  const [constraintDisplay, setConstraintDisplay] = useState<Record<number, string>>({});
  
  // Helper function to parse decimal values accepting both "," and "." separators
  const parseDecimalValue = (str: string): number | null => {
    if (str === '' || str === null) return null;
    // Replace "," with "." for parsing
    const normalized = String(str).trim().replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  };
  
  // Model reduction - track which factors to include (all enabled by default)
  const [selectedFactorsForModel, setSelectedFactorsForModel] = useState<Record<number | string, boolean>>(
    {}
  );
  
  // Residual analysis plot visibility
  const [showResidualsVsFits, setShowResidualsVsFits] = useState(false);
  const [showResidualsVsOrder, setShowResidualsVsOrder] = useState(false);
  const [showNormalProbPlot, setShowNormalProbPlot] = useState(false);
  
  // Tab persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem(`doe-full-active-tab-${projectId}-${solutionId}`);
    return stored || "setup";
  });
  
  // Update localStorage when tab changes
  useEffect(() => {
    localStorage.setItem(`doe-full-active-tab-${projectId}-${solutionId}`, activeTab);
  }, [activeTab, projectId, solutionId]);
  
  // Auto-generate plan when switching to Data tab
  useEffect(() => {
    if (activeTab === 'data' && validateFactorCount(factors)) {
      const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
      const plan = generateFullFactorialPlan(factors, centerPoints, randomizeRuns, numberOfReplicates);
      
      setGeneratedPlan(plan);
      
      // Responses are preserved automatically since they're keyed by run order
      // No need to rebuild - existing responses state remains valid
    }
  }, [activeTab, factors, includeCenterPoints, numberOfCenterPoints, randomizeRuns, numberOfReplicates]);

  // Ref to store the solve function so it can be called by useEffect
  const solveRef = useRef<(() => void) | null>(null);

  // Auto-solve when solver dependencies change
  useEffect(() => {
    if (solveRef.current) {
      solveRef.current();
    }
  }, [solveFactorIdx, targetY, constraintValues, selectedFactorsForModel]);
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-full`],
    retry: false,
  });
  
  // Save selected coefficients mutation
  const saveSelectedCoefficientsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        'PATCH',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-full`,
        {
          selectedFactorsForModel
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Coefficient selections saved",
        description: "Your coefficient selections have been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-full`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save coefficient selections.",
        variant: "destructive",
      });
    },
  });
  
  // Load data when config is fetched
  useEffect(() => {
    const currentKey = `${projectId}-${solutionId}`;
    
    if (lastLoadedKey.current !== currentKey) {
      loadedRef.current = false;
      lastLoadedKey.current = currentKey;
    }
    
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      
      if (config.responseVariableName) {
        setResponseVariableName(config.responseVariableName);
      }
      
      if (config.factors && Array.isArray(config.factors) && config.factors.length > 0) {
        // Populate empty factor names with defaults (Factor A, B, C, etc.)
        const factorsWithDefaults = config.factors.map((f: any, i: number) => ({
          ...f,
          name: f.name && f.name.trim() !== '' ? f.name : `Factor ${String.fromCharCode(65 + i)}`,
        }));
        
        setFactors(factorsWithDefaults);
        // Initialize factorInputs from loaded numeric values
        const inputs: Record<string, string> = {};
        factorsWithDefaults.forEach((f: DOEFactor, i: number) => {
          if (f.type === 'continuous') {
            if (f.lowValue !== null && !isNaN(f.lowValue)) inputs[`${i}-lowValue`] = String(f.lowValue);
            if (f.highValue !== null && !isNaN(f.highValue)) inputs[`${i}-highValue`] = String(f.highValue);
          }
        });
        setFactorInputs(inputs);
      }
      
      if (config.numberOfReplicates !== undefined) {
        setNumberOfReplicates(config.numberOfReplicates);
      }
      
      if (config.randomizeRuns !== undefined) {
        setRandomizeRuns(config.randomizeRuns);
      }
      
      if (config.includeCenterPoints !== undefined) {
        setIncludeCenterPoints(config.includeCenterPoints);
      }
      
      if (config.numberOfCenterPoints !== undefined) {
        setNumberOfCenterPoints(config.numberOfCenterPoints);
      }
      
      if (config.significanceLevel !== undefined) {
        setSignificanceLevel(config.significanceLevel);
      }
      
      if (config.showUncoded !== undefined) {
        setShowUncoded(config.showUncoded);
      }
      
      // Load selected factors for model
      if (config.selectedFactorsForModel) {
        setSelectedFactorsForModel(config.selectedFactorsForModel);
      }
      
      // Load solver setup
      if (config.targetY !== undefined && config.targetY !== null) {
        setTargetY(config.targetY);
        setTargetYDisplay(String(config.targetY));
      }
      if (config.solveFactorIdx !== undefined && config.solveFactorIdx !== null) {
        setSolveFactorIdx(config.solveFactorIdx);
      }
      if (config.constraintValues) {
        setConstraintValues(config.constraintValues);
        // Also populate constraintDisplay for the input fields
        const displayValues: Record<number, string> = {};
        Object.entries(config.constraintValues).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            displayValues[parseInt(key)] = String(value);
          }
        });
        setConstraintDisplay(displayValues);
      }
      
      // Load generatedPlan from persisted format
      if (config.generatedPlan) {
        const reconstructedPlan = reconstructGeneratedPlanFromPersisted(
          config.generatedPlan,
          config.factors || factors
        );
        if (reconstructedPlan) {
          // All metadata (k) comes from generatedPlan only
          setGeneratedPlan(reconstructedPlan);
          
          // Extract responses from generatedPlan.plan[].runResponse
          if (reconstructedPlan.plan && Array.isArray(reconstructedPlan.plan)) {
            const responsesMap: Record<string, number | null> = {};
            const inputs: Record<number, string> = {};
            reconstructedPlan.plan.forEach((row: any) => {
              const runOrder = row.runOrder;
              const response = row.runResponse;
              if (runOrder !== undefined) {
                responsesMap[runOrder.toString()] = response ?? null;
                if (response !== null && response !== undefined) {
                  inputs[runOrder] = String(response);
                }
              }
            });
            setResponses(responsesMap);
            setResponseInputs(inputs);
          }
          
          // Backward compatibility: Load from legacy runResponses if no runResponse in plan
          if (config.runResponses && typeof config.runResponses === 'object' && Object.keys(config.runResponses).length > 0) {
            setResponses(config.runResponses);
            const inputs: Record<number, string> = {};
            Object.entries(config.runResponses).forEach(([runOrder, response]: [string, any]) => {
              if (response !== null && response !== undefined) {
                inputs[parseInt(runOrder)] = String(response);
              }
            });
            setResponseInputs(inputs);
          }
        }
      }
      
      // Fallback: Load from legacy runData format if no generatedPlan
      if (!config.generatedPlan && config.runData && Array.isArray(config.runData)) {
        // Convert legacy runData to responses map
        const responsesMap: Record<string, number | null> = {};
        config.runData.forEach((rd: any) => {
          responsesMap[rd.run.toString()] = rd.response;
        });
        setResponses(responsesMap);
        
        // Initialize responseInputs from loaded response values
        const inputs: Record<number, string> = {};
        config.runData.forEach((rd: any) => {
          if (rd.response !== null && rd.response !== undefined) {
            inputs[rd.run] = String(rd.response);
          }
        });
        setResponseInputs(inputs);
      }
    }
  }, [configQuery.data, projectId, solutionId]);
  
  // Save mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-full`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Your Full Factorial DOE configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-full`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Full Factorial DOE configuration",
        variant: "destructive",
      });
    },
  });

  const saveSolvingSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-full-solver`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Solver setup saved",
        description: "Your solver setup has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-full`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save solver setup",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSetup = () => {
    if (!validateFactorCount(factors)) {
      toast({
        title: "Validation Error",
        description: "Please add at least 2 factors for Full Factorial DOE.",
        variant: "destructive",
      });
      return;
    }
    
    saveConfigMutation.mutate({
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      selectedFactorsForModel,
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors, responses),
    });
  };
  
  const handleSaveData = () => {
    saveConfigMutation.mutate({
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      selectedFactorsForModel,
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors, responses),
    });
  };

  const handleSaveSolvingSetup = async () => {
    // Ensure all constraint values are numbers (not strings), keys will be strings in JSON
    const cleanedConstraintValues: Record<string, number | null> = {};
    Object.entries(constraintValues).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        cleanedConstraintValues[key] = null;
      } else {
        const numValue = typeof value === 'string' ? parseDecimalValue(value) : value;
        cleanedConstraintValues[key] = numValue;
      }
    });
    
    const solverSetupData = {
      targetY,
      solveFactorIdx,
      constraintValues: cleanedConstraintValues,
      significanceLevel,
    };
    
    await saveSolvingSetupMutation.mutateAsync(solverSetupData);
  };
  
  const handleAddFactor = () => {
    const newFactorIndex = factors.length + 1;
    const newFactor = getDefaultFactor(newFactorIndex);
    setFactors([...factors, newFactor]);
  };
  
  const handleDeleteFactor = (index: number) => {
    if (factors.length <= 2) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least 2 factors for Full Factorial DOE.",
        variant: "destructive",
      });
      return;
    }
    setFactors(factors.filter((_, i) => i !== index));
  };
  
  const handleFactorChange = (index: number, field: string, value: any) => {
    const newFactors = [...factors];
    const factor = newFactors[index];
    
    if (field === 'type') {
      if (value === 'continuous') {
        newFactors[index] = {
          name: factor.name,
          type: 'continuous',
          lowValue: NaN,
          highValue: NaN,
          units: '',
        };
        // Clear input strings when switching type
        const newInputs = { ...factorInputs };
        delete newInputs[`${index}-lowValue`];
        delete newInputs[`${index}-highValue`];
        setFactorInputs(newInputs);
      } else {
        newFactors[index] = {
          name: factor.name,
          type: 'categorical',
          levels: ['Low', 'High'],
        };
      }
    } else if (field === 'name') {
      newFactors[index] = { ...factor, name: value };
    } else if (factor.type === 'continuous') {
      if (field === 'lowValue' || field === 'highValue') {
        // Store raw string input
        setFactorInputs({
          ...factorInputs,
          [`${index}-${field}`]: value,
        });
        // Parse and update factor value
        const parsed = parseFactorValue(value);
        newFactors[index] = { ...factor, [field]: parsed };
      } else if (field === 'units') {
        newFactors[index] = { ...factor, units: value };
      }
    } else if (factor.type === 'categorical') {
      if (field === 'level0') {
        const levels = [...factor.levels];
        levels[0] = value;
        newFactors[index] = { ...factor, levels };
      } else if (field === 'level1') {
        const levels = [...factor.levels];
        levels[1] = value;
        newFactors[index] = { ...factor, levels };
      }
    }
    
    setFactors(newFactors);
  };
  
  // Check if all factors have valid levels defined
  const allFactorsHaveValidLevels = () => {
    return factors.every(factor => {
      if (factor.type === 'categorical') {
        return factor.levels && factor.levels.length >= 2;
      } else {
        return !isNaN(factor.lowValue) && !isNaN(factor.highValue) && 
               factor.lowValue !== null && factor.highValue !== null;
      }
    });
  };
  
  const handleGeneratePlan = () => {
    if (!validateFactorCount(factors)) {
      toast({
        title: "Cannot Generate Plan",
        description: "Please add at least 2 factors before generating the Full Factorial DOE plan.",
        variant: "destructive",
      });
      return;
    }
    
    const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
    const plan = generateFullFactorialPlan(factors, centerPoints, randomizeRuns, numberOfReplicates);
    
    setGeneratedPlan(plan);
    
    // Clear responses for new plan (responses state persists by run order)
    setResponses({});
    setResponseInputs({});
    
    toast({
      title: "Full Factorial DOE Plan Generated",
      description: `Generated ${plan.plan.length} experimental runs.`,
    });
  };
  
  const handleResponseChange = (runIndex: number, value: string) => {
    if (!generatedPlan || !generatedPlan.plan) return;
    
    const runNumber = generatedPlan.plan[runIndex]?.runOrder;
    if (runNumber === undefined) return;
    
    setResponseInputs({
      ...responseInputs,
      [runNumber]: value,
    });
  };
  
  const handleResponseBlur = (runIndex: number) => {
    if (!generatedPlan || !generatedPlan.plan) return;
    
    const runNumber = generatedPlan.plan[runIndex]?.runOrder;
    if (runNumber === undefined) return;
    
    const rawValue = responseInputs[runNumber] || '';
    const parsedValue = parseNumericValue(rawValue);
    
    // Update responses state
    setResponses(prev => ({
      ...prev,
      [runNumber.toString()]: isNaN(parsedValue) ? null : parsedValue
    }));
    
    // Update responseInputs with the parsed value (or remove if empty/invalid)
    if (rawValue.trim() === '' || isNaN(parsedValue)) {
      const newInputs = { ...responseInputs };
      delete newInputs[runNumber];
      setResponseInputs(newInputs);
    } else {
      setResponseInputs({
        ...responseInputs,
        [runNumber]: String(parsedValue),
      });
    }
  };
  
  return (
    <div className="space-y-6" data-testid="full-factorial-doe-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Full Factorial DOE (2<sup>k</sup>)</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
          <TabsTrigger value="chart" data-testid="tab-chart">Chart</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
        </TabsList>
        
        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Full Factorial 2<sup>k</sup> DOE Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {configQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              
              {!configQuery.isLoading && (
                <>
                  {/* Response Variable */}
                  <div className="space-y-2">
                    <Label htmlFor="response-variable-name">Response Variable Name</Label>
                    <Input
                      id="response-variable-name"
                      value={responseVariableName}
                      onChange={(e) => setResponseVariableName(e.target.value)}
                      placeholder="Y Response"
                      data-testid="input-response-variable-name"
                    />
                  </div>
                  
                  {/* Factors Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Factors</h3>
                      <Button
                        onClick={handleAddFactor}
                        size="sm"
                        data-testid="button-add-factor"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Factor
                      </Button>
                    </div>
                    
                    {factors.length < 2 && (
                      <div className="text-sm text-destructive">
                        At least 2 factors are required for DOE
                      </div>
                    )}
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Factor Name</TableHead>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead className="w-[160px]">Low Value / -1 (coded)</TableHead>
                            <TableHead className="w-[160px]">High Value / +1 (coded)</TableHead>
                            <TableHead className="w-[120px]">Units</TableHead>
                            <TableHead className="w-[60px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {factors.map((factor, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  value={factor.name}
                                  onChange={(e) => handleFactorChange(index, 'name', e.target.value)}
                                  placeholder="Factor Name"
                                  data-testid={`input-factor-name-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={factor.type}
                                  onValueChange={(value) => handleFactorChange(index, 'type', value)}
                                >
                                  <SelectTrigger data-testid={`select-factor-type-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="continuous">Continuous</SelectItem>
                                    <SelectItem value="categorical">Categorical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {factor.type === 'continuous' ? (
                                  <Input
                                    type="text"
                                    value={factorInputs[`${index}-lowValue`] ?? (factor.lowValue !== null && !isNaN(factor.lowValue) ? String(factor.lowValue) : '')}
                                    onChange={(e) => handleFactorChange(index, 'lowValue', e.target.value)}
                                    placeholder="Enter Value at low level (-1)"
                                    data-testid={`input-factor-low-${index}`}
                                  />
                                ) : (
                                  <Input
                                    value={factor.levels[0] || ''}
                                    onChange={(e) => handleFactorChange(index, 'level0', e.target.value)}
                                    placeholder="Level -1"
                                    data-testid={`input-factor-level0-${index}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {factor.type === 'continuous' ? (
                                  <Input
                                    type="text"
                                    value={factorInputs[`${index}-highValue`] ?? (factor.highValue !== null && !isNaN(factor.highValue) ? String(factor.highValue) : '')}
                                    onChange={(e) => handleFactorChange(index, 'highValue', e.target.value)}
                                    placeholder="Enter Value at high level (+1)"
                                    data-testid={`input-factor-high-${index}`}
                                  />
                                ) : (
                                  <Input
                                    value={factor.levels[1] || ''}
                                    onChange={(e) => handleFactorChange(index, 'level1', e.target.value)}
                                    placeholder="Level +1"
                                    data-testid={`input-factor-level1-${index}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {factor.type === 'continuous' && (
                                  <Input
                                    value={factor.units || ''}
                                    onChange={(e) => handleFactorChange(index, 'units', e.target.value)}
                                    placeholder="Units"
                                    data-testid={`input-factor-units-${index}`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFactor(index)}
                                  disabled={factors.length <= 2}
                                  data-testid={`button-delete-factor-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Run Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Run Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="number-of-replicates">Number of Replicates</Label>
                        <Input
                          id="number-of-replicates"
                          type="number"
                          min="1"
                          value={numberOfReplicates}
                          onChange={(e) => setNumberOfReplicates(parseInt(e.target.value) || 1)}
                          data-testid="input-number-of-replicates"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="significance-level">Significance Level (α)</Label>
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
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="randomize-runs"
                        checked={randomizeRuns}
                        onCheckedChange={(checked) => setRandomizeRuns(checked as boolean)}
                        data-testid="checkbox-randomize-runs"
                      />
                      <Label htmlFor="randomize-runs">
                        Randomize Runs
                      </Label>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-center-points"
                          checked={includeCenterPoints}
                          onCheckedChange={(checked) => setIncludeCenterPoints(checked as boolean)}
                          data-testid="checkbox-include-center-points"
                        />
                        <Label htmlFor="include-center-points">
                          Include Center Points
                        </Label>
                      </div>
                      
                      {includeCenterPoints && (
                        <div className="ml-6 space-y-2">
                          <Label htmlFor="number-of-center-points">Number of Center Points</Label>
                          <Input
                            id="number-of-center-points"
                            type="number"
                            min="1"
                            value={numberOfCenterPoints}
                            onChange={(e) => setNumberOfCenterPoints(parseInt(e.target.value) || 3)}
                            data-testid="input-number-of-center-points"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSetup}
                      disabled={saveConfigMutation.isPending || factors.length < 2}
                      data-testid="button-save-setup"
                    >
                      {saveConfigMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save DOE Setup
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experimental Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {factors.length < 2 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Please configure at least 2 factors in the Setup tab before generating the Full Factorial DOE plan.</p>
                </div>
              ) : (
                <>
                  {!generatedPlan ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Click the button below to generate the Full Factorial DOE experimental plan based on your factor configuration.
                      </p>
                      <Button
                        onClick={handleGeneratePlan}
                        data-testid="button-generate-plan"
                      >
                        Generate Full Factorial Plan
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{generatedPlan.designType}</h3>
                        <p className="text-sm text-muted-foreground">
                          Total Runs: {runData.length}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" data-testid="badge-replicates">
                            Replicates: {numberOfReplicates}
                          </Badge>
                          <Badge variant="outline" className={randomizeRuns ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800"} data-testid="badge-randomization">
                            Randomization: {randomizeRuns ? "ON" : "OFF"}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" data-testid="badge-center-points">
                            Center Points: {includeCenterPoints ? numberOfCenterPoints : 0}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Toggle for Coded/Uncoded Values */}
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="uncoded-toggle">Coded</Label>
                        <Switch
                          id="uncoded-toggle"
                          checked={showUncoded}
                          onCheckedChange={setShowUncoded}
                          disabled={!allFactorsHaveValidLevels()}
                          data-testid="switch-uncoded-toggle"
                        />
                        <Label htmlFor="uncoded-toggle">Uncoded</Label>
                      </div>
                      
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Std Order</TableHead>
                              <TableHead className="w-[100px]">Run Order</TableHead>
                              {factors.map((factor, index) => (
                                <TableHead key={index} className="w-[150px]">
                                  {factor.name}
                                </TableHead>
                              ))}
                              <TableHead className="w-[150px]">{responseVariableName}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedPlan.plan.map((planRow: any, rowIndex: number) => {
                              const runDataRow = runData.find(r => r.run === planRow.runOrder);
                              return (
                                <TableRow key={rowIndex}>
                                  <TableCell>{planRow.standardOrder}</TableCell>
                                  <TableCell>{planRow.runOrder}</TableCell>
                                  {factors.map((factor, factorIndex) => {
                                    const codedValue = planRow[factor.name] as number;
                                    const decodedValue = decodeValue(codedValue, factor);
                                    
                                    if (factor.type === 'categorical') {
                                      // For categorical: show coded value or actual level based on toggle
                                      const codedDisplay = codedValue === 0 ? '0' : codedValue === 1 ? '+1' : '-1';
                                      return (
                                        <TableCell key={factorIndex}>
                                          {showUncoded ? decodedValue : codedDisplay}
                                        </TableCell>
                                      );
                                    } else {
                                      // For continuous: show coded or uncoded based on toggle
                                      const hasValidLevels = factor.lowValue !== null && !isNaN(factor.lowValue) && 
                                                            factor.highValue !== null && !isNaN(factor.highValue);
                                      const codedDisplay = codedValue === 0 ? '0' : codedValue === 1 ? '+1' : '-1';
                                      const uncodedDisplay = hasValidLevels && typeof decodedValue === 'number' && !isNaN(decodedValue) 
                                        ? `${decodedValue.toFixed(2)}${factor.units ? ' ' + factor.units : ''}` 
                                        : codedDisplay;
                                      
                                      return (
                                        <TableCell key={factorIndex}>
                                          {showUncoded ? uncodedDisplay : codedDisplay}
                                        </TableCell>
                                      );
                                    }
                                  })}
                                  <TableCell>
                                    <Input
                                      type="text"
                                      value={responseInputs[planRow.runOrder] ?? (runDataRow?.response !== null && runDataRow?.response !== undefined ? String(runDataRow.response) : '')}
                                      onChange={(e) => handleResponseChange(rowIndex, e.target.value)}
                                      onBlur={() => handleResponseBlur(rowIndex)}
                                      placeholder="Enter response"
                                      className="w-full"
                                      data-testid={`input-response-${rowIndex}`}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={handleGeneratePlan}
                          data-testid="button-regenerate-plan"
                        >
                          Regenerate Plan
                        </Button>
                        <Button
                          onClick={handleSaveData}
                          disabled={saveConfigMutation.isPending}
                          data-testid="button-save-data"
                        >
                          {saveConfigMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save DOE Data
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Chart Tab */}
        <TabsContent value="chart" className="space-y-4">
          {!generatedPlan || runData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Generate a plan and enter data to view charts</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Toggle for Coded/Uncoded Values */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="chart-uncoded-toggle">Coded</Label>
                <Switch
                  id="chart-uncoded-toggle"
                  checked={showUncoded}
                  onCheckedChange={setShowUncoded}
                  disabled={!allFactorsHaveValidLevels()}
                  data-testid="switch-chart-uncoded-toggle"
                />
                <Label htmlFor="chart-uncoded-toggle">Uncoded</Label>
              </div>

              {(() => {
                // Calculate min/max across ALL data (main effects + interactions)
                const allValues: number[] = [];
                const centerLevels = includeCenterPoints ? [-1, 0, 1] : [-1, 1];
                
                // Collect main effect values
                factors.forEach((factor) => {
                  centerLevels.forEach(level => {
                    const levelResponses = runData
                      .filter((_, idx) => generatedPlan.plan[idx]?.[factor.name] === level && runData[idx].response !== null)
                      .map((rd) => rd.response as number);
                    if (levelResponses.length > 0) {
                      const avg = levelResponses.reduce((a, b) => a + b, 0) / levelResponses.length;
                      allValues.push(avg);
                    }
                  });
                });
                
                // Collect interaction values
                factors.slice(0, -1).forEach((factorA) => {
                  factors.slice(factors.indexOf(factorA) + 1).forEach((factorB) => {
                    [-1, 1].forEach(levelA => {
                      centerLevels.forEach(levelB => {
                        const matches = runData.filter((_, idx) => {
                          const row = generatedPlan.plan[idx];
                          return row?.[factorA.name] === levelA && row?.[factorB.name] === levelB;
                        });
                        const responses = matches
                          .map(m => m.response)
                          .filter((r: any) => r !== null) as number[];
                        if (responses.length > 0) {
                          const avg = responses.reduce((a, b) => a + b, 0) / responses.length;
                          allValues.push(avg);
                        }
                      });
                    });
                  });
                });
                
                const yMin = allValues.length > 0 ? Math.min(...allValues) : 0;
                const yMax = allValues.length > 0 ? Math.max(...allValues) : 100;
                const range = yMax - yMin;
                const padding = range > 0 ? range * 0.1 : 10;
                const yAxisRangeMin = yMin - padding;
                const yAxisRangeMax = yMax + padding;

                return (
                  <>
                    {/* Main Effect Plots */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                      {factors.map((factor, factorIndex) => {
                    const factorData = runData.map((rd, idx) => ({
                      ...rd,
                      [factor.name]: generatedPlan.plan[idx]?.[factor.name] || 0,
                    }));
                    
                    const lineLevels = [-1, 1];
                    const lineData = lineLevels.map(level => {
                      const levelResponses = factorData
                        .filter((d: any) => d[factor.name] === level && d.response !== null)
                        .map((d: any) => d.response);
                      return levelResponses.length > 0 
                        ? levelResponses.reduce((a: number, b: number) => a + b, 0) / levelResponses.length 
                        : 0;
                    });

                    const lineLevelLabels = showUncoded && allFactorsHaveValidLevels()
                      ? lineLevels.map(level => {
                          const decoded = decodeValue(level, factor);
                          return factor.type === 'continuous'
                            ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                            : String(decoded);
                        })
                      : ['Low (-1)', 'High (+1)'];

                    const xTickVals = includeCenterPoints ? [-1, 0, 1] : [-1, 1];
                    const xTickText = includeCenterPoints
                      ? [lineLevelLabels[0], showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(0, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'Center (0)', lineLevelLabels[1]]
                      : lineLevelLabels;

                    const plotData = [
                      {
                        x: lineLevels,
                        y: lineData,
                        type: 'scatter',
                        mode: 'lines+markers',
                        line: { width: 3, color: '#3b82f6' },
                        marker: { size: 10, color: '#3b82f6' },
                        hovertemplate: '%{text}<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                        text: lineLevelLabels,
                      },
                    ];

                    // Add center point if included
                    if (includeCenterPoints) {
                      const centerResponses = factorData
                        .filter((d: any) => d[factor.name] === 0 && d.response !== null)
                        .map((d: any) => d.response);
                      const centerValue = centerResponses.length > 0 
                        ? centerResponses.reduce((a: number, b: number) => a + b, 0) / centerResponses.length 
                        : 0;

                      const centerLabel = showUncoded && allFactorsHaveValidLevels()
                        ? (() => {
                            const decoded = decodeValue(0, factor);
                            return factor.type === 'continuous'
                              ? `Center point: ${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                              : String(decoded);
                          })()
                        : 'Center (0)';

                      plotData.push({
                        x: [0],
                        y: [centerValue],
                        type: 'scatter',
                        mode: 'markers',
                        marker: { size: 10, color: '#ef4444' },
                        showlegend: false,
                        hovertemplate: centerLabel + '<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                      } as any);
                    }

                    return (
                      <Card key={factorIndex}>
                        <CardHeader>
                          <CardTitle>Main Effect Plot: {factor.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Plot
                            data={plotData as any}
                            layout={{
                              title: { text: `<b>Main Effect: ${factor.name}</b>` },
                              xaxis: { title: { text: 'Factor Level' }, type: 'linear', tickmode: 'array', tickvals: xTickVals, ticktext: xTickText },
                              yaxis: { title: { text: responseVariableName || 'Y Response' }, range: [yAxisRangeMin, yAxisRangeMax] },
                              showlegend: false,
                              hovermode: 'closest',
                              margin: { l: 60, r: 40, t: 60, b: 60 },
                            }}
                            config={{
                              responsive: true,
                              displayModeBar: true,
                              displaylogo: false,
                              toImageButtonOptions: {
                                format: 'png',
                                filename: `DOE_Main_Effect_${factor.name}`,
                                height: 400,
                                width: 600,
                                scale: 1
                              }
                            }}
                            className="w-full"
                            style={{ height: '400px' }}
                          />
                        </CardContent>
                      </Card>
                      );
                      })}
                    </div>

                    {/* Interaction Plots */}
                    {factors.length >= 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Interaction Plots</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {factors.slice(0, -1).map((factorA, idxA) =>
                        factors.slice(idxA + 1).map((factorB, idxB) => {
                          const interactionTraces: any[] = [];

                          // Add line traces for -1 and +1 levels of factorB
                          [-1, 1].forEach(levelA => {
                            const lineData = [-1, 1].map(levelB => {
                              const matches = runData.filter((_, idx) => {
                                const row = generatedPlan.plan[idx];
                                return row?.[factorA.name] === levelA && row?.[factorB.name] === levelB;
                              });
                              const responses = matches
                                .map(m => m.response)
                                .filter((r: any) => r !== null) as number[];
                              return responses.length > 0 
                                ? (responses.reduce((a: number, b: number) => a + b, 0) / responses.length)
                                : 0;
                            });

                            const levelALabel = showUncoded && allFactorsHaveValidLevels()
                              ? (() => {
                                  const decoded = decodeValue(levelA, factorA);
                                  return factorA.type === 'continuous'
                                    ? `${(decoded as number).toFixed(2)}${factorA.units ? ' ' + factorA.units : ''}`
                                    : String(decoded);
                                })()
                              : (levelA === -1 ? 'Low' : 'High');

                            const lineLevelLabels = showUncoded && allFactorsHaveValidLevels()
                              ? [-1, 1].map(level => {
                                  const decoded = decodeValue(level, factorB);
                                  return factorB.type === 'continuous'
                                    ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                    : String(decoded);
                                })
                              : ['Low (-1)', 'High (+1)'];

                            interactionTraces.push({
                              x: [-1, 1],
                              y: lineData,
                              type: 'scatter',
                              mode: 'lines+markers',
                              name: `${factorA.name} = ${levelALabel}`,
                              line: { width: 2 },
                              marker: { size: 8 },
                              hovertemplate: '%{text}<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                              text: lineLevelLabels,
                            });
                          });

                          // Add center point markers if included
                          if (includeCenterPoints) {
                            // Determine center point levels based on factor types
                            const otherFactors = factors.filter((f, idx) => idx !== factors.indexOf(factorA) && idx !== factors.indexOf(factorB));
                            const categoricalOthers = otherFactors.filter(f => f.type === 'categorical');
                            
                            // Generate all center point combinations
                            const centerPointCombinations: Array<{levels: Record<string, number>, labels: Record<string, string>}> = [];
                            
                            if (categoricalOthers.length === 0) {
                              // All other factors are continuous (or no other factors): 1 center point at all 0s
                              const levels: Record<string, number> = {};
                              const labels: Record<string, string> = {};
                              otherFactors.forEach(f => {
                                levels[f.name] = 0;
                                labels[f.name] = showUncoded && allFactorsHaveValidLevels()
                                  ? (() => {
                                      const decoded = decodeValue(0, f);
                                      return f.type === 'continuous' ? `Center point: ${(decoded as number).toFixed(2)}${f.units ? ' ' + f.units : ''}` : String(decoded);
                                    })()
                                  : 'Center (0)';
                              });
                              centerPointCombinations.push({ levels, labels });
                            } else if (categoricalOthers.length === 1) {
                              // One categorical factor: 2 center points (-1 and +1 for categorical, 0 for continuous)
                              const catFactor = categoricalOthers[0];
                              [-1, 1].forEach(catLevel => {
                                const levels: Record<string, number> = {};
                                const labels: Record<string, string> = {};
                                otherFactors.forEach(f => {
                                  if (f.name === catFactor.name) {
                                    levels[f.name] = catLevel;
                                    labels[f.name] = showUncoded && allFactorsHaveValidLevels()
                                      ? (() => {
                                          const decoded = decodeValue(catLevel, f);
                                          return String(decoded);
                                        })()
                                      : (catLevel === -1 ? 'Low (-1)' : 'High (+1)');
                                  } else {
                                    levels[f.name] = 0;
                                    labels[f.name] = showUncoded && allFactorsHaveValidLevels()
                                      ? (() => {
                                          const decoded = decodeValue(0, f);
                                          return f.type === 'continuous' ? `${(decoded as number).toFixed(2)}${f.units ? ' ' + f.units : ''}` : String(decoded);
                                        })()
                                      : 'Center (0)';
                                  }
                                });
                                centerPointCombinations.push({ levels, labels });
                              });
                            } else if (categoricalOthers.length > 1) {
                              // All categorical: 2^k combinations
                              const generateCombinations = (cats: typeof categoricalOthers, idx: number, current: Record<string, number>, currentLabels: Record<string, string>): void => {
                                if (idx === cats.length) {
                                  centerPointCombinations.push({ levels: { ...current }, labels: { ...currentLabels } });
                                  return;
                                }
                                const cat = cats[idx];
                                [-1, 1].forEach(level => {
                                  current[cat.name] = level;
                                  currentLabels[cat.name] = level === -1 ? 'Low (-1)' : 'High (+1)';
                                  generateCombinations(cats, idx + 1, current, currentLabels);
                                });
                              };
                              generateCombinations(categoricalOthers, 0, {}, {});
                            }
                            
                            // Add center point markers for each combination
                            centerPointCombinations.forEach((combo, comboIdx) => {
                              // For interaction plot, we need to determine xPos (factorB level) - keep at 0 (center)
                              const filterCondition: Record<string, number> = {
                                [factorA.name]: 0, // all center points at factorA = 0
                                [factorB.name]: 0, // all center points at factorB = 0
                                ...combo.levels
                              };
                              
                              const centerValue = (() => {
                                const matches = runData.filter((_, idx) => {
                                  const row = generatedPlan.plan[idx];
                                  return Object.entries(filterCondition).every(([fname, level]) => Math.abs(row?.[fname] - level) < 0.01);
                                });
                                const responses = matches
                                  .map(m => m.response)
                                  .filter((r: any) => r !== null) as number[];
                                return responses.length > 0 
                                  ? (responses.reduce((a: number, b: number) => a + b, 0) / responses.length)
                                  : 0;
                              })();
                              
                              const centerLabel = `Center point: ${Object.entries(combo.labels).map(([f, l]) => `${f}=${l}`).join(', ')}`;
                              
                              // Decode center point X coordinate (factorB at level 0)
                              const decodedXValue = (() => {
                                if (showUncoded && allFactorsHaveValidLevels()) {
                                  const decoded = decodeValue(0, factorB);
                                  return factorB.type === 'continuous'
                                    ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                    : String(decoded);
                                }
                                return 'Center (0)';
                              })();
                              
                              interactionTraces.push({
                                x: [0],
                                y: [centerValue],
                                type: 'scatter',
                                mode: 'markers',
                                name: centerLabel,
                                marker: { size: 8, color: '#ef4444' },
                                showlegend: true,
                                hovertemplate: centerLabel + '<br>' + factorB.name + ': ' + decodedXValue + '<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                              });
                            });
                          }

                        return (
                          <Card key={`${idxA}-${idxB}`}>
                            <CardHeader>
                              <CardTitle>Interaction: {factorA.name} × {factorB.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Plot
                                data={interactionTraces}
                                layout={{
                                  title: { text: `<b>${factorA.name} × ${factorB.name}</b>` },
                                  xaxis: { 
                                    title: { text: factorB.name }, 
                                    type: 'linear', 
                                    tickmode: 'array', 
                                    tickvals: includeCenterPoints ? [-1, 0, 1] : [-1, 1],
                                    ticktext: includeCenterPoints
                                      ? [showUncoded && allFactorsHaveValidLevels()
                                          ? (() => {
                                              const decoded = decodeValue(-1, factorB);
                                              return factorB.type === 'continuous'
                                                ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                                : String(decoded);
                                            })()
                                          : 'Low (-1)',
                                        showUncoded && allFactorsHaveValidLevels()
                                          ? (() => {
                                              const decoded = decodeValue(0, factorB);
                                              return factorB.type === 'continuous'
                                                ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                                : String(decoded);
                                            })()
                                          : 'Center (0)',
                                        showUncoded && allFactorsHaveValidLevels()
                                          ? (() => {
                                              const decoded = decodeValue(1, factorB);
                                              return factorB.type === 'continuous'
                                                ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                                : String(decoded);
                                            })()
                                          : 'High (+1)']
                                      : [showUncoded && allFactorsHaveValidLevels()
                                          ? (() => {
                                              const decoded = decodeValue(-1, factorB);
                                              return factorB.type === 'continuous'
                                                ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                                : String(decoded);
                                            })()
                                          : 'Low (-1)',
                                        showUncoded && allFactorsHaveValidLevels()
                                          ? (() => {
                                              const decoded = decodeValue(1, factorB);
                                              return factorB.type === 'continuous'
                                                ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                                : String(decoded);
                                            })()
                                          : 'High (+1)']
                                  },
                                  yaxis: { title: { text: responseVariableName || 'Y Response' }, range: [yAxisRangeMin, yAxisRangeMax] },
                                    showlegend: true,
                                    legend: { title: { text: factorA.name } },
                                    hovermode: 'closest',
                                    margin: { l: 60, r: 160, t: 60, b: 60 },
                                  }}
                                  config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    displaylogo: false,
                                    toImageButtonOptions: {
                                      format: 'png',
                                      filename: `DOE_Interaction_${factorA.name}_x_${factorB.name}`,
                                      height: 400,
                                      width: 650,
                                      scale: 1
                                    }
                                  }}
                                  className="w-full"
                                  style={{ height: '400px' }}
                                />
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                    </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
        
        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {!generatedPlan || runData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Generate a plan and enter data to view analysis</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Toggle for Coded/Uncoded Analysis */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="analysis-uncoded-toggle">Coded</Label>
                <Switch
                  id="analysis-uncoded-toggle"
                  checked={showUncoded}
                  onCheckedChange={setShowUncoded}
                  disabled={!allFactorsHaveValidLevels()}
                  data-testid="switch-analysis-uncoded-toggle"
                />
                <Label htmlFor="analysis-uncoded-toggle">Uncoded</Label>
              </div>

              {/* ANOVA Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    ANOVA Analysis
                    {Object.values(selectedFactorsForModel).some(v => v === false) && (
                      <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                    )}
                  </CardTitle>
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
                          <TableHead className="text-right">F-Ratio</TableHead>
                          <TableHead className="text-right">P-Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const responses = runData
                            .map(r => r.response)
                            .filter((r): r is number => r !== null && !isNaN(r));
                          
                          if (responses.length === 0) {
                            return <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No valid data</TableCell></TableRow>;
                          }

                          // Build design matrix with factors and interactions
                          const interactionPairs: Array<{i: number, j: number, name: string}> = [];
                          for (let i = 0; i < factors.length; i++) {
                            for (let j = i + 1; j < factors.length; j++) {
                              interactionPairs.push({i, j, name: `${factors[i].name}×${factors[j].name}`});
                            }
                          }

                          const X: number[][] = [];
                          const y: number[] = [];
                          const termIndices: Array<{type: string, idx: number, name: string, i?: number, j?: number}> = [];
                          
                          // Build term indices
                          termIndices.push({type: 'intercept', idx: 0, name: 'Intercept'});
                          factors.forEach((f, i) => termIndices.push({type: 'factor', idx: termIndices.length, name: f.name, i}));
                          interactionPairs.forEach((p, i) => termIndices.push({type: 'interaction', idx: termIndices.length, name: p.name, i: p.i, j: p.j}));

                          runData.forEach((row, rowIdx) => {
                            if (row.response !== null && !isNaN(row.response)) {
                              const row_vals = [1]; // intercept
                              const factorValues: number[] = [];
                              factors.forEach(factor => {
                                const val = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                factorValues.push(val);
                                row_vals.push(val);
                              });
                              interactionPairs.forEach(pair => {
                                row_vals.push(factorValues[pair.i] * factorValues[pair.j]);
                              });
                              X.push(row_vals);
                              y.push(row.response);
                            }
                          });

                          const n = y.length;
                          const p = X[0].length;
                          const grandMean = y.reduce((a, b) => a + b, 0) / n;
                          const totalSS = y.reduce((sum, val) => sum + Math.pow(val - grandMean, 2), 0);
                          const totalDF = n - 1;

                          // Calculate regression using Gaussian elimination
                          let XtX: number[][] = Array(p).fill(null).map(() => Array(p).fill(0));
                          let Xty: number[] = Array(p).fill(0);

                          for (let i = 0; i < n; i++) {
                            for (let j = 0; j < p; j++) {
                              Xty[j] += X[i][j] * y[i];
                              for (let k = 0; k < p; k++) {
                                XtX[j][k] += X[i][j] * X[i][k];
                              }
                            }
                          }

                          // Gaussian elimination
                          const solveNormalEquations = (A: number[][], b: number[]): number[] => {
                            const n = A.length;
                            const aug = A.map((row, i) => [...row, b[i]]);
                            
                            for (let i = 0; i < n; i++) {
                              let maxRow = i;
                              for (let k = i + 1; k < n; k++) {
                                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                              }
                              [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                              
                              for (let k = i + 1; k < n; k++) {
                                const factor = aug[k][i] / aug[i][i];
                                for (let j = i; j <= n; j++) {
                                  aug[k][j] -= factor * aug[i][j];
                                }
                              }
                            }
                            
                            const x: number[] = Array(n).fill(0);
                            for (let i = n - 1; i >= 0; i--) {
                              x[i] = aug[i][n];
                              for (let j = i + 1; j < n; j++) {
                                x[i] -= aug[i][j] * x[j];
                              }
                              x[i] /= aug[i][i];
                            }
                            return x;
                          };

                          let beta: number[] = [];
                          try {
                            beta = solveNormalEquations(XtX, Xty);
                          } catch {
                            beta = Xty.map(v => v / (XtX[0][0] || 1));
                          }

                          // Calculate predictions and model SS
                          const predictions = X.map(row => row.reduce((sum, val, i) => sum + val * beta[i], 0));
                          const residuals = y.map((val, i) => val - predictions[i]);
                          const modelSS = predictions.reduce((sum, pred) => sum + Math.pow(pred - grandMean, 2), 0);
                          const residualSS = residuals.reduce((sum, res) => sum + Math.pow(res, 2), 0);

                          let rows: React.ReactNode[] = [];
                          
                          // Build reduced design matrix with only selected terms
                          const selectedColumns: number[] = [0]; // Always include intercept
                          factors.forEach((_, idx) => {
                            if (selectedFactorsForModel[idx] !== false) {
                              selectedColumns.push(idx + 1);
                            }
                          });
                          interactionPairs.forEach((_, pairIdx) => {
                            if (selectedFactorsForModel[`int-${pairIdx}`] !== false) {
                              selectedColumns.push(factors.length + 1 + pairIdx);
                            }
                          });
                          
                          // Build reduced X matrix
                          const X_reduced = X.map(row => selectedColumns.map(col => row[col]));
                          const p_reduced = X_reduced[0].length;
                          
                          // Calculate X'X and X'y for reduced model
                          let XtX_red: number[][] = Array(p_reduced).fill(null).map(() => Array(p_reduced).fill(0));
                          let Xty_red: number[] = Array(p_reduced).fill(0);
                          
                          for (let i = 0; i < n; i++) {
                            for (let j = 0; j < p_reduced; j++) {
                              Xty_red[j] += X_reduced[i][j] * y[i];
                              for (let k = 0; k < p_reduced; k++) {
                                XtX_red[j][k] += X_reduced[i][j] * X_reduced[i][k];
                              }
                            }
                          }
                          
                          // Solve reduced model
                          let beta_red: number[] = [];
                          try {
                            beta_red = solveNormalEquations(XtX_red, Xty_red);
                          } catch {
                            beta_red = Xty_red.map(v => v / (XtX_red[0][0] || 1));
                          }
                          
                          // Calculate predictions and residuals for reduced model
                          const predictions_red = X_reduced.map(row => row.reduce((sum, val, i) => sum + val * beta_red[i], 0));
                          const residuals_red = y.map((val, i) => val - predictions_red[i]);
                          const residualSS_red = residuals_red.reduce((sum, res) => sum + Math.pow(res, 2), 0);
                          const errorDF_red = n - p_reduced;
                          
                          // Add factor rows (only if selected)
                          factors.forEach((factor, idx) => {
                            if (selectedFactorsForModel[idx] === false) return;
                            
                            const colIdx = selectedColumns.indexOf(idx + 1);
                            if (colIdx === -1) return;
                            
                            const termSS = Math.pow(beta_red[colIdx], 2) * XtX_red[colIdx][colIdx];
                            const termDF = 1;
                            const termMS = termSS / termDF;
                            const errorMS = residualSS_red / errorDF_red;
                            const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                            const pValue = fRatio > 0 && errorDF_red > 0 
                              ? 1 - jStat.centralF.cdf(fRatio, termDF, errorDF_red) 
                              : 1;

                            const factorLabel = showUncoded && allFactorsHaveValidLevels()
                              ? `${factor.name}${factor.type === 'continuous' && factor.units ? ` (${factor.units})` : ''}`
                              : factor.name;

                            rows.push(
                              <TableRow key={`factor-${idx}`}>
                                <TableCell className="font-medium">{factorLabel}</TableCell>
                                <TableCell className="text-right">{termDF}</TableCell>
                                <TableCell className="text-right">{termSS.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{termMS.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{fRatio.toFixed(4)}</TableCell>
                                <TableCell className="text-right">
                                  <span className={pValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                    {pValue.toFixed(4)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          });

                          // Add interaction rows (only if selected)
                          interactionPairs.forEach((pair, pairIdx) => {
                            if (selectedFactorsForModel[`int-${pairIdx}`] === false) return;
                            
                            const colIdx = selectedColumns.indexOf(factors.length + 1 + pairIdx);
                            if (colIdx === -1) return;
                            
                            const termSS = Math.pow(beta_red[colIdx], 2) * XtX_red[colIdx][colIdx];
                            const termDF = 1;
                            const termMS = termSS / termDF;
                            const errorMS = residualSS_red / errorDF_red;
                            const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                            const pValue = fRatio > 0 && errorDF_red > 0 
                              ? 1 - jStat.centralF.cdf(fRatio, termDF, errorDF_red) 
                              : 1;

                            rows.push(
                              <TableRow key={`interaction-${pairIdx}`}>
                                <TableCell className="font-medium">{pair.name}</TableCell>
                                <TableCell className="text-right">{termDF}</TableCell>
                                <TableCell className="text-right">{termSS.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{termMS.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{fRatio.toFixed(4)}</TableCell>
                                <TableCell className="text-right">
                                  <span className={pValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                    {pValue.toFixed(4)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          });

                          // Calculate curvature if center points exist AND are included in model
                          let curvatureSS = 0;
                          let curvatureDF = 0;
                          let curvatureMS = 0;
                          let curvatureFRatio = 0;
                          let curvaturePValue = 1;
                          let curveEffect = 0;
                          
                          if (includeCenterPoints && selectedFactorsForModel['centerPoint'] !== false) {
                            // Separate center points from factorial points
                            const centerPointIndices: number[] = [];
                            const factorialPointIndices: number[] = [];
                            
                            runData.forEach((row, rowIdx) => {
                              if (row.response !== null && !isNaN(row.response)) {
                                const allFactorsZero = factors.every(factor => {
                                  const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                  return Math.abs(level) < 0.01; // essentially 0
                                });
                                if (allFactorsZero) {
                                  centerPointIndices.push(rowIdx);
                                } else {
                                  factorialPointIndices.push(rowIdx);
                                }
                              }
                            });

                            const n_c = centerPointIndices.length;
                            const n_f = factorialPointIndices.length;
                            
                            if (n_c > 0 && n_f > 0) {
                              // Average response at center points
                              const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                              const y_c_avg = centerResponses.length > 0 ? centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length : 0;
                              
                              // Predicted response at center from factorial model (= intercept in coded)
                              const y_f_at_center = beta[0];
                              
                              // Curvature effect
                              curveEffect = y_c_avg - y_f_at_center;
                              
                              // Curvature SS = (n_f * n_c) / (n_f + n_c) * (curvature_effect)^2
                              curvatureSS = (n_f * n_c) / (n_f + n_c) * Math.pow(curveEffect, 2);
                              curvatureDF = 1;
                              curvatureMS = curvatureSS / curvatureDF;
                              const errorMS = residualSS / (n - p);
                              curvatureFRatio = errorMS > 0 ? curvatureMS / errorMS : 0;
                              curvaturePValue = curvatureFRatio > 0 && (n - p) > 0
                                ? 1 - jStat.centralF.cdf(curvatureFRatio, curvatureDF, n - p)
                                : 1;

                              rows.push(
                                <TableRow key="curvature">
                                  <TableCell className="font-medium">Curvature</TableCell>
                                  <TableCell className="text-right">{curvatureDF}</TableCell>
                                  <TableCell className="text-right">{curvatureSS.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{curvatureMS.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{curvatureFRatio.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={curvaturePValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                      {curvaturePValue.toFixed(4)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          }

                          // Adjust error SS and DF to account for curvature if center points exist
                          let adjustedErrorSS = residualSS_red;
                          let adjustedErrorDF = errorDF_red;
                          
                          if (includeCenterPoints && curvatureDF > 0) {
                            // When curvature is calculated, subtract it from error
                            adjustedErrorSS = Math.max(0, residualSS_red - curvatureSS);
                            adjustedErrorDF = errorDF_red - curvatureDF;
                          }
                          
                          const errorMS = adjustedErrorDF > 0 ? adjustedErrorSS / adjustedErrorDF : 0;

                          rows.push(
                            <TableRow key="error">
                              <TableCell className="font-medium">Error</TableCell>
                              <TableCell className="text-right">{adjustedErrorDF}</TableCell>
                              <TableCell className="text-right">{adjustedErrorSS.toFixed(4)}</TableCell>
                              <TableCell className="text-right">{errorMS.toFixed(4)}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                          );

                          rows.push(
                            <TableRow key="total">
                              <TableCell className="font-medium">Total</TableCell>
                              <TableCell className="text-right">{totalDF}</TableCell>
                              <TableCell className="text-right">{totalSS.toFixed(4)}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                          );

                          return rows;
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {(() => {
                // Regression Analysis with Interactions
                const responses = runData
                  .map(r => r.response)
                  .filter((r): r is number => r !== null && !isNaN(r));
                
                if (responses.length < 2) {
                  return (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <p>Insufficient data for regression analysis</p>
                      </CardContent>
                    </Card>
                  );
                }

                // Build interaction terms
                const interactionPairs: Array<{i: number, j: number, name: string}> = [];
                for (let i = 0; i < factors.length; i++) {
                  for (let j = i + 1; j < factors.length; j++) {
                    interactionPairs.push({i, j, name: `${factors[i].name}×${factors[j].name}`});
                  }
                }

                const X: number[][] = [];
                const y: number[] = [];
                
                runData.forEach((row, idx) => {
                  if (row.response !== null && !isNaN(row.response)) {
                    const row_vals = [1]; // intercept
                    const factorValues: number[] = [];
                    factors.forEach(factor => {
                      const val = generatedPlan.plan[idx]?.[factor.name] ?? 0;
                      factorValues.push(val);
                      row_vals.push(val);
                    });
                    // Add interaction terms
                    interactionPairs.forEach(pair => {
                      row_vals.push(factorValues[pair.i] * factorValues[pair.j]);
                    });
                    X.push(row_vals);
                    y.push(row.response);
                  }
                });

                const n = y.length;
                const p = X[0].length;
                const mean_y = y.reduce((a, b) => a + b, 0) / n;
                const SS_tot = y.reduce((sum, val) => sum + Math.pow(val - mean_y, 2), 0);

                // Calculate X'X and X'y
                let XtX: number[][] = Array(p).fill(null).map(() => Array(p).fill(0));
                let Xty: number[] = Array(p).fill(0);

                for (let i = 0; i < n; i++) {
                  for (let j = 0; j < p; j++) {
                    Xty[j] += X[i][j] * y[i];
                    for (let k = 0; k < p; k++) {
                      XtX[j][k] += X[i][j] * X[i][k];
                    }
                  }
                }

                // Gaussian elimination for solving normal equations
                const solveNormalEquations = (A: number[][], b: number[]): number[] => {
                  const n = A.length;
                  const aug = A.map((row, i) => [...row, b[i]]);
                  
                  for (let i = 0; i < n; i++) {
                    let maxRow = i;
                    for (let k = i + 1; k < n; k++) {
                      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                    }
                    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                    
                    for (let k = i + 1; k < n; k++) {
                      const factor = aug[k][i] / aug[i][i];
                      for (let j = i; j <= n; j++) {
                        aug[k][j] -= factor * aug[i][j];
                      }
                    }
                  }
                  
                  const x: number[] = Array(n).fill(0);
                  for (let i = n - 1; i >= 0; i--) {
                    x[i] = aug[i][n];
                    for (let j = i + 1; j < n; j++) {
                      x[i] -= aug[i][j] * x[j];
                    }
                    x[i] /= aug[i][i];
                  }
                  return x;
                };

                let beta: number[] = [];
                if (Math.abs(XtX[0][0]) > 1e-10) {
                  try {
                    beta = solveNormalEquations(XtX, Xty);
                  } catch (e) {
                    beta = Xty.map(v => v / (XtX[0][0] || 1));
                  }
                } else {
                  beta = Xty.map(v => v / (XtX[0][0] || 1));
                }

                const predictions = X.map(row => row.reduce((sum, val, i) => sum + val * beta[i], 0));
                const residuals = y.map((val, i) => val - predictions[i]);
                const SS_res = residuals.reduce((sum, val) => sum + Math.pow(val, 2), 0);
                const R_sq = 1 - SS_res / SS_tot;
                const adj_R_sq = 1 - (1 - R_sq) * (n - 1) / (n - p);
                const rmse = Math.sqrt(SS_res / (n - p));
                const residualMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
                const residualStd = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / (residuals.length - 1));
                const mse = SS_res / (n - p);
                
                // Calculate center point coefficient if center points exist
                const getCenterPointCoeff = (interceptValue: number): number => {
                  if (!includeCenterPoints) return 0;
                  
                  const centerPointIndices: number[] = [];
                  const factorialPointIndices: number[] = [];
                  
                  runData.forEach((row, rowIdx) => {
                    if (row.response !== null && !isNaN(row.response)) {
                      const allFactorsZero = factors.every(factor => {
                        const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                        return Math.abs(level) < 0.01; // essentially 0
                      });
                      if (allFactorsZero) {
                        centerPointIndices.push(rowIdx);
                      } else {
                        factorialPointIndices.push(rowIdx);
                      }
                    }
                  });
                  
                  const n_c = centerPointIndices.length;
                  const n_f = factorialPointIndices.length;
                  
                  if (n_c > 0 && n_f > 0) {
                    const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                    const y_c_avg = centerResponses.length > 0 ? centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length : 0;
                    return y_c_avg - interceptValue;
                  }
                  return 0;
                };
                
                const centerPointCoeff = getCenterPointCoeff(beta[0]);
                
                // Function to recalculate regression with selected terms only
                const calculateReducedModel = () => {
                  // Determine which columns to include (always include intercept and center point)
                  const isIncluded = (type: string, idx: number): boolean => {
                    if (type === 'intercept') return true;
                    if (type === 'factor') return selectedFactorsForModel[idx] !== false;
                    if (type === 'interaction') return selectedFactorsForModel[`int-${idx}`] !== false;
                    if (type === 'centerPoint') return selectedFactorsForModel['centerPoint'] !== false;
                    return true;
                  };
                  
                  // Determine which rows to include (exclude center points if not selected)
                  const shouldExcludeCenterPoints = selectedFactorsForModel['centerPoint'] === false;
                  const centerPointIndices: number[] = [];
                  
                  if (shouldExcludeCenterPoints && includeCenterPoints) {
                    runData.forEach((row, rowIdx) => {
                      if (row.response !== null && !isNaN(row.response)) {
                        const allFactorsZero = factors.every(factor => {
                          const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                          return Math.abs(level) < 0.01; // essentially 0
                        });
                        if (allFactorsZero) {
                          centerPointIndices.push(rowIdx);
                        }
                      }
                    });
                  }
                  
                  // Build reduced X matrix with selected columns and rows
                  const colMap: number[] = []; // Maps reduced column idx to original column idx
                  const X_reduced: number[][] = [];
                  const y_reduced: number[] = [];
                  
                  // Always include intercept
                  colMap.push(0);
                  
                  // Add factor columns
                  for (let i = 0; i < factors.length; i++) {
                    if (isIncluded('factor', i)) {
                      colMap.push(i + 1);
                    }
                  }
                  
                  // Add interaction columns
                  for (let i = 0; i < interactionPairs.length; i++) {
                    if (isIncluded('interaction', i)) {
                      colMap.push(factors.length + 1 + i);
                    }
                  }
                  
                  // Build reduced X from selected columns and rows
                  for (let row = 0; row < X.length; row++) {
                    // Skip center points if they're excluded
                    if (shouldExcludeCenterPoints && centerPointIndices.includes(row)) {
                      continue;
                    }
                    
                    const reducedRow: number[] = [];
                    for (const col of colMap) {
                      reducedRow.push(X[row][col]);
                    }
                    X_reduced.push(reducedRow);
                    y_reduced.push(y[row]);
                  }
                  
                  const n_reduced = y_reduced.length;
                  const p_reduced = X_reduced[0].length;
                  
                  // Calculate total sum of squares for reduced data
                  const mean_y_reduced = y_reduced.reduce((a, b) => a + b, 0) / n_reduced;
                  const SS_tot_reduced = y_reduced.reduce((sum, val) => sum + Math.pow(val - mean_y_reduced, 2), 0);
                  
                  // Calculate X'X and X'y for reduced model
                  let XtX_red: number[][] = Array(p_reduced).fill(null).map(() => Array(p_reduced).fill(0));
                  let Xty_red: number[] = Array(p_reduced).fill(0);
                  
                  for (let i = 0; i < n_reduced; i++) {
                    for (let j = 0; j < p_reduced; j++) {
                      Xty_red[j] += X_reduced[i][j] * y_reduced[i];
                      for (let k = 0; k < p_reduced; k++) {
                        XtX_red[j][k] += X_reduced[i][j] * X_reduced[i][k];
                      }
                    }
                  }
                  
                  // Solve reduced model
                  let beta_red: number[] = [];
                  if (Math.abs(XtX_red[0][0]) > 1e-10) {
                    try {
                      beta_red = solveNormalEquations(XtX_red, Xty_red);
                    } catch (e) {
                      beta_red = Xty_red.map(v => v / (XtX_red[0][0] || 1));
                    }
                  } else {
                    beta_red = Xty_red.map(v => v / (XtX_red[0][0] || 1));
                  }
                  
                  // Calculate predictions, residuals, and statistics for reduced model
                  const predictions_red = X_reduced.map(row => row.reduce((sum, val, i) => sum + val * beta_red[i], 0));
                  const residuals_red = y_reduced.map((val, i) => val - predictions_red[i]);
                  const SS_res_red = residuals_red.reduce((sum, val) => sum + Math.pow(val, 2), 0);
                  const mse_red = SS_res_red / Math.max(1, n_reduced - p_reduced);
                  
                  // Calculate coefficient stats for reduced model
                  const coeffStats_red = beta_red.map((b, idx) => {
                    let xxtInvDiag = 0;
                    if (idx === 0) {
                      xxtInvDiag = 1 / XtX_red[0][0];
                    } else {
                      const denom = XtX_red[idx][idx] - (idx > 0 ? XtX_red[idx].slice(0, idx).reduce((sum, v, i) => sum + v * v / (XtX_red[i][i] || 1), 0) : 0);
                      xxtInvDiag = Math.abs(denom) > 1e-10 ? 1 / denom : 1 / XtX_red[idx][idx];
                    }
                    const stdError = Math.sqrt(mse_red * Math.max(0, xxtInvDiag));
                    const tValue = stdError > 0 ? b / stdError : 0;
                    const pValue = stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(tValue), n_reduced - p_reduced)) : 1;
                    return { stdError, tValue, pValue };
                  });
                  
                  return {
                    beta: beta_red,
                    coeffStats: coeffStats_red,
                    colMap,
                    XtX: XtX_red,
                    predictions: predictions_red,
                    residuals: residuals_red,
                    SS_res: SS_res_red,
                    SS_tot: SS_tot_reduced,
                    mse: mse_red,
                    p: p_reduced,
                    n: n_reduced
                  };
                };
                
                const reducedModel = calculateReducedModel();
                
                // Calculate goodness of fit metrics for reduced model
                const R_sq_red = 1 - reducedModel.SS_res / reducedModel.SS_tot;
                const adj_R_sq_red = 1 - (1 - R_sq_red) * (reducedModel.n - 1) / (reducedModel.n - reducedModel.p);
                const rmse_red = Math.sqrt(reducedModel.SS_res / (reducedModel.n - reducedModel.p));
                
                // Use reduced model stats
                const coeffStats = reducedModel.coeffStats;
                const beta_display = reducedModel.beta;
                const mse_display = reducedModel.mse;
                const colMap = reducedModel.colMap;
                
                // Create mapping: original column idx -> reduced column idx (or -1 if excluded)
                const colMapReverse: Record<number, number> = {};
                colMap.forEach((origCol, reducedIdx) => {
                  colMapReverse[origCol] = reducedIdx;
                });

                // Transform coefficients and standard errors from coded to uncoded if needed
                // Transform the REDUCED model coefficients (what's actually displayed in table)
                const transformCoefficientsAndSE = () => {
                  if (!showUncoded || !allFactorsHaveValidLevels()) {
                    return { displayBeta: beta_display, displayCoeffStats: coeffStats };
                  }
                  
                  const transformed = [...beta_display];
                  const transformedStats = coeffStats.map(s => ({ ...s }));
                  let interceptAdjustment = 0;
                  
                  // For each factor in the original factors list
                  for (let i = 0; i < factors.length; i++) {
                    const factor = factors[i];
                    if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                      const low = parseFloat(String(factor.lowValue));
                      const high = parseFloat(String(factor.highValue));
                      if (!isNaN(low) && !isNaN(high)) {
                        const center = (low + high) / 2;
                        const halfRange = (high - low) / 2;
                        
                        // Check if this factor is in the reduced model
                        const origColIdx = i + 1;
                        const reducedColIdx = colMapReverse[origColIdx];
                        if (reducedColIdx !== undefined && beta_display[reducedColIdx] !== undefined) {
                          // β_uncoded = β_coded / halfRange
                          transformed[reducedColIdx] = beta_display[reducedColIdx] / halfRange;
                          // SE_uncoded = SE_coded / halfRange
                          if (transformedStats[reducedColIdx]) {
                            transformedStats[reducedColIdx].stdError = coeffStats[reducedColIdx].stdError / halfRange;
                            // t-value and p-value are INVARIANT: t = β/SE = (β_coded/hr) / (SE_coded/hr) = β_coded/SE_coded
                            // So we keep them unchanged - no need to recalculate
                          }
                          // Adjust intercept: β0_uncoded = β0_coded - Σ(β_coded * center / halfRange)
                          interceptAdjustment += beta_display[reducedColIdx] * center / halfRange;
                        }
                      }
                    }
                  }
                  
                  // Transform interactions
                  for (let i = 0; i < interactionPairs.length; i++) {
                    const pair = interactionPairs[i];
                    const idx1 = pair.i;
                    const idx2 = pair.j;
                    const factor1 = factors[idx1];
                    const factor2 = factors[idx2];
                    
                    if (factor1.type === 'continuous' && factor2.type === 'continuous' &&
                        factor1.lowValue !== undefined && factor1.highValue !== undefined &&
                        factor2.lowValue !== undefined && factor2.highValue !== undefined) {
                      const low1 = parseFloat(String(factor1.lowValue));
                      const high1 = parseFloat(String(factor1.highValue));
                      const low2 = parseFloat(String(factor2.lowValue));
                      const high2 = parseFloat(String(factor2.highValue));
                      
                      if (!isNaN(low1) && !isNaN(high1) && !isNaN(low2) && !isNaN(high2)) {
                        const halfRange1 = (high1 - low1) / 2;
                        const halfRange2 = (high2 - low2) / 2;
                        const origInteractionIdx = factors.length + 1 + i;
                        const reducedInteractionIdx = colMapReverse[origInteractionIdx];
                        if (reducedInteractionIdx !== undefined && beta_display[reducedInteractionIdx] !== undefined) {
                          transformed[reducedInteractionIdx] = beta_display[reducedInteractionIdx] / (halfRange1 * halfRange2);
                          // SE_uncoded_interaction = SE_coded_interaction / (halfRange1 * halfRange2)
                          if (transformedStats[reducedInteractionIdx]) {
                            transformedStats[reducedInteractionIdx].stdError = coeffStats[reducedInteractionIdx].stdError / (halfRange1 * halfRange2);
                            // t-value and p-value are INVARIANT
                          }
                        }
                      }
                    }
                  }
                  
                  // Transform intercept SE using variance propagation
                  // β₀_uncoded = β₀_coded - Σ(β_coded * center / halfRange)
                  // SE(β₀_uncoded)² = SE(β₀_coded)² + Σ((center / halfRange)² * SE(βᵢ_coded)²)
                  if (transformedStats[0]) {
                    let interceptSESquared = coeffStats[0].stdError ** 2;
                    
                    // Add variance contributions from each factor
                    for (let i = 0; i < factors.length; i++) {
                      const factor = factors[i];
                      if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                        const low = parseFloat(String(factor.lowValue));
                        const high = parseFloat(String(factor.highValue));
                        if (!isNaN(low) && !isNaN(high)) {
                          const center = (low + high) / 2;
                          const halfRange = (high - low) / 2;
                          
                          const origColIdx = i + 1;
                          const reducedColIdx = colMapReverse[origColIdx];
                          if (reducedColIdx !== undefined && coeffStats[reducedColIdx]) {
                            const weight = center / halfRange;
                            interceptSESquared += (weight ** 2) * (coeffStats[reducedColIdx].stdError ** 2);
                          }
                        }
                      }
                    }
                    
                    // Add variance contributions from interactions
                    for (let i = 0; i < interactionPairs.length; i++) {
                      const pair = interactionPairs[i];
                      const idx1 = pair.i;
                      const idx2 = pair.j;
                      const factor1 = factors[idx1];
                      const factor2 = factors[idx2];
                      
                      if (factor1.type === 'continuous' && factor2.type === 'continuous' &&
                          factor1.lowValue !== undefined && factor1.highValue !== undefined &&
                          factor2.lowValue !== undefined && factor2.highValue !== undefined) {
                        const low1 = parseFloat(String(factor1.lowValue));
                        const high1 = parseFloat(String(factor1.highValue));
                        const low2 = parseFloat(String(factor2.lowValue));
                        const high2 = parseFloat(String(factor2.highValue));
                        
                        if (!isNaN(low1) && !isNaN(high1) && !isNaN(low2) && !isNaN(high2)) {
                          const halfRange1 = (high1 - low1) / 2;
                          const halfRange2 = (high2 - low2) / 2;
                          const origInteractionIdx = factors.length + 1 + i;
                          const reducedInteractionIdx = colMapReverse[origInteractionIdx];
                          if (reducedInteractionIdx !== undefined && coeffStats[reducedInteractionIdx]) {
                            // For interactions, the center term is 0 (we don't have interaction centers)
                            // But interactions do affect the intercept through their coefficients
                            // Actually, in a standard DOE, we don't adjust intercept for interactions
                            // So no variance contribution from interactions
                          }
                        }
                      }
                    }
                    
                    transformedStats[0].stdError = Math.sqrt(Math.max(0, interceptSESquared));
                    transformedStats[0].tValue = (beta_display[0] - interceptAdjustment) / transformedStats[0].stdError;
                    // Recalculate p-value for intercept since its t-value changes (SE is recalculated via variance propagation)
                    transformedStats[0].pValue = transformedStats[0].stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(transformedStats[0].tValue), reducedModel.n - reducedModel.p)) : 1;
                  }
                  
                  transformed[0] = beta_display[0] - interceptAdjustment;
                  return { displayBeta: transformed, displayCoeffStats: transformedStats };
                };
                
                const { displayBeta, displayCoeffStats } = transformCoefficientsAndSE();
                
                const handleSolve = () => {
                  // Check if solve factor is included in the model
                  if (selectedFactorsForModel[solveFactorIdx] === false) {
                    setSolverResult(null);
                    return;
                  }
                  
                  // Check if target Y is set (targetYDisplay should be non-empty and targetY should be a valid number)
                  if (targetYDisplay === '' || !Number.isFinite(targetY)) {
                    setSolverResult(null);
                    return;
                  }
                  
                  const origColIdx = solveFactorIdx + 1;
                  const reducedColIdx = colMapReverse[origColIdx];
                  if (reducedColIdx === undefined || displayBeta[reducedColIdx] === 0) return;
                  
                  // Check that ALL non-solve factors have constraint values entered
                  for (let i = 0; i < factors.length; i++) {
                    if (i !== solveFactorIdx && selectedFactorsForModel[i] !== false) {
                      const constraintVal = constraintValues[i];
                      // If constraint value is not set (null or undefined), don't solve
                      if (constraintVal === null || constraintVal === undefined || !Number.isFinite(constraintVal)) {
                        setSolverResult(null);
                        return;
                      }
                    }
                  }
                  
                  // Calculate constraint contribution: sum of (coefficient * constraint_value) for all non-target factors that are included
                  let constraintSum = 0;
                  for (let i = 0; i < factors.length; i++) {
                    if (i !== solveFactorIdx && selectedFactorsForModel[i] !== false) {
                      const constraintVal = constraintValues[i];
                      if (Number.isFinite(constraintVal)) {
                        const origCol = i + 1;
                        const redCol = colMapReverse[origCol];
                        if (redCol !== undefined) {
                          // Use displayBeta (uncoded coefficients)
                          constraintSum += displayBeta[redCol] * constraintVal;
                        }
                      }
                    }
                  }
                  // Solve using UNCODED equation: targetY = β0_uncoded + Σ_{j≠i} βj_uncoded * constraint_j + βi_uncoded * Xi
                  // Therefore: Xi = (targetY - β0_uncoded - constraintSum) / βi_uncoded
                  // User enters target and constraints in uncoded space, result is also uncoded
                  let result = (targetY - displayBeta[0] - constraintSum) / displayBeta[reducedColIdx];
                  setSolverResult(result);
                };

                // Store solve function in ref so top-level useEffect can call it
                solveRef.current = handleSolve;

                return (
                  <>
                    {/* Coefficients Table with Model Selection */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                          Regression Coefficients <span className="text-xs"> (Uncheck to exclude from model)</span>
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                        <Button 
                          onClick={() => saveSelectedCoefficientsMutation.mutate()} 
                          disabled={saveSelectedCoefficientsMutation.isPending}
                          //variant="outline"
                          size="sm"
                        >
                          {saveSelectedCoefficientsMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Selected Coefficients
                            </>
                          )}
                        </Button>
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
                                <TableHead className="text-center">Include</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Intercept</TableCell>
                                <TableCell className="text-right">{displayBeta[0]?.toFixed(6)}</TableCell>
                                <TableCell className="text-right">{displayCoeffStats[0]?.stdError.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{displayCoeffStats[0]?.tValue.toFixed(4)}</TableCell>
                                <TableCell className={`text-right ${(displayCoeffStats[0]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[0]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-center"><Checkbox disabled checked /></TableCell>
                              </TableRow>
                              {factors.map((factor, i) => {
                                const isIncluded = selectedFactorsForModel[i] !== false;
                                
                                if (isIncluded) {
                                  const origColIdx = i + 1;
                                  const reducedColIdx = colMapReverse[origColIdx];
                                  
                                  if (reducedColIdx === undefined) return null;
                                  
                                  const vif = (() => {
                                    try {
                                      return calculateDOEVIF(reducedModel.XtX, reducedColIdx);
                                    } catch {
                                      return null;
                                    }
                                  })();
                                  const isHighVIF = vif !== null && vif > 5;
                                  const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                  
                                  return (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium w-48">{factor.name}</TableCell>
                                    <TableCell className="text-right w-24">{displayBeta[reducedColIdx]?.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{displayCoeffStats[reducedColIdx]?.stdError.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{displayCoeffStats[reducedColIdx]?.tValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${(displayCoeffStats[reducedColIdx]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[reducedColIdx]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-16 ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [i]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-factor-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key={i} className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">{factor.name}</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [i]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-factor-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })}
                              {interactionPairs.map((pair, i) => {
                                const isIncluded = selectedFactorsForModel[`int-${i}`] !== false;
                                
                                if (isIncluded) {
                                  const origColIdx = factors.length + 1 + i;
                                  const reducedColIdx = colMapReverse[origColIdx];
                                  
                                  if (reducedColIdx === undefined) return null;
                                  
                                  const vif = (() => {
                                    try {
                                      return calculateDOEVIF(reducedModel.XtX, reducedColIdx);
                                    } catch {
                                      return null;
                                    }
                                  })();
                                  const isHighVIF = vif !== null && vif > 5;
                                  const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                  
                                  return (
                                  <TableRow key={`int-${i}`}>
                                    <TableCell className="font-medium w-48">{pair.name}</TableCell>
                                    <TableCell className="text-right w-24">{displayBeta[reducedColIdx]?.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{displayCoeffStats[reducedColIdx]?.stdError.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{displayCoeffStats[reducedColIdx]?.tValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${(displayCoeffStats[reducedColIdx]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[reducedColIdx]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-16 ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [`int-${i}`]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-interaction-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key={`int-${i}`} className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">{pair.name}</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [`int-${i}`]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-interaction-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })}
                              {includeCenterPoints && (() => {
                                const isIncluded = selectedFactorsForModel['centerPoint'] !== false;
                                
                                if (isIncluded) {
                                  // Separate center points from factorial points
                                  const centerPointIndices: number[] = [];
                                  const factorialPointIndices: number[] = [];
                                  
                                  runData.forEach((row, rowIdx) => {
                                    if (row.response !== null && !isNaN(row.response)) {
                                      const allFactorsZero = factors.every(factor => {
                                        const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                        return Math.abs(level) < 0.01; // essentially 0
                                      });
                                      if (allFactorsZero) {
                                        centerPointIndices.push(rowIdx);
                                      } else {
                                        factorialPointIndices.push(rowIdx);
                                      }
                                    }
                                  });

                                  const n_c = centerPointIndices.length;
                                  const n_f = factorialPointIndices.length;
                                  
                                  let curvatureCoeff = 0;
                                  let curvatureSE = 0;
                                  let curvatureTValue = 0;
                                  let curvaturePValue = 1;
                                  
                                  if (n_c > 0 && n_f > 0) {
                                    // Average response at center points
                                    const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                                    const y_c_avg = centerResponses.length > 0 ? centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length : 0;
                                    
                                    // Predicted response at center from reduced model (without center point term)
                                    const y_f_at_center = displayBeta[0];
                                    
                                    // Curvature coefficient = difference
                                    curvatureCoeff = y_c_avg - y_f_at_center;
                                    
                                    // Standard error of curvature using reduced model MSE
                                    // SE_curv = sqrt(mse * (1/n_c + 1/n_f))
                                    curvatureSE = Math.sqrt(mse_display * (1 / n_c + 1 / n_f));
                                    curvatureTValue = curvatureSE > 0 ? curvatureCoeff / curvatureSE : 0;
                                    curvaturePValue = curvatureSE > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(curvatureTValue), n - reducedModel.p)) : 1;
                                  }
                                  
                                  return (
                                  <TableRow key="center-point">
                                    <TableCell className="font-medium w-48">Center Point (Curvature)</TableCell>
                                    <TableCell className="text-right w-24">{curvatureCoeff.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{curvatureSE.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{curvatureTValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${curvaturePValue < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{curvaturePValue.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-16">1.00</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            ['centerPoint']: !!checked
                                          }));
                                        }}
                                        data-testid="checkbox-center-point"
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key="center-point" className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">Center Point (Curvature)</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            ['centerPoint']: !!checked
                                          }));
                                        }}
                                        data-testid="checkbox-center-point"
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          VIF &gt; 5 indicates problematic multicollinearity (high correlation between terms - shown in red)<br></br>
                          &gt; 1 VIF &le; 5 indicates moderate multicollinearity (correlation between terms - shown in yellow)<br></br>
                          VIF &le; 1 indicates no multicollinearity (no correlation between terms - shown in black)
                        </div>
                      </CardContent>
                    </Card>

                    {/* Regression Equation */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Regression Model {showUncoded && allFactorsHaveValidLevels() ? '(Uncoded)' : '(Coded)'}
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded font-mono text-sm">
                          <p>Y = {displayBeta[0]?.toFixed(4)}</p>
                          {factors.map((factor, i) => {
                            if (selectedFactorsForModel[i] === false) return null;
                            const origColIdx = i + 1;
                            const reducedColIdx = colMapReverse[origColIdx];
                            if (reducedColIdx === undefined) return null;
                            return (
                              <p key={i}>
                                &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[reducedColIdx] >= 0 ? '+' : ''} {displayBeta[reducedColIdx]?.toFixed(4)} × {factor.name}{factor.type === 'continuous' && factor.units ? ` (${factor.units})` : ''}
                              </p>
                            );
                          })}
                          {interactionPairs.map((pair, i) => {
                            if (selectedFactorsForModel[`int-${i}`] === false) return null;
                            const origColIdx = factors.length + 1 + i;
                            const reducedColIdx = colMapReverse[origColIdx];
                            if (reducedColIdx === undefined) return null;
                            return (
                              <p key={`int-${i}`}>
                                &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[reducedColIdx] >= 0 ? '+' : ''} {displayBeta[reducedColIdx]?.toFixed(4)} × {pair.name}
                              </p>
                            );
                          })}
                          {includeCenterPoints && (() => {
                            if (selectedFactorsForModel['centerPoint'] === false) return null;
                            const displayedCenterCoeff = getCenterPointCoeff(displayBeta[0]);
                            return displayedCenterCoeff !== 0 ? (
                              <p key="center-point">
                                &nbsp;&nbsp;&nbsp;&nbsp;{displayedCenterCoeff >= 0 ? '+' : ''} {displayedCenterCoeff?.toFixed(4)} × Center Point
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Goodness of Fit */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Goodness of Fit
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">R²</p>
                            <p className="text-2xl font-bold">{(R_sq_red * 100).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Adjusted R²</p>
                            <p className="text-2xl font-bold">{(adj_R_sq_red * 100).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">RMSE</p>
                            <p className="text-2xl font-bold">{rmse_red.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">N Observations</p>
                            <p className="text-2xl font-bold">{reducedModel.n}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Coefficients Table with Model Selection */}
                    {/*<Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                          Regression Coefficients (uncheck to exclude from model)
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                        <Button 
                          onClick={() => saveSelectedCoefficientsMutation.mutate()} 
                          disabled={saveSelectedCoefficientsMutation.isPending}
                          variant="outline"
                          size="sm"
                        >
                          {saveSelectedCoefficientsMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Selected Coefficients
                            </>
                          )}
                        </Button>
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
                                <TableHead className="text-center">Include</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Intercept</TableCell>
                                <TableCell className="text-right">{displayBeta[0]?.toFixed(6)}</TableCell>
                                <TableCell className="text-right">{displayCoeffStats[0]?.stdError.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{displayCoeffStats[0]?.tValue.toFixed(4)}</TableCell>
                                <TableCell className={`text-right ${(displayCoeffStats[0]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[0]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-center"><Checkbox disabled checked /></TableCell>
                              </TableRow>
                              {factors.map((factor, i) => {
                                const isIncluded = selectedFactorsForModel[i] !== false;
                                
                                if (isIncluded) {
                                  const origColIdx = i + 1;
                                  const reducedColIdx = colMapReverse[origColIdx];
                                  
                                  if (reducedColIdx === undefined) return null;
                                  
                                  const vif = (() => {
                                    try {
                                      return calculateDOEVIF(reducedModel.XtX, reducedColIdx);
                                    } catch {
                                      return null;
                                    }
                                  })();
                                  const isHighVIF = vif !== null && vif > 5;
                                  const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                  
                                  return (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium w-48">{factor.name}</TableCell>
                                    <TableCell className="text-right w-24">{displayBeta[reducedColIdx]?.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{displayCoeffStats[reducedColIdx]?.stdError.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{displayCoeffStats[reducedColIdx]?.tValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${(displayCoeffStats[reducedColIdx]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[reducedColIdx]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-16 ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [i]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-factor-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key={i} className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">{factor.name}</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [i]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-factor-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })}
                              {interactionPairs.map((pair, i) => {
                                const isIncluded = selectedFactorsForModel[`int-${i}`] !== false;
                                
                                if (isIncluded) {
                                  const origColIdx = factors.length + 1 + i;
                                  const reducedColIdx = colMapReverse[origColIdx];
                                  
                                  if (reducedColIdx === undefined) return null;
                                  
                                  const vif = (() => {
                                    try {
                                      return calculateDOEVIF(reducedModel.XtX, reducedColIdx);
                                    } catch {
                                      return null;
                                    }
                                  })();
                                  const isHighVIF = vif !== null && vif > 5;
                                  const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                  
                                  return (
                                  <TableRow key={`int-${i}`}>
                                    <TableCell className="font-medium w-48">{pair.name}</TableCell>
                                    <TableCell className="text-right w-24">{displayBeta[reducedColIdx]?.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{displayCoeffStats[reducedColIdx]?.stdError.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{displayCoeffStats[reducedColIdx]?.tValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${(displayCoeffStats[reducedColIdx]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[reducedColIdx]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-16 ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [`int-${i}`]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-interaction-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key={`int-${i}`} className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">{pair.name}</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            [`int-${i}`]: !!checked
                                          }));
                                        }}
                                        data-testid={`checkbox-interaction-${i}`}
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })}
                              {includeCenterPoints && (() => {
                                const isIncluded = selectedFactorsForModel['centerPoint'] !== false;
                                
                                if (isIncluded) {
                                  // Separate center points from factorial points
                                  const centerPointIndices: number[] = [];
                                  const factorialPointIndices: number[] = [];
                                  
                                  runData.forEach((row, rowIdx) => {
                                    if (row.response !== null && !isNaN(row.response)) {
                                      const allFactorsZero = factors.every(factor => {
                                        const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                        return Math.abs(level) < 0.01; // essentially 0
                                      });
                                      if (allFactorsZero) {
                                        centerPointIndices.push(rowIdx);
                                      } else {
                                        factorialPointIndices.push(rowIdx);
                                      }
                                    }
                                  });

                                  const n_c = centerPointIndices.length;
                                  const n_f = factorialPointIndices.length;
                                  
                                  let curvatureCoeff = 0;
                                  let curvatureSE = 0;
                                  let curvatureTValue = 0;
                                  let curvaturePValue = 1;
                                  
                                  if (n_c > 0 && n_f > 0) {
                                    // Average response at center points
                                    const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                                    const y_c_avg = centerResponses.length > 0 ? centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length : 0;
                                    
                                    // Predicted response at center from reduced model (without center point term)
                                    const y_f_at_center = displayBeta[0];
                                    
                                    // Curvature coefficient = difference
                                    curvatureCoeff = y_c_avg - y_f_at_center;
                                    
                                    // Standard error of curvature using reduced model MSE
                                    // SE_curv = sqrt(mse * (1/n_c + 1/n_f))
                                    curvatureSE = Math.sqrt(mse_display * (1 / n_c + 1 / n_f));
                                    curvatureTValue = curvatureSE > 0 ? curvatureCoeff / curvatureSE : 0;
                                    curvaturePValue = curvatureSE > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(curvatureTValue), n - reducedModel.p)) : 1;
                                  }
                                  
                                  return (
                                  <TableRow key="center-point">
                                    <TableCell className="font-medium w-48">Center Point (Curvature)</TableCell>
                                    <TableCell className="text-right w-24">{curvatureCoeff.toFixed(6)}</TableCell>
                                    <TableCell className="text-right w-24">{curvatureSE.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-20">{curvatureTValue.toFixed(4)}</TableCell>
                                    <TableCell className={`text-right w-20 ${curvaturePValue < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{curvaturePValue.toFixed(4)}</TableCell>
                                    <TableCell className="text-right w-16">1.00</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={true}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            ['centerPoint']: !!checked
                                          }));
                                        }}
                                        data-testid="checkbox-center-point"
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                } else {
                                  return (
                                  <TableRow key="center-point" className="opacity-50">
                                    <TableCell className="font-medium text-muted-foreground w-48">Center Point (Curvature)</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground w-auto">Term not included in model</TableCell>
                                    <TableCell className="text-center w-16">
                                      <Checkbox
                                        checked={false}
                                        onCheckedChange={(checked) => {
                                          setSelectedFactorsForModel(prev => ({
                                            ...prev,
                                            ['centerPoint']: !!checked
                                          }));
                                        }}
                                        data-testid="checkbox-center-point"
                                      />
                                    </TableCell>
                                  </TableRow>
                                  );
                                }
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          VIF &gt; 5 indicates problematic multicollinearity (high correlation between terms - shown in red)<br></br>
                          &gt; 1 VIF &le; 5 indicates moderate multicollinearity (correlation between terms - shown in yellow)<br></br>
                          VIF &le; 1 indicates no multicollinearity (no correlation between terms - shown in black)
                        </div>
                      </CardContent>
                    </Card> */}

                    {/* Residual Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Residual Analysis
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-2">Residual Statistics</p>
                            {(() => {
                              const residualsToUse = reducedModel.residuals;
                              const validResiduals = residualsToUse.filter(r => typeof r === 'number' && isFinite(r));
                              const residMean = validResiduals.length > 0 ? validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length : 0;
                              const residStd = validResiduals.length > 1 ? Math.sqrt(validResiduals.reduce((sum, val) => sum + Math.pow(val - residMean, 2), 0) / (validResiduals.length - 1)) : 0;
                              const maxResidual = Math.max(...residualsToUse.map(Math.abs));
                              const adTest = performNormalityTest(validResiduals, residMean, residStd);
                              
                              return (
                                <>
                                  <table className="w-full border-collapse bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <tbody>
                                      <th className="text-sm text-muted-foreground py-2 pr-4 w-1/5">Standard Deviation:</th>
                                      <th className="text-sm text-muted-foreground py-2 pr-4 w-1/5">Max Residual:</th>
                                      <th className="text-sm text-muted-foreground py-2 pr-4 align-top w-3/5">Normality Test (Anderson-Darling):</th>
                                      <tr>
                                        <td className="font-medium text-center py-2">{residStd.toFixed(6)}</td>
                                        <td className="font-medium text-center py-2">{maxResidual.toFixed(6)}</td>
                                        <table className="w-full">
                                          <tbody>                         
                                            <th className="text-sm text-muted-foreground pb-1 w-1/5">AD Statistic:</th>
                                            <th className="text-sm text-muted-foreground pb-1 w 1/5">p-value:</th>
                                            <th className="text-sm text-muted-foreground pb-1 w-3/5">Conclusion (5% significance (α)):</th>
                                            <tr>
                                              <td className="font-medium pb-1 text-center">{adTest.adStatistic.toFixed(4)}</td>
                                              <td className="font-medium pb-1 text-center">{adTest.pValue.toFixed(4)}</td>
                                              <td className={`font-medium pb-1  text-center ${
                                                adTest.isNormal ? 'text-green-600 dark:text-green-400' :
                                                !adTest.isNormal ? 'text-red-600 dark:text-red-400' :
                                                'text-yellow-600 dark:text-yellow-400'
                                                }`}>
                                                {adTest.isNormal ? 'Normal' : adTest.isNormal === false ? 'Not Normal' : 'Inconclusive'}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <p className="text-sm font-semibold mb-3">Normality Test (Anderson-Darling):</p>
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <p className="text-sm text-muted-foreground">AD Statistic</p>
                                        <p className="text-lg font-bold">{adTest.adStatistic.toFixed(4)}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">p-value</p>
                                        <p className="text-lg font-bold">{adTest.pValue.toFixed(4)}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Conclusion (5% significance)</p>
                                        <p className={`text-lg font-bold ${adTest.isNormal ? 'text-green-600 dark:text-green-400' : adTest.isNormal === false ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                          {adTest.isNormal ? 'Normal' : adTest.isNormal === false ? 'Not Normal' : 'Inconclusive'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="residuals-vs-fits"
                                checked={showResidualsVsFits}
                                onCheckedChange={(checked) => setShowResidualsVsFits(checked as boolean)}
                                data-testid="checkbox-residuals-vs-fits"
                              />
                              <Label htmlFor="residuals-vs-fits">Residuals vs Fits</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="residuals-vs-order"
                                checked={showResidualsVsOrder}
                                onCheckedChange={(checked) => setShowResidualsVsOrder(checked as boolean)}
                                data-testid="checkbox-residuals-vs-order"
                              />
                              <Label htmlFor="residuals-vs-order">Residuals vs Order</Label>
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

                          {(showResidualsVsFits || showResidualsVsOrder || showNormalProbPlot) && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(() => {
                                const residualsToUse = reducedModel.residuals;
                                const predictionsToUse = reducedModel.predictions;
                                const validResiduals = residualsToUse.filter(r => typeof r === 'number' && isFinite(r));
                                const minResidual = Math.min(...validResiduals);
                                const maxResidual = Math.max(...validResiduals);
                                const range = maxResidual - minResidual;
                                const padding = range > 0 ? range * 0.1 : 1;
                                const yMin = minResidual - padding;
                                const yMax = maxResidual + padding;
                                
                                const residMean = validResiduals.length > 0 ? validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length : 0;
                                const residStd = validResiduals.length > 1 ? Math.sqrt(validResiduals.reduce((sum, val) => sum + Math.pow(val - residMean, 2), 0) / (validResiduals.length - 1)) : 0;
                                
                                return (
                                  <>
                                    {showResidualsVsFits && (
                                      <div>
                                        <Plot
                                    data={[
                                      {
                                        type: 'scatter',
                                        mode: 'markers',
                                        x: predictionsToUse,
                                        y: residualsToUse,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: predictionsToUse,
                                        y: Array(predictionsToUse.length).fill(0),
                                        line: { color: 'red', dash: 'dash' },
                                      } as any,
                                    ]}
                                    layout={{
                                      title: { text: '<b>Residuals vs Fitted Values</b>' },
                                      xaxis: { title: { text: '<b>Fitted Values</b>' } },
                                      yaxis: { title: { text: '<b>Residuals</b>' }, range: [yMin, yMax] },
                                      showlegend: false,
                                      margin: { l: 60, r: 80, t: 50, b: 60 },
                                    }}
                                    style={{ width: '100%', height: '400px' }}
                                    useResizeHandler
                                    config={{
                                      responsive: true,
                                      displayModeBar: true,
                                      displaylogo: false,
                                    }}
                                  />
                                      </div>
                                    )}
                                    
                                    {showResidualsVsOrder && (
                                      <div>
                                        <Plot
                                    data={[
                                      {
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        x: Array.from({ length: residualsToUse.length }, (_, i) => i + 1),
                                        y: residualsToUse,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                        line: { color: 'rgb(59, 130, 246)' },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: [1, residualsToUse.length],
                                        y: [0, 0],
                                        line: { color: 'red', dash: 'dash' },
                                      } as any,
                                    ]}
                                    layout={{
                                      title: { text: '<b>Residuals vs Observation Order</b>' },
                                      xaxis: { title: { text: '<b>Observation Order</b>' } },
                                      yaxis: { title: { text: '<b>Residuals</b>' }, range: [yMin, yMax] },
                                      showlegend: false,
                                      margin: { l: 60, r: 80, t: 50, b: 60 },
                                    }}
                                    style={{ width: '100%', height: '400px' }}
                                    useResizeHandler
                                    config={{
                                      responsive: true,
                                      displayModeBar: true,
                                      displaylogo: false,
                                    }}
                                  />
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              {showNormalProbPlot && (() => {
                              const residualsToUse = reducedModel.residuals;
                              const validResiduals = residualsToUse.filter(r => typeof r === 'number' && isFinite(r));
                              const residMean = validResiduals.length > 0 ? validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length : 0;
                              const residStd = validResiduals.length > 1 ? Math.sqrt(validResiduals.reduce((sum, val) => sum + Math.pow(val - residMean, 2), 0) / (validResiduals.length - 1)) : 0;
                              
                              const sorted = [...residualsToUse].sort((a, b) => a - b);
                              const n_res = sorted.length;
                              const theoreticalQuantiles = sorted.map((_, i) => {
                                const p = (i + 0.5) / n_res;
                                return jStat.normal.inv(p, 0, 1);
                              });
                              const lineX = [residMean - 3 * residStd, residMean + 3 * residStd];
                              const lineY = [-3, 3];
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
                                    title: { text: '<b>Normal Probability (Q-Q) Plot</b>' },
                                    xaxis: { title: { text: '<b>Residuals</b>' }, zeroline: true, showgrid: true },
                                    yaxis: { title: { text: '<b>Theoretical Quantiles (Z)</b>' }, zeroline: true, showgrid: true },
                                    showlegend: false,
                                    margin: { l: 70, r: 80, t: 50, b: 60 },
                                  }}
                                  useResizeHandler
                                  config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                                  style={{ width: '100%', height: '400px' }}
                                />
                              );
                            })()}
                            </div>
                          )}

                        </div>
                      </CardContent>
                    </Card>

                    {/* Solver */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Solve for Target Response
                          {Object.values(selectedFactorsForModel).some(v => v === false) && (
                            <span className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl ml-24 text-sm font-normal justify-right">Reduced Model</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Target Y Value</Label>
                            <Input
                              type="text"
                              value={targetYDisplay}
                              onChange={(e) => {
                                setTargetYDisplay(e.target.value);
                                const parsed = parseDecimalValue(e.target.value);
                                if (parsed !== null) {
                                  setTargetY(parsed);
                                }
                              }}
                              placeholder="Enter target Y value (use . or , for decimals)"
                              data-testid="input-solver-target-y"
                            />
                            {(() => {
                              const observedYValues = Object.values(responses).filter(r => r !== null && typeof r === 'number' && isFinite(r)) as number[];
                              const minY = observedYValues.length > 0 ? Math.min(...observedYValues) : NaN;
                              const maxY = observedYValues.length > 0 ? Math.max(...observedYValues) : NaN;
                              const isOutsideRange = targetYDisplay !== '' && Number.isFinite(minY) && Number.isFinite(maxY) && Number.isFinite(targetY) && (targetY < minY || targetY > maxY);
                              return isOutsideRange ? (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">⚠️ Target Y outside the studied model range: [{minY.toFixed(4)}, {maxY.toFixed(4)}]</p>
                              ) : null;
                            })()}
                          </div>
                          <div>
                            <Label>Solve for Factor</Label>
                            <Select value={String(solveFactorIdx)} onValueChange={(v) => setSolveFactorIdx(parseInt(v))}>
                              <SelectTrigger data-testid="select-solver-factor">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {factors.map((f, i) => {
                                  // Only show factors that are included in the model
                                  if (selectedFactorsForModel[i] === false) return null;
                                  return <SelectItem key={i} value={String(i)}>{f.name}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Set Constraint Values for Other Factors */}
                          <div className="space-y-3">
                            <Label>Set Constraint Values for Other Factors</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {factors.map((factor, idx) => {
                                // Only show included factors that are NOT the solve factor
                                if (idx !== solveFactorIdx && selectedFactorsForModel[idx] !== false) {
                                  const constraintVal = constraintValues[idx];
                                  const factorLow = parseFloat(String(factor.lowValue));
                                  const factorHigh = parseFloat(String(factor.highValue));
                                  const isOutsideRange = constraintVal !== null && constraintVal !== undefined && (
                                    constraintVal < factorLow || 
                                    constraintVal > factorHigh
                                  );
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <Label htmlFor={`constraint-${idx}`} className="text-sm">
                                        {factor.name}
                                      </Label>
                                      <Input
                                        id={`constraint-${idx}`}
                                        type="text"
                                        value={constraintDisplay[idx] ?? ''}
                                        onChange={(e) => {
                                          const displayVal = e.target.value;
                                          setConstraintDisplay({
                                            ...constraintDisplay,
                                            [idx]: displayVal
                                          });
                                          const value = displayVal === '' ? null : parseDecimalValue(displayVal);
                                          setConstraintValues({
                                            ...constraintValues,
                                            [idx]: value
                                          });
                                        }}
                                        placeholder={`Enter ${factor.name} value (use . or ,)`}
                                        data-testid={`input-constraint-${idx}`}
                                      />
                                      {isOutsideRange && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400">⚠️ Outside inference space range: [{factorLow.toFixed(4)}, {factorHigh.toFixed(4)}]</p>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>

                          <Button
                            onClick={handleSaveSolvingSetup}
                            disabled={targetY === null || saveSolvingSetupMutation.isPending}
                            data-testid="button-save-solving-setup"
                            className="w-full"
                          >
                            {saveSolvingSetupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Solving Setup
                          </Button>

                          {solverResult !== null && (() => {
                            // Calculate confidence and prediction intervals for Y target
                            const tValue = jStat.studentt.inv((1 - significanceLevel / 2), reducedModel.n - reducedModel.p);
                            const s2 = reducedModel.mse; // Variance estimate
                            
                            // Get observed Y range from responses
                            const observedYValues = Object.values(responses).filter(r => r !== null && typeof r === 'number' && isFinite(r)) as number[];
                            const minY = observedYValues.length > 0 ? Math.min(...observedYValues) : NaN;
                            const maxY = observedYValues.length > 0 ? Math.max(...observedYValues) : NaN;
                            const targetYOutsideRange = Number.isFinite(minY) && Number.isFinite(maxY) && (targetY < minY || targetY > maxY);
                            
                            // Check if solution is outside the solve factor's range
                            const solveFactor = factors[solveFactorIdx];
                            const solveFactorLow = parseFloat(String(solveFactor.lowValue));
                            const solveFactorHigh = parseFloat(String(solveFactor.highValue));
                            const solverOutsideRange = !isNaN(solveFactorLow) && !isNaN(solveFactorHigh) && 
                              (solverResult < solveFactorLow || solverResult > solveFactorHigh);
                            const solveFactorRangeStr = `[${solveFactorLow.toFixed(4)}, ${solveFactorHigh.toFixed(4)}]`;
                            
                            // Build prediction vector matching the reduced model structure
                            // This must include: [1, main effects for selected factors, interactions for selected factor pairs]
                            const xRow: number[] = [1]; // Intercept
                            
                            // Get factor values
                            const factorValues: Record<number, number> = {};
                            for (let i = 0; i < factors.length; i++) {
                              if (selectedFactorsForModel[i] !== false) {
                                const val = i === solveFactorIdx ? solverResult : (constraintValues[i] ?? 0);
                                factorValues[i] = val;
                                xRow.push(val);
                              }
                            }
                            
                            // Add interaction terms for included factor pairs
                            for (let i = 0; i < interactionPairs.length; i++) {
                              const pair = interactionPairs[i];
                              if (selectedFactorsForModel[pair.i] !== false && selectedFactorsForModel[pair.j] !== false) {
                                const val1 = pair.i === solveFactorIdx ? solverResult : (constraintValues[pair.i] ?? 0);
                                const val2 = pair.j === solveFactorIdx ? solverResult : (constraintValues[pair.j] ?? 0);
                                xRow.push(val1 * val2);
                              }
                            }
                            
                            // Invert (X'X) from reduced model
                            let XtXInv: number[][] | null = null;
                            try {
                              XtXInv = invertMatrix(reducedModel.XtX);
                            } catch (e) {
                              // Matrix is singular, XtXInv stays null
                            }
                            
                            let varY = 0;
                            let ciLower = NaN, ciUpper = NaN, piLower = NaN, piUpper = NaN;
                            
                            if (XtXInv && isFinite(s2) && s2 > 0 && isFinite(tValue)) {
                              try {
                                // Calculate x'(X'X)^-1 x
                                const minLen = Math.min(xRow.length, XtXInv.length);
                                for (let i = 0; i < minLen; i++) {
                                  for (let j = 0; j < minLen; j++) {
                                    varY += xRow[i] * XtXInv[i][j] * xRow[j];
                                  }
                                }
                                if (isFinite(varY) && varY >= 0) {
                                  const varConfidence = s2 * varY;
                                  const varPrediction = s2 * varY + s2; // Add individual observation variance
                                  const seConfidence = Math.sqrt(Math.max(0, varConfidence));
                                  const sePrediction = Math.sqrt(Math.max(0, varPrediction));
                                  if (isFinite(seConfidence) && isFinite(sePrediction)) {
                                    ciLower = targetY - tValue * seConfidence;
                                    ciUpper = targetY + tValue * seConfidence;
                                    piLower = targetY - tValue * sePrediction;
                                    piUpper = targetY + tValue * sePrediction;
                                  }
                                }
                              } catch (e) {
                                // Silent catch - intervals stay as NaN
                              }
                            }
                            
                            return (
                              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-200 dark:border-green-800">
                                <p className="text-sm text-muted-foreground mb-2">Result:</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-3">
                                  {factors[solveFactorIdx].name} = {solverResult.toFixed(4)} {factors[solveFactorIdx].type === 'continuous' && factors[solveFactorIdx].units ? `${factors[solveFactorIdx].units}` : ''}
                                </p>
                                {solverOutsideRange && (
                                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">⚠️ Outside inference space range: {solveFactorRangeStr}</p>
                                )}
                                {targetYOutsideRange && (
                                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">⚠️ Target Y outside the studied model range: [{minY.toFixed(4)} , {maxY.toFixed(4)}]</p>
                                )}
                                <div className="overflow-x-auto">
                                  <table className="text-xs w-full">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-sm text-muted-foreground pb-1 text-left">Target Y {(1 - significanceLevel) * 100}% Confidence Interval:</th>
                                        <th className="text-sm text-muted-foreground pb-1 text-left">Target Y {(1 - significanceLevel) * 100}% Prediction Interval:</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td className="font-medium pb-1 align-text-top">
                                          {isNaN(ciLower) ? 'N/A' : `[${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]`}
                                        </td>
                                        <td className="font-medium pb-1 align-text-top">
                                          {isNaN(piLower) ? 'N/A' : `[${piLower.toFixed(4)}, ${piUpper.toFixed(4)}]`}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
