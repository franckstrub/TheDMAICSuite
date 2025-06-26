import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import ContinuousProcessCapability from "./ContinuousProcessCapability";
import AttributeProcessCapability from "./AttributeProcessCapability";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  lsl: string;
  usl: string;
  target: string;
  zShift: number;
  dataSetTerm: "Long Term" | "Short Term";
  capabilityIndex: "Z" | "Cp/Cpk";
  showPercentage: boolean;
  showZ: boolean;
  showStatistics: boolean;
  capabilityAssessment?: string;
  enableNonConformity?: boolean;
  enableDpmo?: boolean;
  enableRty?: boolean;
  enableOee?: boolean;
  enablePareto?: boolean;
  nonConformityUnits?: number;
  totalUnits?: number;
  dpmoDefects?: number;
  dpmoUnits?: number;
  dpmoOpportunitiesPerUnit?: number;
  rtyProcessSteps?: Array<{stepName: string; passed: number; total: number}>;
  oeeScheduledTime?: number;
  oeeAvailableTime?: number;
  oeeNominalCapacity?: number;
  oeePartsManufactured?: number;
  oeeBadParts?: number;
  paretoDefectCategories?: Array<{category: string; count: number}>;
}

interface CtqWithType {
  ctq: string;
  ctqType: "Continuous" | "Attribute";
}

interface ProcessCapabilityProps {
  projectId: string | number;
}

export default function MainProcessCapability({ projectId }: ProcessCapabilityProps) {
  const [capabilityData, setCapabilityData] = useState<{ [ctq: string]: ProcessCapabilityData }>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [showStatistics, setShowStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [isStatisticsLoaded, setIsStatisticsLoaded] = useState(false);
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  // Load last active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }
    setHasInitializedTab(false);
  }, [projectId]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`process-capability-active-tab-${projectId}`, tabValue);
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

  // Load existing Process Capability data
  const { data: capabilityDataResponse, isLoading: capabilityLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/process-capability`],
    enabled: !!projectId,
  });

  // Get CTQs with their types
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (!ctqsData || !Array.isArray((ctqsData as any)?.ctqs)) return [];
    
    return (ctqsData as any).ctqs.map((ctqData: any) => ({
      ctq: ctqData.ctq,
      ctqType: ctqData.ctqType || "Continuous"
    }));
  };

  // Initialize Process Capability data when CTQs and capability data are loaded
  useEffect(() => {
    const ctqs = getCtqsWithTypes();
    if (ctqs.length > 0) {
      const initialData: { [ctq: string]: ProcessCapabilityData } = {};
      const statisticsStates: { [ctq: string]: boolean } = {};
      
      ctqs.forEach((ctqWithType: CtqWithType) => {
        const ctq = ctqWithType.ctq;
        const existingCapability = (capabilityDataResponse as any)?.processCapability?.find((cap: any) => cap.ctq === ctq);
        const ctsChar = (ctsData as any)?.characteristics?.find((char: any) => char.ctq === ctq);
        
        initialData[ctq] = existingCapability ? {
          ...existingCapability,
          capabilityAssessment: existingCapability.capabilityAssessment || "",
          enableNonConformity: existingCapability.enableNonConformity || false,
          enableDpmo: existingCapability.enableDpmo || false,
          enableRty: existingCapability.enableRty || false,
          enableOee: existingCapability.enableOee || false,
          enablePareto: existingCapability.enablePareto || false,
        } : {
          ctq: ctq,
          lsl: ctsChar?.lsl || "",
          usl: ctsChar?.usl || "",
          target: ctsChar?.target || "",
          zShift: 1.5,
          dataSetTerm: "Long Term" as const,
          capabilityIndex: "Z" as const,
          showPercentage: false,
          showZ: false,
          showStatistics: false,
          capabilityAssessment: "",
          enableNonConformity: false,
          enableDpmo: false,
          enableRty: false,
          enableOee: false,
          enablePareto: false,
        };
        
        statisticsStates[ctq] = existingCapability?.showStatistics || false;
      });
      
      setCapabilityData(initialData);
      setShowStatistics(statisticsStates);
      setIsStatisticsLoaded(true);
      
      // Set first tab as active if no tab is saved and we haven't initialized yet
      if (!activeTab && !hasInitializedTab && ctqs.length > 0) {
        const firstCtq = ctqs[0].ctq;
        setActiveTab(firstCtq);
        localStorage.setItem(`process-capability-active-tab-${projectId}`, firstCtq);
        setHasInitializedTab(true);
      }
    }
  }, [ctqsData, capabilityDataResponse, ctsData, activeTab, hasInitializedTab]);

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

  const ctqs = getCtqsWithTypes();

  if (ctqs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Process Capability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No CTQs found for this project.</p>
            <p className="text-sm text-gray-500">
              Add CTQs in the CTS Characteristics section to start capability analysis.
            </p>
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
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-auto gap-1 h-auto p-1" style={{ gridTemplateColumns: `repeat(${ctqs.length}, minmax(0, 1fr))` }}>
            {ctqs.map((ctqWithType) => (
              <TabsTrigger key={ctqWithType.ctq} value={ctqWithType.ctq} className="text-xs px-2 py-1">
                {ctqWithType.ctq}
              </TabsTrigger>
            ))}
          </TabsList>

          {ctqs.map((ctqWithType) => (
            <TabsContent key={ctqWithType.ctq} value={ctqWithType.ctq} className="mt-4">
              {ctqWithType.ctqType === "Continuous" ? (
                <ContinuousProcessCapability
                  projectId={projectId}
                  ctq={ctqWithType.ctq}
                  ctqType={ctqWithType.ctqType}
                  capabilityData={capabilityData}
                  setCapabilityData={setCapabilityData}
                  showStatistics={showStatistics}
                  setShowStatistics={setShowStatistics}
                  isStatisticsLoaded={isStatisticsLoaded}
                />
              ) : (
                <AttributeProcessCapability
                  projectId={projectId}
                  ctq={ctqWithType.ctq}
                  ctqType={ctqWithType.ctqType}
                  capabilityData={capabilityData}
                  setCapabilityData={setCapabilityData}
                  showStatistics={showStatistics}
                  setShowStatistics={setShowStatistics}
                  isStatisticsLoaded={isStatisticsLoaded}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}