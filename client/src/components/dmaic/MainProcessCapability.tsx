
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import ContinuousProcessCapability from "./ContinuousProcessCapability";
import AttributeProcessCapability from "./AttributeProcessCapability";

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface MainProcessCapabilityProps {
  projectId: number;
}

export default function MainProcessCapability({ projectId }: MainProcessCapabilityProps) {
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

  if (ctqsLoading) {
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

  const ctqList = getCtqsWithTypes();

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

  // Auto-set active tab if not set
  useEffect(() => {
    if (ctqList.length > 0 && !activeTab) {
      const savedTab = localStorage.getItem(`process-capability-active-tab-${projectId}`);
      const ctqNames = ctqList.map(c => c.ctq);
      if (savedTab && ctqNames.includes(savedTab)) {
        setActiveTab(savedTab);
      } else {
        setActiveTab(ctqList[0].ctq);
      }
    }
  }, [ctqList, activeTab, projectId]);

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
              {ctqList.map((ctqWithType: CtqWithType) => (
                <TabsTrigger 
                  key={ctqWithType.ctq} 
                  value={ctqWithType.ctq}
                  className="px-4 py-2 min-w-max flex flex-col items-center border border-gray-200 data-[state=active]:border-none"
                >
                  <span className="font-medium truncate min-w-[150px]">{ctqWithType.ctq}</span>
                  <span className="text-xs text-gray-600">{ctqWithType.ctqType}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {ctqList.map((ctqWithType: CtqWithType) => (
            <TabsContent key={ctqWithType.ctq} value={ctqWithType.ctq} className="mt-6">
              {ctqWithType.ctqType === "Continuous" ? (
                <ContinuousProcessCapability 
                  projectId={projectId} 
                  ctq={ctqWithType.ctq}
                  ctsData={ctsData}
                />
              ) : (
                <AttributeProcessCapability 
                  projectId={projectId} 
                  ctq={ctqWithType.ctq}
                  ctsData={ctsData}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
