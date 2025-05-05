import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ProjectTitleWithProgressMockup from "@/components/dmaic/ProjectTitleWithProgressMockup";
import DmaicMilestoneProgressMockup from "@/components/dmaic/DmaicMilestoneProgressMockup";

export default function MockupPage() {
  const [_, navigate] = useLocation();
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => navigate("/app/projects")}
        >
          Back to App
        </Button>
      </div>
      
      <div className="space-y-8">
        <ProjectTitleWithProgressMockup />
        <DmaicMilestoneProgressMockup />
      </div>
    </div>
  );
}