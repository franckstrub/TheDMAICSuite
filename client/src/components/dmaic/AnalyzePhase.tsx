import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getParetoData } from "@/lib/statisticsUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart, ScatterChart, Scatter, ZAxis } from "recharts";
import MilestoneTimeline from "./MilestoneTimeline";
import { GitBranch, BarChart3, Save, Plus, Trash2, Calculator, Undo2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RootCauseAnalysis from "./RootCauseAnalysis";
import AttributeCTQAnalysis from "./AttributeCTQAnalysis";
import ContinuousCTQAnalysis from "./ContinuousCTQAnalysis";
import AnalyzeGateReviewValidation from "./AnalyzeGateReviewValidation";
import FishboneIcon from '@/assets/fishboneicon.svg';

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
  ctqId: number;
}

export default function AnalyzePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    measurePhaseDate: null as string | null,
    analyzePhaseDate: null as string | null,
  });

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });
  
  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter?.charter) {
      setMilestoneDates({
        measurePhaseDate: charter.charter.measure_phase_date || null,
        analyzePhaseDate: charter.charter.analyze_phase_date || null,
      });
    }
  }, [charter]);

  

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
    

  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous",
        ctqId: item.id
      }));
    }
    return [];
  };

  // Get project type from project data
  const projectType = (projectData as any)?.project?.projectType;
  const isSimplifiedView = projectType === "Yellow Belt" || projectType === "White Belt";

  const [activeTab, setActiveTab] = useState<string>("");
  
  const ctqList = getCtqsWithTypes();
  
  // Ensure we have an active tab when CTQs are available using useEffect
  useEffect(() => {
    if (!activeTab && ctqList.length > 0) {
      const firstCtq = ctqList[0].ctq;
      setActiveTab(firstCtq);
    }
  }, [activeTab, ctqList]);
  
  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Root Cause Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create Root Cause Analysis.
          </div>
        </CardContent>
      </Card>
    );
  }
  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
  setActiveTab(tabValue);
  localStorage.setItem(`analyze-active-tab-${projectId}`, tabValue);
  };

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.measurePhaseDate}
              endDate={milestoneDates.analyzePhaseDate}
              label="Analyze Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>
      {/* Cause & Effect Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
                <img 
                  src={FishboneIcon} 
                  alt="Fishbone Diagram icon" 
                  width={60} 
                  height={30}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
            Cause & Effect Analysis
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            One Cause & Effect Analysis per CTQ defined in MEASURE, in CTS Characteristics table
          </p>          
        </CardHeader>
        <CardContent>
          {/* Only show scroll indicator if 6+ CTQs exist */}
          {ctqList.length >= 6 && (
          <div className="relative">
            <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
            ← Scroll horizontally →
            </div>
          </div>
          )}
          {/* One tab per CTQ */}
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
                {/* Render tab content separately */}
                {ctqList.map((ctqItem: CtqWithType) => (
                  <TabsContent key={ctqItem.ctq} value={ctqItem.ctq}>
                    {/* CTQ CARD: Common Attribute & Continuous content */}
                    {/* 6M's Fishbone diagram - Ishikawa diagram - Cause Effect Analysis + 5 Whys + Prioritization- */}
                    <RootCauseAnalysis projectId={projectId} ctqId={ctqItem.ctqId} ctqName={ctqItem.ctq} />
                    
                    {ctqItem.ctqType === 'Attribute' ? (                    
                      <AttributeCTQAnalysis projectId={projectId} ctqId={ctqItem.ctqId} ctqName={ctqItem.ctq}  />
                    ) : (                        
                      <ContinuousCTQAnalysis projectId={projectId}  ctqId={ctqItem.ctqId} ctqName={ctqItem.ctq} />                      
                    )}
                  </TabsContent>
                ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
      <AnalyzeGateReviewValidation projectId={projectId} />
    </div>
  );
}
