import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import MilestoneTimeline from "./MilestoneTimeline";

import TrainingPlan from '@/components/dmaic/TrainingPlan';
import WorkInstructions from '@/components/dmaic/WorkInstructions';
import LessonsLearned from '@/components/dmaic/LessonsLearned';
import ControlPlan from '@/components/dmaic/ControlPlan';      
import SPC from '@/components/dmaic/SPC';
import AuditPlan from '@/components/dmaic/AuditPlan';      
import TransferToPO from '@/components/dmaic/TransferToPO';
import FinancialBenefitsValidation from '@/components/dmaic/FinancialBenefitsValidation';
import ControlGateReviewValidation from '@/components/dmaic/ControlGateReviewValidation';

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
  improve_phase_date?: string | null;
  control_phase_date?: string | null;
}

interface CharterResponse {
  charter: Charter;
}

export default function ControlPhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    improvePhaseDate: null as string | null,
    controlPhaseDate: null as string | null,
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
        improvePhaseDate: charter.charter.improve_phase_date || null,
        controlPhaseDate: charter.charter.control_phase_date || null,
      });
    }
  }, [charter]);

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.improvePhaseDate}
              endDate={milestoneDates.controlPhaseDate}
              label="Control Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>

      {/* Training Plan */}
      <TrainingPlan projectId={projectId} />

      {/* Work Instructions */}
      <WorkInstructions projectId={projectId} />

      {/* Lessons Learned */}
      <LessonsLearned projectId={projectId} />

      {/* Control Plan */}
      <ControlPlan projectId={projectId} projectType={projectType} />
      
      {/* SPC */}
      <SPC projectId={projectId} projectType={projectType} />
      
      {/* Audit Plan */}
      <AuditPlan projectId={projectId} projectType={projectType} />
      
      {/* Transfer to Process Owner */}
      <TransferToPO projectId={projectId} projectType={projectType} />

      {/* Financial Benefits Validation */}
      <FinancialBenefitsValidation projectId={projectId} projectType={projectType} />
      
      {/* Control Gate Review and Validation */}
      <ControlGateReviewValidation projectId={projectId} />
    </div>
  );
}