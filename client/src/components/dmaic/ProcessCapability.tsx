import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
//import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TrendingUp, Save, Undo, Calculator, BarChart3, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
//import { formatPercentage } from './ProcessCapabilityContinuous';
import { calculateNonConformityResults } from '@/components/dmaic/ProcessCapabilityAttribute';
import { calculateDPMOResults } from '@/components/dmaic/ProcessCapabilityAttribute';
import { calculateDPUResults } from '@/components/dmaic/ProcessCapabilityAttribute';
import {formatnonconformrate} from '@/lib/statisticsUtils';
import { 
  mean, 
  standardDeviation, 
  variance,
  parseNumericValue,
  calculateMode,
  performNormalityTest,
  getHistogramData,
  calculateQuartiles,
  calculateMovingRange,
  calculateIndividualControlLimits,
  calculateMovingRangeControlLimits,
  calculateZScoreLongShortTerm,
  calculatePerformanceMetrics,
  calculateCapabilityIndexes,
  calculateObservedPerformanceMetrics,
  assessProcessVariation,
  inverseNormCDF
} from "@/lib/statisticsUtils";
import React from 'react';
import {ProcessCapabilityContinuousCards} from '@/components/dmaic/ProcessCapabilityContinuous'; 
import StatisticalCharts from '@/components/dmaic/StatisticalCharts';
import {
  calculateNonConformity,
  calculateDPMO,
  calculateRolledThroughputYield,
  calculateOEE,
  calculateParetoOfDefects,
  calculateDPU,
} from "@/lib/attributeCapabilityUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine, ComposedChart } from "recharts";
//import { LineChart, BarChart, ReferenceLine } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
//import { toast } from "@/hooks/use-toast";
//import { ProcessVariationPanel } from "./ProcessCapabilityContinuous";
//import { LogicCapabilityAssessment } from "./ProcessCapabilityContinuous";
import AIAnalysisSection from "./ProcessCapabilityContinuous"
import {formatdpu} from "@/lib/statisticsUtils";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  ctqId?: number; // Foreign key to CTS characteristics
  lsl: string;
  usl: string;
  target: string;
  zShift: number;
  dataSetTerm: "Long Term" | "Short Term";
  capabilityIndex: "Z" | "Cp/Cpk";
  showPercentage: boolean;
  showZ: boolean; // For attribute CTQs
  showStatistics: boolean;
  capabilityAssessment?: string; // AI-generated capability assessment
  // Boolean enablers for each analysis type
  enableNonConformity?: boolean;
  enableDpmo?: boolean;
  enableRty?: boolean;
  enableOee?: boolean;
  enablePareto?: boolean;
  enableDpu?: boolean;
  // Non-Conformity Analysis fields
  nonConformityUnits?: number;
  totalUnits?: number;
  // DPMO Analysis fields
  dpmoDefects?: number;
  
  // Calculated results
  calculatedNonConformityRate?: number;
  calculatedZValue_LT?: number;
  calculatedZValue_ST?: number;
  calculatedDPMO?: number;
  calculatedDPMO_Z_LT?: number;
  calculatedDPMO_Z_ST?: number;
  calculatedDPMO_LT?: number;
  calculatedDPMO_ST?: number;
  calculatedOEE?: number;
  dpmoUnits?: number;
  dpmoOpportunitiesPerUnit?: number;
  // RTY Analysis fields
  rtyProcessSteps?: Array<{stepName: string; passed: number | null; total: number}>;
  // OEE Analysis fields - New input fields
  oeeScheduledTime?: number;
  oeeAvailableTime?: number;
  oeeNominalCapacity?: number;
  oeePartsManufactured?: number;
  oeeBadParts?: number;
  // Pareto Analysis fields
  paretoDefectCategories?: Array<{category: string; count: number | null}>;
  // DPU Analysis fields
  dpuDefects?: number;
  dpuUnits?: number;
  calculatedDPU_Z_LT?: number;
  calculatedDPU_Z_ST?: number;
  calculatedDPU_LT?: number;
  calculatedDPU_ST?: number;
}

interface DataPoint {
  id?: number;
  indexNumber: number;
  dataValue: number;
}
interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}
interface ProcessCapabilityProps {
  projectId: number;
}

