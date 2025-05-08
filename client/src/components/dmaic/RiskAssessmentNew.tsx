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

// Create a default risk item
const createDefaultRiskItem = (projectId: number): RiskItem => ({
  projectId,
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
});

// Main component
export default function RiskAssessmentNew() {
  const { id: projectIdParam } = useParams();
  const { toast } = useToast();
  const { user, currentProject } = useAppContext();
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = projectIdParam ? parseInt(projectIdParam) : (currentProject?.id || 1);
  
  // State for risk data and visible rows
  const [riskData, setRiskData] = useState<RiskItem>(createDefaultRiskItem(projectId));
  const [visibleRiskRows, setVisibleRiskRows] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Risk criticality calculation matrix (probability x impact)
  const riskCriticalityMatrix = {
    "Low": { "Low": 1, "Medium": 2, "High": 3 },
    "Medium": { "Low": 2, "Medium": 4, "High": 6 },
    "High": { "Low": 3, "Medium": 6, "High": 9 }
  };
  
  // Function to calculate risk criticality based on probability and impact
  const calculateRiskCriticality = (probability: string, impact: string): number => {
    return riskCriticalityMatrix[probability as keyof typeof riskCriticalityMatrix]?.[impact as 'Low' | 'Medium' | 'High'] || 1;
  };
  
  // Load risk data from API
  const loadRiskData = async (showToast = false) => {
    setIsLoading(true);
    
    try {
      console.log("Fetching risk data for project:", projectId);
      const response = await fetch(`/api/projects/${projectId}/risks`);
      
      if (!response.ok) {
        throw new Error(`API response error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw risk data from API:', data);
      
      if (data && data.risk) {
        // If we have risk data, update our state
        console.log('Risk data successfully loaded from database:', data.risk);
        
        // First, fill any null values with appropriate defaults
        const cleanedData = {...data.risk};
        
        // Ensure all fields have at least default values
        for (let i = 1; i <= 6; i++) {
          const suffix = i === 1 ? '' : i.toString();
          cleanedData[`riskName${suffix}` as keyof RiskItem] = 
            cleanedData[`riskName${suffix}` as keyof RiskItem] || '';
          cleanedData[`probability${suffix}` as keyof RiskItem] = 
            cleanedData[`probability${suffix}` as keyof RiskItem] || 'Low';
          cleanedData[`impact${suffix}` as keyof RiskItem] = 
            cleanedData[`impact${suffix}` as keyof RiskItem] || 'Low';
          cleanedData[`riskCriticality${suffix}` as keyof RiskItem] = 
            cleanedData[`riskCriticality${suffix}` as keyof RiskItem] || 1;
          cleanedData[`mitigationPlan${suffix}` as keyof RiskItem] = 
            cleanedData[`mitigationPlan${suffix}` as keyof RiskItem] || '';
          cleanedData[`riskOwner${suffix}` as keyof RiskItem] = 
            cleanedData[`riskOwner${suffix}` as keyof RiskItem] || '';
        }
        
        // Set the cleaned data to state
        setRiskData(cleanedData);
        
        // Determine how many rows should be visible by checking actual content
        let maxRow = 1; // Default to 1 row (mandatory)
        
        // Check rows 2-6 for any content
        for (let i = 2; i <= 6; i++) {
          const riskNameProp = `riskName${i}` as keyof RiskItem;
          const mitigationPlanProp = `mitigationPlan${i}` as keyof RiskItem;
          const riskOwnerProp = `riskOwner${i}` as keyof RiskItem;
          
          // If any field in this row has content, display the row
          if (
            cleanedData[riskNameProp] || 
            cleanedData[mitigationPlanProp] || 
            cleanedData[riskOwnerProp]
          ) {
            maxRow = Math.max(maxRow, i);
          }
        }
        
        console.log(`Setting visible rows to: ${maxRow} based on data content`);
        setVisibleRiskRows(maxRow);
        
        // Store in sessionStorage to remember we have data
        sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        
        if (showToast) {
          toast({
            title: "Risk assessment data loaded",
            description: "The risk assessment data has been refreshed.",
            duration: 3000
          });
        }
      } else {
        // No saved data, set default
        console.log("No risk data found in API response or empty data, using default");
        setRiskData(createDefaultRiskItem(projectId));
        setVisibleRiskRows(1);
        
        // Remove the session storage flag since no data was found
        sessionStorage.removeItem(`project_${projectId}_has_risk_assessment`);
      }
    } catch (error) {
      console.error('Error loading risk data:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to load risk assessment data. Creating a new form.",
        variant: "destructive",
        duration: 5000
      });
      
      // Set default risk data
      setRiskData(createDefaultRiskItem(projectId));
      setVisibleRiskRows(1);
      
      // Remove the session storage flag due to error
      sessionStorage.removeItem(`project_${projectId}_has_risk_assessment`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save risk data to API
  const saveRiskData = async () => {
    setIsSaving(true);
    
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
    
    // Also handle dynamic rows beyond 6 (these won't be saved to database but will persist in memory)
    for (let i = 7; i <= visibleRiskRows; i++) {
      const riskNameField = `extraRisk_${i}_name`;
      const mitigationPlanField = `extraRisk_${i}_mitigationPlan`;
      const riskOwnerField = `extraRisk_${i}_riskOwner`;
      
      if (textareaRefs.current[riskNameField]) {
        updatedRiskData[riskNameField as keyof RiskItem] = textareaRefs.current[riskNameField].value;
      }
      
      if (textareaRefs.current[mitigationPlanField]) {
        updatedRiskData[mitigationPlanField as keyof RiskItem] = textareaRefs.current[mitigationPlanField].value;
      }
      
      if (textareaRefs.current[riskOwnerField]) {
        updatedRiskData[riskOwnerField as keyof RiskItem] = textareaRefs.current[riskOwnerField].value;
      }
    }
    
    try {
      const url = riskData.id 
        ? `/api/risks/${riskData.id}` 
        : `/api/projects/${projectId}/risks`;
      
      const method = riskData.id ? 'PUT' : 'POST';
      
      console.log(`Saving risk data via ${method} to ${url}:`, {
        ...updatedRiskData,
        mitigationPlan: updatedRiskData.mitigationPlan?.substring(0, 30) + '...',
        mitigationPlan2: updatedRiskData.mitigationPlan2?.substring(0, 30) + '...'
      });
      
      // Ensure all fields are explicitly included in payload
      const payload = {
        ...updatedRiskData,
        userId: user?.id || 1,
        projectId: Number(projectId),
        // Explicitly include all fields to ensure they're saved properly
        riskName: updatedRiskData.riskName || '',
        riskName2: updatedRiskData.riskName2 || '',
        riskName3: updatedRiskData.riskName3 || '',
        riskName4: updatedRiskData.riskName4 || '',
        riskName5: updatedRiskData.riskName5 || '',
        riskName6: updatedRiskData.riskName6 || '',
        probability: updatedRiskData.probability || 'Low',
        probability2: updatedRiskData.probability2 || 'Low',
        probability3: updatedRiskData.probability3 || 'Low',
        probability4: updatedRiskData.probability4 || 'Low',
        probability5: updatedRiskData.probability5 || 'Low',
        probability6: updatedRiskData.probability6 || 'Low', 
        impact: updatedRiskData.impact || 'Low',
        impact2: updatedRiskData.impact2 || 'Low',
        impact3: updatedRiskData.impact3 || 'Low',
        impact4: updatedRiskData.impact4 || 'Low',
        impact5: updatedRiskData.impact5 || 'Low',
        impact6: updatedRiskData.impact6 || 'Low',
        riskCriticality: updatedRiskData.riskCriticality || 1,
        riskCriticality2: updatedRiskData.riskCriticality2 || 1,
        riskCriticality3: updatedRiskData.riskCriticality3 || 1,
        riskCriticality4: updatedRiskData.riskCriticality4 || 1,
        riskCriticality5: updatedRiskData.riskCriticality5 || 1,
        riskCriticality6: updatedRiskData.riskCriticality6 || 1,
        mitigationPlan: updatedRiskData.mitigationPlan || '',
        mitigationPlan2: updatedRiskData.mitigationPlan2 || '',
        mitigationPlan3: updatedRiskData.mitigationPlan3 || '',
        mitigationPlan4: updatedRiskData.mitigationPlan4 || '',
        mitigationPlan5: updatedRiskData.mitigationPlan5 || '',
        mitigationPlan6: updatedRiskData.mitigationPlan6 || '',
        riskOwner: updatedRiskData.riskOwner || '',
        riskOwner2: updatedRiskData.riskOwner2 || '',
        riskOwner3: updatedRiskData.riskOwner3 || '',
        riskOwner4: updatedRiskData.riskOwner4 || '', 
        riskOwner5: updatedRiskData.riskOwner5 || '',
        riskOwner6: updatedRiskData.riskOwner6 || '',
      };
      
      // Additional information to warn users about rows beyond 6
      if (visibleRiskRows > 6) {
        const notSavedCount = visibleRiskRows - 6;
        console.log(`Warning: ${notSavedCount} risk rows beyond the 6th row will not be saved to the database.`);
        
        // Add extra warning for rows beyond 6
        toast({
          title: "Risk Assessment Saved Partially",
          description: `Note: The first 6 risk items have been saved to the database. ${notSavedCount} additional items will be displayed but not persisted between sessions.`,
          duration: 5000
        });
      }
      
      console.log('Sending probability:', payload.probability);
      console.log('Sending impact:', payload.impact);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save risk data');
      }
      
      const savedData = await response.json();
      
      // Store flag in sessionStorage
      sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
      
      // Only show success toast if we didn't already show a partial save warning
      if (visibleRiskRows <= 6) {
        toast({
          title: "Risk assessment saved",
          description: "All changes have been saved successfully."
        });
      }
      
      // Keep dynamic rows in the updated data
      const mergedData = {
        ...savedData.risk,
      };
      
      // Add any dynamic row data to the merged data
      for (const key in updatedRiskData) {
        if (key.startsWith('extraRisk_')) {
          mergedData[key] = updatedRiskData[key];
        }
      }
      
      // Update the local risk data with the saved data plus dynamic rows
      // but don't trigger a full reload which causes jerking
      setRiskData(mergedData);
      
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
  
  // Handle adding a new row
  const addRiskRow = () => {
    // Our current schema supports up to 6 rows, but we'll allow any number of rows to be added
    // Beyond 6 rows, we'll warn that they won't be persistently stored
    if (visibleRiskRows >= 6) {
      toast({
        title: "Storage Warning",
        description: "Note: The database schema supports up to 6 risk items for persistent storage. Items beyond 6 will be displayed but won't be saved.",
        variant: "default",
        duration: 5000
      });
    }
    
    // Allow adding rows without any limit
    setVisibleRiskRows(prev => prev + 1);
  };
  
  // Handle removing a row
  const deleteRiskRow = (rowIndex: number) => {
    if (rowIndex <= 1) {
      // Can't delete the first row
      return;
    }
    
    // Clear fields for the row being deleted
    const updatedRiskData = {...riskData};
    const suffixProp = rowIndex === 1 ? '' : rowIndex.toString();
    
    // Clear all fields for this row (set to empty strings or default values)
    updatedRiskData[`riskName${suffixProp}` as keyof RiskItem] = '';
    updatedRiskData[`probability${suffixProp}` as keyof RiskItem] = 'Low';
    updatedRiskData[`impact${suffixProp}` as keyof RiskItem] = 'Low';
    updatedRiskData[`riskCriticality${suffixProp}` as keyof RiskItem] = 1;
    updatedRiskData[`mitigationPlan${suffixProp}` as keyof RiskItem] = '';
    updatedRiskData[`riskOwner${suffixProp}` as keyof RiskItem] = '';
    
    // Save the updated data with emptied values to the database
    setRiskData(updatedRiskData);
    
    // Save immediately to persist the deletion in the database
    const saveUpdatedData = async () => {
      try {
        const url = riskData.id 
          ? `/api/risks/${riskData.id}` 
          : `/api/projects/${projectId}/risks`;
        
        const method = riskData.id ? 'PUT' : 'POST';
        
        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...updatedRiskData,
            userId: user?.id || 1,
            projectId: Number(projectId),
          })
        });
        
        // Store flag in sessionStorage
        sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        
        toast({
          title: "Row deleted",
          description: "Risk row has been deleted and changes saved.",
          duration: 3000
        });
      } catch (error) {
        console.error('Error saving risk data after deletion:', error);
        toast({
          title: "Error",
          description: "Failed to delete risk row. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    // Execute the save
    saveUpdatedData();
    
    // Decrease visible rows
    if (visibleRiskRows > 1) {
      setVisibleRiskRows(prev => prev - 1);
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
  
  // Generate mitigation plan with AI
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
        description: "Please enter a risk name before generating a mitigation plan.",
        variant: "default"
      });
      return;
    }
    
    // Add loading toast
    toast({
      title: "Generating mitigation plan",
      description: "Please wait while we create a suggested mitigation plan...",
      variant: "default"
    });
    
    // For now, let's use a sample mitigation plan template
    // In a real app, this would call an AI service
    
    setTimeout(() => {
      const mitigationPlanField = `mitigationPlan${suffixProp}` as keyof RiskItem;
      const fieldNameAsString = `mitigationPlan${suffixProp}`;
      
      const template = `Recommended Mitigation Strategies:

• Implement multiple preventative controls with overlapping coverage
• Develop prevention strategies to reduce likelihood of occurrence
• Create detailed contingency and recovery plans to minimize impact
• Consider risk transfer options (insurance, partnerships, contracts)
• Assign dedicated risk owner with executive oversight
• Schedule frequent monitoring on weekly/bi-weekly basis
• Implement early warning indicators and thresholds
• Create detailed response and escalation procedures


Technology Risk Specific:
• Conduct comprehensive technical assessments and penetration testing
• Implement redundant systems or fallback options
• Develop detailed disaster recovery procedures
• Establish 24/7 technical support protocols
• Ensure knowledge transfer and documentation
• Consider prototype or pilot implementations before full deployment
• Provide specialized training for technical staff

Monitoring and Review:
• Review risk status weekly
• Report to executive leadership monthly
• Reassess mitigation effectiveness quarterly`;
      
      // Update the risk data with the generated plan
      const updatedRiskData = {...riskData};
      updatedRiskData[mitigationPlanField] = template;
      setRiskData(updatedRiskData);
      
      // Update the textarea directly as well for immediate display
      if (textareaRefs.current[fieldNameAsString as string]) {
        textareaRefs.current[fieldNameAsString as string].value = template;
        adjustTextareaHeight(fieldNameAsString as string, true);
      }
      
      toast({
        title: "Mitigation plan generated",
        description: "A suggested mitigation plan has been created. Feel free to edit it as needed.",
        variant: "default"
      });
    }, 1000);
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
    console.log("RiskAssessment component mounted - checking for saved data");
    
    // Check if we have previously saved data in sessionStorage
    const hasRiskData = sessionStorage.getItem(`project_${projectId}_has_risk_assessment`);
    
    if (hasRiskData === 'true') {
      console.log("Risk assessment flag found in sessionStorage, loading from database");
      loadRiskData(false);
    } else {
      // No saved data, set default
      console.log("No saved risk assessment found, using default");
      setRiskData(createDefaultRiskItem(projectId));
      setVisibleRiskRows(1);
    }
  }, [projectId]);
  
  // Removed manual refresh function as it's no longer needed
  
  return (
    <Card className="mt-6">
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
            
            {/* First row (always visible) */}
            <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                  rows={1}
                  placeholder="Describe the risk"
                  value={riskData.riskName || ''}
                  onChange={(e) => handleTextareaChange('riskName', e)}
                  ref={(el) => {
                    if (el) textareaRefs.current['riskName'] = el;
                  }}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                <Select
                  value={riskData.probability || 'Low'}
                  onValueChange={(value) => updateRiskCriticality(1, 'probability', value)}
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
                  value={riskData.impact || 'Low'}
                  onValueChange={(value) => updateRiskCriticality(1, 'impact', value)}
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
                  {riskData.riskCriticality || 1}/9
                </div>
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                <div className="relative">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                    rows={5}
                    placeholder="How will you mitigate this risk?"
                    value={riskData.mitigationPlan || ''}
                    onChange={(e) => handleTextareaChange('mitigationPlan', e)}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current['mitigationPlan'] = el;
                        // Adjust height on mount
                        setTimeout(() => adjustTextareaHeight('mitigationPlan'), 0);
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
                  value={riskData.riskOwner || ''}
                  onChange={(e) => handleTextareaChange('riskOwner', e)}
                  ref={(el) => {
                    if (el) textareaRefs.current['riskOwner'] = el;
                  }}
                />
              </div>
            </div>
            
            {/* Risk rows 2-6 (conditionally rendered) */}
            {/* Row 2 */}
            {visibleRiskRows >= 2 && (
              <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                    rows={1}
                    placeholder="Describe the risk"
                    value={riskData.riskName2 || ''}
                    onChange={(e) => handleTextareaChange('riskName2', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskName2'] = el;
                    }}
                  />
                </div>
                <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                  <Select
                    value={riskData.probability2 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(2, 'probability', value)}
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
                    value={riskData.impact2 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(2, 'impact', value)}
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
                <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                  <div className="text-lg font-bold">
                    {riskData.riskCriticality2 || 1}/9
                  </div>
                </div>
                <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                  <div className="relative">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                      rows={5}
                      placeholder="How will you mitigate this risk?"
                      value={riskData.mitigationPlan2 || ''}
                      onChange={(e) => handleTextareaChange('mitigationPlan2', e)}
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current['mitigationPlan2'] = el;
                          // Adjust height on mount
                          setTimeout(() => adjustTextareaHeight('mitigationPlan2'), 0);
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
                    value={riskData.riskOwner2 || ''}
                    onChange={(e) => handleTextareaChange('riskOwner2', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskOwner2'] = el;
                    }}
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
            
            {/* Row 3 */}
            {visibleRiskRows >= 3 && (
              <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                    rows={1}
                    placeholder="Describe the risk"
                    value={riskData.riskName3 || ''}
                    onChange={(e) => handleTextareaChange('riskName3', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskName3'] = el;
                    }}
                  />
                </div>
                <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                  <Select
                    value={riskData.probability3 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(3, 'probability', value)}
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
                    value={riskData.impact3 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(3, 'impact', value)}
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
                <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                  <div className="text-lg font-bold">
                    {riskData.riskCriticality3 || 1}/9
                  </div>
                </div>
                <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                  <div className="relative">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                      rows={5}
                      placeholder="How will you mitigate this risk?"
                      value={riskData.mitigationPlan3 || ''}
                      onChange={(e) => handleTextareaChange('mitigationPlan3', e)}
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current['mitigationPlan3'] = el;
                          // Adjust height on mount
                          setTimeout(() => adjustTextareaHeight('mitigationPlan3'), 0);
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
                    value={riskData.riskOwner3 || ''}
                    onChange={(e) => handleTextareaChange('riskOwner3', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskOwner3'] = el;
                    }}
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
            
            {/* Row 4 */}
            {visibleRiskRows >= 4 && (
              <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                    rows={1}
                    placeholder="Describe the risk"
                    value={riskData.riskName4 || ''}
                    onChange={(e) => handleTextareaChange('riskName4', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskName4'] = el;
                    }}
                  />
                </div>
                <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                  <Select
                    value={riskData.probability4 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(4, 'probability', value)}
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
                    value={riskData.impact4 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(4, 'impact', value)}
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
                <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                  <div className="text-lg font-bold">
                    {riskData.riskCriticality4 || 1}/9
                  </div>
                </div>
                <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                  <div className="relative">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                      rows={5}
                      placeholder="How will you mitigate this risk?"
                      value={riskData.mitigationPlan4 || ''}
                      onChange={(e) => handleTextareaChange('mitigationPlan4', e)}
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current['mitigationPlan4'] = el;
                          // Adjust height on mount
                          setTimeout(() => adjustTextareaHeight('mitigationPlan4'), 0);
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
                    value={riskData.riskOwner4 || ''}
                    onChange={(e) => handleTextareaChange('riskOwner4', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskOwner4'] = el;
                    }}
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
            
            {/* Row 5 */}
            {visibleRiskRows >= 5 && (
              <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                    rows={1}
                    placeholder="Describe the risk"
                    value={riskData.riskName5 || ''}
                    onChange={(e) => handleTextareaChange('riskName5', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskName5'] = el;
                    }}
                  />
                </div>
                <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                  <Select
                    value={riskData.probability5 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(5, 'probability', value)}
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
                    value={riskData.impact5 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(5, 'impact', value)}
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
                <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                  <div className="text-lg font-bold">
                    {riskData.riskCriticality5 || 1}/9
                  </div>
                </div>
                <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                  <div className="relative">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                      rows={5}
                      placeholder="How will you mitigate this risk?"
                      value={riskData.mitigationPlan5 || ''}
                      onChange={(e) => handleTextareaChange('mitigationPlan5', e)}
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current['mitigationPlan5'] = el;
                          // Adjust height on mount
                          setTimeout(() => adjustTextareaHeight('mitigationPlan5'), 0);
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
                    value={riskData.riskOwner5 || ''}
                    onChange={(e) => handleTextareaChange('riskOwner5', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskOwner5'] = el;
                    }}
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
            
            {/* Row 6 */}
            {visibleRiskRows >= 6 && (
              <div className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                    rows={1}
                    placeholder="Describe the risk"
                    value={riskData.riskName6 || ''}
                    onChange={(e) => handleTextareaChange('riskName6', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskName6'] = el;
                    }}
                  />
                </div>
                <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                  <Select
                    value={riskData.probability6 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(6, 'probability', value)}
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
                    value={riskData.impact6 || 'Low'}
                    onValueChange={(value) => updateRiskCriticality(6, 'impact', value)}
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
                <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                  <div className="text-lg font-bold">
                    {riskData.riskCriticality6 || 1}/9
                  </div>
                </div>
                <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                  <div className="relative">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                      rows={5}
                      placeholder="How will you mitigate this risk?"
                      value={riskData.mitigationPlan6 || ''}
                      onChange={(e) => handleTextareaChange('mitigationPlan6', e)}
                      ref={(el) => {
                        if (el) {
                          textareaRefs.current['mitigationPlan6'] = el;
                          // Adjust height on mount
                          setTimeout(() => adjustTextareaHeight('mitigationPlan6'), 0);
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
                    value={riskData.riskOwner6 || ''}
                    onChange={(e) => handleTextareaChange('riskOwner6', e)}
                    ref={(el) => {
                      if (el) textareaRefs.current['riskOwner6'] = el;
                    }}
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
            
            {/* Dynamically render rows beyond 6 */}
            {Array.from({ length: Math.max(0, visibleRiskRows - 6) }).map((_, index) => {
              const rowIndex = index + 7; // Start from row 7
              
              // Create dynamic field names for additional rows
              const riskNameField = `extraRisk_${rowIndex}_name`;
              const probabilityField = `extraRisk_${rowIndex}_probability`;
              const impactField = `extraRisk_${rowIndex}_impact`;
              const criticalityField = `extraRisk_${rowIndex}_criticality`;
              const mitigationPlanField = `extraRisk_${rowIndex}_mitigationPlan`;
              const riskOwnerField = `extraRisk_${rowIndex}_riskOwner`;
              
              // Initialize values in riskData if not already present
              if (!(riskNameField in riskData)) {
                riskData[riskNameField as keyof RiskItem] = '';
              }
              if (!(probabilityField in riskData)) {
                riskData[probabilityField as keyof RiskItem] = 'Low';
              }
              if (!(impactField in riskData)) {
                riskData[impactField as keyof RiskItem] = 'Low';
              }
              if (!(criticalityField in riskData)) {
                riskData[criticalityField as keyof RiskItem] = 1;
              }
              if (!(mitigationPlanField in riskData)) {
                riskData[mitigationPlanField as keyof RiskItem] = '';
              }
              if (!(riskOwnerField in riskData)) {
                riskData[riskOwnerField as keyof RiskItem] = '';
              }
              
              return (
                <div key={`risk-row-${rowIndex}`} className="grid grid-cols-12 gap-1 mb-4 relative risk-row">
                  <div className="border border-red-100 rounded-md p-2 bg-white w-[98%] col-span-3">
                    <Textarea
                      className="w-full p-2 border-0 focus:ring-0 text-sm risk-name-textarea"
                      rows={1}
                      placeholder="Describe the risk"
                      value={riskData[riskNameField as keyof RiskItem] as string || ''}
                      onChange={(e) => handleTextareaChange(riskNameField, e)}
                      ref={(el) => {
                        if (el) textareaRefs.current[riskNameField] = el;
                      }}
                    />
                  </div>
                  <div className="border border-amber-100 rounded-md p-1 bg-white w-[97%] col-span-0.5">
                    <Select
                      value={riskData[probabilityField as keyof RiskItem] as string || 'Low'}
                      onValueChange={(value) => {
                        const updatedRiskData = {...riskData};
                        updatedRiskData[probabilityField as keyof RiskItem] = value;
                        
                        // Calculate criticality
                        const probability = value;
                        const impact = riskData[impactField as keyof RiskItem] as string || 'Low';
                        const criticality = calculateRiskCriticality(probability, impact);
                        updatedRiskData[criticalityField as keyof RiskItem] = criticality;
                        
                        setRiskData(updatedRiskData);
                      }}
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
                      value={riskData[impactField as keyof RiskItem] as string || 'Low'}
                      onValueChange={(value) => {
                        const updatedRiskData = {...riskData};
                        updatedRiskData[impactField as keyof RiskItem] = value;
                        
                        // Calculate criticality
                        const impact = value;
                        const probability = riskData[probabilityField as keyof RiskItem] as string || 'Low';
                        const criticality = calculateRiskCriticality(probability, impact);
                        updatedRiskData[criticalityField as keyof RiskItem] = criticality;
                        
                        setRiskData(updatedRiskData);
                      }}
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
                  <div className="border border-purple-100 rounded-md p-1 bg-white w-[97%] col-span-0.5 flex items-center justify-center">
                    <div className="text-lg font-bold">
                      {riskData[criticalityField as keyof RiskItem] as number || 1}/9
                    </div>
                  </div>
                  <div className="border border-blue-100 rounded-md p-2 bg-white w-[98%] col-span-4">
                    <div className="relative">
                      <Textarea
                        className="w-full p-2 border-0 focus:ring-0 text-sm pr-8 risk-mitigation-textarea"
                        rows={5}
                        placeholder="How will you mitigate this risk?"
                        value={riskData[mitigationPlanField as keyof RiskItem] as string || ''}
                        onChange={(e) => handleTextareaChange(mitigationPlanField, e)}
                        ref={(el) => {
                          if (el) {
                            textareaRefs.current[mitigationPlanField] = el;
                            // Adjust height on mount
                            setTimeout(() => adjustTextareaHeight(mitigationPlanField), 0);
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
                                onClick={() => {
                                  // Generate mitigation plan for dynamic rows
                                  const riskName = riskData[riskNameField as keyof RiskItem] as string;
                                  if (!riskName) {
                                    toast({
                                      title: "Missing information",
                                      description: "Please enter a risk name before generating a mitigation plan.",
                                      variant: "default"
                                    });
                                    return;
                                  }
                                  
                                  toast({
                                    title: "Generating mitigation plan",
                                    description: "Please wait while we create a suggested mitigation plan...",
                                    variant: "default"
                                  });
                                  
                                  setTimeout(() => {
                                    const template = `Recommended Mitigation Strategies:

• Implement multiple preventative controls with overlapping coverage
• Develop prevention strategies to reduce likelihood of occurrence
• Create detailed contingency and recovery plans to minimize impact
• Consider risk transfer options (insurance, partnerships, contracts)
• Assign dedicated risk owner with executive oversight
• Schedule frequent monitoring on weekly/bi-weekly basis
• Implement early warning indicators and thresholds
• Create detailed response and escalation procedures


Technology Risk Specific:
• Conduct comprehensive technical assessments and penetration testing
• Implement redundant systems or fallback options
• Develop detailed disaster recovery procedures
• Establish 24/7 technical support protocols
• Ensure knowledge transfer and documentation
• Consider prototype or pilot implementations before full deployment
• Provide specialized training for technical staff

Monitoring and Review:
• Review risk status weekly
• Report to executive leadership monthly
• Reassess mitigation effectiveness quarterly`;
                                    
                                    // Update the risk data with the generated plan
                                    const updatedRiskData = {...riskData};
                                    updatedRiskData[mitigationPlanField as keyof RiskItem] = template;
                                    setRiskData(updatedRiskData);
                                    
                                    // Update the textarea directly as well for immediate display
                                    if (textareaRefs.current[mitigationPlanField]) {
                                      textareaRefs.current[mitigationPlanField].value = template;
                                      adjustTextareaHeight(mitigationPlanField, true);
                                    }
                                    
                                    toast({
                                      title: "Mitigation plan generated",
                                      description: "A suggested mitigation plan has been created. Feel free to edit it as needed.",
                                      variant: "default"
                                    });
                                  }, 1000);
                                }}
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
                      value={riskData[riskOwnerField as keyof RiskItem] as string || ''}
                      onChange={(e) => handleTextareaChange(riskOwnerField, e)}
                      ref={(el) => {
                        if (el) textareaRefs.current[riskOwnerField] = el;
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      // Clear fields for this dynamic row
                      const updatedRiskData = {...riskData};
                      updatedRiskData[riskNameField as keyof RiskItem] = '';
                      updatedRiskData[probabilityField as keyof RiskItem] = 'Low';
                      updatedRiskData[impactField as keyof RiskItem] = 'Low';
                      updatedRiskData[criticalityField as keyof RiskItem] = 1;
                      updatedRiskData[mitigationPlanField as keyof RiskItem] = '';
                      updatedRiskData[riskOwnerField as keyof RiskItem] = '';
                      
                      setRiskData(updatedRiskData);
                      
                      // Decrease visible rows
                      setVisibleRiskRows(prev => prev - 1);
                    }}
                    title={`Delete Row ${rowIndex}`}
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              );
            })}
            
            {/* Add row button */}
            <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRiskRow}
                  className="mt-2 self-start"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              
              {/* Save button */}
              <Button
                type="button"
                variant="default"
                onClick={saveRiskData}
                className="self-start mt-2"
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Risk Assessment'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}