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
import { TrendingUp, Save, Undo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  // Add keyboard event handler for Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z' && activeTab) {
        event.preventDefault();
        handleUndo(activeTab);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Process capability analysis saved successfully",
      });
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
      return await apiRequest('POST', `/api/process-capability/${processCapabilityId}/data`, { dataPoints });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data point saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save data point: ${error}`,
        variant: "destructive",
      });
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
  };

  const saveAllDataPoints = async (ctq: string) => {
    const processCapabilityId = capabilityData[ctq]?.id;
    if (!processCapabilityId) return;
    
    const currentPoints = dataPoints[ctq] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    
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
      toast({
        title: "Error",
        description: "Failed to save data points",
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
      if (dataPoints[ctq]) {
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
      
      // Apply the pasted data starting from the focused position
      setDataPoints(prev => {
        const currentData = [...(prev[ctq] || [])];
        
        // Fill in data starting from the focused index
        parsedValues.forEach((value, i) => {
          const targetIndex = startIndex + i;
          
          // Extend array if needed
          while (currentData.length <= targetIndex) {
            currentData.push({
              indexNumber: currentData.length + 1,
              dataValue: 0
            });
          }
          
          // Update the value at the target position
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
        description: `Pasted ${parsedValues.length} data points starting from position ${startIndex + 1}`,
      });
      
    } catch (error) {
      console.error("Error pasting data:", error);
      toast({
        title: "Error",
        description: "Failed to paste data. Please try again.",
        variant: "destructive",
      });
    }
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
      });
      
      setCapabilityData(initialData);
      
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
      };
      
      saveCapabilityMutation.mutate(transformedData);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Z-Shift Value</label>
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

                {/* Data Input Section for Continuous CTQs */}
                {ctqWithType.ctqType === "Continuous" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Data Input</label>
                      <div 
                        className="border rounded-lg overflow-hidden"
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData('text');
                          handleFocusedCellPaste(ctq, 0, pasteData);
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
                                        }
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
                        <div className="font-medium text-blue-700 mb-1">Excel Import Instructions:</div>
                        <div className="text-sm text-blue-600">
                          • Focus on any cell and paste (Ctrl+V) to fill down from that position
                          • Copy numeric values from Excel and paste directly into the table
                          • Use individual cells for precise data entry
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">Enter data values manually or paste from Excel, then Save Data to persist to database</p>
                          {undoStates[ctq] && (
                            <Button
                              onClick={() => handleUndo(ctq)}
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-xs h-7 px-2"
                            >
                              <Undo className="h-3 w-3" />
                              Undo Paste
                            </Button>
                          )}
                        </div>
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
                )}

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