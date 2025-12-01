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
import { Loader2, FileText, Download, Trash2, Paperclip, X } from "lucide-react";
import DrawIoProcessMap from "@/components/dmaic/DrawIoProcessMap";
import ProcessRaciMatrix from "@/components/dmaic/ProcessRaciMatrix";
import { SimpleRegression } from "@/components/dmaic/SimpleRegression";
import { ANOVATwoWay } from "@/components/dmaic/ANOVATwoWay";
import { MultipleRegression } from "@/components/dmaic/MultipleRegression";
import { FullFactorialDOE } from "@/components/dmaic/FullFactorialDOE";
import { FractionalFactorialDOE } from "@/components/dmaic/FractionalFactorialDOE";
import { LogisticRegression } from "@/components/dmaic/LogisticRegression";

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

interface TransferFunctionConfig {
  tfSimpleRegression: boolean;
  tfAnovaTwoWay: boolean;
  tfMultipleRegression: boolean;
  tfDoe: boolean;
  tfDoeFullFactorial: boolean;
  tfDoeFractionalFactorial: boolean;
  tfLogisticRegression: boolean;
}

const checkboxLabels = [
  { key: "toBeProcessMap", label: "TO BE Process Map" },
  { key: "toBeProcessRaci", label: "RACI" },
  { key: "transferFunction", label: "Transfer Function & System Setting" },
  { key: "otherDesign", label: "Other Design" },
  { key: "solutionNotPursued", label: "Solution Not Retained" },
] as const;

const transferFunctionLabels = [
  { key: "tfSimpleRegression", label: "Simple Regression" },
  { key: "tfAnovaTwoWay", label: "ANOVA Two-Way" },
  { key: "tfMultipleRegression", label: "Multiple Regression" },
  { key: "tfDoe", label: "Design of Experiment (DOE)", hasSubOptions: true },
  { key: "tfLogisticRegression", label: "Logistic Regression" },
] as const;

const doeSubOptions = [
  { key: "tfDoeFullFactorial", label: "Full Factorial (2", label2: "k" },
  { key: "tfDoeFractionalFactorial", label: "Fractional Factorial (2", label2: "(k-p)" },
] as const;

