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
import type { TransferToPOItem } from "@shared/schema";

interface TransferToPOProps {
  projectId: number;
  projectType: string;
}

interface LocalTransferToPOItem {
  id?: number;
  element: string;
  owner: string;
  date: string;
  status: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function TransferToPO({ projectId, projectType }: TransferToPOProps) {
  const { toast } = useToast();
  
  const [localItems, setLocalItems] = useState<LocalTransferToPOItem[]>([]);
  
  const { data: itemsData, isLoading } = useQuery<{ items: TransferToPOItem[] }>({
    queryKey: [`/api/projects/${projectId}/transfer-to-po-items`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  useEffect(() => {
    if (itemsData?.items) {
      const items: LocalTransferToPOItem[] = itemsData.items.map(item => ({
        id: item.id,
        element: item.element || "",
        owner: item.owner || "",
        date: item.date || "",
        status: item.status || "Completed",
        isNew: false,
        isDirty: false,
      }));
      
      if (items.length === 0) {
        items.push({
          element: "",
          owner: "",
          date: "",
          status: "Completed",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalItems(items);
    } else if (!isLoading && (projectType === 'Black Belt' || projectType === 'Green Belt')) {
      setLocalItems([{
        element: "",
        owner: "",
        date: "",
        status: "Completed",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [itemsData, isLoading, projectType]);

  const createMutation = useMutation({
    mutationFn: async (item: LocalTransferToPOItem) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/transfer-to-po-items`, {
        element: item.element,
        owner: item.owner,
        date: item.date,
        status: item.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/transfer-to-po-items`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: number; item: LocalTransferToPOItem }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/transfer-to-po-items/${id}`, {
        element: item.element,
        owner: item.owner,
        date: item.date,
        status: item.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/transfer-to-po-items`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/transfer-to-po-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/transfer-to-po-items`] });
      toast({
        title: "Deleted",
        description: "Transfer item has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transfer item",
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
        element: "",
        owner: "",
        date: "",
        status: "Completed",
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
        description: "At least one transfer item row must remain",
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
        
        const hasContent = item.element.trim() || item.owner.trim() || item.date.trim();
        
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
          description: `Transfer to Process Owner has been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
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
        description: "Failed to save transfer items",
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
          <CardTitle>Transfer to Process Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading transfer items...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transfer to Process Owner</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          The Transfer to Process Owner document outlines the handover of the improved process to the process owner. It ensures that all stakeholders understand their roles and responsibilities in maintaining the process.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Element transferred</TableHead>
                <TableHead>Process owner/Responsible</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item, index) => (
                <TableRow key={item.id || `new-${index}`}>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.element}
                      onChange={(e) => updateLocalItem(index, "element", e.target.value)}
                      placeholder="Element transferred..."
                      data-testid={`input-transfer-element-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.owner}
                      onChange={(e) => updateLocalItem(index, "owner", e.target.value)}
                      placeholder="Process owner/responsible"
                      data-testid={`input-transfer-owner-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(e) => updateLocalItem(index, "date", e.target.value)}
                      data-testid={`input-transfer-date-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(value) => updateLocalItem(index, "status", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-transfer-status-${index}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
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
                      onClick={() => removeItem(index)}
                      disabled={localItems.length === 1 || deleteMutation.isPending}
                      className={localItems.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                      data-testid={`button-delete-transfer-item-${index}`}
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
            data-testid="button-add-transfer-row"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          <Button 
            onClick={handleSaveAll}
            disabled={isSaving}
            data-testid="button-save-transfer-to-po"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Transfer to Process Owner
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
