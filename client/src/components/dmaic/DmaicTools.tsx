import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import DefinePhase from "./DefinePhase";
import MeasurePhase from "./MeasurePhase";
import AnalyzePhase from "./AnalyzePhase";
import ImprovePhase from "./ImprovePhase";
import ControlPhase from "./ControlPhase";
import {
  cn,
  getProjectTypeColor,
  calculateTimelineProgress,
  getTimelineColor,
  getProgressColor,
  calculateDmaicProgress,
} from "@/lib/utils";
import DmaicProgressSteps from "./DmaicProgressSteps";
import { usePhaseProgress } from "@/hooks/usePhaseProgress";

// Helper function to format dates in a more compact and readable way
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

type PhaseParams = {
  phase?: string;
  projectId?: string;
};

export default function DmaicTools() {
  const {
    activePhase,
    setActivePhase,
    currentProject,
    setCurrentProject,
    setCurrentTab,
  } = useAppContext();
  const params = useParams<PhaseParams>();
  const [location, navigate] = useLocation();
  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
    enabled: true,
  });

  // Get calculated phase progress data based on actual tasks
  const phaseProgressData = usePhaseProgress(currentProject?.id || 0);

  // Calculate overall progress based on phase progress data
  const calculateOverallProgress = () => {
    if (!phaseProgressData) return 0;
    
    const { define, measure, analyze, improve, control } = phaseProgressData;
    const totalProgress = define + measure + analyze + improve + control;
    return Math.round(totalProgress / 5); // Average of all 5 phases
  };

  const overallProgress = calculateOverallProgress();

  // Ensure we have the correct project loaded
  useEffect(() => {
    // Load from URL params if available
    if (projectsData && params.projectId) {
      const projectId = parseInt(params.projectId);
      
      // Type guard to ensure projects exists and is an array
      const projects = Array.isArray((projectsData as any).projects) 
        ? (projectsData as any).projects as any[]
        : [];
      
      // Find the project with the matching ID
      const project = projects.find((p: any) => p.id === projectId);
      if (project && (!currentProject || currentProject.id !== projectId)) {
        console.log(
          `Setting current project to ID ${projectId} (${project.title})`,
        );
        setCurrentProject(project);
      }
    }
    // If no project ID in params but we have a stored project, update URL to match stored project
    else if (projectsData && currentProject?.id && !params.projectId) {
      console.log(
        `Updating URL to include stored project ID: ${currentProject.id}`,
      );
      navigate(`/app/dmaic/${params.phase || activePhase}/${currentProject.id}`);
    }
  }, [projectsData, params.projectId, currentProject, setCurrentProject, activePhase, params.phase, navigate]);

  // Set active phase from URL parameter if available
  useEffect(() => {
    if (
      params.phase &&
      ["define", "measure", "analyze", "improve", "control"].includes(
        params.phase,
      )
    ) {
      setActivePhase(params.phase);

      // Ensure we update the URL if we're missing a projectId but have currentProject
      if (!params.projectId && currentProject?.id) {
        console.log(
          `Updating URL to include current project ID: ${currentProject.id}`,
        );
        navigate(`/app/dmaic/${params.phase}/${currentProject.id}`);
      }
    }
    // If no phase in params but we have an active phase, update URL
    else if (activePhase && !params.phase && currentProject?.id) {
      console.log(
        `Updating URL to include active phase: ${activePhase}`,
      );
      navigate(`/app/dmaic/${activePhase}/${currentProject.id}`);
    }
  }, [
    params.phase,
    params.projectId,
    currentProject,
    activePhase,
    setActivePhase,
    navigate,
  ]);

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
      {/* Back to projects button - moved to top */}
      <div className="flex justify-end mb-2">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentProject?.title ? (
                <>
                  <span className="text-primary">{currentProject.title}</span>
                  <span className="text-gray-500 text-sm font-normal ml-1">
                    - DMAIC
                  </span>
                </>
              ) : (
                "DMAIC Methodology"
              )}
            </h1>

            {/* Project Timeline */}
            {currentProject?.startDate && currentProject?.targetEndDate && (
              <div className="flex flex-col md:ml-4">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col p-2 border border-gray-200 rounded-md shadow-sm h-full justify-center">
                    <div className="flex items-center">
                      <div className="w-24 md:w-36 bg-gray-200 rounded-full h-2 flex-shrink-0">
                        <div
                          className={`${getTimelineColor(calculateTimelineProgress(currentProject.startDate, currentProject.targetEndDate))} h-2 rounded-full`}
                          style={{
                            width: `${calculateTimelineProgress(currentProject.startDate, currentProject.targetEndDate)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {calculateTimelineProgress(
                          currentProject.startDate,
                          currentProject.targetEndDate,
                        )}
                        % Timeline
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1 w-24 md:w-36">
                      <span>{formatDate(currentProject.startDate)}</span>
                      <span>{formatDate(currentProject.targetEndDate)}</span>
                    </div>
                    {/* Additional empty space for vertical alignment */}
                    <div className="my-4"></div>
                  </div>
                </div>
              </div>
            )}

            {/* DMAIC Progress Visualization - Moved here from below */}
            {currentProject && (
              <div className="md:ml-4" style={{ width: "40%" }}>
                <div className="p-2 border border-gray-200 rounded-md shadow-sm">
                  <DmaicProgressSteps
                    project={currentProject}
                    overallProgress={overallProgress}
                    phaseProgressData={phaseProgressData}
                    className="scale-90 transform origin-center"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {activePhase.charAt(0).toUpperCase() + activePhase.slice(1)} Phase
            Tools & Techniques
            {currentProject?.projectType && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getProjectTypeColor(currentProject.projectType)}`}
              >
                {currentProject.projectType}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Spacer for DMAIC tool navigation */}
      <div className="mb-2 mt-2 border-t"></div>

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
          : "bg-white text-gray-700 hover:bg-gray-100",
      )}
    >
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "w-6 h-6 rounded-full bg-opacity-20 flex items-center justify-center mr-2",
            isActive ? "bg-white" : "bg-primary",
          )}
        >
          <span className={isActive ? "text-white" : "text-gray-700"}>
            {phase.charAt(0).toUpperCase()}
          </span>
        </span>
        <span className="hidden sm:inline capitalize">{phase}</span>
      </div>
    </button>
  );
}
