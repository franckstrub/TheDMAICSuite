import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { 
  type DOEFactor, 
  generateFractionalFactorialPlan,
  decodeValue
} from '@/lib/doeUtils';
import { parseNumericValue } from '@/lib/excelPasteUtils';
import { 
  transformGeneratedPlanForSaving, 
  reconstructGeneratedPlanFromPersisted,
  getDefaultFactor,
  validateFactorCount,
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
    { name: "Factor D", type: "continuous", lowValue: NaN, highValue: NaN, units: "" },
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
  
  // Tab persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem(`doe-fractional-active-tab-${projectId}-${solutionId}`);
    return stored || "setup";
  });
  
  // Update localStorage when tab changes
  useEffect(() => {
    localStorage.setItem(`doe-fractional-active-tab-${projectId}-${solutionId}`, activeTab);
  }, [activeTab, projectId, solutionId]);
  
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
        setFactors(config.factors);
        // Initialize factorInputs from loaded numeric values
        const inputs: Record<string, string> = {};
        config.factors.forEach((f: DOEFactor, i: number) => {
          if (f.type === 'continuous') {
            if (!isNaN(f.lowValue)) inputs[`${i}-lowValue`] = String(f.lowValue);
            if (!isNaN(f.highValue)) inputs[`${i}-highValue`] = String(f.highValue);
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
      
      if (config.runData && Array.isArray(config.runData)) {
        setRunData(config.runData);
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
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveSetup = () => {
    if (!validateFactorCount(factors)) {
      toast({
        title: "Validation Error",
        description: "Please add at least 2 factors for DOE.",
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
        description: "You must have at least 2 factors for DOE.",
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
  
  const handleGeneratePlan = () => {
    if (!validateFactorCount(factors)) {
      toast({
        title: "Cannot Generate Plan",
        description: "Please add at least 2 factors before generating the DOE plan.",
        variant: "destructive",
      });
      return;
    }
    
    if (factors.length < 4) {
      toast({
        title: "Cannot Generate Plan",
        description: "Fractional factorial designs require at least 4 factors. Add more factors or use Full Factorial Design.",
        variant: "destructive",
      });
      return;
    }
    
    const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
    const plan = generateFractionalFactorialPlan(factors, fractionalResolution, centerPoints, randomizeRuns);
    
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
    const newRunData = [...runData];
    const parsedValue = parseNumericValue(value);
    newRunData[runIndex].response = isNaN(parsedValue) ? null : parsedValue;
    setRunData(newRunData);
  };
  
  return (
    <div className="space-y-6" data-testid="fractional-factorial-doe-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Fractional Factorial DOE (2^(k-p))</h2>
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
              <CardTitle>Fractional Factorial DOE Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {configQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              
              {!configQuery.isLoading && (
                <>
                  {/* Fractional Factorial Resolution */}
                  <div className="space-y-2">
                    <Label htmlFor="fractional-resolution">Fractional Resolution</Label>
                    {factors.length >= 4 ? (
                      <>
                        <Select
                          value={fractionalResolution.toString()}
                          onValueChange={(value) => setFractionalResolution(parseInt(value))}
                        >
                          <SelectTrigger id="fractional-resolution" data-testid="select-fractional-resolution">
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>
                          <SelectContent>
                            {factors.length === 4 && <SelectItem value="1">2^(4-1) - Resolution IV (8 runs)</SelectItem>}
                            {factors.length === 5 && <SelectItem value="1">2^(5-1) - Resolution V (16 runs)</SelectItem>}
                            {factors.length === 6 && <SelectItem value="2">2^(6-2) - Resolution IV (16 runs)</SelectItem>}
                            {factors.length === 7 && <SelectItem value="3">2^(7-3) - Resolution IV (16 runs)</SelectItem>}
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground">
                          The fractional design reduces experimental runs while maintaining analysis capability.
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                        Fractional factorial designs require at least 4 factors. Add more factors below.
                      </div>
                    )}
                  </div>
                  
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
                    
                    {factors.length < 4 && (
                      <div className="text-sm text-destructive">
                        At least 4 factors are required for Fractional Factorial DOE
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
                                    value={factorInputs[`${index}-lowValue`] ?? (isNaN(factor.lowValue) ? '' : String(factor.lowValue))}
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
                                    value={factorInputs[`${index}-highValue`] ?? (isNaN(factor.highValue) ? '' : String(factor.highValue))}
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
                        <Input
                          id="significance-level"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.99"
                          value={significanceLevel}
                          onChange={(e) => setSignificanceLevel(parseFloat(e.target.value) || 0.05)}
                          data-testid="input-significance-level"
                        />
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
                        Randomize Run Order
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
              {factors.length < 4 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Please configure at least 4 factors in the Setup tab before generating the Fractional Factorial DOE plan.</p>
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
                                      return (
                                        <TableCell key={factorIndex}>
                                          {decodedValue}
                                        </TableCell>
                                      );
                                    } else {
                                      return (
                                        <TableCell key={factorIndex}>
                                          {codedValue === 0 ? '0' : codedValue === 1 ? '+1' : '-1'}
                                          {' '}
                                          <span className="text-muted-foreground text-sm">
                                            ({typeof decodedValue === 'number' ? decodedValue.toFixed(2) : decodedValue}
                                            {factor.units && ` ${factor.units}`})
                                          </span>
                                        </TableCell>
                                      );
                                    }
                                  })}
                                  <TableCell>
                                    <Input
                                      type="text"
                                      value={runDataRow?.response ?? ''}
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
          <Card>
            <CardHeader>
              <CardTitle>Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p>Charts and visualizations will be implemented in the next phase</p>
              </div>
            </CardContent>
          </Card>
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
