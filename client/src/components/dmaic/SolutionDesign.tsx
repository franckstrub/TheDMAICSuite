import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Solution, SolutionDesignTracking } from "@shared/schema";
import { Loader2 } from "lucide-react";
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

  // Initialize checkbox states from tracking data
  useEffect(() => {
    if (tracking.length > 0) {
      const states: Record<string, CheckboxState> = {};
      tracking.forEach((t) => {
        states[t.solutionId] = {
          toBeProcessMap: t.toBeProcessMap || false,
          toBeProcessRaci: t.toBeProcessRaci || false,
          transferFunction: t.transferFunction || false,
          otherDesign: t.otherDesign || false,
          solutionNotPursued: t.solutionNotPursued || false,
        };
      });
      setCheckboxStates(states);
    }
  }, [tracking]);

  // Save tracking mutation
  const saveTrackingMutation = useMutation({
    mutationFn: async (data: { solutionId: string; checkboxes: CheckboxState }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/solution-design-tracking`, {
        solutionId: data.solutionId,
        ...data.checkboxes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solution-design-tracking`],
      });
      toast({
        title: "Success",
        description: "Design tracking saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save design tracking",
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
    saveTrackingMutation.mutate({ solutionId, checkboxes });
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
            No solutions available. Please create solutions first in the Solution Generation section before designing them.
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
