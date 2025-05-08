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

// Individual risk entry interface
interface RiskEntry {
  name: string;
  probability: string;
  impact: string;
  criticality: number;
  mitigationPlan: string;
  owner: string;
}

// Risk item interface for storage
interface RiskItem {
  id?: number;
  projectId: number;
  lastUpdated?: Date;
  
  // We'll store risk entries in these numbered fields for backward compatibility,
  // but will convert to/from the array format when working with the data in the component
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
  
  // Support for additional risks beyond the original 6
  extraRisks?: string; // We'll store additional risks as JSON string
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
  const [riskEntries, setRiskEntries] = useState<RiskEntry[]>([{
    name: '',
    probability: 'Low',
    impact: 'Low',
    criticality: 1,
    mitigationPlan: '',
    owner: ''
  }]);
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
      const response = await fetch(`/api/projects/${projectId}/risks`);
      if (!response.ok) {
        throw new Error('Failed to fetch risk data');
      }
      
      const data = await response.json();
      console.log('Loaded risk data:', data);
      
      if (data && data.risk) {
        setRiskData(data.risk);
        
        // Determine how many rows should be visible
        let maxRow = 1; // Default to 1 row (mandatory)
        if (data.risk.riskName6) maxRow = 6;
        else if (data.risk.riskName5) maxRow = 5;
        else if (data.risk.riskName4) maxRow = 4;
        else if (data.risk.riskName3) maxRow = 3;
        else if (data.risk.riskName2) maxRow = 2;
        
        setVisibleRiskRows(maxRow);
        
        // Store in sessionStorage
        sessionStorage.setItem(`project_${projectId}_has_risk_assessment`, 'true');
        
        if (showToast) {
          toast({
            title: "Risk assessment data loaded",
            description: "The risk assessment data has been refreshed."
          });
        }
      } else {
        // No saved data, set default
        setRiskData(createDefaultRiskItem(projectId));
        setVisibleRiskRows(1);
      }
    } catch (error) {
      console.error('Error loading risk data:', error);
      toast({
        title: "Error",
        description: "Failed to load risk assessment data. Please try again.",
        variant: "destructive"
      });
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
      
      toast({
        title: "Risk assessment saved",
        description: "All changes have been saved successfully."
      });
      
      // Update the local risk data with the saved data
      // but don't trigger a full reload which causes jerking
      setRiskData(savedData.risk);
      
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
    // Add a new risk entry to the array
    setRiskEntries(prevEntries => [
      ...prevEntries,
      {
        name: '',
        probability: 'Low',
        impact: 'Low',
        criticality: 1,
        mitigationPlan: '',
        owner: ''
      }
    ]);
    
    // Also update the visibleRiskRows state for backward compatibility
    // with the existing UI implementation
    if (visibleRiskRows < 6) {
      setVisibleRiskRows(prev => prev + 1);
    }
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
    
    // Clear all fields for this row
    updatedRiskData[`riskName${suffixProp}` as keyof RiskItem] = '';
    updatedRiskData[`probability${suffixProp}` as keyof RiskItem] = 'Low';
    updatedRiskData[`impact${suffixProp}` as keyof RiskItem] = 'Low';
    updatedRiskData[`riskCriticality${suffixProp}` as keyof RiskItem] = 1;
    updatedRiskData[`mitigationPlan${suffixProp}` as keyof RiskItem] = '';
    updatedRiskData[`riskOwner${suffixProp}` as keyof RiskItem] = '';
    
    setRiskData(updatedRiskData);
    
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
  
  // Handle manual refresh
  const handleRefresh = () => {
    loadRiskData(true);
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CardTitle>Risk Assessment Matrix</CardTitle>
          </div>
          <div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
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
            
            {/* Second row (conditionally rendered) */}
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
            
            {/* Third row (conditionally rendered) */}
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
            
            {/* Fourth row (conditionally rendered) */}
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
            
            {/* Fifth row (conditionally rendered) */}
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
            
            {/* Sixth row (conditionally rendered) */}
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
            
            {/* Add row button */}
            <div className="flex flex-col gap-2">
              {visibleRiskRows < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRiskRow}
                  className="mt-2 self-start"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              )}
              
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