import { cn } from "@/lib/utils";

export interface PhaseStatus {
  status: "completed" | "in-progress" | "not-started";
  progress: number;
}

export interface DmaicPhases {
  define: PhaseStatus;
  measure: PhaseStatus;
  analyze: PhaseStatus;
  improve: PhaseStatus;
  control: PhaseStatus;
}

interface DmaicProgressStepsProps {
  phases: DmaicPhases;
  overallProgress: number;
  className?: string;
}

/**
 * A component that displays DMAIC progress as a series of connected steps
 */
export default function DmaicProgressSteps({ phases, overallProgress, className }: DmaicProgressStepsProps) {
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
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between w-full mb-2">
        {/* Define Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
            getPhaseTextColor(phases.define.status),
            getPhaseColor(phases.define.status)
          )}>
            D
          </div>
          <span className="text-xs mt-1">Define</span>
        </div>
        
        {/* Connection between Define and Measure */}
        <div className="flex-grow mx-1 flex items-center">
          <div className="h-1 w-full bg-gray-200 relative">
            {phases.define.status === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {phases.define.status === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${phases.define.progress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Measure Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
            getPhaseTextColor(phases.measure.status),
            getPhaseColor(phases.measure.status)
          )}>
            M
          </div>
          <span className="text-xs mt-1">Measure</span>
        </div>
        
        {/* Connection between Measure and Analyze */}
        <div className="flex-grow mx-1 flex items-center">
          <div className="h-1 w-full bg-gray-200 relative">
            {phases.measure.status === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {phases.measure.status === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${phases.measure.progress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Analyze Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
            getPhaseTextColor(phases.analyze.status),
            getPhaseColor(phases.analyze.status)
          )}>
            A
          </div>
          <span className="text-xs mt-1">Analyze</span>
        </div>
        
        {/* Connection between Analyze and Improve */}
        <div className="flex-grow mx-1 flex items-center">
          <div className="h-1 w-full bg-gray-200 relative">
            {phases.analyze.status === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {phases.analyze.status === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${phases.analyze.progress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Improve Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
            getPhaseTextColor(phases.improve.status),
            getPhaseColor(phases.improve.status)
          )}>
            I
          </div>
          <span className="text-xs mt-1">Improve</span>
        </div>
        
        {/* Connection between Improve and Control */}
        <div className="flex-grow mx-1 flex items-center">
          <div className="h-1 w-full bg-gray-200 relative">
            {phases.improve.status === "completed" && (
              <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
            )}
            {phases.improve.status === "in-progress" && (
              <div className="absolute inset-0 bg-blue-500" style={{ width: `${phases.improve.progress}%` }}></div>
            )}
          </div>
        </div>
        
        {/* Control Phase */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
            getPhaseTextColor(phases.control.status),
            getPhaseColor(phases.control.status)
          )}>
            C
          </div>
          <span className="text-xs mt-1">Control</span>
        </div>
      </div>
      
      <div className="flex justify-between mt-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span className="text-xs text-gray-600">Not Started</span>
        </div>
      </div>
      
      <div className="text-right mt-1">
        <span className="text-sm font-medium text-gray-700">
          Overall DMAIC Progress: {overallProgress}%
        </span>
      </div>
    </div>
  );
}