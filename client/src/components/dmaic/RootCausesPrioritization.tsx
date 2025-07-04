import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PlusCircle, Table2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CTQrootcause {
  id?: number;
  rootcause: string;
  multivotescore: number;
  criticalrootcause: boolean;
  firstwhy: string;
  secondwhy: string;
  thirdwhy: string;
  fourthwhy: string;
  fifthwhy: string;
}

interface RootCausesPrioritizationProps {
  projectId: number;
  ctqId: number;
  onSave?: (data: string) => void;
}

export default function RootCausesPrioritization({ projectId, ctqId, onSave }: RootCausesPrioritizationProps) {
  const { toast } = useToast();
  const [CTQrootcauses, setCTQrootcauses] = useState<CTQrootcause[]>([]);
  const [deletingCtqrootcauseIndex, setDeletingCtqrootcauseIndex] = useState<number | null>(null);
  const updateCTQrootcause = (index: number, field: keyof CTQrootcause, value: string) => {
    const newCTQrootcauses = [...CTQrootcauses];
    
    // Validate and convert numeric fields
    if (field === 'multivotescore') {
      const numValue = parseFloat(value);
      if (value !== "" && !isNaN(numValue) && numValue < 0) {
        toast({
          title: "Validation Error",
          description: "Multi-vote score is not a positive number",
          variant: "destructive",
        });
        return;
      }
      // Convert to number for storage
      newCTQrootcauses[index] = { 
        ...newCTQrootcauses[index], 
        [field]: value === "" ? 0 : numValue
      };
    } else {
      newCTQrootcauses[index] = { 
        ...newCTQrootcauses[index], 
        [field]: value 
      };
    }
    
    setCTQrootcauses(newCTQrootcauses);
  };

  const addCTQrootcause = () => {
    setCTQrootcauses([
      ...CTQrootcauses,
      {
        rootcause: "",
        multivotescore: 0,
        criticalrootcause: false,
        firstwhy: "",
        secondwhy: "",
        thirdwhy: "",
        fourthwhy: "",
        fifthwhy: "",
      }
    ]);
  };

  // Root cause deletion mutation
  const deleteRootCauseMutation = useMutation({
    mutationFn: async (rootcauseId: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics/${rootcauseId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Root cause deleted successfully",
      });
      // Invalidate the root causes query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete root cause",
        variant: "destructive",
      });
    },
  });

  const handleConfirmDelete = async () => {
    if (deletingCtqrootcauseIndex === null) return;
    
    const rootcause = CTQrootcauses[deletingCtqrootcauseIndex];
    
    if (rootcause.id) {
      try {
        await deleteRootCauseMutation.mutateAsync(rootcause.id);
        performLocalDeletion(deletingCtqrootcauseIndex);
      } catch (error) {
        // Error is handled by the mutation
      }
    } else {
      performLocalDeletion(deletingCtqrootcauseIndex);
    }
    
    setDeletingCtqrootcauseIndex(null);
  };
  
  const handleCancelDelete = () => {
    setDeletingCtqrootcauseIndex(null);
  };

  const handleSave = () => {
    // Filter out empty characteristics and convert numeric fields
    const validCTQrootcauses = CTQrootcauses
      .filter(char => char.rootcause.trim() !== "")
      .map(char => ({
        ...char,
        // Keep as strings for the mutation but ensure valid values
        multivotescore: char.multivotescore,
      }));
    saveMutation.mutate(validCTQrootcauses);
  };

  // Fetch existing root cause data
  const { data: rootCausesData, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics`);
      if (!response.ok) {
        throw new Error('Failed to fetch root causes');
      }
      return response.json();
    },
  });

  // Initialize state when data is loaded
  useEffect(() => {
    if (rootCausesData?.rootCauses) {
      setCTQrootcauses(rootCausesData.rootCauses);
    } else if (!isLoading && (!rootCausesData?.rootCauses || rootCausesData.rootCauses.length === 0)) {
      // Initialize with empty root cause if no data exists
      setCTQrootcauses([{
        rootcause: "",
        multivotescore: 0,
        criticalrootcause: false,
        firstwhy: "",
        secondwhy: "",
        thirdwhy: "",
        fourthwhy: "",
        fifthwhy: "",
      }]);
    }
  }, [rootCausesData, isLoading]);

  // Save root causes mutation
    const saveMutation = useMutation({
      mutationFn: async (data: CTQrootcause[]) => {
        const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rootCauses: data }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save Root Cause characteristics: ${response.statusText}`);
        }
        
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Root Cause characteristics saved successfully",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/rootcause-characteristics`] });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to save Root Cause characteristics",
          variant: "destructive",
        });
      },
    });

    // Toggle Root Cause Criticality
  const toggleRootCauseCriticality = (index: number) => {
    const updatedCTQrootcauses = [...CTQrootcauses];
    updatedCTQrootcauses[index].criticalrootcause = !updatedCTQrootcauses[index].criticalrootcause;
    setCTQrootcauses(updatedCTQrootcauses);
  };

  const removeCTQrootcause = (index: number) => {
    const CTQrootcause = CTQrootcauses[index];
    
    // If the CTQ has an ID (exists in database), show confirmation dialog
    if (CTQrootcause.id) {
      setDeletingCtqrootcauseIndex(index);
    } else {
      // For new CTQs without ID, delete immediately
      performLocalDeletion(index);
    }
  };

    const performLocalDeletion = (index: number) => {
    const newCTQrootcauses = CTQrootcauses.filter((_, i) => i !== index);
    
    // If we're removing the last characteristic, add an empty one for manual entry
    if (newCTQrootcauses.length === 0) {
      newCTQrootcauses.push({
        rootcause: "",
        multivotescore: 0,
        criticalrootcause: false,
        firstwhy: "",
        secondwhy: "",
        thirdwhy: "",
        fourthwhy: "",
        fifthwhy: "",
      });
    }
    
    setCTQrootcauses(newCTQrootcauses);
  };

  return (
    <div className="w-full mt-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="h-5 w-5" />
          Root Causes Prioritization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Prioritize the Root Causes defined in your Fishbone diagram with Multi-Vote score and complete 5 Why analysis.<br />
        </p>        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              {/* Scroll indicator */}
            <th className="relative top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
              ← Scroll horizontally →
            </th>
              <tr>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Root Cause</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th className="px-0 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Critical Root Cause</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">1st Why?</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2nd Why?</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">3rd Why?</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">4th Why?</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">5th Why?</th>
                <th className="px-0 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {CTQrootcauses.map((CTQrootcause, index) => (
                <tr key={index}>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter Root Cause"
                    value={CTQrootcause.rootcause}
                    onChange={(e) => updateCTQrootcause(index, 'rootcause', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-1 py-3">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Enter Multi-Vote score"
                      value={CTQrootcause.multivotescore}
                      onChange={(e) => updateCTQrootcause(index, 'multivotescore', e.target.value)}
                      className="min-w-[50px] min-h-[60px]"
                    />
                  </td>
                  <td className="px-7 py-3">
                    <Checkbox
                      checked={CTQrootcause.criticalrootcause}
                      onCheckedChange={() => toggleRootCauseCriticality(index)}
                    />
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter 1st Why analysis"
                    value={CTQrootcause.firstwhy}
                    onChange={(e) => updateCTQrootcause(index, 'firstwhy', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter 2nd Why analysis"
                    value={CTQrootcause.secondwhy}
                    onChange={(e) => updateCTQrootcause(index, 'secondwhy', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter 3rd Why analysis"
                    value={CTQrootcause.thirdwhy}
                    onChange={(e) => updateCTQrootcause(index, 'thirdwhy', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter 4th Why analysis"
                    value={CTQrootcause.fourthwhy}
                    onChange={(e) => updateCTQrootcause(index, 'fourthwhy', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap">
                  <Textarea
                    placeholder="Enter 5th Why analysis"
                    value={CTQrootcause.fifthwhy}
                    onChange={(e) => updateCTQrootcause(index, 'fifthwhy', e.target.value)}
                    className="w-full min-w-[200px] min-h-[60px]"
                  />
                  </td>
                  <td className="px-0 py-3 whitespace-nowrap text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCTQrootcause(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <i className="fas fa-trash"></i>
                      {/* <Trash2 className="h-4 w-4" /> */}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={addCTQrootcause}
            className="flex items-center space-x-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Root Cause</span>
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Root Causes Prioritization table"}
          </Button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Root Causes must be defined by User. Use the Fishbone diagram to find them</p>
        </div>

        {/* CTQ Deletion Confirmation Dialog */}
        <AlertDialog 
        open={deletingCtqrootcauseIndex !== null} onOpenChange={() => setDeletingCtqrootcauseIndex(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Delete CTQ - Data Loss Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  You are about to delete the Root Cause "{deletingCtqrootcauseIndex !== null ? CTQrootcauses[deletingCtqrootcauseIndex]?.rootcause : ''}"
                  and all its associated data.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="font-medium text-red-800 mb-2">This action will permanently delete:</p>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• All information for this Root Cause</li>                    
                  </ul>
                </div>
                <p className="font-medium">
                  This action cannot be undone. Are you sure you want to continue?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
              onClick={handleCancelDelete}>
                Cancel
              </AlertDialogCancel>
              
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteRootCauseMutation.isPending}
              >
                {deleteRootCauseMutation.isPending ? "Deleting..." : "Delete Root Cause"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
    </div>
      
  );
}