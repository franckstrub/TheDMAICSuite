import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Image, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StakeholderManagement from "@/components/stakeholders/StakeholderManagement";
import TeamMemberManagement from "@/components/team/TeamMemberManagement";
import { Stakeholder, TeamMember } from "@shared/schema";

export default function DefinePhase() {
  const { user, currentProject, currency } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for project image handling
  const [projectImage, setProjectImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // State for stakeholders management
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  
  // State for team members management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);

  // Project Charter form
  const charterForm = useForm({
    defaultValues: {
      projectTitle: "",
      projectLeader: "",
      sponsor: "",
      sponsorFunction: "",
      stakeholder: "",
      stakeholderFunction: "",
      financialController: "",
      projectCoach: "",
      beltLevel: "Green Belt", 
      coachBeltLevel: "Master Black Belt",
      projectType: "Green Belt",
      projectCategory: "Process Improvement",
      businessCase: "",
      problemStatement: "",
      goals: "",
      scope: "",
      startDate: "",
      targetEndDate: "",
      savingsPerYear: "",
      workingCapitalGains: "",
      waccPercentage: "10",
      financialSavings: "",
      fteBenefits: "",
      totalFinancialSavings: "",
      softBenefits: "",
      // Project cost fields
      oneOffPeopleCost: "",
      oneOffTechnologyCost: "",
      oneOffOtherCost: "",
      oneOffOtherExplanation: "",
      capexCost: "",
      capexExplanation: "",
      // Summary financial fields
      totalProjectCosts: "",
      projectNetValue: "",
      // Financial metrics
      roi: "",
      breakeven: "",
    },
  });

  // SIPOC form
  const sipocForm = useForm({
    defaultValues: {
      suppliers: "",
      inputs: "",
      process: "",
      outputs: "",
      customers: "",
    },
  });

  // Customer Requirements state
  const [requirements, setRequirements] = useState([
    { requirement: "Fast delivery", importance: 4, satisfaction: 2 },
    { requirement: "Order accuracy", importance: 5, satisfaction: 3 },
    { requirement: "", importance: 3, satisfaction: 3 },
  ]);
  
  // FTE calculation state
  const [fteParams, setFteParams] = useState({
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    timeUnit: "day",
    savedHours: 0,
    fteCostPerYear: 100000,
    calculatedFte: 0,
    calculatedValue: 0
  });

  // Function to calculate FTE and its value
  const calculateFte = () => {
    const { workingDaysPerWeek, workingHoursPerDay, timeUnit, savedHours, fteCostPerYear } = fteParams;
    // 52 weeks in a year, so multiply days/week by 52 to get annual working days
    const workingDaysPerYear = workingDaysPerWeek * 52;
    const totalAnnualHours = workingDaysPerYear * workingHoursPerDay;
    
    let annualSavedHours = 0;
    
    // Convert saved hours to annual basis
    if (timeUnit === "day") {
      annualSavedHours = savedHours * workingDaysPerYear;
    } else if (timeUnit === "week") {
      annualSavedHours = savedHours * 52; // 52 weeks in a year
    } else if (timeUnit === "month") {
      annualSavedHours = savedHours * 12; // 12 months in a year
    }
    
    // Calculate FTE and monetary value
    const calculatedFte = annualSavedHours / totalAnnualHours;
    const calculatedValue = calculatedFte * fteCostPerYear;
    
    setFteParams({
      ...fteParams,
      calculatedFte: parseFloat(calculatedFte.toFixed(2)),
      calculatedValue: parseFloat(calculatedValue.toFixed(2))
    });
    
    // Set the hidden input value for form submission
    const formattedValue = formatCurrency(calculatedValue, currency);
    const fteString = `${calculatedFte.toFixed(2)} FTE (${formattedValue})`;
    document.getElementById("fteBenefits")?.setAttribute("value", fteString);
  };

  // Function to handle FTE parameter changes with automatic calculation
  const handleFteParamChange = (param: string, value: number | string) => {
    // First, ensure the value is properly converted
    const convertedValue = typeof value === 'string' ? 
      (param === 'timeUnit' ? value : parseFloat(value) || 0) : 
      parseFloat(value.toString()) || 0;
    
    // Update the state with the new parameter
    const newParams = {
      ...fteParams,
      [param]: convertedValue
    };
    
    // Immediately calculate the FTE values
    const { workingDaysPerWeek, workingHoursPerDay, timeUnit, savedHours, fteCostPerYear } = newParams;
    // 52 weeks in a year, so multiply days/week by 52 to get annual working days
    const workingDaysPerYear = workingDaysPerWeek * 52;
    const totalAnnualHours = workingDaysPerYear * workingHoursPerDay;
    
    let annualSavedHours = 0;
    
    // Convert saved hours to annual basis
    if (timeUnit === "day") {
      annualSavedHours = savedHours * workingDaysPerYear;
    } else if (timeUnit === "week") {
      annualSavedHours = savedHours * 52; // 52 weeks in a year
    } else if (timeUnit === "month") {
      annualSavedHours = savedHours * 12; // 12 months in a year
    }
    
    // Calculate FTE and monetary value
    const calculatedFte = annualSavedHours / totalAnnualHours;
    const calculatedValue = calculatedFte * fteCostPerYear;
    
    // Format the values
    const formattedFte = parseFloat(calculatedFte.toFixed(2));
    const formattedValue = parseFloat(calculatedValue.toFixed(2));
    
    // Update the FTE params state with calculated values
    setFteParams({
      ...newParams,
      calculatedFte: formattedFte,
      calculatedValue: formattedValue
    });
    
    // Set the hidden input value for form submission
    const formattedCurrency = formatCurrency(formattedValue, currency);
    const fteString = `${formattedFte.toFixed(2)} FTE (${formattedCurrency})`;
    
    // Update both the DOM element and the form value in React Hook Form
    document.getElementById("fteBenefits")?.setAttribute("value", fteString);
    charterForm.setValue("fteBenefits", fteString);
    
    // Now update all financial calculations with the new FTE value
    updateTotalFinancialSavings(formattedValue);
    
    // Log for debugging
    console.log("FTE updated:", { 
      param,
      newValue: convertedValue,
      calculatedFte: formattedFte, 
      calculatedValue: formattedValue,
      fteString
    });
  };

  // Fetch project charter if exists
  const { data: charter, isError: charterError } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsImageLoading(true);
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setProjectImage(e.target.result);
          setIsImageLoading(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load the image",
          variant: "destructive",
        });
        setIsImageLoading(false);
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Trigger file input click
  const handleChooseImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Remove current image
  const handleRemoveImage = () => {
    setProjectImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Set charter form values when data is fetched
  useEffect(() => {
    // If we have a charter, use it
    if (charter?.charter) {
      // Load project image if available
      if (charter.charter.projectImage) {
        setProjectImage(charter.charter.projectImage);
      }
      
      // Load stakeholders if available
      if (charter.charter.stakeholders) {
        try {
          const stakeholdersData = Array.isArray(charter.charter.stakeholders) 
            ? charter.charter.stakeholders 
            : JSON.parse(charter.charter.stakeholders as string);
          
          setStakeholders(stakeholdersData);
          console.log("Loaded stakeholders:", stakeholdersData);
        } catch (e) {
          console.error("Error parsing stakeholders:", e);
          setStakeholders([]);
        }
      } else if (charter.charter.stakeholder) {
        // Convert legacy single stakeholder to array format if available
        const stakeholder = charter.charter.stakeholder;
        const stakeholderFunction = charter.charter.stakeholderFunction || "";
        
        if (stakeholder) {
          setStakeholders([{ 
            name: stakeholder, 
            function: stakeholderFunction 
          }]);
          console.log("Converted legacy stakeholder to new format");
        }
      }
      
      // Load team members if available
      if (charter.charter.teamMembers) {
        try {
          const teamMembersData = Array.isArray(charter.charter.teamMembers) 
            ? charter.charter.teamMembers 
            : JSON.parse(charter.charter.teamMembers as string);
          
          setTeamMembers(teamMembersData);
          console.log("Loaded team members:", teamMembersData);
        } catch (e) {
          console.error("Error parsing team members:", e);
          setTeamMembers([]);
        }
      }
      
      // First load the FTE parameters so we can use them in the calculation
      let fteBenefitsValue = 0;
      
      try {
        // First, try to load stored FTE parameters
        if (charter.charter.fteWorkingDaysPerYear && 
            charter.charter.fteWorkingHoursPerDay && 
            charter.charter.fteSavedHours && 
            charter.charter.fteCostPerYear) {
          // Use the stored FTE parameters
          const storedWorkingDaysPerYear = parseFloat(charter.charter.fteWorkingDaysPerYear);
          // Convert from days/year to days/week (assuming 52 weeks in a year)
          const workingDaysPerWeek = storedWorkingDaysPerYear / 52;
          const workingHoursPerDay = parseFloat(charter.charter.fteWorkingHoursPerDay);
          const timeUnit = charter.charter.fteTimeUnit || "day";
          const savedHours = parseFloat(charter.charter.fteSavedHours);
          const fteCostPerYear = parseFloat(charter.charter.fteCostPerYear);
          const calculatedValue = parseFloat(charter.charter.fteCalculatedValue || "0");
          fteBenefitsValue = calculatedValue;
          
          // Calculate FTE from these parameters (using the original workingDaysPerYear for compatibility)
          const workingDaysPerYear = workingDaysPerWeek * 52;
          const totalAnnualHours = workingDaysPerYear * workingHoursPerDay;
          let annualSavedHours = 0;
          
          // Convert saved hours to annual basis
          if (timeUnit === "day") {
            annualSavedHours = savedHours * workingDaysPerYear;
          } else if (timeUnit === "week") {
            annualSavedHours = savedHours * 52; // 52 weeks in a year
          } else if (timeUnit === "month") {
            annualSavedHours = savedHours * 12; // 12 months in a year
          }
          
          // Calculate FTE
          const calculatedFte = annualSavedHours / totalAnnualHours;
          
          // Update FTE parameters with the new workingDaysPerWeek parameter
          setFteParams({
            workingDaysPerWeek, 
            workingHoursPerDay, 
            timeUnit, 
            savedHours, 
            fteCostPerYear,
            calculatedFte: parseFloat(calculatedFte.toFixed(2)),
            calculatedValue: calculatedValue
          });
          
          console.log("Loaded FTE parameters from database:", {
            workingDaysPerYear,
            workingDaysPerWeek, 
            workingHoursPerDay, 
            timeUnit, 
            savedHours, 
            fteCostPerYear,
            calculatedFte: parseFloat(calculatedFte.toFixed(2)),
            calculatedValue,
            fteBenefitsValue
          });
        } 
        // Fallback: if we don't have the parameters but have the FTE string
        else if (charter.charter.fteBenefits) {
          // Extract numeric value from a string like "0.80 FTE ($111,200)"
          const fteMatch = charter.charter.fteBenefits.match(/(\d+\.\d+)\s+FTE/);
          if (fteMatch && fteMatch[1]) {
            const fteValue = parseFloat(fteMatch[1]);
            const fteCostPerYear = 100000; // Default value
            fteBenefitsValue = fteValue * fteCostPerYear;
            
            setFteParams(prev => ({
              ...prev,
              calculatedFte: fteValue,
              calculatedValue: fteBenefitsValue
            }));
            console.log("Fallback: Parsed FTE value from string:", fteValue, "calculated value:", fteBenefitsValue);
          }
        }
      } catch (e) {
        console.error("Error loading FTE parameters:", e);
      }
      
      // Now reset the form with the loaded values
      charterForm.reset({
        projectTitle: currentProject?.title || "",
        projectLeader: charter.charter.projectLeader || "",
        sponsor: charter.charter.sponsor || "",
        sponsorFunction: charter.charter.sponsorFunction || "",
        stakeholder: charter.charter.stakeholder || "",
        stakeholderFunction: charter.charter.stakeholderFunction || "",
        financialController: charter.charter.financialController || "",
        projectCoach: charter.charter.projectCoach || "",
        beltLevel: charter.charter.beltLevel || "Black Belt",
        coachBeltLevel: charter.charter.coachBeltLevel || "Master Black Belt",
        projectType: charter.charter.projectType || "Green Belt",
        projectCategory: charter.charter.projectCategory || "Process Improvement",
        businessCase: charter.charter.businessCase || "",
        problemStatement: charter.charter.problemStatement || "",
        goals: charter.charter.goals || "",
        scope: charter.charter.scope || "",
        startDate: currentProject?.startDate 
          ? new Date(currentProject.startDate).toISOString().split('T')[0] 
          : "",
        targetEndDate: currentProject?.targetEndDate 
          ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] 
          : "",
        savingsPerYear: charter.charter.savingsPerYear?.toString() || "",
        workingCapitalGains: charter.charter.workingCapitalGains?.toString() || "",
        waccPercentage: charter.charter.waccPercentage?.toString() || "10",
        financialSavings: charter.charter.financialSavings?.toString() || "",
        fteBenefits: charter.charter.fteBenefits || "",
        totalFinancialSavings: charter.charter.totalFinancialSavings?.toString() || "",
        softBenefits: charter.charter.softBenefits || "",
        // Project cost fields
        oneOffPeopleCost: charter.charter.oneOffPeopleCost?.toString() || "",
        oneOffTechnologyCost: charter.charter.oneOffTechnologyCost?.toString() || "",
        oneOffOtherCost: charter.charter.oneOffOtherCost?.toString() || "",
        oneOffOtherExplanation: charter.charter.oneOffOtherExplanation || "",
        capexCost: charter.charter.capexCost?.toString() || "",
        capexExplanation: charter.charter.capexExplanation || "",
        // Summary financial fields
        totalProjectCosts: charter.charter.totalProjectCosts?.toString() || "",
        projectNetValue: charter.charter.projectNetValue?.toString() || "",
        // Financial metrics
        roi: charter.charter.roi?.toString() || "",
        breakeven: charter.charter.breakeven || ""
      });
      
      // Calculate total financial savings after loading the form data
      // Pass the fteBenefitsValue to ensure it's included in the calculation
      setTimeout(() => updateTotalFinancialSavings(fteBenefitsValue), 100);
    }
  }, [charter, currentProject]);

  // Initialize form with defaults if no charter exists yet
  useEffect(() => {
    // Only initialize if charterError is true (charter not found) or charter query returned but no charter data
    if ((charterError || (charter && !charter.charter)) && currentProject) {
      console.log("No charter found for project, initializing form with default values");
      
      // Initialize form with project data and default values
      charterForm.reset({
        projectTitle: currentProject?.title || "",
        projectLeader: "",
        sponsor: "",
        sponsorFunction: "",
        financialController: "",
        projectCoach: "",
        beltLevel: "Green Belt",
        coachBeltLevel: "Master Black Belt",
        projectType: "Green Belt",
        projectCategory: "Process Improvement",
        businessCase: "",
        problemStatement: "",
        goals: "",
        scope: "",
        startDate: currentProject?.startDate 
          ? new Date(currentProject.startDate).toISOString().split('T')[0] 
          : "",
        targetEndDate: currentProject?.targetEndDate 
          ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] 
          : "",
        savingsPerYear: "",
        workingCapitalGains: "",
        waccPercentage: "10",
        financialSavings: "",
        fteBenefits: "",
        totalFinancialSavings: "",
        softBenefits: "",
        // Project cost fields
        oneOffPeopleCost: "",
        oneOffTechnologyCost: "",
        oneOffOtherCost: "",
        oneOffOtherExplanation: "",
        capexCost: "",
        capexExplanation: "",
        // Summary financial fields
        totalProjectCosts: "",
        projectNetValue: "",
        // Financial metrics
        roi: "",
        breakeven: ""
      });
    }
  }, [charterError, charter, currentProject]);

  // Fetch SIPOC diagram if exists
  const { data: sipoc } = useQuery({
    queryKey: [`/api/projects/${projectId}/sipoc`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.sipoc) {
        sipocForm.reset({
          suppliers: data.sipoc.suppliers || "",
          inputs: data.sipoc.inputs || "",
          process: data.sipoc.process || "",
          outputs: data.sipoc.outputs || "",
          customers: data.sipoc.customers || "",
        });
      }
    },
  });

  // Fetch customer requirements
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.requirements && data.requirements.length > 0) {
        setRequirements(data.requirements.map((r: any) => ({
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
        })));
      }
    },
  });

  // Save project charter mutation
  const saveCharterMutation = useMutation({
    mutationFn: async (data: any) => {
      // Make sure all data is properly formatted - all numeric values should be converted to strings for storage
      const payload = {
        projectId,
        projectLeader: data.projectLeader || "",
        sponsor: data.sponsor || "",
        sponsorFunction: data.sponsorFunction || "",
        // Store stakeholders as an array
        stakeholders: stakeholders,
        // Store team members as an array
        teamMembers: teamMembers,
        // Keep legacy fields for backward compatibility
        stakeholder: stakeholders.length > 0 ? stakeholders[0].name : "",
        stakeholderFunction: stakeholders.length > 0 ? stakeholders[0].function : "",
        financialController: data.financialController || "",
        projectCoach: data.projectCoach || "",
        beltLevel: data.beltLevel || "Green Belt",
        coachBeltLevel: data.coachBeltLevel || "Master Black Belt",
        projectType: data.projectType || "Green Belt",
        projectCategory: data.projectCategory || "Process Improvement",
        businessCase: data.businessCase || "",
        problemStatement: data.problemStatement || "",
        goals: data.goals || "",
        scope: data.scope || "",
        projectImage: projectImage || "",
        savingsPerYear: (data.savingsPerYear || "0").toString(),
        workingCapitalGains: (data.workingCapitalGains || "0").toString(),
        waccPercentage: (data.waccPercentage || "0").toString(),
        financialSavings: (data.financialSavings || "0").toString(),
        fteBenefits: data.fteBenefits || "",
        // FTE calculation parameters
        // Convert workingDaysPerWeek back to workingDaysPerYear for backward compatibility
        fteWorkingDaysPerYear: (fteParams.workingDaysPerWeek * 52).toString(),
        fteWorkingHoursPerDay: fteParams.workingHoursPerDay.toString(),
        fteTimeUnit: fteParams.timeUnit,
        fteSavedHours: fteParams.savedHours.toString(),
        fteCostPerYear: fteParams.fteCostPerYear.toString(),
        fteCalculatedValue: fteParams.calculatedValue.toString(),
        softBenefits: data.softBenefits || "",
        // Project cost fields
        oneOffPeopleCost: (data.oneOffPeopleCost || "0").toString(),
        oneOffTechnologyCost: (data.oneOffTechnologyCost || "0").toString(),
        oneOffOtherCost: (data.oneOffOtherCost || "0").toString(),
        oneOffOtherExplanation: data.oneOffOtherExplanation || "",
        capexCost: (data.capexCost || "0").toString(),
        capexExplanation: data.capexExplanation || "",
        // Include calculated values for reference/display
        totalFinancialSavings: (data.totalFinancialSavings || "0").toString(),
        totalProjectCosts: (data.totalProjectCosts || "0").toString(),
        projectNetValue: (data.projectNetValue || "0").toString(),
        roi: data.roi || "0",
        breakeven: data.breakeven || "0 years 0 months",
        userId: user?.id || 1,
      };

      console.log("Sending charter data to API:", payload);

      // Check if charter exists
      if (charter && charter.charter && charter.charter.id) {
        console.log(`Updating existing charter ID: ${charter.charter.id}`);
        return apiRequest("PUT", `/api/charters/${charter.charter.id}`, payload);
      } else {
        console.log(`Creating new charter for project ID: ${projectId}`);
        return apiRequest("POST", `/api/projects/${projectId}/charter`, payload);
      }
    },
    onSuccess: (data) => {
      console.log("Charter saved successfully, response:", data);
      toast({
        title: "Success",
        description: "Project charter saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/charter`] });
    },
    onError: (error) => {
      console.error("Error saving charter:", error);
      toast({
        title: "Error",
        description: `Failed to save project charter: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save SIPOC diagram mutation
  const saveSipocMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        projectId,
        ...data,
        userId: user?.id,
      };

      // Check if SIPOC exists
      if (sipoc?.sipoc?.id) {
        return apiRequest("PUT", `/api/sipocs/${sipoc.sipoc.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/sipoc`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SIPOC diagram saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sipoc`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save SIPOC diagram: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save customer requirements mutation
  const saveRequirementsMutation = useMutation({
    mutationFn: async (requirements: any[]) => {
      const validRequirements = requirements.filter(r => r.requirement.trim() !== "");
      
      // For simplicity, just create/update each requirement
      const promises = validRequirements.map(r => {
        const payload = {
          projectId,
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
          userId: user?.id,
        };
        
        return apiRequest("POST", `/api/projects/${projectId}/requirements`, payload);
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer requirements saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/requirements`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save customer requirements: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveCharter = (data: any) => {
    try {
      console.log("handleSaveCharter triggered with form data:", data);
      
      // Create working copies of the stakeholders and team members lists
      let workingStakeholders = [...stakeholders];
      let workingTeamMembers = [...teamMembers];
      
      // Check for any pending stakeholder in the form
      const stakeholderForm = document.querySelector('.stakeholder-form');
      if (stakeholderForm) {
        const nameInput = document.querySelector('.stakeholder-name-input') as HTMLInputElement;
        const functionInput = document.querySelector('.stakeholder-function-input') as HTMLInputElement;
        
        if (nameInput && (nameInput.value.trim() || (functionInput && functionInput.value.trim()))) {
          console.log("Found pending stakeholder data:", nameInput.value, functionInput?.value);
          
          // Create the new stakeholder
          const pendingStakeholder = {
            name: nameInput.value.trim() || "Unnamed Stakeholder",
            function: functionInput && functionInput.value.trim() ? functionInput.value.trim() : undefined
          };
          
          // Add it to our copy
          workingStakeholders.push(pendingStakeholder);
          
          // Update the state
          setStakeholders(workingStakeholders);
          
          // Clear the inputs
          nameInput.value = "";
          if (functionInput) functionInput.value = "";
          
          console.log("Updated stakeholders list:", workingStakeholders);
        }
      }
      
      // Check for any pending team member in the form
      const teamMemberForm = document.querySelector('.team-member-form');
      if (teamMemberForm) {
        const nameInput = document.querySelector('.team-member-name-input') as HTMLInputElement;
        const functionInput = document.querySelector('.team-member-function-input') as HTMLInputElement;
        const dedicationInput = document.querySelector('.team-member-dedication-input') as HTMLInputElement;
        
        if (nameInput && nameInput.value.trim()) {
          console.log("Found pending team member data:", nameInput.value, functionInput?.value, dedicationInput?.value);
          
          // Create the new team member
          const pendingTeamMember = {
            name: nameInput.value.trim(),
            function: functionInput && functionInput.value.trim() ? functionInput.value.trim() : undefined,
            dedication: dedicationInput && dedicationInput.value ? 
              Math.min(100, Math.max(0, parseInt(dedicationInput.value))) : 100
          };
          
          // Add it to our copy
          workingTeamMembers.push(pendingTeamMember);
          
          // Update the state
          setTeamMembers(workingTeamMembers);
          
          // Clear the inputs
          nameInput.value = "";
          if (functionInput) functionInput.value = "";
          if (dedicationInput) dedicationInput.value = "100";
          
          console.log("Updated team members list:", workingTeamMembers);
        }
      }
      
      // Make sure all calculated values are properly set before submission
      updateTotalFinancialSavings();
      console.log("Total financial savings updated");
      
      // Update form data with the latest calculated values
      data.totalFinancialSavings = charterForm.getValues("totalFinancialSavings");
      data.totalProjectCosts = charterForm.getValues("totalProjectCosts");
      data.projectNetValue = charterForm.getValues("projectNetValue");
      data.roi = charterForm.getValues("roi");
      data.breakeven = charterForm.getValues("breakeven");
      
      console.log("Form data updated with calculated values:", {
        totalFinancialSavings: data.totalFinancialSavings,
        totalProjectCosts: data.totalProjectCosts,
        projectNetValue: data.projectNetValue,
        roi: data.roi,
        breakeven: data.breakeven
      });
      
      // Add calculated FTE benefits
      if (fteParams.calculatedValue > 0) {
        const formattedValue = formatCurrency(fteParams.calculatedValue, currency);
        const fteString = `${fteParams.calculatedFte.toFixed(2)} FTE (${formattedValue})`;
        data.fteBenefits = fteString;
        console.log("Added FTE benefits:", fteString);
      }
      
      // Ensure all numeric fields are properly converted to strings as required by the schema
      // Note: This is where we consolidate all the data from multiple sources
      const preparedData = {
        // This will include the FTE parameters from the FTE state
        projectId,
        userId: user?.id || 1,
        projectLeader: data.projectLeader || "",
        sponsor: data.sponsor || "",
        sponsorFunction: data.sponsorFunction || "",
        // Include stakeholders as an array with any pending data
        stakeholders: workingStakeholders,
        // Include team members as an array with any pending data
        teamMembers: workingTeamMembers,
        // Keep legacy fields for backward compatibility
        stakeholder: workingStakeholders.length > 0 ? workingStakeholders[0].name : "",
        stakeholderFunction: workingStakeholders.length > 0 ? workingStakeholders[0].function : "",
        financialController: data.financialController || "",
        projectCoach: data.projectCoach || "",
        beltLevel: data.beltLevel || "Green Belt",
        coachBeltLevel: data.coachBeltLevel || "Master Black Belt",
        projectType: data.projectType || "Green Belt",
        projectCategory: data.projectCategory || "Process Improvement",
        businessCase: data.businessCase || "",
        problemStatement: data.problemStatement || "",
        goals: data.goals || "",
        scope: data.scope || "",
        projectImage: projectImage || "",
        
        // Project benefits - ensure all numeric values are converted to strings
        savingsPerYear: (data.savingsPerYear || "0").toString(),
        workingCapitalGains: (data.workingCapitalGains || "0").toString(),
        waccPercentage: (data.waccPercentage || "0").toString(),
        financialSavings: (data.financialSavings || "0").toString(),
        fteBenefits: data.fteBenefits || "",
        softBenefits: data.softBenefits || "",
        
        // FTE calculation parameters - already a separate section in the mutation
        // Convert workingDaysPerWeek back to workingDaysPerYear for backward compatibility
        fteWorkingDaysPerYear: (fteParams.workingDaysPerWeek * 52).toString(),
        fteWorkingHoursPerDay: fteParams.workingHoursPerDay.toString(), 
        fteTimeUnit: fteParams.timeUnit,
        fteSavedHours: fteParams.savedHours.toString(),
        fteCostPerYear: fteParams.fteCostPerYear.toString(),
        fteCalculatedValue: fteParams.calculatedValue.toString(),
        
        // Project cost fields - ensure they're all included and converted to strings
        oneOffPeopleCost: (data.oneOffPeopleCost || "0").toString(),
        oneOffTechnologyCost: (data.oneOffTechnologyCost || "0").toString(), 
        oneOffOtherCost: (data.oneOffOtherCost || "0").toString(),
        oneOffOtherExplanation: data.oneOffOtherExplanation || "",
        capexCost: (data.capexCost || "0").toString(),
        capexExplanation: data.capexExplanation || "",
        
        // Calculated summary values
        totalFinancialSavings: (data.totalFinancialSavings || "0").toString(),
        totalProjectCosts: (data.totalProjectCosts || "0").toString(),
        projectNetValue: (data.projectNetValue || "0").toString(),
        roi: data.roi || "0",
        breakeven: data.breakeven || "0 years 0 months",
      };
      
      // Debug log
      console.log("Submitting project charter with prepared data:", preparedData);
      
      // Check charter status
      console.log("Charter status:", charter && charter.charter ? 
        `Existing charter with ID ${charter.charter.id}` : 
        "No existing charter, will create new one");
      
      // Submit the form
      saveCharterMutation.mutate(preparedData);
    } catch (error) {
      console.error("Error in handleSaveCharter:", error);
      toast({
        title: "Error",
        description: `Error preparing charter data: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleSaveSipoc = (data: any) => {
    saveSipocMutation.mutate(data);
  };

  // Function to calculate and update total financial savings, net value, ROI, and breakeven
  const updateTotalFinancialSavings = (overrideFteValue?: number) => {
    // Get values from form for benefits - ensure they're numbers
    const qualityCostSavings = parseFloat(charterForm.getValues("savingsPerYear").toString()) || 0;
    const financialSavings = parseFloat(charterForm.getValues("financialSavings").toString()) || 0;
    
    // Get FTE benefits value - preferring the override value if provided
    const fteBenefits = overrideFteValue !== undefined ? overrideFteValue : (Number(fteParams.calculatedValue) || 0);
    
    // Calculate total project financial savings
    const totalFinancialSavings = qualityCostSavings + financialSavings + fteBenefits;
    
    // Get values from form for costs - ensure they're numbers
    const oneOffPeopleCost = parseFloat(charterForm.getValues("oneOffPeopleCost").toString()) || 0;
    const oneOffTechnologyCost = parseFloat(charterForm.getValues("oneOffTechnologyCost").toString()) || 0;
    const oneOffOtherCost = parseFloat(charterForm.getValues("oneOffOtherCost").toString()) || 0;
    const capexCost = parseFloat(charterForm.getValues("capexCost").toString()) || 0;
    
    // Calculate total project costs
    const totalProjectCosts = oneOffPeopleCost + oneOffTechnologyCost + oneOffOtherCost + capexCost;
    
    // Calculate project net value
    const projectNetValue = totalFinancialSavings - totalProjectCosts;
    
    // Debug log for net value calculation
    console.log("Net Value Calculation:", {
      totalFinancialSavings,
      totalProjectCosts,
      projectNetValue,
      inputs: {
        qualityCostSavings,
        financialSavings,
        fteBenefits,
        oneOffPeopleCost,
        oneOffTechnologyCost,
        oneOffOtherCost,
        capexCost
      }
    });
    
    // Calculate ROI (Return on Investment) as a percentage
    let roi = 0;
    if (totalProjectCosts > 0) {
      roi = (projectNetValue / totalProjectCosts) * 100;
    }
    
    // Calculate Breakeven in years
    let breakeven = 0;
    if (totalFinancialSavings > 0) {
      breakeven = totalProjectCosts / totalFinancialSavings;
    }
    
    // Format breakeven in years and months
    const breakEvenYears = Math.floor(breakeven);
    const breakEvenMonths = Math.round((breakeven - breakEvenYears) * 12);
    const breakEvenFormatted = `${breakEvenYears} year${breakEvenYears !== 1 ? 's' : ''} ${breakEvenMonths} month${breakEvenMonths !== 1 ? 's' : ''}`;
    
    // Update the form fields - without decimal places
    charterForm.setValue("totalFinancialSavings", Math.round(totalFinancialSavings).toString());
    charterForm.setValue("totalProjectCosts", Math.round(totalProjectCosts).toString());
    charterForm.setValue("projectNetValue", Math.round(projectNetValue).toString());
    charterForm.setValue("roi", Math.round(roi).toString());
    charterForm.setValue("breakeven", breakEvenFormatted);
    
    console.log("Financial values updated:", {
      qualityCostSavings,
      financialSavings,
      fteBenefits,
      totalFinancialSavings,
      totalProjectCosts,
      projectNetValue,
      roi,
      breakeven,
      breakEvenFormatted
    });
  };

  const handleSaveRequirements = () => {
    saveRequirementsMutation.mutate(requirements);
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const newRequirements = [...requirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setRequirements(newRequirements);
  };

  const addRequirement = () => {
    if (requirements[requirements.length - 1].requirement.trim() !== "") {
      setRequirements([...requirements, { requirement: "", importance: 3, satisfaction: 3 }]);
    }
  };

  const removeRequirement = (index: number) => {
    const newRequirements = [...requirements];
    newRequirements.splice(index, 1);
    setRequirements(newRequirements);
  };

  const calculateGap = (importance: number, satisfaction: number) => {
    return importance - satisfaction;
  };

  return (
    <div className="space-y-6">
      {/* Project Charter */}
      <Card>
        <CardHeader>
          <CardTitle>Project Charter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={charterForm.handleSubmit(handleSaveCharter)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="projectTitle">Project Title</Label>
                    <Input
                      id="projectTitle"
                      placeholder="Order Processing Optimization"
                      {...charterForm.register("projectTitle")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectType">Project Type</Label>
                      <Select 
                        onValueChange={(value) => charterForm.setValue("projectType", value)}
                        value={charterForm.watch("projectType") || "Green Belt"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Black Belt">Black Belt</SelectItem>
                          <SelectItem value="Green Belt">Green Belt</SelectItem>
                          <SelectItem value="Yellow Belt">Yellow Belt</SelectItem>
                          <SelectItem value="White Belt">White Belt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="projectCategory">Project Category</Label>
                      <Select 
                        onValueChange={(value) => charterForm.setValue("projectCategory", value)}
                        value={charterForm.watch("projectCategory") || "Process Improvement"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select project category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Process Improvement">Process Improvement</SelectItem>
                          <SelectItem value="Process Redesign">Process Redesign</SelectItem>
                          <SelectItem value="Process Design">Process Design</SelectItem>
                          <SelectItem value="Project Scoping">Project Scoping</SelectItem>
                          <SelectItem value="Kaizen">Kaizen</SelectItem>
                          <SelectItem value="Quick Action">Quick Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectLeader">Project Leader</Label>
                      <Input
                        id="projectLeader"
                        placeholder="Enter name of project leader"
                        {...charterForm.register("projectLeader")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="beltLevel">Belt Level</Label>
                      <Select 
                        onValueChange={(value) => charterForm.setValue("beltLevel", value)}
                        defaultValue={charterForm.getValues("beltLevel")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select belt level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Black Belt">Black Belt</SelectItem>
                          <SelectItem value="Green Belt">Green Belt</SelectItem>
                          <SelectItem value="Yellow Belt">Yellow Belt</SelectItem>
                          <SelectItem value="White Belt">White Belt</SelectItem>
                          <SelectItem value="Master Black Belt">Master Black Belt</SelectItem>
                          <SelectItem value="Champion">Champion</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sponsor">Sponsor</Label>
                      <Input
                        id="sponsor"
                        placeholder="Enter name of project sponsor"
                        {...charterForm.register("sponsor")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sponsorFunction">Function</Label>
                      <Input
                        id="sponsorFunction"
                        placeholder="Enter sponsor's function/department"
                        {...charterForm.register("sponsorFunction")}
                      />
                    </div>
                  </div>
                  <div>
                    {/* Stakeholder Management Component */}
                    <StakeholderManagement 
                      stakeholders={stakeholders}
                      onChange={setStakeholders}
                    />
                  </div>
                  <div>
                    {/* Team Member Management Component */}
                    <TeamMemberManagement 
                      teamMembers={teamMembers}
                      onChange={setTeamMembers}
                    />
                  </div>
                  <div>
                    <Label htmlFor="financialController">Financial Controller</Label>
                    <Input
                      id="financialController"
                      placeholder="Enter name of financial controller"
                      {...charterForm.register("financialController")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectCoach">Project Coach</Label>
                      <Input
                        id="projectCoach"
                        placeholder="Enter name of project coach"
                        {...charterForm.register("projectCoach")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="coachBeltLevel">Belt Level</Label>
                      <Select
                        onValueChange={(value) => charterForm.setValue("coachBeltLevel", value)}
                        defaultValue={charterForm.getValues("coachBeltLevel") || "None"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select belt level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Master Black Belt">Master Black Belt</SelectItem>
                          <SelectItem value="Black Belt">Black Belt</SelectItem>
                          <SelectItem value="Green Belt">Green Belt</SelectItem>
                          <SelectItem value="Yellow Belt">Yellow Belt</SelectItem>
                          <SelectItem value="White Belt">White Belt</SelectItem>
                          <SelectItem value="Champion">Champion</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectImage">Project Image</Label>
                  <div className="mt-2">
                    {projectImage ? (
                      <div className="relative w-full max-w-md mb-2">
                        <img
                          src={projectImage}
                          alt="Project"
                          className="w-full h-auto object-contain rounded-md border border-gray-200"
                          style={{ maxHeight: '200px' }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer"
                        onClick={handleChooseImage}
                      >
                        <Image className="h-10 w-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload an image</span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessCase">Business Case</Label>
                  <Textarea
                    id="businessCase"
                    placeholder="Describe the Business Reason of this project (Why this project?) Describe Why now? Describe What happens if we do not this project"
                    rows={3}
                    {...charterForm.register("businessCase")}
                  />
                </div>
                <div>
                  <Label htmlFor="problemStatement">Problem Statement</Label>
                  <Textarea
                    id="problemStatement"
                    placeholder="Define the problem to be solved in a SMART statement (Specific, Measurable, Attainable, Realistic, Tangible)..."
                    rows={3}
                    {...charterForm.register("problemStatement")}
                  />
                </div>
                <div>
                  <Label htmlFor="goals">Goals & Objectives</Label>
                  <Textarea
                    id="goals"
                    placeholder="List SMART (Specific, Measurable, Achievable, Realistic, Tangible) goals and objectives that address the problem statement..."
                    rows={3}
                    {...charterForm.register("goals")}
                  />
                </div>
                <div>
                  <Label htmlFor="scope">Project Scope</Label>
                  <Textarea
                    id="scope"
                    placeholder="Define what is in and out of scope..."
                    rows={3}
                    {...charterForm.register("scope")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...charterForm.register("startDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetEndDate">Target End Date</Label>
                    <Input
                      id="targetEndDate"
                      type="date"
                      {...charterForm.register("targetEndDate")}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Project Benefits Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Project Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="savingsPerYear">Quality Cost Savings (p.a.) ({currency})</Label>
                    <Input
                      id="savingsPerYear"
                      placeholder={`e.g. 100000`}
                      type="number"
                      min="0"
                      {...charterForm.register("savingsPerYear")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("savingsPerYear", "0");
                        } else {
                          charterForm.setValue("savingsPerYear", e.target.value);
                        }
                        // Update total financial savings
                        updateTotalFinancialSavings();
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Annual cost savings expected from quality improvements</p>
                  </div>
                  <div>
                    <Label htmlFor="workingCapitalGains">Working Capital Gains (Cash) ({currency})</Label>
                    <Input
                      id="workingCapitalGains"
                      placeholder={`e.g. 75000`}
                      type="number"
                      min="0"
                      {...charterForm.register("workingCapitalGains")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("workingCapitalGains", "0");
                        } else {
                          charterForm.setValue("workingCapitalGains", e.target.value);
                        }
                        
                        // Calculate Financial Savings based on WACC
                        const wcg = parseFloat(e.target.value) || 0;
                        const wacc = parseFloat(charterForm.getValues("waccPercentage")) / 100 || 0;
                        const financialSavings = Math.round(wcg * wacc).toString();
                        charterForm.setValue("financialSavings", financialSavings);
                        
                        // Update total financial savings
                        updateTotalFinancialSavings();
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash flow and working capital improvements</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="waccPercentage">WACC (%)</Label>
                      <Input
                        id="waccPercentage"
                        placeholder="e.g. 10"
                        type="number"
                        min="0"
                        {...charterForm.register("waccPercentage")}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (value < 0 || isNaN(value)) {
                            charterForm.setValue("waccPercentage", "0");
                          } else {
                            charterForm.setValue("waccPercentage", e.target.value);
                          }
                          
                          // Calculate Financial Savings based on WACC
                          const wcg = parseFloat(charterForm.getValues("workingCapitalGains")) || 0;
                          const wacc = parseFloat(e.target.value) / 100 || 0;
                          const financialSavings = Math.round(wcg * wacc).toString();
                          charterForm.setValue("financialSavings", financialSavings);
                          
                          // Update total financial savings
                          updateTotalFinancialSavings();
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">Weighted Average Cost of Capital</p>
                    </div>
                    <div>
                      <Label htmlFor="financialSavings">Financial Savings (p.a.) ({currency})</Label>
                      <Input
                        id="financialSavings"
                        readOnly
                        className="bg-gray-50"
                        {...charterForm.register("financialSavings")}
                      />
                      <p className="text-xs text-gray-500 mt-1">WCG * WACC</p>
                    </div>
                  </div>
                  
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fteBenefits">FTE Benefits (Full Time Employee)</Label>
                    <div className="space-y-4 mt-2 p-3 border border-gray-200 rounded-md">
                      <div>
                        <Label htmlFor="fteAssumptions" className="text-xs font-medium">FTE Assumptions</Label>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <Label htmlFor="workingDaysPerWeek" className="text-xs">Working Days/Week</Label>
                            <Input
                              id="workingDaysPerWeek"
                              type="number"
                              min="0"
                              value={fteParams.workingDaysPerWeek}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0 || isNaN(value)) {
                                  handleFteParamChange('workingDaysPerWeek', "0");
                                } else {
                                  handleFteParamChange('workingDaysPerWeek', e.target.value);
                                }
                              }}
                              placeholder="e.g. 5"
                              className="h-8 text-sm"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label htmlFor="workingHoursPerDay" className="text-xs">Working Hours/Day</Label>
                            <Input
                              id="workingHoursPerDay"
                              type="number"
                              min="0"
                              value={fteParams.workingHoursPerDay}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0 || isNaN(value)) {
                                  handleFteParamChange('workingHoursPerDay', "0");
                                } else {
                                  handleFteParamChange('workingHoursPerDay', e.target.value);
                                }
                              }}
                              placeholder="e.g. 8"
                              className="h-8 text-sm"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="savedTime" className="text-xs font-medium">Saved Working Time</Label>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <Label htmlFor="timeUnit" className="text-xs">Time Period</Label>
                            <select 
                              id="timeUnit"
                              className="w-full h-8 text-sm border border-gray-300 rounded-md" 
                              value={fteParams.timeUnit}
                              onChange={(e) => handleFteParamChange('timeUnit', e.target.value)}
                            >
                              <option value="day">Per Day</option>
                              <option value="week">Per Week</option>
                              <option value="month">Per Month</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="savedHours" className="text-xs">Hours Saved</Label>
                            <Input
                              id="savedHours"
                              type="number"
                              min="0"
                              value={fteParams.savedHours}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value < 0 || isNaN(value)) {
                                  handleFteParamChange('savedHours', "0");
                                } else {
                                  handleFteParamChange('savedHours', e.target.value);
                                }
                              }}
                              placeholder="Hours saved"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="fteCostPerYear" className="text-xs">FTE Cost per Year ({currency})</Label>
                        <Input
                          id="fteCostPerYear"
                          type="number"
                          min="0"
                          value={fteParams.fteCostPerYear}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value < 0 || isNaN(value)) {
                              handleFteParamChange('fteCostPerYear', "0");
                            } else {
                              handleFteParamChange('fteCostPerYear', e.target.value);
                            }
                          }}
                          placeholder="e.g. 100000"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-sm font-medium">Calculated FTE: <span className="text-blue-600">{fteParams.calculatedFte}</span></p>
                          <p className="text-sm font-medium">FTE Benefits: <span className="text-green-600">{formatCurrency(fteParams.calculatedValue, currency)}</span></p>
                        </div>
                        <div className="text-xs text-gray-500">Auto-calculated</div>
                      </div>
                    </div>
                    
                    <Input
                      id="fteBenefits"
                      className="hidden"
                      {...charterForm.register("fteBenefits")}
                    />
                  </div>
                </div>
              </div>
              
              {/* Total Project Financial Savings - Full Width */}
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex justify-between items-center">
                  <Label htmlFor="totalFinancialSavings" className="font-medium text-green-800 text-lg">Total Project Financial Savings (p.a.) ({currency})</Label>
                  <Input
                    id="totalFinancialSavings"
                    readOnly
                    className="max-w-[200px] bg-white border-green-200 text-green-800 font-bold text-lg"
                    {...charterForm.register("totalFinancialSavings")}
                  />
                </div>
                <p className="text-sm text-green-600 mt-1">Sum of Quality Cost Savings + Financial Savings + FTE Benefits</p>
              </div>
              
              {/* Soft Benefits - Full Width */}
              <div className="mt-6">
                <Label htmlFor="softBenefits">Soft Benefits (Non-Quantifiable)</Label>
                <Textarea
                  id="softBenefits"
                  placeholder="Categories include: Employee Satisfaction, Quality Improvement, Customer Satisfaction, Project Enabler, Other"
                  rows={4}
                  {...charterForm.register("softBenefits")}
                />
                <p className="text-xs text-gray-500 mt-1">List any Employee Satisfaction, Quality Improvement, Customer Satisfaction, Project Enabler and Other benefits</p>
              </div>
            </div>
            
            {/* Project Cost Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Project Costs</h3>
              
              {/* One-off Project Costs */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">One-off Project Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="oneOffPeopleCost">People ({currency})</Label>
                    <Input
                      id="oneOffPeopleCost"
                      placeholder="e.g. 5000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffPeopleCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffPeopleCost", "0");
                        } else {
                          charterForm.setValue("oneOffPeopleCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffTechnologyCost">Technology ({currency})</Label>
                    <Input
                      id="oneOffTechnologyCost"
                      placeholder="e.g. 10000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffTechnologyCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffTechnologyCost", "0");
                        } else {
                          charterForm.setValue("oneOffTechnologyCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffOtherCost">Others ({currency})</Label>
                    <Input
                      id="oneOffOtherCost"
                      placeholder="e.g. 2000"
                      type="number"
                      min="0"
                      {...charterForm.register("oneOffOtherCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("oneOffOtherCost", "0");
                        } else {
                          charterForm.setValue("oneOffOtherCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="oneOffOtherExplanation">Please explain Others</Label>
                  <Textarea
                    id="oneOffOtherExplanation"
                    placeholder="Detail any other one-off costs..."
                    rows={2}
                    {...charterForm.register("oneOffOtherExplanation")}
                  />
                </div>
              </div>
              
              {/* CAPEX Costs */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">CAPEX Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capexCost">CAPEX Cost ({currency})</Label>
                    <Input
                      id="capexCost"
                      placeholder="e.g. 25000"
                      type="number"
                      min="0"
                      {...charterForm.register("capexCost")}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < 0 || isNaN(value)) {
                          charterForm.setValue("capexCost", "0");
                        } else {
                          charterForm.setValue("capexCost", e.target.value);
                        }
                        // Update net value
                        updateTotalFinancialSavings();
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capexExplanation">Please explain</Label>
                    <Textarea
                      id="capexExplanation"
                      placeholder="Detail capital expenditure costs..."
                      rows={2}
                      {...charterForm.register("capexExplanation")}
                    />
                  </div>
                </div>
              </div>
              
              {/* Total Project Costs */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mb-6">
                <div className="flex justify-between items-center">
                  <Label htmlFor="totalProjectCosts" className="font-medium text-gray-800">Total Project Costs ({currency})</Label>
                  <Input
                    id="totalProjectCosts"
                    readOnly
                    className="max-w-[200px] bg-white border-gray-200 text-gray-800 font-bold"
                    {...charterForm.register("totalProjectCosts")}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Sum of all one-off and CAPEX costs</p>
              </div>
            </div>
            
            {/* Financial Metrics: Net Value, ROI, and Breakeven - All in one row */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Financial Metrics</h3>
              
              {/* Financial Metrics Grid - all in one row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Project Net Value Card */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="projectNetValue" className="font-medium text-blue-800 mb-2">Project Net Value ({currency})</Label>
                    <Input
                      id="projectNetValue"
                      readOnly
                      className="bg-white border-blue-200 text-blue-800 font-bold text-lg mb-1"
                      {...charterForm.register("projectNetValue")}
                    />
                    <p className="text-xs text-blue-600 mt-1">Total Project Financial Savings (p.a.) - Total Project Costs</p>
                  </div>
                </div>
                
                {/* ROI Card */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="roi" className="font-medium text-purple-800 mb-2">Return on Investment (ROI)</Label>
                    <div className="flex items-center space-x-1 mb-1">
                      <Input
                        id="roi"
                        readOnly
                        className="bg-white border-purple-200 text-purple-800 font-bold text-lg"
                        {...charterForm.register("roi")}
                      />
                      <span className="text-purple-800 font-medium text-lg">%</span>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">(Net Value / Total Costs) x 100</p>
                  </div>
                </div>
                
                {/* Breakeven Card */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex flex-col">
                    <Label htmlFor="breakeven" className="font-medium text-amber-800 mb-2">Breakeven Point</Label>
                    <Input
                      id="breakeven"
                      readOnly
                      className="bg-white border-amber-200 text-amber-800 font-bold text-lg mb-1"
                      {...charterForm.register("breakeven")}
                    />
                    <p className="text-xs text-amber-600 mt-1">Time to recover investment</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={saveCharterMutation.isPending} 
              className="mt-6"
              onClick={() => console.log("Save Project Charter button clicked")}
            >
              {saveCharterMutation.isPending ? "Saving..." : "Save Project Charter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SIPOC Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>SIPOC Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify the Suppliers, Inputs, Process, Outputs, and Customers involved in the project.
          </p>
          
          <form onSubmit={sipocForm.handleSubmit(handleSaveSipoc)}>
            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="p-3 bg-blue-50 rounded-md text-center">
                <h4 className="font-medium text-primary text-sm">Suppliers</h4>
              </div>
              <div className="p-3 bg-indigo-50 rounded-md text-center">
                <h4 className="font-medium text-indigo-600 text-sm">Inputs</h4>
              </div>
              <div className="p-3 bg-purple-50 rounded-md text-center">
                <h4 className="font-medium text-purple-600 text-sm">Process</h4>
              </div>
              <div className="p-3 bg-green-50 rounded-md text-center">
                <h4 className="font-medium text-green-600 text-sm">Outputs</h4>
              </div>
              <div className="p-3 bg-yellow-50 rounded-md text-center">
                <h4 className="font-medium text-yellow-600 text-sm">Customers</h4>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <div className="border border-blue-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who provides inputs to the process?"
                  {...sipocForm.register("suppliers")}
                />
              </div>
              <div className="border border-indigo-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What inputs are required for the process?"
                  {...sipocForm.register("inputs")}
                />
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the steps in the process?"
                  {...sipocForm.register("process")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the outputs of the process?"
                  {...sipocForm.register("outputs")}
                />
              </div>
              <div className="border border-yellow-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who receives the outputs?"
                  {...sipocForm.register("customers")}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Button type="submit" disabled={saveSipocMutation.isPending}>
                {saveSipocMutation.isPending ? "Saving..." : "Save SIPOC Diagram"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Voice of Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Voice of Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify and prioritize customer requirements and needs.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Need</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importance (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Satisfaction (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requirements.map((req, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={req.requirement}
                        onChange={(e) => updateRequirement(index, "requirement", e.target.value)}
                        placeholder={index === requirements.length - 1 ? "Add new requirement..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.importance}
                        onChange={(e) => updateRequirement(index, "importance", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.satisfaction}
                        onChange={(e) => updateRequirement(index, "satisfaction", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${calculateGap(req.importance, req.satisfaction) > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                        {calculateGap(req.importance, req.satisfaction)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {index === requirements.length - 1 && req.requirement ? (
                        <Button variant="ghost" size="sm" onClick={addRequirement}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === requirements.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeRequirement(index)} className="text-red-500 hover:text-red-700">
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
              onClick={handleSaveRequirements}
              disabled={saveRequirementsMutation.isPending || requirements.every(r => !r.requirement)}
            >
              {saveRequirementsMutation.isPending ? "Saving..." : "Save Customer Requirements"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
