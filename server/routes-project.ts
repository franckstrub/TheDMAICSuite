import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

export function registerProjectRoutes(app: Express, dbStorage: any = null) {
  // If dbStorage is provided, use it instead of the imported storage
  const storageToUse = dbStorage || storage;
  
  // Save Gantt view mode preference
  app.post("/api/projects/:projectId/gantt-view-mode", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const { viewMode } = req.body;
      
      if (!viewMode || !['weeks', 'months', 'years'].includes(viewMode)) {
        return res.status(400).json({ error: "Invalid view mode. Must be 'weeks', 'months', or 'years'" });
      }
      
      // Update the project with the gantt view mode
      const updatedProject = await storageToUse.updateProject(projectId, { 
        ganttViewMode: viewMode 
      });
      
      if (!updatedProject) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      return res.json({ success: true, ganttViewMode: updatedProject.ganttViewMode });
    } catch (error) {
      console.error("Error saving Gantt view mode:", error);
      return res.status(500).json({ error: "Failed to save Gantt view mode" });
    }
  });
}