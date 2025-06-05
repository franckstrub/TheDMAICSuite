import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import DrawIoProcessMap from '@/components/dmaic/DrawIoProcessMap';
import CtsCharacteristics from '@/components/dmaic/CtsCharacteristics';

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
  
  // Business Requirements state - always include at least one empty row for new entries
  const [businessRequirements, setBusinessRequirements] = useState([
    { requirement: "", businessRequirement: "", importance: 3, ctq: "" },
  ]);
  
  // Reference for tracking if form is initialized
  const businessRequirementsInitialized = useRef<boolean>(false);

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });

  // Fetch CTS characteristics to auto-populate data collection plan
  const { data: ctsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
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
      ctq: "",
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

  // Fetch business requirements
  const { data: businessRequirementsData, isLoading: isBusinessRequirementsLoading, refetch: refetchBusinessRequirements } = useQuery({
    queryKey: [`/api/projects/${projectId}/business-requirements`],
    enabled: !!user?.id && !!projectId,
    retry: 3,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds to ensure latest data
  });
  
  // Fetch data collection plans
  const { data: plans } = useQuery({
    queryKey: [`/api/projects/${projectId}/data-collection-plans`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data: any) => {
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

  // Initial data load effect - triggered on mount and when returning to page
  useEffect(() => {
    console.log("MeasurePhase component mounted - checking for business requirements");
    
    // Check if we have previously saved business requirements in sessionStorage
    const hasBusinessRequirements = sessionStorage.getItem(`project_${projectId}_has_business_requirements`);
    
    if (hasBusinessRequirements === 'true') {
      console.log("Business requirements flag found in sessionStorage, loading from database");
      // Load data directly from database to ensure we have the latest
      loadBusinessRequirementsFromDatabase(true);
    }
  }, [projectId]);
  
  // Add a separate useEffect to process business requirements data when it changes
  useEffect(() => {
    console.log("Business requirements data changed:", businessRequirementsData);
    if (businessRequirementsData?.businessRequirements && businessRequirementsData.businessRequirements.length > 0) {
      // Sort the business requirements data by ID to maintain consistency
      const sortedBusinessRequirements = [...businessRequirementsData.businessRequirements].sort((a, b) => a.id - b.id);
      console.log("Business requirements sorted by ID (ascending order):", sortedBusinessRequirements);
      
      // Map and set to state, preserving the ID for later reference
      const mappedBusinessRequirements = sortedBusinessRequirements.map((r: any) => ({
        businessRequirement: r.businessRequirement || "",
        requirement: r.requirement || "",
        importance: r.importance || 3,
        ctq: r.ctq || "",
        id: r.id,
      }));
      
      // Only initialize once
      if (!businessRequirementsInitialized.current) {
        console.log("Setting business requirements state with mapped data:", mappedBusinessRequirements);
        setBusinessRequirements(mappedBusinessRequirements);
        businessRequirementsInitialized.current = true;
      }
    }
  }, [businessRequirementsData]);
  
  // Function to load business requirements from the database
  const loadBusinessRequirementsFromDatabase = async (silent = false) => {
    try {
      console.log("Explicitly loading business requirements from database");
      const response = await fetch(`/api/projects/${projectId}/business-requirements`);
      const data = await response.json();
      console.log("Loaded business requirements from database:", data);
      
      if (data?.businessRequirements && data.businessRequirements.length > 0) {
        // Map the business requirements data and sort by ID to maintain order
        // Sort by ID in ascending order so the first entered item appears first
        const sortedBusinessRequirements = [...data.businessRequirements].sort((a, b) => a.id - b.id);
        console.log("Business requirements sorted by ID (ascending order):", sortedBusinessRequirements);
        
        const mappedBusinessRequirements = sortedBusinessRequirements.map((r: any) => ({
          requirement: r.requirement || "",
          businessRequirement: r.businessRequirement || "",
          importance: r.importance || 3, 
          ctq: r.ctq || "",
          id: r.id, // Store the ID to help with sorting
        }));
        
        console.log("Setting business requirements state with mapped data:", mappedBusinessRequirements);
        // Set the business requirements state with the mapped data
        setBusinessRequirements(mappedBusinessRequirements);
        
        // Also trigger a query invalidation for React Query
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/business-requirements`] });
        
        if (!silent) {
          toast({
            title: "Data Refreshed",
            description: "Business requirements loaded successfully",
          });
        }
        
        return mappedBusinessRequirements;
      } else {
        // If no business requirements found in the API response, ensure we have at least one empty row
        console.log("No business requirements found in database, setting default empty row");
        const defaultRow = [{ requirement: "", businessRequirement: "", importance: 3, ctq: "" }];
        setBusinessRequirements(defaultRow);
        return defaultRow;
      }
    } catch (error) {
      console.error("Error loading business requirements from database:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Could not load business requirements",
          variant: "destructive",
        });
      }
      
      // Ensure we have at least one empty row even on error
      const defaultRow = [{ requirement: "", businessRequirement: "", importance: 3, ctq: "" }];
      setBusinessRequirements(defaultRow);
      return defaultRow;
    }
  };
  
  // Business Requirements functions
  const updateBusinessRequirement = (index: number, field: string, value: any) => {
    const newBusinessRequirements = [...businessRequirements];
    newBusinessRequirements[index] = { ...newBusinessRequirements[index], [field]: value };
    setBusinessRequirements(newBusinessRequirements);
  };

  const addBusinessRequirement = () => {
    const lastReq = businessRequirements[businessRequirements.length - 1];
    if (lastReq.requirement.trim() !== "" || lastReq.businessRequirement.trim() !== "") {
      setBusinessRequirements([...businessRequirements, { requirement: "", businessRequirement: "", importance: 3, ctq: "" }]);
    }
  };

  const removeBusinessRequirement = (index: number) => {
    // Don't remove if it's the first row or if it's the only row remaining
    if (index === 0 || businessRequirements.length <= 1) {
      return;
    }
    
    const newBusinessRequirements = [...businessRequirements];
    newBusinessRequirements.splice(index, 1);
    
    // If we're about to remove all rows, make sure we keep at least one empty row
    if (newBusinessRequirements.length === 0) {
      newBusinessRequirements.push({ requirement: "", businessRequirement: "", importance: 3, ctq: "" });
    }
    
    setBusinessRequirements(newBusinessRequirements);
  };
  
  // Save business requirements mutation
  const saveBusinessRequirementsMutation = useMutation({
    mutationFn: async (businessRequirements: any[]) => {
      // Filter business requirements where either business requirement or need is filled
      const validBusinessRequirements = businessRequirements.filter(r => 
        r.businessRequirement.trim() !== "" || r.requirement.trim() !== ""
      );
      
      // Always include at least one row even if empty, to ensure we always have a row in the database
      const businessRequirementsToSave = validBusinessRequirements.length > 0 ? 
        validBusinessRequirements : 
        [{ requirement: "", businessRequirement: "", importance: 3, ctq: "" }];
      
      console.log("Saving business requirements:", businessRequirementsToSave);
      
      try {
        // First, get existing business requirements to delete them
        const existingReqs = await fetch(`/api/projects/${projectId}/business-requirements`).then(res => res.json());
        console.log("Existing business requirements before deletion:", existingReqs);
        
        // Delete all existing business requirements
        if (existingReqs && existingReqs.businessRequirements && existingReqs.businessRequirements.length > 0) {
          console.log(`Deleting ${existingReqs.businessRequirements.length} existing business requirements`);
          const deletePromises = existingReqs.businessRequirements.map((req: any) => 
            apiRequest("DELETE", `/api/business-requirements/${req.id}`, { userId: user?.id, projectId })
          );
          await Promise.all(deletePromises);
          console.log("All existing business requirements deleted");
        }
        
        // Now create the new business requirements
        console.log(`Creating ${businessRequirementsToSave.length} new business requirements`);
        const createPromises = businessRequirementsToSave.map((req: any) => 
          apiRequest("POST", `/api/projects/${projectId}/business-requirements`, {
            projectId,
            userId: user?.id,
            requirement: req.requirement || "", // Ensure we don't send undefined values
            businessRequirement: req.businessRequirement || "",
            importance: req.importance || 3,
            ctq: req.ctq || "",
          })
        );
        
        const results = await Promise.all(createPromises);
        console.log("Business requirements saved:", results);
        
        return results;
      } catch (error) {
        console.error("Error in saveBusinessRequirementsMutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business requirements saved successfully",
      });
      
      // Invalidate and refetch to get latest data with IDs
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/business-requirements`] });
      
      // Set flag in session storage
      sessionStorage.setItem(`project_${projectId}_has_business_requirements`, 'true');
    },
    onError: (error) => {
      console.error("Failed to save business requirements:", error);
      toast({
        title: "Error",
        description: "Failed to save business requirements. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleSaveBusinessRequirements = async () => {
    console.log("handleSaveBusinessRequirements called with business requirements:", businessRequirements);
    
    try {
      // Ensure we always have at least one row (even if empty) before saving
      let businessRequirementsToSave = businessRequirements;
      if (businessRequirements.length === 0) {
        businessRequirementsToSave = [{ requirement: "", businessRequirement: "", importance: 3, impact: "" }];
        setBusinessRequirements(businessRequirementsToSave);
      }
      
      // Disable refetching temporarily to prevent race conditions
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/business-requirements`] });
      
      // First retrieve existing business requirements to ensure proper cleanup
      const existingReqsResponse = await fetch(`/api/projects/${projectId}/business-requirements`);
      const existingReqsData = await existingReqsResponse.json();
      console.log("Current business requirements in database before save:", existingReqsData);
      
      // Now proceed with saving
      console.log("Initiating save operation...");
      await saveBusinessRequirementsMutation.mutateAsync(businessRequirementsToSave);
      
      // Force refetch from database to ensure we have the latest data
      console.log("Save complete, now reloading data directly from database");
      await loadBusinessRequirementsFromDatabase(true); // silent load
      
      // Also force a refresh of the query cache
      await refetchBusinessRequirements();
      
      console.log("Business requirements save and reload operation complete");
      
      // Store a flag in sessionStorage to remember that we have business requirements
      // This helps when returning to this component after navigation
      sessionStorage.setItem(`project_${projectId}_has_business_requirements`, 'true');
    } catch (error) {
      console.error("Error in handleSaveBusinessRequirements:", error);
      toast({
        title: "Error",
        description: "Failed to save business requirements. Please try again or contact support.",
        variant: "destructive",
      });
    }
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
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.definePhaseDate}
              endDate={milestoneDates.measurePhaseDate}
              label="Measure Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>
      

      {/* Process and Value Stream Map */}
      <Card>
        <CardHeader>
          <CardTitle>Process and/or Value Stream Map</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Map and Visualize the "AS IS" flow of actions, materials and information required to deliver your product or service.
            You may start with your Define SIPOC.
          </p>
          <DrawIoProcessMap 
            projectId={projectId}
            onSave={(data) => {
              toast({
                title: "Success",
                description: "Process map saved successfully",
              });
            }}
          />
        </CardContent>
      </Card>
      
      {/* CTS Characteristics */}
      <CtsCharacteristics projectId={projectId} />
 
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
      </div>
    </div>
  );
}
