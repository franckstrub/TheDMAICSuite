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
import { BarChart3, Save } from "lucide-react";

interface MsaData {
  id?: number;
  ctq: string;
  msaType: string;
  studyDescription: string;
  operators: string;
  parts: string;
  measurements: string;
  repeatability: string;
  reproducibility: string;
  partToPartVariation: string;
  totalGageRR: string;
  numberDistinctCategories: number | null;
  acceptableCriteria: string;
  conclusion: string;
  actionPlan: string;
}

interface MsaAnalysisProps {
  projectId: number;
}

export default function MsaAnalysis({ projectId }: MsaAnalysisProps) {
  const { toast } = useToast();
  const [msaData, setMsaData] = useState<{ [ctq: string]: MsaData }>({});
  const [activeTab, setActiveTab] = useState<string>("");

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

  // Load existing MSA data
  const { data: msaDataResponse, isLoading: msaLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/msa-analysis`],
    enabled: !!projectId,
  });

  // Save MSA mutation
  const saveMsaMutation = useMutation({
    mutationFn: async (data: MsaData) => {
      const payload = {
        projectId,
        ...data,
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/msa-analysis/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/msa-analysis`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MSA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/msa-analysis`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save MSA analysis: ${error}`,
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

  // Initialize MSA data when CTQs and MSA data are loaded
  useEffect(() => {
    const ctqs = getCTQs();
    if (ctqs.length > 0 && msaDataResponse?.msaAnalysis) {
      const initialData: { [ctq: string]: MsaData } = {};
      
      // Create MSA entry for each CTQ
      ctqs.forEach((ctq: string) => {
        const existingMsa = msaDataResponse.msaAnalysis.find((msa: any) => msa.ctq === ctq);
        
        initialData[ctq] = existingMsa || {
          ctq: ctq,
          msaType: "Gage R&R",
          studyDescription: "",
          operators: "",
          parts: "",
          measurements: "",
          repeatability: "",
          reproducibility: "",
          partToPartVariation: "",
          totalGageRR: "",
          numberDistinctCategories: null,
          acceptableCriteria: "",
          conclusion: "",
          actionPlan: "",
        };
      });
      
      setMsaData(initialData);
      
      // Set active tab to first CTQ if not already set
      if (!activeTab && ctqs.length > 0) {
        setActiveTab(ctqs[0]);
      }
    }
  }, [ctqsData, msaDataResponse, ctsData, activeTab]);

  const updateMsaField = (ctq: string, field: keyof MsaData, value: any) => {
    setMsaData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const handleSaveMsa = (ctq: string) => {
    const data = msaData[ctq];
    if (data) {
      saveMsaMutation.mutate(data);
    }
  };

  const getMsaStatusBadge = (ctq: string) => {
    const data = msaData[ctq];
    if (!data) return <Badge variant="secondary">No Data</Badge>;
    
    const hasBasicData = data.msaType && data.studyDescription;
    const hasResults = data.totalGageRR || data.numberDistinctCategories;
    
    if (hasResults) {
      return <Badge variant="default" className="bg-green-600">Complete</Badge>;
    } else if (hasBasicData) {
      return <Badge variant="outline">In Progress</Badge>;
    } else {
      return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (ctsLoading || msaLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            MSA (Measurement System Analysis)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading MSA data...</div>
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
            <BarChart3 className="h-5 w-5" />
            MSA (Measurement System Analysis)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQs available. Please define CTS characteristics or requirements with CTQs to create MSA studies.
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
          MSA (Measurement System Analysis)
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          One MSA study per CTQ defined in CTS Characteristics table
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
                {getMsaStatusBadge(char.ctq)}
              </TabsTrigger>
            ))}
          </TabsList>

          {ctqList.map((char: any) => (
            <TabsContent key={char.ctq} value={char.ctq} className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">MSA Type</label>
                    <Select
                      value={msaData[char.ctq]?.msaType || "Gage R&R"}
                      onValueChange={(value) => updateMsaField(char.ctq, "msaType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Gage R&R">Gage R&R</SelectItem>
                        <SelectItem value="Attribute Agreement">Attribute Agreement</SelectItem>
                        <SelectItem value="Bias Study">Bias Study</SelectItem>
                        <SelectItem value="Linearity Study">Linearity Study</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Distinct Categories (ndc)</label>
                    <Input
                      type="number"
                      value={msaData[char.ctq]?.numberDistinctCategories || ""}
                      onChange={(e) => updateMsaField(char.ctq, "numberDistinctCategories", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Study Description</label>
                  <Textarea
                    value={msaData[char.ctq]?.studyDescription || ""}
                    onChange={(e) => updateMsaField(char.ctq, "studyDescription", e.target.value)}
                    placeholder="Describe the MSA study methodology and objectives..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Operators</label>
                    <Input
                      value={msaData[char.ctq]?.operators || ""}
                      onChange={(e) => updateMsaField(char.ctq, "operators", e.target.value)}
                      placeholder="e.g., Operator A, Operator B, Operator C"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Parts/Samples</label>
                    <Input
                      value={msaData[char.ctq]?.parts || ""}
                      onChange={(e) => updateMsaField(char.ctq, "parts", e.target.value)}
                      placeholder="e.g., Part 1, Part 2, Part 3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Measurement Data</label>
                  <Textarea
                    value={msaData[char.ctq]?.measurements || ""}
                    onChange={(e) => updateMsaField(char.ctq, "measurements", e.target.value)}
                    placeholder="Enter measurement data (JSON format or structured text)..."
                    rows={4}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">MSA Results (%Study Variation)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Repeatability (%)</label>
                      <Input
                        value={msaData[char.ctq]?.repeatability || ""}
                        onChange={(e) => updateMsaField(char.ctq, "repeatability", e.target.value)}
                        placeholder="e.g., 15.2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Reproducibility (%)</label>
                      <Input
                        value={msaData[char.ctq]?.reproducibility || ""}
                        onChange={(e) => updateMsaField(char.ctq, "reproducibility", e.target.value)}
                        placeholder="e.g., 8.7"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Part-to-Part (%)</label>
                      <Input
                        value={msaData[char.ctq]?.partToPartVariation || ""}
                        onChange={(e) => updateMsaField(char.ctq, "partToPartVariation", e.target.value)}
                        placeholder="e.g., 89.3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Total Gage R&R (%)</label>
                      <Input
                        value={msaData[char.ctq]?.totalGageRR || ""}
                        onChange={(e) => updateMsaField(char.ctq, "totalGageRR", e.target.value)}
                        placeholder="e.g., 17.5"
                        className={
                          msaData[char.ctq]?.totalGageRR && parseFloat(msaData[char.ctq]?.totalGageRR) > 30
                            ? "border-red-500"
                            : msaData[char.ctq]?.totalGageRR && parseFloat(msaData[char.ctq]?.totalGageRR) <= 10
                            ? "border-green-500"
                            : ""
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Acceptable Criteria</label>
                  <Textarea
                    value={msaData[char.ctq]?.acceptableCriteria || ""}
                    onChange={(e) => updateMsaField(char.ctq, "acceptableCriteria", e.target.value)}
                    placeholder="Define the pass/fail criteria for this MSA study..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Conclusion</label>
                  <Textarea
                    value={msaData[char.ctq]?.conclusion || ""}
                    onChange={(e) => updateMsaField(char.ctq, "conclusion", e.target.value)}
                    placeholder="Summarize the MSA study results and measurement system acceptability..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Action Plan</label>
                  <Textarea
                    value={msaData[char.ctq]?.actionPlan || ""}
                    onChange={(e) => updateMsaField(char.ctq, "actionPlan", e.target.value)}
                    placeholder="Define actions needed to improve the measurement system if required..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveMsa(char.ctq)}
                    disabled={saveMsaMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMsaMutation.isPending ? "Saving..." : "Save MSA Study"}
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