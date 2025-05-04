/**
 * Utilities for synchronizing project data
 */

import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

/**
 * Sync a specific project's progress with its current phase
 * @param projectId The ID of the project to synchronize
 * @returns Promise that resolves when sync is complete
 */
export async function syncProjectProgress(projectId: number): Promise<void> {
  try {
    const response = await apiRequest(
      "POST", 
      `/api/sync-project-progress/${projectId}`, 
      {}
    );
    
    // Invalidate project data in the cache
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    
    toast({
      title: "Success",
      description: "Project progress has been synchronized with its phase",
    });
    
    return response;
  } catch (error) {
    console.error("Error syncing project progress:", error);
    toast({
      title: "Error",
      description: error instanceof Error 
        ? `Failed to sync progress: ${error.message}`
        : "Failed to sync project progress",
      variant: "destructive",
    });
    throw error;
  }
}

/**
 * Sync all projects' progress with their current phases
 * @returns Promise that resolves when sync is complete
 */
export async function syncAllProjectsProgress(): Promise<void> {
  try {
    const response = await apiRequest("POST", "/api/sync-project-progress", {});
    
    // Invalidate all project data in the cache
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    
    // Show success message with count of updated projects
    const message = response?.message || "Projects synchronized successfully";
    toast({
      title: "Success",
      description: message,
    });
    
    return response;
  } catch (error) {
    console.error("Error syncing all projects progress:", error);
    toast({
      title: "Error",
      description: error instanceof Error 
        ? `Failed to sync all projects: ${error.message}`
        : "Failed to sync all projects' progress",
      variant: "destructive",
    });
    throw error;
  }
}