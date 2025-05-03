import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Image, Trash2, X, ChevronUp, ChevronDown, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { SoftBenefit } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { exportElementToPdf } from "@/lib/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import TeamMemberManagement from "@/components/stakeholders/TeamMemberManagement";
import CharterSoftBenefitsQuadrant from "./CharterSoftBenefitsQuadrant";
import { Stakeholder } from "@shared/schema";
import PdfStakeholderList from "@/components/stakeholders/PdfStakeholderList";

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
  const [teamMembers, setTeamMembers] = useState<Stakeholder[]>([]);
  
  // State for soft benefits management
  const [softBenefits, setSoftBenefits] = useState<SoftBenefit[]>([]);
  const [showSoftBenefitDialog, setShowSoftBenefitDialog] = useState(false);
  const [newBenefitText, setNewBenefitText] = useState("");
  const [newBenefitCategory, setNewBenefitCategory] = useState<SoftBenefit['category']>("employee");
  
  // State for collapsible sections - default to collapsed
  const [isFinancialSectionExpanded, setIsFinancialSectionExpanded] = useState(false);
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // Load the expanded state from localStorage if available
  useEffect(() => {
    if (projectId) {
      const savedState = localStorage.getItem(`financial_section_expanded_${projectId}`);
      if (savedState !== null) {
        setIsFinancialSectionExpanded(savedState === 'true');
      }
    }
  }, [projectId]);
  
  // Save expanded state to localStorage when it changes
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`financial_section_expanded_${projectId}`, isFinancialSectionExpanded.toString());
    }
  }, [isFinancialSectionExpanded, projectId]);
  
  // Handler for adding new soft benefit
  const handleAddSoftBenefit = () => {
    // Only show the dialog if we haven't reached the max number of benefits
    if (softBenefits.length < 4) {
      setNewBenefitText("");
      setNewBenefitCategory("employee");
      setShowSoftBenefitDialog(true);
    }
  };
  
  // Handler for saving the new soft benefit
  const handleSaveSoftBenefit = () => {
    if (newBenefitText.trim()) {
      const newBenefit: SoftBenefit = {
        text: newBenefitText.trim(),
        category: newBenefitCategory
      };
      
      setSoftBenefits([...softBenefits, newBenefit]);
      setShowSoftBenefitDialog(false);
      
      // Update the hidden input with the JSON string
      const updatedBenefits = [...softBenefits, newBenefit];
      charterForm.setValue("softBenefits", JSON.stringify(updatedBenefits));
    }
  };
  
  // Handler for removing a soft benefit
  const handleRemoveSoftBenefit = (index: number) => {
    const updatedBenefits = [...softBenefits];
    updatedBenefits.splice(index, 1);
    setSoftBenefits(updatedBenefits);
    
    // Update the hidden input with the JSON string
    charterForm.setValue("softBenefits", JSON.stringify(updatedBenefits));
  };
  
  // Helper function to get badge variant based on category
  const getBadgeVariantForCategory = (category: SoftBenefit['category']) => {
    switch (category) {
      case "employee": return "secondary";
      case "customer": return "outline";
      case "process": return "default";
      case "growth": return "secondary";
      default: return "secondary";
    }
  };
  
  // Helper function to get category label
  const getCategoryLabel = (category: SoftBenefit['category']) => {
    switch (category) {
      case "employee": return "Employee";
      case "customer": return "Customer";
      case "process": return "Process";
      case "growth": return "Growth";
      default: return "Other";
    }
  };
  
  // Helper function to get category icon (matching the dashboard)
  const getCategoryIcon = (category: SoftBenefit['category']) => {
    switch (category) {
      case "employee": return "👥"; // Employee icon
      case "customer": return "🤝"; // Customer icon
      case "process": return "⚙️"; // Process icon
      case "growth": return "📈"; // Growth icon
      default: return "✓";
    }
  };

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
      calculatedFte: parseFloat(calculatedFte.toFixed(3)),
      calculatedValue: parseFloat(calculatedValue.toFixed(2))
    });
    
    // Set the hidden input value for form submission
    const formattedValue = formatCurrency(calculatedValue, currency);
    const fteString = `${calculatedFte.toFixed(3)} FTE (${formattedValue})`;
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
    const formattedFte = parseFloat(calculatedFte.toFixed(3));
    const formattedValue = parseFloat(calculatedValue.toFixed(2));
    
    // Update the FTE params state with calculated values
    setFteParams({
      ...newParams,
      calculatedFte: formattedFte,
      calculatedValue: formattedValue
    });
    
    // Set the hidden input value for form submission
    const formattedCurrency = formatCurrency(formattedValue, currency);
    const fteString = `${formattedFte.toFixed(3)} FTE (${formattedCurrency})`;
    
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
      
      // Load soft benefits if available
      if (charter.charter.softBenefits) {
        try {
          let parsedBenefits: SoftBenefit[] = [];
          
          // If it's a string, try to parse it as JSON
          if (typeof charter.charter.softBenefits === 'string') {
            // Check if it looks like a JSON array (after removing extra quotes if needed)
            const benefitsStr = charter.charter.softBenefits.trim();
            
            // Handle case where the string is stored with extra quotes (JSON string of a JSON string)
            // This often happens when the database stores the value with extra quotes
            if (benefitsStr.startsWith('"[') && benefitsStr.endsWith(']"')) {
              // Remove the extra quotes and escape characters
              const cleanedStr = benefitsStr.slice(1, -1).replace(/\\"/g, '"');
              parsedBenefits = JSON.parse(cleanedStr);
              console.log("Parsed soft benefits from double-quoted JSON string:", parsedBenefits);
            }
            // Standard case: JSON array stored as a string
            else if (benefitsStr.startsWith('[') && benefitsStr.endsWith(']')) {
              parsedBenefits = JSON.parse(benefitsStr);
              console.log("Parsed soft benefits from JSON string:", parsedBenefits);
            } 
            // Legacy format case
            else {
              // Legacy format - convert to new format with a default category
              parsedBenefits = [{ 
                text: charter.charter.softBenefits, 
                category: "process" 
              }];
              console.log("Converted legacy soft benefit format");
            }
          } else if (Array.isArray(charter.charter.softBenefits)) {
            // It's already an array
            parsedBenefits = charter.charter.softBenefits;
            console.log("Using already parsed soft benefits array");
          }
          
          // Apply the parsed benefits
          setSoftBenefits(parsedBenefits);
          console.log("Loaded soft benefits:", parsedBenefits);
          
          // Make sure form value is updated too
          charterForm.setValue("softBenefits", JSON.stringify(parsedBenefits));
        } catch (e) {
          console.error("Error parsing soft benefits:", e, "Value was:", charter.charter.softBenefits);
          setSoftBenefits([]);
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
            calculatedFte: parseFloat(calculatedFte.toFixed(3)),
            calculatedValue: calculatedValue
          });
          
          console.log("Loaded FTE parameters from database:", {
            workingDaysPerYear,
            workingDaysPerWeek, 
            workingHoursPerDay, 
            timeUnit, 
            savedHours, 
            fteCostPerYear,
            calculatedFte: parseFloat(calculatedFte.toFixed(3)),
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
        projectReferenceNumber: charter.charter.projectReferenceNumber || "",
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
        // Use startDate and targetEndDate from the charter if available, otherwise use the project dates
        startDate: charter.charter.startDate 
          ? charter.charter.startDate 
          : currentProject?.startDate 
            ? new Date(currentProject.startDate).toISOString().split('T')[0] 
            : "",
        targetEndDate: charter.charter.targetEndDate 
          ? charter.charter.targetEndDate 
          : currentProject?.targetEndDate 
            ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] 
            : "",
        // Add milestone dates
        kick_off_date: charter.charter.kick_off_date || "",
        define_phase_date: charter.charter.define_phase_date || "",
        measure_phase_date: charter.charter.measure_phase_date || "",
        analyze_phase_date: charter.charter.analyze_phase_date || "",
        improve_phase_date: charter.charter.improve_phase_date || "",
        control_phase_date: charter.charter.control_phase_date || "",
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

  // Set Control Phase date to project end date ONLY on first load (when there's no charter yet)
  useEffect(() => {
    // Only run this effect if we're creating a new charter for the first time
    // This ensures we don't override user's custom date after it's been saved
    if (charterError || !charter || charter.isLoading) {
      const currentControlDate = charterForm.getValues("control_phase_date");
      
      if (currentProject?.targetEndDate && !currentControlDate) {
        const targetEndDate = new Date(currentProject.targetEndDate).toISOString().split('T')[0];
        console.log("Initial load: Setting Control Phase date to match target end date:", targetEndDate);
        
        // Set the control phase date to match the target end date only on first load
        charterForm.setValue("control_phase_date", targetEndDate);
        console.log("Control Phase date set to:", targetEndDate);
      } else {
        console.log("Not setting initial control phase date:", 
          currentProject?.targetEndDate ? "Has target date" : "No target date", 
          currentControlDate ? "Control date already set" : "No control date set");
      }
    }
  }, [charterError, charter, currentProject, charterForm]);

  // Initialize form with defaults if no charter exists yet
  useEffect(() => {
    // Only initialize if charterError is true (charter not found) or charter query returned but no charter data
    if ((charterError || (charter && !charter.charter)) && currentProject) {
      console.log("No charter found for project, initializing form with default values");
      
      // Initialize form with project data and default values
      charterForm.reset({
        projectTitle: currentProject?.title || "",
        projectReferenceNumber: "",
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
        // Add milestone dates
        kick_off_date: "",
        define_phase_date: "",
        measure_phase_date: "",
        analyze_phase_date: "",
        improve_phase_date: "",
        control_phase_date: currentProject?.targetEndDate 
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
      // VERBOSE LOGGING: Important debug for projectTitle and all request details
      console.log("MUTATION DEBUG - Charter form - Project Title value:", data.projectTitle);
      console.log(`MUTATION DEBUG - Project ID: ${projectId}, currentCharterId: ${charter?.charter?.id}`);
      
      const payload = {
        projectId,
        projectTitle: data.projectTitle || "", // Add projectTitle to the payload
        projectReferenceNumber: data.projectReferenceNumber || "",
        projectLeader: data.projectLeader || "",
        sponsor: data.sponsor || "",
        sponsorFunction: data.sponsorFunction || "",
        // Store stakeholders as an array
        stakeholders: stakeholders,
        // Keep legacy fields for backward compatibility
        stakeholder: stakeholders.length > 0 ? stakeholders[0].name : "",
        stakeholderFunction: stakeholders.length > 0 ? stakeholders[0].function : "",
        // Store team members as an array
        teamMembers: teamMembers,
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
        // Project dates from the form
        startDate: data.startDate || "",
        targetEndDate: data.targetEndDate || "",
        // Milestone dates
        kick_off_date: data.kick_off_date || "",
        define_phase_date: data.define_phase_date || "",
        measure_phase_date: data.measure_phase_date || "",
        analyze_phase_date: data.analyze_phase_date || "",
        improve_phase_date: data.improve_phase_date || "",
        control_phase_date: data.control_phase_date || "",
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
      // Invalidate the charter query
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/charter`] });
      // IMPORTANT: Also invalidate the projects list to update the title in UI
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      console.log("Project list queries invalidated to refresh updated title");
    },
    onError: (error) => {
      console.error("Error saving charter:", error);
      // Add more detailed debugging
      console.error("Payload that caused error:", charterForm.getValues());
      
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
      
      // Create a working copy of the stakeholders list
      let workingStakeholders = [...stakeholders];
      
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
      
      // Create a working copy of the team members list
      let workingTeamMembers = [...teamMembers];
      
      // Check for any pending team member in the form
      const teamMemberForm = document.querySelector('.team-member-form');
      if (teamMemberForm) {
        const nameInput = document.querySelector('.team-member-name-input') as HTMLInputElement;
        const functionInput = document.querySelector('.team-member-function-input') as HTMLInputElement;
        
        if (nameInput && (nameInput.value.trim() || (functionInput && functionInput.value.trim()))) {
          console.log("Found pending team member data:", nameInput.value, functionInput?.value);
          
          // Create the new team member
          const pendingTeamMember = {
            name: nameInput.value.trim() || "Unnamed Team Member",
            function: functionInput && functionInput.value.trim() ? functionInput.value.trim() : undefined
          };
          
          // Add it to our copy
          workingTeamMembers.push(pendingTeamMember);
          
          // Update the state
          setTeamMembers(workingTeamMembers);
          
          // Clear the inputs
          nameInput.value = "";
          if (functionInput) functionInput.value = "";
          
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
        projectTitle: data.projectTitle || "", // IMPORTANT: Include the project title for synchronization
        projectReferenceNumber: data.projectReferenceNumber || "",
        projectLeader: data.projectLeader || "",
        sponsor: data.sponsor || "",
        sponsorFunction: data.sponsorFunction || "",
        // Include stakeholders as an array with any pending data
        stakeholders: workingStakeholders,
        // Keep legacy fields for backward compatibility
        stakeholder: workingStakeholders.length > 0 ? workingStakeholders[0].name : "",
        stakeholderFunction: workingStakeholders.length > 0 ? workingStakeholders[0].function : "",
        // Include team members as an array
        teamMembers: workingTeamMembers,
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
        
        // Project dates from the form
        startDate: data.startDate || "",
        targetEndDate: data.targetEndDate || "",
        
        // Milestone dates
        kick_off_date: data.kick_off_date || "",
        define_phase_date: data.define_phase_date || "",
        measure_phase_date: data.measure_phase_date || "",
        analyze_phase_date: data.analyze_phase_date || "",
        improve_phase_date: data.improve_phase_date || "",
        control_phase_date: data.control_phase_date || "",
        
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

  // These flags prevent multiple PDF export operations from running simultaneously
  let isPdfGenerating = false;
  let pdfGenerated = false;
  
  // Function to handle PDF export with protection against duplicate generation
  const handleExportPdf = async () => {
    // Prevent duplicate generation
    if (isPdfGenerating) {
      return;
    }
    
    // Set the flag to indicate PDF generation is in progress
    isPdfGenerating = true;
    
    try {
      // Project title for filename
      const projectTitle = charterForm.watch("projectTitle") || "Project Charter";
      const safeFilename = projectTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').substring(0, 30);
      
      // ************************
      // SIMPLER APPROACH - DIRECT CANVAS CAPTURE WITH PROJECT IMAGE EMBEDDED
      // ************************
      
      // First, let's create a temporary element that will include the project image directly
      const pdfContainer = document.createElement('div');
      pdfContainer.id = 'pdf-container';
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '1000px'; // Fixed width for better layout control
      
      // Add the title and subtitle (date)
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      
      const title = document.createElement('h1');
      title.textContent = 'Lean Six Sigma DMAIC Suite™';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '8px';
      
      const subtitle = document.createElement('div');
      subtitle.textContent = `Generated on ${format(new Date(), "MMMM d, yyyy")}`;
      subtitle.style.fontSize = '14px';
      subtitle.style.color = '#666';
      
      // Project title removed from header as requested
      
      header.appendChild(title);
      header.appendChild(subtitle);
      
      // Add a separator line
      const separator = document.createElement('hr');
      separator.style.border = 'none';
      separator.style.borderTop = '1px solid #ddd';
      separator.style.margin = '10px 0 20px 0';
      
      pdfContainer.appendChild(header);
      pdfContainer.appendChild(separator);
      
      // If we have a project image, add it in a floating container at the top right
      if (projectImage) {
        console.log("Adding project image to PDF container");
        const imageContainer = document.createElement('div');
        imageContainer.style.float = 'right';
        imageContainer.style.width = '200px';
        imageContainer.style.marginLeft = '20px';
        imageContainer.style.marginBottom = '20px';
        
        const img = document.createElement('img');
        img.src = projectImage;
        img.alt = 'Project Image';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '150px';
        img.style.objectFit = 'contain';
        img.crossOrigin = 'anonymous';
        
        imageContainer.appendChild(img);
        pdfContainer.appendChild(imageContainer);
      }
      
      // Now clone the project charter and append it to our container
      const charterElement = document.getElementById("project-charter");
      if (!charterElement) {
        toast({
          title: "Export Failed",
          description: "Could not find the project charter element",
          variant: "destructive",
        });
        isPdfGenerating = false;
        return;
      }
      
          // Get the current project type and category values
      const projectTypeValue = currentProject?.projectType || "Green Belt";
      const projectCategoryValue = currentProject?.projectCategory || "Process Improvement";
      
      console.log("PDF EXPORT INFO - Project Type and Category:", { 
        projectId, 
        projectType: projectTypeValue, 
        projectCategory: projectCategoryValue 
      });
      
      // We'll directly modify the form fields inside the clone element instead of adding a new section
      
      // Clone the charter and modify it for PDF rendering
      const clone = charterElement.cloneNode(true) as HTMLElement;
      
      // Remove unnecessary parts - IMPORTANT: DON'T remove html2canvas-show elements
      const removeElements = clone.querySelectorAll('#project-image-section, button, .html2canvas-hide:not(.stakeholder-table-container .html2canvas-hide)');
      removeElements.forEach(el => el.remove());
      
      // Find the stakeholder and team member containers and replace them with direct markup
      const stakeholderSection = clone.querySelector('.stakeholder-section');
      const teamMemberSection = clone.querySelector('.team-member-section');
      
      console.log("Creating direct markup for stakeholders and team members");
      
      // Create a direct markup for stakeholders
      if (stakeholderSection && stakeholderSection instanceof HTMLElement) {
        // Get the label element from the section
        const labelElement = stakeholderSection.querySelector('h3, .section-title');
        let sectionTitle = "Stakeholders";
        if (labelElement) {
          sectionTitle = labelElement.textContent || "Stakeholders";
        }
        
        // Create a new container for stakeholders
        const directStakeholderList = document.createElement('div');
        directStakeholderList.className = 'pdf-direct-list';
        directStakeholderList.style.margin = '10px 0';
        directStakeholderList.style.padding = '10px';
        directStakeholderList.style.border = '1px solid #e2e8f0';
        directStakeholderList.style.borderRadius = '4px';
        
        // Add the title
        const title = document.createElement('h3');
        title.textContent = sectionTitle;
        title.style.fontSize = '14px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        directStakeholderList.appendChild(title);
        
        // Add each stakeholder as a simple line of text
        if (stakeholders.length > 0) {
          stakeholders.forEach((stakeholder, index) => {
            const item = document.createElement('div');
            item.style.fontSize = '12px';
            item.style.marginBottom = '4px';
            item.style.lineHeight = '1.2';
            item.textContent = stakeholder.name + (stakeholder.function ? ` (${stakeholder.function})` : '');
            directStakeholderList.appendChild(item);
          });
        } else {
          const emptyMessage = document.createElement('div');
          emptyMessage.textContent = 'No stakeholders added.';
          emptyMessage.style.fontSize = '12px';
          emptyMessage.style.color = '#64748b';
          emptyMessage.style.fontStyle = 'italic';
          directStakeholderList.appendChild(emptyMessage);
        }
        
        // Replace the original section with our direct markup
        stakeholderSection.innerHTML = '';
        stakeholderSection.appendChild(directStakeholderList);
        console.log("Added direct stakeholder markup");
      }
      
      // Create a direct markup for team members
      if (teamMemberSection && teamMemberSection instanceof HTMLElement) {
        // Get the label element from the section
        const labelElement = teamMemberSection.querySelector('h3, .section-title');
        let sectionTitle = "Team Members";
        if (labelElement) {
          sectionTitle = labelElement.textContent || "Team Members";
        }
        
        // Create a new container for team members
        const directTeamMemberList = document.createElement('div');
        directTeamMemberList.className = 'pdf-direct-list';
        directTeamMemberList.style.margin = '10px 0';
        directTeamMemberList.style.padding = '10px';
        directTeamMemberList.style.border = '1px solid #e2e8f0';
        directTeamMemberList.style.borderRadius = '4px';
        
        // Add the title
        const title = document.createElement('h3');
        title.textContent = sectionTitle;
        title.style.fontSize = '14px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        directTeamMemberList.appendChild(title);
        
        // Add each team member as a simple line of text
        if (teamMembers.length > 0) {
          teamMembers.forEach((member, index) => {
            const item = document.createElement('div');
            item.style.fontSize = '12px';
            item.style.marginBottom = '4px';
            item.style.lineHeight = '1.2';
            item.textContent = member.name + (member.function ? ` (${member.function})` : '');
            directTeamMemberList.appendChild(item);
          });
        } else {
          const emptyMessage = document.createElement('div');
          emptyMessage.textContent = 'No team members added.';
          emptyMessage.style.fontSize = '12px';
          emptyMessage.style.color = '#64748b';
          emptyMessage.style.fontStyle = 'italic';
          directTeamMemberList.appendChild(emptyMessage);
        }
        
        // Replace the original section with our direct markup
        teamMemberSection.innerHTML = '';
        teamMemberSection.appendChild(directTeamMemberList);
        console.log("Added direct team member markup");
      }
      
      // DIRECT APPROACH: Find the project type, category, and belt level fields
      // First, find all the labels in the document
      const allLabels = clone.querySelectorAll('label');
      let projectTypeContainer = null;
      let projectCategoryContainer = null;
      let projectLeaderBeltContainer = null;
      let coachBeltContainer = null;
      
      // Get both belt level values from the form
      const projectLeaderBeltLevel = charterForm.watch("beltLevel") || "";
      const projectCoachBeltLevel = charterForm.watch("coachBeltLevel") || "";
      
      console.log("PDF Form Values:", {
        projectType: projectTypeValue,
        projectCategory: projectCategoryValue,
        beltLevel: projectLeaderBeltLevel,
        coachBeltLevel: projectCoachBeltLevel
      });
      
      // Look for the labels with relevant text
      let currentSection = "project_leader";
      
      allLabels.forEach(label => {
        if (label.textContent === 'Project Type') {
          projectTypeContainer = label.parentElement;
        } else if (label.textContent === 'Project Category') {
          projectCategoryContainer = label.parentElement;
        } else if (label.textContent === 'Project Leader') {
          // Now we're in the project leader section
          currentSection = "project_leader";
        } else if (label.textContent === 'Project Coach') {
          // Now we're in the project coach section
          currentSection = "project_coach";
        } else if (label.textContent === 'Belt Level') {
          // This could be either for Project Leader or Coach - check which section we're in
          if (currentSection === "project_leader") {
            projectLeaderBeltContainer = label.parentElement;
          } else if (currentSection === "project_coach") {
            coachBeltContainer = label.parentElement;
          }
        }
      });
      
      console.log("Found containers:", { 
        projectTypeContainer: projectTypeContainer ? true : false, 
        projectCategoryContainer: projectCategoryContainer ? true : false,
        projectLeaderBeltContainer: projectLeaderBeltContainer ? true : false,
        coachBeltContainer: coachBeltContainer ? true : false
      });
      
      // Helper function to create value div
      const createValueDiv = (value: string) => {
        const div = document.createElement('div');
        div.style.border = '1px solid #e2e8f0';
        div.style.padding = '8px 12px';
        div.style.marginTop = '5px';
        div.style.borderRadius = '4px';
        div.style.backgroundColor = '#f8fafc';
        div.textContent = value;
        div.className = 'inserted-value'; // Mark as our special insert
        return div;
      };
      
      // Now create and insert values for these fields
      if (projectTypeContainer) {
        // Remove any existing html2canvas-show elements that might be hiding
        const existingShowElements = projectTypeContainer.querySelectorAll('.html2canvas-show');
        existingShowElements.forEach(el => el.remove());
        
        // Add it to the container
        projectTypeContainer.appendChild(createValueDiv(projectTypeValue));
      }
      
      if (projectCategoryContainer) {
        // Remove any existing html2canvas-show elements that might be hiding
        const existingShowElements = projectCategoryContainer.querySelectorAll('.html2canvas-show');
        existingShowElements.forEach(el => el.remove());
        
        // Add it to the container
        projectCategoryContainer.appendChild(createValueDiv(projectCategoryValue));
      }
      
      // Handle project leader belt level field
      if (projectLeaderBeltContainer) {
        // Remove any existing html2canvas-show elements
        const existingShowElements = projectLeaderBeltContainer.querySelectorAll('.html2canvas-show');
        existingShowElements.forEach(el => el.remove());
        
        // Add the value to the container
        projectLeaderBeltContainer.appendChild(createValueDiv(projectLeaderBeltLevel));
        console.log("Setting project leader belt level value:", projectLeaderBeltLevel);
      }
      
      // Handle coach belt level field
      if (coachBeltContainer) {
        // Remove any existing html2canvas-show elements
        const existingShowElements = coachBeltContainer.querySelectorAll('.html2canvas-show');
        existingShowElements.forEach(el => el.remove());
        
        // Add the value to the container
        coachBeltContainer.appendChild(createValueDiv(projectCoachBeltLevel));
        console.log("Setting coach belt level value:", projectCoachBeltLevel);
      }
      
      // Still need to handle any other html2canvas-show elements
      const showElements = clone.querySelectorAll('.html2canvas-show');
      showElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.display = 'block';
          
          // Handle special fields that need the current project values
          const dataField = el.getAttribute('data-field');
          if (dataField === 'projectType') {
            el.textContent = projectTypeValue;
          } else if (dataField === 'projectCategory') {
            el.textContent = projectCategoryValue;
          } else if (dataField === 'beltLevel') {
            el.textContent = projectLeaderBeltLevel;
            console.log("Setting project leader belt level value in PDF:", projectLeaderBeltLevel);
          } else if (dataField === 'coachBeltLevel') {
            el.textContent = projectCoachBeltLevel;
            console.log("Setting coach belt level value in PDF:", projectCoachBeltLevel);
          }
        }
      });
      
      // Specifically handle the costs accordion section if expanded
      const costsSection = clone.querySelector('#project-costs-accordion');
      if (costsSection) {
        // Get the state from the original element to ensure accuracy
        const originalCostsSection = charterElement.querySelector('#project-costs-accordion');
        const isExpanded = originalCostsSection?.getAttribute('data-state') === 'open';
        
        if (isExpanded) {
          console.log("Project costs section is expanded - applying special handling");
          
          // Force the content to be visible
          const content = costsSection.querySelector('[data-orientation="vertical"]');
          if (content) {
            (content as HTMLElement).style.cssText = `
              height: auto !important;
              overflow: visible !important;
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              position: static !important;
              transform: none !important;
              display: block !important;
            `;
            
            // Also make child elements visible
            content.querySelectorAll('*').forEach(child => {
              if (child instanceof HTMLElement) {
                const displayValue = window.getComputedStyle(child).display;
                child.style.cssText += `
                  display: ${displayValue === 'none' ? 'block' : displayValue} !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                `;
              }
            });
          }
        }
      }
      
      // Clean up the styling for PDF output
      clone.querySelectorAll('*').forEach(el => {
        if (el instanceof HTMLElement) {
          // Remove hover effects, transitions, etc.
          el.style.transition = 'none';
          el.style.animation = 'none';
        }
      });
      
      // Create a footer element
      const footer = document.createElement('div');
      footer.style.marginTop = '30px';
      footer.style.borderTop = '1px solid #ddd';
      footer.style.paddingTop = '10px';
      footer.style.textAlign = 'center';
      footer.style.fontSize = '10px';
      footer.style.color = '#666';
      footer.textContent = 'Lean Six Sigma DMAIC Suite™';
      
      // Add the cloned charter to our container
      pdfContainer.appendChild(clone);
      pdfContainer.appendChild(footer);
      
      // Add the container to the document
      document.body.appendChild(pdfContainer);
      
      console.log("PDF container prepared, rendering to canvas");
      
      // Wait a bit for all elements to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Use html2canvas to capture the entire container
        const canvas = await html2canvas(pdfContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false
        });
        
        console.log("Canvas created, size:", canvas.width, "x", canvas.height);
        
        // Create PDF with proper dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });
        
        // PDF dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        // Calculate size ratio to fit on page
        const imgWidth = pdfWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if multiple pages are needed
        if (imgHeight <= pdfHeight - (2 * margin)) {
          // One page is enough
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            margin, margin,
            imgWidth, imgHeight
          );
          
          // Add page number
          pdf.setFontSize(10);
          pdf.setTextColor(150, 150, 150);
          pdf.text('Page 1 of 1', pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        } else {
          // Multiple pages needed
          let remainingHeight = imgHeight;
          let totalPages = Math.ceil(imgHeight / (pdfHeight - (2 * margin)));
          
          let currentPage = 0;
          let position = 0;
          
          while (currentPage < totalPages) {
            if (currentPage > 0) {
              pdf.addPage();
            }
            
            currentPage++;
            
            // Calculate the portion of the image to show on this page
            const pageHeight = Math.min(pdfHeight - (2 * margin), remainingHeight);
            const yPos = position;
            
            // For multipage PDFs, we'll use a different approach
            // Instead of using the clipY parameter which can cause angled display issues,
            // we'll create a new canvas with just the portion we need for this page
            
            const pageCanvasHeight = Math.min(pageHeight * (canvas.width / imgWidth), canvas.height - position * (canvas.width / imgWidth));
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = pageCanvasHeight;
            
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              // Draw only the portion of the original canvas needed for this page
              ctx.drawImage(
                canvas, 
                0, position * (canvas.width / imgWidth), // Source x, y
                canvas.width, pageCanvasHeight, // Source width, height
                0, 0, // Destination x, y
                canvas.width, pageCanvasHeight // Destination width, height
              );
              
              // Now add this specific portion as a new image
              pdf.addImage(
                tempCanvas.toDataURL('image/jpeg', 0.95),
                'JPEG',
                margin, margin,
                imgWidth, pageHeight,
                undefined,
                'SLOW'
              );
            }
            
            // Add page number
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${currentPage} of ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
            
            // Update position and remaining height
            position += pageHeight;
            remainingHeight -= pageHeight;
          }
        }
        
        // Save the PDF
        const filename = `${safeFilename}_Project_Charter_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        pdf.save(filename);
        
        // Show success message
        toast({
          title: "Charter Exported Successfully",
          description: `Your PDF has been downloaded as ${filename}`,
        });
      } catch (error) {
        console.error("PDF export error:", error);
        toast({
          title: "Export Failed",
          description: "Unable to generate PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Clean up the temporary container
        if (pdfContainer && pdfContainer.parentNode) {
          pdfContainer.parentNode.removeChild(pdfContainer);
        }
      }
    } finally {
      isPdfGenerating = false;
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Charter */}
      <Card id="project-charter">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Project Charter</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleExportPdf}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export PDF
            </Button>
          </div>
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
                  <div>
                    <Label htmlFor="projectReferenceNumber">Project Reference Number</Label>
                    <Input
                      id="projectReferenceNumber"
                      placeholder="LSS-2025-001"
                      {...charterForm.register("projectReferenceNumber")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectType">Project Type</Label>
                      {/* Regular select for screen display */}
                      <div className="html2canvas-hide">
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
                      
                      {/* Plain text representation for PDF export */}
                      <div className="html2canvas-show font-normal border rounded-md p-2 mt-1" data-field="projectType">
                        {charterForm.watch("projectType") || "Green Belt"}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="projectCategory">Project Category</Label>
                      {/* Regular select for screen display */}
                      <div className="html2canvas-hide">
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
                      
                      {/* Plain text representation for PDF export */}
                      <div className="html2canvas-show font-normal border rounded-md p-2 mt-1" data-field="projectCategory">
                        {charterForm.watch("projectCategory") || "Process Improvement"}
                      </div>
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
                      {/* Regular select for screen display */}
                      <div className="html2canvas-hide">
                        <Select 
                          onValueChange={(value) => charterForm.setValue("beltLevel", value)}
                          value={charterForm.watch("beltLevel") || ""}
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
                      
                      {/* Plain text representation for PDF export */}
                      <div className="html2canvas-show font-normal border rounded-md p-2 mt-1" data-field="beltLevel">
                        {charterForm.watch("beltLevel") || ""}
                      </div>
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
                  <div className="stakeholder-table-container stakeholder-section">
                    {/* Stakeholder Management Component */}
                    <StakeholderManagement 
                      stakeholders={stakeholders}
                      onChange={setStakeholders}
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
                      {/* Regular select for screen display */}
                      <div className="html2canvas-hide">
                        <Select
                          onValueChange={(value) => charterForm.setValue("coachBeltLevel", value)}
                          value={charterForm.watch("coachBeltLevel") || "None"}
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
                      
                      {/* Plain text representation for PDF export */}
                      <div className="html2canvas-show font-normal border rounded-md p-2 mt-1" data-field="coachBeltLevel">
                        {charterForm.watch("coachBeltLevel") || "None"}
                      </div>
                    </div>
                  </div>
                  <div className="team-member-table-container">
                    {/* Team Members Management Component */}
                    <TeamMemberManagement 
                      teamMembers={teamMembers}
                      onChange={setTeamMembers}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectImage">Project Image</Label>
                  <div id="project-image-section" className="mt-2">
                    {projectImage ? (
                      <div className="relative w-full max-w-md mb-2">
                        {/* Regular display for screen */}
                        <div className="html2canvas-hide">
                          <img
                            src={projectImage}
                            alt="Project"
                            className="w-full h-auto object-contain rounded-md border border-gray-200"
                            style={{ maxHeight: '200px' }}
                            crossOrigin="anonymous"
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
                        
                        {/* Special display for PDF export with original size */}
                        <div className="html2canvas-show">
                          <img
                            src={projectImage}
                            alt="Project"
                            className="object-contain rounded-md border border-gray-200 pdf-project-image"
                            style={{ 
                              width: 'auto', 
                              height: 'auto',
                              maxHeight: '300px', 
                              maxWidth: '100%',
                              display: 'block',
                              margin: '0 auto'
                            }}
                            crossOrigin="anonymous"
                          />
                        </div>
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
                    placeholder="Describe the Business Reason of this project (Why this project?) Describe Why now? Describe What happens if we do not do this project"
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
                
                {/* Milestone Dates Section */}
                <div className="mt-4">
                  <h4 className="text-md font-medium mb-2">Milestone Dates</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="kick_off_date">Kick-Off with team</Label>
                      <Input
                        id="kick_off_date"
                        type="date"
                        {...charterForm.register("kick_off_date")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="define_phase_date">Define Phase</Label>
                      <Input
                        id="define_phase_date"
                        type="date"
                        {...charterForm.register("define_phase_date")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="measure_phase_date">Measure Phase</Label>
                      <Input
                        id="measure_phase_date"
                        type="date"
                        {...charterForm.register("measure_phase_date")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="analyze_phase_date">Analyze Phase</Label>
                      <Input
                        id="analyze_phase_date"
                        type="date"
                        {...charterForm.register("analyze_phase_date")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="improve_phase_date">Improve Phase</Label>
                      <Input
                        id="improve_phase_date"
                        type="date"
                        {...charterForm.register("improve_phase_date")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="control_phase_date">Control Phase</Label>
                      <Input
                        id="control_phase_date"
                        type="date"
                        value={charterForm.watch("control_phase_date") || (currentProject?.targetEndDate ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] : "")}
                        onChange={(e) => charterForm.setValue("control_phase_date", e.target.value)}
                      />
                    </div>
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
                      {/* Only show this part in the UI, not in the PDF */}
                      <div className="html2canvas-hide">
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
                              data-pdf-value={fteParams.workingDaysPerWeek}
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
                              data-pdf-value={fteParams.workingHoursPerDay}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="html2canvas-hide">
                        <Label htmlFor="savedTime" className="text-xs font-medium">Saved Working Time</Label>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <Label htmlFor="timeUnit" className="text-xs">Time Period</Label>
                            <select 
                              id="timeUnit"
                              className="w-full h-8 text-sm border border-gray-300 rounded-md" 
                              value={fteParams.timeUnit}
                              onChange={(e) => handleFteParamChange('timeUnit', e.target.value)}
                              data-pdf-value={fteParams.timeUnit === 'day' ? 'Per Day' : 
                                fteParams.timeUnit === 'week' ? 'Per Week' : 'Per Month'}
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
                              data-pdf-value={fteParams.savedHours}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Show this in both UI and PDF */}
                      <div className="pt-2 border-t border-gray-200 mb-3">
                        <Label className="text-xs font-medium">FTE Benefits</Label>
                        
                        {/* FTE Assumptions for PDF export only */}
                        <div className="html2canvas-show p-3 mt-2 border border-gray-200 rounded-md mb-3">
                          <h4 className="font-medium mb-2">FTE Assumptions</h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium mb-1">Working Days/Week</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm">
                                {fteParams.workingDaysPerWeek}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Working Hours/Day</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm">
                                {fteParams.workingHoursPerDay}
                              </div>
                            </div>
                          </div>
                          
                          <h4 className="font-medium mb-2">Saved Working Time</h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm font-medium mb-1">Time Period</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm">
                                {fteParams.timeUnit === 'day' ? 'Per Day' : 
                                 fteParams.timeUnit === 'week' ? 'Per Week' : 'Per Month'}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Hours Saved</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm">
                                {fteParams.savedHours}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Summary section for PDF export */}
                        <div className="p-3 mt-2 bg-blue-50 border border-blue-200 rounded-md mb-3">
                          <div>
                            <p className="text-sm font-medium">Calculated FTE Value: <span className="text-blue-600 font-bold">{fteParams.calculatedFte.toFixed(3)} FTE</span></p>
                            <p className="text-xs text-gray-600 mt-1">
                              Based on the calculated time saved across the organization
                            </p>
                          </div>
                        </div>
                        
                        {/* FTE Cost and Benefits display for PDF export only */}
                        <div className="html2canvas-show p-3 mt-2 border border-gray-200 rounded-md mb-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium mb-1">FTE Cost per Year ({currency})</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm">
                                {formatCurrency(parseFloat(fteParams.fteCostPerYear.toString()), currency)}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">FTE Benefits ({currency})</p>
                              <div className="p-2 border border-gray-200 rounded-md bg-white text-sm text-green-600">
                                {formatCurrency(fteParams.calculatedValue, currency)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Only in UI controls */}
                        <div className="html2canvas-hide">
                          <div className="grid grid-cols-2 gap-4">
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
                                data-pdf-value={fteParams.fteCostPerYear}
                              />
                            </div>
                            
                            <div>
                              <Label className="text-xs">FTE Benefits ({currency})</Label>
                              <div className="flex h-8 rounded-md border border-input bg-gray-50 text-sm ring-offset-background">
                                <div className="flex items-center px-3 text-green-600">
                                  {formatCurrency(fteParams.calculatedValue, currency)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hidden input field for form submission */}
                    <Input
                      id="fteBenefits"
                      className="hidden hide-in-pdf-fte-summary"
                      data-no-pdf="true"
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
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="softBenefits" className="text-base">Soft Benefits (Non-Quantifiable)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleAddSoftBenefit}
                    disabled={softBenefits.length >= 4} // Allow maximum 4 soft benefits
                  >
                    Add Benefit
                  </Button>
                </div>
                
                {/* Display existing soft benefits in quadrant layout */}
                {softBenefits.length > 0 ? (
                  <CharterSoftBenefitsQuadrant 
                    benefits={softBenefits} 
                    onRemove={handleRemoveSoftBenefit} 
                  />
                ) : (
                  <div className="text-sm text-gray-500 italic mb-3 p-3 border border-dashed rounded-md">
                    No soft benefits added yet. Add benefits that can't be quantified financially.
                  </div>
                )}
                
                <input 
                  type="hidden" 
                  {...charterForm.register("softBenefits")} 
                  value={JSON.stringify(softBenefits)} 
                />
                
                <p className="text-xs text-gray-500 mt-1">
                  Add employee, customer, process, and growth & learning benefits that can't be measured financially. 
                  Maximum {softBenefits.length}/4 benefits.
                </p>
                
                {/* Dialog for adding new soft benefit */}
                <Dialog open={showSoftBenefitDialog} onOpenChange={setShowSoftBenefitDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Soft Benefit</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="benefitCategory">Benefit Category</Label>
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 text-lg bg-gray-50 rounded-md">
                            {getCategoryIcon(newBenefitCategory)}
                          </div>
                          <span className="text-sm">{getCategoryLabel(newBenefitCategory)}</span>
                        </div>
                        <Select 
                          value={newBenefitCategory} 
                          onValueChange={(value) => setNewBenefitCategory(value as SoftBenefit['category'])}
                        >
                          <SelectTrigger id="benefitCategory">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">👥 Employee Benefits</SelectItem>
                            <SelectItem value="customer">🤝 Customer Benefits</SelectItem>
                            <SelectItem value="process">⚙️ Process Benefits</SelectItem>
                            <SelectItem value="growth">📈 Growth & Learning</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="benefitText">Benefit Description</Label>
                        <Textarea 
                          id="benefitText" 
                          value={newBenefitText}
                          onChange={(e) => setNewBenefitText(e.target.value)}
                          placeholder="Describe the soft benefit..."
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowSoftBenefitDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleSaveSoftBenefit}
                        disabled={!newBenefitText.trim()}
                      >
                        Add Benefit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Project Costs & Financial Metrics Section with toggle */}
            <div className="mt-6">
              {/* Section header with toggle button */}
              <div 
                className="flex justify-between items-center p-3 bg-gray-100 rounded-md transition-colors"
              >
                <h3 className="text-lg font-medium">Project Costs & Financial Metrics</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsFinancialSectionExpanded(!isFinancialSectionExpanded)}
                >
                  {isFinancialSectionExpanded ? "Hide Section" : "Show Section"}
                </Button>
              </div>
              
              {/* Collapsible content */}
              <AnimatePresence>
                {isFinancialSectionExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border border-gray-200 border-t-0 rounded-b-md p-4 overflow-hidden"
                  >
                    {/* Project Costs Section */}
                    <div>
                      <h4 className="text-md font-medium mb-3">Project Costs</h4>
                      
                      {/* One-off Project Costs */}
                      <div className="mb-6">
                        <h5 className="text-sm font-medium mb-3 text-gray-700">One-off Project Costs</h5>
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
                            <Label htmlFor="oneOffOtherCost">Other ({currency})</Label>
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
                          <Label htmlFor="oneOffOtherExplanation">Explanation of Other Costs</Label>
                          <Textarea
                            id="oneOffOtherExplanation"
                            placeholder="Explain one-off costs here..."
                            rows={2}
                            {...charterForm.register("oneOffOtherExplanation")}
                          />
                        </div>
                      </div>
                      
                      {/* CAPEX Costs */}
                      <div className="mb-6">
                        <h5 className="text-sm font-medium mb-3 text-gray-700">CAPEX Costs</h5>
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
                    
                    {/* Financial Metrics Section */}
                    <div className="mt-4">
                      <h4 className="text-md font-medium mb-3">Financial Metrics</h4>
                      
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
                  </motion.div>
                )}
              </AnimatePresence>
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
