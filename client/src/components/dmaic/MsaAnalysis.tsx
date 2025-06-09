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
import { BarChart3, Save, Upload, Download, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  
  // Attribute Agreement Analysis fields
  unitAppraisedType: string;
  unitAppraisedTypeOther: string;
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  agreementAnalysisData: AgreementAnalysisRow[];
  studyDateTime: string;
}

interface AgreementAnalysisRow {
  unitNumber: number;
  reference: "OK" | "KO";
  app1_rep1: "OK" | "KO";
  app1_rep2: "OK" | "KO";
  app1_rep3: "OK" | "KO";
  app2_rep1: "OK" | "KO";
  app2_rep2: "OK" | "KO";
  app2_rep3: "OK" | "KO";
  app3_rep1: "OK" | "KO";
  app3_rep2: "OK" | "KO";
  app3_rep3: "OK" | "KO";
}

interface MsaAnalysisProps {
  projectId: number;
}

export default function MsaAnalysis({ projectId }: MsaAnalysisProps) {
  const { toast } = useToast();
  const [msaData, setMsaData] = useState<{ [ctq: string]: MsaData }>({});
  const [activeTab, setActiveTab] = useState<string>("");

  // Generate default agreement analysis data with 10 rows
  const generateDefaultAgreementData = (): AgreementAnalysisRow[] => {
    return Array.from({ length: 10 }, (_, index) => ({
      unitNumber: index + 1,
      reference: "OK" as const,
      app1_rep1: "OK" as const,
      app1_rep2: "OK" as const,
      app1_rep3: "OK" as const,
      app2_rep1: "OK" as const,
      app2_rep2: "OK" as const,
      app2_rep3: "OK" as const,
      app3_rep1: "OK" as const,
      app3_rep2: "OK" as const,
      app3_rep3: "OK" as const,
    }));
  };

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
    if (ctqs.length > 0 && msaDataResponse && typeof msaDataResponse === 'object' && 'msaAnalysis' in msaDataResponse) {
      const initialData: { [ctq: string]: MsaData } = {};
      
      // Create MSA entry for each CTQ
      ctqs.forEach((ctq: string) => {
        const existingMsa = (msaDataResponse as any).msaAnalysis.find((msa: any) => msa.ctq === ctq);
        
        initialData[ctq] = existingMsa ? {
          ...existingMsa,
          agreementAnalysisData: existingMsa.agreementAnalysisData ? 
            JSON.parse(existingMsa.agreementAnalysisData) : 
            generateDefaultAgreementData(),
        } : {
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
          
          // Attribute Agreement Analysis fields
          unitAppraisedType: "Parts",
          unitAppraisedTypeOther: "",
          appraiser1Name: "",
          appraiser2Name: "",
          appraiser3Name: "",
          agreementAnalysisData: generateDefaultAgreementData(),
          studyDateTime: "",
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

  const updateAgreementAnalysisRow = (ctq: string, rowIndex: number, field: keyof AgreementAnalysisRow, value: "OK" | "KO") => {
    setMsaData(prev => {
      const updatedData = [...(prev[ctq]?.agreementAnalysisData || [])];
      if (updatedData[rowIndex]) {
        updatedData[rowIndex] = {
          ...updatedData[rowIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: updatedData,
        }
      };
    });
  };

  const addAgreementAnalysisRow = (ctq: string) => {
    setMsaData(prev => {
      const currentData = prev[ctq]?.agreementAnalysisData || [];
      const newRow: AgreementAnalysisRow = {
        unitNumber: currentData.length + 1,
        reference: "OK",
        app1_rep1: "OK",
        app1_rep2: "OK",
        app1_rep3: "OK",
        app2_rep1: "OK",
        app2_rep2: "OK",
        app2_rep3: "OK",
        app3_rep1: "OK",
        app3_rep2: "OK",
        app3_rep3: "OK",
      };
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: [...currentData, newRow],
        }
      };
    });
  };

  const removeAgreementAnalysisRow = (ctq: string, rowIndex: number) => {
    setMsaData(prev => {
      const updatedData = [...(prev[ctq]?.agreementAnalysisData || [])];
      updatedData.splice(rowIndex, 1);
      
      // Renumber the remaining rows
      updatedData.forEach((row, index) => {
        row.unitNumber = index + 1;
      });
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: updatedData,
        }
      };
    });
  };

  const handleSaveMsa = (ctq: string) => {
    const data = msaData[ctq];
    if (data) {
      const payload = {
        ...data,
        agreementAnalysisData: JSON.stringify(data.agreementAnalysisData),
        studyDateTime: data.studyDateTime || new Date().toISOString(),
      } as any;
      saveMsaMutation.mutate(payload);
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

  if (ctqsLoading || msaLoading) {
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
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create MSA study(ies).
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
            {ctqList.map((ctq: string) => (
              <TabsTrigger 
                key={ctq} 
                value={ctq}
                className="flex flex-col items-center gap-1 p-3"
              >
                <span className="font-medium truncate max-w-[150px]">{ctq}</span>
                {getMsaStatusBadge(ctq)}
              </TabsTrigger>
            ))}
          </TabsList>

          {ctqList.map((ctq: string) => (
            <TabsContent key={ctq} value={ctq} className="mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">MSA Type</label>
                    <Select
                      value={msaData[ctq]?.msaType || "Gage R&R"}
                      onValueChange={(value) => updateMsaField(ctq, "msaType", value)}
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
                      value={msaData[ctq]?.numberDistinctCategories || ""}
                      onChange={(e) => updateMsaField(ctq, "numberDistinctCategories", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Study Description</label>
                  <Textarea
                    value={msaData[ctq]?.studyDescription || ""}
                    onChange={(e) => updateMsaField(ctq, "studyDescription", e.target.value)}
                    placeholder="Describe the MSA study methodology and objectives..."
                    rows={3}
                  />
                </div>

                {/* Conditional rendering based on MSA Type */}
                {msaData[ctq]?.msaType === "Attribute Agreement" ? (
                  // Attribute Agreement Analysis Interface
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">Attribute Agreement Analysis (Gage R&R)</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        For Attribute CTQs, we perform Agreement Analysis studying both Accuracy and Precision using OK/KO evaluations.
                      </p>
                    </div>

                    {/* Unit Appraised Type and Study Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Unit Appraised Type</label>
                        <Select
                          value={msaData[ctq]?.unitAppraisedType || "Parts"}
                          onValueChange={(value) => updateMsaField(ctq, "unitAppraisedType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Parts">Parts</SelectItem>
                            <SelectItem value="Units">Units</SelectItem>
                            <SelectItem value="Files">Files</SelectItem>
                            <SelectItem value="Documents">Documents</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {msaData[ctq]?.unitAppraisedType === "Other" && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Other - Please specify</label>
                          <Input
                            value={msaData[ctq]?.unitAppraisedTypeOther || ""}
                            onChange={(e) => updateMsaField(ctq, "unitAppraisedTypeOther", e.target.value)}
                            placeholder="Specify the type of unit being appraised"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Study Date & Time</label>
                        <Input
                          type="datetime-local"
                          value={msaData[ctq]?.studyDateTime || ""}
                          onChange={(e) => updateMsaField(ctq, "studyDateTime", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Appraiser Names */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Appraiser 1 Name</label>
                        <Input
                          value={msaData[ctq]?.appraiser1Name || ""}
                          onChange={(e) => updateMsaField(ctq, "appraiser1Name", e.target.value)}
                          placeholder="Enter appraiser 1 name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Appraiser 2 Name</label>
                        <Input
                          value={msaData[ctq]?.appraiser2Name || ""}
                          onChange={(e) => updateMsaField(ctq, "appraiser2Name", e.target.value)}
                          placeholder="Enter appraiser 2 name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Appraiser 3 Name</label>
                        <Input
                          value={msaData[ctq]?.appraiser3Name || ""}
                          onChange={(e) => updateMsaField(ctq, "appraiser3Name", e.target.value)}
                          placeholder="Enter appraiser 3 name"
                        />
                      </div>
                    </div>

                    {/* Agreement Analysis Data Table */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold">Agreement Analysis Data (OK/KO)</h4>
                        <div className="space-x-2">
                          <Button
                            onClick={() => addAgreementAnalysisRow(ctq)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Row
                          </Button>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4 mr-2" />
                            Import Excel
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export Excel
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Unit #</TableHead>
                              <TableHead className="w-24">Reference (Standard)</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser1Name || "App 1"} Rep 1</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser1Name || "App 1"} Rep 2</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser1Name || "App 1"} Rep 3</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser2Name || "App 2"} Rep 1</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser2Name || "App 2"} Rep 2</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser2Name || "App 2"} Rep 3</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser3Name || "App 3"} Rep 1</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser3Name || "App 3"} Rep 2</TableHead>
                              <TableHead className="w-24">{msaData[ctq]?.appraiser3Name || "App 3"} Rep 3</TableHead>
                              <TableHead className="w-16">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(msaData[ctq]?.agreementAnalysisData || []).map((row, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{row.unitNumber}</TableCell>
                                <TableCell>
                                  <Select
                                    value={row.reference}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "reference", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app1_rep1}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app1_rep1", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app1_rep2}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app1_rep2", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app1_rep3}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app1_rep3", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app2_rep1}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app2_rep1", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app2_rep2}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app2_rep2", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app2_rep3}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app2_rep3", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app3_rep1}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app3_rep1", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app3_rep2}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app3_rep2", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.app3_rep3}
                                    onValueChange={(value: "OK" | "KO") => updateAgreementAnalysisRow(ctq, index, "app3_rep3", value)}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="OK">OK</SelectItem>
                                      <SelectItem value="KO">KO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() => removeAgreementAnalysisRow(ctq, index)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Traditional Gage R&R Interface
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Operators</label>
                      <Input
                        value={msaData[ctq]?.operators || ""}
                        onChange={(e) => updateMsaField(ctq, "operators", e.target.value)}
                        placeholder="e.g., Operator A, Operator B, Operator C"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Parts/Samples</label>
                      <Input
                        value={msaData[ctq]?.parts || ""}
                        onChange={(e) => updateMsaField(ctq, "parts", e.target.value)}
                        placeholder="e.g., Part 1, Part 2, Part 3"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Measurement Data</label>
                  <Textarea
                    value={msaData[ctq]?.measurements || ""}
                    onChange={(e) => updateMsaField(ctq, "measurements", e.target.value)}
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
                        value={msaData[ctq]?.repeatability || ""}
                        onChange={(e) => updateMsaField(ctq, "repeatability", e.target.value)}
                        placeholder="e.g., 15.2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Reproducibility (%)</label>
                      <Input
                        value={msaData[ctq]?.reproducibility || ""}
                        onChange={(e) => updateMsaField(ctq, "reproducibility", e.target.value)}
                        placeholder="e.g., 8.7"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Part-to-Part (%)</label>
                      <Input
                        value={msaData[ctq]?.partToPartVariation || ""}
                        onChange={(e) => updateMsaField(ctq, "partToPartVariation", e.target.value)}
                        placeholder="e.g., 89.3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Total Gage R&R (%)</label>
                      <Input
                        value={msaData[ctq]?.totalGageRR || ""}
                        onChange={(e) => updateMsaField(ctq, "totalGageRR", e.target.value)}
                        placeholder="e.g., 17.5"
                        className={
                          msaData[ctq]?.totalGageRR && parseFloat(msaData[ctq]?.totalGageRR) > 30
                            ? "border-red-500"
                            : msaData[ctq]?.totalGageRR && parseFloat(msaData[ctq]?.totalGageRR) <= 10
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
                    value={msaData[ctq]?.acceptableCriteria || ""}
                    onChange={(e) => updateMsaField(ctq, "acceptableCriteria", e.target.value)}
                    placeholder="Define the pass/fail criteria for this MSA study..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Conclusion</label>
                  <Textarea
                    value={msaData[ctq]?.conclusion || ""}
                    onChange={(e) => updateMsaField(ctq, "conclusion", e.target.value)}
                    placeholder="Summarize the MSA study results and measurement system acceptability..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Action Plan</label>
                  <Textarea
                    value={msaData[ctq]?.actionPlan || ""}
                    onChange={(e) => updateMsaField(ctq, "actionPlan", e.target.value)}
                    placeholder="Define actions needed to improve the measurement system if required..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveMsa(ctq)}
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