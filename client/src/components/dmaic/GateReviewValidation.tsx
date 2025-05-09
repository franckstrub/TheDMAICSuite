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
    description: "Process mapping from Suppliers to Customers",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Customer Requirements",
    description: "Voice of Customer (VOC) documentation",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Business Requirements",
    description: "Voice of Business (VOB) documentation",
    isRequired: true,
    isCompleted: false
  },
  {
    phase: "define",
    name: "Risk Assessment",
    description: "Initial project risk analysis and mitigation plans",
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
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!projectId
  });

  // Fetch existing deliverables
  const { data: deliverablesData, isLoading: isLoadingDeliverables } = useQuery({
    queryKey: [`/api/projects/${projectId}/gate-review-deliverables`, phase],
    enabled: !!projectId
  });

  // Fetch existing validators
  const { data: validatorsData, isLoading: isLoadingValidators } = useQuery({
    queryKey: [`/api/projects/${projectId}/gate-review-validators`, phase],
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
    if (deliverablesData) {
      if (deliverablesData.deliverables.length === 0) {
        // If no deliverables exist yet, use the defaults
        setDeliverables(
          defaultDefineDeliverables.map(deliverable => ({
            ...deliverable,
            projectId: parseInt(projectId || "0")
          }))
        );
      } else {
        setDeliverables(deliverablesData.deliverables);
      }
    }
  }, [deliverablesData, projectId]);

  // Initialize validators from charter if none exist
  useEffect(() => {
    if (validatorsData) {
      setValidators(validatorsData.validators);
    } else if (charter && charter.charter) {
      // If no validators exist yet but we have charter data, create default validators
      // from the project charter's key stakeholders
      const defaultValidators: Validator[] = [];
      
      if (charter.charter.sponsor) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charter.charter.sponsor,
          validatorRole: "Sponsor",
          status: "Pending"
        });
      }

      if (charter.charter.projectLeader) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charter.charter.projectLeader,
          validatorRole: "Project Leader",
          status: "Pending"
        });
      }

      if (charter.charter.financialController) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charter.charter.financialController,
          validatorRole: "Financial Controller",
          status: "Pending"
        });
      }

      if (charter.charter.projectCoach) {
        defaultValidators.push({
          projectId: parseInt(projectId || "0"),
          phase: "define",
          validatorName: charter.charter.projectCoach,
          validatorRole: "Coach",
          status: "Pending"
        });
      }

      setValidators(defaultValidators);
    }
  }, [validatorsData, charter, projectId]);

  // Toggle completion status of a deliverable
  const toggleDeliverableCompletion = (index: number) => {
    const updatedDeliverables = [...deliverables];
    updatedDeliverables[index].isCompleted = !updatedDeliverables[index].isCompleted;
    setDeliverables(updatedDeliverables);
  };

  // Add a new deliverable
  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    
    const newDeliverableObj: Deliverable = {
      projectId: parseInt(projectId || "0"),
      phase: "define",
      name: newDeliverable,
      description: newDeliverableDescription || null,
      isRequired: false,
      isCompleted: false
    };
    
    setDeliverables([...deliverables, newDeliverableObj]);
    setNewDeliverable('');
    setNewDeliverableDescription('');
    setIsAddingDeliverable(false);
  };

  // Add a new validator
  const addValidator = () => {
    if (!newValidatorName.trim() || !newValidatorRole.trim()) return;
    
    const newValidatorObj: Validator = {
      projectId: parseInt(projectId || "0"),
      phase: "define",
      validatorName: newValidatorName,
      validatorRole: newValidatorRole,
      status: "Pending"
    };
    
    setValidators([...validators, newValidatorObj]);
    setNewValidatorName('');
    setNewValidatorRole('');
    setIsAddingValidator(false);
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
  const removeValidator = (index: number) => {
    const updatedValidators = [...validators];
    updatedValidators.splice(index, 1);
    setValidators(updatedValidators);
  };

  // Remove a deliverable
  const removeDeliverable = (index: number) => {
    const updatedDeliverables = [...deliverables];
    updatedDeliverables.splice(index, 1);
    setDeliverables(updatedDeliverables);
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAddingDeliverable(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
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
                              >
                                <Trash2 className="w-4 h-4 text-gray-500" />
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
                            Add
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Validators Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Validators</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingValidator(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Validator
                </Button>
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
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
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
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <Button 
                onClick={saveData}
                className="bg-blue-600 hover:bg-blue-700"
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