import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  sampleSize: number | null;
  mean: string;
  standardDeviation: string;
  lsl: string;
  usl: string;
  target: string;
  zShift: number;
  dataSetTerm: "Long Term" | "Short Term";
  cp: string;
  cpk: string;
  pp: string;
  ppk: string;
  sigma: string;
  dpmo: string;
  yield: string;
  dataPoints: string;
  controlChartType: string;
  conclusion: string;
  actionPlan: string;
}
interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}
interface ProcessCapabilityProps {
  projectId: number;
}

export default function ProcessCapability({ projectId }: ProcessCapabilityProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [capabilityData, setCapabilityData] = useState<{ [ctq: string]: ProcessCapabilityData }>({});
  const [activeTab, setActiveTab] = useState<string>("");

  // Load last active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, [projectId]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`process-capability-active-tab-${projectId}`, tabValue);
  };

  // Track tab initialization to prevent overriding saved tabs
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  // Load CTQs from centralized endpoint
  const { data: ctqsData, isLoading: ctqsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctqs`],
    enabled: !!projectId,
  });

  // Load CTS characteristics for additional data
  const { data: ctsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load existing Process Capability data
  const { data: capabilityDataResponse, isLoading: capabilityLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/process-capability`],
    enabled: !!projectId,
  });

  // Save Process Capability mutation
  const saveCapabilityMutation = useMutation({
    mutationFn: async (data: ProcessCapabilityData) => {
      const response = await fetch(`/api/projects/${projectId}/process-capability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Process capability analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/process-capability`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save process capability analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Get CTQs from centralized endpoint
  const getCTQs = () => {
    // Use centralized CTQs endpoint which aggregates from all sources
    if ((ctqsData as any)?.ctqs?.length > 0) {
      return (ctqsData as any).ctqs.map((item: any) => item.ctq);
    }
    
    return [];
  };
  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous"
      }));
    }
    return [];
  };

  // Initialize Process Capability data when CTQs and capability data are loaded
  useEffect(() => {
    const ctqs = getCtqsWithTypes();
    if (ctqs.length > 0) {
      const initialData: { [ctq: string]: ProcessCapabilityData } = {};
      
      // Create Process Capability entry for each CTQ
      ctqs.forEach((CtqWithType: CtqWithType) => {
        const ctq = CtqWithType.ctq;
        const existingCapability = (capabilityDataResponse as any)?.processCapability?.find((cap: any) => cap.ctq === ctq);
        
        // Check if this CTQ comes from CTS characteristics to auto-populate LSL, USL, target
        const ctsChar = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        
        initialData[ctq] = existingCapability || {
          ctq: ctq,
          sampleSize: null,
          mean: "",
          standardDeviation: "",
          lsl: ctsChar?.lsl || "",
          usl: ctsChar?.usl || "",
          target: ctsChar?.target || "",
          zShift: 1.5,
          dataSetTerm: "Long Term" as const,
          cp: "",
          cpk: "",
          pp: "",
          ppk: "",
          sigma: "",
          dpmo: "",
          yield: "",
          dataPoints: "",
          controlChartType: CtqWithType.ctqType === "Continuous" ? "X-bar R" : "P",
          conclusion: "",
          actionPlan: "",
        };
      });
      
      setCapabilityData(initialData);
      
      // Set active tab to saved or first CTQ if not initialized yet
      if (!activeTab && ctqs.length > 0 && !hasInitializedTab) {
        const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
        const ctqNames = ctqs.map(c => c.ctq);
        if (savedTab && ctqNames.includes(savedTab)) {
          setActiveTab(savedTab);
        } else {
          setActiveTab(ctqs[0].ctq);
        }
        setHasInitializedTab(true);
      }
    }
  }, [ctqsData, capabilityDataResponse, ctsData, activeTab]);

  const updateCapabilityField = (ctq: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      },
    }));
  };

  const getCapabilityStatusBadge = (ctq: string) => {
    const data = capabilityData[ctq];
    if (!data) return <Badge variant="secondary">No Data</Badge>;
    
    const hasBasicData = data.mean && data.standardDeviation;
    const hasSpecs = data.lsl || data.usl;
    const hasCapability = data.cp || data.cpk;
    
    if (hasCapability) {
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    } else if (hasBasicData && hasSpecs) {
      return <Badge variant="outline">In Progress</Badge>;
    } else {
      return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const saveCapability = (ctq: string) => {
    const data = capabilityData[ctq];
    if (data) {
      saveCapabilityMutation.mutate(data);
    }
  };

  if (ctqsLoading || capabilityLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading process capability data...</div>
        </CardContent>
      </Card>
    );
  }

  const ctqList = getCTQs();

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create Process capability study(ies).
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Process Capability
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          One process capability study per CTQ defined in CTS Characteristics table
        </p>
      </CardHeader>
      <CardContent>
        {/*
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-auto overflow-x-auto" style={{ gridTemplateColumns: `repeat(${ctqList.length}, minmax(200px, 1fr))` }}>
            {ctqList.map((ctq: string) => (
              <TabsTrigger 
                key={ctq} 
                value={ctq}
                className="flex flex-col items-center gap-1 p-3"
              >
                <span className="font-medium truncate max-w-[150px]">{ctq}</span>
                {getCapabilityStatusBadge(ctq)}
              </TabsTrigger>
            ))}
          </TabsList>
          */}
          {/* Only show scroll indicator if 5+ CTQs exist */}
                  {ctqList.length >= 6 && (
                   <div className="relative">
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                    ← Scroll horizontally →
                    </div>
                  </div>
                )}
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-[25px]">
                    <div className="w-full overflow-x-auto">         
                      <TabsList className="flex w-max min-w-full justify-start">
                        {ctqList.map((CtqWithType: CtqWithType) => (
                          <TabsTrigger 
                            key={CtqWithType.ctq} 
                            value={CtqWithType.ctq}
                            className="px-4 py-2 min-w-max flex flex-col items-center border border-gray-200 data-[state=active]:border-none"
                          >
                            <span className="font-medium truncate min-w-[150px]">{CtqWithType.ctq}</span>
                            essai
                            Wew
                            <span className="text-xs text-gray-600">{CtqWithType.ctqType}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
          
          {ctqList.map((ctq: string) => (
            <TabsContent key={ctq} value={ctq} className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sample Size</label>
                    <Input
                      type="number"
                      value={capabilityData[ctq]?.sampleSize || ""}
                      onChange={(e) => updateCapabilityField(ctq, "sampleSize", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Control Chart Type</label>
                    <Select
                      value={capabilityData[ctq]?.controlChartType || "X-bar R"}
                      onValueChange={(value) => updateCapabilityField(ctq, "controlChartType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="X-bar R">X-bar R Chart</SelectItem>
                        <SelectItem value="I-MR">Individual-Moving Range</SelectItem>
                        <SelectItem value="P">P Chart (Proportion)</SelectItem>
                        <SelectItem value="NP">NP Chart (Number Defective)</SelectItem>
                        <SelectItem value="C">C Chart (Count of Defects)</SelectItem>
                        <SelectItem value="U">U Chart (Defects per Unit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Z-Shift Value</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={capabilityData[ctq]?.zShift || 1.5}
                      onChange={(e) => updateCapabilityField(ctq, "zShift", parseFloat(e.target.value) || 1.5)}
                      placeholder="1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Data Set Term</label>
                    <Select
                      value={capabilityData[ctq]?.dataSetTerm || "Long Term"}
                      onValueChange={(value) => updateCapabilityField(ctq, "dataSetTerm", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Long Term">Long Term</SelectItem>
                        <SelectItem value="Short Term">Short Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Process Mean</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.mean || ""}
                      onChange={(e) => updateCapabilityField(ctq, "mean", e.target.value)}
                      placeholder="e.g., 10.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Standard Deviation</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.standardDeviation || ""}
                      onChange={(e) => updateCapabilityField(ctq, "standardDeviation", e.target.value)}
                      placeholder="e.g., 0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">LSL (Lower Spec Limit)</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.lsl || ""}
                      onChange={(e) => updateCapabilityField(ctq, "lsl", e.target.value)}
                      placeholder="e.g., 8.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">USL (Upper Spec Limit)</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.usl || ""}
                      onChange={(e) => updateCapabilityField(ctq, "usl", e.target.value)}
                      placeholder="e.g., 12.0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Value</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.target || ""}
                      onChange={(e) => updateCapabilityField(ctq, "target", e.target.value)}
                      placeholder="e.g., 10.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Data Points</label>
                    <Input
                      value={capabilityData[ctq]?.dataPoints || ""}
                      onChange={(e) => updateCapabilityField(ctq, "dataPoints", e.target.value)}
                      placeholder="Brief description of data source"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cp</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.cp || ""}
                      onChange={(e) => updateCapabilityField(ctq, "cp", e.target.value)}
                      placeholder="e.g., 1.33"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cpk</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.cpk || ""}
                      onChange={(e) => updateCapabilityField(ctq, "cpk", e.target.value)}
                      placeholder="e.g., 1.25"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Pp</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.pp || ""}
                      onChange={(e) => updateCapabilityField(ctq, "pp", e.target.value)}
                      placeholder="e.g., 1.20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ppk</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.ppk || ""}
                      onChange={(e) => updateCapabilityField(ctq, "ppk", e.target.value)}
                      placeholder="e.g., 1.15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sigma Level</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.sigma || ""}
                      onChange={(e) => updateCapabilityField(ctq, "sigma", e.target.value)}
                      placeholder="e.g., 4.2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">DPMO</label>
                    <Input
                      type="number"
                      value={capabilityData[ctq]?.dpmo || ""}
                      onChange={(e) => updateCapabilityField(ctq, "dpmo", e.target.value)}
                      placeholder="e.g., 3000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Yield (%)</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[ctq]?.yield || ""}
                      onChange={(e) => updateCapabilityField(ctq, "yield", e.target.value)}
                      placeholder="e.g., 99.7"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Conclusion</label>
                    <Textarea
                      value={capabilityData[ctq]?.conclusion || ""}
                      onChange={(e) => updateCapabilityField(ctq, "conclusion", e.target.value)}
                      placeholder="Summary of process capability assessment..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Action Plan</label>
                    <Textarea
                      value={capabilityData[ctq]?.actionPlan || ""}
                      onChange={(e) => updateCapabilityField(ctq, "actionPlan", e.target.value)}
                      placeholder="Actions needed to improve process capability..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveCapability(ctq)}
                    disabled={saveCapabilityMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveCapabilityMutation.isPending ? "Saving..." : "Save Process Capability"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}