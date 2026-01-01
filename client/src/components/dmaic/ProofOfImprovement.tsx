import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { BarChart3, Save, X, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, SimpleProofOfImprovement } from "@shared/schema";

// Import wrapper components for proof of improvement
import BeforeAfterContTwoSampleTest from "./proof-improvement/BeforeAfterContTwoSampleTest";
import BeforeAfterTwoProportionTest from "./proof-improvement/BeforeAfterTwoProportionTest";
import BeforeAfterChiSquareTest from "./proof-improvement/BeforeAfterChiSquareTest";

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
  ctqId: number;
}

interface ProofOfImprovementProps {
  projectId: number;
}

export default function ProofOfImprovement({ projectId }: ProofOfImprovementProps) {
  const [activeTab, setActiveTab] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for test preferences (which tests to show for each CTQ) - initialized with defaults
  const [testPreferences, setTestPreferences] = useState<{ [ctqId: number]: { enableTwoProportionTest: boolean; enableChiSquareTest: boolean } }>({});
  
  // State for simple proof of improvement (White/Yellow Belt)
  const [simpleProofValues, setSimpleProofValues] = useState<{ [ctqId: number]: string }>({});
  
  // Track which CTQs have been loaded from database to prevent re-fetching
  const loadedCtqsRef = useRef<Set<number>>(new Set());

  // Load project to get project type
  const { data: projectData } = useQuery<{ project: Project }>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });
  
  const projectType = projectData?.project?.projectType;
  const isSimplifiedView = projectType === "White Belt" || projectType === "Yellow Belt";

  // Load CTQs with types from CTS characteristics
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load simple proof of improvement data for White/Yellow Belt projects
  const { data: simpleProofData } = useQuery<{ proofData: SimpleProofOfImprovement[] }>({
    queryKey: [`/api/projects/${projectId}/simple-proof-of-improvement`],
    enabled: !!projectId && isSimplifiedView,
  });

  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous",
        ctqId: item.id
      }));
    }
    return [];
  };

  const ctqList = getCtqsWithTypes();

  // Ensure we have an active tab when CTQs are available, restoring from localStorage if possible
  useEffect(() => {
    if (!activeTab && ctqList.length > 0) {
      // Try to restore the last selected tab from localStorage
      const savedTab = localStorage.getItem(`proof-improvement-active-tab-${projectId}`);
      
      // Check if the saved tab still exists in the current CTQ list
      const savedTabExists = savedTab && ctqList.some(ctq => ctq.ctq === savedTab);
      
      if (savedTabExists) {
        setActiveTab(savedTab);
      } else {
        // Fall back to the first CTQ if saved tab doesn't exist
        const firstCtq = ctqList[0].ctq;
        setActiveTab(firstCtq);
      }
    }
  }, [activeTab, ctqList, projectId]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`proof-improvement-active-tab-${projectId}`, tabValue);
  };

  // Initialize default preferences for all Attribute CTQs
  useEffect(() => {
    if (ctqList.length > 0 && !isSimplifiedView) {
      const newPreferences: { [ctqId: number]: { enableTwoProportionTest: boolean; enableChiSquareTest: boolean } } = {};
      
      ctqList.forEach(ctq => {
        if (ctq.ctqType === "Attribute" && !testPreferences[ctq.ctqId]) {
          newPreferences[ctq.ctqId] = {
            enableTwoProportionTest: true,
            enableChiSquareTest: true,
          };
        }
      });
      
      if (Object.keys(newPreferences).length > 0) {
        setTestPreferences(prev => ({ ...prev, ...newPreferences }));
      }
    }
  }, [ctqList, isSimplifiedView]);

  // Initialize simple proof values from database
  useEffect(() => {
    if (simpleProofData?.proofData && isSimplifiedView) {
      const values: { [ctqId: number]: string } = {};
      simpleProofData.proofData.forEach((item) => {
        values[item.ctqId] = item.newPerformanceValue || "";
      });
      setSimpleProofValues(values);
    }
  }, [simpleProofData, isSimplifiedView]);

  // Load preferences from database for each Attribute CTQ (only once per CTQ)
  // Skip for White/Yellow Belt projects (simplified view)
  useEffect(() => {
    if (ctqList.length > 0 && !isSimplifiedView) {
      ctqList.forEach(async (ctq) => {
        // Only load if it's an Attribute CTQ AND we haven't loaded it yet
        if (ctq.ctqType === "Attribute" && !loadedCtqsRef.current.has(ctq.ctqId)) {
          // Mark as loaded immediately to prevent duplicate fetches
          loadedCtqsRef.current.add(ctq.ctqId);
          
          try {
            const response = await fetch(`/api/projects/${projectId}/ctq/${ctq.ctqId}/proof-improvement-preferences`, {
              credentials: 'include',
            });
            
            if (response.ok) {
              const data = await response.json();
              // Use setTimeout to avoid React timing issues (same pattern as AttrCTQHypTesting)
              setTimeout(() => {
                setTestPreferences(prev => ({
                  ...prev,
                  [ctq.ctqId]: {
                    enableTwoProportionTest: data.enableTwoProportionTest ?? true,
                    enableChiSquareTest: data.enableChiSquareTest ?? true,
                  }
                }));
              }, 0);
            }
          } catch (error) {
            console.error('Error loading preferences:', error);
          }
        }
      });
    }
  }, [ctqList, projectId, isSimplifiedView]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async ({ ctqId, preferences }: { ctqId: number; preferences: { enableTwoProportionTest: boolean; enableChiSquareTest: boolean } }) => {
      const response = await apiRequest(
        'POST',
        `/api/projects/${projectId}/ctq/${ctqId}/proof-improvement-preferences`,
        preferences
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Selections Saved",
        description: "Your test preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save test preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle checkbox changes (no auto-save)
  const handleTestPreferenceChange = (ctqId: number, testType: 'enableTwoProportionTest' | 'enableChiSquareTest', checked: boolean) => {
    setTestPreferences(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [testType]: checked,
      }
    }));
  };

  // Clear all checkboxes for a CTQ
  const handleClearAll = (ctqId: number) => {
    setTestPreferences(prev => ({
      ...prev,
      [ctqId]: {
        enableTwoProportionTest: false,
        enableChiSquareTest: false,
      }
    }));
  };

  // Save test selections for a CTQ
  const handleSaveSelections = (ctqId: number) => {
    const preferences = testPreferences[ctqId] || {
      enableTwoProportionTest: true,
      enableChiSquareTest: true,
    };
    savePreferencesMutation.mutate({ ctqId, preferences });
  };

  // Save simple proof of improvement mutation (for White/Yellow Belt)
  const saveSimpleProofMutation = useMutation({
    mutationFn: async ({ ctqId, newPerformanceValue }: { ctqId: number; newPerformanceValue: string }) => {
      const response = await apiRequest(
        'POST',
        `/api/projects/${projectId}/ctq/${ctqId}/simple-proof-of-improvement`,
        { newPerformanceValue }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/simple-proof-of-improvement`] });
      toast({
        title: "Saved",
        description: "Performance value saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save performance value. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle simple proof value change
  const handleSimpleProofChange = (ctqId: number, value: string) => {
    setSimpleProofValues(prev => ({
      ...prev,
      [ctqId]: value,
    }));
  };

  // Save simple proof value
  const handleSaveSimpleProof = (ctqId: number) => {
    const value = simpleProofValues[ctqId] || "";
    saveSimpleProofMutation.mutate({ ctqId, newPerformanceValue: value });
  };

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Proof of Improvement - Before/After Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table in Measure to perform Proof of Improvement Before/After Analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Simplified UI for White/Yellow Belt projects
  if (isSimplifiedView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Proof of Improvement - New Performance Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-800">
              Enter the new performance value achieved after implementing improvements for each CTQ (Critical to Quality).
            </p>
          </div>
          
          <div className="space-y-4">
            {ctqList.map((ctq) => (
              <div key={ctq.ctqId} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold text-base">{ctq.ctq}</Label>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ctq.ctqType === "Continuous" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {ctq.ctqType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor={`simple-proof-${ctq.ctqId}`} className="text-sm text-gray-600 mb-1 block">
                        New Performance Value
                      </Label>
                      <Input
                        id={`simple-proof-${ctq.ctqId}`}
                        value={simpleProofValues[ctq.ctqId] || ""}
                        onChange={(e) => handleSimpleProofChange(ctq.ctqId, e.target.value)}
                        placeholder="Enter the new performance value..."
                        className="w-full"
                        data-testid={`input-simple-proof-${ctq.ctqId}`}
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSimpleProof(ctq.ctqId)}
                      disabled={saveSimpleProofMutation.isPending}
                      size="sm"
                      className="mt-6"
                      data-testid={`button-save-simple-proof-${ctq.ctqId}`}
                    >
                      {saveSimpleProofMutation.isPending ? (
                        <Save className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                  {simpleProofData?.proofData?.find(p => p.ctqId === ctq.ctqId)?.newPerformanceValue && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved value: {simpleProofData.proofData.find(p => p.ctqId === ctq.ctqId)?.newPerformanceValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full UI for Green Belt and Black Belt projects
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Proof of Improvement - Before/After Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            {ctqList.map((ctq) => (
              <TabsTrigger key={ctq.ctq} value={ctq.ctq}>
                {ctq.ctq}
              </TabsTrigger>
            ))}
          </TabsList>

          {ctqList.map((ctq) => (
            <TabsContent key={ctq.ctq} value={ctq.ctq}>
              <div className="space-y-4">
                {/* CTQ Type Badge */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">CTQ Type:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ctq.ctqType === "Continuous" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {ctq.ctqType}
                    </span>
                  </div>
                </div>

                {/* Render appropriate test components based on CTQ type */}
                {ctq.ctqType === "Continuous" ? (
                  <div className="mt-4">
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Continuous CTQ Test:</strong> Compare the Mean, Variance, or Median between "Before" (Dataset 1) and "After" (Dataset 2) to prove statistical improvement.
                      </p>
                    </div>
                    <BeforeAfterContTwoSampleTest
                      projectId={projectId}
                      ctqId={ctq.ctqId}
                      ctqName={ctq.ctq}
                    />
                  </div>
                ) : (
                  <div className="space-y-6 mt-4">
                    {/* Test Selection Checkboxes for Attribute CTQs */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <Label className="text-base font-semibold mb-3 block">
                        Select Tests to Display (select multiple)
                      </Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`two-proportion-${ctq.ctqId}`}
                            checked={testPreferences[ctq.ctqId]?.enableTwoProportionTest ?? true}
                            onCheckedChange={(checked) => 
                              handleTestPreferenceChange(ctq.ctqId, 'enableTwoProportionTest', checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`two-proportion-${ctq.ctqId}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Two-Proportion Test (Before/After)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`chi-square-${ctq.ctqId}`}
                            checked={testPreferences[ctq.ctqId]?.enableChiSquareTest ?? true}
                            onCheckedChange={(checked) => 
                              handleTestPreferenceChange(ctq.ctqId, 'enableChiSquareTest', checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`chi-square-${ctq.ctqId}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Chi-Square Test (Multiple Categories Before/After Test of Independence)
                          </label>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClearAll(ctq.ctqId)}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          Clear All
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveSelections(ctq.ctqId)}
                          disabled={savePreferencesMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Save className="h-4 w-4" />
                          {savePreferencesMutation.isPending ? "Saving..." : "Save Test Selections"}
                        </Button>
                      </div>
                    </div>

                    {/* Two Proportions Test - Show only if enabled */}
                    {testPreferences[ctq.ctqId]?.enableTwoProportionTest !== false && (
                      <div>
                        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="text-sm text-green-800">
                            <strong>Two-Proportion Test:</strong> Compare the proportion of defects or success rates between "Before" (Sample 1) and "After" (Sample 2) to prove statistical improvement.
                          </p>
                        </div>
                        <BeforeAfterTwoProportionTest
                          projectId={projectId}
                          ctqId={ctq.ctqId}
                          ctqName={ctq.ctq}
                        />
                      </div>
                    )}

                    {/* Chi-Square Test - Show only if enabled */}
                    {testPreferences[ctq.ctqId]?.enableChiSquareTest !== false && (
                      <div>
                        <div className="mb-4 p-3 bg-purple-50 border-l-4 border-purple-500 rounded">
                          <p className="text-sm text-purple-800">
                            <strong>Chi-Square Test:</strong> Test the relationship between two categorical variables (e.g., Time Period [Before/After] and Outcome Categories) to prove that the improvement initiative has changed the distribution of outcomes.
                          </p>
                        </div>
                        <BeforeAfterChiSquareTest
                          projectId={projectId}
                          ctqId={ctq.ctqId}
                          ctqName={ctq.ctq}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
