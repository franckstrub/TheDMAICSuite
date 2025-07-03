import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, Clock, Plus, Trash2, Paperclip, File, Download, ClipboardList, Edit } from 'lucide-react';
import { Project, DeliverableRequirementType, deliverableRequirementTypes } from '@shared/schema';

// Types for our validators and deliverables
type ValidationStatus = "Pending" | "Approved" | "Rejected";

// Interface for the charter object structure
interface Charter {
  id: number;
  projectId: number;
  projectTitle?: string;
  projectType?: string;
  projectLeader?: string;
  sponsor?: string;
  financialController?: string;
  projectCoach?: string;
  // Add other fields as needed
}

// Interface for the charter API response
interface CharterResponse {
  charter: Charter;
}

interface Validator {
  id?: number;
  projectId: number;
  phase: string;
  validatorName: string;
  validatorRole: string;
  status: ValidationStatus;
  comments?: string | null;
  validatedDate?: string | null; // ISO string format for database compatibility
}

interface Deliverable {
  id?: number;
  projectId: number;
  phase: string;
  name: string;
  description?: string | null;
  isRequired: DeliverableRequirementType;
  isCompleted: boolean;
  fileAttachment?: string | null;
  fileOriginalName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
}

// Function to get default deliverables based on project type
const getDefaultcontrolDeliverables = (projectType?: string): Omit<Deliverable, "id" | "projectId">[] => {
  // Base deliverables that apply to all project types
  // Default deliverables for the control phase
 const baseDeliverables: Omit<Deliverable, "id" | "projectId">[] = [
  {
    phase: "control",
    name: "Training plan in place",
    description: "Training plan in place and operators trained",
    isRequired: "Required",
    isCompleted: false
  },
  {
    phase: "control",
    name: "Work Instructions defined",
    description: "Work Instructions defined for new process",
    isRequired: "Required",
    isCompleted: false
  },
  {
    phase: "control",
    name: "Lessons learned defined",
    description: "Lessons learned defined",
    isRequired: "Required",
    isCompleted: false
  },
  {
    phase: "control",
    name: "Gate Review",
    description: "Gate review meeting to proceed to control phase",
    isRequired: "Required",
    isCompleted: false
  }
 ];
 
 // Add Green Belt and Black Belt specific deliverables
  if (projectType === "Green Belt" || projectType === "Black Belt") {
    const greenBeltDeliverables: Omit<Deliverable, "id" | "projectId">[] = [
        {
        phase: "control",
        name: "Control plan & Monitoring plan",
        description: "Control plan and Monitoring plan defined",
        isRequired: "Required",
        isCompleted: false
        },
        {
        phase: "control",
        name: "RACI defined",
        description: "RACI defined for new process",
        isRequired: "Required",
        isCompleted: false
        },
        {
        phase: "control",
        name: "Audit plan defined",
        description: "Audit plan defined and completed",
        isRequired: "Required",
        isCompleted: false
        },
        { 
        phase: "control",
        name: "Transfer to process owner",
        description: "Transfer to process owner completed",
        isRequired: "Required",
        isCompleted: false
        },
        {
        phase: "control",
        name: "Non-financial & financial benefits updated",
        description: "Non-financial & financial benefits updated",
        isRequired: "Required",
        isCompleted: false
        },
    ];

    // Insert Green Belt and Black Belt specific deliverables before the Gate Review
    // This keeps the Gate Review as the last item
    const insertIndex = baseDeliverables.length - 1;
    return [
      ...baseDeliverables.slice(0, insertIndex),
      ...greenBeltDeliverables,
      baseDeliverables[insertIndex]
    ];
  }

  return baseDeliverables;
};

// Function to get default validators for control phase based on charter data
const getDefaultcontrolValidators = (charter?: Charter): Omit<Validator, 'id' | 'projectId'>[] => {
  const defaultValidators: Omit<Validator, 'id' | 'projectId'>[] = [];
  
  if (!charter) {
    return defaultValidators;
  }

  // Only create validators for fields that actually have data
  if (charter.sponsor) {
    defaultValidators.push({
      phase: "control",
      validatorName: charter.sponsor,
      validatorRole: "Sponsor",
      status: "Pending",
      comments: null,
      validatedDate: null
    });
  }

  if (charter.projectLeader) {
    defaultValidators.push({
      phase: "control",
      validatorName: charter.projectLeader,
      validatorRole: "Project Leader",
      status: "Pending",
      comments: null,
      validatedDate: null
    });
  }

  if (charter.financialController) {
    defaultValidators.push({
      phase: "control",
      validatorName: charter.financialController,
      validatorRole: "Financial Controller",
      status: "Pending",
      comments: null,
      validatedDate: null
    });
  }

  if (charter.projectCoach) {
    defaultValidators.push({
      phase: "control",
      validatorName: charter.projectCoach,
      validatorRole: "Coach",
      status: "Pending",
      comments: null,
      validatedDate: null
    });
  }

  return defaultValidators;
};

