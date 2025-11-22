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
  generateFractionalFactorialPlan,
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
  getFactorDisplayName,
  validateFractionalFactorCount,
  parseFactorValue,
  calculateDOEVIF
} from '@/lib/doeSharedUtils';

interface FractionalFactorialDOEProps {
  projectId: number;
  solutionId: string;
}

export function FractionalFactorialDOE({ projectId, solutionId }: FractionalFactorialDOEProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const lastLoadedKey = useRef<string>('');
  
  // State for Setup tab
  const [responseVariableName, setResponseVariableName] = useState("Y Response");
  const [designChoice, setDesignChoice] = useState<string>("1"); // "auto" or specific p value
  const [factors, setFactors] = useState<DOEFactor[]>([
    { name: "Factor A", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
    { name: "Factor B", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
    { name: "Factor C", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
    //{ name: "Factor D", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
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
  
  // Ref to store the solve function so it can be called by useEffect
  const solveRef = useRef<(() => void) | null>(null);

  // Auto-solve when solver dependencies change
  useEffect(() => {
    if (solveRef.current) {
      solveRef.current();
    }
  }, [solveFactorIdx, targetY, constraintValues, selectedFactorsForModel]);
  
  // Tab persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem(`doe-fractional-active-tab-${projectId}-${solutionId}`);
    return stored || "setup";
  });
  
  // Update localStorage when tab changes
  useEffect(() => {
    localStorage.setItem(`doe-fractional-active-tab-${projectId}-${solutionId}`, activeTab);
  }, [activeTab, projectId, solutionId]);
  
  // Auto-generate plan when switching to Data tab
  useEffect(() => {
    if (activeTab === 'data' && validateFractionalFactorCount(factors) && factors.length >= 3) {
      const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
      const plan = generateFractionalFactorialPlan(factors, 4, centerPoints, randomizeRuns, numberOfReplicates);
      
      setGeneratedPlan(plan);
      
      // Responses are preserved automatically since they're keyed by run order
      // No need to rebuild - existing responses state remains valid
    }
  }, [activeTab, factors, includeCenterPoints, numberOfCenterPoints, randomizeRuns, numberOfReplicates]);
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`],
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
        // Convert null values to NaN and populate empty factor names with defaults
        const factorsWithDefaults = config.factors.map((f: any, i: number) => {
          const factor = {
            ...f,
            // Populate empty factor names with default (Factor A, B, C, etc.)
            name: f.name && f.name.trim() !== '' ? f.name : `Factor ${String.fromCharCode(65 + i)}`,
          };
          
          if (f.type === 'continuous') {
            return {
              ...factor,
              lowValue: f.lowValue === null ? NaN : f.lowValue,
              highValue: f.highValue === null ? NaN : f.highValue,
            };
          }
          return factor;
        });
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
          // All metadata (k, p, resolution) comes from generatedPlan only
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
          if (config.runResponses && Object.keys(config.runResponses).length > 0) {
            setResponses(config.runResponses);
            const inputs: Record<number, string> = {};
            Object.entries(config.runResponses).forEach(([runOrder, response]) => {
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
        const legacyResponses: Record<string, number | null> = {};
        const inputs: Record<number, string> = {};
        config.runData.forEach((rd: any) => {
          legacyResponses[rd.run.toString()] = rd.response;
          if (rd.response !== null && rd.response !== undefined) {
            inputs[rd.run] = String(rd.response);
          }
        });
        setResponses(legacyResponses);
        setResponseInputs(inputs);
      }
    }
  }, [configQuery.data, projectId, solutionId]);
  
  // Save mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Your Fractional Factorial DOE configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Fractional Factorial DOE configuration",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSetup = () => {
    if (!validateFractionalFactorCount(factors)) {
      toast({
        title: "Validation Error",
        description: "Please add at least 3 factors for Fractional Factorial DOE.",
        variant: "destructive",
      });
      return;
    }
    
    const transformedPlan = transformGeneratedPlanForSaving(generatedPlan, factors, responses);
    
    saveConfigMutation.mutate({
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      generatedPlan: transformedPlan,
    });
  };
  
  const handleSaveData = () => {
    const transformedPlan = transformGeneratedPlanForSaving(generatedPlan, factors, responses);
    
    saveConfigMutation.mutate({
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      generatedPlan: transformedPlan,
    });
  };
  
  const handleAddFactor = () => {
    const newFactorIndex = factors.length + 1;
  if (newFactorIndex >= 12) {
    setDesignChoice(5 + (newFactorIndex - 12));
  }
  else if (newFactorIndex >= 9) {
    setDesignChoice(newFactorIndex - 7);
  }
        const newFactor = getDefaultFactor(newFactorIndex);
    setFactors([...factors, newFactor]);
  };
  
  const handleDeleteFactor = (index: number) => {
    if (factors.length <= 3) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least 3 factors for Fractional Factorial DOE.",
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
    if (!validateFractionalFactorCount(factors)) {
      toast({
        title: "Cannot Generate Plan",
        description: "Please add at least 3 factors before generating the Fractional Factorial DOE plan.",
        variant: "destructive",
      });
      return;
    }
    
    if (factors.length < 3) {
      toast({
        title: "Cannot Generate Plan",
        description: "Fractional factorial designs require at least 3 factors. Add more factors or use Full Factorial Design.",
        variant: "destructive",
      });
      return;
    }
    
    const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
    const plan = generateFractionalFactorialPlan(factors, 4, centerPoints, randomizeRuns, numberOfReplicates);
    
    setGeneratedPlan(plan);
    
    // Clear responses for new plan (responses state persists by run order)
    setResponses({});
    setResponseInputs({});
    
    toast({
      title: "Fractional Factorial DOE Plan Generated",
      description: `Generated ${plan.plan.length} experimental runs.`,
    });
  };
  
  const handleResponseChange = (runIndex: number, value: string) => {
    if (!generatedPlan || !generatedPlan.plan) return;
    
    const runOrderKey = generatedPlan.plan[runIndex]?.runOrder;
    if (runOrderKey === undefined) return;
    
    // Store raw string in UI state
    setResponseInputs(prev => ({
      ...prev,
      [runOrderKey]: value
    }));
    
    // Parse and store numeric value in responses
    const parsedValue = parseNumericValue(value);
    setResponses(prev => ({
      ...prev,
      [runOrderKey.toString()]: isNaN(parsedValue) ? null : parsedValue
    }));
  };

  const getDesignChoices = (k: number) => {
    if (k < 3 || k > 7) {
      return [];
    }      
    const minP = k >= 5 ? 1 : 0;
    const maxP = Math.min(k - 3, minP + 2);
    const items = [];

    for (let p = minP; p <= maxP; p++) {
      const runs = 2 ** (k - p);
      const resolutionNum = runs === 8 ? 3 : (runs === 16 ? 3 : 4);
      const resolutionRoman = toRoman(resolutionNum);

      items.push({
        p,
        label: (
          <>
            2<sup>({k}-{p})</sup> Resolution {resolutionRoman} ({runs} runs)
          </>
        ),
      });
    }

    return items;
  };

  const getResolutionRoman = (k: number, p: number) => {
    const runs = 2 ** (k - p);
    const resolutionNum = runs === 8 ? 3 : (runs === 16 ? 3 : 4);
    return toRoman(resolutionNum);
  };

  const toRoman = (num: number) => {
  const map = [
    { v: 10, s: "X" },
    { v: 9,  s: "IX" },
    { v: 8,  s: "VIII" },
    { v: 7,  s: "VII" },
    { v: 6,  s: "VI" },
    { v: 5,  s: "V" },
    { v: 4,  s: "IV" },
    { v: 3,  s: "III" },
    { v: 2,  s: "II" },
    { v: 1,  s: "I" },
  ];

  let result = "";
  for (const { v, s } of map) {
    while (num >= v) {
      result += s;
      num -= v;
    }
  }
  return result;
};
  
  return (
    <div className="space-y-6" data-testid="fractional-factorial-doe-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fractional Factorial DOE 2<sup>(k-p)</sup></h2>
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
              <CardTitle>Fractional Factorial 2<sup>(k-p)</sup> DOE Configuration</CardTitle>
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
                    
                    {factors.length < 3 && (
                      <div className="text-sm text-destructive">
                        At least 3 factors are required for Fractional Factorial DOE
                      </div>
                    )}
                    
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Factor Name</TableHead>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead className="w-[150px]">Low Value / Level 1</TableHead>
                            <TableHead className="w-[150px]">High Value / Level 2</TableHead>
                            <TableHead className="w-[120px]">Units</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
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
                                    placeholder="Low Value"
                                    data-testid={`input-factor-low-${index}`}
                                  />
                                ) : (
                                  <Input
                                    value={factor.levels[0] || ''}
                                    onChange={(e) => handleFactorChange(index, 'level0', e.target.value)}
                                    placeholder="Level 1"
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
                                    placeholder="High Value"
                                    data-testid={`input-factor-high-${index}`}
                                  />
                                ) : (
                                  <Input
                                    value={factor.levels[1] || ''}
                                    onChange={(e) => handleFactorChange(index, 'level1', e.target.value)}
                                    placeholder="Level 2"
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

                  {/* Design Choice */}
                  {(() => {
                    const k = factors.length;
                    const choices = getDesignChoices(k);
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="design-choice" className="text-lg font-semibold">Design Selection</Label>
                        <Select value={designChoice} onValueChange={setDesignChoice}>
                          <SelectTrigger id="design-choice" data-testid="select-design-choice">
                            <SelectValue placeholder="Select design type" />
                          </SelectTrigger>
                          {/*<SelectContent>
                            <SelectItem value="auto" data-testid="option-design-auto">Auto-detect based on factors</SelectItem>
                            {k >= 3 && k <= 7 && choices.length > 0 && (
                              <>
                                {choices.map((item) => (
                                  <SelectItem 
                                    key={`design-${item.p}`} 
                                    value={item.p.toString()} 
                                    data-testid={`option-design-p-${item.p}`}
                                  >
                                    2<sup>({k}-{item.p})</sup> Resolution {toRoman(item.p === 0 ? (k === 3 ? 3 : 4) : (2 ** (k - item.p) === 8 ? 3 : 4))} ({2 ** (k - item.p)} runs)
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent> */}
                          <SelectContent>
                            {k === 3 && <SelectItem value="1">2<sup>(3-1)</sup> Resolution III (4 runs)</SelectItem>}
                            {k === 4 && <SelectItem value="1">2<sup>(4-1)</sup> Resolution IV (8 runs)</SelectItem>}
                            {k === 5 && <SelectItem value="1">2<sup>(5-1)</sup> Resolution V (16 runs)</SelectItem>}
                            {k === 5 && <SelectItem value="2">2<sup>(5-2)</sup> Resolution III (8 runs)</SelectItem>}
                            {k === 6 && <SelectItem value="1">2<sup>(6-1)</sup> Resolution VI (32 runs)</SelectItem>}
                            {k === 6 && <SelectItem value="2">2<sup>(6-2)</sup> Resolution IV (16 runs)</SelectItem>}
                            {k === 6 && <SelectItem value="3">2<sup>(6-3)</sup> Resolution III (8 runs)</SelectItem>}
                            {k === 7 && <SelectItem value="1">2<sup>(7-1)</sup> Resolution VII (64 runs)</SelectItem>}
                            {k === 7 && <SelectItem value="2">2<sup>(7-2)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 7 && <SelectItem value="3">2<sup>(7-3)</sup> Resolution IV (16 runs)</SelectItem>}
                            {k === 7 && <SelectItem value="4">2<sup>(7-4)</sup> Resolution III (8 runs)</SelectItem>}
                            {k === 8 && <SelectItem value="1">2<sup>(8-1)</sup> Resolution VIII (128 runs)</SelectItem>}
                            {k === 8 && <SelectItem value="2">2<sup>(8-2)</sup> Resolution V (64 runs)</SelectItem>}
                            {k === 8 && <SelectItem value="3">2<sup>(8-3)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 8 && <SelectItem value="4">2<sup>(8-4)</sup> Resolution IV (16 runs)</SelectItem>}
                            {k === 9 && <SelectItem value="2">2<sup>(9-2)</sup> Resolution VI (128 runs)</SelectItem>}
                            {k === 9 && <SelectItem value="3">2<sup>(9-3)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 9 && <SelectItem value="4">2<sup>(9-4)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 9 && <SelectItem value="5">2<sup>(9-5)</sup> Resolution III (16 runs)</SelectItem>}
                            {k === 10 && <SelectItem value="3">2<sup>(10-3)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 10 && <SelectItem value="4">2<sup>(10-4)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 10 && <SelectItem value="5">2<sup>(10-5)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 10 && <SelectItem value="6">2<sup>(10-6)</sup> Resolution III (16 runs)</SelectItem>}
                            {k === 11 && <SelectItem value="4">2<sup>(11-4)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 11 && <SelectItem value="5">2<sup>(11-5)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 11 && <SelectItem value="6">2<sup>(11-6)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 11 && <SelectItem value="7">2<sup>(11-7)</sup> Resolution III (16 runs)</SelectItem>}
                            {k === 12 && <SelectItem value="5">2<sup>(12-5)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 12 && <SelectItem value="6">2<sup>(12-6)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 12 && <SelectItem value="7">2<sup>(12-7)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 12 && <SelectItem value="8">2<sup>(12-8)</sup> Resolution IV (16 runs)</SelectItem>}
                            {/*{k === 13 && <SelectItem value="6">2<sup>(13-6)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 13 && <SelectItem value="7">2<sup>(13-7)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 13 && <SelectItem value="8">2<sup>(13-8)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 13 && <SelectItem value="9">2<sup>(13-9)</sup> Resolution IV (16 runs)</SelectItem>}
                            {k === 14 && <SelectItem value="7">2<sup>(14-7)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 14 && <SelectItem value="8">2<sup>(14-8)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 14 && <SelectItem value="9">2<sup>(14-9)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 14 && <SelectItem value="10">2<sup>(14-10)</sup> Resolution IV (16 runs)</SelectItem>}
                            {k === 15 && <SelectItem value="8">2<sup>(15-8)</sup> Resolution V (128 runs)</SelectItem>}
                            {k === 15 && <SelectItem value="9">2<sup>(15-9)</sup> Resolution IV (64 runs)</SelectItem>}
                            {k === 15 && <SelectItem value="10">2<sup>(15-10)</sup> Resolution IV (32 runs)</SelectItem>}
                            {k === 15 && <SelectItem value="11">2<sup>(15-11)</sup> Resolution IV (16 runs)</SelectItem>} */}
                            {k > 12 && getDesignChoices(k).map((opt) => (
                              <SelectItem key={opt.p} value={opt.p.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                  
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
                      disabled={saveConfigMutation.isPending}
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
                          Save Setup
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
              {factors.length < 3 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Please configure at least 3 factors in the Setup tab before generating the Fractional Factorial DOE plan.</p>
                </div>
              ) : (
                <>
                  {!generatedPlan ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Click the button below to generate the Fractional Factorial DOE experimental plan based on your factor configuration.
                      </p>
                      <Button
                        onClick={handleGeneratePlan}
                        data-testid="button-generate-plan"
                      >
                        Generate Fractional Factorial Plan
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{generatedPlan.designType}</h3>
                        <p className="text-sm text-muted-foreground">
                          {generatedPlan.definingRelation && (
                            <>
                              Defining Relation: {generatedPlan.definingRelation}
                              {generatedPlan.generators && generatedPlan.generators.length > 0 && (
                                <> • Generators: {generatedPlan.generators.join(', ')}</>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Runs: {generatedPlan.plan.length}
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
                                  {getFactorDisplayName(factor, index)}
                                </TableHead>
                              ))}
                              <TableHead className="w-[150px]">{responseVariableName.trim() || "Y Response"}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedPlan.plan.map((planRow: any, rowIndex: number) => {
                              const response = responses[planRow.runOrder.toString()];
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
                                      value={responseInputs[planRow.runOrder] ?? (response !== null && response !== undefined ? String(response) : '')}
                                      onChange={(e) => handleResponseChange(rowIndex, e.target.value)}
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
                              Save Data
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
                // Helper: Get unique levels for a factor
                const getFactorLevels = (factorName: string): Set<number> => {
                  const levels = new Set<number>();
                  generatedPlan.plan.forEach((row: any) => {
                    const level = row?.[factorName];
                    if (level !== undefined && level !== null) {
                      levels.add(level);
                    }
                  });
                  return levels;
                };

                // Calculate min/max across ALL data (main effects + interactions)
                const allValues: number[] = [];
                const centerLevels = includeCenterPoints ? [-1, 0, 1] : [-1, 1];
                
                // Collect main effect values
                factors.forEach((factor) => {
                  const factorLevels = getFactorLevels(factor.name);
                  const levelsToCheck = Array.from(factorLevels).filter(level => centerLevels.includes(level));
                  
                  levelsToCheck.forEach(level => {
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
                    const factorALevels = getFactorLevels(factorA.name);
                    const factorBLevels = getFactorLevels(factorB.name);
                    const levelsAToCheck = Array.from(factorALevels).filter(level => [-1, 1].includes(level));
                    const levelsBToCheck = Array.from(factorBLevels).filter(level => centerLevels.includes(level));
                    
                    levelsAToCheck.forEach(levelA => {
                      levelsBToCheck.forEach(levelB => {
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
                    
                    // Get unique levels for this factor
                    const factorUniqueLevels = getFactorLevels(factor.name);
                    const factorLevelsArray = Array.from(factorUniqueLevels).filter(level => [-1, 0, 1].includes(level)).sort();
                    const hasOnlyOneLevel = factorLevelsArray.length === 1;

                    const lineLevels = hasOnlyOneLevel ? [factorLevelsArray[0]] : [-1, 1].filter(l => factorUniqueLevels.has(l));
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
                      : lineLevels.map(level => level === -1 ? 'Low (-1)' : level === 1 ? 'High (+1)' : 'Center (0)');

                    const xTickVals = includeCenterPoints ? [-1, 0, 1] : [-1, 1];
                    const xTickText = includeCenterPoints
                      ? [showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(-1, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'Low (-1)', showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(0, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'Center (0)', showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(1, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'High (+1)']
                      : [showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(-1, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'Low (-1)', showUncoded && allFactorsHaveValidLevels()
                          ? (() => {
                              const decoded = decodeValue(1, factor);
                              return factor.type === 'continuous'
                                ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                                : String(decoded);
                            })()
                          : 'High (+1)'];

                    const plotData = [
                      {
                        x: lineLevels,
                        y: lineData,
                        type: 'scatter',
                        mode: hasOnlyOneLevel ? 'markers' : 'lines+markers',
                        line: hasOnlyOneLevel ? {} : { width: 3, color: '#3b82f6' },
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
                              // Check if interaction is confounded FIRST - before building any traces
                              // Use k and p from plan if available, otherwise assume full factorial
                              let numBaseFactors = factors.length;
                              if (generatedPlan && generatedPlan.k !== undefined && generatedPlan.p !== undefined) {
                                numBaseFactors = generatedPlan.k - generatedPlan.p;
                              }
                              
                              const factorAIdx = factors.indexOf(factorA);
                              const factorBIdx = factors.indexOf(factorB);
                              const isInteractionConfounded = factorAIdx >= numBaseFactors || factorBIdx >= numBaseFactors;
                              
                              console.log(`Interaction ${factorA.name}×${factorB.name}: generatedPlan=${!!generatedPlan}, k=${generatedPlan?.k}, p=${generatedPlan?.p}, numBaseFactors=${numBaseFactors}, idxA=${factorAIdx}, idxB=${factorBIdx}, confounded=${isInteractionConfounded}`);
                              
                              // Get unique levels for both factors
                              const factorAUniqueLevels = getFactorLevels(factorA.name);
                              const factorBUniqueLevels = getFactorLevels(factorB.name);
                              
                              const factorAHasOneLevel = factorAUniqueLevels.size === 1;
                              const factorBHasOneLevel = factorBUniqueLevels.size === 1;
                              
                              // If either factor has only one level OR interaction is confounded, show message EARLY
                              if (factorAHasOneLevel || factorBHasOneLevel || isInteractionConfounded) {
                                let message = '';
                                if (isInteractionConfounded) {
                                  message = `This fractional factorial design does not have enough degrees of freedom to estimate ${factorA.name}×${factorB.name} interaction independently. It is confounded with other effects.`;
                                } else {
                                  const confoundedFactor = factorAHasOneLevel ? factorA.name : factorB.name;
                                  message = `Factor ${confoundedFactor} has only one level in this fraction, so the interaction between ${factorA.name} and ${factorB.name} cannot be estimated.`;
                                }
                                return (
                                  <Card key={`${idxA}-${idxB}`}>
                                    <CardHeader>
                                      <CardTitle>Interaction: {factorA.name} × {factorB.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 text-center text-muted-foreground">
                                      <p className="text-sm">
                                        This interaction is <strong>confounded</strong> due to the fractional design.
                                      </p>
                                      <p className="text-sm mt-2">
                                        {message}
                                      </p>
                                    </CardContent>
                                  </Card>
                                );
                              }
                              
                              const interactionTraces: any[] = [];
                              
                              // For lines/markers logic: if either factor has only one level, show markers only
                              const showLinesInInteraction = !factorAHasOneLevel && !factorBHasOneLevel;

                              // Add line/marker traces 
                              const levelsA = Array.from(factorAUniqueLevels).filter(level => [-1, 1].includes(level)).sort();
                              levelsA.forEach(levelA => {
                                // For lines, only use -1 and +1 (not center points)
                                const levelsB = [-1, 1];
                                const lineData = levelsB.map(levelB => {
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

                                const lineXLabels = showUncoded && allFactorsHaveValidLevels()
                                  ? levelsB.map(level => {
                                      const decoded = decodeValue(level, factorB);
                                      return factorB.type === 'continuous'
                                        ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                        : String(decoded);
                                    })
                                  : levelsB.map(level => level === -1 ? 'Low (-1)' : level === 1 ? 'High (+1)' : 'Center (0)');

                                interactionTraces.push({
                                  x: levelsB,
                                  y: lineData,
                                  type: 'scatter',
                                  mode: showLinesInInteraction ? 'lines+markers' : 'markers',
                                  name: `${factorA.name} = ${levelALabel}`,
                                  line: showLinesInInteraction ? { width: 2 } : {},
                                  marker: { size: 8 },
                                  hovertemplate: '%{text}<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                                  text: lineXLabels,
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
                                centerPointCombinations.forEach((combo) => {
                                  // For interaction plot, we need center points at factorA=0, factorB=0
                                  const filterCondition: Record<string, number> = {
                                    [factorA.name]: 0,
                                    [factorB.name]: 0,
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
                                  
                                  const centerXLabel = showUncoded && allFactorsHaveValidLevels()
                                    ? (() => {
                                        const decoded = decodeValue(0, factorB);
                                        return factorB.type === 'continuous'
                                          ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                          : String(decoded);
                                      })()
                                    : 'Center (0)';
                                  
                                  const centerLabel = `Center: ${Object.entries(combo.labels).map(([f, l]) => `${f}=${l}`).join(', ')}`;
                                  
                                  interactionTraces.push({
                                    x: [0],
                                    y: [centerValue],
                                    type: 'scatter',
                                    mode: 'markers',
                                    name: centerLabel,
                                    marker: { size: 8, color: '#ef4444' },
                                    showlegend: true,
                                    hovertemplate: centerXLabel + '<br>' + (responseVariableName || 'Y Response') + ': %{y:.3f}<extra></extra>',
                                  });
                                });
                              }

                              // Generate x-axis tick labels: show center point only if included
                              const xTickVals = includeCenterPoints ? [-1, 0, 1] : [-1, 1];
                              const xTickLabels = includeCenterPoints
                                ? (showUncoded && allFactorsHaveValidLevels()
                                    ? [-1, 0, 1].map(level => {
                                        const decoded = decodeValue(level, factorB);
                                        return factorB.type === 'continuous'
                                          ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                          : String(decoded);
                                      })
                                    : ['Low (-1)', 'Center (0)', 'High (+1)'])
                                : (showUncoded && allFactorsHaveValidLevels()
                                    ? [-1, 1].map(level => {
                                        const decoded = decodeValue(level, factorB);
                                        return factorB.type === 'continuous'
                                          ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                          : String(decoded);
                                      })
                                    : ['Low (-1)', 'High (+1)']);

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
                                        xaxis: { title: { text: factorB.name }, type: 'linear', tickmode: 'array', tickvals: xTickVals, ticktext: xTickLabels },
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

              {(() => {
                // Regression Analysis with Interactions - accounting for confounding
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

                // Get metadata from generatedPlan
                const ffMetadata = generatedPlan.metadata;
                const k = ffMetadata?.k || factors.length;
                const p = ffMetadata?.p || 0;
                const resolution = ffMetadata?.resolution || 5;
                const baseFactorCount = k - p;

                // Build interaction terms - only between base factors (unconfounded)
                const interactionPairs: Array<{i: number, j: number, name: string}> = [];
                for (let i = 0; i < baseFactorCount; i++) {
                  for (let j = i + 1; j < baseFactorCount; j++) {
                    interactionPairs.push({i, j, name: `${factors[i].name}×${factors[j].name}`});
                  }
                }

                const X: number[][] = [];
                const y: number[] = [];
                
                runData.forEach((row, idx) => {
                  if (row.response !== null && !isNaN(row.response)) {
                    const row_vals = [1]; // intercept = grand mean
                    const baseFactorValues: number[] = [];
                    // Only use base factors (first k-p factors)
                    for (let i = 0; i < baseFactorCount; i++) {
                      const val = generatedPlan.plan[idx]?.[factors[i].name] ?? 0;
                      baseFactorValues.push(val);
                      row_vals.push(val);
                    }
                    // Add interaction terms (only between base factors)
                    interactionPairs.forEach(pair => {
                      row_vals.push(baseFactorValues[pair.i] * baseFactorValues[pair.j]);
                    });
                    X.push(row_vals);
                    y.push(row.response);
                  }
                });

                const n = y.length;
                const numCoefficients = X[0].length;
                const mean_y = y.reduce((a, b) => a + b, 0) / n;
                const SS_tot = y.reduce((sum, val) => sum + Math.pow(val - mean_y, 2), 0);

                // Calculate X'X and X'y
                let XtX: number[][] = Array(numCoefficients).fill(null).map(() => Array(numCoefficients).fill(0));
                let Xty: number[] = Array(numCoefficients).fill(0);

                for (let i = 0; i < n; i++) {
                  for (let j = 0; j < numCoefficients; j++) {
                    Xty[j] += X[i][j] * y[i];
                    for (let k = 0; k < numCoefficients; k++) {
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
                
                // Ensure beta contains valid numbers
                if (!beta.every(b => Number.isFinite(b))) {
                  beta = Array(numCoefficients).fill(0);
                  beta[0] = mean_y;
                }

                const predictions = X.map(row => row.reduce((sum, val, i) => sum + val * beta[i], 0));
                const residuals = y.map((val, i) => val - predictions[i]);
                const SS_res = residuals.reduce((sum, val) => sum + Math.pow(val, 2), 0);
                const R_sq = 1 - SS_res / SS_tot;
                const adj_R_sq = 1 - (1 - R_sq) * (n - 1) / (n - numCoefficients);
                const rmse = Math.sqrt(SS_res / (n - numCoefficients));
                const residualMean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
                const residualStd = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / (residuals.length - 1));
                const mse = SS_res / (n - numCoefficients);
                
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
                  const pValue = stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(tValue), n - numCoefficients)) : 1;
                  return { stdError, tValue, pValue };
                });

                // Transform coefficients and standard errors from coded to uncoded if needed
                const transformCoefficientsAndSE = () => {
                  if (!showUncoded || !allFactorsHaveValidLevels()) {
                    return { displayBeta: beta, displayCoeffStats: coeffStats };
                  }
                  
                  const transformed = [...beta];
                  const transformedStats = coeffStats.map(s => ({ ...s }));
                  let interceptAdjustment = 0;
                  
                  for (let i = 0; i < factors.length; i++) {
                    const factor = factors[i];
                    if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                      const low = parseFloat(String(factor.lowValue));
                      const high = parseFloat(String(factor.highValue));
                      if (!isNaN(low) && !isNaN(high)) {
                        const center = (low + high) / 2;
                        const halfRange = (high - low) / 2;
                        
                        if (Number.isFinite(beta[i + 1])) {
                          transformed[i + 1] = beta[i + 1] / halfRange;
                          // SE_uncoded = SE_coded / halfRange
                          if (transformedStats[i + 1]) {
                            transformedStats[i + 1].stdError = coeffStats[i + 1].stdError / halfRange;
                            // t-value remains the same since t = beta / SE
                            transformedStats[i + 1].tValue = transformed[i + 1] / transformedStats[i + 1].stdError;
                          }
                          interceptAdjustment += beta[i + 1] * center / halfRange;
                        }
                      }
                    }
                  }
                  
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
                        const interactionCoeffIdx = factors.length + 1 + i;
                        if (Number.isFinite(beta[interactionCoeffIdx])) {
                          transformed[interactionCoeffIdx] = beta[interactionCoeffIdx] / (halfRange1 * halfRange2);
                          // SE_uncoded_interaction = SE_coded_interaction / (halfRange1 * halfRange2)
                          if (transformedStats[interactionCoeffIdx]) {
                            transformedStats[interactionCoeffIdx].stdError = coeffStats[interactionCoeffIdx].stdError / (halfRange1 * halfRange2);
                            transformedStats[interactionCoeffIdx].tValue = transformed[interactionCoeffIdx] / transformedStats[interactionCoeffIdx].stdError;
                          }
                        }
                      }
                    }
                  }
                  
                  // Transform intercept SE as well
                  if (transformedStats[0]) {
                    transformedStats[0].tValue = (beta[0] - interceptAdjustment) / transformedStats[0].stdError;
                  }
                  
                  transformed[0] = beta[0] - interceptAdjustment;
                  
                  // If transformation resulted in non-finite values, use coded instead
                  if (!transformed.every(v => Number.isFinite(v))) {
                    return { displayBeta: beta, displayCoeffStats: coeffStats };
                  }
                  return { displayBeta: transformed, displayCoeffStats: transformedStats };
                };
                
                const { displayBeta, displayCoeffStats } = transformCoefficientsAndSE();
                
                const handleSolve = () => {
                  if (baseFactorCount < 1 || displayBeta[solveFactorIdx + 1] === 0) return;
                  let constraintSum = 0;
                  for (let i = 0; i < factors.length; i++) {
                    if (i !== solveFactorIdx) {
                      const constraintVal = constraintValues[i];
                      if (constraintVal !== null && constraintVal !== undefined && Number.isFinite(constraintVal)) {
                        constraintSum += displayBeta[i + 1] * constraintVal;
                      }
                    }
                  }
                  let result = (targetY - displayBeta[0] - constraintSum) / displayBeta[solveFactorIdx + 1];
                  setSolverResult(result);
                };

                // Store solve function in ref so top-level useEffect can call it
                solveRef.current = handleSolve;

                return (
                  <>
                    {/* Regression Equation */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Regression Model {showUncoded && allFactorsHaveValidLevels() ? '(Uncoded)' : '(Coded)'}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded font-mono text-sm">
                          <p>Y = {Number.isFinite(displayBeta[0]) ? displayBeta[0].toFixed(4) : 'N/A'}</p>
                          {Array.from({length: baseFactorCount}).map((_, i) => (
                            Number.isFinite(displayBeta[i + 1]) && (
                              <p key={i}>
                                &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[i + 1] >= 0 ? '+' : ''} {displayBeta[i + 1].toFixed(4)} × {factors[i].name}{factors[i].type === 'continuous' && factors[i].units ? ` (${factors[i].units})` : ''}
                              </p>
                            )
                          ))}
                          {interactionPairs.map((pair, i) => (
                            Number.isFinite(displayBeta[baseFactorCount + 1 + i]) && (
                              <p key={`int-${i}`}>
                                &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[baseFactorCount + 1 + i] >= 0 ? '+' : ''} {displayBeta[baseFactorCount + 1 + i].toFixed(4)} × {pair.name}
                              </p>
                            )
                          ))}
                          {displayBeta.every(v => !Number.isFinite(v)) && (
                            <p className="text-muted-foreground">Unable to compute regression equation. Check data validity.</p>
                          )}
                          {p > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">Note: Generated factors (last {p}) are confounded and not shown.</p>
                          )}
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
                                let rows: React.ReactNode[] = [];
                                
                                // Add base factor rows only (not confounded)
                                for (let i = 0; i < baseFactorCount; i++) {
                                  const factor = factors[i];
                                  const termIdx = i + 1;
                                  const termSS = Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                                  const termDF = 1;
                                  const termMS = termSS / termDF;
                                  const errorMS = SS_res / (n - p);
                                  const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                                  const pValue = fRatio > 0 && (n - p) > 0 
                                    ? 1 - jStat.centralF.cdf(fRatio, termDF, n - p) 
                                    : 1;

                                  rows.push(
                                    <TableRow key={`factor-${i}`}>
                                      <TableCell className="font-medium">{factor.name}</TableCell>
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
                                }

                                // Add interaction rows (only between base factors)
                                interactionPairs.forEach((pair, pairIdx) => {
                                  const termIdx = baseFactorCount + 1 + pairIdx;
                                  const termSS = Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                                  const termDF = 1;
                                  const termMS = termSS / termDF;
                                  const errorMS = SS_res / (n - p);
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

                                // Calculate curvature effect if center points exist AND are included in model
                                if (includeCenterPoints && selectedFactorsForModel['centerPoint'] !== false) {
                                  const centerPointIndices: number[] = [];
                                  const factorialPointIndices: number[] = [];
                                  
                                  runData.forEach((row, rowIdx) => {
                                    if (row.response !== null && !isNaN(row.response)) {
                                      const allBaseFactorsZero = Array.from({length: baseFactorCount}).every((_,i) => {
                                        const level = generatedPlan.plan[rowIdx]?.[factors[i].name] ?? 0;
                                        return Math.abs(level) < 0.01;
                                      });
                                      if (allBaseFactorsZero) {
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
                                    const y_f_at_center = beta[0];
                                    const curveEffect = y_c_avg - y_f_at_center;
                                    const curveSS = (n_c * n_f / (n_c + n_f)) * Math.pow(curveEffect, 2);
                                    const curveDF = 1;
                                    const curveMS = curveSS / curveDF;
                                    const errorMS = SS_res / (n - p);
                                    const curveFRatio = errorMS > 0 ? curveMS / errorMS : 0;
                                    const curvePValue = curveFRatio > 0 && (n - p) > 0 
                                      ? 1 - jStat.centralF.cdf(curveFRatio, curveDF, n - p) 
                                      : 1;

                                    rows.push(
                                      <TableRow key="curvature">
                                        <TableCell className="font-medium">Curvature</TableCell>
                                        <TableCell className="text-right">{curveDF}</TableCell>
                                        <TableCell className="text-right">{curveSS.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{curveMS.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{curveFRatio.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">
                                          <span className={curvePValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                            {curvePValue.toFixed(4)}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                }

                                // Add model row
                                const numTerms = 1 + baseFactorCount + interactionPairs.length;
                                const modelDF = numTerms - 1;
                                const modelMS = (SS_tot - SS_res) / modelDF;
                                const errorMS = SS_res / (n - numTerms);
                                const modelFRatio = errorMS > 0 ? modelMS / errorMS : 0;
                                const modelPValue = modelFRatio > 0 && (n - numTerms) > 0 
                                  ? 1 - jStat.centralF.cdf(modelFRatio, modelDF, n - numTerms) 
                                  : 1;

                                rows.push(
                                  <TableRow key="model" className="font-semibold">
                                    <TableCell>Model</TableCell>
                                    <TableCell className="text-right">{modelDF}</TableCell>
                                    <TableCell className="text-right">{(SS_tot - SS_res).toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{modelMS.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{modelFRatio.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={modelPValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                        {modelPValue.toFixed(4)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );

                                // Add error row
                                const errorDF = n - numTerms;
                                const errorMSVal = SS_res / errorDF;

                                rows.push(
                                  <TableRow key="error">
                                    <TableCell>Error</TableCell>
                                    <TableCell className="text-right">{errorDF}</TableCell>
                                    <TableCell className="text-right">{SS_res.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{errorMSVal.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                );

                                // Add total row
                                rows.push(
                                  <TableRow key="total" className="font-semibold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{n - 1}</TableCell>
                                    <TableCell className="text-right">{SS_tot.toFixed(4)}</TableCell>
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
                                <TableCell className="text-right">{displayCoeffStats[0]?.stdError.toFixed(4)}</TableCell>
                                <TableCell className="text-right">{displayCoeffStats[0]?.tValue.toFixed(4)}</TableCell>
                                <TableCell className={`text-right ${(displayCoeffStats[0]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{displayCoeffStats[0]?.pValue.toFixed(4)}</TableCell>
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
                                  <TableCell className="text-right">{displayCoeffStats[i + 1]?.stdError.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{displayCoeffStats[i + 1]?.tValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${(displayCoeffStats[i + 1]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{displayCoeffStats[i + 1]?.pValue.toFixed(4)}</TableCell>
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
                                  <TableCell className="text-right">{displayCoeffStats[factors.length + 1 + i]?.stdError.toFixed(4)}</TableCell>
                                  <TableCell className="text-right">{displayCoeffStats[factors.length + 1 + i]?.tValue.toFixed(4)}</TableCell>
                                  <TableCell className={`text-right ${(displayCoeffStats[factors.length + 1 + i]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{displayCoeffStats[factors.length + 1 + i]?.pValue.toFixed(4)}</TableCell>
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
