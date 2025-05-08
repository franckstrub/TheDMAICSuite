import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  
  // Define the Risk response type
  interface RiskResponse {
    risk: {
      id?: number;
      projectId?: number;
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
    };
  }

  // Fetch existing risk data
  const { data: riskData, isLoading: isRiskLoading } = useQuery<RiskResponse>({
    queryKey: [`/api/projects/${projectId}/risks`],
    enabled: !!projectId
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
          if (riskData && riskData.risk && riskData.risk.probability) {
            console.log("Setting probability explicitly:", riskData.risk.probability);
            riskForm.setValue("probability", riskData.risk.probability);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact) {
              console.log("Recalculating criticality based on probability and impact");
              const criticality = calculateRiskCriticality(riskData.risk.probability, riskData.risk.impact);
              riskForm.setValue("riskCriticality", criticality);
              console.log("Set criticality to:", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact) {
            console.log("Setting impact explicitly:", riskData.risk.impact);
            riskForm.setValue("impact", riskData.risk.impact);
            
            // We already handled criticality in the probability section above
          }
          
          // Row 2
          if (riskData && riskData.risk && riskData.risk.probability2) {
            console.log("Setting probability2 explicitly:", riskData.risk.probability2);
            riskForm.setValue("probability2", riskData.risk.probability2);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact2) {
              const criticality = calculateRiskCriticality(riskData.risk.probability2, riskData.risk.impact2);
              riskForm.setValue("riskCriticality2", criticality);
              console.log("Set criticality2 to:", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact2) {
            console.log("Setting impact2 explicitly:", riskData.risk.impact2);
            riskForm.setValue("impact2", riskData.risk.impact2);
          }
          
          // Row 3
          if (riskData && riskData.risk && riskData.risk.probability3) {
            console.log("Setting probability3 explicitly:", riskData.risk.probability3);
            riskForm.setValue("probability3", riskData.risk.probability3);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact3) {
              const criticality = calculateRiskCriticality(riskData.risk.probability3, riskData.risk.impact3);
              riskForm.setValue("riskCriticality3", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact3) {
            console.log("Setting impact3 explicitly:", riskData.risk.impact3);
            riskForm.setValue("impact3", riskData.risk.impact3);
          }
          
          // Row 4
          if (riskData && riskData.risk && riskData.risk.probability4) {
            console.log("Setting probability4 explicitly:", riskData.risk.probability4);
            riskForm.setValue("probability4", riskData.risk.probability4);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact4) {
              const criticality = calculateRiskCriticality(riskData.risk.probability4, riskData.risk.impact4);
              riskForm.setValue("riskCriticality4", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact4) {
            console.log("Setting impact4 explicitly:", riskData.risk.impact4);
            riskForm.setValue("impact4", riskData.risk.impact4);
          }
          
          // Row 5
          if (riskData && riskData.risk && riskData.risk.probability5) {
            console.log("Setting probability5 explicitly:", riskData.risk.probability5);
            riskForm.setValue("probability5", riskData.risk.probability5);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact5) {
              const criticality = calculateRiskCriticality(riskData.risk.probability5, riskData.risk.impact5);
              riskForm.setValue("riskCriticality5", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact5) {
            console.log("Setting impact5 explicitly:", riskData.risk.impact5);
            riskForm.setValue("impact5", riskData.risk.impact5);
          }
          
          // Row 6
          if (riskData && riskData.risk && riskData.risk.probability6) {
            console.log("Setting probability6 explicitly:", riskData.risk.probability6);
            riskForm.setValue("probability6", riskData.risk.probability6);
            
            // Ensure criticality is also set properly
            if (riskData && riskData.risk && riskData.risk.impact6) {
              const criticality = calculateRiskCriticality(riskData.risk.probability6, riskData.risk.impact6);
              riskForm.setValue("riskCriticality6", criticality);
            }
          }
          
          if (riskData && riskData.risk && riskData.risk.impact6) {
            console.log("Setting impact6 explicitly:", riskData.risk.impact6);
            riskForm.setValue("impact6", riskData.risk.impact6);
          }
        }, 100);
        
        // Set all fields with a single reset call
        const formData = {
          riskName: riskData && riskData.risk ? (riskData.risk.riskName || "") : "",
          probability: riskData && riskData.risk ? (riskData.risk.probability || "Low") : "Low",
          impact: riskData && riskData.risk ? (riskData.risk.impact || "Low") : "Low",
          riskCriticality: riskData && riskData.risk ? (riskData.risk.riskCriticality || 1) : 1,
          mitigationPlan: riskData && riskData.risk ? (riskData.risk.mitigationPlan || "") : "",
          riskOwner: riskData && riskData.risk ? (riskData.risk.riskOwner || "") : "",
          
          riskName2: riskData && riskData.risk ? (riskData.risk.riskName2 || "") : "",
          probability2: riskData && riskData.risk ? (riskData.risk.probability2 || "Low") : "Low",
          impact2: riskData && riskData.risk ? (riskData.risk.impact2 || "Low") : "Low",
          riskCriticality2: riskData && riskData.risk ? (riskData.risk.riskCriticality2 || 1) : 1,
          mitigationPlan2: riskData && riskData.risk ? (riskData.risk.mitigationPlan2 || "") : "",
          riskOwner2: riskData && riskData.risk ? (riskData.risk.riskOwner2 || "") : "",
          
          riskName3: riskData && riskData.risk ? (riskData.risk.riskName3 || "") : "",
          probability3: riskData && riskData.risk ? (riskData.risk.probability3 || "Low") : "Low",
          impact3: riskData && riskData.risk ? (riskData.risk.impact3 || "Low") : "Low",
          riskCriticality3: riskData && riskData.risk ? (riskData.risk.riskCriticality3 || 1) : 1,
          mitigationPlan3: riskData && riskData.risk ? (riskData.risk.mitigationPlan3 || "") : "",
          riskOwner3: riskData && riskData.risk ? (riskData.risk.riskOwner3 || "") : "",
          
          riskName4: riskData && riskData.risk ? (riskData.risk.riskName4 || "") : "",
          probability4: riskData && riskData.risk ? (riskData.risk.probability4 || "Low") : "Low",
          impact4: riskData && riskData.risk ? (riskData.risk.impact4 || "Low") : "Low",
          riskCriticality4: riskData && riskData.risk ? (riskData.risk.riskCriticality4 || 1) : 1,
          mitigationPlan4: riskData && riskData.risk ? (riskData.risk.mitigationPlan4 || "") : "",
          riskOwner4: riskData && riskData.risk ? (riskData.risk.riskOwner4 || "") : "",
          
          riskName5: riskData && riskData.risk ? (riskData.risk.riskName5 || "") : "",
          probability5: riskData && riskData.risk ? (riskData.risk.probability5 || "Low") : "Low",
          impact5: riskData && riskData.risk ? (riskData.risk.impact5 || "Low") : "Low",
          riskCriticality5: riskData && riskData.risk ? (riskData.risk.riskCriticality5 || 1) : 1,
          mitigationPlan5: riskData && riskData.risk ? (riskData.risk.mitigationPlan5 || "") : "",
          riskOwner5: riskData && riskData.risk ? (riskData.risk.riskOwner5 || "") : "",
          
          riskName6: riskData && riskData.risk ? (riskData.risk.riskName6 || "") : "",
          probability6: riskData && riskData.risk ? (riskData.risk.probability6 || "Low") : "Low",
          impact6: riskData && riskData.risk ? (riskData.risk.impact6 || "Low") : "Low",
          riskCriticality6: riskData && riskData.risk ? (riskData.risk.riskCriticality6 || 1) : 1,
          mitigationPlan6: riskData && riskData.risk ? (riskData.risk.mitigationPlan6 || "") : "",
          riskOwner6: riskData && riskData.risk ? (riskData.risk.riskOwner6 || "") : "",
        };
        
        // Reset the form with all values at once
        riskForm.reset(formData);
        
        // Update row visibility
        let maxRow = 1; // Default to 1 row (mandatory)
        
        if (riskData && riskData.risk && riskData.risk.riskName6) maxRow = 6;
        else if (riskData && riskData.risk && riskData.risk.riskName5) maxRow = 5;
        else if (riskData && riskData.risk && riskData.risk.riskName4) maxRow = 4;
        else if (riskData && riskData.risk && riskData.risk.riskName3) maxRow = 3;
        else if (riskData && riskData.risk && riskData.risk.riskName2) maxRow = 2;
        
        console.log(`Setting risk rows to ${maxRow}`);
        setVisibleRiskRows(maxRow);
        
        // When form is initialized, we need to manually ensure textareas have correct content and size
        setTimeout(() => {
          // Function to directly set textarea values and adjust heights
          const forceSetTextareaContent = () => {
            console.log("Forcing textarea content update after form initialization");
            for (let i = 1; i <= maxRow; i++) {
              const fieldName = i === 1 ? 'mitigationPlan' : `mitigationPlan${i}`;
              const textareaElement = textareaRefs.current[fieldName];
              
              if (textareaElement) {
                // Get the field value directly from the risk data
                const fieldKey = fieldName as keyof typeof riskData.risk;
                const fieldValue = riskData.risk[fieldKey] || '';
                
                // Directly set the value on the DOM element
                textareaElement.value = fieldValue as string;
                
                // Calculate height based on content
                const content = fieldValue as string;
                const lineCount = content.split('\n').length;
                const minHeight = 80;
                const lineHeight = 20;
                
                // Manually calculate a better height based on content
                textareaElement.style.height = 'auto';
                const scrollHeight = Math.max(textareaElement.scrollHeight, lineCount * lineHeight);
                const newHeight = Math.max(minHeight, scrollHeight + 40); // Add extra padding
                
                // Force set the textarea height with transition
                textareaElement.style.transition = 'height 0.3s ease-in-out';
                textareaElement.style.height = `${newHeight}px`;
                
                console.log(`Direct DOM update for ${fieldName}: ${lineCount} lines, height: ${newHeight}px`);
              } else {
                console.warn(`Textarea ref for ${fieldName} not found during initialization`);
              }
            }
          };
          
          // Run multiple times with increasing delays to catch when DOM is ready
          forceSetTextareaContent();
          setTimeout(forceSetTextareaContent, 200);
          setTimeout(forceSetTextareaContent, 500);
          setTimeout(forceSetTextareaContent, 1000);
          setTimeout(forceSetTextareaContent, 2000);
        }, 100);
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
  
  // Function to auto-adjust textarea height based on content
  const adjustTextareaHeight = (textareaKey: string) => {
    setTimeout(() => {
      const textarea = textareaRefs.current[textareaKey];
      if (textarea) {
        // Reset height to auto to get accurate scrollHeight measurement
        textarea.style.height = 'auto';
        
        // Get textarea content and calculate lines
        const content = textarea.value || '';
        const lineCount = content.split('\n').length;
        
        // Calculate new height based on content (add a larger buffer for better appearance)
        // Use line count to help calculate a more appropriate height
        const minHeight = 80; // Increased minimum height
        const lineHeight = 20; // Approximate height per line
        const estimatedHeight = lineCount * lineHeight;
        const scrollHeight = textarea.scrollHeight;
        
        // Use the larger of estimated height or scrollHeight
        const newHeight = Math.max(minHeight, scrollHeight + 16, estimatedHeight + 16);
        
        // Add smooth transition for a better user experience
        textarea.style.transition = 'height 0.3s ease-in-out';
        textarea.style.height = `${newHeight}px`;
        
        console.log(`Adjusted textarea height for ${textareaKey} to ${newHeight}px (${lineCount} lines)`);
      }
    }, 0);
  };

  // Effect to adjust textareas after form is loaded or when visibleRiskRows changes
  useEffect(() => {
    if (riskFormInitialized.current) {
      // Force updating textareas with their values and adjust heights
      const forceUpdateTextareas = () => {
        for (let i = 1; i <= visibleRiskRows; i++) {
          const fieldName = i === 1 ? 'mitigationPlan' : `mitigationPlan${i}`;
          const textareaElement = textareaRefs.current[fieldName];
          
          if (textareaElement) {
            // Get value from the form
            const value = riskForm.getValues(fieldName as any) || '';
            
            // Directly update the DOM element
            textareaElement.value = value;
            
            // Calculate appropriate height based on content
            const lineCount = value.split('\n').length;
            const minHeight = 80;
            const lineHeight = 20;
            const estimatedHeight = Math.max(minHeight, lineCount * lineHeight + 16);
            
            // Force set height with extra padding
            textareaElement.style.height = 'auto';
            const scrollHeight = textareaElement.scrollHeight;
            const newHeight = Math.max(estimatedHeight, scrollHeight + 32);
            textareaElement.style.height = `${newHeight}px`;
            
            console.log(`Force updated textarea ${fieldName} with height ${newHeight}px (${lineCount} lines)`);
          } else {
            console.warn(`Textarea ref for ${fieldName} does not exist when attempting to adjust height`);
          }
        }
        console.log("Force updated all mitigation plan textarea heights");
      };
      
      // Run multiple times with increasing delays to ensure DOM is ready
      setTimeout(forceUpdateTextareas, 100);
      setTimeout(forceUpdateTextareas, 300);
      setTimeout(forceUpdateTextareas, 500);
      setTimeout(forceUpdateTextareas, 1000);
      setTimeout(forceUpdateTextareas, 2000);
    }
  }, [visibleRiskRows, riskFormInitialized.current, riskForm]);

  // Function to generate AI-assisted mitigation plan suggestions
