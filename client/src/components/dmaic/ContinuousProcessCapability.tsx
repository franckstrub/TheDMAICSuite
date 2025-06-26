import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Save, Undo, Calculator, BarChart3, Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  mean, 
  standardDeviation, 
  variance,
  parseNumericValue,
  median,
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine, ComposedChart } from "recharts";

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
  showZ: boolean;
  showStatistics: boolean;
  capabilityAssessment?: string;
  enableNonConformity?: boolean;
  enableDpmo?: boolean;
  enableRty?: boolean;
  enableOee?: boolean;
  enablePareto?: boolean;
  nonConformityUnits?: number;
  totalUnits?: number;
  dpmoDefects?: number;
  dpmoUnits?: number;
  dpmoOpportunitiesPerUnit?: number;
  rtyProcessSteps?: Array<{stepName: string; passed: number; total: number}>;
  oeeScheduledTime?: number;
  oeeAvailableTime?: number;
  oeeNominalCapacity?: number;
  oeePartsManufactured?: number;
  oeeBadParts?: number;
  paretoDefectCategories?: Array<{category: string; count: number}>;
}

interface DataPoint {
  id?: number;
  indexNumber: number;
  dataValue: number;
}

interface ContinuousProcessCapabilityProps {
  projectId: string | number;
  ctq: string;
  ctqType: "Continuous" | "Attribute";
  capabilityData: { [ctq: string]: ProcessCapabilityData };
  setCapabilityData: React.Dispatch<React.SetStateAction<{ [ctq: string]: ProcessCapabilityData }>>;
  showStatistics: { [ctq: string]: boolean };
  setShowStatistics: React.Dispatch<React.SetStateAction<{ [ctq: string]: boolean }>>;
  isStatisticsLoaded: boolean;
}

