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
import { Save, Loader2 } from "lucide-react";
import type { FinancialBenefitsItem } from "@shared/schema";

interface FinancialBenefitsValidationProps {
  projectId: number;
  projectType: string;
}

const DEFAULT_BENEFIT_TYPES = [
  "Quality Costs Savings",
  "FTE Benefits",
  "Working Capital Savings",
  "Financial Savings",
];

interface LocalFinancialBenefitsItem {
  id?: number;
  typeofBenefits: string;
  benefits: string;
  comments: string;
  validation: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function FinancialBenefitsValidation({ projectId, projectType }: FinancialBenefitsValidationProps) {
  const { toast } = useToast();
  
  const [localItems, setLocalItems] = useState<LocalFinancialBenefitsItem[]>([]);
  
  const { data: itemsData, isLoading } = useQuery<{ items: FinancialBenefitsItem[] }>({
    queryKey: [`/api/projects/${projectId}/financial-benefits-items`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  useEffect(() => {
    if (itemsData?.items) {
      if (itemsData.items.length > 0) {
        const items: LocalFinancialBenefitsItem[] = itemsData.items.map(item => ({
          id: item.id,
          typeofBenefits: item.typeofBenefits || "",
          benefits: item.benefits || "",
          comments: item.comments || "",
          validation: item.validation || "No",
          isNew: false,
          isDirty: false,
        }));
        setLocalItems(items);
      } else {
        const defaultItems: LocalFinancialBenefitsItem[] = DEFAULT_BENEFIT_TYPES.map(type => ({
          typeofBenefits: type,
          benefits: "",
          comments: "",
          validation: "No",
          isNew: true,
          isDirty: false,
        }));
        setLocalItems(defaultItems);
      }
    } else if (!isLoading && (projectType === 'Black Belt' || projectType === 'Green Belt')) {
      const defaultItems: LocalFinancialBenefitsItem[] = DEFAULT_BENEFIT_TYPES.map(type => ({
        typeofBenefits: type,
        benefits: "",
        comments: "",
        validation: "No",
        isNew: true,
        isDirty: false,
      }));
      setLocalItems(defaultItems);
    }
  }, [itemsData, isLoading, projectType]);

  const createMutation = useMutation({
    mutationFn: async (item: LocalFinancialBenefitsItem) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/financial-benefits-items`, {
        typeofBenefits: item.typeofBenefits,
        benefits: item.benefits,
        comments: item.comments,
        validation: item.validation,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/financial-benefits-items`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, item }: { id: number; item: LocalFinancialBenefitsItem }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/financial-benefits-items/${id}`, {
        typeofBenefits: item.typeofBenefits,
        benefits: item.benefits,
        comments: item.comments,
        validation: item.validation,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/financial-benefits-items`] });
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

  const handleSaveAll = async () => {
    try {
      let saveCount = 0;
      
      for (let i = 0; i < localItems.length; i++) {
        const item = localItems[i];
        
        if (item.isNew) {
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
          description: `Financial benefits validation has been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
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
        description: "Failed to save financial benefits",
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
          <CardTitle>Project Financial Benefits Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading financial benefits...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Financial Benefits Validation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          The Financial Benefits Validation document outlines the validation of the financial benefits achieved through the DMAIC project. It ensures that the expected financial improvements are realized and sustained over time.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type of Benefits</TableHead>
                <TableHead>Benefits per year</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Validated by Financial Controller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item, index) => (
                <TableRow key={item.id || `new-${index}`}>
                  <TableCell>
                    {item.typeofBenefits}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.benefits}
                      onChange={(e) => updateLocalItem(index, "benefits", e.target.value)}
                      placeholder="Enter benefits per year. Ex. K$100, 2 FTE etc..."
                      data-testid={`input-financial-benefits-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={item.comments}
                      onChange={(e) => updateLocalItem(index, "comments", e.target.value)}
                      placeholder="Enter your comments and assumptions"
                      data-testid={`input-financial-comments-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.validation}
                      onValueChange={(value) => updateLocalItem(index, "validation", value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-financial-validation-${index}`}>
                        <SelectValue placeholder="Select validation by Finance Controller status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4">
          <Button 
            onClick={handleSaveAll}
            disabled={isSaving}
            data-testid="button-save-financial-benefits"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Financial Benefits
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
