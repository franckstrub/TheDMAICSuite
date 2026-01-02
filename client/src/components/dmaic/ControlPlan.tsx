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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import type { ControlPlanItem } from "@shared/schema";

interface ControlPlanProps {
  projectId: number;
  projectType: string;
}

interface LocalControlPlanItem {
  id?: number;
  process: string;
  metric: string;
  specification: string;
  measurement: string;
  frequency: string;
  responsible: string;
  reaction: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function ControlPlan({ projectId, projectType }: ControlPlanProps) {
  const { toast } = useToast();
  
  const [localItems, setLocalItems] = useState<LocalControlPlanItem[]>([]);
  
  const { data: itemsData, isLoading } = useQuery<{ items: ControlPlanItem[] }>({
    queryKey: [`/api/projects/${projectId}/control-plan-items`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  useEffect(() => {
    if (itemsData?.items) {
      const items: LocalControlPlanItem[] = itemsData.items.map(item => ({
        id: item.id,
        process: item.process || "",
        metric: item.metric || "",
        specification: item.specification || "",
        measurement: item.measurement || "",
        frequency: item.frequency || "",
        responsible: item.responsible || "",
        reaction: item.reaction || "",
        isNew: false,
        isDirty: false,
      }));
      
      if (items.length === 0) {
        items.push({
          process: "",
          metric: "",
          specification: "",
          measurement: "",
          frequency: "",
          responsible: "",
          reaction: "",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalItems(items);
    } else if (!isLoading && (projectType === 'Black Belt' || projectType === 'Green Belt')) {
      setLocalItems([{
        process: "",
        metric: "",
        specification: "",
        measurement: "",
        frequency: "",
        responsible: "",
        reaction: "",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [itemsData, isLoading, projectType]);

  const createMutation = useMutation({
    mutationFn: async (item: LocalControlPlanItem) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/control-plan-items`, {
        process: item.process,
        metric: item.metric,
        specification: item.specification,
        measurement: item.measurement,
        frequency: item.frequency,
        responsible: item.responsible,
        reaction: item.reaction,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/control-plan-items`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: number; item: LocalControlPlanItem }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/control-plan-items/${id}`, {
        process: item.process,
        metric: item.metric,
        specification: item.specification,
        measurement: item.measurement,
        frequency: item.frequency,
        responsible: item.responsible,
        reaction: item.reaction,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/control-plan-items`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/control-plan-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/control-plan-items`] });
      toast({
        title: "Deleted",
        description: "Control plan item has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete control plan item",
        variant: "destructive",
      });
    },
  });

  const updateLocalItem = (index: number, field: string, value: string) => {
    const newItems = [...localItems];
    newItems[index] = { 
      ...newItems[index], 
      [field]: value,
      isDirty: true,
    };
    setLocalItems(newItems);
  };

  const addNewRow = () => {
    setLocalItems([
      ...localItems,
      {
        process: "",
        metric: "",
        specification: "",
        measurement: "",
        frequency: "",
        responsible: "",
        reaction: "",
        isNew: true,
        isDirty: false,
      }
    ]);
  };

  const removeItem = (index: number) => {
    const item = localItems[index];
    
    if (localItems.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one control plan row must remain",
        variant: "destructive",
      });
      return;
    }
    
    if (item.id) {
      deleteMutation.mutate(item.id);
    } else {
      const newItems = [...localItems];
      newItems.splice(index, 1);
      setLocalItems(newItems);
    }
  };

  const handleSaveAll = async () => {
    try {
      let saveCount = 0;
      
      for (let i = 0; i < localItems.length; i++) {
        const item = localItems[i];
        
        const hasContent = item.process.trim() || item.metric.trim() || item.specification.trim() || 
                          item.measurement.trim() || item.frequency.trim() || item.responsible.trim() || item.reaction.trim();
        
        if (item.isNew && hasContent) {
          await createMutation.mutateAsync(item);
          saveCount++;
        } else if (item.id && item.isDirty) {
          await updateMutation.mutateAsync({ id: item.id, item });
          saveCount++;
        }
      }
      
      if (saveCount > 0) {
        toast({
          title: "Success",
          description: `Control plan has been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
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
        description: "Failed to save control plan",
        variant: "destructive",
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (projectType !== 'Black Belt' && projectType !== 'Green Belt') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Control Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading control plan...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Control Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document how the process will be monitored and controlled to sustain the improvements.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process Step</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead>Measurement Method</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Reaction Plan</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localItems.map((item, index) => (
                  <TableRow key={item.id || `new-${index}`}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.process}
                        onChange={(e) => updateLocalItem(index, "process", e.target.value)}
                        placeholder="Process step..."
                        data-testid={`input-control-process-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.metric}
                        onChange={(e) => updateLocalItem(index, "metric", e.target.value)}
                        placeholder="Metric to monitor"
                        data-testid={`input-control-metric-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.specification}
                        onChange={(e) => updateLocalItem(index, "specification", e.target.value)}
                        placeholder="Target specification"
                        data-testid={`input-control-spec-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.measurement}
                        onChange={(e) => updateLocalItem(index, "measurement", e.target.value)}
                        placeholder="How it's measured"
                        data-testid={`input-control-measurement-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => updateLocalItem(index, "frequency", e.target.value)}
                        placeholder="How often"
                        data-testid={`input-control-frequency-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => updateLocalItem(index, "responsible", e.target.value)}
                        placeholder="Who is responsible"
                        data-testid={`input-control-responsible-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.reaction}
                        onChange={(e) => updateLocalItem(index, "reaction", e.target.value)}
                        placeholder="Action if out of spec"
                        data-testid={`input-control-reaction-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={localItems.length === 1 || deleteMutation.isPending}
                        className={localItems.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                        data-testid={`button-delete-control-item-${index}`}
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
              data-testid="button-add-control-plan-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              data-testid="button-save-control-plan"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Control Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
