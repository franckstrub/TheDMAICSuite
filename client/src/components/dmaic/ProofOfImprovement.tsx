import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  
  // State for test preferences (which tests to show for each CTQ)
  const [testPreferences, setTestPreferences] = useState<{ [ctqId: number]: { enableTwoProportionTest: boolean; enableChiSquareTest: boolean } }>({});

  // Load CTQs with types from CTS characteristics
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
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

  // Load preferences for all CTQs
  useEffect(() => {
    if (ctqList.length > 0) {
      ctqList.forEach(async (ctq) => {
        if (ctq.ctqType === "Attribute") {
          try {
            const response = await fetch(`/api/projects/${projectId}/ctq/${ctq.ctqId}/proof-improvement-preferences`, {
              credentials: 'include',
            });
            
            if (response.ok) {
              const data = await response.json();
              setTestPreferences(prev => ({
                ...prev,
                [ctq.ctqId]: {
                  enableTwoProportionTest: data.enableTwoProportionTest ?? true,
                  enableChiSquareTest: data.enableChiSquareTest ?? true,
                }
              }));
            } else {
              // Set default values if not found
              setTestPreferences(prev => ({
                ...prev,
                [ctq.ctqId]: {
                  enableTwoProportionTest: true,
                  enableChiSquareTest: true,
                }
              }));
            }
          } catch (error) {
            console.error('Error loading preferences:', error);
            // Set default values on error
            setTestPreferences(prev => ({
              ...prev,
              [ctq.ctqId]: {
                enableTwoProportionTest: true,
                enableChiSquareTest: true,
              }
            }));
          }
        }
      });
    }
  }, [ctqList, projectId]);

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
        title: "Preferences Saved",
        description: "Test preferences have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle checkbox changes
  const handleTestPreferenceChange = (ctqId: number, testType: 'enableTwoProportionTest' | 'enableChiSquareTest', checked: boolean) => {
    const newPreferences = {
      ...testPreferences[ctqId],
      [testType]: checked,
    };
    
    setTestPreferences(prev => ({
      ...prev,
      [ctqId]: newPreferences,
    }));
    
    // Auto-save when checkbox changes
    savePreferencesMutation.mutate({ ctqId, preferences: newPreferences });
  };

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Proof of Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to perform Proof of Improvement analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Proof of Improvement - Before vs After Analysis
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
                        <strong>Continuous CTQ Test:</strong> Compare the Mean, Variance, or Median between "Before" (Dataset 1) and "After" (Dataset 2) implementation to prove statistical improvement.
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
                        Select Tests to Display
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
                            Two Proportion Test (Before vs After)
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
                            Chi-Square Test (Multiple Categories Before vs After)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Two Proportions Test - Show only if enabled */}
                    {testPreferences[ctq.ctqId]?.enableTwoProportionTest !== false && (
                      <div>
                        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="text-sm text-green-800">
                            <strong>Two Proportion Test:</strong> Compare the proportion of defects or success rates between "Before" (Sample 1) and "After" (Sample 2) implementation to prove statistical improvement.
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
