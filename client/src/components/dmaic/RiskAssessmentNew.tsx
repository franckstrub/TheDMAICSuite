import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusCircle, Sparkles, Save } from "lucide-react";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";

// Risk item interface
interface RiskItem {
  id?: number;
  projectId: number;
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

  lastUpdated?: Date;
  
  // Allow for dynamic fields beyond the 6 defined in the schema
  [key: string]: string | number | Date | undefined;
}

export default function RiskAssessmentNew() {
  // Get project ID from params
  const params = useParams();
  const projectId = params.projectId || '';
  
  // Get user from context
  const { user } = useAppContext();
  
  // Toast notifications
  const { toast } = useToast();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [riskData, setRiskData] = useState<RiskItem>(createDefaultRiskItem(Number(projectId)));
  const [visibleRiskRows, setVisibleRiskRows] = useState(1);
  
  // Reference to textarea elements for manual height adjustment
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  
  // Create default risk item
  function createDefaultRiskItem(projectId: number): RiskItem {
    return {
      projectId,
      riskName: '',
      probability: 'Low',
      impact: 'Low',
      riskCriticality: 1,
      mitigationPlan: '',
      riskOwner: '',
      
      // Initialize with empty/default values for all potential rows
      riskName2: '',
      probability2: 'Low',
      impact2: 'Low',
      riskCriticality2: 1,
      mitigationPlan2: '',
      riskOwner2: '',
      
      riskName3: '',
      probability3: 'Low',
      impact3: 'Low',
      riskCriticality3: 1,
      mitigationPlan3: '',
      riskOwner3: '',
      
      riskName4: '',
      probability4: 'Low',
      impact4: 'Low',
      riskCriticality4: 1,
      mitigationPlan4: '',
      riskOwner4: '',
      
      riskName5: '',
      probability5: 'Low',
      impact5: 'Low',
      riskCriticality5: 1,
      mitigationPlan5: '',
      riskOwner5: '',
      
      riskName6: '',
      probability6: 'Low',
      impact6: 'Low',
      riskCriticality6: 1,
      mitigationPlan6: '',
      riskOwner6: '',
    };
  }
  
  // Calculate risk criticality based on probability and impact
  function calculateRiskCriticality(probability: string, impact: string): number {
    const probValue = probability === 'High' ? 3 : probability === 'Medium' ? 2 : 1;
    const impactValue = impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1;
    return probValue * impactValue;
  }
  
  // Load risk data from API
  const loadRiskData = async (showToast: boolean = false) => {
    if (!projectId) return;
    
    try {
      console.log("Fetching risk data for project:", projectId);
      setIsLoading(true);
      
      // Adjust all textareas to default height initially
      for (const key in textareaRefs.current) {
        adjustTextareaHeight(key);
      }
      
      const response = await fetch(`/api/projects/${projectId}/risks`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load risk data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Raw risk data from API:", data);
      
      // Handle case where risk data is in data.risk (standard API response)
      const riskItem = data.risk;
      
      if (riskItem) {
        console.log("Risk data successfully loaded from database:", riskItem);
        setRiskData(riskItem);
        
        // Determine how many rows to show based on which rows have meaningful content
        let rowCount = 1; // Always show at least one row
        
        // We want to display exactly what's in the database + 1 empty row
        // Find the exact rows that have content in the database
        let rowsWithContent = [];
          
        // Check each row for actual content
        for (let i = 1; i <= 6; i++) {
          const suffix = i === 1 ? '' : i.toString();
          
          // Get content from all fields in this row
          const riskName = riskItem[`riskName${suffix}`] || '';
          const mitigationPlan = riskItem[`mitigationPlan${suffix}`] || '';
          const riskOwner = riskItem[`riskOwner${suffix}`] || '';
          
          // A row has content if ANY field has text (even 1 character)
          const hasContent = (
            riskName.trim().length > 0 ||
            mitigationPlan.trim().length > 0 ||
            riskOwner.trim().length > 0
          );
          
          if (hasContent) {
            console.log(`Row ${i} has content in database`);
            rowsWithContent.push(i);
          }
        }
        
        // If no rows have content, show just one empty row
        if (rowsWithContent.length === 0) {
          rowCount = 1;
          console.log(`No rows with content, showing 1 empty row`);
        } else {
          // Show EXACTLY what's in the database - no extra empty row
          rowCount = Math.min(6, Math.max(...rowsWithContent));
          console.log(`Found ${rowsWithContent.length} rows with content, highest is row ${rowCount}, showing exactly the rows with content`);
        }
        
        // Don't log highestRowWithContent when it's not set (when using server's rowsWithContent)
        
        // Second pass: Clean up any rows without content
        // This ensures all empty rows are explicitly cleared
        for (let i = 1; i <= 6; i++) {
          const suffix = i === 1 ? '' : i.toString();
          
          // Get content from all fields in this row
          const riskName = riskItem[`riskName${suffix}`] || '';
          const mitigationPlan = riskItem[`mitigationPlan${suffix}`] || '';
          const riskOwner = riskItem[`riskOwner${suffix}`] || '';
          
          // Check if there's any content at all - we're being much more lenient now
          const hasAnyContent = (
            riskName.trim().length > 0 ||
            mitigationPlan.trim().length > 0 ||
            riskOwner.trim().length > 0
          );
          
          // If this row should be shown (at or below our rowCount) but has no content,
          // leave it as is but blank. If it's above our rowCount, clear it completely.
          if (i > rowCount || !hasAnyContent) {
            // Force blank out this row's data in our local state to prevent ghost data
            riskItem[`riskName${suffix}`] = '';
            riskItem[`probability${suffix}`] = 'Low';
            riskItem[`impact${suffix}`] = 'Low';
            riskItem[`riskCriticality${suffix}`] = 1;
            riskItem[`mitigationPlan${suffix}`] = '';
            riskItem[`riskOwner${suffix}`] = '';
            
            if (i <= rowCount) {
              console.log(`Row ${i} is empty but will be shown (within visible row count)`);
            } else {
              console.log(`Row ${i} is empty and above row count - will be hidden`);
            }
          } else {
            console.log(`Row ${i} has content and will be shown`);
          }
        }
        
        console.log(`Setting visible rows to: ${rowCount} based on data content`);
        setVisibleRiskRows(rowCount);
        
        // Store flag in sessionStorage
        sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        
        // Adjust textarea heights after data load
        setTimeout(() => {
          for (const key in textareaRefs.current) {
            adjustTextareaHeight(key);
          }
        }, 100);
        
        if (showToast) {
          toast({
            title: "Risk assessment loaded",
            description: "The latest risk assessment data has been loaded.",
          });
        }
      } else {
        console.log("No existing risk data found, using defaults");
        // If no data found, use default empty state
        setRiskData(createDefaultRiskItem(Number(projectId)));
        setVisibleRiskRows(1);
      }
    } catch (error) {
      console.error("Error loading risk data:", error);
      toast({
        title: "Error loading risk data",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save risk data to API
  const saveRiskData = async () => {
    setIsSaving(true);
    
    // Store scroll position and section element before any operations
    const scrollPosition = window.scrollY;
    const riskSection = document.getElementById('risk-assessment-section');
    
    // First, ensure all textarea values are properly captured
    const updatedRiskData = {...riskData};
    
    // Extract values directly from the textareas
    // This ensures we capture the latest content even if state hasn't updated
    for (let i = 1; i <= 6; i++) {
      const nameProp = i === 1 ? 'riskName' : `riskName${i}`;
      const planProp = i === 1 ? 'mitigationPlan' : `mitigationPlan${i}`;
      const ownerProp = i === 1 ? 'riskOwner' : `riskOwner${i}`;
      
      // Get values directly from textareas if they exist
      if (textareaRefs.current[nameProp]) {
        updatedRiskData[nameProp as keyof RiskItem] = textareaRefs.current[nameProp].value;
      }
      
      if (textareaRefs.current[planProp]) {
        updatedRiskData[planProp as keyof RiskItem] = textareaRefs.current[planProp].value;
      }
      
      if (textareaRefs.current[ownerProp]) {
        updatedRiskData[ownerProp as keyof RiskItem] = textareaRefs.current[ownerProp].value;
      }
    }
    
    try {
      // Save the data to server first
      const savedResult = await saveDataToServer(updatedRiskData);
      
      // Directly update our state with the server response instead of reloading
      if (savedResult && savedResult.risk) {
        setRiskData(savedResult.risk);
      }
      
      // Update session storage flag
      sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
      
      // Show success toast
      if (visibleRiskRows <= 6) {
        toast({
          title: "Risk assessment saved",
          description: "All changes have been saved successfully."
        });
      }
      
      // We're intentionally NOT calling loadRiskData() here to prevent the page jerk
      // Instead, we'll update our UI with the response from saveDataToServer
      
      // Restore scroll position after a short delay to ensure DOM is updated
      setTimeout(() => {
        // Restore scroll position
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
        
        // Force risk section into view if available
        if (riskSection) {
          riskSection.scrollIntoView({ 
            behavior: 'auto',
            block: 'start'
          });
        }
        
        console.log(`Restored scroll position to ${scrollPosition}px after saving`);
      }, 50);
      
    } catch (error) {
      console.error('Error saving risk data:', error);
      toast({
        title: "Error",
        description: "Failed to save risk assessment data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Helper function to save risk data to the server
  const saveDataToServer = async (dataToSave: RiskItem): Promise<any> => {
    try {
      const url = dataToSave.id 
        ? `/api/risks/${dataToSave.id}` 
        : `/api/projects/${projectId}/risks`;
      
      const method = dataToSave.id ? 'PUT' : 'POST';
      
      console.log(`Saving risk data via ${method} to ${url}`);
      
      // ENHANCED SANITIZATION: Make a clean copy and ensure all fields 
      // beyond visible rows are explicitly set to empty/default values
      const sanitizedData = {...dataToSave};
      
      // For any row beyond what's currently visible, ensure data is cleared
      for (let i = visibleRiskRows + 1; i <= 6; i++) {
        const suffix = i === 1 ? '' : i.toString();
        sanitizedData[`riskName${suffix}` as keyof RiskItem] = '';
        sanitizedData[`probability${suffix}` as keyof RiskItem] = 'Low';
        sanitizedData[`impact${suffix}` as keyof RiskItem] = 'Low';
        sanitizedData[`riskCriticality${suffix}` as keyof RiskItem] = 1;
        sanitizedData[`mitigationPlan${suffix}` as keyof RiskItem] = '';
        sanitizedData[`riskOwner${suffix}` as keyof RiskItem] = '';
      }
      
      // Prepare payload with explicit fields and sanitized data
      const payload = {
        ...sanitizedData,
        userId: user?.id || 1,
        projectId: Number(projectId),
      };
      
      // Add warning for rows beyond the schema limit
      if (visibleRiskRows > 6) {
        const notSavedCount = visibleRiskRows - 6;
        console.log(`Warning: ${notSavedCount} risk rows beyond the 6th row will not be saved to the database.`);
        
        toast({
          title: "Risk Assessment Saved Partially",
          description: `Note: The first 6 risk items have been saved to the database. ${notSavedCount} additional items will be displayed but not persisted between sessions.`,
          duration: 5000
        });
      }
      
      // LOG what we're actually sending to the server
      console.log("Final payload being saved:", {
        method,
        url,
        visibleRows: visibleRiskRows,
        hasRow2: !!payload.riskName2?.trim().length,
        hasRow3: !!payload.riskName3?.trim().length,
        hasRow4: !!payload.riskName4?.trim().length
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save risk data: ${response.status}`);
      }
      
      // Store flag in sessionStorage
      sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
      
      const savedData = await response.json();
      
      // CRITICAL FIX: Make sure to sanitize the response data too before updating state
      // This ensures that even if the server sends back unexpected values, we don't display them
      const sanitizedResponse = {...savedData.risk};
      
      // Only keep visible rows - explicitly clear out any data for invisible rows
      for (let i = visibleRiskRows + 1; i <= 6; i++) {
        const suffix = i === 1 ? '' : i.toString();
        sanitizedResponse[`riskName${suffix}`] = '';
        sanitizedResponse[`probability${suffix}`] = 'Low';
        sanitizedResponse[`impact${suffix}`] = 'Low';
        sanitizedResponse[`riskCriticality${suffix}`] = 1;
        sanitizedResponse[`mitigationPlan${suffix}`] = '';
        sanitizedResponse[`riskOwner${suffix}`] = '';
      }
      
      // Update the local risk data with the sanitized data
      setRiskData(sanitizedResponse);
      
      return savedData;
    } catch (error) {
      console.error('Error saving risk data:', error);
      throw error;
    }
  };
  
  // Add a new risk row
  const addRiskRow = () => {
    console.log('Adding new risk row');
    
    // Allow adding rows without any limit
    setVisibleRiskRows(prev => prev + 1);
  };
  
  // Handle removing a row
  const deleteRiskRow = (rowIndex: number) => {
    if (rowIndex <= 1) {
      // Can't delete the first row
      return;
    }
    
    console.log(`Deleting row ${rowIndex}`);
    
    try {
      // Clone the current risk data
      let updatedRiskData = {...riskData};
      
      // Directly clear only the row being deleted - don't shift anything
      const suffix = rowIndex === 1 ? '' : rowIndex.toString();
      
      console.log(`Directly clearing only row ${rowIndex} without shifting data`);
      
      // Clear only the specific row being deleted
      updatedRiskData[`riskName${suffix}` as keyof RiskItem] = '';
      updatedRiskData[`probability${suffix}` as keyof RiskItem] = 'Low';
      updatedRiskData[`impact${suffix}` as keyof RiskItem] = 'Low';
      updatedRiskData[`riskCriticality${suffix}` as keyof RiskItem] = 1;
      updatedRiskData[`mitigationPlan${suffix}` as keyof RiskItem] = '';
      updatedRiskData[`riskOwner${suffix}` as keyof RiskItem] = '';
      
      // Log the data we're about to save
      console.log("Updated risk data after deletion (about to save):", updatedRiskData);
      
      // Update UI immediately
      setRiskData(updatedRiskData);
      
      // Decrease visible rows first (immediately in UI)
      setVisibleRiskRows(prev => Math.max(1, prev - 1));
      
      // Save to server
      saveDataToServer(updatedRiskData)
        .then(() => {
          // Reload the risk data from the server to ensure we see exactly what's in the database
          loadRiskData(false);
          
          // Show success message
          toast({
            title: "Row deleted",
            description: "Risk row has been deleted and changes saved to the database.",
            duration: 3000
          });
          
          // Ensure session storage is updated
          sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        })
        .catch(error => {
          console.error('Error saving risk data after deletion:', error);
          toast({
            title: "Error",
            description: "Failed to save changes after row deletion. Please try again.",
            variant: "destructive"
          });
        });
    } catch (error) {
      console.error('Error in row deletion process:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the row. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Update risk criticality when probability or impact changes
  const updateRiskCriticality = (rowIndex: number, field: 'probability' | 'impact', value: string) => {
    const updatedRiskData = {...riskData};
    const suffixProp = rowIndex === 1 ? '' : rowIndex.toString();
    
    // Update the corresponding field
    updatedRiskData[`${field}${suffixProp}` as keyof RiskItem] = value;
    
    // Get current probability and impact values
    const probability = field === 'probability' 
      ? value 
      : (updatedRiskData[`probability${suffixProp}` as keyof RiskItem] as string || 'Low');
    
    const impact = field === 'impact' 
      ? value 
      : (updatedRiskData[`impact${suffixProp}` as keyof RiskItem] as string || 'Low');
    
    // Calculate new criticality
    const criticality = calculateRiskCriticality(probability, impact);
    updatedRiskData[`riskCriticality${suffixProp}` as keyof RiskItem] = criticality;
    
    // Update state
    setRiskData(updatedRiskData);
  };
  
  // Generate mitigation plan with Claude AI
  const generateMitigationPlan = async (rowIndex: number) => {
    const suffixProp = rowIndex === 1 ? '' : rowIndex.toString();
    const riskNameField = `riskName${suffixProp}` as keyof RiskItem;
    const impactField = `impact${suffixProp}` as keyof RiskItem;
    const probField = `probability${suffixProp}` as keyof RiskItem;
    
    const riskName = riskData[riskNameField] as string;
    const impact = riskData[impactField] as string;
    const probability = riskData[probField] as string;
    
    if (!riskName) {
      toast({
        title: "Missing information",
        description: "Please enter a risk name before generating an AI-powered mitigation plan.",
        variant: "default"
      });
      return;
    }
    
    // Add loading toast
    const loadingToast = toast({
      title: "Generating AI-powered mitigation plan",
      description: "Please wait while we generate an AI-powered mitigation plan for you...",
      variant: "default",
      duration: 10000
    });
    
    try {
      const mitigationPlanField = `mitigationPlan${suffixProp}` as keyof RiskItem;
      const fieldNameAsString = `mitigationPlan${suffixProp}`;
      
      // Call our API endpoint to generate a AI-powered mitigation plan with Google Gemini
      const response = await fetch('/api/generate-mitigation-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          riskName,
          probability,
          impact
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 500 && errorData.message?.includes('authentication')) {
          throw new Error('API key authentication failed. Please contact your administrator to set up a valid Claude API key.');
        } else {
          throw new Error(`Failed to generate AI-powered mitigation plan: ${errorData.message || response.status}`);
        }
      }
      
      const data = await response.json();
      const generatedPlan = data.mitigationPlan;
      
      // Update the risk data with the generated plan
      const updatedRiskData = {...riskData};
      updatedRiskData[mitigationPlanField] = generatedPlan;
      setRiskData(updatedRiskData);
      
      // Update the textarea directly as well for immediate display
      if (textareaRefs.current[fieldNameAsString as string]) {
        textareaRefs.current[fieldNameAsString as string].value = generatedPlan;
        adjustTextareaHeight(fieldNameAsString as string, true);
      }
      
      // Automatically save the updated data to the database
      try {
        await saveDataToServer(updatedRiskData);
        sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        
        toast({
          title: "AI-powered Mitigation plan generated and saved",
          description: "An AI-powered mitigation plan has been created and saved to your project. Feel free to edit it as needed.",
        });
      } catch (saveError) {
        console.error('Error saving AI-powered generated mitigation plan:', saveError);
        toast({
          title: "AI-powered Mitigation plan generated",
          description: "AI-powered mitigation Plan created successfully, but there was an issue saving it. Please click 'Save Risk Assessment' to ensure it's stored.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error generating AI-powered mitigation plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI-powered mitigation plan. Please try again or create one manually.",
        variant: "destructive"
      });
    }
  };
  
  // Adjust textarea height based on content
  const adjustTextareaHeight = (fieldName: string, isAiGenerated: boolean = false) => {
    const textarea = textareaRefs.current[fieldName];
    if (!textarea) return;
    
    // Store current height before adjusting
    const currentHeight = textarea.style.height;
    
    // Reset height to calculate scrollHeight correctly
    textarea.style.height = 'auto';
    
    // Calculate new height
    const minHeight = 80;
    const newHeight = Math.max(textarea.scrollHeight, minHeight);
    
    // If this is during a save operation and we already have a height set,
    // maintain the current height to prevent jerking
    if (isSaving && currentHeight && currentHeight !== 'auto' && !isAiGenerated) {
      return;
    }
    
    // Apply new height with transition for smooth resizing
    textarea.style.transition = isAiGenerated ? 'height 0.5s ease-in-out' : 'none';
    textarea.style.height = `${newHeight}px`;
    
    console.log(`Adjusted textarea height for ${fieldName} to ${newHeight}px`);
  };
  
  // Handle manual input to textareas
  const handleTextareaChange = (fieldName: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedRiskData = {...riskData};
    updatedRiskData[fieldName as keyof RiskItem] = e.target.value;
    setRiskData(updatedRiskData);
    
    // Adjust height
    adjustTextareaHeight(fieldName);
  };
  
  // Initial data load on component mount
  useEffect(() => {
    console.log("RiskAssessment component mounted - always try loading from database first");
    
    // Always attempt to load from the database first, regardless of sessionStorage state
    loadRiskData(false);
  }, [projectId]);
  
  // After data changes, adjust textarea heights
  useEffect(() => {
    // After items update
    console.log("Adjusted all textarea heights after items update");
    for (const key in textareaRefs.current) {
      adjustTextareaHeight(key);
    }
  }, [visibleRiskRows]);
  
  // Render risk row
  const renderRiskRow = (rowIndex: number) => {
    const suffixProp = rowIndex === 1 ? '' : rowIndex.toString();
    const riskNameField = `riskName${suffixProp}` as keyof RiskItem;
    const probabilityField = `probability${suffixProp}` as keyof RiskItem;
    const impactField = `impact${suffixProp}` as keyof RiskItem;
    const criticalityField = `riskCriticality${suffixProp}` as keyof RiskItem;
    const mitigationField = `mitigationPlan${suffixProp}` as keyof RiskItem;
    const ownerField = `riskOwner${suffixProp}` as keyof RiskItem;
    
    return (
      <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row" key={`risk-row-${rowIndex}`}>
        <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
          <Textarea
            className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
            rows={1}
            placeholder="Describe the risk"
            value={riskData[riskNameField] as string || ''}
            onChange={(e) => handleTextareaChange(`riskName${suffixProp}`, e)}
            ref={(el) => {
              if (el) textareaRefs.current[`riskName${suffixProp}`] = el;
            }}
          />
        </div>
        <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
          <Select
            value={riskData[probabilityField] as string || 'Low'}
            onValueChange={(value) => updateRiskCriticality(rowIndex, 'probability', value)}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Probability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="border border-orange-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
          <Select
            value={riskData[impactField] as string || 'Low'}
            onValueChange={(value) => updateRiskCriticality(rowIndex, 'impact', value)}
          >
            <SelectTrigger className="w-20">
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
            {String((riskData[criticalityField] as number) || 1)}/9
          </div>
        </div>
        <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
          <div className="relative">
            <Textarea
              className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
              rows={5}
              placeholder="How will you mitigate this risk?"
              value={riskData[mitigationField] as string || ''}
              onChange={(e) => handleTextareaChange(`mitigationPlan${suffixProp}`, e)}
              ref={(el) => {
                if (el) {
                  textareaRefs.current[`mitigationPlan${suffixProp}`] = el;
                  // Adjust height on mount
                  setTimeout(() => adjustTextareaHeight(`mitigationPlan${suffixProp}`), 0);
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
                      onClick={() => generateMitigationPlan(rowIndex)}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Generate AI-powered mitigation plan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="border border-green-100 rounded-md p-2 bg-white w-[98%] col-span-2">
          <div className="relative">
            <Textarea
              className="w-full p-2 border-0 focus:ring-0 text-sm risk-owner-textarea"
              rows={1}
              placeholder="Who is responsible?"
              value={riskData[ownerField] as string || ''}
              onChange={(e) => handleTextareaChange(`riskOwner${suffixProp}`, e)}
              ref={(el) => {
                if (el) textareaRefs.current[`riskOwner${suffixProp}`] = el;
              }}
            />
            {/* Show delete button for rows beyond the first */}
            {rowIndex > 1 && (
              <div className="absolute top-1 right-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right+[25px] h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full p-1"
                        onClick={() => deleteRiskRow(rowIndex)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Delete this risk</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="mt-6" id="risk-assessment-section">
      <CardHeader>
        <div className="flex items-center">
          <CardTitle>Risk Assessment Matrix</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          The Risk Assessment Matrix helps identify and evaluate project risks, their probability, impact, and appropriate mitigation strategies.
        </p>
        
        {/* Loading state */}
        {isLoading ? (
          <div className="py-4">Loading risk assessment data...</div>
        ) : (
          <>
            {/* Risk assessment headers */}
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-3 p-2 bg-red-50 rounded-md text-center">
                <h4 className="font-medium text-red-600 text-sm">Risk Name</h4>
              </div>
              <div className="col-span-1.5 p-2 bg-amber-50 rounded-md text-center">
                <h4 className="font-medium text-amber-600 text-sm">Probability</h4>
              </div>
              <div className="col-span-1.5 p-2 bg-orange-50 rounded-md text-center">
                <h4 className="font-medium text-orange-600 text-sm">Impact</h4>
              </div>
              <div className="col-span-1 p-2 bg-purple-50 rounded-md text-center">
                <h4 className="font-medium text-purple-600 text-sm">Criticality</h4>
              </div>
              <div className="col-span-4 p-2 bg-blue-50 rounded-md text-center">
                <h4 className="font-medium text-blue-600 text-sm">Mitigation Plan</h4>
              </div>
              <div className="col-span-2 p-2 bg-green-50 rounded-md text-center">
                <h4 className="font-medium text-green-600 text-sm">Risk Owner</h4>
              </div>
            </div>
            
            {/* Render all visible risk rows */}
            {Array.from({length: visibleRiskRows}, (_, i) => renderRiskRow(i + 1))}
            
            {/* Add row button */}
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex items-center gap-1"
                  onClick={addRiskRow}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Risk
                </Button>
              </div>
              
              <div>
                <Button 
                  type="button"
                  variant="default"
                  className="flex items-center gap-2"
                  onClick={saveRiskData}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Risk Assessment'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}