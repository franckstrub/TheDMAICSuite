import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import DefinePhase from "./DefinePhase";
import MeasurePhase from "./MeasurePhase";
import AnalyzePhase from "./AnalyzePhase";
import ImprovePhase from "./ImprovePhase";
import ControlPhase from "./ControlPhase";
import { 
  cn, 
  getProjectTypeColor, 
  calculateTimelineProgress, 
  getTimelineColor 
} from "@/lib/utils";

type PhaseParams = {
  phase?: string;
  projectId?: string;
};

export default function DmaicTools() {
  const { activePhase, setActivePhase, currentProject, setCurrentProject, setCurrentTab } = useAppContext();
  const params = useParams<PhaseParams>();
  const [location, navigate] = useLocation();
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
    enabled: true
  });

  // Ensure we have the correct project loaded
  useEffect(() => {
    if (projectsData && 'projects' in projectsData && params.projectId) {
      const projectId = parseInt(params.projectId);
      // Find the project with the matching ID
      const projects = projectsData.projects as any[];
      const project = projects.find((p: any) => p.id === projectId);
      if (project && (!currentProject || currentProject.id !== projectId)) {
        console.log(`Setting current project to ID ${projectId} (${project.title})`);
        setCurrentProject(project);
      }
    }
  }, [projectsData, params.projectId, currentProject, setCurrentProject]);

  // Set active phase from URL parameter if available
  useEffect(() => {
    if (params.phase && 
        ['define', 'measure', 'analyze', 'improve', 'control'].includes(params.phase)) {
      setActivePhase(params.phase);
      
      // Ensure we update the URL if we're missing a projectId but have currentProject
      if (!params.projectId && currentProject?.id) {
        console.log(`Updating URL to include current project ID: ${currentProject.id}`);
        navigate(`/app/dmaic/${params.phase}/${currentProject.id}`);
      }
    }
  }, [params.phase, params.projectId, currentProject, setActivePhase, navigate]);

  // Render the appropriate phase component based on activePhase
  const renderPhaseContent = () => {
    switch (activePhase) {
      case "define":
        return <DefinePhase />;
      case "measure":
        return <MeasurePhase />;
      case "analyze":
        return <AnalyzePhase />;
      case "improve":
        return <ImprovePhase />;
      case "control":
        return <ControlPhase />;
      default:
        return <DefinePhase />;
    }
  };

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentProject?.title ? (
                <>
                  <span className="text-primary">{currentProject.title}</span> - DMAIC
                </>
              ) : (
                "DMAIC Methodology"
              )}
            </h1>
            
            {/* Project Timeline */}
            {currentProject?.startDate && currentProject?.targetEndDate && (
              <div className="flex items-center gap-2 md:ml-4">
                <div className="w-24 md:w-36 bg-gray-200 rounded-full h-2 flex-shrink-0">
                  <div 
                    className={`${getTimelineColor(calculateTimelineProgress(currentProject.startDate, currentProject.targetEndDate))} h-2 rounded-full`} 
                    style={{ width: `${calculateTimelineProgress(currentProject.startDate, currentProject.targetEndDate)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {calculateTimelineProgress(currentProject.startDate, currentProject.targetEndDate)}% Timeline
                </span>
              </div>
            )}
          </div>
          
          <p className="mt-1 text-sm text-gray-500">
            {activePhase.charAt(0).toUpperCase() + activePhase.slice(1)} Phase Tools & Techniques
            {currentProject?.projectType && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getProjectTypeColor(currentProject.projectType)}`}>
                {currentProject.projectType}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary-dark flex items-center"
            onClick={() => {
              setCurrentTab("projects");
              navigate("/app/projects");
            }}
          >
            <i className="fas fa-arrow-left mr-1"></i> Back to Projects
          </Button>
        </div>
      </div>
      
      {/* DMAIC Phase Navigation */}
      <div className="flex overflow-x-auto mb-6">
        <div className="flex-grow flex space-x-1">
          <PhaseButton 
            phase="define" 
            activePhase={activePhase} 
            setActivePhase={setActivePhase} 
          />
          <PhaseButton 
            phase="measure" 
            activePhase={activePhase} 
            setActivePhase={setActivePhase} 
          />
          <PhaseButton 
            phase="analyze" 
            activePhase={activePhase} 
            setActivePhase={setActivePhase} 
          />
          <PhaseButton 
            phase="improve" 
            activePhase={activePhase} 
            setActivePhase={setActivePhase} 
          />
          <PhaseButton 
            phase="control" 
            activePhase={activePhase} 
            setActivePhase={setActivePhase} 
          />
        </div>
      </div>
      
      {/* Phase Content */}
      {renderPhaseContent()}
    </div>
  );
}

interface PhaseButtonProps {
  phase: string;
  activePhase: string;
  setActivePhase: (phase: string) => void;
}

function PhaseButton({ phase, activePhase, setActivePhase }: PhaseButtonProps) {
  const isActive = activePhase === phase;
  const { currentProject } = useAppContext();
  const [location, navigate] = useLocation();
  
  const handlePhaseChange = () => {
    setActivePhase(phase);
    
    // Navigate to the URL with both phase and projectId parameters in the path
    if (currentProject?.id) {
      navigate(`/app/dmaic/${phase}/${currentProject.id}`);
    } else {
      navigate(`/app/dmaic/${phase}`);
    }
  };
  
  return (
    <button 
      onClick={handlePhaseChange}
      className={cn(
        "flex-grow py-2 px-4 rounded-md font-medium text-sm focus:outline-none border",
        isActive 
          ? "bg-primary text-white" 
          : "bg-white text-gray-700 hover:bg-gray-100"
      )}
    >
      <div className="flex items-center justify-center">
        <span 
          className={cn(
            "w-6 h-6 rounded-full bg-opacity-20 flex items-center justify-center mr-2",
            isActive ? "bg-white" : "bg-primary"
          )}
        >
          <span className={isActive ? "text-white" : "text-primary"}>
            {phase.charAt(0).toUpperCase()}
          </span>
        </span>
        <span className="hidden sm:inline capitalize">{phase}</span>
      </div>
    </button>
  );
}
