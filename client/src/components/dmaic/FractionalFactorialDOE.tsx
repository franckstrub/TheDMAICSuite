import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2, Plane, Info, AlertTriangle } from "lucide-react";
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
import { invertMatrix } from '@/lib/multipleRegressionUtils';
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
import { performNormalityTest } from '@/lib/statisticsUtils';

interface FractionalFactorialDOEProps {
  projectId: number;
  solutionId: string;
}

export function FractionalFactorialDOE({ projectId, solutionId }: FractionalFactorialDOEProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const lastLoadedKey = useRef<string>('');
  const isInitialLoadRef = useRef(true);
  
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
  
  // Track saved generators from loaded plan (to preserve when factors change)
  const [savedGenerators, setSavedGenerators] = useState<string[] | null>(null);
  const [savedDefiningRelation, setSavedDefiningRelation] = useState<string | null>(null);
  
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
  const [showParetoOfEffects, setShowParetoOfEffects] = useState(false);
  
  // Tab persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = localStorage.getItem(`doe-fractional-active-tab-${projectId}-${solutionId}`);
    return stored || "setup";
  });
  
  // Ref to store the solve function so it can be called by useEffect
  const solveRef = useRef<(() => void) | null>(null);

  // Auto-solve when solver dependencies change
  useEffect(() => {
    // Use setTimeout to ensure solveRef.current is updated first
    const timeoutId = setTimeout(() => {
      if (solveRef.current) {
        solveRef.current();
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [solveFactorIdx, targetY, constraintValues, selectedFactorsForModel]);
  
  // Update localStorage when tab changes
  useEffect(() => {
    localStorage.setItem(`doe-fractional-active-tab-${projectId}-${solutionId}`, activeTab);
  }, [activeTab, projectId, solutionId]);
  
  // Auto-generate plan when factors change (but not during initial load)
  useEffect(() => {
    // Skip regeneration on first load - let config loading set it instead
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Regenerate plan when: (1) factors change AND (2) valid factor count
    if (validateFractionalFactorCount(factors) && factors.length >= 3) {
      const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
      const p = parseInt(designChoice);
      const plan = generateFractionalFactorialPlan(factors, p, centerPoints, randomizeRuns, numberOfReplicates);
      
      setGeneratedPlan(plan);
      
      // Responses are preserved automatically since they're keyed by run order
      // No need to rebuild - existing responses state remains valid
    } else if (factors.length < 3) {
      // Clear plan if factor count becomes invalid
      setGeneratedPlan(null);
    }
  }, [factors, includeCenterPoints, numberOfCenterPoints, randomizeRuns, numberOfReplicates, designChoice]);
  
  // Load config from API
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`],
    retry: false,
  });
  
  // Save selected coefficients mutation
  const saveSelectedCoefficientsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        'PATCH',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`,
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
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`]
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
  
  // After config is loaded, if no plan was loaded, generate a fresh one
  useEffect(() => {
    // Only run if we've loaded config and still don't have a plan
    if (loadedRef.current && !generatedPlan && validateFractionalFactorCount(factors) && factors.length >= 3) {
      const centerPoints = includeCenterPoints ? numberOfCenterPoints : 0;
      const p = parseInt(designChoice);
      const plan = generateFractionalFactorialPlan(factors, p, centerPoints, randomizeRuns, numberOfReplicates);
      setGeneratedPlan(plan);
    }
  }, [loadedRef, generatedPlan, factors, includeCenterPoints, numberOfCenterPoints, randomizeRuns, numberOfReplicates, designChoice]);

  // Initialize selectedFactorsForModel to true for all factors & interactions on first Analysis tab view
  useEffect(() => {
    if (activeTab === 'analysis' && Object.keys(selectedFactorsForModel).length === 0 && generatedPlan) {
      const initialized: Record<number | string, boolean> = {};
      // Initialize all factors
      for (let i = 0; i < factors.length; i++) {
        initialized[i] = true;
      }
      // Initialize all interactions (will be filtered to non-aliased ones below)
      const ffMetadata = generatedPlan.metadata;
      const k = factors.length;
      const p = ffMetadata?.p || 0;
      const baseFactorCount = k - p;
      
      const baseIndices = Array.from({ length: baseFactorCount }, (_, i) => i);
      const getCombinations = (arr: number[], size: number): number[][] => {
        if (size === 0) return [[]];
        if (arr.length === 0) return [];
        const [first, ...rest] = arr;
        const withFirst = getCombinations(rest, size - 1).map(combo => [first, ...combo]);
        const withoutFirst = getCombinations(rest, size);
        return [...withFirst, ...withoutFirst];
      };
      
      let interactionCount = 0;
      for (let size = 2; size <= baseFactorCount; size++) {
        const combos = getCombinations(baseIndices, size);
        interactionCount += combos.length;
      }
      
      for (let i = 0; i < interactionCount; i++) {
        initialized[`int-${i}`] = true;
      }
      
      if (includeCenterPoints) {
        initialized['centerPoint'] = true;
      }
      
      setSelectedFactorsForModel(initialized);
    }
  }, [activeTab, generatedPlan, factors.length, includeCenterPoints, selectedFactorsForModel]);

  // Load data when config is fetched
  useEffect(() => {
    const currentKey = `${projectId}-${solutionId}`;
    
    if (lastLoadedKey.current !== currentKey) {
      loadedRef.current = false;
      lastLoadedKey.current = currentKey;
      isInitialLoadRef.current = true; // Reset initial load flag when project/solution changes
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
          // All metadata (k, p, resolution) comes from generatedPlan only
          setGeneratedPlan(reconstructedPlan);
          
          // Save generators and defining relation from loaded plan
          if (reconstructedPlan.generators && reconstructedPlan.definingRelation) {
            setSavedGenerators(reconstructedPlan.generators);
            setSavedDefiningRelation(reconstructedPlan.definingRelation);
          }
          
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

  const saveSolvingSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/doe-fractional-solver`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Solver setup saved",
        description: "Your solver setup has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/doe-fractional`]
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
      selectedFactorsForModel,
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
      selectedFactorsForModel,
      generatedPlan: transformedPlan,
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
    if (newFactorIndex > 10) { 
      toast({ 
        title: "Cannot Add Factor",
        description: "Fractional Factorial DOE supports a maximum of 10 factors.",
        variant: "destructive",
      });
      return;
    }

  if (newFactorIndex >= 12) {
    setDesignChoice(String(5 + (newFactorIndex - 12)));
  }
  else if (newFactorIndex >= 9) {
    setDesignChoice(String(newFactorIndex - 7));
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
    const plan = generateFractionalFactorialPlan(factors, parseInt(designChoice), centerPoints, randomizeRuns, numberOfReplicates);
    
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
                    //const choices = getDesignChoices(k);
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
                        <h3 className="text-lg font-semibold">2<sup>({factors.length}-{generatedPlan.p})</sup> {generatedPlan.designType}</h3>
                        <p className="text-sm text-muted-foreground">
                          {generatedPlan.definingRelation && (
                            <>
                              Defining Relation: {generatedPlan.definingRelation}
                              {generatedPlan.generators && generatedPlan.generators.length > 0 && (
                                <> • Generators: {generatedPlan.generators.join(', ')}</>
                              )}
                              {generatedPlan.aliases && generatedPlan.aliases.length > 0 && (
                                <> • Aliases: {generatedPlan.aliases.join(', ')}</>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Runs: {generatedPlan.plan.length}
                          <span> • Fraction: 1/{Math.pow(2,generatedPlan.p)}</span>
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
                          checked={!allFactorsHaveValidLevels() ? false : showUncoded}
                          onCheckedChange={setShowUncoded}
                          disabled={!allFactorsHaveValidLevels()}
                          data-testid="switch-uncoded-toggle"
                        />
                        <Label htmlFor="uncoded-toggle">Uncoded {!allFactorsHaveValidLevels() && ' switch is disabled due to some factor levels not defined'}</Label>
                      </div>
                      
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Std Order</TableHead>
                              <TableHead className="w-[100px]">Run Order</TableHead>
                              {factors.map((factor, index) => (
                                <TableHead key={index} className="w-[150px]">
                                  {getFactorDisplayName(factor, index, generatedPlan.generators)}
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
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">2<sup>({factors.length}-{generatedPlan.p})</sup> {generatedPlan.designType}</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedPlan.definingRelation && (
                    <>
                      Defining Relation: {generatedPlan.definingRelation}
                      {generatedPlan.generators && generatedPlan.generators.length > 0 && (
                        <> • Generators: {generatedPlan.generators.join(', ')}</>
                      )}
                      {generatedPlan.aliases && generatedPlan.aliases.length > 0 && (
                        <> • Aliases: {generatedPlan.aliases.join(', ')}</>
                      )}
                    </>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Runs: {generatedPlan.plan.length}
                  <span> • Fraction: 1/{Math.pow(2,generatedPlan.p)}</span>
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
                <Label htmlFor="chart-uncoded-toggle">Coded</Label>
                <Switch
                  id="chart-uncoded-toggle"
                  checked={!allFactorsHaveValidLevels() ? false : showUncoded}
                  onCheckedChange={setShowUncoded}
                  disabled={!allFactorsHaveValidLevels()}
                  data-testid="switch-chart-uncoded-toggle"
                />
                <Label htmlFor="chart-uncoded-toggle">Uncoded {!allFactorsHaveValidLevels() && ' switch is disabled due to some factor levels not defined'}</Label>
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
                              ? `Center point: ${(decoded as number).toFixed(2)}${factor.units ? ' ' + factor.units : ''}`
                              : String(decoded);
                          })()
                        : 'Center point (0)';

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
                    {factors.length >= 2 && (() => {
                      // Helper to get aliased interactions from Defining Relation and Aliases
                      const getAliasedInteractionsForChart = (): Set<string> => {
                        const aliased = new Set<string>();
                        
                        // Parse aliases list
                        if (generatedPlan.aliases && Array.isArray(generatedPlan.aliases)) {
                          for (const alias of generatedPlan.aliases) {
                            // Aliases are like "A + BC" - parse both sides
                            const parts = alias.split('+').map(p => p.trim());
                            for (const part of parts) {
                              // Only include interactions (2+ letters), exclude main effects
                              if (part.length > 1) {
                                aliased.add(part);
                              }
                            }
                          }
                        }
                        
                        // Also parse Defining Relation to exclude its interaction terms
                        if (generatedPlan.definingRelation) {
                          // Defining Relation format: "I = ABC = BCD = ..."
                          const terms = generatedPlan.definingRelation.split('=').map((t: string) => t.trim());
                          for (const term of terms) {
                            // Skip the identity element "I"
                            if (term !== 'I' && term.length > 1) {
                              aliased.add(term);
                            }
                          }
                        }
                        
                        return aliased;
                      };
                      
                      const aliasedInteractionsChart = getAliasedInteractionsForChart();
                      
                      // Helper to convert factor indices to interaction letter string
                      const indicesToLettersChart = (idxA: number, idxB: number): string => {
                        const letterA = String.fromCharCode(65 + idxA);
                        const letterB = String.fromCharCode(65 + idxB);
                        return letterA + letterB;
                      };
                      
                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">2-Way Interaction Plots</h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {factors.slice(0, -1).map((factorA, idxA) =>
                              factors.slice(idxA + 1).map((factorB, idxB) => {
                                // Check if interaction is aliased/confounded
                                const factorAIdx = factors.indexOf(factorA);
                                const factorBIdx = factors.indexOf(factorB);
                                const interactionLetters = indicesToLettersChart(factorAIdx, factorBIdx);
                                const isAliased = aliasedInteractionsChart.has(interactionLetters);
                                
                                // Check if interaction is confounded based on base factors - Use k and p from plan if available, otherwise assume full factorial
                                let numBaseFactors = factors.length;
                                if (generatedPlan && generatedPlan.k !== undefined && generatedPlan.p !== undefined) {
                                  numBaseFactors = generatedPlan.k - generatedPlan.p;
                                }
                                
                                const isInteractionConfounded = factorAIdx >= numBaseFactors || factorBIdx >= numBaseFactors || isAliased;
                              
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
                                          ? `Center point: ${(decoded as number).toFixed(2)}${factorB.units ? ' ' + factorB.units : ''}`
                                          : String(decoded);
                                      })()
                                    : 'Center point (0)';
                                  
                                  const centerLabel = `Center w. ${Object.entries(combo.labels).map(([f, l]) => `${f}<br>=${l}`).join(', ')}`;
                                  
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
                                        legend: { title: { text: "Legend:" }, font: { size: 10 }, x: 1, y: 0.5  },
                                        hovermode: 'closest',
                                        margin: { l: 60, r: 100, t: 60, b: 60 },
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
                        );
                      })()}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
        
        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {!generatedPlan || runData.length === 0 || responses.length! < (includeCenterPoints ? Math.pow(2,(generatedPlan.k - generatedPlan.p)) + 1
         : Math.pow(2, (generatedPlan.k - generatedPlan.p)) ) ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Generate a plan and enter all data to view analysis</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">2<sup>({factors.length}-{generatedPlan.p})</sup> {generatedPlan.designType}</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedPlan.definingRelation && (
                    <>
                      Defining Relation: {generatedPlan.definingRelation}
                      {generatedPlan.generators && generatedPlan.generators.length > 0 && (
                        <> • Generators: {generatedPlan.generators.join(', ')}</>
                      )}
                      {generatedPlan.aliases && generatedPlan.aliases.length > 0 && (
                        <> • Aliases: {generatedPlan.aliases.join(', ')}</>
                      )}
                    </>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Runs: {generatedPlan.plan.length}
                  <span> • Fraction: 1/{Math.pow(2,generatedPlan.p)}</span>
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
              {/* Toggle for Coded/Uncoded Analysis */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="analysis-uncoded-toggle">Coded</Label>
                <Switch
                  id="analysis-uncoded-toggle"
                  checked={!allFactorsHaveValidLevels() ? false : showUncoded}
                  onCheckedChange={setShowUncoded}
                  disabled={!allFactorsHaveValidLevels()}
                  data-testid="switch-analysis-uncoded-toggle"
                />
                <Label htmlFor="analysis-uncoded-toggle">Uncoded {!allFactorsHaveValidLevels() && ' switch is disabled due to some factor levels not defined'}</Label>
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

                // Get metadata from generatedPlan, but use current factors.length for accurate interaction generation
                const ffMetadata = generatedPlan.metadata;
                const k = factors.length; // Always use current factor count, not stale metadata
                const p = ffMetadata?.p || 0;
                const resolution = ffMetadata?.resolution || 0;
                const baseFactorCount = k - p;

                // Build interaction terms - all N-way interactions between base factors (unconfounded)
                // Helper to generate all combinations of indices
                const getCombinations = (arr: number[], size: number): number[][] => {
                  if (size === 0) return [[]];
                  if (arr.length === 0) return [];
                  const [first, ...rest] = arr;
                  const withFirst = getCombinations(rest, size - 1).map(combo => [first, ...combo]);
                  const withoutFirst = getCombinations(rest, size);
                  return [...withFirst, ...withoutFirst];
                };
                
                // Helper to convert factor indices to interaction letter string (e.g., [0,1] -> "AB")
                const indicesToLetters = (indices: number[]): string => {
                  return indices.map(idx => String.fromCharCode(65 + idx)).join('');
                };
                
                // Parse aliases to get confounded interactions
                const getAliasedInteractions = (): Set<string> => {
                  const aliased = new Set<string>();
                  
                  // Parse aliases list
                  if (generatedPlan.aliases && Array.isArray(generatedPlan.aliases)) {
                    for (const alias of generatedPlan.aliases) {
                      // Aliases are like "A + BC" - parse both sides
                      const parts = alias.split('+').map(p => p.trim());
                      for (const part of parts) {
                        // Only include interactions (2+ letters), exclude main effects
                        if (part.length > 1) {
                          aliased.add(part);
                        }
                      }
                    }
                  }
                  
                  // Also parse Defining Relation to exclude its interaction terms
                  if (generatedPlan.definingRelation) {
                    // Defining Relation format: "I = ABC = BCD = ..."
                    const terms = generatedPlan.definingRelation.split('=').map((t: string) => t.trim());
                    for (const term of terms) {
                      // Skip the identity element "I"
                      if (term !== 'I' && term.length > 1) {
                        aliased.add(term);
                      }
                    }
                  }
                  
                  return aliased;
                };
                
                const aliasedInteractions = getAliasedInteractions();
                
                // Generate all interactions of size 2, 3, 4, ... up to baseFactorCount
                const interactionPairs: Array<{indices: number[], name: string}> = [];
                const baseIndices = Array.from({ length: baseFactorCount }, (_, i) => i);
                for (let size = 2; size <= baseFactorCount; size++) {
                  const combos = getCombinations(baseIndices, size);
                  for (const combo of combos) {
                    // Check if this interaction is aliased (confounded)
                    const letterString = indicesToLetters(combo);
                    if (!aliasedInteractions.has(letterString)) {
                      // Build name from factor names (e.g., "A×B×C")
                      const name = combo.map(idx => factors[idx].name).join('×');
                      interactionPairs.push({ indices: combo, name });
                    }
                  }
                }

                const X: number[][] = [];
                const y: number[] = [];
                
                // Collect all responses including center points
                runData.forEach((row, idx) => {
                  if (row.response !== null && !isNaN(row.response)) {
                    const row_vals = [1]; // intercept = grand mean in coded view
                    const baseFactorValues: number[] = [];
                    // Only use base factors (first k-p factors)
                    for (let i = 0; i < baseFactorCount; i++) {
                      const val = generatedPlan.plan[idx]?.[factors[i].name] ?? 0;
                      baseFactorValues.push(val);
                      row_vals.push(val);
                    }
                    // Add interaction terms (all N-way between base factors)
                    interactionPairs.forEach(pair => {
                      // Multiply all factor values in this interaction
                      let product = 1;
                      pair.indices.forEach(idx => {
                        product *= baseFactorValues[idx];
                      });
                      row_vals.push(product);
                    });
                    X.push(row_vals);
                    y.push(row.response);
                  }
                });

                const interactionsTriples = 0; // Placeholder if needed for higher-order interactions
                const n = y.length; // total number of observations including center points
                const dfTotal = n - 1; // total degrees of freedom
                const hasCurvature = (includeCenterPoints && selectedFactorsForModel['centerPoint'] !== false);
                const dfCurvature = hasCurvature ? 1 : 0;
                const dfBasefactors = k;
                //const dfInteractions = interactionPairs.length;
                //Variable degrees of freedom for interactions: depend on resolution and selected factors and center point
                let dfInteractions = resolution === 3 ? 0
                                    : resolution === 4 ? interactionPairs.length/2
                                    : resolution === 5 ? interactionPairs.length
                                    : resolution === 6 ? interactionPairs.length + interactionsTriples/2
                                    : interactionPairs.length + interactionsTriples // No interactions estimable in R3 designs
                let dfModel = dfBasefactors + dfInteractions + dfCurvature;
                if (dfModel > dfTotal) {
                  dfModel = dfTotal;
                }
                let dfResidual = dfTotal - dfModel;

                const numCoefficients = X[0].length;
                // Calculate grand mean across ALL observations (main design + center points)
                const mean_y = y.reduce((a, b) => a + b, 0) / n;
                // SS_tot accounts for variation from the grand mean across all observations including center points
                const SS_tot = y.reduce((sum, val) => sum + Math.pow(val - mean_y, 2), 0);
                
                // Calculate sum of squares for curvature (if center points are included)
                let SS_curvature = 0;
                if (includeCenterPoints) {
                  // Find factorial vs center point indices
                  const factorialIndices: number[] = [];
                  const centerIndices: number[] = [];
                  
                  runData.forEach((row, idx) => {
                    if (row.response !== null && !isNaN(row.response)) {
                      // Check if all base factors are -1 or +1 (factorial point)
                      let isFactorial = true;
                      for (let i = 0; i < baseFactorCount; i++) {
                        const val = generatedPlan.plan[idx]?.[factors[i].name];
                        if (val !== -1 && val !== 1) {
                          isFactorial = false;
                          break;
                        }
                      }
                      if (isFactorial) {
                        factorialIndices.push(idx);
                      } else {
                        centerIndices.push(idx);
                      }
                    }
                  });
                  
                  if (factorialIndices.length > 0 && centerIndices.length > 0) {
                    const meanFactorial = factorialIndices.reduce((sum, idx) => sum + runData[idx].response!, 0) / factorialIndices.length;
                    const meanCenter = centerIndices.reduce((sum, idx) => sum + runData[idx].response!, 0) / centerIndices.length;
                    const n_f = factorialIndices.length;
                    const n_c = centerIndices.length;
                    // SS_curvature = (n_f * n_c) / (n_f + n_c) * (mean_factorial - mean_center)^2
                    SS_curvature = ((n_f * n_c) / (n_f + n_c)) * Math.pow(meanFactorial - meanCenter, 2);
                  }
                }

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

                // Solve using Gaussian elimination with better pivoting for near-singular matrices
                const solveNormalEquations = (A: number[][], b: number[]): number[] => {
                  const n = A.length;
                  const aug = A.map((row, i) => [...row, b[i]]);
                  
                  // Forward elimination with complete pivoting for better numerical stability
                  for (let col = 0; col < n; col++) {
                    // Find the largest element in the remaining submatrix
                    let maxRow = col;
                    let maxVal = Math.abs(aug[col][col]);
                    
                    for (let row = col + 1; row < n; row++) {
                      if (Math.abs(aug[row][col]) > maxVal) {
                        maxVal = Math.abs(aug[row][col]);
                        maxRow = row;
                      }
                    }
                    
                    // If pivot is too small, we have rank deficiency - use whatever we have
                    if (maxVal < 1e-10) {
                      continue; // Skip this column
                    }
                    
                    // Swap rows
                    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
                    
                    // Eliminate below
                    for (let row = col + 1; row < n; row++) {
                      if (Math.abs(aug[col][col]) > 1e-15) {
                        const factor = aug[row][col] / aug[col][col];
                        for (let j = col; j <= n; j++) {
                          aug[row][j] -= factor * aug[col][j];
                        }
                      }
                    }
                  }
                  
                  // Back substitution with careful handling of singular/near-singular systems
                  const x: number[] = Array(n).fill(0);
                  for (let i = n - 1; i >= 0; i--) {
                    x[i] = aug[i][n];
                    for (let j = i + 1; j < n; j++) {
                      x[i] -= aug[i][j] * x[j];
                    }
                    if (Math.abs(aug[i][i]) > 1e-12) {
                      x[i] /= aug[i][i];
                    } else {
                      // If diagonal is too small, leave x[i] as computed sum (least squares solution)
                      if (Math.abs(x[i]) < 1e-10) {
                        x[i] = 0;
                      }
                    }
                  }
                  
                  return x;
                };

                let beta: number[] = [];
                try {
                  beta = solveNormalEquations(XtX, Xty);
                } catch (e) {
                  console.warn('Gaussian elimination error:', e);
                  beta = Array(numCoefficients).fill(0);
                  beta[0] = mean_y;
                }
                
                // Ensure beta contains valid numbers
                if (!beta.every(b => Number.isFinite(b))) {
                  beta = Array(numCoefficients).fill(0);
                  beta[0] = mean_y;
                }

                // Build reduced design matrix with only selected terms
                const selectedColumns: number[] = [0]; // Always include intercept
                Array.from({length: baseFactorCount}).forEach((_, idx) => {
                  if (selectedFactorsForModel[idx] !== false) {
                    selectedColumns.push(idx + 1);
                  }
                });
                interactionPairs.forEach((_, pairIdx) => {
                  if (selectedFactorsForModel[`int-${pairIdx}`] !== false) {
                    selectedColumns.push(baseFactorCount + 1 + pairIdx);
                  }
                });
                
                // Create reverse mapping: original column index -> reduced column index
                const colMapReverse: Record<number, number> = {};
                selectedColumns.forEach((origCol, reducedIdx) => {
                  colMapReverse[origCol] = reducedIdx;
                });
                
                // Build reduced X matrix with only selected columns
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
                } catch (e) {
                  console.warn('Gaussian elimination error for reduced model:', e);
                  beta_red = Xty_red.map(v => v / (XtX_red[0][0] || 1));
                }

                // Calculate predictions and residuals for reduced model
                const predictions_red = X_reduced.map(row => row.reduce((sum, val, i) => sum + val * beta_red[i], 0));
                const residuals_red = y.map((val, i) => val - predictions_red[i]);
                const residualSS_red = residuals_red.reduce((sum, res) => sum + Math.pow(res, 2), 0);
                const SS_res = residualSS_red - SS_curvature;
                const errorDF_red = n - p_reduced - dfCurvature;
                const errorMS = errorDF_red > 0 ? SS_res / errorDF_red : 0;
                const R_sq = 1 - SS_res / SS_tot;
                const adj_R_sq = 1 - (1 - R_sq) * (n - 1) / (n - p_reduced - dfCurvature);
                const rmse = Math.sqrt(SS_res / (n - p_reduced- dfCurvature));
                const residualMean = residuals_red.reduce((a, b) => a + b, 0) / residuals_red.length;
                const residualStd = Math.sqrt(residuals_red.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) / (residuals_red.length - 1));
                const mse = SS_res / (n - p_reduced - dfCurvature);
                
                // Calculate standard errors and t-values for selected coefficients using reduced model
                const coeffStats = beta_red.map((b, redIdx) => {
                  let xxtInvDiag = 0;
                  if (redIdx === 0) {
                    xxtInvDiag = 1 / XtX_red[0][0];
                  } else {
                    const denom = XtX_red[redIdx][redIdx] - (redIdx > 0 ? XtX_red[redIdx].slice(0, redIdx).reduce((sum, v, i) => sum + v * v / (XtX_red[i][i] || 1), 0) : 0);
                    xxtInvDiag = Math.abs(denom) > 1e-10 ? 1 / denom : 1 / XtX_red[redIdx][redIdx];
                  }
                  const stdError = Math.sqrt(mse * Math.max(0, xxtInvDiag));
                  const tValue = stdError > 0 ? b / stdError : NaN;
                  let pValue = 0;
                  if (stdError > 0 && Number.isFinite(tValue)) {
                    const df = errorDF_red;
                    const cdfVal = jStat.studentt.cdf(Math.abs(tValue), df);
                    pValue = Number.isFinite(cdfVal) ? 2 * (1 - cdfVal) : 1;
                    pValue = Math.max(0, Math.min(1, pValue));
                  }
                  return { stdError: Number.isFinite(stdError) ? stdError : 0, tValue: Number.isFinite(tValue) ? tValue : NaN, pValue };
                });

                // Transform coefficients using beta_red and selected columns mapping
                const transformCoefficientsAndSE = () => {
                  if (!showUncoded || !allFactorsHaveValidLevels()) {
                    return { displayBeta: beta_red, displayCoeffStats: coeffStats };
                  }
                  
                  const transformed = [...beta_red];
                  const transformedStats = coeffStats.map(s => ({ ...s }));
                  let interceptAdjustment = 0;
                  
                  // Only transform factors that are in selectedColumns
                  for (let i = 0; i < baseFactorCount; i++) {
                    const colIdx = selectedColumns.indexOf(i + 1);
                    if (colIdx === -1 || selectedFactorsForModel[i] === false) continue;
                    
                    const factor = factors[i];
                    if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                      const low = parseFloat(String(factor.lowValue));
                      const high = parseFloat(String(factor.highValue));
                      if (!isNaN(low) && !isNaN(high)) {
                        const center = (low + high) / 2;
                        const halfRange = (high - low) / 2;
                        
                        if (Number.isFinite(beta_red[colIdx])) {
                          transformed[colIdx] = beta_red[colIdx] / halfRange;
                          if (transformedStats[colIdx]) {
                            transformedStats[colIdx].stdError = coeffStats[colIdx].stdError / halfRange;
                          }
                          interceptAdjustment += beta_red[colIdx] * center / halfRange;
                        }
                      }
                    }
                  }
                  
                  // Transform N-way interaction coefficients
                  for (let i = 0; i < interactionPairs.length; i++) {
                    if (selectedFactorsForModel[`int-${i}`] === false) continue;
                    
                    const colIdx = selectedColumns.indexOf(baseFactorCount + 1 + i);
                    if (colIdx === -1) continue;
                    
                    const pair = interactionPairs[i];
                    
                    // Check all factors in this interaction are continuous with valid levels
                    const allContinuousWithLevels = pair.indices.every(idx => {
                      const factor = factors[idx];
                      return factor.type === 'continuous' && 
                             factor.lowValue !== undefined && 
                             factor.highValue !== undefined;
                    });
                    
                    if (allContinuousWithLevels) {
                      // Calculate product of half-ranges for all factors in this interaction
                      let halfRangeProduct = 1;
                      let allValid = true;
                      
                      for (const idx of pair.indices) {
                        const factor = factors[idx];
                        if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                          const low = parseFloat(String(factor.lowValue));
                          const high = parseFloat(String(factor.highValue));
                          if (isNaN(low) || isNaN(high)) {
                            allValid = false;
                            break;
                          }
                          halfRangeProduct *= (high - low) / 2;
                        }
                      }
                      
                      if (allValid && Number.isFinite(beta_red[colIdx])) {
                        transformed[colIdx] = beta_red[colIdx] / halfRangeProduct;
                        if (transformedStats[colIdx]) {
                          transformedStats[colIdx].stdError = coeffStats[colIdx].stdError / halfRangeProduct;
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
                          
                          if (Number.isFinite(beta[i + 1]) && Number.isFinite(coeffStats[i + 1]?.stdError)) {
                            const weight = center / halfRange;
                            interceptSESquared += (weight ** 2) * (coeffStats[i + 1].stdError ** 2);
                          }
                        }
                      }
                    }
                    
                    // Note: For N-way interactions, the center term is 0 (no interaction centers in DOE)
                    // So no variance contribution from interactions to intercept SE
                    
                    transformedStats[0].stdError = Math.sqrt(Math.max(0, interceptSESquared));
                    transformedStats[0].tValue = transformedStats[0].stdError > 0 ?(beta[0] - interceptAdjustment) / transformedStats[0].stdError : NaN;
                    // Recalculate p-value for intercept since its t-value changes (SE is recalculated via variance propagation)
                    transformedStats[0].pValue = transformedStats[0].stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(transformedStats[0].tValue), n - numCoefficients)) : 0;
                  }
                  
                  transformed[0] = beta[0] - interceptAdjustment;
                  
                  // If transformation resulted in non-finite values, use coded instead
                  if (!transformed.every(v => Number.isFinite(v))) {
                    return { displayBeta: beta, displayCoeffStats: coeffStats };
                  }
                  return { displayBeta: transformed, displayCoeffStats: transformedStats };
                };
                
                const { displayBeta, displayCoeffStats } = transformCoefficientsAndSE();
                
                // Always compute uncoded coefficients for solver (independent of display toggle)
                const getUncodedCoefficientsForSolver = () => {
                  if (!allFactorsHaveValidLevels()) {
                    return beta_red; // Return coded if can't transform
                  }
                  
                  const transformed = [...beta_red];
                  let interceptAdjustment = 0;
                  
                  // Transform main effect coefficients
                  for (let i = 0; i < baseFactorCount; i++) {
                    const colIdx = selectedColumns.indexOf(i + 1);
                    if (colIdx === -1 || selectedFactorsForModel[i] === false) continue;
                    
                    const factor = factors[i];
                    if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                      const low = parseFloat(String(factor.lowValue));
                      const high = parseFloat(String(factor.highValue));
                      if (!isNaN(low) && !isNaN(high)) {
                        const center = (low + high) / 2;
                        const halfRange = (high - low) / 2;
                        
                        if (Number.isFinite(beta_red[colIdx])) {
                          transformed[colIdx] = beta_red[colIdx] / halfRange;
                          interceptAdjustment += beta_red[colIdx] * center / halfRange;
                        }
                      }
                    }
                  }
                  
                  // Transform N-way interaction coefficients
                  for (let i = 0; i < interactionPairs.length; i++) {
                    if (selectedFactorsForModel[`int-${i}`] === false) continue;
                    
                    const colIdx = selectedColumns.indexOf(baseFactorCount + 1 + i);
                    if (colIdx === -1) continue;
                    
                    const pair = interactionPairs[i];
                    
                    const allContinuousWithLevels = pair.indices.every(idx => {
                      const factor = factors[idx];
                      return factor.type === 'continuous' && 
                             factor.lowValue !== undefined && 
                             factor.highValue !== undefined;
                    });
                    
                    if (allContinuousWithLevels) {
                      let halfRangeProduct = 1;
                      let allValid = true;
                      
                      for (const idx of pair.indices) {
                        const factor = factors[idx];
                        if (factor.type === 'continuous' && factor.lowValue !== undefined && factor.highValue !== undefined) {
                          const low = parseFloat(String(factor.lowValue));
                          const high = parseFloat(String(factor.highValue));
                          if (isNaN(low) || isNaN(high)) {
                            allValid = false;
                            break;
                          }
                          halfRangeProduct *= (high - low) / 2;
                        }
                      }
                      
                      if (allValid && Number.isFinite(beta_red[colIdx])) {
                        transformed[colIdx] = beta_red[colIdx] / halfRangeProduct;
                      }
                    }
                  }
                  
                  transformed[0] = beta_red[0] - interceptAdjustment;
                  
                  // If transformation resulted in non-finite values, use coded instead
                  if (!transformed.every(v => Number.isFinite(v))) {
                    return beta_red;
                  }
                  return transformed;
                };
                
                const handleSolve = () => {
                  // Check if solve factor is included in the model
                  if (selectedFactorsForModel[solveFactorIdx] === false || baseFactorCount < 1) {
                    setSolverResult(null);
                    return;
                  }
                  
                  // Check if target Y is set (targetYDisplay should be non-empty and targetY should be a valid number)
                  if (targetYDisplay === '' || !Number.isFinite(targetY)) {
                    setSolverResult(null);
                    return;
                  }
                  
                  // Get the reduced column index for the solve factor
                  const solveOrigCol = solveFactorIdx + 1;
                  const solveReducedCol = colMapReverse[solveOrigCol];
                  if (solveReducedCol === undefined) {
                    setSolverResult(null);
                    return;
                  }
                  
                  // Always use uncoded coefficients for solver
                  const solverBeta = getUncodedCoefficientsForSolver();
                  
                  if (solverBeta[solveReducedCol] === 0) {
                    setSolverResult(null);
                    return;
                  }
                  
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
                  
                  let constraintSum = 0;
                  for (let i = 0; i < factors.length; i++) {
                    // Only include constraints for factors that are NOT the solve factor and ARE included in the model
                    if (i !== solveFactorIdx && selectedFactorsForModel[i] !== false) {
                      const constraintVal = constraintValues[i];
                      if (Number.isFinite(constraintVal)) {
                        const origCol = i + 1;
                        const redCol = colMapReverse[origCol];
                        if (redCol !== undefined) {
                          // Use solverBeta (always uncoded coefficients)
                          constraintSum += solverBeta[redCol] * constraintVal;
                        }
                      }
                    }
                  }
                  // Solve using UNCODED equation: targetY = β0_uncoded + Σ_{j≠i} βj_uncoded * constraint_j + βi_uncoded * Xi
                  // Therefore: Xi = (targetY - β0_uncoded - constraintSum) / βi_uncoded
                  // User enters target and constraints in uncoded space, result is also uncoded
                  let result = (targetY - solverBeta[0] - constraintSum) / solverBeta[solveReducedCol];
                  setSolverResult(result);
                };

                // Store solve function in ref so top-level useEffect can call it
                solveRef.current = handleSolve;

                return (
                  <>
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
                                
                                let  dfBasefactors = 0;
                                // Add base factor rows only (not confounded) - AND only if selected in model
                                for (let i = 0; i < factors.length; i++) {
                                  // Skip if this factor is not selected in the model
                                  if (selectedFactorsForModel[i] === false) continue;
                                  
                                  const factor = factors[i];
                                  const termIdx = i + 1;
                                  const termDF = dfTotal - dfCurvature - termIdx < 0 ? 0 : 1;
                                  dfBasefactors += termDF;
                                  const termSS = termDF === 0 ? 0 : Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                                  const termMS = termDF === 0 ? 0 : termSS / termDF;
                                  //const errorMS = termDF === 0 ? 0 : SS_res / (n - p);
                                  const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                                  const pValue = fRatio > 0 && (n - p_reduced - dfCurvature) > 0 
                                    ? 1 - jStat.centralF.cdf(fRatio, termDF, n - p_reduced - dfCurvature) 
                                    : 1;

                                  rows.push(
                                    <TableRow key={`factor-${i}`}>
                                      <TableCell className="font-medium">{factor.name}</TableCell>
                                      <TableCell className="text-right">{termDF}</TableCell>
                                      <TableCell className="text-right">{termSS.toFixed(4)}</TableCell>
                                      <TableCell className="text-right">{termMS.toFixed(4)}</TableCell>
                                      <TableCell className="text-right">{fRatio > 0 ? fRatio.toFixed(4) : '-'}</TableCell>
                                      <TableCell className="text-right">
                                        <span className={pValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                          {pValue === 1 ? '-' : pValue.toFixed(4)}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }

                                // Add interaction rows (only between base factors) - AND only if selected in model
                                interactionPairs.forEach((pair, pairIdx) => {
                                  // Skip if this interaction is not selected in the model
                                  if (selectedFactorsForModel[`int-${pairIdx}`] === false) return;
                                  
                                  const termIdx = baseFactorCount + 1 + pairIdx;                                  
                                  const termDF = dfTotal - dfCurvature - dfBasefactors - (pairIdx + 1) <= 0 ? 0 : 1;
                                  dfInteractions += termDF;
                                  //const termDF = 1;
                                  const termSS = termDF === 0 ? 0 : Math.pow(beta[termIdx], 2) * XtX[termIdx][termIdx];
                                  const termMS = termDF === 0 ? 0 : termSS / termDF;
                                  //const errorMS = termDF === 0 ? 0 : SS_res / (n - p);
                                  const fRatio = errorMS > 0 ? termMS / errorMS : 0;
                                  const pValue = fRatio > 0 && (n - p) > 0 
                                    ? 1 - jStat.centralF.cdf(fRatio, termDF, n - p_reduced - dfCurvature) 
                                    : 1;
                                  if (termDF === 1) {
                                    rows.push(
                                      <TableRow key={`interaction-${pairIdx}`}>
                                        <TableCell className="font-medium">{pair.name}</TableCell>
                                        <TableCell className="text-right">{termDF}</TableCell>
                                        <TableCell className="text-right">{termSS.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{termMS.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{fRatio > 0 ? fRatio.toFixed(4) : '-'}</TableCell>
                                        <TableCell className="text-right">
                                          <span className={pValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                            {pValue === 1 ? '-' : pValue.toFixed(4)}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                });

                                // Calculate curvature effect if center points exist AND are included in model AND selected
                                //const hasCurvature = (includeCenterPoints && selectedFactorsForModel['centerPoint'] !== false);
                                //let dfCurvature = 0;
                                if (hasCurvature && selectedFactorsForModel['centerPoint'] !== false) {
                                  const centerPointIndices: number[] = [];
                                  const factorialPointIndices: number[] = [];
                                  
                                  runData.forEach((row, rowIdx) => {
                                    if (row.response !== null && !isNaN(row.response)) {
                                      const allFactorsZero = factors.every(factor => {
                                        const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                        return Math.abs(level) < 0.01;
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
                                    const y_f_at_center = beta[0];
                                    //const curveEffect = y_c_avg - y_f_at_center;
                                    //const curveSS = (n_c * n_f / (n_c + n_f)) * Math.pow(curveEffect, 2);
                                    //const curveMS = curveSS / dfCurvature;
                                    const curveMS = SS_curvature / dfCurvature;
                                    //const errorMS = dfTotal > dfBasefactors + dfInteractions + dfCurvature ? SS_res / (n - p) : 0;
                                    const curveFRatio = errorMS > 0 ? curveMS / errorMS : 0;
                                    const curvePValue = curveFRatio > 0 && (n - p_reduced - dfCurvature) > 0 
                                      ? 1 - jStat.centralF.cdf(curveFRatio, dfCurvature, n - p_reduced -dfCurvature) 
                                      : 1;

                                    rows.push(
                                      <TableRow key="curvature">
                                        <TableCell className="font-medium">Curvature</TableCell>
                                        <TableCell className="text-right">{dfCurvature}</TableCell>
                                        <TableCell className="text-right">{SS_curvature.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{curveMS.toFixed(4)}</TableCell>
                                        <TableCell className="text-right">{curveFRatio > 0.0000001 ? curveFRatio.toFixed(4) : '-'}</TableCell>
                                        <TableCell className="text-right">
                                          <span className={curvePValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                            {curvePValue > 0.99999 ? '-' : curvePValue.toFixed(4)}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                }

                                // Add model row
                                const numTerms = 1 + dfModel;
                                //const modelDF = numTerms - 1;
                                dfModel = dfBasefactors + dfInteractions + dfCurvature;
                                const modelMS = (SS_tot - SS_res) / dfModel;
                                dfResidual = dfTotal - dfModel;
                                //const errorMS = dfResidual === 0 ? NaN : SS_res / dfResidual;                                
                                const modelFRatio = dfResidual === 0 ? NaN : errorMS > 0 ? modelMS / errorMS : 0;
                                const modelPValue = dfResidual === 0 ? NaN : modelFRatio > 0 && (n - numTerms) > 0 
                                  ? 1 - jStat.centralF.cdf(modelFRatio, dfModel, n - numTerms) 
                                  : 1;

                                rows.push(
                                  <TableRow key="model" className="font-semibold">
                                    <TableCell>Model</TableCell>
                                    <TableCell className="text-right">{dfModel}</TableCell>
                                    <TableCell className="text-right">{(SS_tot - SS_res).toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{modelMS.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{modelFRatio >0 ? modelFRatio.toFixed(4) : '-'}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={modelPValue < 0.05 ? "text-green-600 font-semibold" : ""}>
                                        {modelPValue === 1 || isNaN(modelPValue) ? '-' : modelPValue.toFixed(4)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );

                                // Add error row

                                rows.push(
                                  <TableRow key="error">
                                    <TableCell>Error</TableCell>
                                    <TableCell className="text-right">{dfResidual}</TableCell>
                                    <TableCell className="text-right">{SS_res.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{errorMS.toFixed(4)}</TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                );

                                // Add total row
                                rows.push(
                                  <TableRow key="total" className="font-semibold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{dfTotal}</TableCell>
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

                    {/* Curvature Analysis Card */}
                    {(() => {
                      // Calculate factorial vs center points statistics
                      const centerPointIndices: number[] = [];
                      const factorialPointIndices: number[] = [];
                      
                      runData.forEach((row, rowIdx) => {
                        if (row.response !== null && !isNaN(row.response)) {
                          const allFactorsZero = factors.every(factor => {
                            const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                            return Math.abs(level) < 0.01;
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
                      
                      if (n_c === 0 || n_f === 0) return null;

                      const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                      const factorialResponses = factorialPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                      
                      const y_c_avg = centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length;
                      const y_f_avg = factorialResponses.reduce((a, b) => a + b, 0) / factorialResponses.length;
                      const curveDiff = y_c_avg - y_f_avg;
                      
                      // Curvature SS using same formula as ANOVA table: (n_f * n_c) / (n_f + n_c) * (meanF - meanC)^2
                      const SS_curvature = ((n_f * n_c) / (n_f + n_c)) * Math.pow(y_f_avg - y_c_avg, 2);
                      const curvatureDF = 1;
                      const curveMS = SS_curvature / curvatureDF;
                      
                      // Build main effects model to get error MS (same as ANOVA reduced model)
                      const X_main: number[][] = [];
                      const y_all: number[] = [];
                      runData.forEach((row, idx) => {
                        if (row.response !== null && !isNaN(row.response)) {
                          const row_vals = [1]; // intercept
                          factors.forEach(factor => {
                            row_vals.push(generatedPlan.plan[idx]?.[factor.name] ?? 0);
                          });
                          X_main.push(row_vals);
                          y_all.push(row.response);
                        }
                      });
                      
                      const n_total = y_all.length;
                      const p_main = X_main[0]?.length || 1;
                      
                      // Calculate main effects model coefficients
                      let XtX_main: number[][] = Array(p_main).fill(null).map(() => Array(p_main).fill(0));
                      let Xty_main: number[] = Array(p_main).fill(0);
                      
                      for (let i = 0; i < n_total; i++) {
                        for (let j = 0; j < p_main; j++) {
                          Xty_main[j] += X_main[i][j] * y_all[i];
                          for (let k = 0; k < p_main; k++) {
                            XtX_main[j][k] += X_main[i][j] * X_main[i][k];
                          }
                        }
                      }
                      
                      let beta_main: number[] = [];
                      let XtX_inv_main: number[][] | null = null;
                      try {
                        XtX_inv_main = invertMatrix(XtX_main);
                        if (XtX_inv_main) {
                          beta_main = Xty_main.map((_, j) => Xty_main.reduce((sum, val, k) => sum + XtX_inv_main![j][k] * val, 0));
                        }
                      } catch {
                        beta_main = [y_all.reduce((a, b) => a + b, 0) / n_total];
                      }
                      
                      // Calculate residual SS, then subtract curvature SS (same as ANOVA table)
                      const predictions_main = X_main.map(row => row.reduce((sum, val, i) => sum + val * (beta_main[i] || 0), 0));
                      const residualSS_main = y_all.reduce((sum, yi, i) => sum + Math.pow(yi - predictions_main[i], 2), 0);
                      const SS_res = residualSS_main - SS_curvature;
                      const errorDF_curv = n_total - p_main - curvatureDF;
                      const errorMS_curv = errorDF_curv > 0 ? SS_res / errorDF_curv : 0;
                      
                      const curveFRatio = errorMS_curv > 0 ? curveMS / errorMS_curv : 0;
                      const curvePValue = curveFRatio > 0 && errorDF_curv > 0
                        ? 1 - jStat.centralF.cdf(curveFRatio, curvatureDF, errorDF_curv)
                        : 1;
                      
                      const isSignificant = curvePValue < significanceLevel;
                      
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Curvature Analysis (Center Points vs Factorial Points)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm font-medium">Factorial Points Mean (ȳ_F):</span>
                                  <span className="font-mono font-semibold">{y_f_avg.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm font-medium">Center Points Mean (ȳ_C):</span>
                                  <span className="font-mono font-semibold">{y_c_avg.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm font-medium">Curvature Effect (ȳ_C - ȳ_F):</span>
                                  <span className="font-mono font-semibold">{curveDiff >= 0 ? '+' : ''}{curveDiff.toFixed(4)}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm font-medium">Curvature p-value:</span>
                                  <span className={`font-mono font-semibold ${isSignificant ? 'text-green-600' : ''}`}>
                                    {curvePValue.toFixed(4)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                  <span className="text-sm font-medium">Significance Level (α):</span>
                                  <span className="font-mono font-semibold">{significanceLevel}</span>
                                </div>
                                <div className={`p-3 rounded-lg ${isSignificant ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800'}`}>
                                  <div className="flex items-center gap-2">
                                    {isSignificant ? (
                                      <>
                                        <AlertTriangle className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                          Significant curvature detected (p-value ({curvePValue.toFixed(4)}) &lt; α). Non-linear relationship exists. Model with quadratic term is recommended.
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Info className="h-5 w-5 text-amber-600" />
                                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                          No significant curvature (p-value ({curvePValue.toFixed(4)}) ≥ α). Linear model is adequate.
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Coefficients Table with Model Selection */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Regression Coefficients <span className="text-xs"> (Uncheck to exclude from model)</span></CardTitle>
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
                                    <TableCell className={`text-right ${(displayCoeffStats[i + 1]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[i + 1]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                    <TableCell className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                    <TableCell className="text-center">
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
                                    <TableCell className="font-medium text-muted-foreground">{factor.name}</TableCell>
                                    <TableCell colSpan={5} className="text-muted-foreground">Term not included in model</TableCell>
                                    <TableCell className="text-center">
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
                                if (dfInteractions > 0 && dfInteractions > i) {
                                  const isIncluded = selectedFactorsForModel[`int-${i}`] !== false;
                                  
                                  if (isIncluded) {
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
                                      <TableCell className={`text-right ${(displayCoeffStats[factors.length + 1 + i]?.pValue ?? 1) < significanceLevel ? 'text-green-600 font-semibold' : ''}`}>{(Math.max(0, Math.min(1, displayCoeffStats[factors.length + 1 + i]?.pValue ?? 1))).toFixed(4)}</TableCell>
                                      <TableCell className={`text-right ${isHighVIF ? 'text-red-600 font-semibold' : isModerateVIF ? 'text-yellow-400 font-semibold' : ''}`}>{vif !== null ? vif.toFixed(2) : '-'}</TableCell>
                                      <TableCell className="text-center">
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
                                      <TableCell className="font-medium text-muted-foreground">{pair.name}</TableCell>
                                      <TableCell colSpan={5} className="text-muted-foreground">Term not included in model</TableCell>
                                      <TableCell className="text-center">
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
                                }
                                return null;
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="text-sm"><b>Grand Mean = {mean_y.toFixed(4)}</b></div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          VIF &gt; 5 indicates problematic multicollinearity (high correlation between terms - shown in red)<br></br>
                          &gt; 1 VIF &le; 5 indicates moderate multicollinearity (correlation between terms - shown in yellow)<br></br>
                          VIF &le; 1 indicates no multicollinearity (no correlation between terms - shown in black)
                        </div>
                        
                        {/* Pareto of Effects Checkbox */}
                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                          <Checkbox 
                            id="pareto-effects"
                            checked={showParetoOfEffects}
                            onCheckedChange={(checked) => setShowParetoOfEffects(!!checked)}
                            data-testid="checkbox-pareto-effects"
                          />
                          <Label htmlFor="pareto-effects" className="font-medium">Show Pareto of Effects</Label>
                        </div>
                        
                        {/* Pareto of Effects Chart */}
                        {showParetoOfEffects && (() => {
                          // Build effects data from CODED coefficients (beta_red)
                          // Effect = 2 × coefficient (because coded levels go from -1 to +1, so effect = change over 2 units)
                          const effectsData: { name: string; effect: number; absEffect: number }[] = [];
                          
                          // Main effects (only base factors, not confounded) - effect = 2 × coefficient
                          for (let i = 0; i < baseFactorCount; i++) {
                            if (selectedFactorsForModel[i] !== false) {
                              const origColIdx = i + 1;
                              const reducedColIdx = colMapReverse[origColIdx];
                              if (reducedColIdx !== undefined && beta_red[reducedColIdx] !== undefined && Number.isFinite(beta_red[reducedColIdx])) {
                                const effect = 2 * beta_red[reducedColIdx];
                                effectsData.push({
                                  name: factors[i].name,
                                  effect: effect,
                                  absEffect: Math.abs(effect)
                                });
                              }
                            }
                          }
                          
                          // Interaction effects - effect = 2 × coefficient
                          interactionPairs.forEach((pair, i) => {
                            if (selectedFactorsForModel[`int-${i}`] !== false) {
                              const origColIdx = baseFactorCount + 1 + i;
                              const reducedColIdx = colMapReverse[origColIdx];
                              if (reducedColIdx !== undefined && beta_red[reducedColIdx] !== undefined && Number.isFinite(beta_red[reducedColIdx])) {
                                const effect = 2 * beta_red[reducedColIdx];
                                effectsData.push({
                                  name: pair.name,
                                  effect: effect,
                                  absEffect: Math.abs(effect)
                                });
                              }
                            }
                          });
                          
                          // Add curvature effect if center points exist and are selected
                          const centerPointIndices: number[] = [];
                          const factorialPointIndices: number[] = [];
                          
                          runData.forEach((row, rowIdx) => {
                            if (row.response !== null && !isNaN(row.response)) {
                              const allFactorsZero = factors.every(factor => {
                                const level = generatedPlan.plan[rowIdx]?.[factor.name] ?? 0;
                                return Math.abs(level) < 0.01;
                              });
                              if (allFactorsZero) {
                                centerPointIndices.push(rowIdx);
                              } else {
                                factorialPointIndices.push(rowIdx);
                              }
                            }
                          });
                          
                          const hasCenterPointsInData = centerPointIndices.length > 0 && factorialPointIndices.length > 0;
                          
                          if (hasCenterPointsInData && selectedFactorsForModel['centerPoint'] !== false) {
                            const centerResponses = centerPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                            const factorialResponses = factorialPointIndices.map(idx => runData[idx].response).filter((r): r is number => r !== null && !isNaN(r));
                            
                            if (centerResponses.length > 0 && factorialResponses.length > 0) {
                              const y_c_avg = centerResponses.reduce((a, b) => a + b, 0) / centerResponses.length;
                              const y_f_avg = factorialResponses.reduce((a, b) => a + b, 0) / factorialResponses.length;
                              const curvatureEffect = y_c_avg - y_f_avg;
                              
                              effectsData.push({
                                name: 'Curvature',
                                effect: curvatureEffect,
                                absEffect: Math.abs(curvatureEffect)
                              });
                            }
                          }
                          
                          // Sort by absolute effect (descending for Pareto)
                          effectsData.sort((a, b) => b.absEffect - a.absEffect);
                          
                          if (effectsData.length === 0) {
                            return <div className="text-muted-foreground mt-4">No effects to display</div>;
                          }
                          
                          // Calculate significance threshold for effects
                          // Effect = 2 × coefficient, SE_effect = 2 × SE_coeff = 2 × sqrt(MSE/n)
                          // Critical effect = t_crit × SE_effect = t_crit × 2 × sqrt(MSE/n)
                          // Or using F: Critical effect = sqrt(F_crit × 4 × MSE / n)
                          let criticalEffect = 0;
                          if (errorDF_red > 0 && errorMS > 0 && n > 0) {
                            const fCrit = jStat.centralF.inv(1 - significanceLevel, 1, errorDF_red);
                            criticalEffect = Math.sqrt(fCrit * 4 * errorMS / n);
                          }
                          
                          // Prepare data for horizontal bar chart
                          const names = effectsData.map(d => d.name);
                          const effects = effectsData.map(d => d.effect);
                          const colors = effects.map(e => e >= 0 ? '#3b82f6' : '#ef4444'); // blue for positive, red for negative
                          
                          return (
                            <div className="mt-4">
                              <Plot
                                data={[{
                                  type: 'bar',
                                  y: names,
                                  x: effects.map(e => Math.abs(e)),
                                  orientation: 'h',
                                  marker: { color: colors },
                                  text: effects.map(e => e.toFixed(4)),
                                  textposition: 'outside',
                                  hovertemplate: '%{y}: %{text}<extra></extra>'
                                }]}
                                layout={{
                                  title: 'Pareto of Effects (Coded)',
                                  xaxis: { title: 'Absolute Effect', zeroline: true },
                                  yaxis: { 
                                    title: '',
                                    autorange: 'reversed',
                                    tickfont: { size: 11 }
                                  },
                                  height: Math.max(300, effectsData.length * 35 + 100),
                                  margin: { l: 120, r: 60, t: 50, b: 50 },
                                  showlegend: false,
                                  paper_bgcolor: 'rgba(0,0,0,0)',
                                  plot_bgcolor: 'rgba(0,0,0,0)',
                                  shapes: criticalEffect > 0 ? [{
                                    type: 'line',
                                    x0: criticalEffect,
                                    x1: criticalEffect,
                                    y0: -0.5,
                                    y1: effectsData.length - 0.5,
                                    line: {
                                      color: '#dc2626',
                                      width: 2,
                                      dash: 'dash'
                                    }
                                  }] : [],
                                  annotations: criticalEffect > 0 ? [{
                                    x: criticalEffect,
                                    y: -0.5,
                                    xanchor: 'left',
                                    yanchor: 'bottom',
                                    text: ` α=${significanceLevel}`,
                                    showarrow: false,
                                    font: { size: 10, color: '#dc2626' }
                                  }] : []
                                }}
                                config={{ displayModeBar: false, responsive: true }}
                                style={{ width: '100%' }}
                              />
                              <div className="text-sm text-muted-foreground text-center mt-2">
                                <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#3b82f6' }}></span> Positive effect
                                <span className="inline-block w-3 h-3 rounded ml-4 mr-1" style={{ backgroundColor: '#ef4444' }}></span> Negative effect
                                {criticalEffect > 0 && (
                                  <>
                                    <span className="ml-4 mr-1" style={{ borderLeft: '2px dashed #dc2626', height: '12px', display: 'inline-block' }}></span>
                                    <span> Significance threshold ({criticalEffect.toFixed(4)})</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
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
                          <p>Y = {Number.isFinite(displayBeta[0]) ? displayBeta[0].toFixed(4) : 'N/A'}</p>
                          {Array.from({length: baseFactorCount}).map((_, i) => {
                            if (selectedFactorsForModel[i] === false) return null;
                            const origColIdx = i + 1;
                            const reducedColIdx = colMapReverse[origColIdx];
                            if (reducedColIdx === undefined) return null;
                            return (
                              Number.isFinite(displayBeta[reducedColIdx]) && (
                                <p key={i}>
                                  &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[reducedColIdx] >= 0 ? '+' : ''} {displayBeta[reducedColIdx].toFixed(4)} × {factors[i].name}{factors[i].type === 'continuous' && factors[i].units ? ` (${factors[i].units})` : ''}
                                </p>
                              )
                            );
                          })}
                          {interactionPairs.map((pair, i) => {
                            if (selectedFactorsForModel[`int-${i}`] === false) return null;
                            const origColIdx = baseFactorCount + 1 + i;
                            const reducedColIdx = colMapReverse[origColIdx];
                            if (reducedColIdx === undefined) return null;
                            return (
                              Number.isFinite(displayBeta[reducedColIdx]) && (
                                <p key={`int-${i}`}>
                                  &nbsp;&nbsp;&nbsp;&nbsp;{displayBeta[reducedColIdx] >= 0 ? '+' : ''} {displayBeta[reducedColIdx].toFixed(4)} × {pair.name}
                                </p>
                              )
                            );
                          })}
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
                            {(() => {
                              const adTest = performNormalityTest(residuals_red, residualMean, residualStd);
                              
                              return (
                                <div className="space-y-4">
                                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <p className="text-sm font-semibold mb-3">Residual Statistics</p>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Standard Deviation</p>
                                        <p className="text-lg font-bold">{residualStd.toFixed(6)}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Max Residual</p>
                                        <p className="text-lg font-bold">{Math.max(...residuals_red.map(Math.abs)).toFixed(4)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <p className="text-sm font-semibold mb-3">Normality Test (Anderson-Darling)</p>
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
                                </div>
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
                                const validResiduals = residuals_red.filter(r => typeof r === 'number' && isFinite(r));
                                const minResidual = Math.min(...validResiduals);
                                const maxResidual = Math.max(...validResiduals);
                                const range = maxResidual - minResidual;
                                const padding = range > 0 ? range * 0.1 : 1;
                                const yMin = minResidual - padding;
                                const yMax = maxResidual + padding;
                                
                                return (
                                  <>
                                    {showResidualsVsFits && (
                                      <div>
                                        <Plot
                                    data={[
                                      {
                                        type: 'scatter',
                                        mode: 'markers',
                                        x: predictions_red,
                                        y: residuals_red,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: predictions_red,
                                        y: Array(predictions_red.length).fill(0),
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
                                        x: Array.from({ length: residuals_red.length }, (_, i) => i + 1),
                                        y: residuals_red,
                                        marker: { color: 'rgb(59, 130, 246)', size: 6 },
                                        line: { color: 'rgb(59, 130, 246)' },
                                      } as any,
                                      {
                                        type: 'scatter',
                                        mode: 'lines',
                                        x: [1, residuals_red.length],
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
                                const sorted = [...residuals_red].sort((a, b) => a - b);
                                const n_res = sorted.length;
                                const theoreticalQuantiles = sorted.map((_, i) => {
                                  const p = (i + 0.5) / n_res;
                                  return jStat.normal.inv(p, 0, 1);
                                });
                                const lineX = [residualMean - 3 * residualStd, residualMean + 3 * residualStd];
                                const lineY = [-3, 3];
                                return (
                                  <div>
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
                                  </div>
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
                                  const factorLow = factor.type === 'continuous' ? parseFloat(String(factor.lowValue)) : NaN;
                                  const factorHigh = factor.type === 'continuous' ? parseFloat(String(factor.highValue)) : NaN;
                                  const isOutsideRange = constraintVal !== null && constraintVal !== undefined && !isNaN(factorLow) && !isNaN(factorHigh) && (
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
                            Save Setup
                          </Button>

                          {targetYDisplay !== '' && Number.isFinite(targetY) && (() => {
                            const solveOrigCol = solveFactorIdx + 1;
                            const solveRedCol = colMapReverse[solveOrigCol];
                            return solveRedCol !== undefined && displayBeta[solveRedCol] === 0;
                          })() && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded border border-amber-200 dark:border-amber-800">
                              <p className="text-sm text-amber-600 dark:text-amber-400">
                                ⚠️ Cannot solve for {factors[solveFactorIdx].name}: This factor has a coefficient of 0 in the model, meaning it has no significant effect on the response in this design.
                              </p>
                            </div>
                          )}

                          {solverResult !== null && (() => {
                            // Calculate confidence and prediction intervals for Y target
                            const tValue = jStat.studentt.inv((1 - significanceLevel / 2), n - numCoefficients);
                            const s2 = SS_res / (n - numCoefficients); // Variance estimate
                            
                            // Get observed Y range from responses
                            const observedYValues = Object.values(responses).filter(r => r !== null && typeof r === 'number' && isFinite(r)) as number[];
                            const minY = observedYValues.length > 0 ? Math.min(...observedYValues) : NaN;
                            const maxY = observedYValues.length > 0 ? Math.max(...observedYValues) : NaN;
                            const targetYOutsideRange = Number.isFinite(minY) && Number.isFinite(maxY) && (targetY < minY || targetY > maxY);
                            
                            // Check if solution is outside the solve factor's range
                            const solveFactor = factors[solveFactorIdx];
                            const solveFactorLow = solveFactor.type === 'continuous' ? parseFloat(String(solveFactor.lowValue)) : NaN;
                            const solveFactorHigh = solveFactor.type === 'continuous' ? parseFloat(String(solveFactor.highValue)) : NaN;
                            const solverOutsideRange = !isNaN(solveFactorLow) && !isNaN(solveFactorHigh) && 
                              (solverResult < solveFactorLow || solverResult > solveFactorHigh);
                            const solveFactorRangeStr = `[${solveFactorLow.toFixed(4)}, ${solveFactorHigh.toFixed(4)}]`;
                            
                            // Build prediction vector x for selected factors: [1, x1, x2, ..., xk]
                            const xRow: number[] = [1]; // Intercept
                            for (let i = 0; i < baseFactorCount; i++) {
                              if (selectedFactorsForModel[i] !== false) {
                                const val = i === solveFactorIdx ? solverResult : (constraintValues[i] ?? 0);
                                xRow.push(val);
                              }
                            }
                            
                            // Calculate X'X matrix for selected base factors only
                            const XtXForIntervals: number[][] = Array(xRow.length).fill(0).map(() => Array(xRow.length).fill(0));
                            for (let row = 0; row < n; row++) {
                              // Build row of X matrix for selected factors only
                              const xRow_data = [1]; // intercept
                              for (let i = 0; i < baseFactorCount; i++) {
                                if (selectedFactorsForModel[i] !== false) {
                                  xRow_data.push(X[row][i + 1]);
                                }
                              }
                              // Accumulate X'X
                              for (let i = 0; i < xRow_data.length; i++) {
                                for (let j = 0; j < xRow_data.length; j++) {
                                  XtXForIntervals[i][j] += xRow_data[i] * xRow_data[j];
                                }
                              }
                            }
                            
                            // Invert (X'X)
                            let XtXInv: number[][] | null = null;
                            try {
                              XtXInv = invertMatrix(XtXForIntervals);
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
                                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">⚠️ Target Y outside the studied model (range: {minY.toFixed(4)} - {maxY.toFixed(4)})</p>
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
