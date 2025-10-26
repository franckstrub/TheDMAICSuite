import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [selectedTestType, setSelectedTestType] = useState<{ [key: string]: string }>({});

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

  // Handle test type selection for each CTQ
  const handleTestTypeChange = (ctqName: string, testType: string) => {
    setSelectedTestType(prev => ({
      ...prev,
      [ctqName]: testType
    }));
    localStorage.setItem(`proof-improvement-test-type-${projectId}-${ctqName}`, testType);
  };

  // Restore test type from localStorage
  useEffect(() => {
    const restored: { [key: string]: string } = {};
    ctqList.forEach(ctq => {
      const savedTestType = localStorage.getItem(`proof-improvement-test-type-${projectId}-${ctq.ctq}`);
      if (savedTestType) {
        restored[ctq.ctq] = savedTestType;
      } else {
        // Set default test type based on CTQ type
        if (ctq.ctqType === "Continuous") {
          restored[ctq.ctq] = "mean-variance-median";
        } else {
          restored[ctq.ctq] = "two-proportions";
        }
      }
    });
    setSelectedTestType(restored);
  }, [ctqList, projectId]);

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

                {/* Test Type Selection */}
                <div className="p-4 border rounded-lg bg-white">
                  <Label className="text-base font-semibold mb-3 block">
                    Select Test Type for Before vs After Comparison
                  </Label>
                  <Select
                    value={selectedTestType[ctq.ctq] || (ctq.ctqType === "Continuous" ? "mean-variance-median" : "two-proportions")}
                    onValueChange={(value) => handleTestTypeChange(ctq.ctq, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ctq.ctqType === "Continuous" ? (
                        <SelectItem value="mean-variance-median">
                          Test Mean, Variance, or Median (Before vs After)
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="two-proportions">
                            Test Two Proportions (Before vs After)
                          </SelectItem>
                          <SelectItem value="chi-square">
                            Chi-Square Test of Independence (Multiple Categories)
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Render appropriate test component based on CTQ type and selected test */}
                {ctq.ctqType === "Continuous" && selectedTestType[ctq.ctq] === "mean-variance-median" && (
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
                )}

                {ctq.ctqType === "Attribute" && selectedTestType[ctq.ctq] === "two-proportions" && (
                  <div className="mt-4">
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

                {ctq.ctqType === "Attribute" && selectedTestType[ctq.ctq] === "chi-square" && (
                  <div className="mt-4">
                    <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-sm text-green-800">
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
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
