import { 
  getProgressColor, 
  getTimelineColor, 
  calculateTimelineProgress 
} from "@/lib/utils";

/**
 * This is a mockup component showing how the Project Title would look with both
 * Timeline and Progress cursors. The actual implementation will be integrated
 * into DmaicTools.tsx after review.
 */
export default function ProjectTitleWithProgressMockup() {
  // Example data (would come from currentProject in real implementation)
  const mockProject = {
    title: "Test Six Sigma Project Francky",
    startDate: "2025-04-27",
    targetEndDate: "2025-12-28",
    progress: 25 // This would be the actual project progress value
  };
  
  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 bg-white border rounded-md shadow-sm">
      <h2 className="text-lg font-medium text-gray-700 mb-4">Mockup: Project Title with Progress Cursor</h2>
      
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          <span className="text-primary">{mockProject.title}</span> - DMAIC
        </h1>
        
        {/* Project Timeline Cursor */}
        <div className="flex items-center gap-2 md:ml-4">
          <div className="w-24 md:w-36 bg-gray-200 rounded-full h-2 flex-shrink-0">
            <div 
              className={`${getTimelineColor(calculateTimelineProgress(mockProject.startDate, mockProject.targetEndDate))} h-2 rounded-full`} 
              style={{ width: `${calculateTimelineProgress(mockProject.startDate, mockProject.targetEndDate)}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {calculateTimelineProgress(mockProject.startDate, mockProject.targetEndDate)}% Timeline
          </span>
        </div>
        
        {/* NEW: Project Progress Cursor */}
        <div className="flex items-center gap-2 md:ml-4">
          <div className="w-24 md:w-36 bg-gray-200 rounded-full h-2 flex-shrink-0">
            <div 
              className={`${getProgressColor(mockProject.progress)} h-2 rounded-full`} 
              style={{ width: `${mockProject.progress}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {mockProject.progress}% Complete
          </span>
        </div>
      </div>
      
      <p className="mt-1 text-sm text-gray-500">
        Define Phase Tools & Techniques
        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
          Green Belt
        </span>
      </p>
    </div>
  );
}