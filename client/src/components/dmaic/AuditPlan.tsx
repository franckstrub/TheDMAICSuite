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
import type { AuditPlanItem } from "@shared/schema";

interface AuditPlanProps {
  projectId: number;
  projectType: string;
}

interface LocalAuditPlanItem {
  id?: number;
  process: string;
  objective: string;
  document: string;
  version: string;
  responsible: string;
  periodicity: string;
  lastcompletion: string;
  findings: string;
  postauditactions: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function AuditPlan({ projectId, projectType }: AuditPlanProps) {
  const { toast } = useToast();
  
  const [localItems, setLocalItems] = useState<LocalAuditPlanItem[]>([]);
  
  const { data: itemsData, isLoading } = useQuery<{ items: AuditPlanItem[] }>({
    queryKey: [`/api/projects/${projectId}/audit-plan-items`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  useEffect(() => {
    if (itemsData?.items) {
      const items: LocalAuditPlanItem[] = itemsData.items.map(item => ({
        id: item.id,
        process: item.process || "",
        objective: item.objective || "",
        document: item.document || "",
        version: item.version || "1.0",
        responsible: item.responsible || "",
        periodicity: item.periodicity || "Yearly",
        lastcompletion: item.lastcompletion || "",
        findings: item.findings || "",
        postauditactions: item.postauditactions || "",
        isNew: false,
        isDirty: false,
      }));
      
      if (items.length === 0) {
        items.push({
          process: "",
          objective: "",
          document: "",
          version: "1.0",
          responsible: "",
          periodicity: "Yearly",
          lastcompletion: "",
          findings: "",
          postauditactions: "",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalItems(items);
    } else if (!isLoading && (projectType === 'Black Belt' || projectType === 'Green Belt')) {
      setLocalItems([{
        process: "",
        objective: "",
        document: "",
        version: "1.0",
        responsible: "",
        periodicity: "Yearly",
        lastcompletion: "",
        findings: "",
        postauditactions: "",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [itemsData, isLoading, projectType]);

  const createMutation = useMutation({
    mutationFn: async (item: LocalAuditPlanItem) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/audit-plan-items`, {
        process: item.process,
        objective: item.objective,
        document: item.document,
        version: item.version,
        responsible: item.responsible,
        periodicity: item.periodicity,
        lastcompletion: item.lastcompletion,
        findings: item.findings,
        postauditactions: item.postauditactions,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/audit-plan-items`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: number; item: LocalAuditPlanItem }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/audit-plan-items/${id}`, {
        process: item.process,
        objective: item.objective,
        document: item.document,
        version: item.version,
        responsible: item.responsible,
        periodicity: item.periodicity,
        lastcompletion: item.lastcompletion,
        findings: item.findings,
        postauditactions: item.postauditactions,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/audit-plan-items`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/audit-plan-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/audit-plan-items`] });
      toast({
        title: "Deleted",
        description: "Audit plan item has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete audit plan item",
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
        objective: "",
        document: "",
        version: "1.0",
        responsible: "",
        periodicity: "Yearly",
        lastcompletion: "",
        findings: "",
        postauditactions: "",
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
        description: "At least one audit plan row must remain",
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
        
        const hasContent = item.process.trim() || item.objective.trim() || item.document.trim() || 
                          item.responsible.trim() || item.findings.trim() || item.postauditactions.trim();
        
        if (item.isNew && hasContent) {
          await createMutation.mutateAsync(item);
          saveCount++;
        } else if (item.id && item.isDirty) {
          await updateMutation.mutateAsync({ id: item.id, item });
          saveCount++;
        }
      }
      
      if (saveCount >= 0) {
        toast({
          title: "Success",
          description: `Audit plan has been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
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
        description: "Failed to save audit plan",
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
          <CardTitle>Audit Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading audit plan...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Audit Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          The Audit Plan outlines the strategy for auditing the improvements made during the DMAIC project. It ensures that the changes are sustainable and that the process remains in control over time.
        </p>
                
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Process</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Periodicity</TableHead>
                <TableHead>Last completion</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Post Audit Actions</TableHead>
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
                      placeholder="Process to audit..."
                      data-testid={`input-audit-process-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.objective}
                      onChange={(e) => updateLocalItem(index, "objective", e.target.value)}
                      placeholder="Objectives of audit"
                      data-testid={`input-audit-objective-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.document}
                      onChange={(e) => updateLocalItem(index, "document", e.target.value)}
                      placeholder="Audit document name"
                      data-testid={`input-audit-document-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.version}
                      onChange={(e) => updateLocalItem(index, "version", e.target.value)}
                      data-testid={`input-audit-version-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.responsible}
                      onChange={(e) => updateLocalItem(index, "responsible", e.target.value)}
                      placeholder="Audit's Responsible"
                      data-testid={`input-audit-responsible-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.periodicity}
                      onValueChange={(value) => updateLocalItem(index, "periodicity", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-audit-periodicity-${index}`}>
                        <SelectValue placeholder="Select periodicity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.lastcompletion}
                      onChange={(e) => updateLocalItem(index, "lastcompletion", e.target.value)}
                      placeholder="Date of last completed audit"
                      data-testid={`input-audit-lastcompletion-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.findings}
                      onChange={(e) => updateLocalItem(index, "findings", e.target.value)}
                      placeholder="Audit's findings"
                      data-testid={`input-audit-findings-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.postauditactions}
                      onChange={(e) => updateLocalItem(index, "postauditactions", e.target.value)}
                      placeholder="Post-Audit Action"
                      data-testid={`input-audit-postauditactions-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={localItems.length === 1 || deleteMutation.isPending}
                      className={localItems.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                      data-testid={`button-delete-audit-item-${index}`}
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
            data-testid="button-add-audit-plan-row"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          <Button 
            onClick={handleSaveAll}
            disabled={isSaving}
            data-testid="button-save-audit-plan"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Audit Plan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
