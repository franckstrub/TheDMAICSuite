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
import { CheckCircle, XCircle, Clock, Plus, Trash2 } from 'lucide-react';

// Types for our validators and deliverables
type ValidationStatus = "Pending" | "Approved" | "Rejected";

// Interface for the charter object structure
interface Charter {
  id: number;
  projectId: number;
  projectTitle?: string;
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
  validatedDate?: Date | null;
}

interface Deliverable {
  id?: number;
  projectId: number;
  phase: string;
  name: string;
  description?: string | null;
  isRequired: boolean;
  isCompleted: boolean;
}

// Default deliverables for the Define phase
const defaultDefineDeliverables: Omit<Deliverable, "id" | "projectId">[] = [
  {
    phase: "define",
    name: "Project Charter",
    description: "Comprehensive project definition document",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "SIPOC Diagram",
    description: "High Level Process mapping from Suppliers to Customers",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Voice of Customer",
    description: "Voice of Customer (VOC) Requirements, needs and CTQs documentation",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Voice of Business",
    description: "Voice of Business (VOB) Requirements, needs and CTQs documentation",
    isRequired: true,
    isCompleted: false
  },
  
  {
    phase: "define",
    name: "Risk Assessment",
    description: "Initial project risk analysis and mitigation plans",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "RACI Matrix",
    description: "Project RACI (Responsible, Accountable, Consulted, Informed) matrix",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Stakeholder Analysis",
    description: "Project Stakeholder Analysis Matrix",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Gantt Plan",
    description: "Project Gantt Plan",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Elevator Speech",
    description: "Project Elevator Speech",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Gate Review and Validation",
    description: "Project Gate Review and Validation by Sponsor & Key Stakeholders",
    isRequired: true,
    isCompleted: false
  }
];

