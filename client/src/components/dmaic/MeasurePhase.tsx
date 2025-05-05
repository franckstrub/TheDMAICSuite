import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateCp, calculateCpk } from "@/lib/statisticsUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import MilestoneTimeline from "./MilestoneTimeline";

export default function MeasurePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    definePhaseDate: null as string | null,
    measurePhaseDate: null as string | null,
  });

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });
  
  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter?.charter) {
      setMilestoneDates({
        definePhaseDate: charter.charter.define_phase_date || null,
        measurePhaseDate: charter.charter.measure_phase_date || null,
      });
    }
  }, [charter]);

  // Data Collection Plan state
  const [dataCollectionPlans, setDataCollectionPlans] = useState([
    {
      metric: "Processing Time",
      operationalDefinition: "Time from order receipt to shipment",
      dataType: "Continuous",
      collectionMethod: "System extraction",
      sampleSize: "100 orders",
      responsible: "John Doe"
    },
    {
      metric: "Defect Rate",
      operationalDefinition: "% of orders with errors",
      dataType: "Attribute",
      collectionMethod: "Manual inspection",
      sampleSize: "50 orders",
      responsible: "Jane Smith"
    },
    {
      metric: "",
      operationalDefinition: "",
      dataType: "Discrete",
      collectionMethod: "",
      sampleSize: "",
      responsible: ""
    }
  ]);

  // Process Capability Analysis state
  const [selectedMetric, setSelectedMetric] = useState("Processing Time");
  const [lsl, setLsl] = useState(0);
  const [usl, setUsl] = useState(10);
  
  // Sample histogram data
  const histogramData = [
    { value: 1, count: 2 },
    { value: 2, count: 5 },
    { value: 3, count: 8 },
    { value: 4, count: 15 },
    { value: 5, count: 22 },
    { value: 6, count: 18 },
    { value: 7, count: 9 },
    { value: 8, count: 5 },
    { value: 9, count: 3 },
  ];

  // Sample data for CP and CPK
  const processData = histogramData.flatMap(d => Array(d.count).fill(d.value));
  const cp = calculateCp(processData, lsl, usl);
  const cpk = calculateCpk(processData, lsl, usl);

  // Measurement System Analysis state
  const [msaMetric, setMsaMetric] = useState("Defect Rate");
  const [numAppraisers, setNumAppraisers] = useState(3);
  const [numParts, setNumParts] = useState(10);
  const [numTrials, setNumTrials] = useState(2);
  const [analysisType, setAnalysisType] = useState("Attribute Data (Kappa)");

  // Fetch data collection plans
  const { data: plans } = useQuery({
    queryKey: [`/api/projects/${projectId}/data-collection-plans`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.plans && data.plans.length > 0) {
        setDataCollectionPlans(data.plans.map((p: any) => ({
          metric: p.metric,
          operationalDefinition: p.operationalDefinition,
          dataType: p.dataType,
          collectionMethod: p.collectionMethod,
          sampleSize: p.sampleSize,
          responsible: p.responsible,
        })));
      }
    },
  });

  // Save data collection plan mutation
  const savePlansMutation = useMutation({
    mutationFn: async (plans: any[]) => {
      const validPlans = plans.filter(p => p.metric.trim() !== "");
      
      // For simplicity, just create/update each plan
      const promises = validPlans.map(p => {
        const payload = {
          projectId,
          metric: p.metric,
          operationalDefinition: p.operationalDefinition,
          dataType: p.dataType,
          collectionMethod: p.collectionMethod,
          sampleSize: p.sampleSize,
          responsible: p.responsible,
          userId: user?.id,
        };
        
        return apiRequest("POST", `/api/projects/${projectId}/data-collection-plans`, payload);
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data collection plan saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/data-collection-plans`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save data collection plan: ${error}`,
        variant: "destructive",
      });
    },
  });

  const updatePlan = (index: number, field: string, value: any) => {
    const newPlans = [...dataCollectionPlans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setDataCollectionPlans(newPlans);
  };

  const addPlan = () => {
    if (dataCollectionPlans[dataCollectionPlans.length - 1].metric.trim() !== "") {
      setDataCollectionPlans([
        ...dataCollectionPlans,
        {
          metric: "",
          operationalDefinition: "",
          dataType: "Discrete",
          collectionMethod: "",
          sampleSize: "",
          responsible: ""
        }
      ]);
    }
  };

  const removePlan = (index: number) => {
    const newPlans = [...dataCollectionPlans];
    newPlans.splice(index, 1);
    setDataCollectionPlans(newPlans);
  };

  const handleSavePlans = () => {
    savePlansMutation.mutate(dataCollectionPlans);
  };

  const handleRunMSA = () => {
    toast({
      title: "MSA Analysis",
      description: "MSA analysis has been run successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <Card className="mb-4 max-w-2xl ml-0">
        <CardContent className="pt-6">
          <MilestoneTimeline 
            startDate={milestoneDates.definePhaseDate}
            endDate={milestoneDates.measurePhaseDate}
            label="Measure Phase Milestone"
          />
        </CardContent>
      </Card>
      
      {/* Data Collection Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Data Collection Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Define what data needs to be collected, how it will be collected, and who is responsible.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operational Definition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataCollectionPlans.map((plan, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={plan.metric}
                        onChange={(e) => updatePlan(index, "metric", e.target.value)}
                        placeholder={index === dataCollectionPlans.length - 1 ? "Add new metric..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={plan.operationalDefinition}
                        onChange={(e) => updatePlan(index, "operationalDefinition", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={plan.dataType}
                        onChange={(e) => updatePlan(index, "dataType", e.target.value)}
                      >
                        <option>Discrete</option>
                        <option>Continuous</option>
                        <option>Attribute</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={plan.collectionMethod}
                        onChange={(e) => updatePlan(index, "collectionMethod", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={plan.sampleSize}
                        onChange={(e) => updatePlan(index, "sampleSize", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={plan.responsible}
                        onChange={(e) => updatePlan(index, "responsible", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {index === dataCollectionPlans.length - 1 && plan.metric ? (
                        <Button variant="ghost" size="sm" onClick={addPlan}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === dataCollectionPlans.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removePlan(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSavePlans}
              disabled={savePlansMutation.isPending || dataCollectionPlans.every(p => !p.metric)}
            >
              {savePlansMutation.isPending ? "Saving..." : "Save Data Collection Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Process Capability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Process Capability Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Assess how well a process meets customer specifications.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="metric">Select Metric</Label>
                <Select defaultValue={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger id="metric">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processing Time">Processing Time</SelectItem>
                    <SelectItem value="Defect Rate">Defect Rate</SelectItem>
                    <SelectItem value="Customer Wait Time">Customer Wait Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lsl">Lower Specification Limit</Label>
                  <Input
                    id="lsl"
                    type="number"
                    placeholder="0"
                    value={lsl}
                    onChange={(e) => setLsl(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="usl">Upper Specification Limit</Label>
                  <Input
                    id="usl"
                    type="number"
                    placeholder="10"
                    value={usl}
                    onChange={(e) => setUsl(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="h-64 border border-gray-200 rounded-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="value" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Frequency" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">Cp Index</p>
                  <p className="text-xl font-semibold">{cp ? cp.toFixed(2) : "N/A"}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">Cpk Index</p>
                  <p className="text-xl font-semibold">{cpk ? cpk.toFixed(2) : "N/A"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Measurement System Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Measurement System Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Evaluate the measurement system's ability to provide accurate data.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="msa-metric">Select Metric</Label>
                <Select defaultValue={msaMetric} onValueChange={setMsaMetric}>
                  <SelectTrigger id="msa-metric">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processing Time">Processing Time</SelectItem>
                    <SelectItem value="Defect Rate">Defect Rate</SelectItem>
                    <SelectItem value="Customer Wait Time">Customer Wait Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="appraisers">Number of Appraisers</Label>
                  <Input
                    id="appraisers"
                    type="number"
                    value={numAppraisers}
                    onChange={(e) => setNumAppraisers(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="parts">Number of Parts</Label>
                  <Input
                    id="parts"
                    type="number"
                    value={numParts}
                    onChange={(e) => setNumParts(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trials">Number of Trials</Label>
                  <Input
                    id="trials"
                    type="number"
                    value={numTrials}
                    onChange={(e) => setNumTrials(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="analysis-type">Analysis Type</Label>
                  <Select defaultValue={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger id="analysis-type">
                      <SelectValue placeholder="Select analysis type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Continuous Data (Gage R&R)">Continuous Data (Gage R&R)</SelectItem>
                      <SelectItem value="Attribute Data (Kappa)">Attribute Data (Kappa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-700">% R&R</p>
                  <p className="text-xl font-semibold">18.2%</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">Kappa Value</p>
                  <p className="text-xl font-semibold">0.75</p>
                </div>
              </div>
              <Button className="w-full" onClick={handleRunMSA}>
                Run MSA Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Value Stream Map */}
      <Card>
        <CardHeader>
          <CardTitle>Value Stream Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Visualize the flow of materials and information required to deliver a product or service.
          </p>
          
          <div className="flex justify-between mb-4">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <i className="fas fa-mouse-pointer mr-1"></i> Select
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-square mr-1"></i> Process
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-arrow-right mr-1"></i> Flow
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-exclamation-triangle mr-1"></i> Waste
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <i className="fas fa-download mr-1"></i> Export
            </Button>
          </div>
          
          <div className="border border-gray-200 rounded-md bg-gray-50 h-96 flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-project-diagram text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">Value Stream Map Canvas</p>
              <p className="text-gray-400 text-xs mt-2">Drag and drop elements to create your map</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Button>
              Save Value Stream Map
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
