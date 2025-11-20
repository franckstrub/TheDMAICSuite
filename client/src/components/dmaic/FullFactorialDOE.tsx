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
  generateFullFactorialPlan, 
  decodeValue,
  calculateMainEffects,
  calculateInteractionEffects
} from '@/lib/doeUtils';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import { 
  transformGeneratedPlanForSaving, 
  reconstructGeneratedPlanFromPersisted,
  getDefaultFactor,
  validateFactorCount,
  parseFactorValue
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
  const [runData, setRunData] = useState<Array<{
    run: number;
    factors: number[];
    response: number | null;
  }>>([]);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  // UI state for raw string inputs for responses (allows partial numbers like "-", "0.", "1,5")
  const [responseInputs, setResponseInputs] = useState<Record<number, string>>({});
  const [showUncoded, setShowUncoded] = useState(false); // false = coded, true = uncoded
  
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
      
      // Preserve existing response values where possible (match by run order)
      const existingResponseMap = new Map(runData.map(rd => [rd.run, rd.response]));
      
      const newRunData = plan.plan.map((row: any) => ({
        run: row.runOrder,
        factors: factors.map(f => row[f.name] as number),
        response: existingResponseMap.get(row.runOrder) ?? null,
      }));
      
      setRunData(newRunData);
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
          'Full Factorial'
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
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors),
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
      runData,
      generatedPlan: transformGeneratedPlanForSaving(generatedPlan, factors),
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
    
    const newRunData = plan.plan.map((row: any, index: number) => ({
      run: row.runOrder,
      factors: factors.map(f => row[f.name] as number),
      response: null,
    }));
    
    setRunData(newRunData);
    
    toast({
      title: "Full Factorial DOE Plan Generated",
      description: `Generated ${plan.plan.length} experimental runs.`,
    });
  };
  
  const handleResponseChange = (runIndex: number, value: string) => {
    const runNumber = runData[runIndex].run;
    setResponseInputs({
      ...responseInputs,
      [runNumber]: value,
    });
  };
  
  const handleResponseBlur = (runIndex: number) => {
    const runNumber = runData[runIndex].run;
    const rawValue = responseInputs[runNumber] || '';
    const parsedValue = parseNumericValue(rawValue);
    
    const newRunData = [...runData];
    newRunData[runIndex].response = isNaN(parsedValue) ? null : parsedValue;
    setRunData(newRunData);
    
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

                  return (
                    <Card key={factorIndex}>
                      <CardHeader>
                        <CardTitle>Main Effect Plot: {factor.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Plot
                          data={[
                            {
                              x: ['Low (-1)', 'Center (0)', 'High (+1)'],
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
                              .filter((r: any) => r !== null);
                            return responses.length > 0 
                              ? responses.reduce((a: number, b: number) => a + b, 0) / responses.length 
                              : 0;
                          });
                          
                          return {
                            x: ['Low (-1)', 'Center (0)', 'High (+1)'],
                            y: interactionData,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: `${factorA.name} = ${levelA === -1 ? 'Low' : 'High'}`,
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
                                data={interactionTraces}
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
          <Card>
            <CardHeader>
              <CardTitle>Statistical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p>Statistical analysis will be implemented in the next phase</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
