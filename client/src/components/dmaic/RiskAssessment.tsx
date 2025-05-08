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

// Flag to prevent textarea resizing after save operations
let skipNextTextareaResize = false;

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
            // Skip textarea resizing if we're doing it after a save operation
            if (skipNextTextareaResize) {
              console.log("Skipping textarea resize after save operation");
              return;
            }
            
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
                
                // Skip height adjustment if we're in a save operation
                if (skipNextTextareaResize) continue;
                
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
          
          // If we're skipping resize, just run once and reset the flag
          if (skipNextTextareaResize) {
            forceSetTextareaContent();
            skipNextTextareaResize = false;
            return;
          }
          
          // Otherwise run multiple times with increasing delays to catch when DOM is ready
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
      // Store current scroll position before saving
      const scrollPosition = window.scrollY;
      
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
        }).then(res => {
          // Store the scroll position in the returned data for use in onSuccess
          const result = res.json();
          return { result, scrollPosition };
        });
      } else {
        return fetch(`/api/projects/${projectId}/risks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(res => {
          // Store the scroll position in the returned data for use in onSuccess
          const result = res.json();
          return { result, scrollPosition };
        });
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Risk assessment saved successfully",
      });
      
      // Ensure the flag is set to skip textarea resizing after saving
      skipNextTextareaResize = true;
      console.log("Set skipNextTextareaResize flag in onSuccess handler");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/risks`] });
      
      // Restore scroll position after successful save
      const scrollPosition = data.scrollPosition;
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
        console.log("Restored scroll position to:", scrollPosition);
      }, 100);
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
  
  // Function to set fixed height for all textareas to prevent resizing issues
  // isAiGenerated parameter controls whether to adjust height automatically or only for user-resize events
  const adjustTextareaHeight = (textareaKey: string, isAiGenerated: boolean = false) => {
    setTimeout(() => {
      const textarea = textareaRefs.current[textareaKey];
      if (textarea) {
        // Only adjust height automatically if it's AI-generated content
        // For normal save/load operations, respect user's manual resizing
        if (isAiGenerated) {
          // Reset height to auto to get proper scrollHeight calculation
          textarea.style.height = 'auto';
          
          // Calculate new height based on content
          const minHeight = textarea.classList.contains('risk-mitigation-textarea') ? 120 : 24;
          const newHeight = Math.max(minHeight, textarea.scrollHeight + 4);
          
          // Set a reasonable initial height, but allow user resizing
          textarea.style.height = `${newHeight}px`;
          
          console.log(`Adjusted initial height for ${textareaKey} to ${newHeight}px`);
        }
        
        // The synchronizing height feature should only work for manual resizing
        // or AI-generated content, not during save or add risk operations
        if (!skipNextTextareaResize || isAiGenerated) {
          // Extract the row number (if any) from the textarea key
          const rowMatch = textareaKey.match(/(\d+)$/);
          const rowNumber = rowMatch ? rowMatch[1] : '';
          
          // Find all textareas in this row and synchronize their heights
          const riskNameField = rowNumber ? `riskName${rowNumber}` : 'riskName';
          const mitigationPlanField = rowNumber ? `mitigationPlan${rowNumber}` : 'mitigationPlan';
          const riskOwnerField = rowNumber ? `riskOwner${rowNumber}` : 'riskOwner';
          
          // Find the textareas for this row
          const riskNameTextarea = textareaRefs.current[riskNameField];
          const mitigationPlanTextarea = textareaRefs.current[mitigationPlanField];
          const riskOwnerTextarea = textareaRefs.current[riskOwnerField];
          
          // For AI-generated content or manual resize, synchronize the heights
          if (isAiGenerated || (textarea.style.height && parseInt(textarea.style.height) > 120)) {
            // Find the maximum height among all textareas in this row
            let maxHeight = 120; // Minimum height
            
            // Get the current heights of all textareas in this row
            if (riskNameTextarea && riskNameTextarea.style.height) {
              maxHeight = Math.max(maxHeight, parseInt(riskNameTextarea.style.height));
            }
            
            if (mitigationPlanTextarea && mitigationPlanTextarea.style.height) {
              maxHeight = Math.max(maxHeight, parseInt(mitigationPlanTextarea.style.height));
            }
            
            if (riskOwnerTextarea && riskOwnerTextarea.style.height) {
              maxHeight = Math.max(maxHeight, parseInt(riskOwnerTextarea.style.height));
            }
            
            // Get the height of the current textarea that triggered the adjustment
            const currentHeight = parseInt(textarea.style.height);
            maxHeight = Math.max(maxHeight, currentHeight);
            
            console.log(`Synchronizing heights for row ${rowNumber || '1'} to maximum height: ${maxHeight}px`);
            
            // Set all textareas in the row to the maximum height
            if (riskNameTextarea) {
              riskNameTextarea.style.height = `${maxHeight}px`;
            }
            
            if (mitigationPlanTextarea) {
              mitigationPlanTextarea.style.height = `${maxHeight}px`;
            }
            
            if (riskOwnerTextarea) {
              riskOwnerTextarea.style.height = `${maxHeight}px`;
            }
          }
        }
      }
    }, 0);
  };

  // Effect to adjust textareas after form is loaded or when visibleRiskRows changes
  useEffect(() => {
    if (riskFormInitialized.current) {
      // Force updating textareas with their values only (CSS classes handle heights)
      const forceUpdateTextareas = () => {
        // Skip operation after save if needed
        if (skipNextTextareaResize) {
          console.log("Skipping textarea update in useEffect after save");
          return;
        }
        
        for (let i = 1; i <= visibleRiskRows; i++) {
          const fieldName = i === 1 ? 'mitigationPlan' : `mitigationPlan${i}`;
          const textareaElement = textareaRefs.current[fieldName];
          
          if (textareaElement) {
            // Get value from the form and update the element
            const value = riskForm.getValues(fieldName as any) || '';
            textareaElement.value = value;
            
            console.log(`Updated content for ${fieldName}`);
            
            // Force synchronization of all textareas in this row
            const rowNum = i === 1 ? '' : i;
            adjustTextareaHeight(fieldName, true);
          } else {
            console.warn(`Textarea ref for ${fieldName} does not exist`);
          }
        }
        console.log("Updated all mitigation plan textareas with current values");
      };
      
      // If we're skipping resize due to save, just run once
      if (skipNextTextareaResize) {
        setTimeout(() => {
          skipNextTextareaResize = false; // Reset flag after one run
          console.log("Reset skip flag after save operation");
        }, 100);
        return;
      }
      
      // Otherwise run multiple times with increasing delays to ensure DOM is ready
      setTimeout(forceUpdateTextareas, 100);
      setTimeout(forceUpdateTextareas, 300);
      setTimeout(forceUpdateTextareas, 500);
      setTimeout(forceUpdateTextareas, 1000);
      setTimeout(forceUpdateTextareas, 2000);
    }
  }, [visibleRiskRows, riskFormInitialized.current, riskForm]);

  // Function to generate AI-assisted mitigation plan suggestions
  const generateMitigationPlan = (rowNumber: number) => {
    console.log(`Generating mitigation plan for row ${rowNumber}`);
    
    // Get the field names based on row number
    const riskNameField = rowNumber === 1 ? 'riskName' : `riskName${rowNumber}`;
    const probabilityField = rowNumber === 1 ? 'probability' : `probability${rowNumber}`;
    const impactField = rowNumber === 1 ? 'impact' : `impact${rowNumber}`;
    const mitigationPlanField = rowNumber === 1 ? 'mitigationPlan' : `mitigationPlan${rowNumber}`;
    
    console.log(`Using fields: riskName=${riskNameField}, probability=${probabilityField}, impact=${impactField}, mitigationPlan=${mitigationPlanField}`);
    
    // Get the current values
    const riskName = riskForm.getValues(riskNameField as any) || "";
    const probability = riskForm.getValues(probabilityField as any) || "Low";
    const impact = riskForm.getValues(impactField as any) || "Low";
    
    console.log(`Current values: riskName="${riskName}", probability="${probability}", impact="${impact}"`)
    
    // If risk name is empty, show an error
    if (!riskName.trim()) {
      toast({
        title: "Risk description required",
        description: "Please provide a risk description first to generate mitigation suggestions.",
        variant: "destructive"
      });
      return;
    }
    
    // Generate appropriate mitigation plan based on risk details
    const criticality = calculateRiskCriticality(probability, impact);
    
    // Show initial toast notification
    toast({
      title: "Generating mitigation plan",
      description: "Creating mitigation suggestions based on risk details...",
      variant: "default"
    });
    
    // Get suggestions based on probability and impact - without repeating the risk information
    let suggestion = `Recommended Mitigation Strategies:\n\n`;
    
    // Determine risk characteristics based on probability and impact
    const isProbabilityHigh = probability === "High";
    const isProbabilityMedium = probability === "Medium";
    const isImpactHigh = impact === "High";
    const isImpactMedium = impact === "Medium";
    
    // Generate more tailored suggestions based on risk criticality
    if (criticality >= 7) {
      // High criticality (7-9)
      suggestion += "• Implement multiple preventative controls with overlapping coverage\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop prevention strategies to reduce likelihood of occurrence\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Create detailed contingency and recovery plans to minimize impact\n";
        suggestion += "• Consider risk transfer options (insurance, partnerships, contracts)\n";
      }
      
      suggestion += "• Assign dedicated risk owner with executive oversight\n";
      suggestion += "• Schedule frequent monitoring on weekly/bi-weekly basis\n";
      suggestion += "• Implement early warning indicators and thresholds\n";
      suggestion += "• Create detailed response and escalation procedures\n";
    } else if (criticality >= 4) {
      // Medium criticality (4-6)
      suggestion += "• Implement key preventative controls\n";
      
      if (isProbabilityMedium || isProbabilityHigh) {
        suggestion += "• Develop strategies to reduce occurrence probability\n";
      }
      
      if (isImpactMedium || isImpactHigh) {
        suggestion += "• Prepare specific response plans for impact reduction\n";
      }
      
      suggestion += "• Assign dedicated risk owner for regular monitoring\n";
      suggestion += "• Schedule monthly review of risk status\n";
      suggestion += "• Define clear triggers for escalation\n";
      suggestion += "• Document and communicate mitigation approach";
    } else {
      // Low criticality (1-3)
      suggestion += "• Implement basic monitoring controls\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Consider low-cost preventative measures\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Document simple response procedures\n";
      }
      
      suggestion += "• Assign risk owner for awareness\n";
      suggestion += "• Review quarterly or if conditions change\n";
      suggestion += "• Accept risk with minimal controls\n";
      suggestion += "• Document acceptance rationale";
    }
    
    // Extract key themes from risk name for more targeted suggestions
    const riskNameLower = riskName.toLowerCase();
    
    // Risk type specific suggestions
    let specificRiskType = "";
    
    if (riskNameLower.includes("technology") || riskNameLower.includes("technical") || riskNameLower.includes("system") || riskNameLower.includes("software") || riskNameLower.includes("it")) {
      specificRiskType = "Technology";
      suggestion += "\n\nTechnology Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Conduct comprehensive technical assessments and penetration testing\n";
        suggestion += "• Implement redundant systems or fallback options\n";
      } else {
        suggestion += "• Conduct targeted technical assessments based on risk areas\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Develop detailed disaster recovery procedures\n";
        suggestion += "• Establish 24/7 technical support protocols\n";
      } else {
        suggestion += "• Establish standard technical support channels\n";
      }
      
      suggestion += "• Ensure knowledge transfer and documentation\n";
      suggestion += "• Consider prototype or pilot implementations before full deployment\n";
      suggestion += "• Provide specialized training for technical staff";
      
    } else if (riskNameLower.includes("resource") || riskNameLower.includes("staffing") || riskNameLower.includes("personnel") || riskNameLower.includes("team") || riskNameLower.includes("employee")) {
      specificRiskType = "Resource";
      suggestion += "\n\nResource Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop comprehensive succession and continuity plans\n";
        suggestion += "• Prioritize critical resource retention strategies\n";
      } else {
        suggestion += "• Create basic succession plans for key roles\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Establish partnerships with staffing agencies for rapid response\n";
        suggestion += "• Create detailed knowledge transfer procedures\n";
      } else {
        suggestion += "• Maintain relationship with staffing resources\n";
      }
      
      suggestion += "• Cross-train team members on critical functions\n";
      suggestion += "• Implement knowledge sharing and documentation systems\n";
      suggestion += "• Develop hiring or contractor contingencies as backup";
      
    } else if (riskNameLower.includes("schedule") || riskNameLower.includes("timeline") || riskNameLower.includes("deadline") || riskNameLower.includes("delay")) {
      specificRiskType = "Schedule";
      suggestion += "\n\nSchedule Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Build substantial buffer time (20-30%) into critical path activities\n";
        suggestion += "• Implement formal change control procedures for timeline changes\n";
      } else {
        suggestion += "• Build reasonable buffer time (10-15%) into critical path activities\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Prepare contingency plan for deadline failure scenarios\n";
        suggestion += "• Identify potential scope reduction options if necessary\n";
      } else {
        suggestion += "• Document potential scope adjustment options\n";
      }
      
      suggestion += "• Map and monitor all schedule dependencies\n";
      suggestion += "• Create detailed milestone tracking system\n";
      suggestion += "• Develop acceleration options if delays occur\n";
      suggestion += "• Establish clear escalation paths for timeline issues";
      
    } else if (riskNameLower.includes("budget") || riskNameLower.includes("cost") || riskNameLower.includes("financial") || riskNameLower.includes("expense") || riskNameLower.includes("funding")) {
      specificRiskType = "Financial";
      suggestion += "\n\nFinancial Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Include substantial contingency reserves (15-20%) in budget\n";
        suggestion += "• Implement stricter spending controls and approvals\n";
      } else {
        suggestion += "• Include reasonable contingency reserves (10%) in budget\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Prepare detailed cost reduction options for emergency scenarios\n";
        suggestion += "• Establish emergency funding sources or protocols\n";
      } else {
        suggestion += "• Document potential cost-saving measures if needed\n";
      }
      
      suggestion += "• Implement detailed cost tracking system with frequent reviews\n";
      suggestion += "• Set clear spending approval thresholds and authority\n";
      suggestion += "• Create key financial performance indicators and alerts\n";
      suggestion += "• Establish regular financial review schedule";
      
    } else if (riskNameLower.includes("quality") || riskNameLower.includes("performance") || riskNameLower.includes("defect") || riskNameLower.includes("standard") || riskNameLower.includes("compliance")) {
      specificRiskType = "Quality";
      suggestion += "\n\nQuality Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Implement comprehensive quality management system\n";
        suggestion += "• Conduct preventative quality reviews at multiple stages\n";
      } else {
        suggestion += "• Implement targeted quality control procedures\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Develop rapid response protocols for critical quality issues\n";
        suggestion += "• Create remediation plans with dedicated resources\n";
      } else {
        suggestion += "• Prepare standard remediation approaches for common issues\n";
      }
      
      suggestion += "• Establish clear quality criteria, standards and metrics\n";
      suggestion += "• Conduct regular testing throughout process\n";
      suggestion += "• Implement independent quality verification\n";
      suggestion += "• Provide quality-focused training to team members";
      
    } else if (riskNameLower.includes("change") || riskNameLower.includes("adoption") || riskNameLower.includes("resistance") || riskNameLower.includes("acceptance") || riskNameLower.includes("stakeholder")) {
      specificRiskType = "Change Management";
      suggestion += "\n\nChange Management Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop comprehensive change management and communication plan\n";
        suggestion += "• Conduct stakeholder impact analysis and prioritization\n";
      } else {
        suggestion += "• Create standard change management approach\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Engage executive sponsors to champion the change\n";
        suggestion += "• Establish formal feedback and concern resolution processes\n";
      } else {
        suggestion += "• Identify key stakeholders for targeted engagement\n";
      }
      
      suggestion += "• Provide clear and frequent communications on rationale and benefits\n";
      suggestion += "• Create targeted training and support materials\n";
      suggestion += "• Establish feedback channels for concerns and suggestions\n";
      suggestion += "• Identify and engage change champions within organization";
    }
    
    // If no specific risk type was identified, provide general suggestions
    if (!specificRiskType) {
      suggestion += "\n\nGeneral Risk Response Recommendations:\n";
      suggestion += "• Document clear assumptions and conditions\n";
      suggestion += "• Establish regular review and reassessment cycle\n";
      suggestion += "• Create communication plan for status updates\n";
      suggestion += "• Identify key stakeholders to involve in mitigation\n";
      suggestion += "• Define clear success criteria for mitigation efforts";
    }
    
    // Add conclusion based on criticality
    suggestion += "\n\nMonitoring and Review:";
    if (criticality >= 7) {
      suggestion += "\n• Review risk status weekly";
      suggestion += "\n• Report to executive leadership monthly";
      suggestion += "\n• Reassess mitigation effectiveness quarterly";
    } else if (criticality >= 4) {
      suggestion += "\n• Review risk status bi-weekly";
      suggestion += "\n• Report to project leadership monthly";
      suggestion += "\n• Reassess mitigation effectiveness quarterly";
    } else {
      suggestion += "\n• Review risk status monthly";
      suggestion += "\n• Report in standard project updates";
      suggestion += "\n• Reassess if conditions change";
    }
    
    // Show success toast when plan is generated with specific risk type and criticality if detected
    let criticalityLevel = "Low";
    if (criticality >= 7) criticalityLevel = "High";
    else if (criticality >= 4) criticalityLevel = "Medium";
    
    toast({
      title: "Mitigation plan generated",
      description: specificRiskType 
        ? `AI-suggested strategies for ${criticalityLevel} ${specificRiskType} risk are ready.` 
        : `AI-suggested strategies for ${criticalityLevel} risk (${criticality}/9) are ready.`,
      variant: "default",
      className: "bg-green-50 border-green-200 text-green-700"
    });
    
    // Update the form with the generated suggestion
    console.log(`Setting value for field ${mitigationPlanField} to suggestion (length: ${suggestion.length})`);
    riskForm.setValue(mitigationPlanField as any, suggestion);
    
    // Force form to recognize the change
    riskForm.trigger(mitigationPlanField as any);
    
    // Check if the textarea ref exists
    const textareaElement = textareaRefs.current[mitigationPlanField];
    if (!textareaElement) {
      console.warn(`Textarea ref for ${mitigationPlanField} does not exist!`);
    } else {
      console.log(`Textarea ref for ${mitigationPlanField} exists, will resize it.`);
      // Set value directly on the element as a backup
      textareaElement.value = suggestion;
    }
    
    // Adjust textarea height to fit the new content with multiple retries using longer timeouts
    // First immediate adjustment - passing true for isAiGenerated parameter
    adjustTextareaHeight(mitigationPlanField, true);
    
    // Staggered adjustments with increasing timeouts for better reliability
    setTimeout(() => {
      adjustTextareaHeight(mitigationPlanField, true);
      
      setTimeout(() => {
        adjustTextareaHeight(mitigationPlanField, true);
        
        setTimeout(() => {
          adjustTextareaHeight(mitigationPlanField, true);
          
          // Final adjustment after DOM has fully updated
          setTimeout(() => {
            // Make one last adjustment
            adjustTextareaHeight(mitigationPlanField, true);
            
            // Force update the textarea if ref exists
            const textarea = textareaRefs.current[mitigationPlanField];
            if (textarea) {
              textarea.style.height = 'auto';
              const scrollHeight = textarea.scrollHeight;
              textarea.style.height = `${scrollHeight + 16}px`;
            }
          }, 800);
        }, 600);
      }, 400);
    }, 200);
    
    // No need for a second toast notification - we already showed one above
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
    
    // Set flag to skip resizing textareas after save operation
    skipNextTextareaResize = true;
    console.log("Set flag to skip textarea resize after save");
    
    // Capture the current scroll position before saving
    const savedScrollPosition = window.scrollY;
    console.log("Current scroll position before save:", savedScrollPosition);
    
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
        
        // Use a more reliable way to preserve scroll position
        // First set the values, then restore scroll in a separate timeout
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
          
          // Now restore scroll position in a separate operation after form values are set
          setTimeout(() => {
            console.log(`Restoring scroll position to ${savedScrollPosition}`);
            // Use standard method without behavior option for maximum browser compatibility
            window.scrollTo(0, savedScrollPosition);
          }, 50);
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
          <div className="grid grid-cols-12 gap-1 mb-4">
            <div className="p-3 bg-red-50 rounded-md text-center w-[98%] col-span-3">
              <h4 className="font-medium text-red-600 text-sm">Risk</h4>
            </div>
            <div className="p-3 bg-amber-50 rounded-md text-center w-[98%] col-span-1.5">
              <h4 className="font-medium text-amber-600 text-sm">Probability</h4>
            </div>
            <div className="p-3 bg-orange-50 rounded-md text-center w-[98%] col-span-1.5">
              <h4 className="font-medium text-orange-600 text-sm">Impact</h4>
            </div>
            <div className="p-3 bg-purple-50 rounded-md text-center w-[98%] col-span-1">
              <h4 className="font-medium text-purple-600 text-sm">Criticality</h4>
            </div>
            <div className="p-3 bg-blue-50 rounded-md text-center w-[98%] col-span-4">
              <h4 className="font-medium text-blue-600 text-sm">Mitigation Plan</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-md text-center w-[98%] col-span-2">
              <h4 className="font-medium text-green-600 text-sm">Risk Owner</h4>
            </div>
          </div>
          
          {/* First row of Risk (always visible and mandatory) */}
          <div className="risk-row">
            <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                rows={1}
                placeholder="Describe the risk"
                {...riskForm.register("riskName")}
              />
            </div>
            <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
            <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
            <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
              <div className="text-lg font-bold">
                {riskForm.watch("riskCriticality") || 1}/9
              </div>
              <input type="hidden" {...riskForm.register("riskCriticality")} />
            </div>
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
              <div className="relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                  rows={5}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan"] = el;
                      
                      // Store the reference and set initial content
                      setTimeout(() => {
                        try {
                          if (riskData?.risk?.mitigationPlan && el) {
                            // Force the value to be set directly
                            el.value = riskData.risk.mitigationPlan;
                            console.log(`Direct ref injection for mitigationPlan completed`);
                            // Initialize height based on content
                            adjustTextareaHeight("mitigationPlan", true);
                          }
                        } catch (error) {
                          console.error("Error setting textarea content:", error);
                        }
                      }, 200);
                    }
                  }}
                />
                <div className="absolute top-1 right-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                          onClick={() => generateMitigationPlan(1)}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Generate AI-suggested mitigation plan</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                rows={1}
                placeholder="Who is responsible for monitoring this risk?"
                {...riskForm.register("riskOwner")}
              />
            </div>
            {/* No delete button for first row (it's mandatory) */}
          </div>
          
          {/* Second row (conditionally rendered) */}
          {visibleRiskRows >= 2 && (
            <div className="risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName2")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality2") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality2")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan2")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan2"] = el;
                        
                        // Simply store the reference, CSS classes handle the fixed height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan2 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan2;
                              console.log(`Direct ref injection for mitigationPlan2 completed`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea content:", error);
                          }
                        }, 200);
                      }
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                            onClick={() => generateMitigationPlan(2)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Generate AI-suggested mitigation plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                  rows={1}
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
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Third row (conditionally rendered) */}
          {visibleRiskRows >= 3 && (
            <div className="risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName3")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality3") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality3")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan3")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan3"] = el;
                        
                        // Simply store the reference, CSS classes handle the fixed height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan3 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan3;
                              console.log(`Direct ref injection for mitigationPlan3 completed`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea content:", error);
                          }
                        }, 200);
                      }
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                            onClick={() => generateMitigationPlan(3)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Generate AI-suggested mitigation plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                  rows={1}
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
            <div className="risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName4")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality4") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality4")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan4")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan4"] = el;
                        
                        // Simply store the reference, CSS classes handle the fixed height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan4 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan4;
                              console.log(`Direct ref injection for mitigationPlan4 completed`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea content:", error);
                          }
                        }, 200);
                      }
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                            onClick={() => generateMitigationPlan(4)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Generate AI-suggested mitigation plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                  rows={1}
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
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Fifth row (conditionally rendered) */}
          {visibleRiskRows >= 5 && (
            <div className="risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName5")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality5") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality5")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan5")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan5"] = el;
                        
                        // Simply store the reference, CSS classes handle the fixed height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan5 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan5;
                              console.log(`Direct ref injection for mitigationPlan5 completed`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea content:", error);
                          }
                        }, 200);
                      }
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                            onClick={() => generateMitigationPlan(5)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Generate AI-suggested mitigation plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                  rows={1}
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
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Sixth row (conditionally rendered) */}
          {visibleRiskRows >= 6 && (
            <div className="risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName6")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[98%] col-span-1.5">
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
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[98%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality6") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality6")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan6")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan6"] = el;
                        
                        // Simply store the reference, CSS classes handle the fixed height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan6 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan6;
                              console.log(`Direct ref injection for mitigationPlan6 completed`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea content:", error);
                          }
                        }, 200);
                      }
                    }}
                  />
                  <div className="absolute top-1 right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                            onClick={() => generateMitigationPlan(6)}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Generate AI-suggested mitigation plan</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
                  rows={1}
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