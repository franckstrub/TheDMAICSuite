import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TrendingUp, Save, Undo, Calculator, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  mean, 
  standardDeviation, 
  variance, 
  calculateCp, 
  calculateCpk, 
  calculatePp, 
  calculatePpk, 
  calculateYield, 
  calculateDPMOFromYield, 
  calculateZScore,
  parseNumericValue,
  median,
  getHistogramData,
  calculateQuartiles,
  calculateMovingRange,
  calculateIndividualControlLimits,
  calculateMovingRangeControlLimits,
  calculateZScoreLongShortTerm,
  calculatePerformanceMetrics
} from "@/lib/statisticsUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  lsl: string;
  usl: string;
  target: string;
  zShift: number;
  dataSetTerm: "Long Term" | "Short Term";
  capabilityIndex: "Z" | "Cp/Cpk";
  showPercentage: boolean;
  showZ: boolean; // For attribute CTQs
  conclusion: string;
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
  const [autoSaveTimers, setAutoSaveTimers] = useState<{ [ctq: string]: NodeJS.Timeout }>({});

  // Load last active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, [projectId]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`process-capability-active-tab-${projectId}`, tabValue);
  };

  // Track tab initialization to prevent overriding saved tabs
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

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
    
    // Cleanup function to clear all auto-save timers
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
      Object.values(autoSaveTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [activeTab, undoStates, autoSaveTimers]);

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

  // Load existing Process Capability data
  const { data: capabilityDataResponse, isLoading: capabilityLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/process-capability`],
    enabled: !!projectId,
  });

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
      
      // Preserve the current statistics visibility state before invalidating
      const currentStatsState = { ...showStatistics };
      
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/process-capability`] }).then(() => {
        // Restore statistics visibility state after data refresh
        setShowStatistics(currentStatsState);
      });
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
      console.log("Mutation function called with:", { processCapabilityId, dataPoints });
      const response = await apiRequest('POST', `/api/process-capability/${processCapabilityId}/data`, { dataPoints });
      console.log("API response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Mutation succeeded:", data);
      // Don't show toast here as it's handled in saveAllDataPoints
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
      // Don't show toast here as it's handled in saveAllDataPoints
    },
  });

  // Get CTQs from centralized endpoint
  const getCTQs = () => {
    // Use centralized CTQs endpoint which aggregates from all sources
    if ((ctqsData as any)?.ctqs?.length > 0) {
      return (ctqsData as any).ctqs.map((item: any) => item.ctq);
    }
    
    return [];
  };
  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous"
      }));
    }
    return [];
  };

  // Auto-save function with debouncing
  const autoSaveDataPoints = async (ctq: string) => {
    const processCapabilityId = capabilityData[ctq]?.id;
    if (!processCapabilityId) return;
    
    const currentPoints = dataPoints[ctq] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    
    if (numericValues.length === 0) return;
    
    try {
      await saveDataPointMutation.mutateAsync({
        processCapabilityId,
        dataPoints: numericValues
      });
      console.log(`Auto-saved ${numericValues.length} data points for ${ctq}`);
      
      // Clear the timer from state to hide the auto-saving indicator
      setAutoSaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[ctq];
        return newTimers;
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
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

  const saveAllDataPoints = async (ctq: string) => {
    const processCapabilityId = capabilityData[ctq]?.id;
    if (!processCapabilityId) {
      console.error("No process capability ID found for CTQ:", ctq);
      toast({
        title: "Error",
        description: "Process capability configuration not found. Please save the capability settings first.",
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
    
    console.log("Saving data points:", { processCapabilityId, numericValues });
    
    try {
      // Save all data points as JSON array to database
      await saveDataPointMutation.mutateAsync({
        processCapabilityId,
        dataPoints: numericValues
      });
      
      // Reload data points from database
      await loadDataPointsForCtq(ctq);
      
      toast({
        title: "Success",
        description: `Saved ${numericValues.length} data points`,
      });
    } catch (error) {
      console.error("Failed to save data points:", error);
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
      console.error("Error pasting data:", error);
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
    if (!processCapabilityId) return;
    
    try {
      const points = await loadDataPoints(processCapabilityId);
      setDataPoints(prev => ({
        ...prev,
        [ctq]: points
      }));
    } catch (error) {
      console.error("Failed to load data points:", error);
    }
  };

  // Load data points when process capability data is loaded
  useEffect(() => {
    const ctqs = getCtqsWithTypes();
    ctqs.forEach(({ ctq }) => {
      if (capabilityData[ctq]?.id) {
        loadDataPointsForCtq(ctq);
      }
    });
  }, [capabilityData]);

  // Initialize Process Capability data when CTQs and capability data are loaded
  useEffect(() => {
    const ctqs = getCtqsWithTypes();
    if (ctqs.length > 0) {
      const initialData: { [ctq: string]: ProcessCapabilityData } = {};
      const statisticsStates: { [ctq: string]: boolean } = {};
      
      // Create Process Capability entry for each CTQ
      ctqs.forEach((ctqWithType: CtqWithType) => {
        const ctq = ctqWithType.ctq;
        const existingCapability = (capabilityDataResponse as any)?.processCapability?.find((cap: any) => cap.ctq === ctq);
        
        // Check if this CTQ comes from CTS characteristics to auto-populate LSL, USL, target
        const ctsChar = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        
        initialData[ctq] = existingCapability || {
          ctq: ctq,
          lsl: ctsChar?.lsl || "",
          usl: ctsChar?.usl || "",
          target: ctsChar?.target || "",
          zShift: 1.5,
          dataSetTerm: "Long Term" as const,
          capabilityIndex: "Cp/Cpk" as const,
          showPercentage: false,
          showZ: false,
          conclusion: "",
        };
        
        // Load statistics visibility state from database
        statisticsStates[ctq] = existingCapability?.showStatistics || false;
      });
      
      setCapabilityData(initialData);
      setShowStatistics(statisticsStates);
      
      // Set active tab to saved or first CTQ if not initialized yet
      if (!activeTab && ctqs.length > 0 && !hasInitializedTab) {
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
  }, [ctqsData, capabilityDataResponse, ctsData, activeTab]);

  const updateCapabilityField = (ctq: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      },
    }));
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

  // Calculate process capability statistics
  const calculateProcessCapabilityStats = (ctq: string) => {
    const data = capabilityData[ctq];
    const dataPointsArray = dataPoints[ctq]?.map(dp => dp.dataValue) || [];
    
    if (!data || dataPointsArray.length < 30) {
      return null;
    }
    
    const lsl = parseNumericValue(data.lsl);
    const usl = parseNumericValue(data.usl);
    const target = parseNumericValue(data.target);
    const zShift = data.zShift || 1.5;
    
    if (lsl === 0 && usl === 0) {
      return null; // No specification limits defined
    }
    
    const sampleSize = dataPointsArray.length;
    const meanValue = mean(dataPointsArray);
    const stdDev = standardDeviation(dataPointsArray);
    const varianceValue = variance(dataPointsArray);
    const myquartiles= calculateQuartiles(dataPointsArray);
    
    // Calculate capability indices
    const cp = calculateCp(dataPointsArray, lsl, usl);
    const cpk = calculateCpk(dataPointsArray, lsl, usl);
    const pp = calculatePp(dataPointsArray, lsl, usl);
    const ppk = calculatePpk(dataPointsArray, lsl, usl);
    
    // Calculate yield and performance metrics
    const yieldPercent = calculateYield(dataPointsArray, lsl, usl);
    const dpmo = calculateDPMOFromYield(yieldPercent);
    const zScore = calculateZScore(yieldPercent, zShift);
    
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
    
    // Calculate performance metrics for both Long Term and Short Term using Z scores
    const performanceMetrics = calculatePerformanceMetrics(
      zScoreData.zLongTerm || 0, 
      zScoreData.zShortTerm || 0
    );
    

    
    return {
      sampleSize,
      mean: meanValue,
      standardDeviation: stdDev,
      variance: varianceValue,
      quartiles: myquartiles,
      cp,
      cpk,
      pp,
      ppk,
      yield: yieldPercent,
      dpmo,
      zScore,
      zLongTerm: zScoreData.zLongTerm,
      zShortTerm: zScoreData.zShortTerm,
      zBench: zScoreData.zBench,
      isNormal: zScoreData.isNormal,
      adStatistic: zScoreData.adStatistic,
      pValue: zScoreData.pValue,
      performanceMetrics,
      lsl,
      usl,
      target,
      zShift,
    };
  };

  const saveCapability = (ctq: string) => {
    const data = capabilityData[ctq];
    if (data) {
      // Transform data to match schema expectations
      const transformedData = {
        ctq: data.ctq,
        lsl: data.lsl ? String(data.lsl) : "",
        usl: data.usl ? String(data.usl) : "",
        target: data.target ? String(data.target) : "",
        zShift: Number(data.zShift) || 1.5,
        dataSetTerm: data.dataSetTerm || "Long Term",
        capabilityIndex: data.capabilityIndex || "Cp/Cpk",
        showPercentage: Boolean(data.showPercentage),
        showZ: Boolean(data.showZ),
        conclusion: data.conclusion || "",
        showStatistics: Boolean(showStatistics[ctq]), // Include current statistics visibility state
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
      console.error('Failed to save statistics toggle state:', error);
      // Revert the state on error
      setShowStatistics(prev => ({
        ...prev,
        [ctq]: !newState
      }));
    }
  };

  if (ctqsLoading || capabilityLoading) {
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

  const ctqList = getCTQs();

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
        {/*
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-auto overflow-x-auto" style={{ gridTemplateColumns: `repeat(${ctqList.length}, minmax(200px, 1fr))` }}>
            {ctqList.map((ctq: string) => (
              <TabsTrigger 
                key={ctq} 
                value={ctq}
                className="flex flex-col items-center gap-1 p-3"
              >
                <span className="font-medium truncate max-w-[150px]">{ctq}</span>
                {getCapabilityStatusBadge(ctq)}
              </TabsTrigger>
            ))}
          </TabsList>
          */}
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
                              </tr>
                            </thead>
                            <tbody>
                              {/* Existing data points with editable cells */}
                              {(dataPoints[ctq] || []).map((point, index) => (
                                <tr key={index} className="border-t">
                                  <td className="px-4 py-2 text-sm text-gray-600 border-r bg-gray-50">{point.indexNumber}</td>
                                  <td className="px-4 py-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      value={point.dataValue}
                                      onChange={(e) => {
                                        const newValue = parseFloat(e.target.value);
                                        if (!isNaN(newValue)) {
                                          setDataPoints(prev => {
                                            const updated = [...(prev[ctq] || [])];
                                            updated[index] = { ...updated[index], dataValue: newValue };
                                            return { ...prev, [ctq]: updated };
                                          });
                                          // Trigger auto-save when cell value changes
                                          triggerAutoSave(ctq);
                                        }
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
                                </tr>
                              ))}
                              {/* Input row for new data */}
                              <tr className="border-t">
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
                            Data auto-saves 2 seconds after changes. Click Save Data for immediate save.
                          </p>
                          <div className="flex items-center gap-2">
                            {autoSaveTimers[ctq] && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <div className="h-2 w-2 bg-orange-400 rounded-full animate-pulse"></div>
                                Auto-saving...
                              </span>
                            )}
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
                            <SelectItem value="Cp/Cpk">Cp/Cpk (Capability Indices)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
                    </div>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-4 ${ctqWithType.ctqType === "Continuous" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
                  {ctqWithType.ctqType === "Continuous" && (
                    <>
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
                    </>
                  )}
                </div>

                {/* Statistics Control Buttons for Continuous CTQs */}
                {ctqWithType.ctqType === "Continuous" && dataPoints[ctq] && dataPoints[ctq].length >= 5 && (
                  <div className="mt-6 flex justify-left">
                    <Button
                      onClick={() => toggleStatistics(ctq)}
                      variant={showStatistics[ctq] ? "outline" : "default"}
                      className="flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      {showStatistics[ctq] ? "Hide Statistics" : "Calculate Process Capability Statistics"}
                    </Button>
                  </div>
                )}

                {/* Process Capability Calculations Display */}
                {ctqWithType.ctqType === "Continuous" && showStatistics[ctq] && (() => {
                  const stats = calculateProcessCapabilityStats(ctq);
                  const data = capabilityData[ctq];
                  const showPercentage = data?.showPercentage || false;
                  const capabilityIndex = data?.capabilityIndex || "Cp/Cpk";
                  
                  if (stats && dataPoints[ctq] && dataPoints[ctq].length >= 30) {
                    return (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Calculator className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">Process Capability Analysis Results</h3>
                        </div>
                        <div className={`grid grid-cols-1 gap-6 ${showPercentage ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                          {/* Basic Statistics */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Basic Statistics</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Sample Size:</span>
                                <span className="font-medium">{stats.sampleSize}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Mean (X̄):</span>
                                <span className="font-medium">{stats.mean.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Std Dev (σ):</span>
                                <span className="font-medium">{stats.standardDeviation.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Variance (σ²):</span>
                                <span className="font-medium">{stats.variance.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span title="will test if data follow normal distribution">Normality Test (Anderson Darling):</span>
                                  <span className={`font-medium text-sm ${stats.isNormal ? 'text-green-600' : 'text-red-600'}`}
                                    title={stats.isNormal ? "Data follow normal distribution (P-Value ≥ 0.05)" 
                                    : "Data do not follow normal distribution (P-Value < 0.05)"
                                    }>
                                    {stats.isNormal ? 'Pass' : 'Fail'}
                                  </span>
                              </div>
                              {stats.pValue && (
                                <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span> &nbsp;• AD-Value:</span>
                                    <span className="font-medium text-sm">
                                      {stats.adStatistic.toFixed(3)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span> &nbsp;• P-Value:</span>
                                    <span className="font-medium text-sm">
                                      {stats.pValue.toFixed(3)}
                                    </span>
                                </div>
                                </div>
                               )}
                            </div>
                          </div>

                          {/* Centiles */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Percentiles</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Min:</span>
                                <span className="font-medium">{stats.quartiles?.min?.toFixed(4) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span title="Q1 = 1st quartile value = percentile(25%)">Q1:</span>
                                <span className="font-medium">{stats.quartiles?.q1?.toFixed(4) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span title="Q2 = 2nd quartile value = percentile(50%)">Median:</span>
                                <span className="font-medium">{stats.quartiles?.median?.toFixed(4) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span title="Q3 = 3rd quartile value = percentile(75%)">Q3:</span>
                                <span className="font-medium">{stats.quartiles?.q3?.toFixed(4) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Max:</span>
                                <span className="font-medium">{stats.quartiles?.max?.toFixed(4) || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span title="Range = Max - Min">Range:</span>
                                <span className="font-medium">{stats.quartiles ? (stats.quartiles.max - stats.quartiles.min).toFixed(4) : 'N/A'}</span>
                              </div>
                            </div>
                          </div>                          

                          {/* Capability Indices */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-3">
                              {capabilityIndex === "Cp/Cpk" ? "Cp/Cpk Capability Indices" : "Z values"}
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span title="LSL = Lower Specification Limit">LSL:</span>
                                <span className="font-medium">{stats.lsl || "N/A"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span title="USL = Upper Specification Limit">USL:</span>
                                <span className="font-medium">{stats.usl || "N/A"}</span>
                              </div>
                              {stats.target && !(capabilityIndex === "Cp/Cpk") && (
                                <div className="flex justify-between">
                                  <span>Target:</span>
                                  <span className="font-medium">{stats.target}</span>
                                </div>)}
                              {capabilityIndex === "Cp/Cpk" ? (
                                <>
                                  <div className="flex justify-between">
                                    <span>Cp:</span>
                                    <span className="font-medium">
                                      {stats.cp !== null ? stats.cp.toFixed(3) : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Cpk:</span>
                                    <span className="font-medium">
                                      {stats.cpk !== null ? stats.cpk.toFixed(3) : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Pp:</span>
                                    <span className="font-medium">
                                      {stats.pp !== null ? stats.pp.toFixed(3) : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Ppk:</span>
                                    <span className="font-medium">
                                      {stats.ppk !== null ? stats.ppk.toFixed(3) : "N/A"}
                                    </span>
                                  </div>
                                </>
                              ) : (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Z-shift:</span>
                                  <span className="font-medium text-sm">
                                    {stats.zShift.toFixed(2)}σ
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Z Long Term:</span>
                                  <span className="font-medium text-sm">
                                    {stats.zLongTerm ? stats.zLongTerm.toFixed(2) : '0.00'}σ
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Z Short Term (Z-Bench):</span>
                                  <span className="font-medium text-sm">
                                    {stats.zShortTerm ? stats.zShortTerm.toFixed(2) : '0.00'}σ
                                  </span>
                                </div>
                              </div>
                              )}
                            </div>
                          </div>

                          {/* Performance Metrics - Long Term and Short Term */}
                          {showPercentage && stats.performanceMetrics && (
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-medium text-green-800 mb-3">Performance Metrics</h4>
                            <div className="space-y-4">
                              {/* Long Term Metrics */}
                              <div>
                                <h5 className="font-medium text-green-700 mb-2 text-sm">Long Term</h5>
                                <div className="space-y-2 text-sm pl-2 border-l-2 border-green-200">
                                  <div className="flex justify-between">
                                    <span>Yield (Long Term):</span>
                                    <span className="font-medium">
                                      {(stats.performanceMetrics.longTerm.yield).toFixed(
                                                stats.performanceMetrics.longTerm.dpmo <= 1 ? 6
                                                : stats.performanceMetrics.longTerm.dpmo <= 10 ? 5 
                                                : stats.performanceMetrics.longTerm.dpmo <= 100 ? 4 
                                                : stats.performanceMetrics.longTerm.dpmo <= 1000 ? 3 
                                                : stats.performanceMetrics.longTerm.dpmo <= 10000 ? 2 
                                                : 2
                                      )}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>% defects (Long Term):</span>
                                    <span className="font-medium">
                                      {(stats.performanceMetrics.longTerm.percentDefects).toFixed(
                                                stats.performanceMetrics.longTerm.dpmo <= 1 ? 6
                                                : stats.performanceMetrics.longTerm.dpmo <= 10 ? 5 
                                                : stats.performanceMetrics.longTerm.dpmo <= 100 ? 4 
                                                : stats.performanceMetrics.longTerm.dpmo <= 1000 ? 3 
                                                : stats.performanceMetrics.longTerm.dpmo <= 10000 ? 2 
                                                : 2
                                      )}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>DPMO (Long Term):</span>
                                    <span className="font-medium">
                                      {Math.round(stats.performanceMetrics.longTerm.dpmo).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Short Term Metrics */}
                              <div>
                                <h5 className="font-medium text-blue-700 mb-2 text-sm">Short Term</h5>
                                <div className="space-y-2 text-sm pl-2 border-l-2 border-blue-200">
                                  <div className="flex justify-between">
                                    <span>Yield (Short Term):</span>
                                    <span className="font-medium">
                                      {(stats.performanceMetrics.shortTerm.yield).toFixed(
                                                stats.performanceMetrics.shortTerm.dpmo <= 1 ? 6
                                                : stats.performanceMetrics.shortTerm.dpmo <= 10 ? 5 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 100 ? 4 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 1000 ? 3 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 10000 ? 2 
                                                : 2
                                      )}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>% defects (Short Term):</span>
                                    <span className="font-medium">
                                      {(stats.performanceMetrics.shortTerm.percentDefects).toFixed(
                                                stats.performanceMetrics.shortTerm.dpmo <= 1 ? 6
                                                : stats.performanceMetrics.shortTerm.dpmo <= 10 ? 5 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 100 ? 4 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 1000 ? 3 
                                                : stats.performanceMetrics.shortTerm.dpmo <= 10000 ? 2 
                                                : 2
                                      )}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>DPMO (Short Term):</span>
                                    <span className="font-medium">
                                      {Math.round(stats.performanceMetrics.shortTerm.dpmo).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        </div>

                        {/* Capability Assessment */}
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-medium text-yellow-800 mb-2">Capability Assessment</h4>
                          <div className="text-sm text-yellow-700">
                            {stats.cpk !== null && capabilityIndex === "Cp/Cpk" && (
                              <div>
                                {stats.cpk >= 1.33 && (
                                  <p className="text-green-700 font-medium">✓ Process is capable (Cpk ≥ 1.33)</p>
                                )}
                                {stats.cpk >= 1.0 && stats.cpk < 1.33 && (
                                  <p className="text-yellow-700 font-medium">⚠ Process is marginally capable (1.0 ≤ Cpk {'<'} 1.33)</p>
                                )}
                                {stats.cpk < 1.0 && (
                                  <p className="text-red-700 font-medium">✗ Process is not capable (Cpk {'<'} 1.0)</p>
                                )}
                              </div>
                            )}
                            {capabilityIndex === "Z" && (
                              <div>
                                {stats.zScore >= 6 && (
                                  <p className="text-green-700 font-medium">✓ World class performance (≥ 6σ)</p>
                                )}
                                {stats.zScore >= 4 && stats.zScore < 6 && (
                                  <p className="text-blue-700 font-medium">○ Good performance (4-6σ)</p>
                                )}
                                {stats.zScore >= 3 && stats.zScore < 4 && (
                                  <p className="text-yellow-700 font-medium">⚠ Average performance (3-4σ)</p>
                                )}
                                {stats.zScore < 3 && (
                                  <p className="text-red-700 font-medium">✗ Poor performance ({'<'} 3σ)</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (dataPoints[ctq]?.length > 0) {
                    return (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Calculator className="h-4 w-4" />
                          <span className="font-medium">Process Capability Analysis</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-2">
                          Need at least 30 data points for statistical analysis. 
                          Current: {dataPoints[ctq]?.length || 0} data points.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Statistical Control Charts, Density Histogram and ox Plot */}
                {ctqWithType.ctqType === "Continuous" && showStatistics[ctq] && (() => {
                  const currentPoints = dataPoints[ctq] || [];
                  const numericValues = currentPoints.map(point => point.dataValue);
                  
                  if (numericValues.length >= 5) {
                    // Prepare data for charts
                    const individualData = numericValues.map((value, index) => ({
                      point: index + 1,
                      value: value,
                      index: index + 1
                    }));

                    const movingRanges = calculateMovingRange(numericValues);
                    const movingRangeData = movingRanges.map((range, index) => ({
                      point: index + 2, // MR starts from point 2
                      value: range,
                      index: index + 2
                    }));

                    const histogramData = getHistogramData(numericValues, 8);
                    const quartiles = calculateQuartiles(numericValues);
                    const individualLimits = calculateIndividualControlLimits(numericValues);
                    const mrLimits = calculateMovingRangeControlLimits(numericValues);



                    // Box plot data
                    const boxPlotData = [
                      {
                        name: ctq,
                        min: quartiles.min,
                        q1: quartiles.q1,
                        median: quartiles.median,
                        q3: quartiles.q3,
                        max: quartiles.max,
                        outliers: [] // Could add outlier detection later
                      }
                    ];

                    return (
                      <div className="mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="h-5 w-5 text-green-600" />
                          <h3 className="text-lg font-semibold">Statistical Charts</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Individual Control Chart (I Chart) */}
                          <div className="bg-white p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Individual Control Chart (I-Chart)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={individualData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="point" label={{ value: 'Data Point', position: 'insideBottom', offset: -5 }} />
                                <YAxis 
                                  label={{ value: 'Individual Value', angle: -90, position: 'insideBottomLeft' }}
                                  domain={[
                                    Math.min(individualLimits.lcl, Math.min(...numericValues)),
                                    Math.max(individualLimits.ucl, Math.max(...numericValues))
                                  ]}
                                />
                                <Tooltip formatter={(value: any) => [Number(value).toFixed(3), 'Value']} />
                                <ReferenceLine 
                                  y={individualLimits.centerLine} 
                                  stroke="#2563eb" 
                                  strokeDasharray="8 8" 
                                  label={{ 
                                    value: `X̄=${individualLimits.centerLine.toFixed(3)}`, 
                                    position: "insideTopLeft",
                                    style: { fill: "#2563eb", fontWeight: "bold", fontSize: "12px" }
                                  }} 
                                />
                                <ReferenceLine 
                                  y={individualLimits.ucl} 
                                  stroke="#dc2626" 
                                  //strokeDasharray="4 4" 
                                  label={{ 
                                    value: `UCL=${individualLimits.ucl.toFixed(3)}`, 
                                    position: "insideTopLeft",
                                    style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                                  }} 
                                />
                                <ReferenceLine 
                                  y={individualLimits.lcl} 
                                  stroke="#dc2626" 
                                  //strokeDasharray="4 4" 
                                  label={{ 
                                    value: `LCL=${individualLimits.lcl.toFixed(3)}`, 
                                    position: "insideBottomLeft",
                                    style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                                  }} 
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#059669" 
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  connectNulls={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                            <div className="text-xs text-gray-600 mt-2">
                              CL: {individualLimits.centerLine.toFixed(3)} | 
                              UCL: {individualLimits.ucl.toFixed(3)} | 
                              LCL: {individualLimits.lcl.toFixed(3)} | 
                              min data: {Math.min(...numericValues)} | 
                              max data: {Math.max( ...numericValues)} | 
                              Yscale min: {Math.min(individualLimits.lcl, Math.min(...numericValues))} |
                              Yscale max: {Math.max(individualLimits.lcl, Math.max(...numericValues))} | 
 
                            </div>
                          </div>

                          {/* Density Histogram */}
                          <div className="bg-white p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Density Histogram</h4>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={histogramData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="x" 
                                  label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
                                  tickFormatter={(value) => Number(value).toFixed(2)}
                                />
                                <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                                <Tooltip 
                                  formatter={(value: any) => [value, 'Frequency']}
                                  labelFormatter={(value) => `Value: ${Number(value).toFixed(3)}`}
                                />
                                <Bar dataKey="y" fill="#3b82f6" />
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="text-xs text-gray-600 mt-2">
                              Mean: {mean(numericValues).toFixed(3)} | 
                              Std Dev: {standardDeviation(numericValues).toFixed(3)}
                            </div>
                          </div>

                          {/* Moving Range Control Chart (MR Chart) */}
                          <div className="bg-white p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Moving Range Control Chart (MR-Chart)</h4>
                            <ResponsiveContainer width="100%" height={250}>
                              <LineChart data={movingRangeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="point" label={{ value: 'Data Point', position: 'insideBottom', offset: -5 }} />
                                <YAxis 
                                  label={{ value: 'Moving Range', angle: -90, position: 'insideBottomLeft' }}
                                  domain={[0, Math.max(mrLimits.ucl, Math.max(...movingRanges))]}
                                />
                                <Tooltip formatter={(value: any) => [Number(value).toFixed(3), 'Moving Range']} />
                                <ReferenceLine 
                                  y={mrLimits.centerLine} 
                                  stroke="#2563eb" 
                                  strokeDasharray="8 8" 
                                  label={{ 
                                    value: `MR̄=${mrLimits.centerLine.toFixed(3)}`, 
                                    position: "insideTopLeft",
                                    style: { fill: "#2563eb", fontWeight: "bold", fontSize: "12px" }
                                  }} 
                                />
                                <ReferenceLine 
                                  y={mrLimits.ucl} 
                                  stroke="#dc2626" 
                                  //strokeDasharray="4 4" 
                                  label={{ 
                                    value: `UCL=${mrLimits.ucl.toFixed(3)}`, 
                                    position: "insideTopLeft",
                                    style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                                  }} 
                                />
                                {/* {mrLimits.lcl > 0 && ( */}
                                  <ReferenceLine 
                                    y={mrLimits.lcl} 
                                    stroke="#dc2626" 
                                    //strokeDasharray="4 4" 
                                    label={{ 
                                      value: `LCL=${mrLimits.lcl.toFixed(3)}`, 
                                      position: "insideBottomLeft",
                                      style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                                    }} 
                                  />
                                {/* }) */}
                                <Line 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#7c3aed" 
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  connectNulls={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                            <div className="text-xs text-gray-600 mt-2">
                              CL: {mrLimits.centerLine.toFixed(3)} | 
                              UCL: {mrLimits.ucl.toFixed(3)} | 
                              LCL: {mrLimits.lcl.toFixed(3)}
                            </div>
                          </div>

                          {/* Box Plot */}
                          <div className="bg-white p-4 border rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-3">Box Plot</h4>
                            <div className="h-[250px] flex items-center justify-center">
                              <div className="relative w-full max-w-md">
                                {/* Box plot visualization */}
                                <div className="relative h-32 bg-gray-50 border rounded">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-3/4 h-8">
                                      {/* Whiskers */}
                                      <div 
                                        className="absolute h-0.5 bg-gray-600"
                                        style={{
                                          left: '0%',
                                          width: '100%',
                                          top: '50%',
                                          transform: 'translateY(-50%)'
                                        }}
                                      />
                                      
                                      {/* Min line */}
                                      <div 
                                        className="absolute w-0.5 h-4 bg-gray-600"
                                        style={{ left: '0%', top: '25%' }}
                                      />
                                      
                                      {/* Q1-Q3 Box */}
                                      <div 
                                        className="absolute h-full bg-blue-200 border border-blue-400"
                                        style={{
                                          left: '25%',
                                          width: '50%'
                                        }}
                                      />
                                      
                                      {/* Median line */}
                                      <div 
                                        className="absolute w-0.5 h-full bg-red-600"
                                        style={{
                                          left: '50%',
                                          top: '0%'
                                        }}
                                      />
                                      
                                      {/* Max line */}
                                      <div 
                                        className="absolute w-0.5 h-4 bg-gray-600"
                                        style={{ right: '0%', top: '25%' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Labels */}
                                <div className="flex justify-between text-xs text-gray-600 mt-2">
                                  <span>Min: {quartiles.min.toFixed(2)}</span>
                                  <span>Q1: {quartiles.q1.toFixed(2)}</span>
                                  <span>Med: {quartiles.median.toFixed(2)}</span>
                                  <span>Q3: {quartiles.q3.toFixed(2)}</span>
                                  <span>Max: {quartiles.max.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (numericValues.length > 0) {
                    return (
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700">
                          <BarChart3 className="h-4 w-4" />
                          <span className="font-medium">Statistical Charts</span>
                        </div>
                        <p className="text-sm text-orange-600 mt-2">
                          Need at least 5 data points for statistical charts. 
                          Current: {numericValues.length} data points.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Conclusion</label>
                    <Textarea
                      value={capabilityData[ctq]?.conclusion || ""}
                      onChange={(e) => updateCapabilityField(ctq, "conclusion", e.target.value)}
                      placeholder="Summary of process capability assessment..."
                      rows={3}
                    />
                  </div>
                </div>

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
            </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}