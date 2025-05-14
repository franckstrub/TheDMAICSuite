import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertGanttTaskSchema, GanttTask, InsertGanttTask } from "@shared/schema";
import { ZodError } from "zod";

export function registerGanttRoutes(app: Express, dbStorage: any = null) {
  // If dbStorage is provided, use it instead of the imported storage
  const storageToUse = dbStorage || storage;
  // Get all Gantt tasks for a project
  app.get("/api/projects/:projectId/gantt-tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const tasks = await storageToUse.getGanttTasks(projectId);
      return res.json({ tasks });
    } catch (error) {
      console.error("Error fetching Gantt tasks:", error);
      return res.status(500).json({ error: "Failed to fetch Gantt tasks" });
    }
  });

  // Get a specific Gantt task
  app.get("/api/gantt-tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const task = await storageToUse.getGanttTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      return res.json({ task });
    } catch (error) {
      console.error("Error fetching Gantt task:", error);
      return res.status(500).json({ error: "Failed to fetch Gantt task" });
    }
  });

  // Create a new Gantt task
  app.post("/api/projects/:projectId/gantt-tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      // Parse and validate the request body
      const taskData = insertGanttTaskSchema.parse({
        ...req.body,
        projectId
      });
      
      const task = await storageToUse.createGanttTask(taskData);
      return res.status(201).json({ task });
    } catch (error) {
      console.error("Error creating Gantt task:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          error: "Invalid task data", 
          details: error.errors 
        });
      }
      return res.status(500).json({ error: "Failed to create Gantt task" });
    }
  });

  // Update a Gantt task
  app.put("/api/gantt-tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      // Get the existing task
      const existingTask = await storageToUse.getGanttTask(id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Update the task
      const updatedTask = await storageToUse.updateGanttTask(id, req.body);
      if (!updatedTask) {
        return res.status(500).json({ error: "Failed to update task" });
      }
      
      return res.json({ task: updatedTask });
    } catch (error) {
      console.error("Error updating Gantt task:", error);
      return res.status(500).json({ error: "Failed to update Gantt task" });
    }
  });

  // Delete a Gantt task
  app.delete("/api/gantt-tasks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid task ID" });
      }
      
      const success = await storageToUse.deleteGanttTask(id);
      if (!success) {
        return res.status(404).json({ error: "Task not found or could not be deleted" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Gantt task:", error);
      return res.status(500).json({ error: "Failed to delete Gantt task" });
    }
  });

  // Update task sequence (reordering)
  app.post("/api/projects/:projectId/gantt-tasks/reorder", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const { taskIds } = req.body;
      if (!Array.isArray(taskIds) || taskIds.some(id => typeof id !== 'number')) {
        return res.status(400).json({ error: "Invalid task IDs array" });
      }
      
      const success = await storageToUse.updateGanttTaskSequence(projectId, taskIds);
      if (!success) {
        return res.status(500).json({ error: "Failed to update task sequence" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating Gantt task sequence:", error);
      return res.status(500).json({ error: "Failed to update task sequence" });
    }
  });
}