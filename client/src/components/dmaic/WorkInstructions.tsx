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
import type { WorkInstructionDocument } from "@shared/schema";

interface WorkInstructionsProps {
  projectId: number;
}

interface LocalWorkInstruction {
  id?: number;
  document: string;
  version: string;
  date: string;
  owner: string;
  location: string;
  approver: string;
  status: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function WorkInstructions({ projectId }: WorkInstructionsProps) {
  const { toast } = useToast();
  
  const [localDocs, setLocalDocs] = useState<LocalWorkInstruction[]>([]);
  
  const { data: workInstructionsData, isLoading } = useQuery<{ documents: WorkInstructionDocument[] }>({
    queryKey: [`/api/projects/${projectId}/work-instructions`],
  });

  useEffect(() => {
    if (workInstructionsData?.documents) {
      const docs: LocalWorkInstruction[] = workInstructionsData.documents.map(doc => ({
        id: doc.id,
        document: doc.document || "",
        version: doc.version || "",
        date: doc.date || "",
        owner: doc.owner || "",
        location: doc.location || "",
        approver: doc.approver || "",
        status: doc.status || "Draft",
        isNew: false,
        isDirty: false,
      }));
      
      if (docs.length === 0) {
        docs.push({
          document: "",
          version: "",
          date: "",
          owner: "",
          location: "",
          approver: "",
          status: "Draft",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalDocs(docs);
    } else if (!isLoading) {
      setLocalDocs([{
        document: "",
        version: "",
        date: "",
        owner: "",
        location: "",
        approver: "",
        status: "Draft",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [workInstructionsData, isLoading]);

  const createMutation = useMutation({
    mutationFn: async (doc: LocalWorkInstruction) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/work-instructions`, {
        document: doc.document,
        version: doc.version,
        date: doc.date,
        owner: doc.owner,
        location: doc.location,
        approver: doc.approver,
        status: doc.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-instructions`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, doc }: { id: number; doc: LocalWorkInstruction }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/work-instructions/${id}`, {
        document: doc.document,
        version: doc.version,
        date: doc.date,
        owner: doc.owner,
        location: doc.location,
        approver: doc.approver,
        status: doc.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-instructions`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/work-instructions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-instructions`] });
      toast({
        title: "Deleted",
        description: "Work instruction document has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete work instruction document",
        variant: "destructive",
      });
    },
  });

  const updateLocalDoc = (index: number, field: string, value: string) => {
    const newDocs = [...localDocs];
    newDocs[index] = { 
      ...newDocs[index], 
      [field]: value,
      isDirty: true,
    };
    setLocalDocs(newDocs);
  };

  const addNewRow = () => {
    setLocalDocs([
      ...localDocs,
      {
        document: "",
        version: "",
        date: "",
        owner: "",
        location: "",
        approver: "",
        status: "Draft",
        isNew: true,
        isDirty: false,
      }
    ]);
  };

  const removeDoc = (index: number) => {
    const doc = localDocs[index];
    
    if (localDocs.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one work instruction row must remain",
        variant: "destructive",
      });
      return;
    }
    
    if (doc.id) {
      deleteMutation.mutate(doc.id);
    } else {
      const newDocs = [...localDocs];
      newDocs.splice(index, 1);
      setLocalDocs(newDocs);
    }
  };

  const handleSaveAll = async () => {
    try {
      let saveCount = 0;
      
      for (let i = 0; i < localDocs.length; i++) {
        const doc = localDocs[i];
        
        const hasContent = doc.document.trim() || doc.version.trim() || 
                          doc.owner.trim() || doc.date.trim() || 
                          doc.location.trim() || doc.approver.trim();
        
        if (doc.isNew && hasContent) {
          await createMutation.mutateAsync(doc);
          saveCount++;
        } else if (doc.id && doc.isDirty) {
          await updateMutation.mutateAsync({ id: doc.id, doc });
          saveCount++;
        }
      }
      
      if (saveCount > 0) {
        toast({
          title: "Success",
          description: `Work instructions have been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
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
        description: "Failed to save work instructions",
        variant: "destructive",
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work Instructions and Standardization Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading work instructions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Instructions and Standardization Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Track working instructions and documentation used to standardize the improved process.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Instructions/Standard</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Document Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localDocs.map((doc, index) => (
                  <TableRow key={doc.id || `new-${index}`}>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.document}
                        onChange={(e) => updateLocalDoc(index, "document", e.target.value)}
                        placeholder="Document name..."
                        data-testid={`input-work-instruction-document-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.version}
                        onChange={(e) => updateLocalDoc(index, "version", e.target.value)}
                        placeholder="Version number"
                        data-testid={`input-work-instruction-version-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={doc.date}
                        onChange={(e) => updateLocalDoc(index, "date", e.target.value)}
                        data-testid={`input-work-instruction-date-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.owner}
                        onChange={(e) => updateLocalDoc(index, "owner", e.target.value)}
                        placeholder="Who maintains it"
                        data-testid={`input-work-instruction-owner-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.location}
                        onChange={(e) => updateLocalDoc(index, "location", e.target.value)}
                        placeholder="Where it's stored"
                        data-testid={`input-work-instruction-location-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.approver}
                        onChange={(e) => updateLocalDoc(index, "approver", e.target.value)}
                        placeholder="Who approves it"
                        data-testid={`input-work-instruction-approver-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={doc.status}
                        onValueChange={(value) => updateLocalDoc(index, "status", value)}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-work-instruction-status-${index}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                          <SelectItem value="Active">Approved</SelectItem>
                          <SelectItem value="Obsolete">Obsolete</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDoc(index)}
                        disabled={localDocs.length === 1 || deleteMutation.isPending}
                        className={localDocs.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                        data-testid={`button-delete-work-instruction-${index}`}
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
              data-testid="button-add-work-instruction-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              data-testid="button-save-work-instructions"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Work Instructions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