export default function GateReviewValidation() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const phase = "define"; // This component is for the Define phase
  
  // States for form handling
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [newValidatorName, setNewValidatorName] = useState('');
  const [newValidatorRole, setNewValidatorRole] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [isAddingValidator, setIsAddingValidator] = useState(false);
  
  // Fetch the project charter to get validators
  const { data: charter } = useQuery<CharterResponse>({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!projectId
  });

  // Interfaces for API responses
  interface DeliverablesResponse {
    deliverables: Deliverable[];
  }
  
  interface ValidatorsResponse {
    validators: Validator[];
  }
  
  // Fetch existing deliverables
  const { data: deliverablesData, isLoading: isLoadingDeliverables } = useQuery<DeliverablesResponse>({
    queryKey: [`/api/projects/${projectId}/gate-review-deliverables`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/gate-review-deliverables?phase=${phase}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deliverables');
      }
      return response.json();
    },
    enabled: !!projectId
  });

  // Fetch existing validators
  const { data: validatorsData, isLoading: isLoadingValidators } = useQuery<ValidatorsResponse>({
    queryKey: [`/api/projects/${projectId}/gate-review-validators`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/gate-review-validators?phase=${phase}`);
      if (!response.ok) {
        throw new Error('Failed to fetch validators');
      }
      return response.json();
    },
    enabled: !!projectId
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
          // Create new deliverable
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
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-deliverables`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-validators`] });
      
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

  // Initialize with default deliverables if none exist
  useEffect(() => {
    console.log("Deliverables data received:", deliverablesData);
    if (deliverablesData) {
      if (deliverablesData.deliverables && deliverablesData.deliverables.length === 0) {
        console.log("No deliverables found, using defaults");
        // If no deliverables exist yet, use the defaults
        setDeliverables(
          defaultDefineDeliverables.map(deliverable => ({
            ...deliverable,
            projectId: parseInt(projectId || "0")
          }))
        );
      } else if (deliverablesData.deliverables) {
        console.log("Setting deliverables from data:", deliverablesData.deliverables);
        
        // Keep track of what default deliverables exist in the database
        const existingDefaultNames = new Set<string>();
        const customDeliverables: Deliverable[] = [];
        
        // First identify existing default deliverables and custom deliverables
        deliverablesData.deliverables.forEach((deliverable: Deliverable) => {
          // Check if this is a default deliverable by name
          const isDefault = defaultDefineDeliverables.some(
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
        defaultDefineDeliverables.forEach(defaultDeliverable => {
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
      } else {
        console.log("Deliverables data structure is unexpected:", deliverablesData);
      }
    }
  }, [deliverablesData, projectId]);

  // Initialize validators from charter if none exist
  useEffect(() => {
    console.log("Validators data received:", validatorsData);
    console.log("Charter data:", charter);
    
    if (validatorsData && validatorsData.validators && validatorsData.validators.length > 0) {
      console.log("Setting validators from data:", validatorsData.validators);
      
      // Define the default validator roles in the preferred order
      const standardRoles = ["Sponsor", "Project Leader", "Financial Controller", "Coach"];
      
      // Keep track of all existing validators by role or ID
      const existingStandardByRole = new Map<string, Validator>();
      const customValidators: Validator[] = [];
      
      // First identify standard vs custom validators
      validatorsData.validators.forEach((validator: Validator) => {
        if (standardRoles.includes(validator.validatorRole)) {
          existingStandardByRole.set(validator.validatorRole, validator);
        } else {
          customValidators.push(validator);
        }
      });
      
      // Start building our ordered list with standard validators first
      const orderedValidators: Validator[] = [];
      
      // Add standard validators in their predefined order
      standardRoles.forEach(role => {
        if (existingStandardByRole.has(role)) {
          orderedValidators.push(existingStandardByRole.get(role)!);
        }
      });
      
      // Sort custom validators by ID to preserve their order of addition
      // This maintains consistent ordering even when navigating between pages
      customValidators.sort((a, b) => {
        // If IDs are available, use them to determine insertion order
        if (a.id && b.id) {
          return a.id - b.id;
        }
        // Otherwise, preserve the order from the API response
        return 0;
      });
      
      // Add the custom validators to our ordered list
      orderedValidators.push(...customValidators);
      
      console.log("Ordered validators with preserved custom order:", orderedValidators);
      setValidators(orderedValidators);
    } else if (charter && 'charter' in charter) {
      console.log("No validators found, creating defaults from charter");
      // If no validators exist yet but we have charter data, create default validators
      // from the project charter's key stakeholders
      const defaultValidators: Validator[] = [];
      const charterData = charter.charter;
      
      if (charterData.sponsor) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charterData.sponsor,
          validatorRole: "Sponsor",
          status: "Pending"
        });
      }

      if (charterData.projectLeader) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charterData.projectLeader,
          validatorRole: "Project Leader",
          status: "Pending"
        });
      }

      if (charterData.financialController) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charterData.financialController,
          validatorRole: "Financial Controller",
          status: "Pending"
        });
      }

      if (charterData.projectCoach) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charterData.projectCoach,
          validatorRole: "Coach",
          status: "Pending"
        });
      }

      setValidators(defaultValidators);
    }
  }, [validatorsData, charter, projectId]);

  // Toggle completion status of a deliverable
  const toggleDeliverableCompletion = async (index: number) => {
    try {
      const updatedDeliverables = [...deliverables];
      const deliverable = updatedDeliverables[index];
      deliverable.isCompleted = !deliverable.isCompleted;
      
      // Update in UI immediately for better user experience
      setDeliverables(updatedDeliverables);
      
      if (deliverable.id) {
        // If the deliverable has an ID, update it in the database
        console.log("Updating deliverable completion status:", deliverable);
        await apiRequest('PUT', `/api/gate-review-deliverables/${deliverable.id}`, deliverable);
      }
    } catch (error) {
      console.error("Error toggling deliverable completion:", error);
      toast({
        title: "Error",
        description: "Failed to update deliverable status",
        variant: "destructive"
      });
      
      // Revert the UI change in case of error
      const revertedDeliverables = [...deliverables];
      revertedDeliverables[index].isCompleted = !revertedDeliverables[index].isCompleted;
      setDeliverables(revertedDeliverables);
    }
  };

  // Add a new deliverable directly to the database
  const addDeliverable = async () => {
    if (!newDeliverable.trim()) return;
    
    try {
      const newDeliverableObj: Deliverable = {
        projectId: parseInt(projectId || "0"),
        phase: "define",
        name: newDeliverable,
        description: newDeliverableDescription || null,
        isRequired: false,
        isCompleted: false
      };
      
      console.log("Creating new deliverable:", newDeliverableObj);
      
      // Create the new deliverable directly via API
      await apiRequest('POST', `/api/projects/${projectId}/gate-review-deliverables`, newDeliverableObj);
      
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gate-review-deliverables`] });
      
      // Clear the form
      setNewDeliverable('');
      setNewDeliverableDescription('');
      setIsAddingDeliverable(false);
      
      toast({
        title: "Success",
        description: "New deliverable added successfully",
      });
    } catch (error) {
      console.error("Error adding deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to add deliverable",
        variant: "destructive"
      });
    }
  };

  // Add a new validator
  const addValidator = async () => {
    if (!newValidatorName.trim() || !newValidatorRole.trim()) return;
    
    const newValidatorObj: Validator = {
      projectId: parseInt(projectId || "0"),
      phase: "define",
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
    updatedValidators[index].validatedDate = 
      status !== "Pending" ? new Date() : null;
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
  const deliverableCompletionPercentage = deliverables.length
    ? Math.round((deliverables.filter(d => d.isCompleted).length / deliverables.length) * 100)
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Gate Review and Validation</span>
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
            Review and validate the Define phase deliverables before proceeding to the Measure phase.
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
                    {deliverableCompletionPercentage}% Complete
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
                    <TableHead>Deliverable</TableHead>
                    <TableHead>Description</TableHead>
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
                        {deliverable.isRequired ? (
                          <Badge variant="outline" className="bg-blue-50">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeDeliverable(index)}
                                disabled={deliverable.isRequired}
                                className="h-7 w-7 text-gray-500 hover:text-gray-700 p-1"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {deliverable.isRequired 
                                ? "Required deliverables cannot be removed" 
                                : "Remove deliverable"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <Badge variant="outline" className="bg-gray-50">Optional</Badge>
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
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingDeliverable(true)}
                  className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
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
                Save Deliverables
              </Button>
            </div>
            {/* Validators Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Approvers</h3>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
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
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingValidator(true)}
                  className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 transition-colors"
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