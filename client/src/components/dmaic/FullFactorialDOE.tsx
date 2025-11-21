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
  const [targetY, setTargetY] = useState(100);
  const [solverResult, setSolverResult] = useState<number | null>(null);
  const [constraintValues, setConstraintValues] = useState<Record<number, number | null>>({});
  
  // Model reduction - track which factors to include (all enabled by default)
  const [selectedFactorsForModel, setSelectedFactorsForModel] = useState<Record<number | string, boolean>>(
    {}
  );
  
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
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-full`],
    retry: false,
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
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors, responses),
    });
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
                              ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
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
                                      return f.type === 'continuous' ? `${(decoded as number).toFixed(2)}${f.units ? ' ' + f.units : ''}` : String(decoded);
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
                              
                              const centerLabel = `Center: ${Object.entries(combo.labels).map(([f, l]) => `${f}=${l}`).join(', ')}`;
                              
                              interactionTraces.push({
                                x: [0],
                                y: [centerValue],
                                type: 'scatter',
                                mode: 'markers',
                                name: centerLabel,
                                marker: { size: 8, color: '#ef4444' },
                                showlegend: true,
                                hovertemplate: centerLabel + '<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
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
                  <CardTitle>ANOVA Analysis</CardTitle>
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
                          
                          // Add factor rows
                          factors.forEach((factor, idx) => {
                            const termIdx = idx + 1;
                            const termSS = Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                            const termDF = 1;
                            const termMS = termSS / termDF;
                            const errorMS = residualSS / (n - p);
                            const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                            const pValue = fRatio > 0 && (n - p) > 0 
                              ? 1 - jStat.centralF.cdf(fRatio, termDF, n - p) 
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

                          // Add interaction rows
                          interactionPairs.forEach((pair, pairIdx) => {
                            const termIdx = factors.length + 1 + pairIdx;
                            const termSS = Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                            const termDF = 1;
                            const termMS = termSS / termDF;
                            const errorMS = residualSS / (n - p);
                            const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                            const pValue = fRatio > 0 && (n - p) > 0 
                              ? 1 - jStat.centralF.cdf(fRatio, termDF, n - p) 
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

                          // Calculate curvature if center points exist
                          let curvatureSS = 0;
                          let curvatureDF = 0;
                          let curvatureMS = 0;
                          let curvatureFRatio = 0;
                          let curvaturePValue = 1;
                          let curveEffect = 0;
                          
                          if (includeCenterPoints) {
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

                          const errorDF = n - p;
                          const errorMS = errorDF > 0 ? residualSS / errorDF : 0;

                          rows.push(
                            <TableRow key="error">
                              <TableCell className="font-medium">Error</TableCell>
                              <TableCell className="text-right">{errorDF}</TableCell>
                              <TableCell className="text-right">{Math.max(0, residualSS).toFixed(4)}</TableCell>
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
                
                // Calculate standard errors and t-values for all coefficients
                const coeffStats = beta.map((b, idx) => {
                  // Get the diagonal element of (X'X)^-1
                  let xxtInvDiag = 0;
                  if (idx === 0) {
                    xxtInvDiag = 1 / XtX[0][0];
                  } else {
                    // Simple approximation for diagonal elements
                    const denom = XtX[idx][idx] - (idx > 0 ? XtX[idx].slice(0, idx).reduce((sum, v, i) => sum + v * v / (XtX[i][i] || 1), 0) : 0);
                    xxtInvDiag = Math.abs(denom) > 1e-10 ? 1 / denom : 1 / XtX[idx][idx];
                  }
                  const stdError = Math.sqrt(mse * Math.max(0, xxtInvDiag));
                  const tValue = stdError > 0 ? b / stdError : 0;
                  const pValue = stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(tValue), n - p)) : 1;
                  return { stdError, tValue, pValue };
                });

                // Transform coefficients from coded to uncoded if needed
                const displayBeta = showUncoded && allFactorsHaveValidLevels() ? 
                  (() => {
                    const transformed = [...beta];
                    let interceptAdjustment = 0;
                    
                    for (let i = 0; i < factors.length; i++) {
                      const factor = factors[i];
                      if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                        const low = parseFloat(String(factor.lowValue));
                        const high = parseFloat(String(factor.highValue));
                        if (!isNaN(low) && !isNaN(high)) {
                          const center = (low + high) / 2;
                          const halfRange = (high - low) / 2;
                          
                          // β_uncoded = β_coded / halfRange
                          transformed[i + 1] = beta[i + 1] / halfRange;
                          // Adjust intercept: β0_uncoded = β0_coded - Σ(β_coded * center / halfRange)
                          interceptAdjustment += beta[i + 1] * center / halfRange;
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
                          transformed[factors.length + 1 + i] = beta[factors.length + 1 + i] / (halfRange1 * halfRange2);
                        }
                      }
                    }
                    
                    transformed[0] = beta[0] - interceptAdjustment;
                    return transformed;
                  })() : beta;
                
                const handleSolve = () => {
                  if (p < 2 || displayBeta[solveFactorIdx + 1] === 0) return;
                  // Calculate constraint contribution: sum of (coefficient * constraint_value) for all non-target factors
                  let constraintSum = 0;
                  for (let i = 0; i < factors.length; i++) {
                    if (i !== solveFactorIdx) {
                      const constraintVal = constraintValues[i];
                      if (constraintVal !== null && constraintVal !== undefined && Number.isFinite(constraintVal)) {
                        constraintSum += displayBeta[i + 1] * constraintVal;
                      }
                    }
                  }
                  // Solve: targetY = β0 + Σ_{j≠i} βj * constraint_j + βi * Xi
                  // Therefore: Xi = (targetY - β0 - constraintSum) / βi
                  let result = (targetY - displayBeta[0] - constraintSum) / displayBeta[solveFactorIdx + 1];
                  setSolverResult(result);
                };

                return (
                  <>
                    {/* Regression Equation */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Regression Model {showUncoded && allFactorsHaveValidLevels() ? '(Uncoded)' : '(Coded)'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded font-mono text-sm">
                          <p>Y = {displayBeta[0]?.toFixed(4)}</p>
                          {factors.map((factor, i) => (
                            <p key={i}>
                              &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[i + 1] >= 0 ? '+' : ''} {displayBeta[i + 1]?.toFixed(4)} × {factor.name}{factor.type === 'continuous' && factor.units ? ` (${factor.units})` : ''}
                            </p>
                          ))}
                          {interactionPairs.map((pair, i) => (
                            <p key={`int-${i}`}>
                              &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[factors.length + 1 + i] >= 0 ? '+' : ''} {displayBeta[factors.length + 1 + i]?.toFixed(4)} × {pair.name}
                            </p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Goodness of Fit */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Goodness of Fit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">R²</p>
                            <p className="text-2xl font-bold">{(R_sq * 100).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Adjusted R²</p>
                            <p className="text-2xl font-bold">{(adj_R_sq * 100).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">RMSE</p>
                            <p className="text-2xl font-bold">{rmse.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">N Observations</p>
                            <p className="text-2xl font-bold">{n}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Coefficients Table with Model Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Regression Coefficients (uncheck to exclude from model)</CardTitle>
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
                                <TableCell className="text-right">{coeffStats[0]?.stdError.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{coeffStats[0]?.tValue.toFixed(4)}</TableCell>
                                <TableCell className={`text-right ${(coeffStats[0]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{coeffStats[0]?.pValue.toFixed(4)}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-center"><Checkbox disabled checked /></TableCell>
                              </TableRow>
                              {factors.map((factor, i) => {
                                const vif = (() => {
                                  try {
                                    return calculateDOEVIF(X, i);
                                  } catch {
                                    return null;
                                  }
                                })();
                                const isHighVIF = vif !== null && vif > 5;
                                const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                return (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{factor.name}</TableCell>
                                  <TableCell className="text-right">{displayBeta[i + 1]?.toFixed(6)}</TableCell>
                                  <TableCell className="text-right">{coeffStats[i + 1]?.stdError.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{coeffStats[i + 1]?.tValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${(coeffStats[i + 1]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{coeffStats[i + 1]?.pValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={selectedFactorsForModel[i] ?? true}
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
                              })}
                              {interactionPairs.map((pair, i) => {
                                const vif = (() => {
                                  try {
                                    return calculateDOEVIF(X, factors.length + i);
                                  } catch {
                                    return null;
                                  }
                                })();
                                const isHighVIF = vif !== null && vif > 5;
                                const isModerateVIF = vif !== null && vif > 1 && vif <= 5;
                                return (
                                <TableRow key={`int-${i}`}>
                                  <TableCell className="font-medium">{pair.name}</TableCell>
                                  <TableCell className="text-right">{displayBeta[factors.length + 1 + i]?.toFixed(6)}</TableCell>
                                  <TableCell className="text-right">{coeffStats[factors.length + 1 + i]?.stdError.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{coeffStats[factors.length + 1 + i]?.tValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${(coeffStats[factors.length + 1 + i]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{coeffStats[factors.length + 1 + i]?.pValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={selectedFactorsForModel[`int-${i}`] ?? true}
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
                              })}
                              {includeCenterPoints && (() => {
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
                                  
                                  // Predicted response at center from factorial model
                                  const y_f_at_center = displayBeta[0];
                                  
                                  // Curvature coefficient = difference
                                  curvatureCoeff = y_c_avg - y_f_at_center;
                                  
                                  // Standard error of curvature
                                  // SE_curv = sqrt(mse * (1/n_c + 1/n_f))
                                  const errorMS = SS_res / (n - p);
                                  curvatureSE = Math.sqrt(errorMS * (1 / n_c + 1 / n_f));
                                  curvatureTValue = curvatureSE > 0 ? curvatureCoeff / curvatureSE : 0;
                                  curvaturePValue = curvatureSE > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(curvatureTValue), n - p)) : 1;
                                }
                                
                                return (
                                <TableRow key="center-point">
                                  <TableCell className="font-medium">Center Point (Curvature)</TableCell>
                                  <TableCell className="text-right">{curvatureCoeff.toFixed(6)}</TableCell>
                                  <TableCell className="text-right">{curvatureSE.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{curvatureTValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${curvaturePValue < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{curvaturePValue.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">-</TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={selectedFactorsForModel['centerPoint'] ?? true}
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

                    {/* Residual Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Residual Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="residuals-vs-fits"
                                checked={true}
                                disabled
                              />
                              <Label htmlFor="residuals-vs-fits">Residuals vs Fits</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="residuals-vs-order"
                                checked={true}
                                disabled
                              />
                              <Label htmlFor="residuals-vs-order">Residuals vs Order</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="normal-prob-plot"
                                checked={true}
                                disabled
                              />
                              <Label htmlFor="normal-prob-plot">Normal Probability Plot</Label>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const validResiduals = residuals.filter(r => typeof r === 'number' && isFinite(r));
                              const minResidual = Math.min(...validResiduals);
                              const maxResidual = Math.max(...validResiduals);
                              const range = maxResidual - minResidual;
                              const padding = range > 0 ? range * 0.1 : 1;
                              const yMin = minResidual - padding;
                              const yMax = maxResidual + padding;
                              
                              return (
                                <>
                                  {/* Residuals vs Fitted Values */}
                                  <Plot
                                    data={[
                                      {
                                        type: 'scatter',
                                        mode: 'markers',
                                        x: predictions,
                                        y: residuals,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: predictions,
                                        y: Array(predictions.length).fill(0),
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
                                  
                                  {/* Residuals vs Order */}
                                  <Plot
                                    data={[
                                      {
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        x: Array.from({ length: residuals.length }, (_, i) => i + 1),
                                        y: residuals,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                        line: { color: 'rgb(59, 130, 246)' },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: [1, residuals.length],
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
                                </>
                              );
                            })()}

                            {/* Normal Probability Plot */}
                            {(() => {
                              const sorted = [...residuals].sort((a, b) => a - b);
                              const n_res = sorted.length;
                              const theoreticalQuantiles = sorted.map((_, i) => {
                                const p = (i + 0.5) / n_res;
                                return jStat.normal.inv(p, 0, 1);
                              });
                              const lineX = [residualMean - 3 * residualStd, residualMean + 3 * residualStd];
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

                          <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-2">Residual Statistics</p>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Mean Residual</p>
                                <p className="text-lg font-bold">{residualMean.toFixed(6)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Std Dev Residuals</p>
                                <p className="text-lg font-bold">{residualStd.toFixed(4)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Max Residual</p>
                                <p className="text-lg font-bold">{Math.max(...residuals.map(Math.abs)).toFixed(4)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Solver */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Solve for Target Response</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label>Target Y Value</Label>
                            <Input
                              type="number"
                              value={targetY}
                              onChange={(e) => setTargetY(parseFloat(e.target.value) || mean_y)}
                              data-testid="input-solver-target-y"
                            />
                          </div>
                          <div>
                            <Label>Solve for Factor</Label>
                            <Select value={String(solveFactorIdx)} onValueChange={(v) => setSolveFactorIdx(parseInt(v))}>
                              <SelectTrigger data-testid="select-solver-factor">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {factors.map((f, i) => (
                                  <SelectItem key={i} value={String(i)}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Set Constraint Values for Other Factors */}
                          <div className="space-y-3">
                            <Label>Set Constraint Values for Other Factors</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {factors.map((factor, idx) => {
                                if (idx !== solveFactorIdx) {
                                  return (
                                    <div key={idx} className="space-y-1">
                                      <Label htmlFor={`constraint-${idx}`} className="text-sm">
                                        {factor.name}
                                      </Label>
                                      <Input
                                        id={`constraint-${idx}`}
                                        type="number"
                                        step="any"
                                        value={constraintValues[idx] ?? ''}
                                        onChange={(e) => {
                                          const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                          setConstraintValues({
                                            ...constraintValues,
                                            [idx]: value
                                          });
                                        }}
                                        placeholder={`Enter ${factor.name} value`}
                                        data-testid={`input-constraint-${idx}`}
                                      />
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>

                          <Button onClick={handleSolve} data-testid="button-solve">
                            Solve
                          </Button>
                          {solverResult !== null && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded border border-green-200 dark:border-green-800">
                              <p className="text-sm text-muted-foreground">Result:</p>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {factors[solveFactorIdx].name} = {solverResult.toFixed(4)} {factors[solveFactorIdx].type === 'continuous' && factors[solveFactorIdx].units ? `${factors[solveFactorIdx].units}` : ''}
                              </p>
                            </div>
                          )}
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
