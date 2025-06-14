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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Save, Plus, Trash2, Calculator } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MSAStatisticsDisplay from "./MSAStatisticsDisplay";
import MSAContinuousStatisticsDisplay from "./MSAContinuousStatisticsDisplay";

// Interface for Attribute Agreement Analysis data (OK/KO values)
interface AttributeAnalysisRow {
  unitNumber: number;
  reference: "OK" | "KO" | "";
  app1_rep1: "OK" | "KO";
  app1_rep2: "OK" | "KO";
  app1_rep3: "OK" | "KO" | "";
  app2_rep1: "OK" | "KO";
  app2_rep2: "OK" | "KO";
  app2_rep3: "OK" | "KO" | "";
  app3_rep1: "OK" | "KO" | "";
  app3_rep2: "OK" | "KO" | "";
  app3_rep3: "OK" | "KO" | "";
}

// Interface for Continuous Gage R&R data (real numbers)
interface ContinuousAnalysisRow {
  unitNumber: number;
  app1_rep1: number;
  app1_rep2: number;
  app1_rep3: number;
  app2_rep1: number;
  app2_rep2: number;
  app2_rep3: number;
  app3_rep1: number;
  app3_rep2: number;
  app3_rep3: number;
}

interface AttributeMsaData {
  id?: number;
  ctq: string;
  unitAppraisedType: string;
  unitAppraisedTypeOther: string;
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  agreementAnalysisData: AttributeAnalysisRow[];
  studyDateTime: string;
  justification?: string;
}

interface ContinuousMsaData {
  id?: number;
  ctq: string;
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  gageRRData: ContinuousAnalysisRow[];
  sigmaMultiplier: number;
  tolerance?: number;
  repetitions: number; // 2 or 3 repetitions
  numberOfAppraisers: number; // 2 or 3 appraisers
  studyDateTime: string;
  justification?: string;
}

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface MsaAnalysisProps {
  projectId: number;
}

