import { useState, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HypothesisTestingTabsProps {
  projectId: number;
  ctqId: number;
  testType: string;
  setupContent: ReactNode;
  dataContent: ReactNode;
  chartContent: ReactNode;
  analysisContent: ReactNode;
}

export function HypothesisTestingTabs({
  projectId,
  ctqId,
  testType,
  setupContent,
  dataContent,
  chartContent,
  analysisContent,
}: HypothesisTestingTabsProps) {
  // Persistent tab state using localStorage
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const saved = localStorage.getItem(`hypTestTab_${projectId}_${ctqId}_${testType}`);
    return saved || "setup";
  });

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    localStorage.setItem(`hypTestTab_${projectId}_${ctqId}_${testType}`, value);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
        <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
        <TabsTrigger value="chart" data-testid="tab-chart">Chart</TabsTrigger>
        <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="setup" className="space-y-4">
        {setupContent}
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        {dataContent}
      </TabsContent>

      <TabsContent value="chart" className="space-y-4">
        {chartContent}
      </TabsContent>

      <TabsContent value="analysis" className="space-y-4">
        {analysisContent}
      </TabsContent>
    </Tabs>
  );
}