export default function ProcessCapability({ projectId }: ProcessCapabilityProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [capabilityData, setCapabilityData] = useState<{ [ctq: string]: ProcessCapabilityData }>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [dataPoints, setDataPoints] = useState<{ [ctq: string]: DataPoint[] }>({});
  const [inputValues, setInputValues] = useState<{ [ctq: string]: string }>({});
  const [undoStates, setUndoStates] = useState<{ [ctq: string]: DataPoint[] }>({});
  const [pasteInputs, setPasteInputs] = useState<{ [ctq: string]: string }>({});
  const [focusedCell, setFocusedCell] = useState<{ [ctq: string]: number }>({});
  const [showStatistics, setShowStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [isStatisticsLoaded, setIsStatisticsLoaded] = useState(false);

  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState<{ [ctq: string]: boolean }>({});
  const [autoSaveTimers, setAutoSaveTimers] = useState<{ [ctq: string]: NodeJS.Timeout }>({});
  
  // State for tracking Process Capability visibility for White Belt and Yellow Belt projects
  const [showProcessCapability, setShowProcessCapability] = useState<{ [ctq: string]: boolean }>({});

  // Load last active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }
    // Reset initialization state when project changes
    setHasInitializedTab(false);
  }, [projectId]);



  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`process-capability-active-tab-${projectId}`, tabValue);
  };

  // Track tab initialization to prevent overriding saved tabs
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  // Function to toggle Process Capability visibility for White Belt and Yellow Belt projects
  const toggleProcessCapabilityVisibility = (ctq: string) => {
    const newState = !showProcessCapability[ctq];
    setShowProcessCapability(prev => ({
      ...prev,
      [ctq]: newState
    }));
    localStorage.setItem(`process-capability-show-${projectId}-${ctq}`, String(newState));
  };

  // Function to handle undo operation
  const handleUndo = (ctq: string) => {
    if (undoStates[ctq]) {
      setDataPoints(prev => ({
        ...prev,
        [ctq]: JSON.parse(JSON.stringify(undoStates[ctq]))
      }));
      
      // Clear the undo state after using it
      setUndoStates(prev => {
        const newState = { ...prev };
        delete newState[ctq];
        return newState;
      });
      
      toast({
        title: "Undone",
        description: "Previous paste operation has been undone",
      });
    }
  };

  // Add keyboard shortcut handler for Ctrl+Z and cleanup auto-save timers
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Handle Ctrl+Z for undo - works both in and outside input fields
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && activeTab) {
        if (undoStates[activeTab]) {
          event.preventDefault();
          handleUndo(activeTab);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, [activeTab, undoStates]);

  // Load CTQs from centralized endpoint
  const { data: ctqsData, isLoading: ctqsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctqs`],
    enabled: !!projectId,
  });

  // Load CTS characteristics for additional data
  const { data: ctsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Fetch project data to determine project type
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch project charter to determine project type
  const { data: charter } = useQuery({
    queryKey: ['/api/projects', projectId, 'charter'],
    enabled: !!projectId
  });

  // Load existing Process Capability data
  const { data: capabilityDataResponse, isLoading: capabilityLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/process-capability`],
    enabled: !!projectId,
  });

  // Initialize showProcessCapability state from localStorage after queries are loaded
  useEffect(() => {
    // Early return if any data is still loading or undefined
    if (ctqsLoading || projectLoading || !ctqsData || !ctsData || !projectData) {
      return;
    }

    try {
      // Use centralized CTQs endpoint which aggregates from all sources
      if ((ctqsData as any)?.ctqs?.length > 0) {
        const ctqs = (ctqsData as any).ctqs.map((item: any) => item.ctq);
        if (ctqs.length > 0) {
          const initialShowState: { [ctq: string]: boolean } = {};
          ctqs.forEach((ctq: string) => {
            const savedState = localStorage.getItem(`process-capability-show-${projectId}-${ctq}`);
            initialShowState[ctq] = savedState === 'true';
          });
          setShowProcessCapability(initialShowState);
        }
      }
    } catch (error) {
      console.warn('Error initializing Process Capability show state:', error);
    }
  }, [projectId, ctqsData, ctsData, projectData, ctqsLoading, projectLoading]);

  // Save Process Capability mutation
  const saveCapabilityMutation = useMutation({
    mutationFn: async (data: ProcessCapabilityData) => {
      const response = await fetch(`/api/projects/${projectId}/process-capability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: "Process capability analysis saved successfully",
      });
      
      // Save any unsaved data points first
      const ctq = variables.ctq;
      const currentPoints = dataPoints[ctq] || [];
      
      if (currentPoints.length > 0 && data.capability?.id) {
        // Save data points to database
        saveDataPointMutation.mutate({
          processCapabilityId: data.capability.id,
          dataPoints: currentPoints.map(point => point.dataValue)
        });
      }
      
      // Invalidate queries to refresh capability data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/process-capability`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save process capability analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Function to load data points for a specific process capability
  const loadDataPoints = async (processCapabilityId: number) => {
    const response = await fetch(`/api/process-capability/${processCapabilityId}/data`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Failed to load data points: ${response.statusText}`);
    }
    const data = await response.json();
    return data.dataPoints || [];
  };

  // Mutation to save data points (JSON array)
  const saveDataPointMutation = useMutation({
    mutationFn: async ({ processCapabilityId, dataPoints }: { processCapabilityId: number, dataPoints: number[] }) => {
      //console.log("Mutation function called with:", { processCapabilityId, dataPoints });
      const response = await apiRequest('POST', `/api/process-capability/${processCapabilityId}/data`, { dataPoints });
      //console.log("API response:", response);
      return response;
    },
    onSuccess: (data) => {
      {/*console.log("Mutation succeeded:", data);*/}
      // Don't show toast here as it's handled in saveAllDataPoints
    },
    onError: (error) => {

      // Don't show toast here as it's handled in saveAllDataPoints
    },
  });

  // Get CTQs from centralized endpoint
  const getCTQs = () => {
    // Use centralized CTQs endpoint which aggregates from all sources
    if (ctqsData && (ctqsData as any)?.ctqs?.length > 0) {
      return (ctqsData as any).ctqs.map((item: any) => item.ctq);
    }
    
    return [];
  };
  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (!ctsData) return [];
    if (typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous"
      }));
    }
    return [];
  };

  // Auto-save function with debouncing
  const autoSaveDataPoints = async (ctq: string) => {
    let processCapabilityId = capabilityData[ctq]?.id;
    
    // If no capability configuration exists, create one first
    if (!processCapabilityId) {
      try {
        // Find CTQ ID from CTS characteristics
        const ctqCharacteristic = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        const ctqId = ctqCharacteristic?.id;
        
        const defaultCapabilityData: Omit<ProcessCapabilityData, 'id'> = {
                ctq: ctq,
                ctqId: ctqId, // Include CTQ ID for proper foreign key relationship
                lsl: "",
                usl: "",
                target: "",
                zShift: 1.5,
                dataSetTerm: "Long Term", // Now properly typed as literal
                capabilityIndex: "Z", // Now properly typed as literal
                showPercentage: false,
                showZ: false,
                showStatistics: false,
                capabilityAssessment: "",
                enableNonConformity: false,
                enableDpmo: false,
                enableRty: false,
                enableOee: false,
                enablePareto: false,
                enableDpu: false,
            };
        
        const result = await saveCapabilityMutation.mutateAsync(defaultCapabilityData);
        processCapabilityId = result.capability.id;
        
        // Update local state
        setCapabilityData(prev => ({
          ...prev,
          [ctq]: {
            ...defaultCapabilityData,
            id: processCapabilityId
          }
        }));
      } catch (error) {

        return;
      }
    }
    
    // ADD THIS: Type guard to ensure processCapabilityId is defined
    if (!processCapabilityId) {
      return;
    }
    
    const currentPoints = dataPoints[ctq] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    
    if (numericValues.length === 0) return;
    
    try {
      await saveDataPointMutation.mutateAsync({
        processCapabilityId, // Now TypeScript knows this is definitely a number
        dataPoints: numericValues
      });
      //console.log(`Auto-saved ${numericValues.length} data points for ${ctq}`);
      
      // Clear the timer from state to hide the auto-saving indicator
      setAutoSaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[ctq];
        return newTimers;
      });
    } catch (error) {

      // Clear the timer even if save failed
      setAutoSaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[ctq];
        return newTimers;
      });
    }
  };

  // Debounced auto-save trigger
  const triggerAutoSave = (ctq: string) => {
    // Clear existing timer if any
    if (autoSaveTimers[ctq]) {
      clearTimeout(autoSaveTimers[ctq]);
    }
    
    // Set new timer for 2 seconds delay
    const newTimer = setTimeout(() => {
      autoSaveDataPoints(ctq);
    }, 2000);
    
    setAutoSaveTimers(prev => ({
      ...prev,
      [ctq]: newTimer
    }));
  };

  // Functions to handle data input for continuous CTQs
  const addDataPointToLocalState = (ctq: string, value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    const currentPoints = dataPoints[ctq] || [];
    
    // Update local state with just the numeric values
    setDataPoints(prev => ({
      ...prev,
      [ctq]: [...(prev[ctq] || []), { indexNumber: currentPoints.length + 1, dataValue: numericValue }]
    }));
    
    // Clear input value
    setInputValues(prev => ({
      ...prev,
      [ctq]: ""
    }));

    // Trigger auto-save
    triggerAutoSave(ctq);
  };

  // Function to delete a data point
  const handleDeleteDataPoint = (ctq: string, index: number) => {
    setDataPoints(prev => {
      const currentPoints = prev[ctq] || [];
      const updatedPoints = currentPoints.filter((_, i) => i !== index);
      
      // Re-index the remaining points
      const reindexedPoints = updatedPoints.map((point, i) => ({
        ...point,
        indexNumber: i + 1
      }));
      
      return {
        ...prev,
        [ctq]: reindexedPoints
      };
    });

    // Trigger auto-save after deletion
    triggerAutoSave(ctq);
    
    toast({
      title: "Data Point Deleted",
      description: "The data point has been removed and the list has been re-indexed.",
    });
  };

  const saveAllDataPoints = async (ctq: string) => {
    let processCapabilityId = capabilityData[ctq]?.id;
    
    // If no capability configuration exists, create one first
    if (!processCapabilityId) {

      try {
        // Find CTQ ID from CTS characteristics
        const ctqCharacteristic = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        const ctqId = ctqCharacteristic?.id;
        
        // Create a default capability configuration
       const defaultCapabilityData: Omit<ProcessCapabilityData, 'id'> = {
                ctq: ctq,
                ctqId: ctqId, // Include CTQ ID for proper foreign key relationship
                lsl: "",
                usl: "",
                target: "",
                zShift: 1.5,
                dataSetTerm: "Long Term", // Now properly typed as literal
                capabilityIndex: "Z", // Now properly typed as literal
                showPercentage: false,
                showZ: false,
                showStatistics: false,
                capabilityAssessment: "",
            };
        
        const result = await saveCapabilityMutation.mutateAsync(defaultCapabilityData);
        processCapabilityId = result.capability.id;
        
        // Update local state with the new capability data
        setCapabilityData(prev => ({
          ...prev,
          [ctq]: {
            ...defaultCapabilityData,
            id: processCapabilityId
          }
        }));
        

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create capability configuration",
          variant: "destructive",
        });
        return;
      }
    }
    
    // ADD THIS: Type guard to ensure processCapabilityId is defined
    if (!processCapabilityId) {
      toast({
        title: "Error",
        description: "Failed to obtain process capability ID",
        variant: "destructive",
      });
      return;
    }
    
    const currentPoints = dataPoints[ctq] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    
    if (numericValues.length === 0) {
      toast({
        title: "Warning",
        description: "No data points to save",
        variant: "destructive",
      });
      return;
    }
    
    //console.log("Saving data points:", { processCapabilityId, numericValues });
    
    try {
      // Save all data points as JSON array to database
      await saveDataPointMutation.mutateAsync({
        processCapabilityId, // Now TypeScript knows this is definitely a number
        dataPoints: numericValues
      });
      
      // Reload data points from database
      await loadDataPointsForCtq(ctq);
      
      toast({
        title: "Success",
        description: `Saved ${numericValues.length} data points`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to save data points: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleDataInput = (ctq: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [ctq]: value
    }));
  };

  const handleAddDataPoint = (ctq: string) => {
    const value = inputValues[ctq] || "";
    if (value.trim() && !isNaN(parseFloat(value))) {
      addDataPointToLocalState(ctq, value);
    }
  };

  // Function to handle focused cell paste for data input
  const handleFocusedCellPaste = (ctq: string, startIndex: number, pasteData: string) => {
    try {
      // Save current state for undo (only if data exists)
      if (dataPoints[ctq] && dataPoints[ctq].length > 0) {
        setUndoStates(prev => ({
          ...prev,
          [ctq]: JSON.parse(JSON.stringify(dataPoints[ctq]))
        }));
      }
      
      // Parse tab-separated or comma-separated values (Excel format)
      const rows = pasteData.trim().split('\n');
      const parsedValues: number[] = [];
      
      rows.forEach(row => {
        // Split by tabs first (Excel default), then by commas if no tabs
        const cells = row.includes('\t') ? row.split('\t') : row.split(',');
        
        cells.forEach(cell => {
          const trimmedCell = cell.trim();
          if (trimmedCell !== '' && trimmedCell !== '-') {
            const parsed = parseFloat(trimmedCell);
            if (!isNaN(parsed) && isFinite(parsed)) {
              parsedValues.push(parsed);
            }
          }
        });
      });
      
      if (parsedValues.length === 0) {
        toast({
          title: "No Data Found",
          description: "No valid numeric data found in clipboard. Please copy data from Excel first.",
          variant: "destructive",
        });
        return;
      }
      
      // Apply the pasted data starting from the correct startIndex
      setDataPoints(prev => {
        const currentData = [...(prev[ctq] || [])];
        
        // Calculate the end index for the paste operation
        const endIndex = startIndex + parsedValues.length - 1;
        
        // Extend array if needed to accommodate the paste range
        while (currentData.length <= endIndex) {
          currentData.push({
            indexNumber: currentData.length + 1,
            dataValue: 0
          });
        }
        
        // Replace values ONLY from startIndex to endIndex (inclusive)
        // Do not modify any cells before startIndex
        parsedValues.forEach((value, i) => {
          const targetIndex = startIndex + i;
          currentData[targetIndex] = {
            indexNumber: targetIndex + 1,
            dataValue: value
          };
        });
        
        return {
          ...prev,
          [ctq]: currentData
        };
      });
      
      toast({
        title: "Success",
        description: `Pasted ${parsedValues.length} data points from position ${startIndex + 1} to ${startIndex + parsedValues.length}`,
      });

      // Trigger auto-save after paste
      triggerAutoSave(ctq);
      
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to paste data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to handle paste from Excel button (consistent with MSA pattern)
  const handlePasteFromExcel = (ctq: string, rawindex: number, event: React.ClipboardEvent) => {
    event.preventDefault();
    
    const pasteData = event.clipboardData.getData('text');
    if (!pasteData.trim()) {
      toast({
        title: "No Data Found",
        description: "No data found in clipboard. Please copy data from Excel first.",
        variant: "destructive",
      });
      return;
    }
    
    handleFocusedCellPaste(ctq, rawindex, pasteData);
  };

  const loadDataPointsForCtq = async (ctq: string) => {
    const processCapabilityId = capabilityData[ctq]?.id;
    if (!processCapabilityId) {

      return;
    }
    
    try {
      //console.log(`Loading data points for CTQ: ${ctq}, ID: ${processCapabilityId}`);
      const points = await loadDataPoints(processCapabilityId);
      //console.log(`Loaded ${points.length} data points for CTQ: ${ctq}`, points);
      setDataPoints(prev => ({
        ...prev,
        [ctq]: points
      }));
    } catch (error) {

    }
  };

  // Load data points when process capability data is loaded (only once)
  useEffect(() => {
    if (!ctsData || ctqsLoading || projectLoading) return;
    
    const ctqs = getCtqsWithTypes();
    ctqs.forEach(({ ctq }) => {
      if (capabilityData[ctq]?.id && !dataPoints[ctq]) {
        // Only load data points if we don't already have data points for this CTQ
        loadDataPointsForCtq(ctq);
      }
    });
  }, [capabilityData, ctsData, ctqsLoading, projectLoading]);

  // Initialize Process Capability data when CTQs and capability data are loaded
  useEffect(() => {
    if (!ctsData || ctqsLoading || projectLoading) return;
    
    const ctqs = getCtqsWithTypes();
    if (ctqs.length > 0) {
      const initialData: { [ctq: string]: ProcessCapabilityData } = {};
      const statisticsStates: { [ctq: string]: boolean } = {};
      
      // Create Process Capability entry for each CTQ
      ctqs.forEach((ctqWithType: CtqWithType) => {
        const ctq = ctqWithType.ctq;
        
        // Check if this CTQ comes from CTS characteristics to get CTQ ID and auto-populate LSL, USL, target
        const ctsChar = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        const ctqId = ctsChar?.id;
        
        // Find existing capability by CTQ ID first (more reliable), then fall back to CTQ name
        let existingCapability;
        if (ctqId) {
          existingCapability = (capabilityDataResponse as any)?.processCapability?.find((cap: any) => cap.ctqId === ctqId);
        }
        if (!existingCapability) {
          existingCapability = (capabilityDataResponse as any)?.processCapability?.find((cap: any) => cap.ctq === ctq);
        }
        
        initialData[ctq] = existingCapability ? {
          ...existingCapability,
          capabilityAssessment: existingCapability.capabilityAssessment || "",
          enableNonConformity: existingCapability.enableNonConformity || false,
          enableDpmo: existingCapability.enableDpmo || false,
          enableRty: existingCapability.enableRty || false,
          enableOee: existingCapability.enableOee || false,
          enablePareto: existingCapability.enablePareto || false,
          enableDpu: existingCapability.enableDpu || false,
        } : {
          ctq: ctq,
          lsl: ctsChar?.lsl || "",
          usl: ctsChar?.usl || "",
          target: ctsChar?.target || "",
          zShift: 1.5,
          dataSetTerm: "Long Term" as const,
          capabilityIndex: "Z" as const,
          showPercentage: false,
          showZ: false,
          showStatistics: false,
          capabilityAssessment: "",
          enableNonConformity: false,
          enableDpmo: false,
          enableRty: false,
          enableOee: false,
          enablePareto: false,
          enableDpu: false
        };
        
        // Load statistics visibility state from database
        statisticsStates[ctq] = existingCapability?.showStatistics || false;
      });
      
      setCapabilityData(initialData);
      setShowStatistics(statisticsStates);
      
      // Always ensure we have an active tab when CTQs are available
      if (ctqs.length > 0) {
        if (!activeTab || !ctqs.some(c => c.ctq === activeTab)) {
          // Set to saved tab if valid, otherwise first CTQ
          const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
          const ctqNames = ctqs.map(c => c.ctq);
          if (savedTab && ctqNames.includes(savedTab)) {
            setActiveTab(savedTab);
          } else {
            setActiveTab(ctqs[0].ctq);
          }
          setHasInitializedTab(true);
        }
      }
    }
  }, [ctqsData, capabilityDataResponse, ctsData, activeTab, ctqsLoading, projectLoading]);

  // Auto-calculate analysis when capability data is loaded and state is updated
  useEffect(() => {
    if (Object.keys(capabilityData).length > 0) {
      //console.log('Running initialization auto-calculation after state update...');
      setTimeout(() => {
        Object.keys(capabilityData).forEach(ctq => {
          const data = capabilityData[ctq];

          // Auto-calculate Non-Conformity if data is available
          if (data.enableNonConformity && data.nonConformityUnits !== undefined && data.totalUnits && data.totalUnits > 0) {
            //console.log(`Auto-calculating Non-Conformity for loaded CTQ: ${ctq}`);
            calculateIndividualAnalysis(ctq, "NonConformity");
          }
          
          // Auto-calculate DPMO if data is available
          if (data.enableDpmo && data.dpmoDefects !== undefined && data.dpmoUnits && data.dpmoOpportunitiesPerUnit && data.dpmoUnits > 0) {
            //console.log(`Auto-calculating DPMO for loaded CTQ: ${ctq}`);
            calculateIndividualAnalysis(ctq, "DPMO");
          }
          
          // Auto-calculate DPU if data is available
          if (data.enableDpu && data.dpuDefects !== undefined && data.dpuUnits && data.dpuUnits > 0) {
            //console.log(`Auto-calculating DPU for loaded CTQ: ${ctq}`);
            calculateIndividualAnalysis(ctq, "DPU");
          }

          // Auto-calculate OEE if data is available
          if (data.enableOee && data.oeeScheduledTime && data.oeeAvailableTime && 
              data.oeeNominalCapacity && data.oeePartsManufactured) {
            //console.log(`Auto-calculating OEE for loaded CTQ: ${ctq}`);
            calculateIndividualAnalysis(ctq, "OEE");
          }
        });
      }, 500);
    }
  }, [capabilityData]);

  const updateCapabilityField = (ctq: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => {
      const updated = {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          [field]: value,
        },
      };
      
      // Auto-calculate if the field affects calculations and has meaningful values
      if (['nonConformityUnits', 'totalUnits', 'dpmoDefects', 'dpmoUnits', 'dpmoOpportunitiesPerUnit', 'oeeScheduledTime', 'oeeAvailableTime', 'oeeGoodCount', 'oeeNominalCapacity', 'oeePartsManufactured', 'oeeBadCounts'].includes(field)) {
        //console.log('Field changed that affects calculations:', field, 'for CTQ:', ctq);
        setTimeout(() => autoCalculateOnValueChange(ctq, field), 100);
      }
      
      return updated;
    });
  };

  // Generate AI Capability Assessment
  const generateAIAssessment = async (ctq: string) => {
    try {
      setIsGeneratingAssessment(prev => ({ ...prev, [ctq]: true }));

      const currentData = dataPoints[ctq] || [];
      if (currentData.length < 25) {
        toast({
          title: "Insufficient Data",
          description: `At least 25 data points are required for AI capability analysis. Current: ${currentData.length}`,
          variant: "destructive",
        });
        return;
      }

      const capData = capabilityData[ctq];
      
      // Check if statistics are being shown (which means they're calculated)
      if (!showStatistics[ctq]) {
        toast({
          title: "Statistics Not Available",
          description: "Please enable 'Show Statistics' to calculate metrics before generating AI assessment",
          variant: "destructive",
        });
        return;
      }

      // Use the same calculation function that's used for display
      const calculatedStats = calculateProcessCapabilityStats(ctq);
      
      if (!calculatedStats) {
        toast({
          title: "Statistics Not Available",
          description: "Unable to calculate statistics for this CTQ",
          variant: "destructive",
        });
        return;
      }

      // Use existing calculated statistics from the UI
      const stats = {
        sampleSize: calculatedStats.sampleSize,
        mean: calculatedStats.mean,
        standardDeviation: calculatedStats.standardDeviation,
        cp: calculatedStats.cp || null,
        cpk: calculatedStats.cpk || null,
        pp: calculatedStats.pp || null,
        ppk: calculatedStats.ppk || null,
        zShortTerm: calculatedStats.isNormal ? calculatedStats.zShortTerm || null : calculatedStats.ZequivST || null,
        zLongTerm: calculatedStats.isNormal ? calculatedStats.zLongTerm || null : calculatedStats.ZequivST || null,
        zLSL: calculatedStats.isNormal ? (capData.dataSetTerm === "Long Term" ? calculatedStats.zLSL_LT || null : calculatedStats.zLSL_ST || null ) : (capData.dataSetTerm === "Long Term" ? calculatedStats.ZequivLSL_LT || null : calculatedStats.ZequivLSL_ST || null),
        zUSL: calculatedStats.isNormal ? (capData.dataSetTerm === "Long Term" ? calculatedStats.zUSL_LT || null : calculatedStats.zUSL_ST || null ) : (capData.dataSetTerm === "Long Term" ? calculatedStats.ZequivUSL_LT || null : calculatedStats.ZequivUSL_ST || null),       
        isNormal: calculatedStats.isNormal,
        percentageDefectLT: calculatedStats.isNormal ? calculatedStats.performanceMetrics.longTerm.percentDefects || null : calculatedStats.obspercentDefectsLT || null,
        percentageDefectST: calculatedStats.isNormal ? calculatedStats.performanceMetrics.shortTerm.percentDefects || null : calculatedStats.obspercentDefectsST || null,
        pdLSL: calculatedStats.isNormal ? (capData.dataSetTerm === "Long Term" ? calculatedStats.performanceMetrics.longTerm.pdLSL_LT || null : calculatedStats.performanceMetrics.shortTerm.pdLSL_ST  || null ) : (capData.dataSetTerm === "Long Term" ? calculatedStats.obspdLSL_LT || null : calculatedStats.obspdLSL_ST || null),
        pdUSL: calculatedStats.isNormal ? (capData.dataSetTerm === "Long Term" ? calculatedStats.performanceMetrics.longTerm.pdUSL_LT || null : calculatedStats.performanceMetrics.shortTerm.pdUSL_ST  || null ) : (capData.dataSetTerm === "Long Term" ? calculatedStats.obspdUSL_LT || null : calculatedStats.obspdUSL_ST || null),
        isStable:calculatedStats.isStable,
        isInControl:calculatedStats.isInControl,       
      };

      const context = {
        ctq,
        capabilityIndex: capData?.capabilityIndex || "Z",
        lsl: capData?.lsl || "",
        usl: capData?.usl || "",
        target: capData?.target || "",
        zShift: capData?.zShift || 1.5,
        dataSetTerm: capData?.dataSetTerm || "Long Term"
      };

      const response = await fetch(`/api/projects/${projectId}/process-capability/${encodeURIComponent(ctq)}/ai-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ stats, context })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data?.assessment) {
        updateCapabilityField(ctq, "capabilityAssessment", data.assessment);
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/process-capability`] });
        
        toast({
          title: "AI Analysis Generated",
          description: "Capability analysis has been generated successfully",
        });
      } else {
        throw new Error("No Capability analysis received from server");
      }

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI Capability analysis",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAssessment(prev => ({ ...prev, [ctq]: false }));
    }
  };

  const getCapabilityStatusBadge = (ctq: string) => {
    const data = capabilityData[ctq];
    if (!data) return <Badge variant="secondary">No Data</Badge>;
    
    const hasSpecs = data.lsl || data.usl || data.target;
    const hasConfiguration = data.capabilityIndex && data.zShift;
    
    if (hasSpecs && hasConfiguration) {
      return <Badge variant="default" className="bg-green-600">Configured</Badge>;
    } else if (hasSpecs) {
      return <Badge variant="outline">In Progress</Badge>;
    } else {
      return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  // Function to calculate individual analysis and update state
  const calculateIndividualAnalysis = (ctq: string, analysisType: string) => {
    const data = capabilityData[ctq];
    if (!data) return;

    try {
      switch (analysisType) {
        case "NonConformity":
          const results = calculateNonConformityResults(ctq, capabilityData);
          if (results) {
            // Update the capability data with calculated results
            //console.log('Updating capability data with results:', results);
            updateCapabilityField(ctq, "calculatedNonConformityRate", results.nonConformityRate);
            updateCapabilityField(ctq, "calculatedZValue_LT", results.zValue_LT);
            updateCapabilityField(ctq, "calculatedZValue_ST", results.zValue_ST);
            //console.log('Updated Z value in state:', results.zValue);
          }
          break;
          
        case "DPMO":
          if (data.dpmoDefects !== undefined && data.dpmoUnits && data.dpmoOpportunitiesPerUnit && data.dpmoUnits > 0 && data.dpmoOpportunitiesPerUnit > 0) {
            const totalOpportunities = data.dpmoUnits * data.dpmoOpportunitiesPerUnit;
            const dpmo = (data.dpmoDefects / totalOpportunities) * 1000000;
            updateCapabilityField(ctq, "calculatedDPMO", dpmo);
          }
          const results2 = calculateDPMOResults(ctq, capabilityData);
          if (results2) {
            // Update the capability data with calculated results
            //console.log('Updating capability data with results:', results);
            updateCapabilityField(ctq, "calculatedDPMO_Z_LT", results2.zDPMOValue_LT); 
            updateCapabilityField(ctq, "calculatedDPMO_Z_ST", results2.zDPMOValue_ST);            
            updateCapabilityField(ctq, "calculatedDPMO_LT", results2.DPMOValue_LT);
            updateCapabilityField(ctq, "calculatedDPMO_ST", results2.DPMOValue_ST);
          }
          break;

        case "DPU":
          if (data.dpuDefects !== undefined && data.dpuUnits && data.dpuUnits > 0 ) {
            const totalOpportunities = data.dpuUnits;
            const dpu = (data.dpuDefects / totalOpportunities);
            updateCapabilityField(ctq, "calculatedDPU", dpu);
          }
          const results3 = calculateDPUResults(ctq, capabilityData);
          if (results3) {
            // Update the capability data with calculated results
            //console.log('Updating capability data with results:', results);
            updateCapabilityField(ctq, "calculatedDPU_Z_LT", results3.zDPUValue_LT); 
            updateCapabilityField(ctq, "calculatedDPU_Z_ST", results3.zDPUValue_ST);            
            updateCapabilityField(ctq, "calculatedDPU_LT", results3.DPUValue_LT);
            updateCapabilityField(ctq, "calculatedDPU_ST", results3.DPUValue_ST);
          }
          break;

        case "OEE":
          if (data.oeeScheduledTime && data.oeeAvailableTime && 
              data.oeeNominalCapacity && data.oeePartsManufactured) {
            const oeeResults = calculateOEE(
              data.oeeScheduledTime,
              data.oeeAvailableTime,
              data.oeeNominalCapacity,
              data.oeePartsManufactured,
              data.oeeBadParts || 0,
            );
            
            updateCapabilityField(ctq, "calculatedOEE", oeeResults.oeePercentage);
          }
          break;
      }
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "An error occurred during calculation.",
        variant: "destructive",
      });
    }
  };

  // Auto-calculate when specific value fields change
  const autoCalculateOnValueChange = (ctq: string, field: string) => {
    const data = capabilityData[ctq];
    if (!data) return;

    // Only calculate for specific analysis types when their fields change
    if (field === 'nonConformityUnits' || field === 'totalUnits') {
      if (data.enableNonConformity && data.nonConformityUnits !== undefined && data.totalUnits && data.totalUnits > 0) {
        calculateIndividualAnalysis(ctq, "NonConformity");
      }
    }

    if (field === 'dpmoDefects' || field === 'dpmoUnits' || field === 'dpmoOpportunitiesPerUnit') {
      if (data.enableDpmo && data.dpmoDefects !== undefined && data.dpmoUnits && data.dpmoOpportunitiesPerUnit && data.dpmoUnits > 0) {
        calculateIndividualAnalysis(ctq, "DPMO");
      }
    }

    if (field === 'dpuDefects' || field === 'dpuUnits' ) {
      if (data.enableDpu && data.dpuDefects !== undefined && data.dpuUnits && data.dpuUnits > 0) {
        calculateIndividualAnalysis(ctq, "DPU");
      }
    }

    if (['oeeScheduledTime', 'oeeAvailableTime', 'oeeNominalCapacity', 'oeePartsManufactured', 'oeeBadParts'].includes(field)) {
      if (data.enableOee && data.oeeScheduledTime && data.oeeAvailableTime && 
          data.oeeNominalCapacity && data.oeePartsManufactured) {
        calculateIndividualAnalysis(ctq, "OEE");
      }
    }
  };

  const calculateAttributeResults = (ctq: string, analysisType: string) => {
    const data = capabilityData[ctq];
    if (!data) return null;
    
    switch (analysisType) {
      case "NonConformity": {
        const defects = data.defects || 0;
        const opportunities = data.opportunities || 1;
        const results = calculateNonConformity(defects, opportunities);
        //const zEquivalent = calculateZEquivalentFromDefectRate(results.defectRate);
        return { ...results  }; {/*, zEquivalent*/}
      }
      case "DPMO": {
        const defects = data.defects || 0;
        const units = data.units || 1;
        const opportunitiesPerUnit = data.dpmoOpportunitiesPerUnit || 1;
        const results = calculateDPMO(defects, units, opportunitiesPerUnit);
        //const zEquivalent = calculateZEquivalentFromDefectRate(results.dpo);
        return { ...results }; {/*, zEquivalent*/}
      }
      case "OEE": {
        const scheduledTime = data.oeeScheduledTime || 0;
        const availableTime = data.oeeAvailableTime || 0;
        const goodCount = (data.oeePartsManufactured || 0) - (data.oeeBadParts || 0);
        const nominalCapacity = data.oeeNominalCapacity || 0;
        const partsManufactured = data.oeePartsManufactured || 0;
        
        // Calculate availability, performance, and quality from the input fields
        const availability = scheduledTime > 0 ? (availableTime / scheduledTime) * 100 : 0;
        const performance = nominalCapacity > 0 ? (goodCount / nominalCapacity) * 100 : 0;
        const quality = partsManufactured > 0 ? (goodCount / partsManufactured) * 100 : 0;
        
        const oeeValue = (availability * performance * quality) / 10000; // Divide by 10000 because we're multiplying three percentages
        
        return {
          availability,
          performance,
          quality,
          oee: oeeValue
        };
      }
      default:
        return null;
    }
  };
  
  // Calculate process capability statistics
  const calculateProcessCapabilityStats = (ctq: string) => {
    const data = capabilityData[ctq];
    const dataPointsArray = dataPoints[ctq]?.map(dp => dp.dataValue) || [];
    
    if (!data || dataPointsArray.length < 25) {
      return null;
    }
    
    const lsl = parseNumericValue(data.lsl, undefined);
    const usl = parseNumericValue(data.usl, undefined);
    const target = parseNumericValue(data.target, undefined);
    const zShift = data.zShift || 1.5;
    
    if (lsl === 0 && usl === 0) {
      return null; // No specification limits defined
    }
    
    const sampleSize = dataPointsArray.length;
    const meanValue = mean(dataPointsArray);
    const stdDev = standardDeviation(dataPointsArray);
    const varianceValue = variance(dataPointsArray);
    // Perform normality test - will return isNormal, AD value and p_values
    const normalityTest = performNormalityTest(dataPointsArray, meanValue, stdDev);
    //normalityTest.isNormal=true;
    const myquartiles = calculateQuartiles(dataPointsArray);
    const Mode = calculateMode(dataPointsArray);
    
    // Calculate Long Term and Short Term Z scores with normality test
    const zScoreData = calculateZScoreLongShortTerm(
      dataPointsArray, 
      meanValue, 
      stdDev,
      lsl, 
      usl, 
      data.dataSetTerm, 
      zShift
    );

    // Calculate all capability indices at once
    const capabilityIndexes = calculateCapabilityIndexes(
      dataPointsArray,
      meanValue,
      stdDev,
      lsl,
      usl,
      data.dataSetTerm,
    );
    
    // Calculate performance metrics for both Long Term and Short Term using Z scores
    const performanceMetrics = calculatePerformanceMetrics(
      zScoreData.zLongTerm || 0,
      zScoreData.zLSL_LT!,
      zScoreData.zUSL_LT!,
      zScoreData.zShortTerm || 0,
      zScoreData.zLSL_ST!,
      zScoreData.zUSL_ST!,
    );

    // Calculate all capability indices at once
    const ObservedPerformanceMetrics = calculateObservedPerformanceMetrics(
      dataPointsArray,
      lsl,
      usl,
      data.dataSetTerm,
      zShift,
    );
    const currentPoints = dataPoints[ctq] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    const variationAnalysis = assessProcessVariation(numericValues);

    return {
      sampleSize,
      mean: meanValue,
      standardDeviation: stdDev,
      variance: varianceValue,
      quartiles: myquartiles,
      Mode,
      cp: capabilityIndexes.cp,
      cpk: capabilityIndexes.cpk,
      pp: capabilityIndexes.pp,
      ppk: capabilityIndexes.ppk,
      zLongTerm: zScoreData.zLongTerm,
      zLSL_LT: zScoreData.zLSL_LT,
      zUSL_LT: zScoreData.zUSL_LT,  
      zShortTerm: zScoreData.zShortTerm,
      zLSL_ST: zScoreData.zLSL_ST,
      zUSL_ST: zScoreData.zUSL_ST,
      isNormal: normalityTest.isNormal,
      adStatistic: normalityTest.adStatistic,
      pValue: normalityTest.pValue,
      performanceMetrics,
      lsl,
      usl,
      target,
      zShift,
      obsYieldLT: ObservedPerformanceMetrics.longTerm.obsyield,
      obsDPMOLT: ObservedPerformanceMetrics.longTerm.obsdpmo,
      obspercentDefectsLT: ObservedPerformanceMetrics.longTerm.obspercentDefects,
      obspdLSL_LT: ObservedPerformanceMetrics.longTerm.obspdLSL_LT,
      obspdUSL_LT: ObservedPerformanceMetrics.longTerm.obspdUSL_LT,
      ZequivLT: ObservedPerformanceMetrics.longTerm.ZequivLT,
      ZequivLSL_LT: ObservedPerformanceMetrics.longTerm.ZequivLSL_LT,
      ZequivUSL_LT: ObservedPerformanceMetrics.longTerm.ZequivUSL_LT,
      obsYieldST: ObservedPerformanceMetrics.shortTerm.obsyield,
      obsDPMOST: ObservedPerformanceMetrics.shortTerm.obsdpmo,
      obspercentDefectsST: ObservedPerformanceMetrics.shortTerm.obspercentDefects,
      obspdLSL_ST: ObservedPerformanceMetrics.shortTerm.obspdLSL_ST,
      obspdUSL_ST: ObservedPerformanceMetrics.shortTerm.obspdUSL_ST,
      ZequivST: ObservedPerformanceMetrics.shortTerm.ZequivST,
      ZequivLSL_ST: ObservedPerformanceMetrics.shortTerm.ZequivLSL_ST,
      ZequivUSL_ST: ObservedPerformanceMetrics.shortTerm.ZequivUSL_ST,
      isStable: variationAnalysis.isStable,
      isInControl: variationAnalysis.isInControl,
      assessment: variationAnalysis.assessment,
    };
  };

  const saveCapability = (ctq: string) => {
    const data = capabilityData[ctq];
    if (data) {
      // Find CTQ ID from CTS characteristics for proper foreign key relationship
      const ctqCharacteristic = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
      const ctqId = ctqCharacteristic?.id;
      
      // Transform data to match schema expectations
      const transformedData = {
        ctq: data.ctq,
        ctqId: ctqId, // Include CTQ ID for proper foreign key relationship
        lsl: (data.lsl && data.lsl.trim() !== '') ? String(data.lsl) : null,
        usl: (data.usl && data.usl.trim() !== '') ? String(data.usl) : null,
        target: (data.target && data.target.trim() !== '') ? String(data.target) : null,
        zShift: Number(data.zShift) || 1.5,
        dataSetTerm: data.dataSetTerm || "Long Term",
        capabilityIndex: data.capabilityIndex || "Z",
        showPercentage: Boolean(data.showPercentage),
        showZ: Boolean(data.showZ),
        capabilityAssessment: data.capabilityAssessment || "",
        showStatistics: Boolean(showStatistics[ctq]), // Include current statistics visibility state
        enableNonConformity: Boolean(data.enableNonConformity),
        enableDpmo: Boolean(data.enableDpmo),
        enableRty: Boolean(data.enableRty),
        enableOee: Boolean(data.enableOee),
        enablePareto: Boolean(data.enablePareto),
        enableDpu: Boolean(data.enableDpu),
        nonConformityUnits: data.nonConformityUnits,
        totalUnits: data.totalUnits,
        dpmoDefects: data.dpmoDefects,
        dpmoUnits: data.dpmoUnits,
        dpmoOpportunitiesPerUnit: data.dpmoOpportunitiesPerUnit,
        oeeScheduledTime: data.oeeScheduledTime,
        oeeAvailableTime: data.oeeAvailableTime,
        oeeNominalCapacity: data.oeeNominalCapacity,
        oeePartsManufactured: data.oeePartsManufactured,
        oeeBadParts: data.oeeBadParts,
        rtyProcessSteps: (data.rtyProcessSteps || []).map(step => ({
          ...step,
          passed: step.passed === undefined ? null : step.passed
        })),
        paretoDefectCategories: (data.paretoDefectCategories || [])
          .filter(item => item.category.trim() !== '') // Remove empty categories
          .map(item => ({
            ...item,
            count: item.count === undefined ? null : item.count
          })),
        dpuDefects: data.dpuDefects,
        dpuUnits: data.dpuUnits
      };
      
      saveCapabilityMutation.mutate(transformedData);
    }
  };

  // Toggle statistics visibility and save to database
  const toggleStatistics = async (ctq: string) => {
    const newState = !showStatistics[ctq];
    
    setShowStatistics(prev => ({
      ...prev,
      [ctq]: newState
    }));

    try {
      await apiRequest('PATCH', `/api/projects/${projectId}/process-capability/${ctq}/statistics`, {
        showStatistics: newState
      });
    } catch (error) {

      // Revert the state on error
      setShowStatistics(prev => ({
        ...prev,
        [ctq]: !newState
      }));
    }
  };

  if (ctqsLoading || capabilityLoading || projectLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading process capability data...</div>
        </CardContent>
      </Card>
    );
  }

  // Ensure data is available before calling getCTQs
  if (!ctqsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading CTQ data...</div>
        </CardContent>
      </Card>
    );
  }

  const ctqList = getCTQs();

  // Determine project type for conditional display
  const projectType = projectData?.project?.projectType || charter?.charter?.projectType;
  const isSimplifiedView = projectType === "White Belt" || projectType === "Yellow Belt";

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create Process capability study(ies).
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Process Capability
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          One process capability study per CTQ defined in CTS Characteristics table
        </p>
      </CardHeader>
      <CardContent>
      {/* Only show scroll indicator if 5+ CTQs exist */}
      {getCtqsWithTypes().length >= 6 && (
                   <div className="relative">
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                    ← Scroll horizontally →
                    </div>
                  </div>
                )}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-[25px]">
          <div className="w-full overflow-x-auto">         
                      <TabsList className="flex w-max min-w-full justify-start">
                        {getCtqsWithTypes().map((ctqWithType: CtqWithType) => (
                          <TabsTrigger 
                            key={ctqWithType.ctq} 
                            value={ctqWithType.ctq}
                            className="px-4 py-2 min-w-max flex flex-col items-center border border-gray-200 data-[state=active]:border-none"
                          >
                            <span className="font-medium truncate min-w-[150px]">{ctqWithType.ctq}</span>
                            <span className="text-xs text-gray-600">{ctqWithType.ctqType}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
          </div>
          
          {getCtqsWithTypes().map((ctqWithType: CtqWithType) => {
            const ctq = ctqWithType.ctq;
            return (
            <TabsContent key={ctq} value={ctq} className="mt-6">
              {/* Show/Hide Process Capability Button for White Belt and Yellow Belt projects */}
              {isSimplifiedView && !showProcessCapability[ctq] && (
                <div className="text-center py-8">
                  <Button 
                    onClick={() => toggleProcessCapabilityVisibility(ctq)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Show Process Capability
                  </Button>
                </div>
              )}
              
              {/* Process Capability Content - Always show for Green/Black Belt, conditionally for White/Yellow Belt */}
              {!isSimplifiedView || showProcessCapability[ctq] ? (
                <div>
                  {/* Hide Process Capability Button for White Belt and Yellow Belt projects when content is shown */}
                  {isSimplifiedView && showProcessCapability[ctq] && (
                    <div className="mb-4 text-right">
                      <Button 
                        onClick={() => toggleProcessCapabilityVisibility(ctq)}
                        variant="outline"
                        className="border-gray-400 text-gray-700 hover:bg-gray-100"
                      >
                        Hide Process Capability
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                
                {/* Data Input Section for Continuous CTQs */}
                {ctqWithType.ctqType === "Continuous" && (
                  <div className="space-y-4">
                    <div>
                      <div  className="flex justify-between items-center">
                      <label className="block text-sm font-medium mb-2">Data Input</label>
                      {/* Paste from Excel Section */}
                      
                          <div className="flex gap-2 mt-2">
                            <Button
                              onClick={async () => {
                                try {
                                  const clipboardData = await navigator.clipboard.readText();
                                  if (clipboardData.trim()) {
                                    // Create a synthetic paste event like MSA does
                                    const syntheticEvent = {
                                      preventDefault: () => {},
                                      clipboardData: {
                                        getData: (format: string) => clipboardData
                                      }
                                    } as unknown as React.ClipboardEvent;
                                    
                                    const rawindex = focusedCell[ctq] !== undefined ? focusedCell[ctq] : (dataPoints[ctq] || []).length;
                                    handlePasteFromExcel(ctq, rawindex, syntheticEvent);
                                  } else {
                                    toast({
                                      title: "No Data Found",
                                      description: "No data found in clipboard. Please copy data from Excel first.",
                                      variant: "destructive",
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Clipboard Permission Required",
                                    description: "Please allow clipboard access in your browser settings, or use Ctrl+V to paste directly into the table.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                            >
                              📋 Paste data from Excel
                            </Button>
                            {undoStates[ctq] && (
                              <Button
                                onClick={() => handleUndo(ctq)}
                                variant="outline"
                                size="sm"
                                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                              >
                                <Undo className="h-4 w-4 mr-2" />
                                Undo Paste
                              </Button>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded border border-blue-200 mt-2">
                            <div className="font-medium text-blue-700 mb-1">Excel Import Format:</div>
                            <div>Copy single column of numeric values from Excel</div>
                            <div className="text-blue-600 mt-1">Ctrl+V to paste | Ctrl+Z to undo | Click table cell to paste</div>
                          </div>
                      </div>
                      <p className="text-xs text-gray-500 pb-1">Enter data values and click Add, then Save Data to persist to database</p>
                      <div 
                        className="border rounded-lg overflow-hidden"
                        onPaste={(e) => {
                          e.preventDefault();
                          //const pasteData = e.clipboardData.getData('text');
                          //handleFocusedCellPaste(ctq, 0, pasteData);
                        }}
                        tabIndex={0}
                      >
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-r">Index</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Data Value</th>
                                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 w-20">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Existing data points with editable cells */}
                              {(dataPoints[ctq] || []).map((point, index) => (
                                <tr key={index} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-600 border-r bg-gray-50">{point.indexNumber}</td>
                                  <td className="px-4 py-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      value={point.dataValue}
                                      onChange={(e) => {
                                        const newValue = parseFloat(e.target.value);
                                          setDataPoints(prev => {
                                            const updated = [...(prev[ctq] || [])];
                                            updated[index] = { ...updated[index], dataValue: newValue };
                                            return { ...prev, [ctq]: updated };
                                          });
                                          // Trigger auto-save when cell value changes
                                  
                                      }}
                                      onFocus={() => {
                                        setFocusedCell(prev => ({ ...prev, [ctq]: index }));
                                      }}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        const pasteData = e.clipboardData.getData('text');
                                        handleFocusedCellPaste(ctq, index, pasteData);
                                      }}
                                      className="border-none p-1 h-8 text-sm w-full"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteDataPoint(ctq, index)}
                                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300"
                                      title="Delete data point"
                                    >
                                      <i className="fas fa-trash h-4 w-4"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                              {/* Input row for new data */}
                              <tr className="border-t bg-blue-50">
                                <td className="px-4 py-2 text-sm text-gray-600 border-r bg-gray-50">
                                  {(dataPoints[ctq] || []).length + 1}
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      value={inputValues[ctq] || ""}
                                      onChange={(e) => handleDataInput(ctq, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddDataPoint(ctq);
                                        }
                                      }}
                                      onFocus={() => {
                                        setFocusedCell(prev => ({ ...prev, [ctq]: (dataPoints[ctq] || []).length }));
                                      }}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        const pasteData = e.clipboardData.getData('text');
                                        handleFocusedCellPaste(ctq, (dataPoints[ctq] || []).length, pasteData);
                                      }}
                                      placeholder="Enter numeric value"
                                      className="border-none p-1 h-8 text-sm flex-1"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleAddDataPoint(ctq)}
                                      disabled={!inputValues[ctq]?.trim() || isNaN(parseFloat(inputValues[ctq] || ""))}
                                      className="h-8 px-2 text-xs"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </td>
                                <td className="px-4 py-2"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {/* Excel Import Instructions */}
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-medium text-sm text-blue-700 mb-1">Excel Import Instructions:</div>
                        <div className="text-xs text-blue-600">
                          <p>• <strong>Focus a cell</strong> by clicking on any measurement input field</p>
                          <p>• <strong>Paste data</strong> using Ctrl+V - data will start from the focused cell</p>
                          <p>• <strong>Undo changes</strong> using Ctrl+Z after pasting</p>
                          {/* <p>• <strong>Redo changes</strong> using Shift+Ctrl+Z after undoing</p> */}
                          <p>• Data will automatically create new rows if needed</p>
                        </div>
                      </div>

                      {/* Auto-save status and manual save button */}
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500">
                            Click Save Data to save your data points.
                          </p>
                          <div className="flex items-center gap-2">

                            <Button
                              onClick={() => saveAllDataPoints(ctq)}
                              disabled={saveDataPointMutation.isPending || (dataPoints[ctq] || []).length === 0}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              {saveDataPointMutation.isPending ? "Saving..." : "Save Data"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ctqWithType.ctqType === "Continuous" && (
                <>
                  <div>
                        <label className="block text-sm font-medium mb-2">Capability Index</label>
                        <Select
                          value={capabilityData[ctq]?.capabilityIndex || "Z"}
                          onValueChange={(value) => updateCapabilityField(ctq, "capabilityIndex", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Z">Z (Sigma Level)</SelectItem>
                            <SelectItem value="Cp/Cpk">Pp/Ppk & Cp/Cpk (Capability Indices)</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
                  {capabilityData[ctq]?.capabilityIndex === "Z" ? (                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Z-shift Value</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={capabilityData[ctq]?.zShift || 1.5}
                      onChange={(e) => updateCapabilityField(ctq, "zShift", parseFloat(e.target.value) || 1.5)}
                      placeholder="1.5"
                    />
                  </div>
                  ) : (
                    <div></div>
                  )}
                </>
                )}
                   
                <div>
                  <label className="block text-sm font-medium mb-2">Data Set Term</label>
                  <Select
                    value={capabilityData[ctq]?.dataSetTerm || "Long Term"}
                    onValueChange={(value) => updateCapabilityField(ctq, "dataSetTerm", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Long Term">Long Term</SelectItem>
                      <SelectItem value="Short Term">Short Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ctqWithType.ctqType === "Continuous" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Show Percentage Display</label>
                      <RadioGroup
                        value={capabilityData[ctq]?.showPercentage ? "true" : "false"}
                        onValueChange={(value) => updateCapabilityField(ctq, "showPercentage", value === "true")}
                        className="flex flex-row space-x-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`${ctq}-percentage-no`} />
                          <Label htmlFor={`${ctq}-percentage-no`}>No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id={`${ctq}-percentage-yes`} />
                          <Label htmlFor={`${ctq}-percentage-yes`}>Yes (%)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}

                {ctqWithType.ctqType === "Attribute" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Show Z</label>
                      <RadioGroup
                        value={capabilityData[ctq]?.showZ ? "true" : "false"}
                        onValueChange={(value) => updateCapabilityField(ctq, "showZ", value === "true")}
                        className="flex flex-row space-x-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id={`${ctq}-showz-no`} />
                          <Label htmlFor={`${ctq}-showz-no`}>No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id={`${ctq}-showz-yes`} />
                          <Label htmlFor={`${ctq}-showz-yes`}>Yes</Label>
                        </div>
                      </RadioGroup>

                      {capabilityData[ctq]?.showZ && (
                      <>
                      <label className="block mt-8 text-sm font-medium mb-2">Z-shift Value</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={capabilityData[ctq]?.zShift || 1.5}
                        onChange={(e) => updateCapabilityField(ctq, "zShift", parseFloat(e.target.value) || 1.5)}
                        placeholder="1.5"
                      />
                      </>
                      )}
                    </div>
                    <div>
                     <label className="block text-sm font-medium mb-3">Attribute Analysis Types (Select Multiple)</label>
                      
                     <div className="w-[1040px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-nonconformity`}
                            checked={capabilityData[ctq]?.enableNonConformity || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enableNonConformity", checked)}
                          />
                          <Label htmlFor={`${ctq}-nonconformity`} className="text-sm font-medium text-gray-700">
                            Non Conformity Analysis
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-dpmo`}
                            checked={capabilityData[ctq]?.enableDpmo || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enableDpmo", checked)}
                          />
                          <Label htmlFor={`${ctq}-dpmo`} className="text-sm font-medium text-gray-700">
                            DPMO (Defects Per Million Opportunities)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-dpu`}
                            checked={capabilityData[ctq]?.enableDpu || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enableDpu", checked)}
                          />
                          <Label htmlFor={`${ctq}-dpu`} className="text-sm font-medium text-gray-700">
                            DPU (Defects per Unit)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-rty`}
                            checked={capabilityData[ctq]?.enableRty || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enableRty", checked)}
                          />
                          <Label htmlFor={`${ctq}-rty`} className="text-sm font-medium text-gray-700">
                            RTY (Rolled Throughput Yield)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-oee`}
                            checked={capabilityData[ctq]?.enableOee || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enableOee", checked)}
                          />
                          <Label htmlFor={`${ctq}-oee`} className="text-sm font-medium text-gray-700">
                            OEE (Overall Equipment Effectiveness)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          <Checkbox
                            id={`${ctq}-pareto`}
                            checked={capabilityData[ctq]?.enablePareto || false}
                            onCheckedChange={(checked) => updateCapabilityField(ctq, "enablePareto", checked)}
                          />
                          <Label htmlFor={`${ctq}-pareto`} className="text-sm font-medium text-gray-700">
                            Pareto of Defects
                          </Label>
                        </div>
                      </div>
                     </div>
                    </div>
                  </>
                )}
                </div>

                  {ctqWithType.ctqType === "Continuous" && (
                    <>
                    <div className={`w-full max-w-screen-xl grid grid-cols-1 gap-4 md:grid-cols-3`}>
                      <div>
                        <label className="block text-sm font-medium mb-2">LSL (Lower Spec Limit)</label>
                        <Input
                          type="number"
                          step="any"
                          value={capabilityData[ctq]?.lsl || ""}
                          onChange={(e) => updateCapabilityField(ctq, "lsl", e.target.value)}
                          placeholder="e.g., 8.0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default from CTS Characteristics</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">USL (Upper Spec Limit)</label>
                        <Input
                          type="number"
                          step="any"
                          value={capabilityData[ctq]?.usl || ""}
                          onChange={(e) => updateCapabilityField(ctq, "usl", e.target.value)}
                          placeholder="e.g., 12.0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default from CTS Characteristics</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Target Value</label>
                        <Input
                          type="number"
                          step="any"
                          value={capabilityData[ctq]?.target || ""}
                          onChange={(e) => updateCapabilityField(ctq, "target", e.target.value)}
                          placeholder="e.g., 10.0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default from CTS Characteristics</p>
                      </div>
                    </div>
                    </>
                  )} 

                  {/* Individual Analysis Cards for Attribute CTQs */}                      
                  {ctqWithType.ctqType === "Attribute" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  
                      {/* Non-Conformity Analysis */}
                      {capabilityData[ctq]?.enableNonConformity && (
                        <Card key="nonconformity" className="p-2 bg-blue-50 border-blue-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calculator className="h-5 w-5 text-blue-600" />
                              Non-Conformity Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Number of Non-Conform Units</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={capabilityData[ctq]?.nonConformityUnits !== undefined ? capabilityData[ctq]?.nonConformityUnits : ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || value === null) {
                                      updateCapabilityField(ctq, "nonConformityUnits", undefined);
                                    } else {
                                      updateCapabilityField(ctq, "nonConformityUnits", parseInt(value));
                                    }
                                  }}
                                  placeholder="e.g., 0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-7">Number of Units</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={capabilityData[ctq]?.totalUnits || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "totalUnits", parseInt(e.target.value) || 1)}
                                  placeholder="e.g., 100"
                                />
                              </div>
                            </div>
                            
                            {/* Results Display */}
                            {capabilityData[ctq]?.calculatedNonConformityRate !== undefined && (
                              <div className="mt-4 p-2 bg-blue-100 rounded-lg border">
                                <h4 className="font-semibold text-blue-800 mb-2">Results:</h4>
                                <div className="space-y-1 text-sm">
                                  <div>
                                    <div title="Non-conform rate % = (number of non-conform units / number of units) * 100">
                                    <span className="font-medium">Non-Conform Rate: </span>
                                    <span className="text-blue-700">
                                      {formatnonconformrate(capabilityData[ctq].calculatedNonConformityRate)}%
                                      <br></br>
                                    </span>
                                    </div>
                                    <div title="Non-conform PPM = (number of non-conform units / number of units) * 1000000">
                                    <span className="font-medium">Non-Conform PPM: </span>
                                    <span className="text-blue-700">
                                      {(capabilityData[ctq].calculatedNonConformityRate*10000).toFixed(0)}
                                    </span>
                                    </div>
                                  </div>
                                  {capabilityData[ctq]?.showZ && (
                                  <div>
                                    <div>
                                      {capabilityData[ctq]?.dataSetTerm === "Long Term" ? (
                                        <div title="Z Long Term = Z value in Z-table for Non-Conform probability">
                                          <span className="font-medium">
                                           Z Long Term: 
                                          </span>
                                        <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedZValue_LT !== undefined && capabilityData[ctq]?.calculatedZValue_LT !== null
                                          ? capabilityData[ctq].calculatedZValue_LT.toFixed(2)
                                          : 'Calculating...'}
                                        </span>
                                        </div>
                                      ) : (
                                        <div title="Z Long Term = Z Short Term - Z-shift">
                                          <span className="font-medium">
                                        Z Long Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedZValue_LT !== undefined && capabilityData[ctq]?.calculatedZValue_LT !== null
                                          ? capabilityData[ctq].calculatedZValue_LT.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                    {capabilityData[ctq]?.dataSetTerm === "Short Term" ? (
                                    <div title="Z Short Term = Z value in Z-table for Non-Conform probability">
                                      {/* Add your content here */}
                                      <span className="font-medium">
                                        Z Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedZValue_ST !== undefined && capabilityData[ctq]?.calculatedZValue_ST !== null
                                          ? capabilityData[ctq].calculatedZValue_ST.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                    </div>
                                    ) : (
                                    <div title="Z Short Term = Z Long Term + Z-shift">
                                      {/* Add your content here */}
                                      <span className="font-medium">
                                        Z Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedZValue_ST !== undefined && capabilityData[ctq]?.calculatedZValue_ST !== null
                                          ? capabilityData[ctq].calculatedZValue_ST.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                    </div>
                                    )}                                  
                                    </div>
                                  </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* DPMO Analysis */}
                      {capabilityData[ctq]?.enableDpmo && (
                        <Card key="dpmo" className="p-2 bg-green-50 border-green-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calculator className="h-5 w-5 text-green-600" />
                              DPMO Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-sm font-medium mb-2">Number of Defects</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={capabilityData[ctq]?.dpmoDefects !== undefined ? capabilityData[ctq]?.dpmoDefects : ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || value === null) {
                                      updateCapabilityField(ctq, "dpmoDefects", undefined);
                                    } else {
                                      updateCapabilityField(ctq, "dpmoDefects", parseInt(value));
                                    }
                                  }}
                                  placeholder="e.g., 0"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Number of Units</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={capabilityData[ctq]?.dpmoUnits || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "dpmoUnits", parseInt(e.target.value) || 1)}
                                  placeholder="e.g., 500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium">Opportunities</label>
                                <label className="block text-[10px] font-normal mb-[13px]">of defect per unit</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={capabilityData[ctq]?.dpmoOpportunitiesPerUnit || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "dpmoOpportunitiesPerUnit", parseInt(e.target.value) || 1)}
                                  placeholder="e.g., 10"
                                />
                              </div>
                            </div>
                            
                            {/* Results Display */}
                            {capabilityData[ctq]?.calculatedDPMO !== undefined && (
                              <div className="mt-4 p-3 bg-green-100 rounded-lg border">
                                <h4 className="font-semibold text-green-800 mb-2">Results:</h4>
                                <div className="space-y-1 text-sm">
                                  <div title="DPMO = (number of defects / (number of units * opportunities of defects per unit)) * 1000000">
                                    <span className="font-medium">DPMO: </span>
                                    <span className="text-green-700">
                                      {Math.round(capabilityData[ctq].calculatedDPMO).toLocaleString()}
                                    </span>
                                  </div>
                                  {capabilityData[ctq]?.showZ && (
                                  <div>
                                    <div>
                                      {capabilityData[ctq]?.dataSetTerm === "Long Term" ? (
                                      <div title="Z Long Term = Z value in Z-table for DPMO. Calculated DPMO is Long Term DPMO">
                                        {/* Add your content here */}
                                        <span className="font-medium">
                                        Z Long Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_Z_LT !== undefined && capabilityData[ctq]?.calculatedDPMO_Z_LT !== null
                                          ? capabilityData[ctq].calculatedDPMO_Z_LT.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                      <span className="font-medium ml-4">
                                        <br></br>DPMO Long Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_LT !== undefined && capabilityData[ctq]?.calculatedDPMO_LT !== null
                                          ? capabilityData[ctq].calculatedDPMO_LT.toFixed(1)
                                          : 'Calculating...'}
                                      </span>
                                      </div>
                                      ) : (
                                      <div title="Z Long Term = Z Short Term - Z-shift. DPMO Long Term is given by Z-table for Z Long Term">
                                        {/* Add your content here */}
                                        <span className="font-medium">
                                        Z Long Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_Z_LT !== undefined && capabilityData[ctq]?.calculatedDPMO_Z_LT !== null
                                          ? capabilityData[ctq].calculatedDPMO_Z_LT.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                      <span className="font-medium ml-4">
                                        <br></br>DPMO Long Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_LT !== undefined && capabilityData[ctq]?.calculatedDPMO_LT !== null
                                          ? capabilityData[ctq].calculatedDPMO_LT.toFixed(1)
                                          : 'Calculating...'}
                                      </span>
                                      </div>
                                      )}                                      
                                      
                                    </div>
                                    <div className="mt-2">
                                      {capabilityData[ctq]?.dataSetTerm === "Short Term" ? (
                                      <div title="Z Short Term = Z value in Z-table for DPMO. Calculated DPMO is Short Term DPMO">
                                        {/* Add your content here */}
                                        <span className="font-medium">
                                        Z Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_Z_ST !== undefined && capabilityData[ctq]?.calculatedDPMO_Z_ST !== null
                                          ? capabilityData[ctq].calculatedDPMO_Z_ST.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                      <span className="font-medium ml-4">
                                        <br></br>DPMO Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_ST !== undefined && capabilityData[ctq]?.calculatedDPMO_ST !== null
                                          ? capabilityData[ctq].calculatedDPMO_ST.toFixed(1)
                                          : 'Calculating...'}
                                      </span>
                                      </div>
                                      ) : (
                                      <div title="Z Short Term = Z Long Term - Z-shift. DPMO Short Term is given by Z-table for Z Short Term">
                                        {/* Add your content here */}
                                        <span className="font-medium">
                                        Z Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_Z_ST !== undefined && capabilityData[ctq]?.calculatedDPMO_Z_ST !== null
                                          ? capabilityData[ctq].calculatedDPMO_Z_ST.toFixed(2)
                                          : 'Calculating...'}
                                      </span>
                                      <span className="font-medium ml-4">
                                        <br></br>DPMO Short Term: 
                                      </span>
                                      <span className="text-blue-700 ml-1">
                                        {capabilityData[ctq]?.calculatedDPMO_ST !== undefined && capabilityData[ctq]?.calculatedDPMO_ST !== null
                                          ? capabilityData[ctq].calculatedDPMO_ST.toFixed(1)
                                          : 'Calculating...'}
                                      </span>
                                      </div>
                                      )}
                                      
                                    </div>
                                  </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* DPU (Defects per Unit) Analysis */}
                      {capabilityData[ctq]?.enableDpu && (
                        <Card key="dpu" className="p-2 bg-purple-50 border-purple-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calculator className="h-5 w-5 text-purple-600" />
                              DPU Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Input Fields */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-7">Number of Defects</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={capabilityData[ctq]?.dpuDefects !== undefined ? capabilityData[ctq]?.dpuDefects : ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "" || value === null) {
                                        updateCapabilityField(ctq, "dpuDefects", undefined);
                                      } else {
                                        updateCapabilityField(ctq, "dpuDefects", parseInt(value));
                                      }
                                    }}
                                    placeholder="e.g., 0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-7">Number of Units</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={capabilityData[ctq]?.dpuUnits || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (value === "" || (!isNaN(Number(value)) && Number(value) > 0)) {
                                        updateCapabilityField(ctq, "dpuUnits", value === "" ? undefined : Number(value));
                                      }
                                    }}
                                    placeholder="Enter total number of units"
                                    className="w-full"
                                  />
                                </div>
                              </div>

                              {/* DPU Results Display */}
                              {(() => {
                                const defects = capabilityData[ctq]?.dpuDefects || 0;
                                const units = capabilityData[ctq]?.dpuUnits || 0;
                                if (units === 0) return null;
                                const dpuResults = calculateDPU(defects, units);
                                
                                return (
                                  <div className="mt-4 p-3 bg-purple-100 rounded-lg border">
                                    <h4 className="font-semibold text-purple-800 mb-2">Results:</h4>
                                    
                                    <div className="grid grid-cols-1 gap-4 text-sm">
                                      <div className="space-y-1">
                                        <div className="flex justify-left"
                                           title="DPU = (number of defects / number of units)">
                                          <span className="font-medium">DPU:</span>
                                          <span className="ml-1 text-purple-700 font-bold">{formatdpu(dpuResults.dpu)}</span>
                                        </div>

                                        {capabilityData[ctq]?.showZ && (
                                        <div>
                                          <div>
                                            {capabilityData[ctq]?.dataSetTerm === "Long Term" ? (
                                            <div title="Z Long Term = Z value in Z-table for DPU probability. Calculated DPU is Long Term DPU">
                                              {/* Add your content here */}
                                              <span className="font-medium">
                                              Z Long Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_Z_LT !== undefined && capabilityData[ctq]?.calculatedDPU_Z_LT !== null
                                                ? capabilityData[ctq].calculatedDPU_Z_LT.toFixed(2)
                                                : 'Calculating...'}
                                            </span>
                                            <span className="font-medium ml-4">
                                              <br></br>DPU Long Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_LT !== undefined && capabilityData[ctq]?.calculatedDPU_LT !== null
                                                ? formatdpu(capabilityData[ctq].calculatedDPU_LT)
                                                : 'Calculating...'}
                                            </span>
                                            </div>
                                            ) : (
                                            <div title="Z Long Term = Z Short Term - Z-shift. DPU Long Term is given by Z-table for Z Long Term">
                                              {/* Add your content here */}
                                              <span className="font-medium">
                                              Z Long Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_Z_LT !== undefined && capabilityData[ctq]?.calculatedDPU_Z_LT !== null
                                                ? capabilityData[ctq].calculatedDPU_Z_LT.toFixed(2)
                                                : 'Calculating...'}
                                            </span>
                                            <span className="font-medium ml-4">
                                              <br></br>DPU Long Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_LT !== undefined && capabilityData[ctq]?.calculatedDPU_LT !== null
                                                ? formatdpu(capabilityData[ctq].calculatedDPU_LT)
                                                : 'Calculating...'}
                                            </span>
                                            </div>
                                            )}
                                            
                                          </div>
                                          <div className="mt-2">
                                            {capabilityData[ctq]?.dataSetTerm === "Short Term" ? (
                                            <div title="Z Short Term = Z value in Z-table for DPU probability. Calculated DPU is Short Term DPU">
                                              {/* Add your content here */}
                                              <span className="font-medium">
                                              Z Short Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_Z_ST !== undefined && capabilityData[ctq]?.calculatedDPU_Z_ST !== null
                                                ? capabilityData[ctq].calculatedDPU_Z_ST.toFixed(2)
                                                : 'Calculating...'}
                                            </span>
                                            <span className="font-medium ml-4">
                                              <br></br>DPU Short Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_ST !== undefined && capabilityData[ctq]?.calculatedDPU_ST !== null
                                                ? formatdpu(capabilityData[ctq].calculatedDPU_ST)
                                                : 'Calculating...'}
                                            </span>
                                            </div>
                                            ) : (
                                            <div title="Z Short Term = Z Long Term - Z-shift. DPU Short Term is given by Z-table for Z Short Term">
                                              {/* Add your content here */}
                                              <span className="font-medium">
                                              Z Short Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_Z_ST !== undefined && capabilityData[ctq]?.calculatedDPU_Z_ST !== null
                                                ? capabilityData[ctq].calculatedDPU_Z_ST.toFixed(2)
                                                : 'Calculating...'}
                                            </span>
                                            <span className="font-medium ml-4">
                                              <br></br>DPU Short Term: 
                                            </span>
                                            <span className="text-blue-700 ml-1">
                                              {capabilityData[ctq]?.calculatedDPU_ST !== undefined && capabilityData[ctq]?.calculatedDPU_ST !== null
                                                ? formatdpu(capabilityData[ctq].calculatedDPU_ST)
                                                : 'Calculating...'}
                                            </span>
                                            </div>
                                            )}
                                            
                                          </div>
                                        </div>
                                        )}

                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                  )}
                  {ctqWithType.ctqType === "Attribute" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 space-x-0 space-y-0">
                      {/* RTY (Rolled Throughput Yield) Card */}
                        {capabilityData[ctq]?.enableRty && (
                          <div className="mt-0">
                            <Card className="bg-green-50 border-green-200 min-h-full p-1">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-green-800 text-lg flex items-center gap-2">
                                  <TrendingUp className="h-5 w-5" />
                                  Rolled Throughput Yield (RTY)
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Process Steps Input */}
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Process Steps</label>
                                    <div className="space-y-3">
                                      {/* Show empty first row when no data exists, otherwise show all existing steps */}
                                      {(capabilityData[ctq]?.rtyProcessSteps && capabilityData[ctq]?.rtyProcessSteps.length > 0 
                                        ? capabilityData[ctq]?.rtyProcessSteps 
                                        : [{ stepName: "", passed: undefined, total: 0 }]
                                      ).map((step, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                                          <Input
                                            placeholder="Step name"
                                            value={step.stepName}
                                            onChange={(e) => {
                                              const currentSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                              const updatedSteps = [...currentSteps];
                                              
                                              // If this is the first row and no data exists yet, initialize the array
                                              if (currentSteps.length === 0) {
                                                updatedSteps[0] = { stepName: e.target.value, passed: undefined, total: 0 };
                                              } else {
                                                updatedSteps[index] = { ...step, stepName: e.target.value };
                                              }
                                              updateCapabilityField(ctq, "rtyProcessSteps", updatedSteps);
                                            }}
                                          />
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="Passed units (can be 0)"
                                            value={step.passed !== undefined ? step.passed : ""}
                                            onChange={(e) => {
                                              const currentSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                              const updatedSteps = [...currentSteps];
                                              const value = e.target.value;
                                              
                                              // If this is the first row and no data exists yet, initialize the array
                                              if (currentSteps.length === 0) {
                                                if (value === "" || value === null) {
                                                  updatedSteps[0] = { stepName: step.stepName, passed: undefined, total: step.total };
                                                } else {
                                                  updatedSteps[0] = { stepName: step.stepName, passed: parseInt(value), total: step.total };
                                                }
                                              } else {
                                                if (value === "" || value === null) {
                                                  updatedSteps[index] = { ...step, passed: undefined };
                                                } else {
                                                  updatedSteps[index] = { ...step, passed: parseInt(value) };
                                                }
                                              }
                                              updateCapabilityField(ctq, "rtyProcessSteps", updatedSteps);
                                            }}
                                          />
                                          <Input
                                            type="number"
                                            min="1"
                                            placeholder="Total units (must be > 0)"
                                            value={step.total || ""}
                                            onChange={(e) => {
                                              const currentSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                              const updatedSteps = [...currentSteps];
                                              const value = parseInt(e.target.value) || 0;
                                              
                                              // If this is the first row and no data exists yet, initialize the array
                                              if (currentSteps.length === 0) {
                                                updatedSteps[0] = { stepName: step.stepName, passed: step.passed, total: value };
                                              } else if (value > 0) {
                                                updatedSteps[index] = { ...step, total: value };
                                              }
                                              updateCapabilityField(ctq, "rtyProcessSteps", updatedSteps);
                                            }}
                                          />
                                          {/* Delete button - only show if there are actual steps in the array */}
                                          {(capabilityData[ctq]?.rtyProcessSteps || []).length > 0 && (
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="icon"
                                              onClick={() => {
                                                const currentSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                                const updatedSteps = currentSteps.filter((_, i) => i !== index);
                                                updateCapabilityField(ctq, "rtyProcessSteps", updatedSteps);
                                              }}
                                              className="w-10 h-10"
                                            >
                                              <i className="fas fa-trash h-4 w-4"></i>
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const currentSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                            updateCapabilityField(ctq, "rtyProcessSteps", [
                                              ...currentSteps,
                                              { stepName: "", passed: undefined, total: 0 }
                                            ]);
                                          }}
                                        >
                                          Add Step
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* RTY Results Display */}
                                  {(() => {
                                    const processSteps = capabilityData[ctq]?.rtyProcessSteps || [];
                                    if (processSteps.length === 0 || !processSteps.some(step => step.total > 0)) return null;
                                    
                                    const rtyResults = calculateRolledThroughputYield(processSteps);
                                    
                                    return (
                                      <div className="mt-4 p-3 bg-green-100 rounded-lg border">
                                        <h4 className="font-semibold text-green-800 mb-3">RTY Analysis Results</h4>
                                        
                                        {/* Individual Step Yields */}
                                        <div className="mb-4">
                                          <h5 className="font-medium text-green-700 mb-2">Individual Step Yields</h5>
                                          <div className="space-y-1 text-sm">
                                            {rtyResults.individualYields.map((stepYield, index) => (
                                              <div key={index} className="flex justify-between"
                                              title="YTPᵢ = (Passed units/Total units) * 100">
                                                <span>{stepYield.stepName || `Step ${index + 1}`}:</span>
                                                <span className="text-green-700 font-medium">Y<sub>TP{index}</sub>: {stepYield.yieldPercentage.toFixed(2)}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        {/* Overall RTY */}
                                            <div className="flex justify-between border-t pt-2"
                                            title="YRT = Π YTPᵢ for i = 1 to n">
                                              <span className="font-bold">RTY Percentage:</span>
                                              <span className="text-green-700 font-bold">Y<sub>RT</sub>: {rtyResults.rtyPercentage.toFixed(2)}%</span>
                                            </div>
                                          </div>
                                    );
                                  })()}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                      {/* OEE Analysis */}
                      {capabilityData[ctq]?.enableOee && (
                        <Card key="oee" className="p-0 m-0 bg-purple-50 border-purple-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calculator className="h-5 w-5 text-purple-600" />
                              Overall Equipment Effectiveness (OEE)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Scheduled Production Time</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={capabilityData[ctq]?.oeeScheduledTime || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "oeeScheduledTime", parseFloat(e.target.value) || 0)}
                                  placeholder="e.g., 8.0"
                                />
                                <span className="text-xs text-gray-500">hours</span>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Available Production Time</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={capabilityData[ctq]?.oeeAvailableTime || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "oeeAvailableTime", parseFloat(e.target.value) || 0)}
                                  placeholder="e.g., 7.0"
                                />
                                <span className="text-xs text-gray-500">hours</span>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Nominal Production Capacity</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={capabilityData[ctq]?.oeeNominalCapacity || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "oeeNominalCapacity", parseInt(e.target.value) || 0)}
                                  placeholder="e.g., 100"
                                />
                                <span className="text-xs text-gray-500">parts/hour</span>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Number of Parts Manufactured</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={capabilityData[ctq]?.oeePartsManufactured || ""}
                                  onChange={(e) => updateCapabilityField(ctq, "oeePartsManufactured", parseInt(e.target.value) || 0)}
                                  placeholder="e.g., 20"
                                />
                                <span className="text-xs text-gray-500">parts manufactured</span>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Non-Conform Parts</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={capabilityData[ctq]?.oeeBadParts !== undefined ? capabilityData[ctq]?.oeeBadParts : ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || value === null) {
                                      updateCapabilityField(ctq, "oeeBadParts", undefined);
                                    } else {
                                      updateCapabilityField(ctq, "oeeBadParts", parseInt(value));
                                    }
                                  }}
                                  placeholder="Number of bad parts (can be 0)"
                                />
                                <span className="text-xs text-gray-500">defective parts/scrap</span>
                              </div>
                            </div>
                            
                            {/* Results Display */}
                            {(() => {
                              const data = capabilityData[ctq];
                              if (!data?.enableOee || !data.oeeScheduledTime || !data.oeeAvailableTime || 
                                  !data.oeeNominalCapacity || !data.oeePartsManufactured) return null;
                              
                              const oeeResults = calculateOEE(
                                data.oeeScheduledTime,
                                data.oeeAvailableTime,
                                data.oeeNominalCapacity,
                                data.oeePartsManufactured,
                                data.oeeBadParts || 0,
                              );
                              
                              // Calculate performance time and quality time from OEE results
                              const scheduledTime = data.oeeScheduledTime!;
                              const availableTime = data.oeeAvailableTime!;
                              const performanceTime = oeeResults.performance * data.oeeAvailableTime!;
                              const qualityTime = oeeResults.quality * performanceTime;
                              
                              return (
                                <div className="mt-4 p-3 bg-purple-100 rounded-lg border">
                                  <h4 className="font-semibold text-purple-800 mb-2">OEE (Overall Equipment Effectiveness)</h4>
                                  <div className="grid grid-cols-1 gap-4 text-sm">
                                    {/*<div className="space-y-2">
                                      *<div className="flex justify-between">
                                        <span className="font-medium">SCHEDULED TIME</span>
                                        <span className="text-purple-700">{scheduledTime.toFixed(1)}</span>
                                        <span className="text-xs text-gray-500">hours</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">AVAILABLE TIME</span>
                                        <span className="text-purple-700">{availableTime.toFixed(1)}</span>
                                        <span className="text-xs text-gray-500">hours</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">PERFORMANCE TIME</span>
                                        <span className="text-purple-700">{performanceTime.toFixed(1)}</span>
                                        <span className="text-xs text-gray-500">hours</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">QUALITY TIME</span>
                                        <span className="text-purple-700">{qualityTime.toFixed(1)}</span>
                                        <span className="text-xs text-gray-500">hours</span>
                                      </div>
                                    </div>*/}
                                    <div className="space-y-2">
                                      <div className="flex justify-between"
                                      title="AVAILAILITY % = (Available Production Time / Scheduled Production Time) * 100">
                                        <span className="font-medium">AVAILABILITY %</span>
                                        <span className="text-purple-700">{oeeResults.availabilityPercentage.toFixed(2)}%</span>
                                      </div>
                                      <div className="flex justify-between"
                                      title="PERFORMANCE % = (Number of parts manufactured / (Nominal capacity * Available Production Time)) * 100">
                                        <span className="font-medium">PERFORMANCE %</span>
                                        <span className="text-purple-700">{oeeResults.performancePercentage.toFixed(2)}%</span>
                                      </div>
                                      <div className="flex justify-between"
                                      title="QUALITY % = (Number of good parts manufactured / Number of parts manufactured) * 100">
                                        <span className="font-medium">QUALITY %</span>
                                        <span className="text-purple-700">{oeeResults.qualityPercentage.toFixed(2)}%</span>
                                      </div>
                                      <div className="flex justify-between border-t pt-2"
                                      title="OEE % = AVAILAILITY % * PERFORMANCE % * QUALITY %">
                                        <span className="font-bold">OEE %</span>
                                        <span className="text-purple-700 font-bold">{oeeResults.oeePercentage.toFixed(2)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                        )}
                     
                      {/* Pareto Analysis */}
                      {capabilityData[ctq]?.enablePareto && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 pr-4">
                        {(capabilityData[ctq]?.enableNonConformity || capabilityData[ctq]?.enableDpmo || capabilityData[ctq]?.enableDpu || capabilityData[ctq]?.enableRty || capabilityData[ctq]?.enableOee) && (
                          <div className="flex justify-end mt-4 mb-4 mr-2">
                          <Button 
                            onClick={() => saveCapability(ctq)}
                            disabled={saveCapabilityMutation.isPending}
                            className="flex items-center gap-2"
                            >
                            <Save className="h-4 w-4" />
                            {saveCapabilityMutation.isPending ? "Saving..." : "Save Process Capability"}
                          </Button>
                          </div>
                        )}
                        <Card key="pareto" className="bg-indigo-50 border-indigo-200 w-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-indigo-600" />
                              Pareto of Defects
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Data Entry Table */}
                              <div>
                                <label className="block text-sm font-medium mb-3">Defect Categories</label>
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div>Category of Defects</div>
                                    <div>Number of Defects</div>
                                    <div className="text-center">Action</div>
                                  </div>
                                  
                                  {/* Categories Rows - Always show at least one empty row */}
                                  {(capabilityData[ctq]?.paretoDefectCategories && capabilityData[ctq].paretoDefectCategories.length > 0 
                                    ? capabilityData[ctq].paretoDefectCategories 
                                    : [{ category: "", count: null }]
                                  ).map((item, index) => (
                                    <div key={index} className="grid grid-cols-3 gap-2 items-center">
                                      <Input
                                        placeholder="e.g., Documentation Errors"
                                        value={item.category}
                                        onChange={(e) => {
                                          const currentCategories = capabilityData[ctq]?.paretoDefectCategories || [];
                                          const updatedCategories = currentCategories.length > 0 ? [...currentCategories] : [{ category: "", count: 0 }];
                                          updatedCategories[index] = { ...updatedCategories[index], category: e.target.value };
                                          updateCapabilityField(ctq, "paretoDefectCategories", updatedCategories);
                                        }}
                                      />
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="e.g., 0"
                                        value={item.count !== null ? item.count : ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          const currentCategories = capabilityData[ctq]?.paretoDefectCategories || [];
                                          const updatedCategories = currentCategories.length > 0 ? [...currentCategories] : [{ category: "", count: null }];
                                          
                                          if (value === "" || value === null) {
                                            updatedCategories[index] = { ...updatedCategories[index], count: null };
                                          } else {
                                            updatedCategories[index] = { ...updatedCategories[index], count: parseInt(value) };
                                          }
                                          updateCapabilityField(ctq, "paretoDefectCategories", updatedCategories);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updatedCategories = [...(capabilityData[ctq]?.paretoDefectCategories || [])];
                                          updatedCategories.splice(index, 1);
                                          updateCapabilityField(ctq, "paretoDefectCategories", updatedCategories);
                                        }}
                                      >
                                      <i className="fas fa-trash h-4 w-4"></i>
                                      </Button>
                                    </div>
                                  ))}
                                  
                                  {/* Add Category Button - Always visible */}
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const currentCategories = capabilityData[ctq]?.paretoDefectCategories || [];
                                        updateCapabilityField(ctq, "paretoDefectCategories", [
                                          ...currentCategories,
                                          { category: "", count: null }
                                        ]);
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Pareto Chart */}
                              {(() => {
                                const categories = capabilityData[ctq]?.paretoDefectCategories || [];
                                const validCategories = categories.filter(item => item.category && item.count !== null && item.count !== undefined && item.count >= 0);
                                
                                if (validCategories.length === 0) return null;

                                const paretoResults = calculateParetoOfDefects(validCategories as Array<{category: string; count: number}>);
                                
                                return (
                                  <div className="space-y-4">
                                    <div className="h-[400px] border border-gray-200 rounded-md pt-1 pb-6">
                                      <h3 className="text-lg font-semibold text-center">PARETO of DEFECTS</h3>
                                      <ResponsiveContainer width="100%" height="100%">  
                                        <ComposedChart
                                          data={paretoResults.sortedCategories}
                                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis 
                                            dataKey="category" 
                                            angle={-30}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                          />
                                          <YAxis yAxisId="left" orientation="left" 
                                          label={{ value: 'Count', position: 'insideTop', offset: -20 }}/>
                                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} 
                                          label={{ value: '%', position: 'insideTop', offset: -20 }}/>
                                          <Tooltip />
                                          <Legend />
                                          <Bar 
                                            yAxisId="left" 
                                            dataKey="count" 
                                            fill="#8884d8" 
                                            name="Count" 
                                          />
                                          <Line 
                                            yAxisId="right" 
                                            type="monotone" 
                                            dataKey="cumulativePercentage" 
                                            stroke="#ff7300" 
                                            strokeWidth={3}
                                            name="Cumulative %" 
                                          />
                                        </ComposedChart>
                                      </ResponsiveContainer>
                                    </div>

                                    {/* Results Table */}
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 mt-4">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                              Category
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-boldm text-gray-500 uppercase tracking-wider">
                                              Count
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                              Percentage
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                              Cumulative %
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {paretoResults.sortedCategories.map((item, index) => (
                                            <tr key={index}>
                                              <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                {item.category}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                {item.count}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                {item.percentage.toFixed(1)}%
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-500">
                                                {item.cumulativePercentage.toFixed(1)}%
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Key Insights */}
                                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                      <h4 className="font-medium text-indigo-900 mb-2">Key Insights</h4>
                                      <ul className="text-sm text-indigo-800 space-y-1">
                                        <li>• Total Defects: {paretoResults.totalDefects}</li>
                                        <li>• Top Category: {paretoResults.sortedCategories[0]?.category} ({paretoResults.sortedCategories[0]?.percentage.toFixed(1)}%)</li>
                                        <li>• 80% Rule: First {paretoResults.sortedCategories.findIndex(item => item.cumulativePercentage >= 80) + 1} categories account for 80%+ of defects</li>
                                        <li title="Categories that contribute the most to overall defect rate">• Vital Few: {paretoResults.vitalFew.join(', ')}</li>
                                      </ul>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      )}
                  </div>
                )}

                {/* Statistics Control Buttons for Continuous CTQs */}
                <div>                  
                <ProcessCapabilityContinuousCards
                  ctq={ctqWithType.ctq} // Use ctq as the ID
                  ctqWithType={ctqWithType}
                  dataPoints={dataPoints}
                  showStatistics={showStatistics}
                  capabilityData={capabilityData}
                  toggleStatistics={toggleStatistics}
                  calculateProcessCapabilityStats={calculateProcessCapabilityStats}
                  //formatPercentage={formatPercentage} // Pass the function down
                />
                </div>
                                
                {/* Statistical Control Charts, Density Histogram and Box Plot */}
                {ctqWithType.ctqType === "Continuous" && showStatistics[ctq] && (() => {
                  
                  const currentPoints = dataPoints[ctq] || [];
                  const numericValues = currentPoints.map(point => point.dataValue);
                  
                  if (numericValues.length >= 3) {
                    return (
                      <StatisticalCharts
                      ctq={ctq}
                      dataPoints={dataPoints}
                      capabilityData={capabilityData}
                      calculateIndividualControlLimits={calculateIndividualControlLimits}
                      calculateMovingRangeControlLimits={calculateMovingRangeControlLimits}
                      calculateMovingRange={calculateMovingRange}
                      getHistogramData={getHistogramData}
                      calculateQuartiles={calculateQuartiles}
                      mean={mean}
                      standardDeviation={standardDeviation}
                    />
                    );                  
                  } else if (numericValues.length > 0) {
                    return (
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <BarChart3 className="h-4 w-4" />
                          <span className="font-medium">Statistical Charts</span>
                        </div>
                        <p className="text-sm text-orange-600 mt-2">
                          Need at least 3 data points for statistical charts. 
                          Current: {numericValues.length} data points.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <AIAnalysisSection
                    ctq={activeTab}
                    capabilityData={capabilityData}
                    dataPoints={dataPoints}
                    showStatistics={showStatistics}
                    isGeneratingAssessment={isGeneratingAssessment}
                    generateAIAssessment={generateAIAssessment}
                    updateCapabilityField={(ctq, field, value) => setCapabilityData((prev) => ({
                      ...prev,
                      [ctq]: {
                        ...prev[ctq],
                        [field]: value,
                      },
                    }))} stats={undefined} dataSetTerm={"Long Term"} capabilityIndex={"Z"}                  />


                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveCapability(ctq)}
                    disabled={saveCapabilityMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveCapabilityMutation.isPending ? "Saving..." : "Save Process Capability"}
                  </Button>
                </div>
                </div>
                </div>
              ) : null}
            </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}