export default function MsaAnalysis({ projectId }: MsaAnalysisProps) {
  const { toast } = useToast();
  const [attributeMsaData, setAttributeMsaData] = useState<{ [ctq: string]: AttributeMsaData }>({});
  const [continuousMsaData, setContinuousMsaData] = useState<{ [ctq: string]: ContinuousMsaData }>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [showStatistics, setShowStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [showContinuousStatistics, setShowContinuousStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [hasCalculatedStatistics, setHasCalculatedStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [attributeAnalysisType, setAttributeAnalysisType] = useState<{ [ctq: string]: 'simple' | 'agreement' }>({});
  const [continuousAnalysisType, setContinuousAnalysisType] = useState<{ [ctq: string]: 'simple' | 'gage_rr' }>({});

  // Load last active tab and statistics state from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`msa-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }

    // Load saved statistics calculation state
    const savedStatsState = localStorage.getItem(`msa-calculated-stats-${projectId}`);
    if (savedStatsState) {
      try {
        const parsedState = JSON.parse(savedStatsState);
        setHasCalculatedStatistics(parsedState);
        // Show statistics for CTQs that have been calculated before
        setShowStatistics(parsedState);
      } catch (error) {
        console.warn("Failed to parse saved statistics state:", error);
      }
    }

    // Load saved attribute analysis type choices
    const savedAnalysisTypes = localStorage.getItem(`msa-analysis-types-${projectId}`);
    if (savedAnalysisTypes) {
      try {
        const parsedTypes = JSON.parse(savedAnalysisTypes);
        setAttributeAnalysisType(parsedTypes);
      } catch (error) {
        console.warn("Failed to parse saved analysis types:", error);
      }
    }

    // Load saved continuous analysis type choices
    const savedContinuousTypes = localStorage.getItem(`msa-continuous-types-${projectId}`);
    if (savedContinuousTypes) {
      try {
        const parsedTypes = JSON.parse(savedContinuousTypes);
        setContinuousAnalysisType(parsedTypes);
      } catch (error) {
        console.warn("Failed to parse saved continuous analysis types:", error);
      }
    }
  }, [projectId]);



  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`msa-active-tab-${projectId}`, tabValue);
  };

  // Function to toggle statistics visibility and mark as calculated
  const toggleStatistics = (ctq: string) => {
    const newShowState = !showStatistics[ctq];
    
    setShowStatistics(prev => ({
      ...prev,
      [ctq]: newShowState
    }));

    // If showing statistics, mark as calculated and persist
    if (newShowState) {
      const newCalculatedState = {
        ...hasCalculatedStatistics,
        [ctq]: true
      };
      setHasCalculatedStatistics(newCalculatedState);
      localStorage.setItem(`msa-calculated-stats-${projectId}`, JSON.stringify(newCalculatedState));
    }
  }

  const toggleContinuousStatistics = (ctq: string) => {
    setShowContinuousStatistics(prev => ({
      ...prev,
      [ctq]: !prev[ctq]
    }));
  };

  // Generate default attribute analysis data with 20 rows (all empty for real data entry)
  const generateDefaultAttributeData = (): AttributeAnalysisRow[] => {
    return Array.from({ length: 20 }, (_, index) => ({
      unitNumber: index + 1,
      reference: "" as const,
      app1_rep1: "OK" as "OK" | "KO",
      app1_rep2: "OK" as "OK" | "KO", 
      app1_rep3: "" as const,
      app2_rep1: "OK" as "OK" | "KO",
      app2_rep2: "OK" as "OK" | "KO",
      app2_rep3: "" as const,
      app3_rep1: "" as const,
      app3_rep2: "" as const,
      app3_rep3: "" as const,
    }));
  };

  // Generate default continuous analysis data with 10 rows
  const generateDefaultContinuousData = (): ContinuousAnalysisRow[] => {
    return Array.from({ length: 10 }, (_, index) => ({
      unitNumber: index + 1,
      app1_rep1: 0,
      app1_rep2: 0,
      app1_rep3: 0,
      app2_rep1: 0,
      app2_rep2: 0,
      app2_rep3: 0,
      app3_rep1: 0,
      app3_rep2: 0,
      app3_rep3: 0,
    }));
  };

  // Load CTQs with types from CTS characteristics
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load project data to get project type
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Load existing MSA data (both attribute and continuous)
  const { data: msaDataResponse, isLoading: msaLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/msa-analysis`],
    enabled: !!projectId,
  });

  // Set default active tab when CTQ list changes and no tab is selected
  useEffect(() => {
    const ctqList = getCtqsWithTypes();
    if (ctqList.length > 0) {
      const savedTab = localStorage.getItem(`msa-active-tab-${projectId}`);
      
      // Check if saved tab still exists in current CTQ list
      const savedTabExists = savedTab && ctqList.some(ctq => ctq.ctq === savedTab);
      
      if (savedTabExists && activeTab !== savedTab) {
        // Restore saved tab if it exists and is different from current
        setActiveTab(savedTab);
      } else if (!activeTab || !ctqList.some(ctq => ctq.ctq === activeTab)) {
        // Set first CTQ as default if no active tab or current tab doesn't exist
        const firstCtq = ctqList[0].ctq;
        setActiveTab(firstCtq);
        localStorage.setItem(`msa-active-tab-${projectId}`, firstCtq);
      }
    }
  }, [ctsData, msaDataResponse, projectId, activeTab]);

  // Save attribute MSA mutation
  const saveAttributeMsaMutation = useMutation({
    mutationFn: async (data: AttributeMsaData) => {
      const payload = {
        projectId,
        ...data,
        agreementAnalysisData: JSON.stringify(data.agreementAnalysisData),
        studyDateTime: data.studyDateTime || new Date().toISOString(),
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/attribute-msa/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/attribute-msa`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attribute MSA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/msa-analysis`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save attribute MSA analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save continuous MSA mutation
  const saveContinuousMsaMutation = useMutation({
    mutationFn: async (data: ContinuousMsaData) => {
      const payload = {
        projectId,
        ...data,
        gageRRData: JSON.stringify(data.gageRRData),
        studyDateTime: data.studyDateTime || new Date().toISOString(),
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/continuous-msa/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/continuous-msa`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Continuous MSA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/msa-analysis`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save continuous MSA analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

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

  // Initialize MSA data when CTQs and MSA data are loaded
  useEffect(() => {
    const ctqsWithTypes = getCtqsWithTypes();
    if (ctqsWithTypes.length > 0) {
      const initialAttributeData: { [ctq: string]: AttributeMsaData } = {};
      const initialContinuousData: { [ctq: string]: ContinuousMsaData } = {};
      
      ctqsWithTypes.forEach((ctqItem: CtqWithType) => {
        const { ctq, ctqType } = ctqItem;
        
        if (ctqType === "Attribute") {
          const existingMsa = msaDataResponse && (msaDataResponse as any)?.attributeMsa?.find((msa: any) => msa.ctq === ctq);
          
          initialAttributeData[ctq] = existingMsa ? {
            ...existingMsa,
            agreementAnalysisData: existingMsa.agreementAnalysisData ? 
              JSON.parse(existingMsa.agreementAnalysisData) : 
              generateDefaultAttributeData(),
          } : {
            ctq: ctq,
            unitAppraisedType: "Part",
            unitAppraisedTypeOther: "",
            appraiser1Name: "",
            appraiser2Name: "",
            appraiser3Name: "",
            agreementAnalysisData: generateDefaultAttributeData(),
            studyDateTime: new Date().toISOString(),
          };
        } else {
          const existingMsa = msaDataResponse && (msaDataResponse as any)?.continuousMsa?.find((msa: any) => msa.ctq === ctq);
          
          initialContinuousData[ctq] = existingMsa ? {
            ...existingMsa,
            gageRRData: existingMsa.gageRRData ? 
              (typeof existingMsa.gageRRData === 'string' ? 
                JSON.parse(existingMsa.gageRRData) : 
                existingMsa.gageRRData) : 
              generateDefaultContinuousData(),
            sigmaMultiplier: existingMsa.sigmaMultiplier || 6,
            tolerance: existingMsa.tolerance,
            repetitions: existingMsa.repetitions || 2,
            numberOfAppraisers: existingMsa.numberOfAppraisers || 2,
          } : {
            ctq: ctq,
            appraiser1Name: "",
            appraiser2Name: "",
            appraiser3Name: "",
            gageRRData: generateDefaultContinuousData(),
            sigmaMultiplier: 6,
            tolerance: undefined,
            repetitions: 2,
            numberOfAppraisers: 2,
            studyDateTime: new Date().toISOString(),
          };
        }
      });
      
      setAttributeMsaData(initialAttributeData);
      setContinuousMsaData(initialContinuousData);
      
      // Set first tab as active only if no tab is currently active
      if (ctqsWithTypes.length > 0 && !activeTab) {
        setActiveTab(ctqsWithTypes[0].ctq);
      }
    }
  }, [ctsData, msaDataResponse]);

  // Helper functions for attribute MSA
  const updateAttributeMsaField = (ctq: string, field: keyof AttributeMsaData, value: any) => {
    setAttributeMsaData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const updateAttributeAnalysisRow = (ctq: string, rowIndex: number, field: keyof AttributeAnalysisRow, value: "OK" | "KO" | "") => {
    setAttributeMsaData(prev => {
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

  const addAttributeAnalysisRow = (ctq: string) => {
    setAttributeMsaData(prev => {
      const currentData = prev[ctq]?.agreementAnalysisData || [];
      const newRow: AttributeAnalysisRow = {
        unitNumber: currentData.length + 1,
        reference: "",
        app1_rep1: "OK",
        app1_rep2: "OK",
        app1_rep3: "",
        app2_rep1: "OK",
        app2_rep2: "OK",
        app2_rep3: "",
        app3_rep1: "",
        app3_rep2: "",
        app3_rep3: "",
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

  const removeAttributeAnalysisRow = (ctq: string, rowIndex: number) => {
    setAttributeMsaData(prev => {
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

  // Helper functions for continuous MSA
  const updateContinuousMsaField = (ctq: string, field: keyof ContinuousMsaData, value: any) => {
    setContinuousMsaData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const updateContinuousAnalysisRow = (ctq: string, rowIndex: number, field: keyof ContinuousAnalysisRow, value: number) => {
    setContinuousMsaData(prev => {
      const updatedData = [...(prev[ctq]?.gageRRData || [])];
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
          gageRRData: updatedData,
        }
      };
    });
  };

  const addContinuousAnalysisRow = (ctq: string) => {
    setContinuousMsaData(prev => {
      const currentData = prev[ctq]?.gageRRData || [];
      const newRow: ContinuousAnalysisRow = {
        unitNumber: currentData.length + 1,
        app1_rep1: 0,
        app1_rep2: 0,
        app1_rep3: 0,
        app2_rep1: 0,
        app2_rep2: 0,
        app2_rep3: 0,
        app3_rep1: 0,
        app3_rep2: 0,
        app3_rep3: 0,
      };
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          gageRRData: [...currentData, newRow],
        }
      };
    });
  };

  const removeContinuousAnalysisRow = (ctq: string, rowIndex: number) => {
    setContinuousMsaData(prev => {
      const updatedData = [...(prev[ctq]?.gageRRData || [])];
      updatedData.splice(rowIndex, 1);
      
      // Renumber the remaining rows
      updatedData.forEach((row, index) => {
        row.unitNumber = index + 1;
      });
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          gageRRData: updatedData,
        }
      };
    });
  };

  const handleSaveAttributeMsa = (ctq: string) => {
    const data = attributeMsaData[ctq];
    if (data) {
      saveAttributeMsaMutation.mutate(data);
    }
  };

  const handleSaveContinuousMsa = (ctq: string) => {
    const data = continuousMsaData[ctq];
    if (data) {
      saveContinuousMsaMutation.mutate(data);
    }
  };

  {/*
    const getMsaStatusBadge = (ctq: string, ctqType: "Attribute" | "Continuous") => {
    if (ctqType === "Attribute") {
      const data = attributeMsaData[ctq];
      if (!data) return <Badge variant="secondary">No Data</Badge>;
      
      const hasBasicData = data.appraiser1Name && data.appraiser2Name && data.appraiser3Name;
      const hasData = data.agreementAnalysisData && data.agreementAnalysisData.length > 0;
      
      if (hasBasicData && hasData) {
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      } else if (hasBasicData) {
        return <Badge variant="outline">In Progress</Badge>;
      } else {
        return <Badge variant="secondary">Not Started</Badge>;
      }
    } else {
      const data = continuousMsaData[ctq];
      if (!data) return <Badge variant="secondary">No Data</Badge>;
      
      const hasBasicData = data.appraiser1Name && data.appraiser2Name && data.appraiser3Name;
      const hasData = data.gageRRData && data.gageRRData.length > 0;
      
      if (hasBasicData && hasData) {
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      } else if (hasBasicData) {
        return <Badge variant="outline">In Progress</Badge>;
      } else {
        return <Badge variant="secondary">Not Started</Badge>;
      }
    }
  };
  */}

  if (ctsLoading || msaLoading || projectLoading) {
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

  const ctqList = getCtqsWithTypes();
  
  // Get project type from project data
  const projectType = (projectData as any)?.project?.projectType;
  const isSimplifiedView = projectType === "Yellow Belt" || projectType === "White Belt";

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
          Automatic MSA type selection based on CTQ type: Attribute Agreement Analysis for Attribute CTQs, Gage R&R for Continuous CTQs
        </p>
      </CardHeader>
      <CardContent>
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
              {ctqList.map((ctqItem: CtqWithType) => (
                <TabsTrigger 
                  key={ctqItem.ctq} 
                  value={ctqItem.ctq}
                  className="px-4 py-2 min-w-max flex flex-col items-cente border border-gray-200 data-[state=active]:border-none"
                >
                  <span className="font-medium truncate min-w-[150px]">{ctqItem.ctq}</span>
                  <span className="text-xs text-gray-600">{ctqItem.ctqType}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {ctqList.map((ctqItem: CtqWithType) => (
            <TabsContent key={ctqItem.ctq} value={ctqItem.ctq} className="mt-0 border border-gray-200 rounded-lg p-4" >
              {ctqItem.ctqType === "Attribute" ? (
                // Attribute MSA Analysis Interface with Choice Selector
                <div className="space-y-4">
                  {/* Analysis Type Selector - Only for Green Belt and Black Belt */}
                  {!isSimplifiedView && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3">Select Analysis Type:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`analysis-type-${ctqItem.ctq}`}
                            value="simple"
                            checked={attributeAnalysisType[ctqItem.ctq] === 'simple' || !attributeAnalysisType[ctqItem.ctq]}
                            onChange={() => {
                              const newTypes = { ...attributeAnalysisType, [ctqItem.ctq]: 'simple' as const };
                              setAttributeAnalysisType(newTypes);
                              localStorage.setItem(`msa-analysis-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Measurement System Simplified Analysis</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`analysis-type-${ctqItem.ctq}`}
                            value="agreement"
                            checked={attributeAnalysisType[ctqItem.ctq] === 'agreement'}
                            onChange={() => {
                              const newTypes = { ...attributeAnalysisType, [ctqItem.ctq]: 'agreement' as const };
                              setAttributeAnalysisType(newTypes);
                              localStorage.setItem(`msa-analysis-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Attribute Agreement Analysis</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Simplified Analysis Card - Always show for simplified view or when simple is selected */}
                  {(isSimplifiedView || attributeAnalysisType[ctqItem.ctq] === 'simple' || !attributeAnalysisType[ctqItem.ctq]) && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Measurement System Simplified Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . Please justify the correctness of your Measurement System for the CTQ here.<br></br>
                          . Your Measurement System must be Precise and Accurate and your measurements Reliable.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Measurement System Precision & Accuracy justification</label>
                          <Textarea
                            value={attributeMsaData[ctqItem.ctq]?.justification || ""}
                            onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "justification", e.target.value)}
                            className="w-full flex min-h-[150px]"
                            placeholder="Enter explanations to justify why the Measurement System is Precise and Accurate?

 . Precision: Explain why the measurement system is precise?
 . Accuracy: Explain why the measurement system is accurate?"
                            title="Are your data reliable? Can anyone measure the same thing and get the same result (Precision)? Does your data represents the true value or are they biased (Accuracy)? Please justify here."
                          />
                        </div>
                      </div>
                      {/* Save MSA Button */}
                      <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                        disabled={saveAttributeMsaMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        >
                        {saveAttributeMsaMutation.isPending ? "Saving..." : "Save MSA"}
                      </Button>
                      </div>
                    </>
                  )}

                  {/* Attribute Agreement Analysis Content - Only for Green Belt and Black Belt */}
                  {!isSimplifiedView && attributeAnalysisType[ctqItem.ctq] === 'agreement' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Attribute Agreement Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Complete statistical analysis of measurement system agreement between appraisers for attribute data.
                        </p>
                      </div>

                  {!isSimplifiedView && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Attribute Agreement Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . For Attribute CTQs, we perform Agreement Analysis studying both Accuracy (Agreement vs a Standard) if a standard exists and Precision (Agreement R&R), using OK/KO evaluations.<br></br>
                          . It is still possible to perform an Agreement Analysis without a standard. In this case, it will be a Precision Agreement Analysis.<br></br>
                          . A minimum of two Appraisers with two repetitions each is mandatory to calculate the statistics.<br></br>
                          . It is recommended to have a minimum of 100 data in your study and a balanced table (equal number of appraisals for each unit) for a significant Analysis.<br></br>
                          .  We also recommend having the same number of OKs and KOs in your Reference if there is a Reference (Standard) in your study.
                        </p>
                      </div>

                      {/* Appraised unit type and Study Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                      <label className="block text-sm font-medium mb-2">Appraised unit type</label>
                      <Select
                        value={attributeMsaData[ctqItem.ctq]?.unitAppraisedType || "Part"}
                        onValueChange={(value) => updateAttributeMsaField(ctqItem.ctq, "unitAppraisedType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Part">Part</SelectItem>
                          <SelectItem value="Unit">Unit</SelectItem>
                          <SelectItem value="File">File</SelectItem>
                          <SelectItem value="Document">Document</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {attributeMsaData[ctqItem.ctq]?.unitAppraisedType === "Other" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Other - Please specify</label>
                        <Input
                          value={attributeMsaData[ctqItem.ctq]?.unitAppraisedTypeOther || ""}
                          onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "unitAppraisedTypeOther", e.target.value)}
                          placeholder="Specify the type of unit being appraised"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Study Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={attributeMsaData[ctqItem.ctq]?.studyDateTime?.slice(0, 16) || new Date().toISOString().slice(0, 16)}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "studyDateTime", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Appraiser Names */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 1 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser1Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser1Name", e.target.value)}
                        placeholder="Enter appraiser 1 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 2 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser2Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser2Name", e.target.value)}
                        placeholder="Enter appraiser 2 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 3 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser3Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser3Name", e.target.value)}
                        placeholder="Enter appraiser 3 name"
                      />
                    </div>
                  </div>

                  {/* Agreement Analysis Data Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-semibold">Agreement Analysis Data (OK/KO)</h4>
                    </div>
                    {/* Scroll indicator */}
                    <div className="relative">
                     <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                     ← Scroll horizontally →
                     </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg pt-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">
                              {attributeMsaData[ctqItem.ctq]?.unitAppraisedType === "Other" 
                                ? (attributeMsaData[ctqItem.ctq]?.unitAppraisedTypeOther || "Unit") + " #"
                                : (attributeMsaData[ctqItem.ctq]?.unitAppraisedType || "Unit") + " #"}
                            </TableHead>
                            <TableHead className="w-24">Reference<br></br>(Standard)</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(attributeMsaData[ctqItem.ctq]?.agreementAnalysisData || []).map((row, index) => {
                            // Check for disagreement in the row
                            const nonBlankValues = Object.keys(row)
                              .filter(key => key !== 'unitNumber' && row[key as keyof AttributeAnalysisRow] !== "")
                              .map(key => row[key as keyof AttributeAnalysisRow]);
                            
                            const hasDisagreement = nonBlankValues.length > 1 && 
                              !nonBlankValues.every(val => val === nonBlankValues[0]);
                            
                            const hasReference = row.reference !== "";
                            
                            return (
                              <TableRow 
                                key={index} 
                                className={hasDisagreement ? "bg-red-200" : ""}
                              >
                                <TableCell className="font-medium">{row.unitNumber}</TableCell>
                                {Object.keys(row).filter(key => key !== 'unitNumber').map((field) => {
                                const isBlankAllowed = field === 'reference' || field.includes('rep3') || field.includes('app3');
                                const fieldValue = row[field as keyof AttributeAnalysisRow] as string;
                                const selectValue = fieldValue === "" ? "blank" : fieldValue;
                                
                                // Determine styling based on disagreement conditions
                                let cellStyling = "";
                                let triggerStyling = "";
                                
                                if (hasDisagreement) {
                                  if (!hasReference) {
                                    // No reference available - bold and white text for all non-blank cells
                                    if (fieldValue !== "") {
                                      cellStyling = "font-bold";
                                      triggerStyling = "font-bold bg-transparent";
                                    }
                                  } else {
                                    // Reference available - white text for all cells, bold for disagreeing cells
                                    cellStyling = "";
                                    triggerStyling = "bg-transparent";
                                    
                                    if (fieldValue !== "" && fieldValue !== row.reference) {
                                      cellStyling += " font-bold";
                                      triggerStyling += " font-bold";
                                    }
                                  }
                                }
                                
                                return (
                                  <TableCell key={field} className={cellStyling}>
                                    <Select
                                      value={selectValue}
                                      onValueChange={(value: string) => {
                                        const actualValue = value === "blank" ? "" : value;
                                        updateAttributeAnalysisRow(ctqItem.ctq, index, field as keyof AttributeAnalysisRow, actualValue as "OK" | "KO" | "");
                                      }}
                                    >
                                      <SelectTrigger className={"w-20 " + triggerStyling}>
                                        <SelectValue placeholder="--" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {isBlankAllowed && <SelectItem value="blank">--</SelectItem>}
                                        <SelectItem value="OK">OK</SelectItem>
                                        <SelectItem value="KO">KO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                );
                                })}
                                <TableCell>
                                  <Button
                                    onClick={() => removeAttributeAnalysisRow(ctqItem.ctq, index)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    {/* <Trash2 className="h-4 w-4" /> */}
                                    <i className="fas fa-trash h-4 w-4"></i>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {/* Scroll indicator */}
                    <div className="relative">
                     <div className="absolute bottom-[-14px] right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                     ← Scroll horizontally →
                     </div>
                    </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addAttributeAnalysisRow(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                      <Button
                        onClick={() => toggleStatistics(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Calculator className="h-4 w-4" />
                        {showStatistics[ctqItem.ctq] ? "Hide Statistics" : "Calculate Statistics"}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                      disabled={saveAttributeMsaMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveAttributeMsaMutation.isPending ? "Saving..." : "Save Attribute MSA Study"}
                    </Button>
                  </div>

                      {/* Statistics Display */}
                      {showStatistics[ctqItem.ctq] && attributeMsaData[ctqItem.ctq]?.agreementAnalysisData && (
                        <div>
                          <div className="mt-6">
                          <MSAStatisticsDisplay
                            data={attributeMsaData[ctqItem.ctq].agreementAnalysisData}
                            appraiser1Name={attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"}
                            appraiser2Name={attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"}
                            appraiser3Name={attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"}
                          />
                        </div>
                        <div className="flex justify-end mt-1">
                        <Button
                          onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                          disabled={saveAttributeMsaMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                        <Save className="h-4 w-4 mr-2" />
                       {saveAttributeMsaMutation.isPending ? "Saving..." : "Save Attribute MSA Study"}
                        </Button>
                        </div>
                      </div>
                      )}
                      
                    </>
                  )}
                    </div>
                  )}

                </div>
              ) : (
                // Continuous MSA Analysis Interface with Choice Selector
                <div className="space-y-4">
                  {/* Analysis Type Selector - Only for Green Belt and Black Belt */}
                  {!isSimplifiedView && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3">Select Analysis Type:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`continuous-analysis-type-${ctqItem.ctq}`}
                            value="simple"
                            checked={continuousAnalysisType[ctqItem.ctq] === 'simple' || !continuousAnalysisType[ctqItem.ctq]}
                            onChange={() => {
                              const newTypes = { ...continuousAnalysisType, [ctqItem.ctq]: 'simple' as const };
                              setContinuousAnalysisType(newTypes);
                              localStorage.setItem(`msa-continuous-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Measurement System Simplified Analysis</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`continuous-analysis-type-${ctqItem.ctq}`}
                            value="gage_rr"
                            checked={continuousAnalysisType[ctqItem.ctq] === 'gage_rr'}
                            onChange={() => {
                              const newTypes = { ...continuousAnalysisType, [ctqItem.ctq]: 'gage_rr' as const };
                              setContinuousAnalysisType(newTypes);
                              localStorage.setItem(`msa-continuous-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Gage R&R MSA Analysis</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Simplified Analysis Card - Always show for simplified view or when simple is selected */}
                  {(isSimplifiedView || continuousAnalysisType[ctqItem.ctq] === 'simple' || !continuousAnalysisType[ctqItem.ctq]) && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Measurement System Simplified Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . Please justify the correctness of your Measurement System for the CTQ here.<br></br>
                          . Your Measurement System must be Precise and Accurate and your measurements Reliable.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Measurement System Precision & Accuracy justification</label>
                          <Textarea
                            value={continuousMsaData[ctqItem.ctq]?.justification || ""}
                            onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "justification", e.target.value)}
                            className="w-full flex min-h-[150px]"
                            placeholder="Enter explanations to justify why the Measurement System is Precise and Accurate?

 . Precision: Explain why the measurement system is precise?
 . Accuracy: Explain why the measurement system is accurate?"
                            title="Are your data reliable? Can anyone measure the same thing and get the same result (Precision)? Does your data represents the true value or are they biased (Accuracy)? Please justify here."
                          />
                        </div>
                      </div>
                      {/* Save MSA Button */}
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => handleSaveContinuousMsa(ctqItem.ctq)}
                          disabled={saveContinuousMsaMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                        {saveContinuousMsaMutation.isPending ? "Saving..." : "Save MSA"}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Gage R&R Analysis Content - Only for Green Belt and Black Belt */}
                  {!isSimplifiedView && continuousAnalysisType[ctqItem.ctq] === 'gage_rr' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Gage R&R MSA Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Complete statistical analysis of measurement system repeatability and reproducibility for continuous data.
                        </p>
                      </div>

                  {/* Study Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of appraisers</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.numberOfAppraisers?.toString() || "2"}
                        onValueChange={(value) => {
                          const newAppraisers = parseInt(value);
                          updateContinuousMsaField(ctqItem.ctq, 'numberOfAppraisers', newAppraisers);
                          
                          // If changing to 2 appraisers, null all Appraiser 3 values
                          if (newAppraisers === 2) {
                            updateContinuousMsaField(ctqItem.ctq, 'appraiser3Name', '');
                            
                            const updatedData = continuousMsaData[ctqItem.ctq]?.gageRRData.map(row => ({
                              ...row,
                              app3_rep1: 0,
                              app3_rep2: 0,
                              app3_rep3: 0
                            })) || [];
                            
                            setContinuousMsaData(prev => ({
                              ...prev,
                              [ctqItem.ctq]: {
                                ...prev[ctqItem.ctq],
                                gageRRData: updatedData
                              }
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select appraisers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of repetitions</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.repetitions?.toString() || "2"}
                        onValueChange={(value) => {
                          const newRepetitions = parseInt(value);
                          updateContinuousMsaField(ctqItem.ctq, 'repetitions', newRepetitions);
                          
                          // If changing to 2 repetitions, null all third repetitions
                          if (newRepetitions === 2) {
                            const updatedData = continuousMsaData[ctqItem.ctq]?.gageRRData.map(row => ({
                              ...row,
                              app1_rep3: 0,
                              app2_rep3: 0,
                              app3_rep3: 0
                            })) || [];
                            
                            setContinuousMsaData(prev => ({
                              ...prev,
                              [ctqItem.ctq]: {
                                ...prev[ctqItem.ctq],
                                gageRRData: updatedData
                              }
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select repetitions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nb of sigma used</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.sigmaMultiplier?.toString() || "6"}
                        onValueChange={(value) => updateContinuousMsaField(ctqItem.ctq, 'sigmaMultiplier', parseFloat(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sigma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="5.15">5.15</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tolerance (optional)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter tolerance"
                        value={continuousMsaData[ctqItem.ctq]?.tolerance || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, 'tolerance', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Study Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={continuousMsaData[ctqItem.ctq]?.studyDateTime?.slice(0, 16) || new Date().toISOString().slice(0, 16)}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "studyDateTime", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Appraiser Names */}
                  <div className={`grid grid-cols-1 gap-4 ${(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 1 Name</label>
                      <Input
                        value={continuousMsaData[ctqItem.ctq]?.appraiser1Name || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser1Name", e.target.value)}
                        placeholder="Enter appraiser 1 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 2 Name</label>
                      <Input
                        value={continuousMsaData[ctqItem.ctq]?.appraiser2Name || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser2Name", e.target.value)}
                        placeholder="Enter appraiser 2 name"
                      />
                    </div>
                    {(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Appraiser 3 Name</label>
                        <Input
                          value={continuousMsaData[ctqItem.ctq]?.appraiser3Name || ""}
                          onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser3Name", e.target.value)}
                          placeholder="Enter appraiser 3 name"
                        />
                      </div>
                    )}
                  </div>

                  {/* Gage R&R Data Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-semibold">Gage R&R Measurement Data</h4>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Unit #</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 2</TableHead>
                            {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                              <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 3</TableHead>
                            )}
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 2</TableHead>
                            {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                              <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 3</TableHead>
                            )}
                            {(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 && (
                              <>
                                <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 1</TableHead>
                                <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 2</TableHead>
                                {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                                  <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 3</TableHead>
                                )}
                              </>
                            )}
                            <TableHead className="w-16">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(continuousMsaData[ctqItem.ctq]?.gageRRData || []).map((row, index) => {
                            const repetitions = continuousMsaData[ctqItem.ctq]?.repetitions || 2;
                            const numberOfAppraisers = continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2;
                            const fields = ['app1_rep1', 'app1_rep2'];
                            if (repetitions === 3) fields.push('app1_rep3');
                            fields.push('app2_rep1', 'app2_rep2');
                            if (repetitions === 3) fields.push('app2_rep3');
                            if (numberOfAppraisers === 3) {
                              fields.push('app3_rep1', 'app3_rep2');
                              if (repetitions === 3) fields.push('app3_rep3');
                            }
                            
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{row.unitNumber}</TableCell>
                                {fields.map((field) => (
                                  <TableCell key={field}>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row[field as keyof ContinuousAnalysisRow] as number}
                                      onChange={(e) => updateContinuousAnalysisRow(ctqItem.ctq, index, field as keyof ContinuousAnalysisRow, parseFloat(e.target.value) || 0)}
                                      className="w-20"
                                      disabled={(repetitions === 2 && field.includes('_rep3')) || (numberOfAppraisers === 2 && field.includes('app3_'))}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <Button
                                    onClick={() => removeContinuousAnalysisRow(ctqItem.ctq, index)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                      <Button
                        onClick={() => addContinuousAnalysisRow(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleContinuousStatistics(ctqItem.ctq)}
                          variant="secondary"
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {showContinuousStatistics[ctqItem.ctq] ? "Hide Statistics" : "Show Statistics"}
                        </Button>
                        <Button
                          onClick={() => handleSaveContinuousMsa(ctqItem.ctq)}
                          disabled={saveContinuousMsaMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saveContinuousMsaMutation.isPending ? "Saving..." : "Save Gage R&R MSA Study"}
                        </Button>
                      </div>
                  </div>

                  {/* Statistics Display for Continuous MSA */}
                  {showContinuousStatistics[ctqItem.ctq] && continuousMsaData[ctqItem.ctq] && continuousMsaData[ctqItem.ctq].gageRRData.length > 0 && (
                    <div className="mt-6">
                      <MSAContinuousStatisticsDisplay
                        data={continuousMsaData[ctqItem.ctq].gageRRData}
                        appraiser1Name={continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"}
                        appraiser2Name={continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"}
                        appraiser3Name={continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"}
                        sigmaMultiplier={continuousMsaData[ctqItem.ctq]?.sigmaMultiplier || 6}
                        tolerance={continuousMsaData[ctqItem.ctq]?.tolerance}
                        repetitions={continuousMsaData[ctqItem.ctq]?.repetitions || 2}
                        numberOfAppraisers={continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2}
                      />
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}