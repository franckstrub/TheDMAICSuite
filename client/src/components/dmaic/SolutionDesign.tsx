import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Solution, SolutionDesignTracking } from "@shared/schema";
import { Loader2, FileText, Download } from "lucide-react";
import DrawIoProcessMap from "@/components/dmaic/DrawIoProcessMap";
import ProcessRaciMatrix from "@/components/dmaic/ProcessRaciMatrix";

interface SolutionDesignProps {
  projectId: number;
}

interface CheckboxState {
  toBeProcessMap: boolean;
  toBeProcessRaci: boolean;
  transferFunction: boolean;
  otherDesign: boolean;
  solutionNotPursued: boolean;
}

const checkboxLabels = [
  { key: "toBeProcessMap", label: "TO BE Process Map" },
  { key: "toBeProcessRaci", label: "RACI" },
  { key: "transferFunction", label: "Transfer Function & System Setting" },
  { key: "otherDesign", label: "Other Design" },
  { key: "solutionNotPursued", label: "Solution Not Retained" },
] as const;

export default function SolutionDesign({ projectId }: SolutionDesignProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("");
  const [checkboxStates, setCheckboxStates] = useState<Record<string, CheckboxState>>({});
  const [otherDesignExplanations, setOtherDesignExplanations] = useState<Record<string, string>>({});
  const [otherDesignFiles, setOtherDesignFiles] = useState<Record<string, File | null>>({});
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});

  // Fetch solutions
  const { data: solutionsData, isLoading: solutionsLoading } = useQuery<{ solutions: Solution[] }>({
    queryKey: [`/api/projects/${projectId}/solutions`],
  });

  // Fetch design tracking
  const { data: trackingData, isLoading: trackingLoading } = useQuery<{ tracking: SolutionDesignTracking[] }>({
    queryKey: [`/api/projects/${projectId}/solution-design-tracking`],
  });

  const solutions = solutionsData?.solutions || [];
  const tracking = trackingData?.tracking || [];

  // Set active tab to first solution when solutions load
  useEffect(() => {
    if (solutions.length > 0 && !activeTab) {
      setActiveTab(solutions[0].solutionId);
    }
  }, [solutions, activeTab]);

  // Initialize checkbox states and explanations from tracking data
  useEffect(() => {
    if (tracking.length > 0) {
      const states: Record<string, CheckboxState> = {};
      const explanations: Record<string, string> = {};
      tracking.forEach((t) => {
        states[t.solutionId] = {
          toBeProcessMap: t.toBeProcessMap || false,
          toBeProcessRaci: t.toBeProcessRaci || false,
          transferFunction: t.transferFunction || false,
          otherDesign: t.otherDesign || false,
          solutionNotPursued: t.solutionNotPursued || false,
        };
        explanations[t.solutionId] = t.otherDesignExplanation || "";
      });
      setCheckboxStates(states);
      setOtherDesignExplanations(explanations);
    }
  }, [tracking]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviewUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviewUrls]);

  // Save tracking mutation
  const saveTrackingMutation = useMutation({
    mutationFn: async (data: { solutionId: string; checkboxes: CheckboxState; explanation: string; file: File | null }) => {
      const formData = new FormData();
      formData.append("solutionId", data.solutionId);
      formData.append("toBeProcessMap", String(data.checkboxes.toBeProcessMap));
      formData.append("toBeProcessRaci", String(data.checkboxes.toBeProcessRaci));
      formData.append("transferFunction", String(data.checkboxes.transferFunction));
      formData.append("otherDesign", String(data.checkboxes.otherDesign));
      formData.append("solutionNotPursued", String(data.checkboxes.solutionNotPursued));
      formData.append("otherDesignExplanation", data.explanation);
      
      if (data.file) {
        formData.append("otherDesignFile", data.file);
      }

      const response = await fetch(`/api/projects/${projectId}/solution-design-tracking`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save solution design tracking");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solution-design-tracking`],
      });
      toast({
        title: "Success",
        description: "Soltion design tracking saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Solution design tracking",
        variant: "destructive",
      });
    },
  });

  const handleCheckboxChange = (solutionId: string, key: keyof CheckboxState, checked: boolean) => {
    setCheckboxStates((prev) => ({
      ...prev,
      [solutionId]: {
        ...(prev[solutionId] || {
          toBeProcessMap: false,
          toBeProcessRaci: false,
          transferFunction: false,
          otherDesign: false,
          solutionNotPursued: false,
        }),
        [key]: checked,
      },
    }));
  };

  const handleSave = (solutionId: string) => {
    const checkboxes = checkboxStates[solutionId] || {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    const explanation = otherDesignExplanations[solutionId] || "";
    const file = otherDesignFiles[solutionId] || null;
    saveTrackingMutation.mutate({ solutionId, checkboxes, explanation, file });
  };

  const handleClearAll = (solutionId: string) => {
    const clearedState: CheckboxState = {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    setCheckboxStates((prev) => ({
      ...prev,
      [solutionId]: clearedState,
    }));
  };

  const handleSaveExplanation = (solutionId: string) => {
    const checkboxes = checkboxStates[solutionId] || {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    const explanation = otherDesignExplanations[solutionId] || "";
    const file = otherDesignFiles[solutionId] || null;
    saveTrackingMutation.mutate({ solutionId, checkboxes, explanation, file });
  };

  const handleClearExplanation = (solutionId: string) => {
    setOtherDesignExplanations((prev) => ({
      ...prev,
      [solutionId]: "",
    }));
    
    // Revoke object URL if exists
    if (filePreviewUrls[solutionId]) {
      URL.revokeObjectURL(filePreviewUrls[solutionId]);
      setFilePreviewUrls((prev) => ({
        ...prev,
        [solutionId]: "",
      }));
    }
    
    setOtherDesignFiles((prev) => ({
      ...prev,
      [solutionId]: null,
    }));
    
    // Clear the file input
    const fileInput = document.getElementById(`file-${solutionId}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  if (solutionsLoading || trackingLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solution Design</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (solutions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Solution Design</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            No solutions available. Please create solutions in the Solution Generation section before designing them.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solution Design</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Define design aspects for each retained solution.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto">
            {solutions.map((solution) => (
              <TabsTrigger key={solution.solutionId} value={solution.solutionId} data-testid={`tab-solution-${solution.solutionId}`}>
                {solution.solutionId}
              </TabsTrigger>
            ))}
          </TabsList>

          {solutions.map((solution) => {
            const currentState = checkboxStates[solution.solutionId] || {
              toBeProcessMap: false,
              toBeProcessRaci: false,
              transferFunction: false,
              otherDesign: false,
              solutionNotPursued: false,
            };

            return (
              <TabsContent key={solution.solutionId} value={solution.solutionId}>
                <div className="space-y-4">
                  {/* Solution Information */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div>
                      <span className="font-semibold">Solution ID:</span>{" "}
                      <span data-testid={`text-solution-id-${solution.solutionId}`}>{solution.solutionId}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Description:</span>{" "}
                      <span data-testid={`text-solution-description-${solution.solutionId}`}>{solution.solution}</span>
                    </div>
                    {solution.benefit && (
                      <div>
                        <span className="font-semibold">Benefit:</span>{" "}
                        <span data-testid={`text-solution-benefit-${solution.solutionId}`}>{solution.benefit}</span>
                      </div>
                    )}
                    {solution.effort && (
                      <div>
                        <span className="font-semibold">Effort:</span>{" "}
                        <span data-testid={`text-solution-effort-${solution.solutionId}`}>{solution.effort}</span>
                      </div>
                    )}
                  </div>

                  {/* Design tool Checkboxes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Select Design Tools (select multiple) or confirm that solution is not retained</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {checkboxLabels.map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${solution.solutionId}-${key}`}
                            checked={currentState[key as keyof CheckboxState]}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(solution.solutionId, key as keyof CheckboxState, checked as boolean)
                            }
                            data-testid={`checkbox-${key}-${solution.solutionId}`}
                          />
                          <Label
                            htmlFor={`${solution.solutionId}-${key}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleSave(solution.solutionId)}
                      disabled={saveTrackingMutation.isPending}
                      data-testid={`button-save-${solution.solutionId}`}
                    >
                      {saveTrackingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Design Tools Configuration
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleClearAll(solution.solutionId)}
                      disabled={saveTrackingMutation.isPending}
                      data-testid={`button-clear-all-${solution.solutionId}`}
                    >
                      Clear All
                    </Button>
                  </div>

                  {/* TO BE Process Map - Show when checkbox is selected */}
                  {currentState.toBeProcessMap && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>TO BE Process Map - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DrawIoProcessMap projectId={projectId} type="TO_BE" solutionId={solution.solutionId} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* TO BE Process RACI - Show when checkbox is selected */}
                  {currentState.toBeProcessRaci && (
                    <div className="mt-6">
                      <ProcessRaciMatrix projectId={projectId} solutionId={solution.solutionId} />
                    </div>
                  )}

                  {/* Other Design Explanation - Show when checkbox is selected */}
                  {currentState.otherDesign && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Other Design Explanation - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor={`explanation-${solution.solutionId}`}>Explanation</Label>
                            <Textarea
                              id={`explanation-${solution.solutionId}`}
                              placeholder="Describe your design approach..."
                              value={otherDesignExplanations[solution.solutionId] || ""}
                              onChange={(e) => setOtherDesignExplanations(prev => ({
                                ...prev,
                                [solution.solutionId]: e.target.value
                              }))}
                              rows={6}
                              className="mt-2"
                              data-testid={`textarea-explanation-${solution.solutionId}`}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`file-${solution.solutionId}`}>Attach File (Optional)</Label>
                            <Input
                              id={`file-${solution.solutionId}`}
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                
                                // Revoke previous object URL if exists
                                if (filePreviewUrls[solution.solutionId]) {
                                  URL.revokeObjectURL(filePreviewUrls[solution.solutionId]);
                                }
                                
                                // Create new object URL for the file
                                if (file) {
                                  const objectUrl = URL.createObjectURL(file);
                                  setFilePreviewUrls(prev => ({
                                    ...prev,
                                    [solution.solutionId]: objectUrl
                                  }));
                                }
                                
                                setOtherDesignFiles(prev => ({
                                  ...prev,
                                  [solution.solutionId]: file
                                }));
                              }}
                              className="mt-2"
                              data-testid={`input-file-${solution.solutionId}`}
                            />
                            {otherDesignFiles[solution.solutionId] && (
                              <div className="mt-2">
                                <a
                                  href={filePreviewUrls[solution.solutionId] || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary flex items-center gap-2 hover:underline"
                                  data-testid={`link-new-file-${solution.solutionId}`}
                                >
                                  <Download className="h-4 w-4" />
                                  <span>View existing file: {otherDesignFiles[solution.solutionId]?.name}</span>
                                </a>
                              </div>
                            )}
                            {tracking.find(t => t.solutionId === solution.solutionId)?.otherDesignFile && !otherDesignFiles[solution.solutionId] && (
                              <div className="mt-2">
                                {(() => {
                                  const filePath = tracking.find(t => t.solutionId === solution.solutionId)?.otherDesignFile || "";
                                  const fileName = filePath.split('/').pop() || "file";
                                  return (
                                    <a
                                      href={filePath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary flex items-center gap-2 hover:underline"
                                      data-testid={`link-existing-file-${solution.solutionId}`}
                                    >
                                      <Download className="h-4 w-4" />
                                      <span>View existing file: {fileName}</span>
                                    </a>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveExplanation(solution.solutionId)}
                              disabled={saveTrackingMutation.isPending}
                              data-testid={`button-save-explanation-${solution.solutionId}`}
                            >
                              {saveTrackingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Explanation
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleClearExplanation(solution.solutionId)}
                              disabled={saveTrackingMutation.isPending}
                              data-testid={`button-clear-explanation-${solution.solutionId}`}
                            >
                              Clear All Explanation
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
