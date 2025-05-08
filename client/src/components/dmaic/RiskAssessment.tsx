import { useState, useEffect, useRef, createRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MinusCircle, Sparkles } from "lucide-react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [visibleRiskRows, setVisibleRiskRows] = useState(1); // Start with 1 row (mandatory)
  const riskFormInitialized = useRef<boolean>(false);
  const { user, currentProject } = useAppContext();
  const [isGeneratingMitigation, setIsGeneratingMitigation] = useState<{ [key: number]: boolean }>({});
  
  // Create refs for the mitigation plan textareas
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});

  // Use URL project ID if available, otherwise fall back to current project
  const projectId = projectIdParam ? parseInt(projectIdParam) : (currentProject?.id || 1);
  
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
    enabled: !!projectId,
    onSuccess: (data) => {
      // Log the data returned from the server to debug probability/impact issues
      console.log("Risk data loaded from server:", data?.risk);
      if (data?.risk) {
        console.log("Loaded probability:", data.risk.probability);
        console.log("Loaded impact:", data.risk.impact);
      }
    }
  });
  
  // Function to clear risk form initialization state
  const resetRiskFormInitialization = () => {
    riskFormInitialized.current = false;
  };

  // Re-initialize the form when navigating between projects
  useEffect(() => {
    resetRiskFormInitialization();
  }, [projectId]);
  
  // Initialize form with data from API
  useEffect(() => {
    if (riskData?.risk && !riskFormInitialized.current) {
      console.log("Initializing risk form with data:", riskData.risk);
      
      try {
        // Force reset of probability, impact, and criticality values directly
        setTimeout(() => {
          // Directly set probability and impact values for all rows
          if (riskData.risk.probability) {
            console.log("Setting probability explicitly:", riskData.risk.probability);
            riskForm.setValue("probability", riskData.risk.probability);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact) {
              console.log("Recalculating criticality based on probability and impact");
              const criticality = calculateRiskCriticality(riskData.risk.probability, riskData.risk.impact);
              riskForm.setValue("riskCriticality", criticality);
              console.log("Set criticality to:", criticality);
            }
          }
          
          if (riskData.risk.impact) {
            console.log("Setting impact explicitly:", riskData.risk.impact);
            riskForm.setValue("impact", riskData.risk.impact);
            
            // We already handled criticality in the probability section above
          }
          
          // Row 2
          if (riskData.risk.probability2) {
            console.log("Setting probability2 explicitly:", riskData.risk.probability2);
            riskForm.setValue("probability2", riskData.risk.probability2);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact2) {
              const criticality = calculateRiskCriticality(riskData.risk.probability2, riskData.risk.impact2);
              riskForm.setValue("riskCriticality2", criticality);
              console.log("Set criticality2 to:", criticality);
            }
          }
          
          if (riskData.risk.impact2) {
            console.log("Setting impact2 explicitly:", riskData.risk.impact2);
            riskForm.setValue("impact2", riskData.risk.impact2);
          }
          
          // Row 3
          if (riskData.risk.probability3) {
            console.log("Setting probability3 explicitly:", riskData.risk.probability3);
            riskForm.setValue("probability3", riskData.risk.probability3);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact3) {
              const criticality = calculateRiskCriticality(riskData.risk.probability3, riskData.risk.impact3);
              riskForm.setValue("riskCriticality3", criticality);
            }
          }
          
          if (riskData.risk.impact3) {
            console.log("Setting impact3 explicitly:", riskData.risk.impact3);
            riskForm.setValue("impact3", riskData.risk.impact3);
          }
          
          // Row 4
          if (riskData.risk.probability4) {
            console.log("Setting probability4 explicitly:", riskData.risk.probability4);
            riskForm.setValue("probability4", riskData.risk.probability4);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact4) {
              const criticality = calculateRiskCriticality(riskData.risk.probability4, riskData.risk.impact4);
              riskForm.setValue("riskCriticality4", criticality);
            }
          }
          
          if (riskData.risk.impact4) {
            console.log("Setting impact4 explicitly:", riskData.risk.impact4);
            riskForm.setValue("impact4", riskData.risk.impact4);
          }
          
          // Row 5
          if (riskData.risk.probability5) {
            console.log("Setting probability5 explicitly:", riskData.risk.probability5);
            riskForm.setValue("probability5", riskData.risk.probability5);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact5) {
              const criticality = calculateRiskCriticality(riskData.risk.probability5, riskData.risk.impact5);
              riskForm.setValue("riskCriticality5", criticality);
            }
          }
          
          if (riskData.risk.impact5) {
            console.log("Setting impact5 explicitly:", riskData.risk.impact5);
            riskForm.setValue("impact5", riskData.risk.impact5);
          }
          
          // Row 6
          if (riskData.risk.probability6) {
            console.log("Setting probability6 explicitly:", riskData.risk.probability6);
            riskForm.setValue("probability6", riskData.risk.probability6);
            
            // Ensure criticality is also set properly
            if (riskData.risk.impact6) {
              const criticality = calculateRiskCriticality(riskData.risk.probability6, riskData.risk.impact6);
              riskForm.setValue("riskCriticality6", criticality);
            }
          }
          
          if (riskData.risk.impact6) {
            console.log("Setting impact6 explicitly:", riskData.risk.impact6);
            riskForm.setValue("impact6", riskData.risk.impact6);
          }
        }, 100);
        
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
        
        console.log(`Setting risk rows to ${maxRow}`);
        setVisibleRiskRows(maxRow);
      } catch (error) {
        console.error("Error initializing risk form:", error);
      }
      
      // Set form as initialized
      riskFormInitialized.current = true;
    }
  }, [riskData?.risk, riskForm, projectId]);
  
  // Save risk assessment mutation
  const saveRiskMutation = useMutation({
    mutationFn: async (data: RiskFormData) => {
      // Log data before saving to ensure probability and impact values are correct
      console.log("Saving risk data with the following values:", {
        probability: data.probability,
        impact: data.impact,
        probability2: data.probability2,
        impact2: data.impact2
      });
      
      const payload = {
        ...data,
        userId: user?.id || 1,
        projectId: projectId
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
  
  // Auto-adjust textarea height based on content
  const adjustTextareaHeight = (textareaElement: HTMLTextAreaElement | null) => {
    if (!textareaElement) return;
    
    // Reset height to calculate proper scrollHeight
    textareaElement.style.height = "auto";
    
    // Set new height based on content
    const newHeight = Math.max(textareaElement.scrollHeight, 70); // Minimum height of 70px
    textareaElement.style.height = `${newHeight}px`;
  };
  
  // Function to generate AI-assisted mitigation plan based on risk details
  const generateMitigationPlan = async (rowIndex: number) => {
    try {
      const rowSuffix = rowIndex === 1 ? "" : rowIndex;
      const riskName = riskForm.getValues(`riskName${rowSuffix}` as any);
      const probability = riskForm.getValues(`probability${rowSuffix}` as any);
      const impact = riskForm.getValues(`impact${rowSuffix}` as any);
      const criticality = calculateRiskCriticality(probability, impact);
      
      // Show loading indicator
      setIsGeneratingMitigation(prev => ({ ...prev, [rowIndex]: true }));
      
      // Simulate AI generation with contextual response based on criticality
      // In a real implementation, this would call an AI service
      let mitigationPlan = "";
      
      // Small delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mitigation plan based on risk details
      if (criticality >= 7) {
        // High criticality (7-9)
        mitigationPlan = `COMPREHENSIVE MITIGATION STRATEGY FOR HIGH-RISK ITEM:\n\n` +
          `1. Establish a dedicated risk response team with specialized expertise in ${riskName.toLowerCase()} challenges\n` +
          `2. Implement continuous monitoring with daily status reviews\n` +
          `3. Develop detailed contingency plans with trigger points for escalation\n` +
          `4. Secure additional budget/resources to address this critical risk area\n` +
          `5. Consider external expertise consultation to supplement internal capabilities`;
      } else if (criticality >= 4) {
        // Medium criticality (4-6)
        mitigationPlan = `STRUCTURED MITIGATION APPROACH FOR MEDIUM-RISK ITEM:\n\n` +
          `1. Assign a risk owner with clear accountability for monitoring this ${riskName.toLowerCase()} risk\n` +
          `2. Implement weekly monitoring procedures with documented checkpoints\n` +
          `3. Develop alternative approaches that could be activated if risk materializes\n` +
          `4. Create communication protocols to ensure stakeholders are informed of status changes`;
      } else {
        // Low criticality (1-3)
        mitigationPlan = `BASIC MITIGATION APPROACH FOR LOW-RISK ITEM:\n\n` +
          `1. Document the ${riskName.toLowerCase()} risk in the project risk register\n` +
          `2. Implement monthly monitoring to track any changes in probability or impact\n` +
          `3. Define simple response procedures that can be activated if the risk escalates`;
      }
      
      // Update the form field
      riskForm.setValue(`mitigationPlan${rowSuffix}` as any, mitigationPlan);
      
      // Adjust textarea height after setting value
      setTimeout(() => {
        const textareaKey = `mitigationPlan${rowSuffix}`;
        adjustTextareaHeight(textareaRefs.current[textareaKey]);
      }, 0);
      
      // Hide loading indicator
      setIsGeneratingMitigation(prev => ({ ...prev, [rowIndex]: false }));
      
      toast({
        title: "Mitigation Plan Generated",
        description: "AI-assisted mitigation plan has been generated based on risk details.",
      });
    } catch (error) {
      console.error("Error generating mitigation plan:", error);
      setIsGeneratingMitigation(prev => ({ ...prev, [rowIndex]: false }));
      
      toast({
        title: "Error",
        description: "Failed to generate mitigation plan. Please try again.",
        variant: "destructive",
      });
    }
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
    
    // Make sure to capture current values before mutation
    const currentValues = {
      probability: data.probability,
      impact: data.impact, 
      probability2: data.probability2,
      impact2: data.impact2,
      probability3: data.probability3,
      impact3: data.impact3,
      probability4: data.probability4,
      impact4: data.impact4,
      probability5: data.probability5,
      impact5: data.impact5,
      probability6: data.probability6,
      impact6: data.impact6,
    };
    
    // Ensure all criticality values are correctly calculated before saving
    const processedData = { ...data };
    
    // Row 1
    if (data.probability && data.impact) {
      const criticality = calculateRiskCriticality(data.probability, data.impact);
      processedData.riskCriticality = criticality;
      console.log("Recalculated criticality for row 1:", criticality);
    }
    
    // Row 2
    if (data.probability2 && data.impact2) {
      const criticality = calculateRiskCriticality(data.probability2, data.impact2);
      processedData.riskCriticality2 = criticality;
      console.log("Recalculated criticality for row 2:", criticality);
    }
    
    // Row 3
    if (data.probability3 && data.impact3) {
      const criticality = calculateRiskCriticality(data.probability3, data.impact3);
      processedData.riskCriticality3 = criticality;
      console.log("Recalculated criticality for row 3:", criticality);
    }
    
    // Row 4
    if (data.probability4 && data.impact4) {
      const criticality = calculateRiskCriticality(data.probability4, data.impact4);
      processedData.riskCriticality4 = criticality;
      console.log("Recalculated criticality for row 4:", criticality);
    }
    
    // Row 5
    if (data.probability5 && data.impact5) {
      const criticality = calculateRiskCriticality(data.probability5, data.impact5);
      processedData.riskCriticality5 = criticality;
      console.log("Recalculated criticality for row 5:", criticality);
    }
    
    // Row 6
    if (data.probability6 && data.impact6) {
      const criticality = calculateRiskCriticality(data.probability6, data.impact6);
      processedData.riskCriticality6 = criticality;
      console.log("Recalculated criticality for row 6:", criticality);
    }
    
    saveRiskMutation.mutate(processedData, {
      onSuccess: () => {
        // After successful save, force reset the dropdown values explicitly
        console.log("After save, explicitly setting dropdown values again");
        
        setTimeout(() => {
          if (currentValues.probability) {
            riskForm.setValue("probability", currentValues.probability);
            // Also update criticality
            if (currentValues.impact) {
              const criticality = calculateRiskCriticality(currentValues.probability, currentValues.impact);
              riskForm.setValue("riskCriticality", criticality);
            }
          }
          
          if (currentValues.impact) riskForm.setValue("impact", currentValues.impact);
          
          if (currentValues.probability2) {
            riskForm.setValue("probability2", currentValues.probability2);
            // Also update criticality
            if (currentValues.impact2) {
              const criticality = calculateRiskCriticality(currentValues.probability2, currentValues.impact2);
              riskForm.setValue("riskCriticality2", criticality);
            }
          }
          
          if (currentValues.impact2) riskForm.setValue("impact2", currentValues.impact2);
          
          if (currentValues.probability3) {
            riskForm.setValue("probability3", currentValues.probability3);
            // Also update criticality
            if (currentValues.impact3) {
              const criticality = calculateRiskCriticality(currentValues.probability3, currentValues.impact3);
              riskForm.setValue("riskCriticality3", criticality);
            }
          }
          
          if (currentValues.impact3) riskForm.setValue("impact3", currentValues.impact3);
          
          if (currentValues.probability4) {
            riskForm.setValue("probability4", currentValues.probability4);
            // Also update criticality
            if (currentValues.impact4) {
              const criticality = calculateRiskCriticality(currentValues.probability4, currentValues.impact4);
              riskForm.setValue("riskCriticality4", criticality);
            }
          }
          
          if (currentValues.impact4) riskForm.setValue("impact4", currentValues.impact4);
          
          if (currentValues.probability5) {
            riskForm.setValue("probability5", currentValues.probability5);
            // Also update criticality
            if (currentValues.impact5) {
              const criticality = calculateRiskCriticality(currentValues.probability5, currentValues.impact5);
              riskForm.setValue("riskCriticality5", criticality);
            }
          }
          
          if (currentValues.impact5) riskForm.setValue("impact5", currentValues.impact5);
          
          if (currentValues.probability6) {
            riskForm.setValue("probability6", currentValues.probability6);
            // Also update criticality
            if (currentValues.impact6) {
              const criticality = calculateRiskCriticality(currentValues.probability6, currentValues.impact6);
              riskForm.setValue("riskCriticality6", criticality);
            }
          }
          
          if (currentValues.impact6) riskForm.setValue("impact6", currentValues.impact6);
        }, 200);
      }
    });
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
            Identify, assess, and plan for potential project risks. Add rows as needed for additional risks. Risk criticality = Probability × Impact
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
                ref={(el) => {
                  if (el) {
                    textareaRefs.current["riskName"] = el;
                    adjustTextareaHeight(el);
                  }
                }}
                onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
              />
            </div>
            <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
              <Select
                defaultValue="Low"
                value={riskForm.watch("probability")}
                onValueChange={(value) => {
                  console.log("Probability changed to:", value);
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
                defaultValue="Low"
                value={riskForm.watch("impact")}
                onValueChange={(value) => {
                  console.log("Impact changed to:", value);
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
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="How will you mitigate this risk?"
                {...riskForm.register("mitigationPlan")}
                ref={(el) => {
                  if (el) {
                    textareaRefs.current["mitigationPlan"] = el;
                    adjustTextareaHeight(el);
                  }
                }}
                onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => generateMitigationPlan(1)}
                disabled={isGeneratingMitigation[1]}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
              </Button>
              {isGeneratingMitigation[1] && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                </div>
              )}
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="Who is responsible for monitoring this risk?"
                {...riskForm.register("riskOwner")}
                ref={(el) => {
                  if (el) {
                    textareaRefs.current["riskOwner"] = el;
                    adjustTextareaHeight(el);
                  }
                }}
                onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskName2"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("probability2")}
                  onValueChange={(value) => {
                    console.log("Probability2 changed to:", value);
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
                  defaultValue="Low"
                  value={riskForm.watch("impact2")}
                  onValueChange={(value) => {
                    console.log("Impact2 changed to:", value);
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
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan2")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan2"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => generateMitigationPlan(2)}
                  disabled={isGeneratingMitigation[2]}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                {isGeneratingMitigation[2] && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner2")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskOwner2"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
                <i className="fas fa-trash"></i>
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
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskName3"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%]">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("probability3")}
                  onValueChange={(value) => {
                    console.log("Probability3 changed to:", value);
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
                  defaultValue="Low"
                  value={riskForm.watch("impact3")}
                  onValueChange={(value) => {
                    console.log("Impact3 changed to:", value);
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
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan3")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan3"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => generateMitigationPlan(3)}
                  disabled={isGeneratingMitigation[3]}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                {isGeneratingMitigation[3] && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
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
                <i className="fas fa-trash"></i>
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
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskName4"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan4")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan4"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => generateMitigationPlan(4)}
                  disabled={isGeneratingMitigation[4]}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                {isGeneratingMitigation[4] && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner4")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskOwner4"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
                <i className="fas fa-trash"></i>
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
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskName5"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan5")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan5"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => generateMitigationPlan(5)}
                  disabled={isGeneratingMitigation[5]}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                {isGeneratingMitigation[5] && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner5")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskOwner5"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
                <i className="fas fa-trash"></i>
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
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskName6"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan6")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan6"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => generateMitigationPlan(6)}
                  disabled={isGeneratingMitigation[6]}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                {isGeneratingMitigation[6] && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%]">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner6")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["riskOwner6"] = el;
                      adjustTextareaHeight(el);
                    }
                  }}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
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
                <i className="fas fa-trash"></i>
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