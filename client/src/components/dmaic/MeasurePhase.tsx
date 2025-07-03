import { useState, useEffect, useRef } from "react";

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
import MilestoneTimeline from "./MilestoneTimeline";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Network, CalendarDays } from "lucide-react";
import DrawIoProcessMap from '@/components/dmaic/DrawIoProcessMap';
import CtsCharacteristics from '@/components/dmaic/CtsCharacteristics';
import MsaAnalysis from '@/components/dmaic/MsaAnalysis';
import ProcessCapability from '@/components/dmaic/ProcessCapability';
import MeasureGateReviewValidation from '@/components/dmaic/MeasureGateReviewValidation';

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

  // Fetch customer requirements for auto-population
  const { data: customerRequirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });

  // Fetch business requirements for auto-population
  const { data: businessRequirementsAutoData } = useQuery({
    queryKey: [`/api/projects/${projectId}/business-requirements`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });

  // Load CTQs from centralized endpoint (same as MSA Analysis and Process Capability)
  const { data: ctqsData, isLoading: ctqsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctqs`],
    enabled: !!projectId,
  });
  
  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter && typeof charter === 'object' && 'charter' in charter && charter.charter) {
      const charterData = charter.charter as any;
      setMilestoneDates({
        definePhaseDate: charterData.define_phase_date || null,
        measurePhaseDate: charterData.measure_phase_date || null,
      });
    }
  }, [charter]);

  // Fetch data collection plans
  const { data: plans } = useQuery({
    queryKey: [`/api/projects/${projectId}/data-collection-plans`],
    enabled: !!projectId,
    refetchOnWindowFocus: false
  });

  // Data Collection Plan state
  const [dataCollectionPlans, setDataCollectionPlans] = useState<any[]>([]);

  // Get CTQs from centralized endpoint (same logic as MSA Analysis and Process Capability)
  const getCTQs = () => {
    // Use centralized CTQs endpoint which aggregates from all sources
    if ((ctqsData as any)?.ctqs?.length > 0) {
      return (ctqsData as any).ctqs.map((item: any) => item.ctq);
    }
    
    return [];
  };

  // Initialize data collection plans from existing data or auto-populate from CTQs
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  
  // Scroll progress tracking for data collection plan table
  const [scrollProgress, setScrollProgress] = useState(0);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Handle scroll progress for horizontal table scrolling
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const progress = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * 100 : 0;
    setScrollProgress(progress);
  };
  
  // Reset initialization when project changes
  useEffect(() => {
    setHasInitialized(false);
    setHasLoadedFromServer(false);
    setDataCollectionPlans([]);
  }, [projectId]);

  useEffect(() => {
    // Wait for CTQs and plans data to be loaded
    if (plans !== undefined && ctqsData !== undefined && ctsData !== undefined && !ctqsLoading) {
      console.log('=== Data Collection Plan Initialization ===');
      console.log('Plans data:', plans);
      console.log('CTQs data:', ctqsData);
      console.log('CTS data:', ctsData);
      console.log('Plans length:', plans && typeof plans === 'object' && 'plans' in plans ? (plans as any).plans?.length : 0);
      console.log('CTS characteristics length:', ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData ? (ctsData as any).characteristics?.length : 0);
      
      if (plans && typeof plans === 'object' && 'plans' in plans && (plans as any).plans && (plans as any).plans.length > 0) {
        console.log('Loading existing saved plans:', (plans as any).plans);
        // Load existing saved plans and sync CTQ types from CTS characteristics
        const ctsCharacteristics = (ctsData as any)?.characteristics || [];
        setDataCollectionPlans((plans as any).plans.map((p: any) => {
          // Find the corresponding CTS characteristic to get the latest CTQ type
          const ctsChar = ctsCharacteristics.find((char: any) => char.ctq === p.ctq);
          return {
            id: p.id, // Include the ID for proper updates
            ctq: p.ctq,
            operationalDefinition: p.operationalDefinition,
            dataType: ctsChar?.ctqType || p.dataType, // Use CTQ type from CTS characteristics if available
            pointOfMeasure: p.pointOfMeasure || "Output",
            collectionMethod: p.collectionMethod || "Random",
            collectionMethodComment: p.collectionMethodComment || "",
            sampleSize: p.sampleSize ? p.sampleSize.toString() : "",
            datesTimeFrequency: p.datesTimeFrequency || "",
            measurementSystem: p.measurementSystem || "",
            dataSource: p.dataSource || "",
            responsible: p.responsible,
          };
        }));
        setHasLoadedFromServer(true);
      } else if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData && Array.isArray((ctsData as any).characteristics) && (ctsData as any).characteristics.length > 0) {
        console.log('Auto-populating from CTS characteristics:', (ctsData as any).characteristics);
        // Auto-populate from CTS characteristics with operational definitions
        const autoPopulatedPlans = (ctsData as any).characteristics.map((characteristic: any) => ({
          ctq: characteristic.ctq || "",
          operationalDefinition: characteristic.operationalDefinition || `Specific measurement criteria and procedures for accurately measuring "${characteristic.ctq}"`,
          dataType: characteristic.ctqType || "Continuous", // Use actual CTQ type from characteristics
          pointOfMeasure: "Output", // Default point of measure
          collectionMethod: "Random", // Default collection method
          collectionMethodComment: "",
          sampleSize: "",
          datesTimeFrequency: "",
          measurementSystem: "",
          dataSource: "",
          responsible: ""
        }));
        console.log('Setting auto-populated plans from CTS:', autoPopulatedPlans);
        setDataCollectionPlans(autoPopulatedPlans);
        setHasLoadedFromServer(false); // Reset flag to allow future updates
      } else {
        // Auto-populate from centralized CTQs endpoint (same as MSA Analysis and Process Capability)
        const ctqs = getCTQs();
        console.log('CTQs from getCTQs():', ctqs);
        
        if (ctqs.length > 0) {
          console.log('Auto-populating from centralized CTQs:', ctqs);
          // Get CTQ types from centralized data
          const ctqsWithTypes = (ctqsData as any)?.ctqs || [];
          const autoPopulatedPlans = ctqs.map((ctq: string) => {
            // Find the CTQ in the centralized data to get its type
            const ctqData = ctqsWithTypes.find((item: any) => item.ctq === ctq);
            return {
              ctq: ctq,
              operationalDefinition: `Specific measurement criteria and procedures for accurately measuring "${ctq}"`,
              dataType: ctqData?.ctqType || "Continuous", // Use actual CTQ type from centralized data
              pointOfMeasure: "Output", // Default point of measure
              collectionMethod: "Random", // Default collection method
              collectionMethodComment: "",
              sampleSize: "",
              datesTimeFrequency: "",
              measurementSystem: "",
              dataSource: "",
              responsible: ""
            };
          });
          console.log('Setting auto-populated plans:', autoPopulatedPlans);
          setDataCollectionPlans(autoPopulatedPlans);
          setHasLoadedFromServer(false); // Reset flag to allow future updates
        } else {
          console.log('No CTQs available from centralized endpoint for auto-population');
          console.log('CTQs data structure:', ctqsData);
          console.log('Setting empty data collection plans array');
          setDataCollectionPlans([]);
        }
      }
      
      if (!hasInitialized) {
        setHasInitialized(true);
        console.log('=== Data Collection Plan Initialization Complete ===');
      }
    }
  }, [plans, ctqsData, ctqsLoading, ctsData]);



  // Process Capability Analysis state
  {/*
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
*/}
  // Fetch business requirements
  const { isLoading: isBusinessRequirementsLoading, refetch: refetchBusinessRequirements } = useQuery({
    queryKey: [`/api/projects/${projectId}/business-requirements`],
    enabled: !!user?.id && !!projectId,
    retry: 3,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refetch every 10 seconds to ensure latest data
  });

  // Save data collection plan mutation
  const savePlansMutation = useMutation({
    mutationFn: async (plansToSave: any[]) => {
      const validPlans = plansToSave.filter(p => p.ctq.trim() !== "");
      
      // Get current server plans to compare using the existing data
      const currentServerPlans = (plans && typeof plans === 'object' && 'plans' in plans) ? (plans as any).plans || [] : [];
      const currentServerIds = currentServerPlans.map((p: any) => p.id);
      
      const promises = validPlans.map((p, index) => {
        const payload = {
          projectId,
          ctq: p.ctq,
          operationalDefinition: p.operationalDefinition,
          dataType: p.dataType,
          pointOfMeasure: p.pointOfMeasure,
          collectionMethod: p.collectionMethod,
          collectionMethodComment: p.collectionMethodComment,
          sampleSize: p.sampleSize && p.sampleSize !== '' ? parseInt(p.sampleSize) : null,
          datesTimeFrequency: p.datesTimeFrequency,
          measurementSystem: p.measurementSystem,
          dataSource: p.dataSource,
          responsible: p.responsible,
          displayOrder: index,
          userId: user?.id,
        };
        
        // If plan has an ID and it exists on server, update it
        if (p.id && currentServerIds.includes(p.id)) {
          return apiRequest("PUT", `/api/data-collection-plans/${p.id}`, payload);
        } else {
          // Otherwise create a new plan
          return apiRequest("POST", `/api/projects/${projectId}/data-collection-plans`, payload);
        }
      });
      
      // Delete any server plans that are no longer in the local plans
      const localPlanIds = validPlans.filter(p => p.id).map(p => p.id);
      const plansToDelete = currentServerIds.filter((id: any) => !localPlanIds.includes(id));
      
      const deletePromises = plansToDelete.map((id: any) => 
        apiRequest("DELETE", `/api/data-collection-plans/${id}`)
      );
      
      return Promise.all([...promises, ...deletePromises]);
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
    setDataCollectionPlans(currentPlans => {
      const newPlans = [...currentPlans];
      newPlans[index] = { ...newPlans[index], [field]: value };
      return newPlans;
    });
  };

  const addPlan = () => {
    setDataCollectionPlans([
      ...dataCollectionPlans,
      {
        ctq: "",
        operationalDefinition: "",
        dataType: "Continuous",
        pointOfMeasure: "Output",
        collectionMethod: "Random",
        collectionMethodComment: "",
        sampleSize: "",
        datesTimeFrequency: "",
        measurementSystem: "",
        dataSource: "",
        responsible: ""
      }
    ]);
  };

  const removePlan = (index: number) => {
    const newPlans = [...dataCollectionPlans];
    newPlans.splice(index, 1);
    
    // If all plans are removed, ensure we keep at least one empty plan
    if (newPlans.length === 0) {
      newPlans.push({
        ctq: "",
        operationalDefinition: "",
        dataType: "Continuous",
        pointOfMeasure: "Output",
        collectionMethod: "Random",
        collectionMethodComment: "",
        sampleSize: "",
        datesTimeFrequency: "",
        measurementSystem: "",
        dataSource: "",
        responsible: ""
      });
    }
    
    setDataCollectionPlans(newPlans);
  };

  const handleSavePlans = () => {
    // Ensure we always have at least one plan to save, even if empty
    let plansToSave = dataCollectionPlans;
    if (dataCollectionPlans.length === 0) {
      plansToSave = [{
        ctq: "",
        operationalDefinition: "",
        dataType: "Continuous",
        pointOfMeasure: "Output",
        collectionMethod: "Random",
        collectionMethodComment: "",
        sampleSize: "",
        datesTimeFrequency: "",
        measurementSystem: "",
        dataSource: "",
        responsible: ""
      }];
      setDataCollectionPlans(plansToSave);
    }
    
    savePlansMutation.mutate(plansToSave);
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
    console.log("Business requirements data changed:", businessRequirementsAutoData);
    if (businessRequirementsAutoData && typeof businessRequirementsAutoData === 'object' && 'businessRequirements' in businessRequirementsAutoData && Array.isArray((businessRequirementsAutoData as any).businessRequirements) && (businessRequirementsAutoData as any).businessRequirements.length > 0) {
      // Sort the business requirements data by ID to maintain consistency
      const sortedBusinessRequirements = [...(businessRequirementsAutoData as any).businessRequirements].sort((a: any, b: any) => a.id - b.id);
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
  }, [businessRequirementsAutoData]);
  
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
        businessRequirementsToSave = [{ requirement: "", businessRequirement: "", importance: 3, ctq: "" }];
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
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Process and/or Value Stream Map</CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Data Collection Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Define what data needs to be collected (CTQs/Variables), how it will be collected, which sample size is needed, when will it be collected and who is responsible.
          </p>
          
          <div className="relative">
            {/* Scroll indicator */}
            <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
              ← Scroll horizontally →
            </div>
            {/* Scroll progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b z-10">
              <div 
                className="h-full bg-blue-500 rounded-b transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            <div 
              ref={tableScrollRef}
              className="overflow-x-auto cursor-grab active:cursor-grabbing border rounded-lg"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#CBD5E0 #F7FAFC'
              }}
              onScroll={handleTableScroll}
            >
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1660px' }}>
              <thead>
                <tr>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">CTQ/Variable</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operational Definition</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Point of Measure</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Method (Sampling)</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Size</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates/Time/Frequency</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Measurement System</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Source</th>
                  <th className="px-1 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible</th>
                  <th className="px-0 pt-6 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action&nbsp;</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dataCollectionPlans.length === 0 ? (
                  <tr>
                    <td className="px-1 py-8 text-center text-gray-500 sticky left-0 bg-white z-10 border-r">
                      No CTQs/Variables
                    </td>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      Click "Add CTQ/Variable" to get started.
                    </td>
                  </tr>
                ) : (
                  dataCollectionPlans.map((plan, index) => (
                    <tr key={index}>
                      <td className="px-1 py-2 sticky left-0 bg-white z-10 border-r">
                        <Textarea
                          value={plan.ctq}
                          onChange={(e) => updatePlan(index, "ctq", e.target.value)}
                          className="w-full min-w-[100px] max-w-[135px] min-h-[60px] bg-white"
                          placeholder="Enter CTQ/Variable name"
                        />
                      </td>
                      <td className="px-1 py-2 min-w-[260px] min-h-[60-px]">
                        <Textarea
                          value={plan.operationalDefinition}
                          onChange={(e) => updatePlan(index, "operationalDefinition", e.target.value)}
                          className="w-full min-w-[260px] min-h-[60px]"
                          placeholder="Enter CTQ/Variable Operational Definition"
                        />
                      </td>
                      <td className="px-1 py-2 min-w-[104px]">
                        <select
                          className="w-full p-2 border border-gray-300 rounded-md text-[11px]"
                          value={plan.dataType}
                          onChange={(e) => updatePlan(index, "dataType", e.target.value)}
                        >
                          <option>Continuous</option>
                          <option>Attribute</option>
                        </select>
                      </td>
                      <td className="px-1 py-2">
                        <select
                          className="p-2 border border-gray-300 rounded-md text-[11px]"
                          value={plan.pointOfMeasure}
                          onChange={(e) => updatePlan(index, "pointOfMeasure", e.target.value)}
                        >
                          <option value="Input">Input</option>
                          <option value="Process">Process</option>
                          <option value="Output">Output</option>
                        </select>
                      </td>
                      <td className="px-1 py-2">
                        <div className="space-y-2">
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md text-[11px]"
                            value={plan.collectionMethod}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              updatePlan(index, "collectionMethod", newValue);
                              // Clear comment if method is not "Other"
                              if (newValue !== "Other") {
                                updatePlan(index, "collectionMethodComment", "");
                              }
                            }}
                          >
                            <option value="Random">Random</option>
                            <option value="Stratified">Stratified</option>
                            <option value="Systematic">Systematic</option>
                            <option value="Subgrouping">Subgrouping</option>
                            <option value="100% inspection">100% inspection</option>
                            <option value="Other">Other</option>
                          </select>
                          {plan.collectionMethod === "Other" && (
                            <Input
                              type="text"
                              placeholder="Please specify other collection method"
                              value={plan.collectionMethodComment}
                              onChange={(e) => updatePlan(index, "collectionMethodComment", e.target.value)}
                              className="text-[11px]"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter Sample size to collect"
                          value={plan.sampleSize}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow non-negative integers or empty string
                            if (value === '') {
                              updatePlan(index, "sampleSize", '');
                            } else {
                              const numValue = parseInt(value);
                              if (numValue >= 0 && !isNaN(numValue)) {
                                updatePlan(index, "sampleSize", value);
                              }
                            }
                          }}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Textarea
                          placeholder="Enter dates of collection, time, frequency, etc."
                          className="w-full min-w-[100px] min-h-[60px]"
                          value={plan.datesTimeFrequency}
                          onChange={(e) => updatePlan(index, "datesTimeFrequency", e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Textarea
                          className="w-full min-w-[100px] min-h-[60px]"
                          placeholder="Enter measurement system"
                          value={plan.measurementSystem}
                          onChange={(e) => updatePlan(index, "measurementSystem", e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Textarea
                          className="w-full min-w-[100px] min-h-[60px]"
                          placeholder="Enter data source"
                          value={plan.dataSource}
                          onChange={(e) => updatePlan(index, "dataSource", e.target.value)}
                        />
                      </td>
                      <td className="px-1 py-2">
                        <Input
                          type="text"
                          placeholder="Enter Responsible"
                          value={plan.responsible}
                          onChange={(e) => updatePlan(index, "responsible", e.target.value)}
                        />
                      </td>
                      <td className="px-0 py-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => removePlan(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
          <p>• CTQs and Operational definitions are automatically populated from CTS characteristics defined above</p>
          <p>• You can add additional CTQs/Variables manually or edit existing ones including operational definitions and data types</p>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <Button variant="outline" onClick={addPlan} className="hover:bg-gray-100 text-black">
              <PlusCircle className="h-4 w-4" />
              <span>Add CTQ/Variable</span>
            </Button>
          {/* </div>
          
          <div className="mt-4"> */}
            <Button 
              onClick={handleSavePlans}
              disabled={savePlansMutation.isPending}
            >
              {savePlansMutation.isPending ? "Saving..." : "Save Data Collection Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Information message for White Belt and Yellow Belt projects */}
      {(charter?.charter?.projectType === 'White Belt' || charter?.charter?.projectType === 'Yellow Belt') && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  {charter?.charter?.projectType} Project Information
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  For {charter?.charter?.projectType} projects, <strong>MSA (Measurement System Analysis)</strong> and <strong>Process Capability</strong> studies are optional. 
                  You may choose to skip these sections or complete them based on your project's specific requirements and complexity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* MSA (Measurement System Analysis) - One tab per CTQ */}
      <MsaAnalysis projectId={projectId} />
      
      {/* Process Capability - One tab per CTQ */}
      <ProcessCapability projectId={projectId} />

      {/* Measure Gate Review and Validation - One per project */}
      <MeasureGateReviewValidation projectId={projectId} />
      
    </div>
  );
}
