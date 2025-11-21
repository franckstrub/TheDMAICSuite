import { useState, useEffect, useRef } from 'react';
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
  parseFactorValue
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
  const [fractionalResolution, setFractionalResolution] = useState(1);
  const [responseVariableName, setResponseVariableName] = useState("Y Response");
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
  const [runData, setRunData] = useState<Array<{
    run: number;
    factors: number[];
    response: number | null;
  }>>([]);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  // UI state for raw string inputs for responses (allows partial numbers like "-", "0.", "1,5")
  const [responseInputs, setResponseInputs] = useState<Record<number, string>>({});
  const [showUncoded, setShowUncoded] = useState(false); // false = coded, true = uncoded
  
  // Solver state for Analysis tab
  const [solveFactorIdx, setSolveFactorIdx] = useState(0);
  const [targetY, setTargetY] = useState(100);
  const [solverResult, setSolverResult] = useState<number | null>(null);
  const [constraintValues, setConstraintValues] = useState<Record<number, number | null>>({});
  
  // Model reduction - track which factors to include (all enabled by default)
  const [selectedFactorsForModel, setSelectedFactorsForModel] = useState<Record<number, boolean>>(
    {}
  );
  
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
      const plan = generateFractionalFactorialPlan(factors, fractionalResolution, centerPoints, randomizeRuns, numberOfReplicates);
      
      setGeneratedPlan(plan);
      
      // Preserve existing response values where possible (match by run order)
      const existingResponseMap = new Map(runData.map(rd => [rd.run, rd.response]));
      
      const newRunData = plan.plan.map((row: any, index: number) => ({
        run: row.runOrder,
        factors: factors.map(f => row[f.name] as number),
        response: existingResponseMap.get(row.runOrder) ?? null,
      }));
      
      setRunData(newRunData);
    }
  }, [activeTab, factors, fractionalResolution, includeCenterPoints, numberOfCenterPoints, randomizeRuns, numberOfReplicates]);
  
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
      
      if (config.fractionalResolution !== undefined) {
        setFractionalResolution(config.fractionalResolution);
      }
      
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
      
      if (config.runData && Array.isArray(config.runData)) {
        setRunData(config.runData);
        // Initialize responseInputs from loaded response values
        const inputs: Record<number, string> = {};
        config.runData.forEach((rd: any) => {
          if (rd.response !== null && rd.response !== undefined) {
            inputs[rd.run] = String(rd.response);
          }
        });
        setResponseInputs(inputs);
      }
      
      // Load generatedPlan from persisted format
      if (config.generatedPlan && Array.isArray(config.generatedPlan)) {
        const reconstructedPlan = reconstructGeneratedPlanFromPersisted(
          config.generatedPlan,
          config.factors || factors,
          'Fractional Factorial'
        );
        if (reconstructedPlan) {
          setGeneratedPlan(reconstructedPlan);
        }
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
    
    saveConfigMutation.mutate({
      fractionalResolution,
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors),
    });
  };
  
  const handleSaveData = () => {
    saveConfigMutation.mutate({
      fractionalResolution,
      responseVariableName,
      factors,
      numberOfReplicates,
      randomizeRuns,
      includeCenterPoints,
      numberOfCenterPoints,
      significanceLevel,
      showUncoded,
      runData,
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors),
    });
  };
  
  const handleAddFactor = () => {
    const newFactorIndex = factors.length + 1;
    if (newFactorIndex >= 12) {
      setFractionalResolution(5 + (newFactorIndex - 12));
    }
    else if (newFactorIndex >= 9) {
      setFractionalResolution(newFactorIndex - 7);
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
    const plan = generateFractionalFactorialPlan(factors, fractionalResolution, centerPoints, randomizeRuns, numberOfReplicates);
    
    setGeneratedPlan(plan);
    
    const newRunData = plan.plan.map((row: any, index: number) => ({
      run: row.runOrder,
      factors: factors.map(f => row[f.name] as number),
      response: null,
    }));
    
    setRunData(newRunData);
    
    toast({
      title: "Fractional Factorial DOE Plan Generated",
      description: `Generated ${plan.plan.length} experimental runs.`,
    });
  };
  
  const handleResponseChange = (runIndex: number, value: string) => {
    const runOrderKey = runData[runIndex]?.run;
    
    // Store raw string in UI state
    setResponseInputs(prev => ({
      ...prev,
      [runOrderKey]: value
    }));
    
    // Parse and store numeric value in runData
    const newRunData = [...runData];
    const parsedValue = parseNumericValue(value);
    newRunData[runIndex].response = isNaN(parsedValue) ? null : parsedValue;
    setRunData(newRunData);
  };

  const generateFractionalOptions = (k: number) => {
    if ( k < 13) {
      return [];
    }      
    const minP = k - 7;
    const maxP = minP + 3;
    const items = [];

    for (let p = minP; p <= maxP; p++) {
      const runs = 2 ** (k - p);
      const resolutionNum = runs === 16 ? 3 : 4 ;
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

                  {/* Fractional Factorial Resolution */}
                  <div className="space-y-2">
                    <Label htmlFor="fractional-resolution">Fractional Selection & Resolution</Label>
                    {factors.length >= 3 ? (
                      <>
                        <Select
                          value={fractionalResolution.toString()}
                          onValueChange={(value) => setFractionalResolution(parseInt(value))}
                        >
                          <SelectTrigger id="fractional-resolution" data-testid="select-fractional-resolution">
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>

                          {/*<SelectContent>
                            {generateFractionalOptions(factors.length).map((opt) => (
                              <SelectItem key={opt.p} value={opt.p.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>*/}

                          <SelectContent>
                            {factors.length === 3 && <SelectItem value="1">2<sup>(3-1)</sup> Resolution III (4 runs)</SelectItem>}
                            {factors.length === 4 && <SelectItem value="1">2<sup>(4-1)</sup> Resolution IV (8 runs)</SelectItem>}
                            {factors.length === 5 && <SelectItem value="1">2<sup>(5-1)</sup> Resolution V (16 runs)</SelectItem>}
                            {factors.length === 5 && <SelectItem value="2">2<sup>(5-2)</sup> Resolution III (8 runs)</SelectItem>}
                            {factors.length === 6 && <SelectItem value="1">2<sup>(6-1)</sup> Resolution VI (32 runs)</SelectItem>}
                            {factors.length === 6 && <SelectItem value="2">2<sup>(6-2)</sup> Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 6 && <SelectItem value="3">2<sup>(6-3)</sup> Resolution III (8 runs)</SelectItem>}
                            {factors.length === 7 && <SelectItem value="1">2<sup>(7-1)</sup> Resolution VII (64 runs)</SelectItem>}
                            {factors.length === 7 && <SelectItem value="2">2<sup>(7-2)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 7 && <SelectItem value="3">2<sup>(7-3)</sup> Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 7 && <SelectItem value="4">2<sup>(7-4)</sup> Resolution III (8 runs)</SelectItem>}
                            {factors.length === 8 && <SelectItem value="1">2<sup>(8-1)</sup> Resolution VIII (128 runs)</SelectItem>}
                            {factors.length === 8 && <SelectItem value="2">2<sup>(8-2)</sup> Resolution V (64 runs)</SelectItem>}
                            {factors.length === 8 && <SelectItem value="3">2<sup>(8-3)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 8 && <SelectItem value="4">2<sup>(8-4)</sup> Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 9 && <SelectItem value="2">2<sup>(9-2)</sup> Resolution VI (128 runs)</SelectItem>}
                            {factors.length === 9 && <SelectItem value="3">2<sup>(9-3)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 9 && <SelectItem value="4">2<sup>(9-4)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 9 && <SelectItem value="5">2<sup>(9-5)</sup> Resolution III (16 runs)</SelectItem>}
                            {factors.length === 10 && <SelectItem value="3">2<sup>(10-3)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 10 && <SelectItem value="4">2<sup>(10-4)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 10 && <SelectItem value="5">2<sup>(10-5)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 10 && <SelectItem value="6">2<sup>(10-6)</sup> Resolution III (16 runs)</SelectItem>}
                            {factors.length === 11 && <SelectItem value="4">2<sup>(11-4)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 11 && <SelectItem value="5">2<sup>(11-5)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 11 && <SelectItem value="6">2<sup>(11-6)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 11 && <SelectItem value="7">2<sup>(11-7)</sup> Resolution III (16 runs)</SelectItem>}
                            {factors.length === 12 && <SelectItem value="5">2<sup>(12-5)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 12 && <SelectItem value="6">2<sup>(12-6)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 12 && <SelectItem value="7">2<sup>(12-7)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 12 && <SelectItem value="8">2<sup>(12-8)</sup> Resolution IV (16 runs)</SelectItem>}
                            {/*{factors.length === 13 && <SelectItem value="6">2<sup>(13-6)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 13 && <SelectItem value="7">2<sup>(13-7)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 13 && <SelectItem value="8">2<sup>(13-8)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 13 && <SelectItem value="9">2<sup>(13-9)</sup> Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 14 && <SelectItem value="7">2<sup>(14-7)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 14 && <SelectItem value="8">2<sup>(14-8)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 14 && <SelectItem value="9">2<sup>(14-9)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 14 && <SelectItem value="10">2<sup>(14-10)</sup> Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 15 && <SelectItem value="8">2<sup>(15-8)</sup> Resolution V (128 runs)</SelectItem>}
                            {factors.length === 15 && <SelectItem value="9">2<sup>(15-9)</sup> Resolution IV (64 runs)</SelectItem>}
                            {factors.length === 15 && <SelectItem value="10">2<sup>(15-10)</sup> Resolution IV (32 runs)</SelectItem>}
                            {factors.length === 15 && <SelectItem value="11">2<sup>(15-11)</sup> Resolution IV (16 runs)</SelectItem>} */}
                            {factors.length > 12 && generateFractionalOptions(factors.length).map((opt) => (
                              <SelectItem key={opt.p} value={opt.p.toString()}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                          The fractional design reduces experimental runs while maintaining analysis capability.
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                        Fractional factorial designs require at least 3 factors. Add more factors below.
                      </div>
                    )}
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
                        {generatedPlan.definingRelation && (
                          <p className="text-sm text-muted-foreground">
                            Defining Relation: {generatedPlan.definingRelation}
                          </p>
                        )}
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
                                  {getFactorDisplayName(factor, index)}
                                </TableHead>
                              ))}
                              <TableHead className="w-[150px]">{responseVariableName.trim() || "Y Response"}</TableHead>
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

              {/* Main Effect Plots */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {factors.map((factor, factorIndex) => {
                  const factorData = runData.map((rd, idx) => ({
                    ...rd,
                    [factor.name]: generatedPlan.plan[idx]?.[factor.name] || 0,
                  }));
                  
                  const codedLevels = [-1, 0, 1];
                  const mainEffectData = codedLevels.map(level => {
                    const levelResponses = factorData
                      .filter((d: any) => d[factor.name] === level && d.response !== null)
                      .map((d: any) => d.response);
                    return levelResponses.length > 0 
                      ? levelResponses.reduce((a: number, b: number) => a + b, 0) / levelResponses.length 
                      : 0;
                  });
                  
                  const xLabels = showUncoded && allFactorsHaveValidLevels()
                    ? codedLevels.map(level => {
                        const decoded = decodeValue(level, factor);
                        return factor.type === 'continuous'
                          ? `${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                          : String(decoded);
                      })
                    : ['Low (-1)', 'Center (0)', 'High (+1)'];

                  return (
                    <Card key={factorIndex}>
                      <CardHeader>
                        <CardTitle>Main Effect Plot: {factor.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={[
                            {
                              x: xLabels,
                              y: mainEffectData,
                              type: 'scatter',
                              mode: 'lines+markers',
                              line: { width: 3, color: '#3b82f6' },
                              marker: { size: 10, color: '#3b82f6' },
                            },
                          ]}
                          layout={{
                            title: { text: `<b>Main Effect: ${factor.name}</b>` },
                            xaxis: { title: { text: 'Factor Level' }, type: 'category' },
                            yaxis: { title: { text: responseVariableName || 'Y Response' } },
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
                        const interactionTraces = [-1, 1].map(levelA => {
                          const centerLevels = [-1, 0, 1];
                          const interactionData = centerLevels.map(levelB => {
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

                          return {
                            x: showUncoded && allFactorsHaveValidLevels()
                              ? centerLevels.map(level => {
                                  const decoded = decodeValue(level, factorB);
                                  return factorB.type === 'continuous'
                                    ? `${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                    : String(decoded);
                                })
                              : ['Low (-1)', 'Center (0)', 'High (+1)'],
                            y: interactionData,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: `${factorA.name} = ${levelALabel}`,
                            line: { width: 2 },
                            marker: { size: 8 },
                          };
                        });

                        return (
                          <Card key={`${idxA}-${idxB}`}>
                            <CardHeader>
                              <CardTitle>Interaction: {factorA.name} × {factorB.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Plot
                                data={interactionTraces as any}
                                layout={{
                                  title: { text: `<b>${factorA.name} × ${factorB.name}</b>` },
                                  xaxis: { title: { text: factorB.name }, type: 'category' },
                                  yaxis: { title: { text: responseVariableName || 'Y Response' } },
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
                
                const handleSolve = () => {
                  if (p < 2 || beta[solveFactorIdx + 1] === 0) return;
                  // Calculate constraint contribution: sum of (coefficient * constraint_value) for all non-target factors
                  let constraintSum = 0;
                  for (let i = 0; i < factors.length; i++) {
                    if (i !== solveFactorIdx) {
                      const constraintVal = constraintValues[i];
                      if (constraintVal !== null && constraintVal !== undefined && Number.isFinite(constraintVal)) {
                        constraintSum += beta[i + 1] * constraintVal;
                      }
                    }
                  }
                  // Solve: targetY = β0 + Σ_{j≠i} βj * constraint_j + βi * Xi
                  // Therefore: Xi = (targetY - β0 - constraintSum) / βi
                  let result = (targetY - beta[0] - constraintSum) / beta[solveFactorIdx + 1];
                  setSolverResult(result);
                };

                return (
                  <>
                    {/* Regression Equation */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Regression Model (with Interactions)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded font-mono text-sm">
                          <p>Y = {beta[0]?.toFixed(4)}</p>
                          {factors.map((factor, i) => (
                            <p key={i}>
                              &nbsp;&nbsp;&nbsp;&nbsp;{beta[i + 1] >= 0 ? '+' : ''} {beta[i + 1]?.toFixed(4)} × {factor.name}{factor.type === 'continuous' && factor.units ? ` (${factor.units})` : ''}
                            </p>
                          ))}
                          {interactionPairs.map((pair, i) => (
                            <p key={`int-${i}`}>
                              &nbsp;&nbsp;&nbsp;&nbsp;{beta[factors.length + 1 + i] >= 0 ? '+' : ''} {beta[factors.length + 1 + i]?.toFixed(4)} × {pair.name}
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
                                <TableHead>Include</TableHead>
                                <TableHead>Term</TableHead>
                                <TableHead className="text-right">Coefficient</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell><Checkbox disabled checked /></TableCell>
                                <TableCell className="font-medium">Intercept</TableCell>
                                <TableCell className="text-right">{beta[0]?.toFixed(6)}</TableCell>
                              </TableRow>
                              {factors.map((factor, i) => (
                                <TableRow key={i}>
                                  <TableCell>
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
                                  <TableCell className="font-medium">{factor.name}</TableCell>
                                  <TableCell className="text-right">{beta[i + 1]?.toFixed(6)}</TableCell>
                                </TableRow>
                              ))}
                              {interactionPairs.map((pair, i) => (
                                <TableRow key={`int-${i}`}>
                                  <TableCell>
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
                                  <TableCell className="font-medium">{pair.name}</TableCell>
                                  <TableCell className="text-right">{beta[factors.length + 1 + i]?.toFixed(6)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Mean Residual</p>
                              <p className="text-lg font-bold">{(residuals.reduce((a, b) => a + b, 0) / residuals.length).toFixed(6)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Std Dev Residuals</p>
                              <p className="text-lg font-bold">{Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length).toFixed(4)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Max Residual</p>
                              <p className="text-lg font-bold">{Math.max(...residuals.map(Math.abs)).toFixed(4)}</p>
                            </div>
                          </div>
                          <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-2">Residual Table (Sample)</p>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Obs</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Predicted</TableHead>
                                    <TableHead className="text-right">Residual</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {y.slice(0, 5).map((val, i) => (
                                    <TableRow key={i}>
                                      <TableCell>{i + 1}</TableCell>
                                      <TableCell className="text-right">{val.toFixed(4)}</TableCell>
                                      <TableCell className="text-right">{predictions[i].toFixed(4)}</TableCell>
                                      <TableCell className="text-right">{residuals[i].toFixed(4)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
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