interface controlGateReviewValidationProps {
  projectId: number;
}
export default function controlGateReviewValidation({ projectId }: controlGateReviewValidationProps) {
  //const { projectId } = useParams();
  const { project_type_in_project } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const phase = "control"; // This component is for the control phase

  // States for form handling
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [newValidatorName, setNewValidatorName] = useState('');
  const [newValidatorRole, setNewValidatorRole] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [newDeliverableRequired, setNewDeliverableRequired] = useState<boolean>(false); // Default to Optional
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [isAddingValidator, setIsAddingValidator] = useState(false);
  const [defaultcontrolDeliverables, setDefaultcontrolDeliverables] = useState<Omit<Deliverable, "id" | "projectId">[]>([]);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null); // Track deliverable ID for which file is being uploaded
  const [isUploading, setIsUploading] = useState(false); // Track upload state
  const fileInputRef = React.useRef<HTMLInputElement>(null); // Hidden file input reference

  // Fetch both project and charter data
  const { data: project } = useQuery<{ project: Project }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId
  });

  const { data: charter } = useQuery<CharterResponse>({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!projectId,
    refetchOnWindowFocus: false
  });

  // Interfaces for API responses
  interface DeliverablesResponse {
    deliverables: Deliverable[];
  }

  interface ValidatorsResponse {
    validators: Validator[];
  }

  // Fetch existing deliverables
  const { data: deliverablesData, isLoading: isLoadingDeliverables, error: deliverablesError } = useQuery<DeliverablesResponse>({
    queryKey: [`/api/projects/${projectId}/gate-review-deliverables`, phase],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/gate-review-deliverables?phase=${phase}`);
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        // If API fails, return empty array to trigger default initialization
        return { deliverables: [] };
      }
      return response.json();
    },
    enabled: !!projectId,
    retry: false // Don't retry failed requests
  });

  // Fetch existing validators
  const { data: validatorsData, isLoading: isLoadingValidators, error: validatorsError } = useQuery<ValidatorsResponse>({
    queryKey: [`/api/projects/${projectId}/gate-review-validators`, phase],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/gate-review-validators?phase=${phase}`);
      if (!response.ok) {
        console.error(`Validators API error: ${response.status} ${response.statusText}`);
        // If API fails, return empty array to trigger default initialization
        return { validators: [] };
      }
      return response.json();
    },
    enabled: !!projectId,
    retry: false // Don't retry failed requests
  });

  // Save data to backend
  const saveData = async () => {
    try {
      // Process all deliverables
      for (const deliverable of deliverables) {
        if (deliverable.id) {
          // Update existing deliverable
          await apiRequest('PUT', `/api/gate-review-deliverables/${deliverable.id}`, deliverable);
        } else {
          // Create new deliverable (including default ones without IDs)
          await apiRequest('POST', `/api/projects/${projectId}/gate-review-deliverables`, deliverable);
        }
      }

      // Process all validators
      for (const validator of validators) {
        if (validator.id) {
          // Update existing validator
          await apiRequest('PUT', `/api/gate-review-validators/${validator.id}`, validator);
        } else {
          // Create new validator
          await apiRequest('POST', `/api/projects/${projectId}/gate-review-validators`, validator);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-deliverables`, phase] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-validators`, phase] });

      toast({
        title: "Success",
        description: "Gate review data saved successfully",
      });
    } catch (error) {
      console.error("Error saving gate review data:", error);
      toast({
        title: "Error",
        description: "Failed to save gate review data",
        variant: "destructive"
      });
    }
  };

  // Initialize gate review with deliverables if they exist else create default deliverables
  // based on project type
  useEffect(() => {
    let projectType;
    //Get project type from charter or Project
    if (charter?.charter) {
      projectType = charter.charter.projectType;
    } else if (project?.project) {
      projectType = project.project.projectType;
    }
    console.log("projectType for deliverables:", projectType);

    // If data is still loading, wait
    if (isLoadingDeliverables || isLoadingValidators) {
      console.log("Still loading data...");
      return;
    }

    // If API failed or returned empty, initialize with defaults
    if (!deliverablesData || !deliverablesData.deliverables || deliverablesData.deliverables.length === 0) {
      console.log("No deliverables found, creating defaults based on project type");
      const controlDefaults = getDefaultcontrolDeliverables(projectType);
      setDefaultcontrolDeliverables(controlDefaults);
      
      // Create defaults with project ID using the fresh control defaults
      const defaultsWithProjectId = controlDefaults.map(deliverable => ({
        ...deliverable,
        projectId: parseInt(projectId || "0")
      }));
      
      setDeliverables(defaultsWithProjectId);
      console.log("Created control phase deliverables:", defaultsWithProjectId.length);
      
      // Initialize validators too
      if (!validatorsData || !validatorsData.validators || validatorsData.validators.length === 0) {
        const defaultValidators = getDefaultcontrolValidators(charter?.charter);
        const validatorsWithProjectId = defaultValidators.map(validator => ({
          ...validator,
          projectId: parseInt(projectId || "0")
        }));
        setValidators(validatorsWithProjectId);
        console.log("Created default validators:", validatorsWithProjectId.length);
      }
      return;
    }

    console.log("Deliverables available:        ", deliverablesData.deliverables.length);
    console.log("Setting deliverables from data:", deliverablesData.deliverables);

    // Get fresh control defaults for comparison
    const controlDefaults = getDefaultcontrolDeliverables(projectType);
    setDefaultcontrolDeliverables(controlDefaults);

    // Keep track of what default deliverables exist in the database
    const existingDefaultNames = new Set<string>();
    const customDeliverables: Deliverable[] = [];

    // First identify existing default deliverables and custom deliverables
    deliverablesData.deliverables.forEach((deliverable: Deliverable) => {
      // Check if this is a default deliverable by name using fresh control defaults
      const isDefault = controlDefaults.some(
        def => def.name === deliverable.name
      );

      if (isDefault) {
        existingDefaultNames.add(deliverable.name);
      } else {
        // This is a custom deliverable, preserve it for later
        customDeliverables.push(deliverable);
      }
    });

    // Start building our ordered list
    const orderedDeliverables: Deliverable[] = [];

    // First add all default deliverables, either from DB or default template
    controlDefaults.forEach(defaultDeliverable => {
      if (existingDefaultNames.has(defaultDeliverable.name)) {
        // Find the existing default deliverable in the database data
        const existingDeliverable = deliverablesData.deliverables.find(
          d => d.name === defaultDeliverable.name
        );

        if (existingDeliverable) {
          orderedDeliverables.push(existingDeliverable);
        }
      } else {
        // Default deliverable doesn't exist in database, add it from template
        orderedDeliverables.push({
          ...defaultDeliverable,
          projectId: parseInt(projectId || "0")
        });
      }
    });

    // Then add custom deliverables in their ORIGINAL order from the database
    // This preserves the insertion order of custom deliverables
    customDeliverables.sort((a, b) => {
      // If IDs are available, use them to determine insertion order
      if (a.id && b.id) {
        return a.id - b.id;
      }
      // Otherwise, preserve the order from the API response
      return 0;
    });

    // Add the custom deliverables to the ordered list
    orderedDeliverables.push(...customDeliverables);

    console.log("Ordered deliverables with preserved custom order:", orderedDeliverables);
    setDeliverables(orderedDeliverables);

    // Also handle validators from existing data
    if (validatorsData && validatorsData.validators && validatorsData.validators.length > 0) {
      console.log("Setting validators from existing data:", validatorsData.validators);
      setValidators(validatorsData.validators);
    } else if (!validatorsData || !validatorsData.validators || validatorsData.validators.length === 0) {
      // Initialize with default validators if none exist
      const defaultValidators = getDefaultcontrolValidators(charter?.charter);
      const validatorsWithProjectId = defaultValidators.map(validator => ({
        ...validator,
        projectId: parseInt(projectId || "0")
      }));
      setValidators(validatorsWithProjectId);
      console.log("Created default control validators:", validatorsWithProjectId.length);
    }
  }, [deliverablesData, validatorsData, projectId, charter, project, isLoadingDeliverables, isLoadingValidators]);



  // Toggle completion status of a deliverable
  const toggleDeliverableCompletion = (index: number) => {
    const updatedDeliverables = [...deliverables];
    updatedDeliverables[index].isCompleted = !updatedDeliverables[index].isCompleted;
    setDeliverables(updatedDeliverables);
  };

  // Track when a new deliverable is added for auto-save
  const [newDeliverableAdded, setNewDeliverableAdded] = useState<boolean>(false);

  // Auto-save when a new deliverable is added
  useEffect(() => {
    if (newDeliverableAdded) {
      console.log("Auto-saving after new deliverable was added");
      saveData();
      setNewDeliverableAdded(false);
    }
  }, [newDeliverableAdded]);

  // Add a new deliverable
  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;

    const newDeliverableObj: Deliverable = {
      projectId: parseInt(projectId || "0"),
      phase: "control",
      name: newDeliverable,
      description: newDeliverableDescription || null,
      isRequired: "Added by User", // All user-added deliverables have this status
      isCompleted: false
    };

    setDeliverables([...deliverables, newDeliverableObj]);
    setNewDeliverable('');
    setNewDeliverableDescription('');
    setNewDeliverableRequired(false); // Keep this for form reset but ignore the value
    setIsAddingDeliverable(false);

    // Trigger auto-save
    setNewDeliverableAdded(true);
  };

  // Add a new validator
  const addValidator = async () => {
    if (!newValidatorName.trim() || !newValidatorRole.trim()) return;

    const newValidatorObj: Validator = {
      projectId: parseInt(projectId || "0"),
      phase: "control",
      validatorName: newValidatorName,
      validatorRole: newValidatorRole,
      status: "Pending"
    };

    try {
      console.log("Creating new validator:", newValidatorObj);

      // Create the new validator directly via API
      const response = await apiRequest('POST', `/api/projects/${projectId}/gate-review-validators`, newValidatorObj);

      console.log("New validator created:", response);

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-validators`] });

      // Clear the form
      setNewValidatorName('');
      setNewValidatorRole('');
      setIsAddingValidator(false);

      toast({
        title: "Success",
        description: "New validator added successfully",
      });
    } catch (error) {
      console.error("Error adding validator:", error);
      toast({
        title: "Error",
        description: "Failed to add validator",
        variant: "destructive"
      });
    }
  };

  // Update validator status
  const updateValidatorStatus = (index: number, status: ValidationStatus) => {
    const updatedValidators = [...validators];
    updatedValidators[index].status = status;

    // Set validated date only for Approved or Rejected
    // Make sure to pass the date as an ISO string which the database can handle
    if (status !== "Pending") {
      const now = new Date();
      updatedValidators[index].validatedDate = now.toISOString();
    } else {
      updatedValidators[index].validatedDate = null;
    }

    setValidators(updatedValidators);
  };

  // Update validator comments
  const updateValidatorComments = (index: number, comments: string) => {
    const updatedValidators = [...validators];
    updatedValidators[index].comments = comments;
    setValidators(updatedValidators);
  };

  // Remove a validator
  const removeValidator = async (index: number) => {
    const validatorToRemove = validators[index];

    if (!validatorToRemove) return;

    try {
      if (validatorToRemove.id) {
        // If the validator has an ID, it exists in the database and must be deleted
        console.log("Deleting validator from database:", validatorToRemove);
        await apiRequest('DELETE', `/api/gate-review-validators/${validatorToRemove.id}`, {});

        // After successful deletion from database, refresh the data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-validators`] });

        toast({
          title: "Success",
          description: "Validator removed successfully",
        });
      } else {
        // Validator only exists in local state, just remove it from state
        const updatedValidators = [...validators];
        updatedValidators.splice(index, 1);
        setValidators(updatedValidators);
      }
    } catch (error) {
      console.error("Error removing validator:", error);
      toast({
        title: "Error",
        description: "Failed to remove validator",
        variant: "destructive"
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (deliverableId: number) => {
    setUploadingFor(deliverableId);
    fileInputRef.current?.click();
  };

  // Handle file change from input
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size exceeds 10MB limit",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (uploadingFor) {
        formData.append('deliverableId', uploadingFor.toString());
      }
      
      // Upload file
      const response = await fetch(`/api/projects/${projectId}/deliverable-file-upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('File upload failed');
      }
      
      const result = await response.json();
      
      // Update UI after successful upload
      if (result.success && uploadingFor) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-deliverables`] });
        
        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadingFor(null);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Download attached file
  const downloadFile = async (deliverableId: number) => {
    try {
      window.open(`/api/deliverable-file/${deliverableId}`, '_blank');
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  // Remove a deliverable
  const removeDeliverable = async (index: number) => {
    const deliverableToRemove = deliverables[index];

    if (!deliverableToRemove) return;

    try {
      if (deliverableToRemove.id) {
        // If the deliverable has an ID, it exists in the database and must be deleted
        console.log("Deleting deliverable from database:", deliverableToRemove);
        await apiRequest('DELETE', `/api/gate-review-deliverables/${deliverableToRemove.id}`, {});

        // After successful deletion from database, refresh the data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-deliverables`] });

        toast({
          title: "Success",
          description: "Deliverable removed successfully",
        });
      } else {
        // Deliverable only exists in local state, just remove it from state
        const updatedDeliverables = [...deliverables];
        updatedDeliverables.splice(index, 1);
        setDeliverables(updatedDeliverables);
      }
    } catch (error) {
      console.error("Error removing deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to remove deliverable",
        variant: "destructive"
      });
    }
  };

  // Function to get status icon
  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "Rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  // Function to get status badge
  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };

  // Calculate completion percentage
  // const deliverableCompletionPercentage = deliverables.length
  //   ? Math.round((deliverables.filter(d => d.isCompleted).length / deliverables.length) * 100)
  //   : 0;
