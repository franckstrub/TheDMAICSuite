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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MilestoneTimeline from "./MilestoneTimeline";
import { BarChart3, Save, Plus, Trash2, Calculator, Undo2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImproveGateReviewValidation from '@/components/dmaic/ImproveGateReviewValidation';

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface Charter {
  id: number;
  projectId: number;
  projectTitle?: string;
  projectType?: string;
  projectLeader?: string;
  sponsor?: string;
  financialController?: string;
  projectCoach?: string;
  analyze_phase_date?: string | null;
  improve_phase_date?: string | null;
}

interface CharterResponse {
  charter: Charter;
}

export default function ImprovePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    analyzePhaseDate: null as string | null,
    improvePhaseDate: null as string | null,
  });

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery<CharterResponse>({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });
  
  // Get project type from charter
  const projectType = charter?.charter?.projectType || 'Green Belt';

  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter?.charter) {
      setMilestoneDates({
        analyzePhaseDate: charter.charter.analyze_phase_date || null,
        improvePhaseDate: charter.charter.improve_phase_date || null,
      });
    }
  }, [charter]);

  // Solution Generation
  
  //Benefit-Effort Matrix (for Green Belt and Black Belt projects only)

  //Improvement Action Designs (one by one)

  //Implementation plan including eventually Pilot plan

  // CTQ by CTQ proof of improvement (with statistical hypothesis tests - for Green Belt and Black Belt projects only)
  

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.analyzePhaseDate}
              endDate={milestoneDates.improvePhaseDate}
              label="Improve Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>
      
      {/* Solution Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Solution Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Generate potential solutions for each considered critical root cause.
          </p>         
        </CardContent>
      </Card>

      {/* Benefit-Effort Matrix (for Green Belt and Black Belt projects only) */}
      {(projectType === 'Green Belt' || projectType === 'Black Belt') && (
      <Card>
        <CardHeader>
          <CardTitle>Benefit-Effort Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Generate and prioritize potential solutions based on effort and cost.
          </p>         
        </CardContent>
      </Card>
      )}
      
      {/* Improvement Action Designs */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement Action Design</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Develop a design for implementing each selected solutions.
          </p>          
          
        </CardContent>
      </Card>
      
      {/* Implementation Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Develop a detailed plan for implementing the selected solutions.
          </p>          
        </CardContent>
      </Card>
      
      {projectType === 'Green Belt' || projectType === 'Black Belt' && (
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Proof of Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Generate and prioritize potential solutions based on effort and cost.
            </p>         
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Benefit-Effort Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Generate and prioritize potential solutions based on effort and cost.
            </p>         
          </CardContent>
        </Card>
      </div>
      )}

      <ImproveGateReviewValidation projectId={projectId} />
    </div>
  );
}
