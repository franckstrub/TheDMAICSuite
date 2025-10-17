import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Plot from "react-plotly.js";

interface ValueTimeAnalysisProps {
  projectId: number;
}

interface TaskData {
  taskName: string;
  cycleTime: number;
}

interface ValueTimeData {
  id?: number;
  projectId: number;
  analysisType: "value" | "time";
  // Process Value Analysis fields
  vaTime?: number;
  bvaTime?: number;
  nvaTime?: number;
  pce?: number;
  // Process Time Analysis fields
  customerDemand?: number;
  effectiveWorkingTime?: number;
  numberOfShifts?: number;
  taktTime?: number;
  wip?: number;
  plt?: number;
  taskData?: TaskData[];
}

export default function ValueTimeAnalysis({ projectId }: ValueTimeAnalysisProps) {
  const { toast } = useToast();
  
  // Analysis selection states
  const [showValueAnalysis, setShowValueAnalysis] = useState<boolean>(false);
  const [showTimeAnalysis, setShowTimeAnalysis] = useState<boolean>(false);
  
  // Process Value Analysis states
  const [vaTime, setVaTime] = useState<string>("");
  const [bvaTime, setBvaTime] = useState<string>("");
  const [nvaTime, setNvaTime] = useState<string>("");
  const [pce, setPce] = useState<number | null>(null);
  
  // Process Time Analysis states
  const [customerDemand, setCustomerDemand] = useState<string>("");
  const [effectiveWorkingTime, setEffectiveWorkingTime] = useState<string>("8");
  const [numberOfShifts, setNumberOfShifts] = useState<string>("1");
  const [taktTime, setTaktTime] = useState<number | null>(null);
  const [wip, setWip] = useState<string>("");
  const [plt, setPlt] = useState<number | null>(null);
  const [taskData, setTaskData] = useState<TaskData[]>([{ taskName: "", cycleTime: 0 }]);

  // Load data from database
  const { data: analysisData } = useQuery<ValueTimeData>({
    queryKey: [`/api/projects/${projectId}/value-time-analysis`],
    enabled: !!projectId,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ValueTimeData>) => {
      return apiRequest('POST', `/api/projects/${projectId}/value-time-analysis`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/value-time-analysis`] });
      toast({
        title: "Saved Successfully",
        description: "Value & Time analysis has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load saved data
  useEffect(() => {
    if (analysisData) {
      // Determine which analyses to show based on saved data
      const hasValueData = analysisData.vaTime !== null && analysisData.vaTime !== undefined;
      const hasTimeData = analysisData.customerDemand !== null && analysisData.customerDemand !== undefined;
      
      setShowValueAnalysis(hasValueData);
      setShowTimeAnalysis(hasTimeData);
      
      setVaTime(analysisData.vaTime?.toString() || "");
      setBvaTime(analysisData.bvaTime?.toString() || "");
      setNvaTime(analysisData.nvaTime?.toString() || "");
      setPce(analysisData.pce || null);
      setCustomerDemand(analysisData.customerDemand?.toString() || "");
      setEffectiveWorkingTime(analysisData.effectiveWorkingTime?.toString() || "8");
      setNumberOfShifts(analysisData.numberOfShifts?.toString() || "1");
      setTaktTime(analysisData.taktTime || null);
      setWip(analysisData.wip?.toString() || "");
      setPlt(analysisData.plt || null);
      setTaskData(analysisData.taskData || [{ taskName: "", cycleTime: 0 }]);
    }
  }, [analysisData]);

  // Auto-calculate PCE when VA, BVA, or NVA changes
  useEffect(() => {
    const va = Number(vaTime.replace(",", ".")) || 0;
    const bva = Number(bvaTime.replace(",", ".")) || 0;
    const nva = Number(nvaTime.replace(",", ".")) || 0;
    
    // Skip if all values are zero or empty
    if (va === 0 && bva === 0 && nva === 0) {
      setPce(null);
      return;
    }
    
    // Validate non-negative values
    if (va < 0 || bva < 0 || nva < 0) {
      setPce(null);
      return;
    }
    
    const total = va + bva + nva;
    if (total > 0) {
      const calculatedPCE = (va / total) * 100;
      setPce(calculatedPCE);
    } else {
      setPce(null);
    }
  }, [vaTime, bvaTime, nvaTime]);

  // Auto-calculate Takt Time when inputs change
  useEffect(() => {
    const demand = Number(customerDemand.replace(",", ".")) || 0;
    const workingTime = Number(effectiveWorkingTime.replace(",", ".")) || 0;
    const shifts = Number(numberOfShifts) || 1;
    
    // Skip if essential values are zero
    if (demand === 0 || workingTime === 0) {
      setTaktTime(null);
      return;
    }
    
    // Validate non-negative values
    if (demand < 0 || workingTime < 0 || shifts < 0) {
      setTaktTime(null);
      return;
    }
    
    if (demand > 0 && workingTime > 0) {
      const calculatedTaktTime = (workingTime * shifts) / demand;
      setTaktTime(calculatedTaktTime);
    } else {
      setTaktTime(null);
    }
  }, [customerDemand, effectiveWorkingTime, numberOfShifts]);

  // Auto-calculate PLT when WIP or Takt Time changes
  useEffect(() => {
    const wipValue = Number(wip.replace(",", ".")) || 0;
    
    // Skip if WIP is zero or empty
    if (wipValue === 0) {
      setPlt(null);
      return;
    }
    
    // Validate non-negative WIP
    if (wipValue < 0) {
      setPlt(null);
      return;
    }
    
    if (taktTime && taktTime > 0) {
      const calculatedPLT = wipValue / taktTime;
      setPlt(calculatedPLT);
    } else {
      setPlt(null);
    }
  }, [wip, taktTime]);

  // Add task
  const addTask = () => {
    setTaskData([...taskData, { taskName: "", cycleTime: 0 }]);
  };

  // Remove task
  const removeTask = (index: number) => {
    const updated = taskData.filter((_, i) => i !== index);
    setTaskData(updated.length > 0 ? updated : [{ taskName: "", cycleTime: 0 }]);
  };

  // Update task
  const updateTask = (index: number, field: 'taskName' | 'cycleTime', value: string | number) => {
    const updated = [...taskData];
    updated[index] = { ...updated[index], [field]: value };
    setTaskData(updated);
  };

  // Save handler
  const handleSave = () => {
    const dataToSave: Partial<ValueTimeData> = {
      projectId,
      analysisType: showValueAnalysis ? "value" : "time", // Keep for compatibility
    };

    // Save Process Value Analysis data if selected
    if (showValueAnalysis) {
      const va = Number(vaTime.replace(",", ".")) || 0;
      const bva = Number(bvaTime.replace(",", ".")) || 0;
      const nva = Number(nvaTime.replace(",", ".")) || 0;
      
      // Validate non-negative values for Process Value Analysis
      if (va < 0 || bva < 0 || nva < 0) {
        toast({
          title: "Invalid Input",
          description: "Time values cannot be negative",
          variant: "destructive",
        });
        return;
      }
      
      dataToSave.vaTime = va;
      dataToSave.bvaTime = bva;
      dataToSave.nvaTime = nva;
    } else {
      // Clear value analysis data if not selected
      dataToSave.vaTime = undefined;
      dataToSave.bvaTime = undefined;
      dataToSave.nvaTime = undefined;
    }

    // Save Process Time Analysis data if selected
    if (showTimeAnalysis) {
      const demand = Number(customerDemand.replace(",", ".")) || 0;
      const workingTime = Number(effectiveWorkingTime.replace(",", ".")) || 0;
      const shifts = Number(numberOfShifts) || 1;
      const wipValue = Number(wip.replace(",", ".")) || 0;
      
      // Validate non-negative values for Process Time Analysis
      if (demand < 0 || workingTime < 0 || shifts < 0 || wipValue < 0) {
        toast({
          title: "Invalid Input",
          description: "Values cannot be negative",
          variant: "destructive",
        });
        return;
      }
      
      dataToSave.customerDemand = demand;
      dataToSave.effectiveWorkingTime = workingTime;
      dataToSave.numberOfShifts = shifts;
      dataToSave.wip = wipValue;
      dataToSave.taskData = taskData;
    } else {
      // Clear time analysis data if not selected
      dataToSave.customerDemand = undefined;
      dataToSave.effectiveWorkingTime = undefined;
      dataToSave.numberOfShifts = undefined;
      dataToSave.taktTime = undefined;
      dataToSave.wip = undefined;
      dataToSave.plt = undefined;
      dataToSave.taskData = [];
    }

    saveMutation.mutate(dataToSave);
  };

  // Get PCE benchmark text and color
  const getPCEBenchmark = (pceValue: number) => {
    if (pceValue >= 40) return { text: "Excellent (≥40%)", color: "text-green-600" };
    if (pceValue >= 25) return { text: "Good (25-40%)", color: "text-blue-600" };
    if (pceValue >= 10) return { text: "Average (10-25%)", color: "text-yellow-600" };
    return { text: "Poor (<10%)", color: "text-red-600" };
  };

  // Prepare percent loading chart data
  const percentLoadingChartData = () => {
    if (!taktTime) return null;

    const taskNames = taskData.map(t => t.taskName || "Unnamed");
    const cycleTimes = taskData.map(t => t.cycleTime || 0);
    const percentLoading = cycleTimes.map(ct => (ct / taktTime) * 100);

    return [
      {
        type: 'bar' as const,
        x: taskNames,
        y: percentLoading,
        marker: {
          color: percentLoading.map(p => p > 100 ? '#ef4444' : p > 80 ? '#f59e0b' : '#10b981')
        },
        name: '% Loading',
      },
    ];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value & Time Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Analysis Type Selection */}
          <div>
            <Label>Select Analysis Type (you can select both)</Label>
            <div className="flex gap-6 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="value-analysis"
                  checked={showValueAnalysis}
                  onCheckedChange={(checked) => setShowValueAnalysis(checked === true)}
                  data-testid="checkbox-value-analysis"
                />
                <Label htmlFor="value-analysis" className="cursor-pointer">Process Value Analysis</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="time-analysis"
                  checked={showTimeAnalysis}
                  onCheckedChange={(checked) => setShowTimeAnalysis(checked === true)}
                  data-testid="checkbox-time-analysis"
                />
                <Label htmlFor="time-analysis" className="cursor-pointer">Process Time Analysis</Label>
              </div>
            </div>
          </div>

          {/* Process Value Analysis */}
          {showValueAnalysis && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Process Value Analysis</h3>
              <p className="text-sm text-gray-600">
                Enter time values to calculate Process Cycle Efficiency (PCE) = VA / (VA + BVA + NVA)
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="va-time">VA (Value Added) Time (hours)</Label>
                  <Input
                    id="va-time"
                    type="number"
                    min="0"
                    step="any"
                    value={vaTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || Number(value) >= 0) {
                        setVaTime(value);
                      }
                    }}
                    placeholder="0"
                    data-testid="input-va-time"
                  />
                </div>
                <div>
                  <Label htmlFor="bva-time">BVA (Business Value Added) Time (hours)</Label>
                  <Input
                    id="bva-time"
                    type="number"
                    min="0"
                    step="any"
                    value={bvaTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || Number(value) >= 0) {
                        setBvaTime(value);
                      }
                    }}
                    placeholder="0"
                    data-testid="input-bva-time"
                  />
                </div>
                <div>
                  <Label htmlFor="nva-time">NVA (Non Value Added) Time (hours)</Label>
                  <Input
                    id="nva-time"
                    type="number"
                    min="0"
                    step="any"
                    value={nvaTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || Number(value) >= 0) {
                        setNvaTime(value);
                      }
                    }}
                    placeholder="0"
                    data-testid="input-nva-time"
                  />
                </div>
              </div>

              {pce !== null && (
                <Card className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-blue-700">
                        PCE: {pce.toFixed(2)}%
                      </div>
                      <div className={`text-lg font-semibold ${getPCEBenchmark(pce).color}`}>
                        Benchmark: {getPCEBenchmark(pce).text}
                      </div>
                      <div className="text-sm text-gray-600 mt-4">
                        <p><strong>Benchmark Guidelines:</strong></p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>≥40%: Excellent - World-class process efficiency</li>
                          <li>25-40%: Good - Above average efficiency</li>
                          <li>10-25%: Average - Typical manufacturing process</li>
                          <li>&lt;10%: Poor - Significant improvement needed</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Process Time Analysis */}
          {showTimeAnalysis && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Process Time Analysis</h3>
              
              {/* Takt Time Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Takt Time Calculation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Takt Time = (Effective Working Time × Number of Shifts) / Customer Demand
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="customer-demand">Customer Demand (units)</Label>
                      <Input
                        id="customer-demand"
                        type="text"
                        value={customerDemand}
                        onChange={(e) => setCustomerDemand(e.target.value.replace(",", "."))}
                        placeholder="0"
                        data-testid="input-customer-demand"
                      />
                    </div>
                    <div>
                      <Label htmlFor="working-time">Effective Working Time (hours/shift)</Label>
                      <Input
                        id="working-time"
                        type="text"
                        value={effectiveWorkingTime}
                        onChange={(e) => setEffectiveWorkingTime(e.target.value.replace(",", "."))}
                        placeholder="8"
                        data-testid="input-working-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shifts">Number of Shifts</Label>
                      <Input
                        id="shifts"
                        type="number"
                        value={numberOfShifts}
                        onChange={(e) => setNumberOfShifts(e.target.value)}
                        placeholder="1"
                        data-testid="input-shifts"
                      />
                    </div>
                  </div>

                  {taktTime !== null && (
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-lg font-semibold text-blue-700">
                        Takt Time: {taktTime.toFixed(2)} hours/unit
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PLT Calculation using Little's Law */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Process Lead Time (PLT) - Little's Law</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    PLT = WIP / Takt Time (where WIP = Work In Process)
                  </p>
                  
                  <div>
                    <Label htmlFor="wip">WIP (Work In Process - units)</Label>
                    <Input
                      id="wip"
                      type="text"
                      value={wip}
                      onChange={(e) => setWip(e.target.value.replace(",", "."))}
                      placeholder="0"
                      data-testid="input-wip"
                    />
                  </div>

                  {plt !== null && (
                    <div className="bg-green-50 p-4 rounded-md">
                      <p className="text-lg font-semibold text-green-700">
                        Process Lead Time: {plt.toFixed(2)} hours
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Percent Loading Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Percent Loading Chart</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter individual task cycle times to visualize percent loading vs Takt Time
                  </p>
                  
                  <div className="space-y-3">
                    {taskData.map((task, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label>Task Name</Label>
                          <Input
                            value={task.taskName}
                            onChange={(e) => updateTask(index, 'taskName', e.target.value)}
                            placeholder="Task name"
                            data-testid={`input-task-name-${index}`}
                          />
                        </div>
                        <div className="flex-1">
                          <Label>Cycle Time (hours)</Label>
                          <Input
                            type="text"
                            value={task.cycleTime || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(",", ".");
                              updateTask(index, 'cycleTime', Number(val) || 0);
                            }}
                            placeholder="0"
                            data-testid={`input-task-cycle-${index}`}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeTask(index)}
                          disabled={taskData.length === 1}
                          data-testid={`button-remove-task-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button onClick={addTask} variant="outline" data-testid="button-add-task">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>

                  {taktTime && taskData.some(t => t.cycleTime > 0) && (
                    <div className="mt-6">
                      <Plot
                        data={percentLoadingChartData() || []}
                        layout={{
                          title: { text: 'Percent Loading Chart' },
                          xaxis: { title: { text: 'Task' } },
                          yaxis: { title: { text: '% Loading' } },
                          shapes: [
                            {
                              type: 'line',
                              x0: -0.5,
                              y0: 100,
                              x1: taskData.length - 0.5,
                              y1: 100,
                              line: {
                                color: '#ef4444',
                                width: 2,
                                dash: 'dash',
                              },
                            },
                          ],
                          annotations: [
                            {
                              x: taskData.length - 1,
                              y: 100,
                              xref: 'x',
                              yref: 'y',
                              text: `Takt Time: ${taktTime.toFixed(2)} hours`,
                              showarrow: true,
                              arrowhead: 2,
                              ax: 0,
                              ay: -40,
                            },
                          ],
                          autosize: true,
                        }}
                        config={{ responsive: true }}
                        style={{ width: '100%', height: '400px' }}
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        * Red bars indicate tasks exceeding 100% loading (bottlenecks)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-analysis"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Analysis"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
