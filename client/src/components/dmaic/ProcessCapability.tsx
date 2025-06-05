import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Save } from "lucide-react";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  sampleSize: number | null;
  mean: string;
  standardDeviation: string;
  lsl: string;
  usl: string;
  target: string;
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

interface ProcessCapabilityProps {
  projectId: number;
}

export default function ProcessCapability({ projectId }: ProcessCapabilityProps) {
  const { toast } = useToast();
  const [capabilityData, setCapabilityData] = useState<{ [ctq: string]: ProcessCapabilityData }>({});
  const [activeTab, setActiveTab] = useState<string>("");

  // Load CTS characteristics to get CTQs
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load customer requirements as fallback source for CTQs
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`],
    enabled: !!projectId,
  });

  // Load business requirements as fallback source for CTQs
  const { data: businessRequirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/business-requirements`],
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
      const payload = {
        projectId,
        ...data,
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/process-capability/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/process-capability`, payload);
      }
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

  // Get CTQs from multiple sources
  const getCTQs = () => {
    // First priority: CTS characteristics
    if (ctsData?.characteristics?.length > 0) {
      return ctsData.characteristics.map((char: any) => char.ctq);
    }
    
    // Second priority: Customer and Business requirements
    const allCTQs = [];
    
    if (requirementsData?.requirements) {
      const customerCTQs = requirementsData.requirements
        .filter((req: any) => req.ctq && req.ctq.trim())
        .map((req: any) => req.ctq);
      allCTQs.push(...customerCTQs);
    }
    
    if (businessRequirementsData?.businessRequirements) {
      const businessCTQs = businessRequirementsData.businessRequirements
        .filter((req: any) => req.ctq && req.ctq.trim())
        .map((req: any) => req.ctq);
      allCTQs.push(...businessCTQs);
    }
    
    // Remove duplicates
    return [...new Set(allCTQs)];
  };

  // Initialize Process Capability data when CTQs and capability data are loaded
  useEffect(() => {
    const ctqs = getCTQs();
    if (ctqs.length > 0 && capabilityDataResponse?.processCapability) {
      const initialData: { [ctq: string]: ProcessCapabilityData } = {};
      
      // Create Process Capability entry for each CTQ
      ctqs.forEach((ctq: string) => {
        const existingCapability = capabilityDataResponse.processCapability.find((cap: any) => cap.ctq === ctq);
        
        // Check if this CTQ comes from CTS characteristics to auto-populate LSL, USL, target
        const ctsChar = ctsData?.characteristics?.find((char: any) => char.ctq === ctq);
        
        initialData[ctq] = existingCapability || {
          ctq: ctq,
          sampleSize: null,
          mean: "",
          standardDeviation: "",
          lsl: ctsChar?.lsl || "",
          usl: ctsChar?.usl || "",
          target: ctsChar?.target || "",
          cp: "",
          cpk: "",
          pp: "",
          ppk: "",
          sigma: "",
          dpmo: "",
          yield: "",
          dataPoints: "",
          controlChartType: ctsChar?.ctqType === "Continuous" ? "X-bar R" : "P",
          conclusion: "",
          actionPlan: "",
        };
      });
      
      setCapabilityData(initialData);
      
      // Set active tab to first CTQ if not already set
      if (!activeTab && ctqs.length > 0) {
        setActiveTab(ctqs[0]);
      }
    }
  }, [ctsData, capabilityDataResponse, requirementsData, businessRequirementsData, activeTab]);

  const updateCapabilityField = (ctq: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const handleSaveCapability = (ctq: string) => {
    const data = capabilityData[ctq];
    if (data) {
      saveCapabilityMutation.mutate(data);
    }
  };

  const getCapabilityStatusBadge = (ctq: string) => {
    const data = capabilityData[ctq];
    if (!data) return <Badge variant="secondary">No Data</Badge>;
    
    const hasBasicData = data.sampleSize && data.mean && data.standardDeviation;
    const hasCapabilityIndices = data.cp || data.cpk || data.pp || data.ppk;
    
    if (hasCapabilityIndices) {
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    } else if (hasBasicData) {
      return <Badge variant="outline">In Progress</Badge>;
    } else {
      return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const calculateCapabilityIndices = (ctq: string) => {
    const data = capabilityData[ctq];
    if (!data || !data.mean || !data.standardDeviation || (!data.lsl && !data.usl)) {
      return;
    }

    const mean = parseFloat(data.mean);
    const stdDev = parseFloat(data.standardDeviation);
    const lsl = data.lsl ? parseFloat(data.lsl) : null;
    const usl = data.usl ? parseFloat(data.usl) : null;
    const target = data.target ? parseFloat(data.target) : null;

    // Calculate Cp (Process Capability)
    let cp = "";
    if (lsl !== null && usl !== null) {
      cp = ((usl - lsl) / (6 * stdDev)).toFixed(3);
    }

    // Calculate Cpk (Process Capability Index)
    let cpk = "";
    if (lsl !== null && usl !== null) {
      const cpkLower = (mean - lsl) / (3 * stdDev);
      const cpkUpper = (usl - mean) / (3 * stdDev);
      cpk = Math.min(cpkLower, cpkUpper).toFixed(3);
    } else if (lsl !== null) {
      cpk = ((mean - lsl) / (3 * stdDev)).toFixed(3);
    } else if (usl !== null) {
      cpk = ((usl - mean) / (3 * stdDev)).toFixed(3);
    }

    // Calculate Sigma level from Cpk
    let sigma = "";
    if (cpk) {
      const sigmaLevel = parseFloat(cpk) * 3 + 1.5;
      sigma = sigmaLevel.toFixed(2);
    }

    // Calculate DPMO (Defects Per Million Opportunities)
    let dpmo = "";
    if (sigma) {
      const sigmaLevel = parseFloat(sigma);
      // Approximate DPMO calculation based on sigma level
      const dpmoValue = Math.max(0, 1000000 * (1 - 0.5 * (1 + Math.erf((sigmaLevel - 1.5) / Math.sqrt(2)))));
      dpmo = Math.round(dpmoValue).toString();
    }

    // Calculate Yield
    let yieldValue = "";
    if (dpmo) {
      const dpmoNum = parseFloat(dpmo);
      yieldValue = ((1000000 - dpmoNum) / 10000).toFixed(2);
    }

    // Update the data
    setCapabilityData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        cp,
        cpk,
        pp: cp, // Assuming Pp = Cp for simplification
        ppk: cpk, // Assuming Ppk = Cpk for simplification
        sigma,
        dpmo,
        yield: yieldValue,
      }
    }));
  };

  if (ctsLoading || capabilityLoading) {
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

  const ctqList = ctsData?.characteristics || [];

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
            No CTQs defined in CTS Characteristics. Please define CTQs first to create process capability studies.
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-auto overflow-x-auto" style={{ gridTemplateColumns: `repeat(${ctqList.length}, minmax(200px, 1fr))` }}>
            {ctqList.map((char: any) => (
              <TabsTrigger 
                key={char.ctq} 
                value={char.ctq}
                className="flex flex-col items-center gap-1 p-3"
              >
                <span className="font-medium truncate max-w-[150px]">{char.ctq}</span>
                {getCapabilityStatusBadge(char.ctq)}
              </TabsTrigger>
            ))}
          </TabsList>

          {ctqList.map((char: any) => (
            <TabsContent key={char.ctq} value={char.ctq} className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sample Size</label>
                    <Input
                      type="number"
                      value={capabilityData[char.ctq]?.sampleSize || ""}
                      onChange={(e) => updateCapabilityField(char.ctq, "sampleSize", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Control Chart Type</label>
                    <Select
                      value={capabilityData[char.ctq]?.controlChartType || "X-bar R"}
                      onValueChange={(value) => updateCapabilityField(char.ctq, "controlChartType", value)}
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

                  <div>
                    <label className="block text-sm font-medium mb-2">Process Mean</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[char.ctq]?.mean || ""}
                      onChange={(e) => updateCapabilityField(char.ctq, "mean", e.target.value)}
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
                      value={capabilityData[char.ctq]?.standardDeviation || ""}
                      onChange={(e) => updateCapabilityField(char.ctq, "standardDeviation", e.target.value)}
                      placeholder="e.g., 0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">LSL (Lower Spec Limit)</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[char.ctq]?.lsl || ""}
                      onChange={(e) => updateCapabilityField(char.ctq, "lsl", e.target.value)}
                      placeholder="e.g., 8.0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">USL (Upper Spec Limit)</label>
                    <Input
                      type="number"
                      step="any"
                      value={capabilityData[char.ctq]?.usl || ""}
                      onChange={(e) => updateCapabilityField(char.ctq, "usl", e.target.value)}
                      placeholder="e.g., 12.0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Target Value</label>
                  <Input
                    type="number"
                    step="any"
                    value={capabilityData[char.ctq]?.target || ""}
                    onChange={(e) => updateCapabilityField(char.ctq, "target", e.target.value)}
                    placeholder="e.g., 10.0"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => calculateCapabilityIndices(char.ctq)}
                    variant="outline"
                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Calculate Capability Indices
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Process Capability Indices</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Cp</label>
                      <Input
                        value={capabilityData[char.ctq]?.cp || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "cp", e.target.value)}
                        placeholder="e.g., 1.33"
                        className={
                          capabilityData[char.ctq]?.cp && parseFloat(capabilityData[char.ctq]?.cp) >= 1.33
                            ? "border-green-500"
                            : capabilityData[char.ctq]?.cp && parseFloat(capabilityData[char.ctq]?.cp) < 1.0
                            ? "border-red-500"
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Cpk</label>
                      <Input
                        value={capabilityData[char.ctq]?.cpk || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "cpk", e.target.value)}
                        placeholder="e.g., 1.25"
                        className={
                          capabilityData[char.ctq]?.cpk && parseFloat(capabilityData[char.ctq]?.cpk) >= 1.33
                            ? "border-green-500"
                            : capabilityData[char.ctq]?.cpk && parseFloat(capabilityData[char.ctq]?.cpk) < 1.0
                            ? "border-red-500"
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pp</label>
                      <Input
                        value={capabilityData[char.ctq]?.pp || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "pp", e.target.value)}
                        placeholder="e.g., 1.30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Ppk</label>
                      <Input
                        value={capabilityData[char.ctq]?.ppk || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "ppk", e.target.value)}
                        placeholder="e.g., 1.22"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Process Performance Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Sigma Level</label>
                      <Input
                        value={capabilityData[char.ctq]?.sigma || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "sigma", e.target.value)}
                        placeholder="e.g., 4.5"
                        className={
                          capabilityData[char.ctq]?.sigma && parseFloat(capabilityData[char.ctq]?.sigma) >= 6.0
                            ? "border-green-500"
                            : capabilityData[char.ctq]?.sigma && parseFloat(capabilityData[char.ctq]?.sigma) < 3.0
                            ? "border-red-500"
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">DPMO</label>
                      <Input
                        value={capabilityData[char.ctq]?.dpmo || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "dpmo", e.target.value)}
                        placeholder="e.g., 233"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Yield (%)</label>
                      <Input
                        value={capabilityData[char.ctq]?.yield || ""}
                        onChange={(e) => updateCapabilityField(char.ctq, "yield", e.target.value)}
                        placeholder="e.g., 99.98"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Raw Data Points</label>
                  <Textarea
                    value={capabilityData[char.ctq]?.dataPoints || ""}
                    onChange={(e) => updateCapabilityField(char.ctq, "dataPoints", e.target.value)}
                    placeholder="Enter raw measurement data (JSON format or comma-separated values)..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Conclusion</label>
                  <Textarea
                    value={capabilityData[char.ctq]?.conclusion || ""}
                    onChange={(e) => updateCapabilityField(char.ctq, "conclusion", e.target.value)}
                    placeholder="Summarize the process capability analysis results and process performance..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Action Plan</label>
                  <Textarea
                    value={capabilityData[char.ctq]?.actionPlan || ""}
                    onChange={(e) => updateCapabilityField(char.ctq, "actionPlan", e.target.value)}
                    placeholder="Define actions needed to improve process capability if required..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveCapability(char.ctq)}
                    disabled={saveCapabilityMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
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