import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import type { TrainingPlanElement } from "@shared/schema";

interface TrainingPlanProps {
  projectId: number;
}

interface LocalTrainingElement {
  id?: number;
  topic: string;
  audience: string;
  trainer: string;
  date: string;
  duration: string;
  status: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function TrainingPlan({ projectId }: TrainingPlanProps) {
  const { toast } = useToast();
  
  const [localElements, setLocalElements] = useState<LocalTrainingElement[]>([]);
  
  const { data: trainingData, isLoading } = useQuery<{ elements: TrainingPlanElement[] }>({
    queryKey: [`/api/projects/${projectId}/training-plan`],
  });

  useEffect(() => {
    if (trainingData?.elements) {
      const elements: LocalTrainingElement[] = trainingData.elements.map(el => ({
        id: el.id,
        topic: el.topic || "",
        audience: el.audience || "",
        trainer: el.trainer || "",
        date: el.date || "",
        duration: el.duration || "",
        status: el.status || "Not Scheduled",
        isNew: false,
        isDirty: false,
      }));
      
      if (elements.length === 0) {
        elements.push({
          topic: "",
          audience: "",
          trainer: "",
          date: "",
          duration: "",
          status: "Not Scheduled",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalElements(elements);
    } else if (!isLoading) {
      setLocalElements([{
        topic: "",
        audience: "",
        trainer: "",
        date: "",
        duration: "",
        status: "Not Scheduled",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [trainingData, isLoading]);

  const createMutation = useMutation({
    mutationFn: async (element: LocalTrainingElement) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/training-plan`, {
        topic: element.topic,
        audience: element.audience,
        trainer: element.trainer,
        date: element.date,
        duration: element.duration,
        status: element.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/training-plan`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, element }: { id: number; element: LocalTrainingElement }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/training-plan/${id}`, {
        topic: element.topic,
        audience: element.audience,
        trainer: element.trainer,
        date: element.date,
        duration: element.duration,
        status: element.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/training-plan`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/training-plan/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/training-plan`] });
      toast({
        title: "Deleted",
        description: "Training plan item has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete training plan item",
        variant: "destructive",
      });
    },
  });

  const updateLocalElement = (index: number, field: string, value: string) => {
    const newElements = [...localElements];
    newElements[index] = { 
      ...newElements[index], 
      [field]: value,
      isDirty: true,
    };
    setLocalElements(newElements);
  };

  const addNewRow = () => {
    setLocalElements([
      ...localElements,
      {
        topic: "",
        audience: "",
        trainer: "",
        date: "",
        duration: "",
        status: "Not Scheduled",
        isNew: true,
        isDirty: false,
      }
    ]);
  };

  const removeElement = (index: number) => {
    const element = localElements[index];
    
    if (localElements.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one training plan row must remain",
        variant: "destructive",
      });
      return;
    }
    
    if (element.id) {
      deleteMutation.mutate(element.id);
    } else {
      const newElements = [...localElements];
      newElements.splice(index, 1);
      setLocalElements(newElements);
    }
  };

  const handleSaveAll = async () => {
    try {
      let saveCount = 0;
      
      for (let i = 0; i < localElements.length; i++) {
        const element = localElements[i];
        
        const hasContent = element.topic.trim() || element.audience.trim() || 
                          element.trainer.trim() || element.date.trim() || 
                          element.duration.trim();
        
        if (element.isNew && hasContent) {
          await createMutation.mutateAsync(element);
          saveCount++;
        } else if (element.id && element.isDirty) {
          await updateMutation.mutateAsync({ id: element.id, element });
          saveCount++;
        }
      }
      
      if (saveCount > 0) {
        toast({
          title: "Success",
          description: `Training plan has been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
        });
      } else {
        toast({
          title: "No Changes",
          description: "No changes to save",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save training plan",
        variant: "destructive",
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading training plan...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Training Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document training requirements to ensure staff can maintain the improved process.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Training Topic</TableHead>
                  <TableHead>Target Audience</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localElements.map((item, index) => (
                  <TableRow key={item.id || `new-${index}`}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.topic}
                        onChange={(e) => updateLocalElement(index, "topic", e.target.value)}
                        placeholder="Training topic..."
                        data-testid={`input-training-topic-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.audience}
                        onChange={(e) => updateLocalElement(index, "audience", e.target.value)}
                        placeholder="Who needs training"
                        data-testid={`input-training-audience-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.trainer}
                        onChange={(e) => updateLocalElement(index, "trainer", e.target.value)}
                        placeholder="Who will conduct"
                        data-testid={`input-training-trainer-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateLocalElement(index, "date", e.target.value)}
                        data-testid={`input-training-date-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateLocalElement(index, "duration", e.target.value)}
                        placeholder="Length of training"
                        data-testid={`input-training-duration-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateLocalElement(index, "status", value)}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-training-status-${index}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Scheduled">Not Scheduled</SelectItem>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeElement(index)}
                        disabled={localElements.length === 1 || deleteMutation.isPending}
                        className={localElements.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                        data-testid={`button-delete-training-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              onClick={addNewRow}
              data-testid="button-add-training-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              data-testid="button-save-training-plan"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Training Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
