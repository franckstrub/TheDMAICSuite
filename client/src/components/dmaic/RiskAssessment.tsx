import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MinusCircle } from "lucide-react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type RiskFormData = {
  riskName: string;
  probability: string;
  impact: string;
  riskCriticality: number;
  mitigationPlan: string;
  riskOwner: string;
  
  riskName2?: string;
  probability2?: string;
  impact2?: string;
  riskCriticality2?: number;
  mitigationPlan2?: string;
  riskOwner2?: string;
  
  riskName3?: string;
  probability3?: string;
  impact3?: string;
  riskCriticality3?: number;
  mitigationPlan3?: string;
  riskOwner3?: string;
  
  riskName4?: string;
  probability4?: string;
  impact4?: string;
  riskCriticality4?: number;
  mitigationPlan4?: string;
  riskOwner4?: string;
  
  riskName5?: string;
  probability5?: string;
  impact5?: string;
  riskCriticality5?: number;
  mitigationPlan5?: string;
  riskOwner5?: string;
  
  riskName6?: string;
  probability6?: string;
  impact6?: string;
  riskCriticality6?: number;
  mitigationPlan6?: string;
  riskOwner6?: string;
}

export default function RiskAssessment() {
  const { id: projectIdParam } = useParams();
  const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [visibleRiskRows, setVisibleRiskRows] = useState(1); // Start with 1 row (mandatory)
  const riskFormInitialized = useRef<boolean>(false);
  
  // Risk criticality calculation matrix (probability x impact)
  const riskCriticalityMatrix = {
    "Low": { "Low": 1, "Medium": 2, "High": 3 },
    "Medium": { "Low": 2, "Medium": 4, "High": 6 },
    "High": { "Low": 3, "Medium": 6, "High": 9 }
  };
  
  // Form setup with react-hook-form
  const riskForm = useForm<RiskFormData>({
    defaultValues: {
      riskName: "",
      probability: "Low",
      impact: "Low",
      riskCriticality: 1,
      mitigationPlan: "",
      riskOwner: "",
      
      riskName2: "",
      probability2: "Low",
      impact2: "Low",
      riskCriticality2: 1,
      mitigationPlan2: "",
      riskOwner2: "",
      
      riskName3: "",
      probability3: "Low",
      impact3: "Low",
      riskCriticality3: 1,
      mitigationPlan3: "",
      riskOwner3: "",
      
      riskName4: "",
      probability4: "Low",
      impact4: "Low",
      riskCriticality4: 1,
      mitigationPlan4: "",
      riskOwner4: "",
      
      riskName5: "",
      probability5: "Low",
      impact5: "Low",
      riskCriticality5: 1,
      mitigationPlan5: "",
      riskOwner5: "",
      
      riskName6: "",
      probability6: "Low",
      impact6: "Low",
      riskCriticality6: 1,
      mitigationPlan6: "",
      riskOwner6: "",
    }
  });
  
  // Fetch existing risk data
  const { data: riskData, isLoading: isRiskLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/risks`],
    enabled: !!projectId
  });
  
  // Initialize form with data from API
  useEffect(() => {
    if (riskData?.risk && !riskFormInitialized.current) {
      console.log("Initializing risk form with data:", riskData.risk);
      
      try {
        // Set all fields with a single reset call
        const formData = {
          riskName: riskData.risk.riskName || "",
          probability: riskData.risk.probability || "Low",
          impact: riskData.risk.impact || "Low",
          riskCriticality: riskData.risk.riskCriticality || 1,
          mitigationPlan: riskData.risk.mitigationPlan || "",
          riskOwner: riskData.risk.riskOwner || "",
          
          riskName2: riskData.risk.riskName2 || "",
          probability2: riskData.risk.probability2 || "Low",
          impact2: riskData.risk.impact2 || "Low",
          riskCriticality2: riskData.risk.riskCriticality2 || 1,
          mitigationPlan2: riskData.risk.mitigationPlan2 || "",
          riskOwner2: riskData.risk.riskOwner2 || "",
          
          riskName3: riskData.risk.riskName3 || "",
          probability3: riskData.risk.probability3 || "Low",
          impact3: riskData.risk.impact3 || "Low",
          riskCriticality3: riskData.risk.riskCriticality3 || 1,
          mitigationPlan3: riskData.risk.mitigationPlan3 || "",
          riskOwner3: riskData.risk.riskOwner3 || "",
          
          riskName4: riskData.risk.riskName4 || "",
          probability4: riskData.risk.probability4 || "Low",
          impact4: riskData.risk.impact4 || "Low",
          riskCriticality4: riskData.risk.riskCriticality4 || 1,
          mitigationPlan4: riskData.risk.mitigationPlan4 || "",
          riskOwner4: riskData.risk.riskOwner4 || "",
          
          riskName5: riskData.risk.riskName5 || "",
          probability5: riskData.risk.probability5 || "Low",
          impact5: riskData.risk.impact5 || "Low",
          riskCriticality5: riskData.risk.riskCriticality5 || 1,
          mitigationPlan5: riskData.risk.mitigationPlan5 || "",
          riskOwner5: riskData.risk.riskOwner5 || "",
          
          riskName6: riskData.risk.riskName6 || "",
          probability6: riskData.risk.probability6 || "Low",
          impact6: riskData.risk.impact6 || "Low",
          riskCriticality6: riskData.risk.riskCriticality6 || 1,
          mitigationPlan6: riskData.risk.mitigationPlan6 || "",
          riskOwner6: riskData.risk.riskOwner6 || "",
        };
        
        // Reset the form with all values at once
        riskForm.reset(formData);
        
        // Update row visibility
        let maxRow = 1; // Default to 1 row (mandatory)
        
        if (riskData.risk.riskName6) maxRow = 6;
        else if (riskData.risk.riskName5) maxRow = 5;
        else if (riskData.risk.riskName4) maxRow = 4;
        else if (riskData.risk.riskName3) maxRow = 3;
        else if (riskData.risk.riskName2) maxRow = 2;
        
        setVisibleRiskRows(maxRow);
      } catch (error) {
        console.error("Error initializing risk form:", error);
      }
      
      // Set form as initialized
      riskFormInitialized.current = true;
    }
  }, [riskData?.risk, riskForm]);
  
  // Save risk assessment mutation
  const saveRiskMutation = useMutation({
    mutationFn: async (data: RiskFormData) => {
      const payload = {
        ...data,
        userId: 1, // Replace with actual user ID
      };
      
      // Check if risk assessment exists
      if (riskData?.risk?.id) {
        return fetch(`/api/risks/${riskData.risk.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(res => res.json());
      } else {
        return fetch(`/api/projects/${projectId}/risks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(res => res.json());
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Risk assessment saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risks`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save risk assessment: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler to add a new risk row
  const addRiskRow = () => {
    if (visibleRiskRows < 6) { // Maximum 6 rows
      setVisibleRiskRows(prevRows => prevRows + 1);
    } else {
      toast({
        title: "Maximum rows reached",
        description: "You can add a maximum of 6 risk rows.",
      });
    }
  };
  
  // Handler to delete a risk row
  const deleteRiskRow = (rowNumber: number) => {
    // Make sure we don't delete row 1 (mandatory)
    if (rowNumber === 1) {
      return;
    }
    
    // Make sure we always have at least 1 row
    if (visibleRiskRows <= 1) {
      return;
    }
    
    // Make sure the row is valid
    if (rowNumber > visibleRiskRows) {
      return;
    }
    
    // Shift all data from higher rows down by one position
    for (let i = rowNumber; i < visibleRiskRows; i++) {
      // Get field names based on row numbers
      const currentRiskName = `riskName${i === 1 ? '' : i}`;
      const nextRiskName = `riskName${i+1}`;
      const currentProbability = `probability${i === 1 ? '' : i}`;
      const nextProbability = `probability${i+1}`;
      const currentImpact = `impact${i === 1 ? '' : i}`;
      const nextImpact = `impact${i+1}`;
      const currentRiskCriticality = `riskCriticality${i === 1 ? '' : i}`;
      const nextRiskCriticality = `riskCriticality${i+1}`;
      const currentMitigationPlan = `mitigationPlan${i === 1 ? '' : i}`;
      const nextMitigationPlan = `mitigationPlan${i+1}`;
      const currentRiskOwner = `riskOwner${i === 1 ? '' : i}`;
      const nextRiskOwner = `riskOwner${i+1}`;
      
      // Get values from next row
      const nextRowRiskName = riskForm.getValues(nextRiskName as any) || "";
      const nextRowProbability = riskForm.getValues(nextProbability as any) || "Low";
      const nextRowImpact = riskForm.getValues(nextImpact as any) || "Low";
      const nextRowRiskCriticality = riskForm.getValues(nextRiskCriticality as any) || 1;
      const nextRowMitigationPlan = riskForm.getValues(nextMitigationPlan as any) || "";
      const nextRowRiskOwner = riskForm.getValues(nextRiskOwner as any) || "";
      
      // Set values to current row
      riskForm.setValue(currentRiskName as any, nextRowRiskName);
      riskForm.setValue(currentProbability as any, nextRowProbability);
      riskForm.setValue(currentImpact as any, nextRowImpact);
      riskForm.setValue(currentRiskCriticality as any, nextRowRiskCriticality);
      riskForm.setValue(currentMitigationPlan as any, nextRowMitigationPlan);
      riskForm.setValue(currentRiskOwner as any, nextRowRiskOwner);
    }
    
    // Clear the last row
    const lastRowPrefix = visibleRiskRows === 1 ? '' : visibleRiskRows;
    riskForm.setValue(`riskName${lastRowPrefix}` as any, "");
    riskForm.setValue(`probability${lastRowPrefix}` as any, "Low");
    riskForm.setValue(`impact${lastRowPrefix}` as any, "Low");
    riskForm.setValue(`riskCriticality${lastRowPrefix}` as any, 1);
    riskForm.setValue(`mitigationPlan${lastRowPrefix}` as any, "");
    riskForm.setValue(`riskOwner${lastRowPrefix}` as any, "");
    
    // Decrease the visible row count
    setVisibleRiskRows(prevRows => prevRows - 1);
    
    toast({
      title: "Row deleted",
      description: `Risk row ${rowNumber} has been deleted.`,
    });
  };
  
  // Calculate risk criticality based on probability and impact
  const calculateRiskCriticality = (probability: string, impact: string): number => {
    if (!probability || !impact) return 1;
    return riskCriticalityMatrix[probability as keyof typeof riskCriticalityMatrix]?.[impact as keyof typeof riskCriticalityMatrix[keyof typeof riskCriticalityMatrix]] || 1;
  };
  
  // Update risk criticality when probability or impact changes
  const updateRiskCriticality = (rowNumber: number, fieldType: 'probability' | 'impact', value: string) => {
    const rowPrefix = rowNumber === 1 ? '' : rowNumber;
    
    const probabilityField = `probability${rowPrefix}` as const;
    const impactField = `impact${rowPrefix}` as const;
    const riskCriticalityField = `riskCriticality${rowPrefix}` as const;
    
    const probability = fieldType === 'probability' ? value : riskForm.getValues(probabilityField as any);
    const impact = fieldType === 'impact' ? value : riskForm.getValues(impactField as any);
    
    const criticality = calculateRiskCriticality(probability, impact);
    riskForm.setValue(riskCriticalityField as any, criticality);
  };
  
  const handleSaveRisk = (data: RiskFormData) => {
    console.log("Saving risk assessment data:", data);
    saveRiskMutation.mutate(data);
  };
  
  if (isRiskLoading) {
    return <p>Loading risk assessment...</p>;
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Project Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={riskForm.handleSubmit(handleSaveRisk)}>
          <p className="text-sm text-gray-500 mb-4">
            Identify, assess, and plan for potential project risks. Add rows as needed for additional risks. Row 1 is mandatory.
          </p>
          
          {/* Headers */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="p-3 bg-red-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-red-600 text-sm">Risk</h4>
            </div>
            <div className="p-3 bg-amber-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-amber-600 text-sm">Probability</h4>
            </div>
            <div className="p-3 bg-orange-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-orange-600 text-sm">Impact</h4>
            </div>
            <div className="p-3 bg-purple-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-purple-600 text-sm">Risk Criticality</h4>
            </div>
            <div className="p-3 bg-blue-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-blue-600 text-sm">Mitigation Plan</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-md text-center w-[95%]">
              <h4 className="font-medium text-green-600 text-sm">Risk Owner</h4>
            </div>
          </div>
          
          {/* First row of Risk (always visible and mandatory) */}
          <div className="grid grid-cols-6 gap-2 mb-2 relative">
            <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="Describe the risk"
                {...riskForm.register("riskName")}
              />
            </div>
            <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
              <Select
                value={riskForm.watch("probability") || "Low"}
                onValueChange={(value) => {
                  riskForm.setValue("probability", value);
                  updateRiskCriticality(1, 'probability', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Probability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
              <Select
                value={riskForm.watch("impact") || "Low"}
                onValueChange={(value) => {
                  riskForm.setValue("impact", value);
                  updateRiskCriticality(1, 'impact', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
              <div className="text-lg font-bold">
                {riskForm.watch("riskCriticality") || 1}/9
              </div>
              <input type="hidden" {...riskForm.register("riskCriticality")} />
            </div>
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="How will you mitigate this risk?"
                {...riskForm.register("mitigationPlan")}
              />
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="Who is responsible for monitoring this risk?"
                {...riskForm.register("riskOwner")}
              />
            </div>
            {/* No delete button for first row (it's mandatory) */}
          </div>
          
          {/* Second row (conditionally rendered) */}
          {visibleRiskRows >= 2 && (
            <div className="grid grid-cols-6 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName2")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("probability2") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability2", value);
                    updateRiskCriticality(2, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("impact2") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact2", value);
                    updateRiskCriticality(2, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality2") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality2")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan2")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner2")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(2)}
                title="Delete Row 2"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Third row (conditionally rendered) */}
          {visibleRiskRows >= 3 && (
            <div className="grid grid-cols-6 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName3")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("probability3") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability3", value);
                    updateRiskCriticality(3, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("impact3") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact3", value);
                    updateRiskCriticality(3, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality3") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality3")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan3")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner3")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(3)}
                title="Delete Row 3"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Fourth row (conditionally rendered) */}
          {visibleRiskRows >= 4 && (
            <div className="grid grid-cols-6 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName4")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("probability4") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability4", value);
                    updateRiskCriticality(4, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("impact4") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact4", value);
                    updateRiskCriticality(4, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality4") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality4")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan4")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner4")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(4)}
                title="Delete Row 4"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Fifth row (conditionally rendered) */}
          {visibleRiskRows >= 5 && (
            <div className="grid grid-cols-6 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName5")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("probability5") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability5", value);
                    updateRiskCriticality(5, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("impact5") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact5", value);
                    updateRiskCriticality(5, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality5") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality5")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan5")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner5")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(5)}
                title="Delete Row 5"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Sixth row (conditionally rendered) */}
          {visibleRiskRows >= 6 && (
            <div className="grid grid-cols-6 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName6")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("probability6") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability6", value);
                    updateRiskCriticality(6, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  value={riskForm.watch("impact6") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact6", value);
                    updateRiskCriticality(6, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality6") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality6")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan6")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner6")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(6)}
                title="Delete Row 6"
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Add Risk Row Button */}
          <div className="flex justify-start mt-4 mb-4">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="flex items-center"
              onClick={addRiskRow}
              disabled={visibleRiskRows >= 6}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Risk
            </Button>
          </div>
          
          {/* Save Button */}
          <div className="mt-4">
            <Button 
              type="submit" 
              disabled={saveRiskMutation.isPending}
            >
              {saveRiskMutation.isPending ? "Saving..." : "Save Risk Assessment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}