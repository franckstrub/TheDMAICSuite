import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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

interface FinancialBenefitsValidationProps {
  projectId: number;
  projectType: string;
}

export default function FinancialBenefitsValidation({ projectId, projectType }: FinancialBenefitsValidationProps) {
  const { toast } = useToast();
  const [financialBenetfitsValidation, setFinancialBenetfitsValidation] = useState([
    {
      typeofBenefits: "Quality Costs Savings",
      benefits: "0",
      comments: "none",
      validation: "No"
    },
    {
      typeofBenefits: "FTE Benefits",
      benefits: "0",
      comments: "none",
      validation: "No"
    },
    {
      typeofBenefits: "Working Capital Savings",
      benefits: "0",
      comments: "none",
      validation: "No"
    },
    {
      typeofBenefits: "Financial Savings",
      benefits: "0",
      comments: "none",
      validation: "No"
    },
  ]);
  
  // Update training plan
  const updateFinancialBenetfitsValidation = (index: number, field: string, value: any) => {
    const newBenefit = [...financialBenetfitsValidation];
    newBenefit[index] = { ...newBenefit[index], [field]: value };
    setFinancialBenetfitsValidation(newBenefit);
  };

  // Add training plan item
  const addFinancialBenetfitsValidationItem = () => {
    if (financialBenetfitsValidation[financialBenetfitsValidation.length - 1].typeofBenefits.trim() !== "") {
      setFinancialBenetfitsValidation([
        ...financialBenetfitsValidation,
        {
          typeofBenefits: "Quality Costs Savings",
          benefits: "0",
          comments: "none",
          validation: "No"
        }
      ]);
    }
  };

  // Remove training plan item
  const removeFinancialBenetfitsValidationItem = (index: number) => {
    const newBenefit = [...financialBenetfitsValidation];
    newBenefit.splice(index, 1);
    setFinancialBenetfitsValidation(newBenefit);
  };

  const handleSaveFinancialBenetfitsValidation = () => {
    toast({
      title: "Success",
      description: "Financial benefits validation has been saved successfully",
    });
  };


{/* Financial Benefits Validation */}
return (
    <>
    {(projectType === 'Black Belt' || projectType === 'Green Belt') && (      
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
                {financialBenetfitsValidation.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.typeofBenefits}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.benefits}
                        onChange={(e) => updateFinancialBenetfitsValidation(index, "benefits", e.target.value)}
                        placeholder={index === financialBenetfitsValidation.length - 1 ? "Enter benefits per year. Ex. K$100, 2 FTE etc..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.comments}
                        onChange={(e) => updateFinancialBenetfitsValidation(index, "comments", e.target.value)}
                        placeholder="Enter your comments and assumptions"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.validation}
                        onValueChange={(value) => updateFinancialBenetfitsValidation(index, "validation", value)}
                      >
                        <SelectTrigger className="w-full">
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
            <Button onClick={handleSaveFinancialBenetfitsValidation}>
              Save Financial Benefits
            </Button>
          </div>    
        </CardContent>
      </Card>
    )}
  </>
  );
}
