import { cn } from "@/lib/utils";

/**
 * This is a mockup component showing how the DMAIC Milestone Progress cursor would look.
 * It visualizes progress across all five DMAIC phases in a consolidated view.
 */
export default function DmaicMilestoneProgressMockup() {
  // Example data (would come from currentProject in real implementation)
  const mockProject = {
    title: "Test Six Sigma Project Francky",
    phases: {
      define: { status: "completed", progress: 100 },
      measure: { status: "in-progress", progress: 60 },
      analyze: { status: "not-started", progress: 0 },
      improve: { status: "not-started", progress: 0 },
      control: { status: "not-started", progress: 0 }
    },
    overallProgress: 25 // This would be calculated based on phase statuses
  };
  
  // Helper function to determine the color for each phase based on its status
  const getPhaseColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "not-started": return "bg-gray-300";
      default: return "bg-gray-300";
    }
  };
  
  // Calculate the width for each phase segment (equal distribution)
  const segmentWidth = 20; // 5 phases, each gets 20% of total width
  
  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 bg-white border rounded-md shadow-sm">
      <h2 className="text-lg font-medium text-gray-700 mb-4">Mockup: DMAIC Milestone Progress Cursor</h2>
      
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          <span className="text-primary">{mockProject.title}</span> - DMAIC
        </h1>
        
        {/* DMAIC Milestone Progress Bar */}
        <div className="w-full mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Define</span>
            <span>Measure</span>
            <span>Analyze</span>
            <span>Improve</span>
            <span>Control</span>
          </div>
          
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="flex h-full">
              {/* Define Phase */}
              <div 
                className={cn("h-full", getPhaseColor(mockProject.phases.define.status))}
                style={{ width: `${segmentWidth}%` }}
              />
              
              {/* Measure Phase */}
              <div
                className={cn("h-full", getPhaseColor(mockProject.phases.measure.status))}
                style={{ width: `${segmentWidth}%` }}
              />
              
              {/* Analyze Phase */}
              <div
                className={cn("h-full", getPhaseColor(mockProject.phases.analyze.status))}
                style={{ width: `${segmentWidth}%` }}
              />
              
              {/* Improve Phase */}
              <div
                className={cn("h-full", getPhaseColor(mockProject.phases.improve.status))}
                style={{ width: `${segmentWidth}%` }}
              />
              
              {/* Control Phase */}
              <div
                className={cn("h-full", getPhaseColor(mockProject.phases.control.status))}
                style={{ width: `${segmentWidth}%` }}
              />
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
              Overall DMAIC Progress: {mockProject.overallProgress}%
            </span>
          </div>
        </div>
        
        {/* Alternative Design: DMAIC Progress Steps */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-base font-medium text-gray-700 mb-4">Alternative Design: DMAIC Steps</h3>
          
          <div className="flex justify-between w-full mb-2">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                mockProject.phases.define.status === "completed" ? "bg-green-500" : 
                mockProject.phases.define.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
              )}>
                D
              </div>
              <span className="text-xs mt-1">Define</span>
            </div>
            
            <div className="flex-grow mx-1 flex items-center">
              <div className="h-1 w-full bg-gray-200 relative">
                <div className="absolute inset-0 bg-green-500" style={{ width: "100%" }}></div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                mockProject.phases.measure.status === "completed" ? "bg-green-500" : 
                mockProject.phases.measure.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
              )}>
                M
              </div>
              <span className="text-xs mt-1">Measure</span>
            </div>
            
            <div className="flex-grow mx-1 flex items-center">
              <div className="h-1 w-full bg-gray-200 relative">
                <div className="absolute inset-0 bg-blue-500" style={{ width: "60%" }}></div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                mockProject.phases.analyze.status === "completed" ? "bg-green-500" : 
                mockProject.phases.analyze.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
              )}>
                A
              </div>
              <span className="text-xs mt-1">Analyze</span>
            </div>
            
            <div className="flex-grow mx-1 flex items-center">
              <div className="h-1 w-full bg-gray-200"></div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                mockProject.phases.improve.status === "completed" ? "bg-green-500" : 
                mockProject.phases.improve.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
              )}>
                I
              </div>
              <span className="text-xs mt-1">Improve</span>
            </div>
            
            <div className="flex-grow mx-1 flex items-center">
              <div className="h-1 w-full bg-gray-200"></div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                mockProject.phases.control.status === "completed" ? "bg-green-500" : 
                mockProject.phases.control.status === "in-progress" ? "bg-blue-500" : "bg-gray-300"
              )}>
                C
              </div>
              <span className="text-xs mt-1">Control</span>
            </div>
          </div>
          
          <div className="text-right mt-2">
            <span className="text-sm font-medium text-gray-700">
              Overall DMAIC Progress: {mockProject.overallProgress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}