// Calculate completion percentage
  const requiredDeliverables = deliverables.filter(d => d.isRequired !== "Optional");
  const completedRequiredDeliverables = deliverables.filter(d => d.isCompleted && d.isRequired !== "Optional");
  const deliverableCompletionPercentage = requiredDeliverables.length > 0
    ? Math.round((completedRequiredDeliverables.length / requiredDeliverables.length) * 100) 
    : 0;

  // Overall validation status
  const overallApproved = validators.length > 0 && 
    validators.every(v => v.status === "Approved");
  const someRejected = validators.some(v => v.status === "Rejected");
  const allPending = validators.length > 0 && 
    validators.every(v => v.status === "Pending");

  let overallStatus = "Pending";
  if (overallApproved) overallStatus = "Approved";
  else if (someRejected) overallStatus = "Rejected";

  return (
    <div className="space-y-6">
      {/* Hidden file input for document uploads */}
      <input 
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="*/*" // Allow all file types
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              <span>Gate Review and Validation</span>
            </div>
            <Badge className={`px-3 py-1 ${
              overallStatus === "Approved" 
                ? "bg-green-100 text-green-800" 
                : overallStatus === "Rejected"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {overallStatus}
            </Badge>
          </CardTitle>
          <CardDescription>
            Review and validate the Control phase deliverables before proceeding to the project Closure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Deliverables Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Deliverables</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {deliverableCompletionPercentage}% Completed Review
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${deliverableCompletionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead className="w-40">Deliverable</TableHead>
                    <TableHead className="w-80">Description</TableHead>
                    <TableHead className="w-24">Required</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliverables.map((deliverable, index) => (
                    <TableRow key={deliverable.id || index}>
                      <TableCell>
                        <Checkbox
                          checked={deliverable.isCompleted}
                          onCheckedChange={() => toggleDeliverableCompletion(index)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{deliverable.name}</TableCell>
                      <TableCell>{deliverable.description}</TableCell>
                      <TableCell>
                        {deliverable.isRequired === "Required" && (
                          <Badge variant="outline" className="bg-blue-50">Required</Badge>
                        )}
                        {deliverable.isRequired === "Optional" && (
                          <Badge variant="outline" className="bg-gray-50">Optional</Badge>
                        )}
                        {deliverable.isRequired === "Added by User" && (
                          <Badge variant="outline" className="bg-green-50 text-green-800">Added by User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {/* File upload/download buttons - only show for user-added deliverables or if file already exists */}
                          {deliverable.id && (
                            <>
                              {/* If file exists, always show download button */}
                              {deliverable.fileAttachment ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="h-7 w-7 text-gray-500 hover:text-blue-500 p-1"
                                        onClick={() => downloadFile(deliverable.id!)}
                                      >
                                        <i className="fas fa-file-download"></i>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Download {deliverable.fileOriginalName || 'file'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                /* Only show paperclip for user-added deliverables if no file exists */
                                deliverable.isRequired === "Added by User" && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-7 w-7 text-gray-500 hover:text-blue-500 p-1"
                                          onClick={() => handleFileUpload(deliverable.id!)}
                                          disabled={isUploading}
                                        >
                                          <Paperclip className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Attach document (10MB limit)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )
                              )}
                            </>
                          )}
                          
                          {/* Remove button - only enabled for Added by User deliverables */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeDeliverable(index)}
                                  disabled={deliverable.isRequired !== "Added by User"}
                                  className="h-7 w-7 text-gray-500 hover:text-gray-700 p-1"
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {deliverable.isRequired !== "Added by User"
                                  ? "Only user-added deliverables can be removed" 
                                  : "Remove deliverable"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Add new deliverable row */}
                  {isAddingDeliverable && (
                    <TableRow>
                      <TableCell>
                        <Checkbox disabled checked={false} />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Deliverable name"
                          value={newDeliverable}
                          onChange={(e) => setNewDeliverable(e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Description"
                          value={newDeliverableDescription}
                          onChange={(e) => setNewDeliverableDescription(e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-800">Added by User</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsAddingDeliverable(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={addDeliverable}
                          >
                            Add Deliverable
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Add Deliverable button moved to below the table */}
              <div className="mt-4 mb-4 flex justify-start">
                <Button 
                  variant={isAddingDeliverable ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingDeliverable(true)}
                  disabled={isAddingDeliverable}
                  className={isAddingDeliverable 
                    ? "mt-4 bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-not-allowed" 
                    : "mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Deliverable
                </Button>
              </div>
            </div>
            {/* Save Button */}
            <div className="flex justify-start mt-6">
              <Button 
                onClick={saveData}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Save Gate Review
              </Button>
            </div>
            {/* Validators Section */}
            <div>
              <div className="flex gap-2 items-center mb-3">
                <Edit className="h-5 w-5" />                
                <h3 className="text-lg font-medium">Approvers</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[120px]">Validation Date</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validators.map((validator, index) => (
                    <TableRow key={validator.id || index}>
                      <TableCell className="font-medium">
                        {validator.validatorName}
                      </TableCell>
                      <TableCell>{validator.validatorRole}</TableCell>
                      <TableCell>
                        <Select
                          defaultValue={validator.status}
                          onValueChange={(value: ValidationStatus) => 
                            updateValidatorStatus(index, value)
                          }
                        >
                          <SelectTrigger className="w-[130px]">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(validator.status as ValidationStatus)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Status</SelectLabel>
                              <SelectItem value="Pending">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-amber-500" />
                                  Pending
                                </div>
                              </SelectItem>
                              <SelectItem value="Approved">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  Approved
                                </div>
                              </SelectItem>
                              <SelectItem value="Rejected">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  Rejected
                                </div>
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {validator.status !== "Pending" && validator.validatedDate ? (
                          <span className="text-sm">
                            {new Date(validator.validatedDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Add comments"
                          value={validator.comments || ""}
                          onChange={(e) => updateValidatorComments(index, e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeValidator(index)}
                          className="h-7 w-7 text-gray-500 hover:text-gray-700 p-1"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Add new validator row */}
                  {isAddingValidator && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Validator name"
                          value={newValidatorName}
                          onChange={(e) => setNewValidatorName(e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Role"
                          value={newValidatorRole}
                          onChange={(e) => setNewValidatorRole(e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        {getStatusBadge("Pending")}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-400 text-sm">—</span>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          disabled
                          placeholder="Add comments after creation"
                          className="min-h-[80px] resize-none"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsAddingValidator(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={addValidator}
                          >
                            Add
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-start items-center mb-3">
                <Button 
                  variant={isAddingValidator? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingValidator(true)}
                  disabled={isAddingValidator}
                  className={isAddingValidator 
                    ? "mt-4 bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-not-allowed" 
                    : "mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
                  }
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Approver
                </Button>  
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-start mt-6">
              <Button 
                onClick={saveData}
                className="bg-primary text-white hover:bg-primary/90"
              >
                Save Gate Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}