export default function SolutionDesign({ projectId }: SolutionDesignProps) {
  const { toast } = useToast();
  const storageKey = `solutionDesignTab-${projectId}`;
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || "";
    }
    return "";
  });
  const [checkboxStates, setCheckboxStates] = useState<Record<string, CheckboxState>>({});
  const [transferFunctionConfigs, setTransferFunctionConfigs] = useState<Record<string, TransferFunctionConfig>>({});
  const [otherDesignExplanations, setOtherDesignExplanations] = useState<Record<string, string>>({});
  const [otherDesignFiles, setOtherDesignFiles] = useState<Record<string, File | null>>({});
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const [filesMarkedForRemoval, setFilesMarkedForRemoval] = useState<Record<string, boolean>>({});

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

  // Set active tab to first solution when solutions load or from localStorage
  useEffect(() => {
    if (solutions.length > 0) {
      const savedTab = localStorage.getItem(storageKey);
      const tabExists = savedTab && solutions.some(s => s.solutionId === savedTab);
      
      if (tabExists) {
        setActiveTab(savedTab);
      } else if (!activeTab) {
        setActiveTab(solutions[0].solutionId);
      }
    }
  }, [solutions, storageKey]);

  // Persist active tab to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab, storageKey]);

  // Initialize checkbox states and explanations from tracking data
  useEffect(() => {
    const states: Record<string, CheckboxState> = {};
    const tfConfigs: Record<string, TransferFunctionConfig> = {};
    const explanations: Record<string, string> = {};
    
    // Initialize all solutions with default values
    solutions.forEach((solution) => {
      states[solution.solutionId] = {
        toBeProcessMap: false,
        toBeProcessRaci: false,
        transferFunction: false,
        otherDesign: false,
        solutionNotPursued: false,
      };
      tfConfigs[solution.solutionId] = {
        tfSimpleRegression: false,
        tfAnovaTwoWay: false,
        tfMultipleRegression: false,
        tfDoe: false,
        tfDoeFullFactorial: false,
        tfDoeFractionalFactorial: false,
        tfLogisticRegression: false,
      };
      explanations[solution.solutionId] = "";
    });
    
    // Override with tracking data if available
    tracking.forEach((t) => {
      states[t.solutionId] = {
        toBeProcessMap: t.toBeProcessMap || false,
        toBeProcessRaci: t.toBeProcessRaci || false,
        transferFunction: t.transferFunction || false,
        otherDesign: t.otherDesign || false,
        solutionNotPursued: t.solutionNotPursued || false,
      };
      tfConfigs[t.solutionId] = {
        tfSimpleRegression: t.tfSimpleRegression || false,
        tfAnovaTwoWay: t.tfAnovaTwoWay || false,
        tfMultipleRegression: t.tfMultipleRegression || false,
        tfDoe: t.tfDoe || false,
        tfDoeFullFactorial: t.tfDoeFullFactorial || false,
        tfDoeFractionalFactorial: t.tfDoeFractionalFactorial || false,
        tfLogisticRegression: t.tfLogisticRegression || false,
      };
      explanations[t.solutionId] = t.otherDesignExplanation || "";
    });
    
    setCheckboxStates(states);
    setTransferFunctionConfigs(tfConfigs);
    setOtherDesignExplanations(explanations);
  }, [tracking, solutions]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviewUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviewUrls]);

  // Clear filesMarkedForRemoval when tracking data confirms file is removed
  useEffect(() => {
    if (tracking.length > 0) {
      setFilesMarkedForRemoval((prev) => {
        const updated = { ...prev };
        Object.keys(prev).forEach((solutionId) => {
          if (prev[solutionId]) {
            const trackingRecord = tracking.find(t => t.solutionId === solutionId);
            // If the file is actually null in the database, clear the flag
            if (!trackingRecord?.otherDesignFile) {
              updated[solutionId] = false;
            }
          }
        });
        return updated;
      });
    }
  }, [tracking]);

  // Shared mutation function
  const createSaveTrackingMutation = (successMessage: string) => {
    return useMutation({
      mutationFn: async (data: { solutionId: string; checkboxes: CheckboxState; tfConfig: TransferFunctionConfig; explanation: string; file: File | null; removeFile?: boolean }) => {
        const formData = new FormData();
        formData.append("solutionId", data.solutionId);
        formData.append("toBeProcessMap", String(data.checkboxes.toBeProcessMap));
        formData.append("toBeProcessRaci", String(data.checkboxes.toBeProcessRaci));
        formData.append("transferFunction", String(data.checkboxes.transferFunction));
        formData.append("otherDesign", String(data.checkboxes.otherDesign));
        formData.append("solutionNotPursued", String(data.checkboxes.solutionNotPursued));
        formData.append("otherDesignExplanation", data.explanation);
        
        // Transfer Function Configuration
        formData.append("tfSimpleRegression", String(data.tfConfig.tfSimpleRegression));
        formData.append("tfAnovaTwoWay", String(data.tfConfig.tfAnovaTwoWay));
        formData.append("tfMultipleRegression", String(data.tfConfig.tfMultipleRegression));
        formData.append("tfDoe", String(data.tfConfig.tfDoe));
        formData.append("tfDoeFullFactorial", String(data.tfConfig.tfDoeFullFactorial));
        formData.append("tfDoeFractionalFactorial", String(data.tfConfig.tfDoeFractionalFactorial));
        formData.append("tfLogisticRegression", String(data.tfConfig.tfLogisticRegression));
        
        if (data.file) {
          formData.append("otherDesignFile", data.file);
        } else if (data.removeFile) {
          formData.append("removeFile", "true");
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
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: [`/api/projects/${projectId}/solution-design-tracking`],
        });
        toast({
          title: "Success",
          description: successMessage,
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
  };

  // Separate mutations for each save action
  const saveDesignToolsMutation = createSaveTrackingMutation("Design Tools configuration saved successfully");
  const saveTransferFunctionMutation = createSaveTrackingMutation("Transfer Function configuration saved successfully");
  const saveExplanationMutation = createSaveTrackingMutation("Explanation and file saved successfully");

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

  const handleTransferFunctionChange = (solutionId: string, key: keyof TransferFunctionConfig, checked: boolean) => {
    setTransferFunctionConfigs((prev) => {
      const currentConfig = prev[solutionId] || {
        tfSimpleRegression: false,
        tfAnovaTwoWay: false,
        tfMultipleRegression: false,
        tfDoe: false,
        tfDoeFullFactorial: false,
        tfDoeFractionalFactorial: false,
        tfLogisticRegression: false,
      };
      
      const newConfig = {
        ...currentConfig,
        [key]: checked,
      };
      
      // If unchecking tfDoe, also uncheck both factorial options
      if (key === 'tfDoe' && !checked) {
        newConfig.tfDoeFullFactorial = false;
        newConfig.tfDoeFractionalFactorial = false;
      }
      
      return {
        ...prev,
        [solutionId]: newConfig,
      };
    });
  };

  const handleClearTransferFunction = (solutionId: string) => {
    setTransferFunctionConfigs((prev) => ({
      ...prev,
      [solutionId]: {
        tfSimpleRegression: false,
        tfAnovaTwoWay: false,
        tfMultipleRegression: false,
        tfDoe: false,
        tfDoeFullFactorial: false,
        tfDoeFractionalFactorial: false,
        tfLogisticRegression: false,
      },
    }));
  };

  const handleSaveTransferFunction = (solutionId: string) => {
    // Get current database values for fields we're NOT updating
    const existingTracking = tracking.find(t => t.solutionId === solutionId);
    
    const checkboxes = existingTracking ? {
      toBeProcessMap: existingTracking.toBeProcessMap || false,
      toBeProcessRaci: existingTracking.toBeProcessRaci || false,
      transferFunction: existingTracking.transferFunction || false,
      otherDesign: existingTracking.otherDesign || false,
      solutionNotPursued: existingTracking.solutionNotPursued || false,
    } : {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    
    // Use the NEW tfConfig from user input
    const tfConfig = transferFunctionConfigs[solutionId] || {
      tfSimpleRegression: false,
      tfAnovaTwoWay: false,
      tfMultipleRegression: false,
      tfDoe: false,
      tfDoeFullFactorial: false,
      tfDoeFractionalFactorial: false,
      tfLogisticRegression: false,
    };
    
    const explanation = existingTracking?.otherDesignExplanation || "";
    const file = null; // Don't change file when saving transfer function
    
    saveTransferFunctionMutation.mutate({ solutionId, checkboxes, tfConfig, explanation, file });
  };

  const handleSave = (solutionId: string) => {
    // Get current database values for fields we're NOT updating
    const existingTracking = tracking.find(t => t.solutionId === solutionId);
    
    // Use the NEW checkboxes from user input
    const checkboxes = checkboxStates[solutionId] || {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    
    const tfConfig = existingTracking ? {
      tfSimpleRegression: existingTracking.tfSimpleRegression || false,
      tfAnovaTwoWay: existingTracking.tfAnovaTwoWay || false,
      tfMultipleRegression: existingTracking.tfMultipleRegression || false,
      tfDoe: existingTracking.tfDoe || false,
      tfDoeFullFactorial: existingTracking.tfDoeFullFactorial || false,
      tfDoeFractionalFactorial: existingTracking.tfDoeFractionalFactorial || false,
      tfLogisticRegression: existingTracking.tfLogisticRegression || false,
    } : {
      tfSimpleRegression: false,
      tfAnovaTwoWay: false,
      tfMultipleRegression: false,
      tfDoe: false,
      tfDoeFullFactorial: false,
      tfDoeFractionalFactorial: false,
      tfLogisticRegression: false,
    };
    
    const explanation = existingTracking?.otherDesignExplanation || "";
    const file = null; // Don't change file when saving design tools
    
    saveDesignToolsMutation.mutate({ solutionId, checkboxes, tfConfig, explanation, file });
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
    // Get current database values for fields we're NOT updating
    const existingTracking = tracking.find(t => t.solutionId === solutionId);
    
    const checkboxes = existingTracking ? {
      toBeProcessMap: existingTracking.toBeProcessMap || false,
      toBeProcessRaci: existingTracking.toBeProcessRaci || false,
      transferFunction: existingTracking.transferFunction || false,
      otherDesign: existingTracking.otherDesign || false,
      solutionNotPursued: existingTracking.solutionNotPursued || false,
    } : {
      toBeProcessMap: false,
      toBeProcessRaci: false,
      transferFunction: false,
      otherDesign: false,
      solutionNotPursued: false,
    };
    
    const tfConfig = existingTracking ? {
      tfSimpleRegression: existingTracking.tfSimpleRegression || false,
      tfAnovaTwoWay: existingTracking.tfAnovaTwoWay || false,
      tfMultipleRegression: existingTracking.tfMultipleRegression || false,
      tfDoe: existingTracking.tfDoe || false,
      tfDoeFullFactorial: existingTracking.tfDoeFullFactorial || false,
      tfDoeFractionalFactorial: existingTracking.tfDoeFractionalFactorial || false,
      tfLogisticRegression: existingTracking.tfLogisticRegression || false,
    } : {
      tfSimpleRegression: false,
      tfAnovaTwoWay: false,
      tfMultipleRegression: false,
      tfDoe: false,
      tfDoeFullFactorial: false,
      tfDoeFractionalFactorial: false,
      tfLogisticRegression: false,
    };
    
    // Use the NEW explanation and file from user input
    const explanation = otherDesignExplanations[solutionId] || "";
    const file = otherDesignFiles[solutionId] || null;
    
    // Check if we need to explicitly remove an existing file
    const existingFile = existingTracking?.otherDesignFile;
    const shouldRemoveFile = !!(existingFile && !file);
    
    saveExplanationMutation.mutate({ solutionId, checkboxes, tfConfig, explanation, file, removeFile: shouldRemoveFile });
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

  const handleRemoveFile = (solutionId: string) => {
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
    
    // Mark existing file for removal
    setFilesMarkedForRemoval((prev) => ({
      ...prev,
      [solutionId]: true,
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
            {solutions.map((solution) => {
              const trackingRecord = tracking.find(t => t.solutionId === solution.solutionId);
              const currentState = checkboxStates[solution.solutionId];
              // Check both current checkbox state and saved tracking data
              const isNotRetained = currentState?.solutionNotPursued ?? trackingRecord?.solutionNotPursued ?? false;
              
              return (
                <TabsTrigger 
                  key={solution.solutionId} 
                  value={solution.solutionId} 
                  data-testid={`tab-solution-${solution.solutionId}`}
                  className={isNotRetained ? "opacity-75 text-muted-foreground" : ""}
                >
                  <span className="flex items-center gap-1">
                    {isNotRetained && <X className="h-3 w-3" />}
                    <span className={isNotRetained ? "line-through" : ""}>
                      {solution.solutionId}
                    </span>
                  </span>
                </TabsTrigger>
              );
            })}
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
                      disabled={saveDesignToolsMutation.isPending}
                      data-testid={`button-save-${solution.solutionId}`}
                    >
                      {saveDesignToolsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Design Tools Configuration
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleClearAll(solution.solutionId)}
                      disabled={saveDesignToolsMutation.isPending}
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

                  {/* Transfer Function & System Setting - Show when checkbox is selected */}
                  {currentState.transferFunction && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Transfer Function & System Setting - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-gray-500">
                            Select the statistical methods you want to use for this solution:
                          </p>
                          
                          <div className="space-y-4">
                            {transferFunctionLabels.map((item) => {
                              const { key, label } = item;
                              const hasSubOptions = 'hasSubOptions' in item ? item.hasSubOptions : false;
                              const currentTfConfig = transferFunctionConfigs[solution.solutionId] || {
                                tfSimpleRegression: false,
                                tfAnovaTwoWay: false,
                                tfMultipleRegression: false,
                                tfDoe: false,
                                tfDoeFullFactorial: false,
                                tfDoeFractionalFactorial: false,
                                tfLogisticRegression: false,
                              };
                              
                              return (
                                <div key={key}>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${solution.solutionId}-${key}`}
                                      checked={currentTfConfig[key as keyof TransferFunctionConfig]}
                                      onCheckedChange={(checked) =>
                                        handleTransferFunctionChange(solution.solutionId, key as keyof TransferFunctionConfig, checked as boolean)
                                      }
                                      data-testid={`checkbox-tf-${key}-${solution.solutionId}`}
                                    />
                                    <Label
                                      htmlFor={`${solution.solutionId}-${key}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {label}
                                    </Label>
                                  </div>
                                  
                                  {/* DOE Sub-options - Show only when tfDoe is checked */}
                                  {hasSubOptions && currentTfConfig.tfDoe && (
                                    <div className="ml-8 mt-2 space-y-2">
                                      {doeSubOptions.map(({ key: subKey, label: subLabel, label2: subLabel2 }) => (
                                        <div key={subKey} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`${solution.solutionId}-${subKey}`}
                                            checked={currentTfConfig[subKey as keyof TransferFunctionConfig]}
                                            onCheckedChange={(checked) =>
                                              handleTransferFunctionChange(solution.solutionId, subKey as keyof TransferFunctionConfig, checked as boolean)
                                            }
                                            data-testid={`checkbox-tf-${subKey}-${solution.solutionId}`}
                                          />
                                          <Label
                                            htmlFor={`${solution.solutionId}-${subKey}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            {subLabel}<sup>{subLabel2}</sup>)
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveTransferFunction(solution.solutionId)}
                              disabled={saveTransferFunctionMutation.isPending}
                              data-testid={`button-save-tf-config-${solution.solutionId}`}
                            >
                              {saveTransferFunctionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Configuration
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleClearTransferFunction(solution.solutionId)}
                              disabled={saveTransferFunctionMutation.isPending}
                              data-testid={`button-clear-tf-config-${solution.solutionId}`}
                            >
                              Clear All
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Simple Regression - Show when tfSimpleRegression is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfSimpleRegression && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Simple Regression Analysis - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SimpleRegression key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* ANOVA Two-Way - Show when tfAnovaTwoWay is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfAnovaTwoWay && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>ANOVA Two-Way Analysis - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ANOVATwoWay key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Multiple Regression - Show when tfMultipleRegression is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfMultipleRegression && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Multiple Regression Analysis - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MultipleRegression key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Full Factorial DOE - Show when tfDoeFullFactorial is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfDoeFullFactorial && (
                    <div className="mt-6">
                      <FullFactorialDOE key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                    </div>
                  )}

                  {/* Fractional Factorial DOE - Show when tfDoeFractionalFactorial is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfDoeFractionalFactorial && (
                    <div className="mt-6">
                      <FractionalFactorialDOE key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                    </div>
                  )}

                  {/* Logistic Regression - Show when tfLogisticRegression is checked */}
                  {currentState.transferFunction && transferFunctionConfigs[solution.solutionId]?.tfLogisticRegression && (
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Logistic Regression Analysis - {solution.solutionId}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LogisticRegression key={`${projectId}-${solution.solutionId}`} projectId={projectId} solutionId={solution.solutionId} />
                        </CardContent>
                      </Card>
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
                          <Button
                              variant="outline"
                              onClick={() => handleClearExplanation(solution.solutionId)}
                              disabled={saveExplanationMutation.isPending}
                              data-testid={`button-clear-explanation-${solution.solutionId}`}
                            >
                              Clear All Explanation
                            </Button>

                          <div>
                            <input
                              id={`file-${solution.solutionId}`}
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                
                                // Validate file size (100MB limit)
                                if (file && file.size > 100 * 1024 * 1024) {
                                  toast({
                                    title: "File too large",
                                    description: "File size must be less than 100MB",
                                    variant: "destructive",
                                  });
                                  e.target.value = "";
                                  return;
                                }
                                
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
                                  // Reset the marked for removal flag when a new file is selected
                                  setFilesMarkedForRemoval(prev => ({
                                    ...prev,
                                    [solution.solutionId]: false,
                                  }));
                                }
                                
                                setOtherDesignFiles(prev => ({
                                  ...prev,
                                  [solution.solutionId]: file
                                }));
                              }}
                              className="hidden"
                              data-testid={`input-file-${solution.solutionId}`}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`file-${solution.solutionId}`)?.click()}
                              className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              title="Attach file (100MB limit)"
                              data-testid={`button-attach-file-${solution.solutionId}`}
                            >
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm">Attach file (100MB limit)</span>
                            </button>
                            {otherDesignFiles[solution.solutionId] && (
                              <div className="mt-2 flex items-center gap-2">
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleRemoveFile(solution.solutionId)}
                                  data-testid={`button-remove-new-file-${solution.solutionId}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                            {tracking.find(t => t.solutionId === solution.solutionId)?.otherDesignFile && !otherDesignFiles[solution.solutionId] && !filesMarkedForRemoval[solution.solutionId] && (
                              <div className="mt-2 flex items-center gap-2">
                                {(() => {
                                  const filePath = tracking.find(t => t.solutionId === solution.solutionId)?.otherDesignFile || "";
                                  // Extract filename from path like /uploads/solution-design/project26-S1-report-1234567890.pdf
                                  const fileName = filePath.split('/').pop() || "file";
                                  // Format is: project{id}-{solutionId}-{baseName}-{timestamp}{ext}
                                  // We need to extract baseName + extension
                                  const parts = fileName.split('-');
                                  let displayName = fileName;
                                  
                                  if (parts.length >= 4) {
                                    // Remove first 2 parts (project{id}, {solutionId}) and last part (timestamp)
                                    const baseNameParts = parts.slice(2, -1);
                                    const timestamp = parts[parts.length - 1];
                                    // Get extension from the timestamp part (e.g., "1234567890.pdf" -> ".pdf")
                                    const extMatch = timestamp.match(/\.[^.]+$/);
                                    const ext = extMatch ? extMatch[0] : '';
                                    displayName = baseNameParts.join('-') + ext;
                                  }
                                  
                                  return (
                                    <>
                                      <a
                                        href={filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary flex items-center gap-2 hover:underline"
                                        data-testid={`link-existing-file-${solution.solutionId}`}
                                      >
                                        <Download className="h-4 w-4" />
                                        <span>View existing file: {displayName}</span>
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemoveFile(solution.solutionId)}
                                        data-testid={`button-remove-existing-file-${solution.solutionId}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveExplanation(solution.solutionId)}
                              disabled={saveExplanationMutation.isPending}
                              data-testid={`button-save-explanation-${solution.solutionId}`}
                            >
                              {saveExplanationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save Explanation & Attached file
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
