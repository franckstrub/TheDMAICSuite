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
import type { FinancialBenefitsValidation as FinancialBenefitsValidationType } from "@shared/schema";

interface FinancialBenefitsValidationProps {
  projectId: number;
  projectType: string;
}

interface LocalFormData {
  qualityCostsSavings: string;
  qualityCostsSavingsComments: string;
  qualityCostsSavingsValidation: string;
  fteBenefits: string;
  fteBenefitsComments: string;
  fteBenefitsValidation: string;
  workingCapitalSavings: string;
  workingCapitalSavingsComments: string;
  workingCapitalSavingsValidation: string;
  financialSavings: string;
  financialSavingsComments: string;
  financialSavingsValidation: string;
}

const defaultFormData: LocalFormData = {
  qualityCostsSavings: "",
  qualityCostsSavingsComments: "",
  qualityCostsSavingsValidation: "No",
  fteBenefits: "",
  fteBenefitsComments: "",
  fteBenefitsValidation: "No",
  workingCapitalSavings: "",
  workingCapitalSavingsComments: "",
  workingCapitalSavingsValidation: "No",
  financialSavings: "",
  financialSavingsComments: "",
  financialSavingsValidation: "No",
};

export default function FinancialBenefitsValidation({ projectId, projectType }: FinancialBenefitsValidationProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<LocalFormData>(defaultFormData);
  const [isDirty, setIsDirty] = useState(false);
  
  const { data: validationData, isLoading } = useQuery<{ validation: FinancialBenefitsValidationType | null }>({
    queryKey: [`/api/projects/${projectId}/financial-benefits-validation`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  useEffect(() => {
    if (validationData?.validation) {
      const v = validationData.validation;
      setFormData({
        qualityCostsSavings: v.qualityCostsSavings || "",
        qualityCostsSavingsComments: v.qualityCostsSavingsComments || "",
        qualityCostsSavingsValidation: v.qualityCostsSavingsValidation || "No",
        fteBenefits: v.fteBenefits || "",
        fteBenefitsComments: v.fteBenefitsComments || "",
        fteBenefitsValidation: v.fteBenefitsValidation || "No",
        workingCapitalSavings: v.workingCapitalSavings || "",
        workingCapitalSavingsComments: v.workingCapitalSavingsComments || "",
        workingCapitalSavingsValidation: v.workingCapitalSavingsValidation || "No",
        financialSavings: v.financialSavings || "",
        financialSavingsComments: v.financialSavingsComments || "",
        financialSavingsValidation: v.financialSavingsValidation || "No",
      });
      setIsDirty(false);
    }
  }, [validationData]);

  const saveMutation = useMutation({
    mutationFn: async (data: LocalFormData) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/financial-benefits-validation`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/financial-benefits-validation`] });
      setIsDirty(false);
      toast({
        title: "Success",
        description: "Financial benefits validation has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save financial benefits",
        variant: "destructive",
      });
    },
  });

  const updateField = (field: keyof LocalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

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

  const benefitRows = [
    {
      label: "Quality Costs Savings",
      benefitsField: "qualityCostsSavings" as keyof LocalFormData,
      commentsField: "qualityCostsSavingsComments" as keyof LocalFormData,
      validationField: "qualityCostsSavingsValidation" as keyof LocalFormData,
    },
    {
      label: "FTE Benefits",
      benefitsField: "fteBenefits" as keyof LocalFormData,
      commentsField: "fteBenefitsComments" as keyof LocalFormData,
      validationField: "fteBenefitsValidation" as keyof LocalFormData,
    },
    {
      label: "Working Capital Savings",
      benefitsField: "workingCapitalSavings" as keyof LocalFormData,
      commentsField: "workingCapitalSavingsComments" as keyof LocalFormData,
      validationField: "workingCapitalSavingsValidation" as keyof LocalFormData,
    },
    {
      label: "Financial Savings",
      benefitsField: "financialSavings" as keyof LocalFormData,
      commentsField: "financialSavingsComments" as keyof LocalFormData,
      validationField: "financialSavingsValidation" as keyof LocalFormData,
    },
  ];

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
              {benefitRows.map((row, index) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">
                    {row.label}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={formData[row.benefitsField]}
                      onChange={(e) => updateField(row.benefitsField, e.target.value)}
                      placeholder="Enter benefits per year. Ex. K$100, 2 FTE etc..."
                      data-testid={`input-financial-benefits-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={formData[row.commentsField]}
                      onChange={(e) => updateField(row.commentsField, e.target.value)}
                      placeholder="Enter your comments and assumptions"
                      data-testid={`input-financial-comments-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData[row.validationField]}
                      onValueChange={(value) => updateField(row.validationField, value)}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-financial-validation-${index}`}>
                        <SelectValue placeholder="Select validation status" />
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
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-financial-benefits"
          >
            {saveMutation.isPending ? (
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
