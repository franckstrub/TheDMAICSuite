import { cn } from "@/lib/utils";

interface DmaicProgressStepsProps {
  project: any;
  overallProgress: number;
  phaseProgressData?: {
    define: number;
    measure: number;
    analyze: number;
    improve: number;
    control: number;
  };
  className?: string;
}

/**
 * A component that displays DMAIC progress as a series of connected steps
 */
export default function DmaicProgressSteps({ project, overallProgress, phaseProgressData, className }: DmaicProgressStepsProps) {
  // Get the current phase (handle case sensitivity and null values)
  const currentPhase = project?.currentPhase ? project.currentPhase.toLowerCase() : 'define';
  
  // Helper function to determine if a phase is complete, in progress, or not started
  const getPhaseStatus = (phaseName: string): 'completed' | 'in-progress' | 'not-started' => {
    const phaseOrder = ['define', 'measure', 'analyze', 'improve', 'control'];
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phaseName.toLowerCase());
    
    if (phaseIndex < currentPhaseIndex) {
      return 'completed';
    } else if (phaseIndex === currentPhaseIndex) {
      return 'in-progress';
    } else {
      return 'not-started';
    }
  };
  
  // Calculate phase progress percentage using actual task data or fallback to status-based calculation
  const calculatePhaseProgress = (phaseName: string): number => {
    // Use the actual calculated progress from tasks if available
    if (phaseProgressData) {
      return phaseProgressData[phaseName as keyof typeof phaseProgressData] || 0;
    }
    
    // Fallback to the original logic if no task data is provided
    if (getPhaseStatus(phaseName) === 'completed') {
      return 100;
    } else if (getPhaseStatus(phaseName) === 'in-progress') {
      return Math.min(100, Math.max(0, overallProgress * 5));
    } else {
      return 0;
    }
  };
  
  // Helper function to determine the color for each phase based on its status
  const getPhaseColor = (status: string): string => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "not-started": return "bg-gray-300";
      default: return "bg-gray-300";
    }
  };
  
  // Helper function to determine the text color for each phase based on its status
  const getPhaseTextColor = (status: string): string => {
    switch (status) {
      case "completed": return "text-white";
      case "in-progress": return "text-white";
      case "not-started": return "text-gray-600";
      default: return "text-gray-600";
    }
  };
  
  // Get status for each phase
  const defineStatus = getPhaseStatus('define');
  const measureStatus = getPhaseStatus('measure');
  const analyzeStatus = getPhaseStatus('analyze');
  const improveStatus = getPhaseStatus('improve');
  const controlStatus = getPhaseStatus('control');
  
  // Calculate progress for each phase
  const defineProgress = calculatePhaseProgress('define');
  const measureProgress = calculatePhaseProgress('measure');
  const analyzeProgress = calculatePhaseProgress('analyze');
  const improveProgress = calculatePhaseProgress('improve');
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between w-full mb-1">
        {/* Define Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs",
            getPhaseTextColor(defineStatus),
            getPhaseColor(defineStatus)
          )}>
            D
          </div>
          <span className="text-xs mt-0.5">Define</span>
        </div>
        
        {/* Connection between Define and Measure */}
        <div className="flex-grow mx-0.5 flex items-center">
          <div className="h-0.5 w-full bg-gray-200 relative">
            {defineStatus === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {defineStatus === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${defineProgress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Measure Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs",
            getPhaseTextColor(measureStatus),
            getPhaseColor(measureStatus)
          )}>
            M
          </div>
          <span className="text-xs mt-0.5">Measure</span>
        </div>
        
        {/* Connection between Measure and Analyze */}
        <div className="flex-grow mx-0.5 flex items-center">
          <div className="h-0.5 w-full bg-gray-200 relative">
            {measureStatus === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {measureStatus === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${measureProgress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Analyze Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs",
            getPhaseTextColor(analyzeStatus),
            getPhaseColor(analyzeStatus)
          )}>
            A
          </div>
          <span className="text-xs mt-0.5">Analyze</span>
        </div>
        
        {/* Connection between Analyze and Improve */}
        <div className="flex-grow mx-0.5 flex items-center">
          <div className="h-0.5 w-full bg-gray-200 relative">
            {analyzeStatus === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {analyzeStatus === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${analyzeProgress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Improve Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs",
            getPhaseTextColor(improveStatus),
            getPhaseColor(improveStatus)
          )}>
            I
          </div>
          <span className="text-xs mt-0.5">Improve</span>
        </div>
        
        {/* Connection between Improve and Control */}
        <div className="flex-grow mx-0.5 flex items-center">
          <div className="h-0.5 w-full bg-gray-200 relative">
            {improveStatus === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {improveStatus === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${improveProgress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Control Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs",
            getPhaseTextColor(controlStatus),
            getPhaseColor(controlStatus)
          )}>
            C
          </div>
          <span className="text-xs mt-0.5">Control</span>
        </div>
      </div>
      
      <div className="flex justify-between mt-1.5">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <span className="text-xs text-gray-600">Not Started</span>
        </div>
      </div>
      
      <div className="text-right mt-0.5">
        <span className="text-xs font-medium text-gray-700">
          Overall DMAIC Progress: {overallProgress}%
        </span>
      </div>
    </div>
  );
}