export default function ContinuousProcessCapability({
  projectId,
  ctq,
  ctqType,
  capabilityData,
  setCapabilityData,
  showStatistics,
  setShowStatistics,
  isStatisticsLoaded
}: ContinuousProcessCapabilityProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dataPoints, setDataPoints] = useState<{ [ctq: string]: DataPoint[] }>({});
  const [inputValues, setInputValues] = useState<{ [ctq: string]: string }>({});
  const [undoStates, setUndoStates] = useState<{ [ctq: string]: DataPoint[] }>({});
  const [focusedCell, setFocusedCell] = useState<{ [ctq: string]: number }>({});
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState<{ [ctq: string]: boolean }>({});
  const [autoSaveTimers, setAutoSaveTimers] = useState<{ [ctq: string]: NodeJS.Timeout }>({});

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
      
      const ctqName = variables.ctq;
      const currentPoints = dataPoints[ctqName] || [];
      
      if (currentPoints.length > 0 && data.capability?.id) {
        saveDataPointMutation.mutate({
          processCapabilityId: data.capability.id,
          dataPoints: currentPoints.map(point => point.dataValue)
        });
      }
      
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

  // Mutation to save data points
  const saveDataPointMutation = useMutation({
    mutationFn: async ({ processCapabilityId, dataPoints }: { processCapabilityId: number, dataPoints: number[] }) => {
      const response = await apiRequest('POST', `/api/process-capability/${processCapabilityId}/data`, { dataPoints });
      return response;
    },
    onSuccess: () => {
      // Success handled elsewhere
    },
    onError: () => {
      // Error handled elsewhere
    },
  });

  // Load data points for the CTQ
  useEffect(() => {
    const loadDataPointsForCtq = async () => {
      const capability = capabilityData[ctq];
      if (capability?.id) {
        try {
          const response = await fetch(`/api/process-capability/${capability.id}/data`);
          if (response.ok) {
            const data = await response.json();
            setDataPoints(prev => ({
              ...prev,
              [ctq]: data.dataPoints || []
            }));
          }
        } catch (error) {
          console.error("Failed to load data points:", error);
        }
      }
    };

    if (capabilityData[ctq]?.id) {
      loadDataPointsForCtq();
    }
  }, [capabilityData, ctq]);

  // Auto-save function with debouncing
  const autoSaveDataPoints = async (ctqName: string) => {
    let processCapabilityId = capabilityData[ctqName]?.id;
    
    if (!processCapabilityId) {
      try {
        const defaultCapabilityData: Omit<ProcessCapabilityData, 'id'> = {
          ctq: ctqName,
          lsl: "",
          usl: "",
          target: "",
          zShift: 1.5,
          dataSetTerm: "Long Term",
          capabilityIndex: "Z",
          showPercentage: false,
          showZ: false,
          showStatistics: false,
          capabilityAssessment: "",
          enableNonConformity: false,
          enableDpmo: false,
          enableRty: false,
          enableOee: false,
          enablePareto: false,
        };
        
        const result = await saveCapabilityMutation.mutateAsync(defaultCapabilityData);
        processCapabilityId = result.capability.id;
        
        setCapabilityData(prev => ({
          ...prev,
          [ctqName]: {
            ...defaultCapabilityData,
            id: processCapabilityId
          }
        }));
      } catch (error) {
        return;
      }
    }
    
    if (!processCapabilityId) return;
    
    const currentPoints = dataPoints[ctqName] || [];
    const numericValues = currentPoints.map(point => point.dataValue);
    
    if (numericValues.length === 0) return;
    
    try {
      await saveDataPointMutation.mutateAsync({
        processCapabilityId,
        dataPoints: numericValues
      });
      
      setAutoSaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[ctqName];
        return newTimers;
      });
    } catch (error) {
      setAutoSaveTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[ctqName];
        return newTimers;
      });
    }
  };

  // Debounced auto-save trigger
  const triggerAutoSave = (ctqName: string) => {
    if (autoSaveTimers[ctqName]) {
      clearTimeout(autoSaveTimers[ctqName]);
    }
    
    const newTimer = setTimeout(() => {
      autoSaveDataPoints(ctqName);
    }, 2000);
    
    setAutoSaveTimers(prev => ({
      ...prev,
      [ctqName]: newTimer
    }));
  };

  // Handle data input
  const handleDataInput = (ctqName: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [ctqName]: value
    }));
  };

  // Add data point
  const handleAddDataPoint = (ctqName: string) => {
    const value = inputValues[ctqName];
    if (!value?.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    const currentPoints = dataPoints[ctqName] || [];
    const newPoint: DataPoint = {
      indexNumber: currentPoints.length + 1,
      dataValue: numericValue
    };
    
    setDataPoints(prev => ({
      ...prev,
      [ctqName]: [...currentPoints, newPoint]
    }));
    
    setInputValues(prev => ({
      ...prev,
      [ctqName]: ""
    }));
    
    triggerAutoSave(ctqName);
  };

  // Delete data point
  const handleDeleteDataPoint = (ctqName: string, index: number) => {
    setDataPoints(prev => {
      const currentPoints = prev[ctqName] || [];
      const updatedPoints = currentPoints.filter((_, i) => i !== index);
      const reindexedPoints = updatedPoints.map((point, i) => ({
        ...point,
        indexNumber: i + 1
      }));
      
      triggerAutoSave(ctqName);
      return {
        ...prev,
        [ctqName]: reindexedPoints
      };
    });
  };

  // Handle paste from Excel
  const handlePasteFromExcel = (ctqName: string, startIndex: number, event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasteData = event.clipboardData.getData('text');
    handleFocusedCellPaste(ctqName, startIndex, pasteData);
  };

  // Handle focused cell paste
  const handleFocusedCellPaste = (ctqName: string, startIndex: number, pasteData: string) => {
    if (!pasteData.trim()) return;
    
    const currentPoints = dataPoints[ctqName] || [];
    setUndoStates(prev => ({
      ...prev,
      [ctqName]: JSON.parse(JSON.stringify(currentPoints))
    }));
    
    const lines = pasteData.trim().split(/\r?\n/);
    const newValues: number[] = [];
    
    lines.forEach(line => {
      const value = parseNumericValue(line.trim());
      if (value !== null) {
        newValues.push(value);
      }
    });
    
    if (newValues.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid numeric data found in the pasted content.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedPoints = [...currentPoints];
    
    newValues.forEach((value, index) => {
      const targetIndex = startIndex + index;
      if (targetIndex < currentPoints.length) {
        updatedPoints[targetIndex] = {
          ...updatedPoints[targetIndex],
          dataValue: value
        };
      } else {
        updatedPoints.push({
          indexNumber: targetIndex + 1,
          dataValue: value
        });
      }
    });
    
    setDataPoints(prev => ({
      ...prev,
      [ctqName]: updatedPoints
    }));
    
    triggerAutoSave(ctqName);
    
    toast({
      title: "Data Pasted",
      description: `${newValues.length} data points pasted successfully. Use Ctrl+Z to undo.`,
    });
  };

  // Handle undo
  const handleUndo = (ctqName: string) => {
    if (undoStates[ctqName]) {
      setDataPoints(prev => ({
        ...prev,
        [ctqName]: JSON.parse(JSON.stringify(undoStates[ctqName]))
      }));
      
      setUndoStates(prev => {
        const newState = { ...prev };
        delete newState[ctqName];
        return newState;
      });
      
      toast({
        title: "Undone",
        description: "Previous paste operation has been undone",
      });
    }
  };

  // Update capability field
  const updateCapabilityField = (ctqName: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => ({
      ...prev,
      [ctqName]: {
        ...prev[ctqName],
        [field]: value,
      },
    }));
  };

  // Calculate process capability statistics
  const calculateProcessCapabilityStats = (ctqName: string) => {
    const points = dataPoints[ctqName] || [];
    const data = capabilityData[ctqName];
    
    if (points.length === 0 || !data) return null;
    
    const values = points.map(p => p.dataValue);
    const lsl = parseNumericValue(data.lsl);
    const usl = parseNumericValue(data.usl);
    const target = parseNumericValue(data.target);
    
    const meanVal = mean(values);
    const stdDev = standardDeviation(values);
    const varianceVal = variance(values);
    const medianVal = median(values);
    const modeVal = calculateMode(values);
    
    let stats: any = {
      mean: meanVal,
      standardDeviation: stdDev,
      variance: varianceVal,
      median: medianVal,
      mode: modeVal,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values)
    };
    
    if (lsl !== null && usl !== null) {
      const capabilityMetrics = calculateCapabilityIndexes(values, lsl, usl, target);
      const performanceMetrics = calculatePerformanceMetrics(values, lsl, usl, target);
      const zScores = calculateZScoreLongShortTerm(values, lsl, usl, data.zShift);
      
      stats = {
        ...stats,
        ...capabilityMetrics,
        ...performanceMetrics,
        ...zScores
      };
    }
    
    return stats;
  };

  // Generate AI Assessment
  const generateAIAssessment = async (ctqName: string) => {
    try {
      setIsGeneratingAssessment(prev => ({ ...prev, [ctqName]: true }));

      const currentData = dataPoints[ctqName] || [];
      if (currentData.length < 25) {
        toast({
          title: "Insufficient Data",
          description: `At least 25 data points are required for AI capability analysis. Current: ${currentData.length}`,
          variant: "destructive",
        });
        return;
      }

      const stats = calculateProcessCapabilityStats(ctqName);
      if (!stats) {
        toast({
          title: "No Statistics Available",
          description: "Unable to calculate statistics for AI assessment.",
          variant: "destructive",
        });
        return;
      }

      const context = {
        ctq: ctqName,
        dataPoints: currentData.length,
        lsl: capabilityData[ctqName]?.lsl,
        usl: capabilityData[ctqName]?.usl,
        target: capabilityData[ctqName]?.target,
        zShift: capabilityData[ctqName]?.zShift,
        dataSetTerm: capabilityData[ctqName]?.dataSetTerm,
        capabilityIndex: capabilityData[ctqName]?.capabilityIndex
      };

      const response = await apiRequest('POST', `/api/projects/${projectId}/process-capability/${ctqName}/ai-assessment`, {
        stats,
        context
      });

      if (response.assessment) {
        setCapabilityData(prev => ({
          ...prev,
          [ctqName]: {
            ...prev[ctqName],
            capabilityAssessment: response.assessment
          }
        }));

        toast({
          title: "AI Assessment Generated",
          description: "Capability assessment has been generated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Assessment Failed",
        description: "Failed to generate AI capability assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAssessment(prev => ({ ...prev, [ctqName]: false }));
    }
  };

  // Toggle statistics visibility
  const toggleStatistics = async (ctqName: string) => {
    const newState = !showStatistics[ctqName];
    
    setShowStatistics(prev => ({
      ...prev,
      [ctqName]: newState
    }));

    try {
      await apiRequest('PATCH', `/api/projects/${projectId}/process-capability/${ctqName}/statistics`, {
        showStatistics: newState
      });
    } catch (error) {
      setShowStatistics(prev => ({
        ...prev,
        [ctqName]: !newState
      }));
    }
  };

  // Save capability data
  const saveData = (ctqName: string) => {
    const data = capabilityData[ctqName];
    if (!data) return;

    const transformedData = {
      ctq: ctqName,
      lsl: data.lsl || null,
      usl: data.usl || null,
      target: data.target || null,
      zShift: data.zShift,
      dataSetTerm: data.dataSetTerm,
      capabilityIndex: data.capabilityIndex,
      showPercentage: data.showPercentage,
      showZ: data.showZ,
      showStatistics: data.showStatistics,
      capabilityAssessment: data.capabilityAssessment,
      enableNonConformity: data.enableNonConformity,
      enableDpmo: data.enableDpmo,
      enableRty: data.enableRty,
      enableOee: data.enableOee,
      enablePareto: data.enablePareto,
      nonConformityUnits: data.nonConformityUnits,
      totalUnits: data.totalUnits,
      dpmoDefects: data.dpmoDefects,
      dpmoUnits: data.dpmoUnits,
      dpmoOpportunitiesPerUnit: data.dpmoOpportunitiesPerUnit,
      rtyProcessSteps: data.rtyProcessSteps,
      oeeScheduledTime: data.oeeScheduledTime,
      oeeAvailableTime: data.oeeAvailableTime,
      oeeNominalCapacity: data.oeeNominalCapacity,
      oeePartsManufactured: data.oeePartsManufactured,
      oeeBadParts: data.oeeBadParts,
      paretoDefectCategories: data.paretoDefectCategories
    };
    
    saveCapabilityMutation.mutate(transformedData);
  };

  const data = capabilityData[ctq];
  const currentDataPoints = dataPoints[ctq] || [];
  const stats = calculateProcessCapabilityStats(ctq);

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor={`${ctq}-lsl`}>Lower Specification Limit (LSL)</Label>
              <Input
                id={`${ctq}-lsl`}
                type="number"
                step="any"
                value={data?.lsl || ""}
                onChange={(e) => updateCapabilityField(ctq, "lsl", e.target.value)}
                placeholder="Enter LSL"
              />
            </div>
            <div>
              <Label htmlFor={`${ctq}-usl`}>Upper Specification Limit (USL)</Label>
              <Input
                id={`${ctq}-usl`}
                type="number"
                step="any"
                value={data?.usl || ""}
                onChange={(e) => updateCapabilityField(ctq, "usl", e.target.value)}
                placeholder="Enter USL"
              />
            </div>
            <div>
              <Label htmlFor={`${ctq}-target`}>Target Value</Label>
              <Input
                id={`${ctq}-target`}
                type="number"
                step="any"
                value={data?.target || ""}
                onChange={(e) => updateCapabilityField(ctq, "target", e.target.value)}
                placeholder="Enter target"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Z-Shift</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="3"
                value={data?.zShift || 1.5}
                onChange={(e) => updateCapabilityField(ctq, "zShift", parseFloat(e.target.value) || 1.5)}
              />
            </div>
            <div>
              <Label>Data Set Term</Label>
              <Select
                value={data?.dataSetTerm || "Long Term"}
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
            <div>
              <Label>Capability Index</Label>
              <RadioGroup
                value={data?.capabilityIndex || "Z"}
                onValueChange={(value) => updateCapabilityField(ctq, "capabilityIndex", value)}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Z" id={`${ctq}-z`} />
                  <Label htmlFor={`${ctq}-z`}>Z</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Cp/Cpk" id={`${ctq}-cp`} />
                  <Label htmlFor={`${ctq}-cp`}>Cp/Cpk</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => saveData(ctq)} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
            <Button 
              onClick={() => toggleStatistics(ctq)}
              variant={showStatistics[ctq] ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {showStatistics[ctq] ? "Hide" : "Calculate"} Statistics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Measurement Data</Label>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const clipboardData = await navigator.clipboard.readText();
                      if (clipboardData.trim()) {
                        const syntheticEvent = {
                          preventDefault: () => {},
                          clipboardData: {
                            getData: (format: string) => clipboardData
                          }
                        } as unknown as React.ClipboardEvent;
                        
                        const rawindex = focusedCell[ctq] !== undefined ? focusedCell[ctq] : currentDataPoints.length;
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
                  className="text-xs"
                >
                  Paste from Excel
                </Button>
                {undoStates[ctq] && (
                  <Button
                    onClick={() => handleUndo(ctq)}
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1"
                  >
                    <Undo className="h-3 w-3" />
                    Undo
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left border-r">#</th>
                      <th className="px-4 py-2 text-left">Measurement Value</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDataPoints.map((point, index) => (
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
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-blue-50">
                      <td className="px-4 py-2 text-sm text-gray-600 border-r bg-gray-50">
                        {currentDataPoints.length + 1}
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
                              setFocusedCell(prev => ({ ...prev, [ctq]: currentDataPoints.length }));
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasteData = e.clipboardData.getData('text');
                              handleFocusedCellPaste(ctq, currentDataPoints.length, pasteData);
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

            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-sm text-blue-700 mb-1">Excel Import Instructions:</div>
              <div className="text-xs text-blue-600">
                <p>• <strong>Focus a cell</strong> by clicking on any measurement input field</p>
                <p>• <strong>Paste data</strong> using Ctrl+V - data will start from the focused cell</p>
                <p>• <strong>Undo changes</strong> using Ctrl+Z after pasting</p>
                <p>• Data will automatically create new rows if needed</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Data Points: {currentDataPoints.length}</span>
                {autoSaveTimers[ctq] && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Auto-saving...
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Section */}
      {showStatistics[ctq] && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Process Capability Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Statistics */}
              <div>
                <h4 className="font-medium mb-3">Descriptive Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Count</div>
                    <div className="font-medium">{stats.count}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Mean</div>
                    <div className="font-medium">{stats.mean?.toFixed(4)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Std Dev</div>
                    <div className="font-medium">{stats.standardDeviation?.toFixed(4)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Range</div>
                    <div className="font-medium">{stats.range?.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              {/* Capability Metrics */}
              {stats.cp !== undefined && (
                <div>
                  <h4 className="font-medium mb-3">Capability Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Cp</div>
                      <div className="font-medium">{stats.cp?.toFixed(4)}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Cpk</div>
                      <div className="font-medium">{stats.cpk?.toFixed(4)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Pp</div>
                      <div className="font-medium">{stats.pp?.toFixed(4)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Ppk</div>
                      <div className="font-medium">{stats.ppk?.toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Assessment Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">AI Capability Assessment</h4>
                  <Button
                    onClick={() => generateAIAssessment(ctq)}
                    disabled={isGeneratingAssessment[ctq] || currentDataPoints.length < 25}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingAssessment[ctq] ? "Generating..." : "Generate Assessment"}
                  </Button>
                </div>
                
                {data?.capabilityAssessment ? (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                    <Textarea
                      value={data.capabilityAssessment}
                      onChange={(e) => updateCapabilityField(ctq, "capabilityAssessment", e.target.value)}
                      className="min-h-[120px] bg-white/50 border-blue-200"
                      placeholder="AI-generated capability assessment will appear here..."
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center text-gray-500">
                    <p>No AI assessment generated yet.</p>
                    <p className="text-sm mt-1">
                      {currentDataPoints.length < 25 
                        ? `Add ${25 - currentDataPoints.length} more data points to generate assessment.`
                        : "Click 'Generate Assessment' to create an AI analysis."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}