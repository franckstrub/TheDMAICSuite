import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertGanttTaskSchema, 
  GanttTask, 
  InsertGanttTask,
  insertGanttSettingsSchema,
  GanttSettings
} from "@shared/schema";
import { ZodError } from "zod";

// Import the debughelper to get project charter details
import { debugGetCharter } from "./debughelper";

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

  // Generate default DMAIC WBS tasks
  app.post("/api/projects/:projectId/gantt-tasks/generate-dmaic-wbs", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      // Get project charter for dates and project leader
      const charter = await debugGetCharter(projectId);
      if (!charter) {
        return res.status(404).json({ error: "Project charter not found" });
      }

      // Check if milestone dates were passed in the request
      const milestoneDates = req.body.milestoneDates || {};
      
      // Get project dates from charter or request
      const startDate = milestoneDates.projectStart || charter.startDate || new Date().toISOString().split('T')[0];
      const endDate = milestoneDates.projectEnd || charter.targetEndDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get milestone dates from request or charter
      const kickOffDate = milestoneDates.kickOff || charter.kick_off_date || startDate;
      const defineDate = milestoneDates.define || charter.define_phase_date || '';
      const measureDate = milestoneDates.measure || charter.measure_phase_date || '';
      const analyzeDate = milestoneDates.analyze || charter.analyze_phase_date || '';
      const improveDate = milestoneDates.improve || charter.improve_phase_date || '';
      const controlDate = milestoneDates.control || charter.control_phase_date || '';

      // Get assignee from project leader
      const assignee = charter.projectLeader || '';
      
      console.log("Generating DMAIC WBS with milestone dates:", {
        projectId,
        startDate,
        endDate,
        kickOffDate,
        defineDate,
        measureDate,
        analyzeDate,
        improveDate,
        controlDate
      });

      // Default DMAIC WBS tasks
      const tasks = [
        // Define Phase - Start at project start, end at define milestone
        {
          projectId,
          name: "Define Phase",
          startDate,
          endDate: defineDate || measureDate || analyzeDate || improveDate || controlDate || endDate,
          progress: 0,
          dependencies: "",
          assignee,
          priority: "medium" as const,
          phase: "define" as const,
          status: "not-started" as const,
          sequence: 1
        },
        // Project Kick-Off (sub-task in Define)
        {
          projectId,
          name: "Project Kick-Off Meeting",
          startDate: kickOffDate || startDate,
          endDate: kickOffDate || startDate,
          progress: 0,
          dependencies: "",
          assignee,
          priority: "high" as const,
          phase: "define" as const,
          status: "not-started" as const,
          sequence: 2
        },
        // Measure Phase
        {
          projectId,
          name: "Measure Phase",
          startDate: defineDate || startDate,
          endDate: measureDate || analyzeDate || improveDate || controlDate || endDate,
          progress: 0,
          dependencies: "Define Phase",
          assignee,
          priority: "medium" as const,
          phase: "measure" as const,
          status: "not-started" as const,
          sequence: 3
        },
        // Analyze Phase
        {
          projectId,
          name: "Analyze Phase",
          startDate: measureDate || defineDate || startDate,
          endDate: analyzeDate || improveDate || controlDate || endDate,
          progress: 0,
          dependencies: "Measure Phase",
          assignee,
          priority: "medium" as const,
          phase: "analyze" as const,
          status: "not-started" as const,
          sequence: 4
        },
        // Improve Phase
        {
          projectId,
          name: "Improve Phase",
          startDate: analyzeDate || measureDate || defineDate || startDate,
          endDate: improveDate || controlDate || endDate,
          progress: 0,
          dependencies: "Analyze Phase",
          assignee,
          priority: "medium" as const,
          phase: "improve" as const,
          status: "not-started" as const,
          sequence: 5
        },
        // Control Phase
        {
          projectId,
          name: "Control Phase",
          startDate: improveDate || analyzeDate || measureDate || defineDate || startDate,
          endDate: controlDate || endDate,
          progress: 0,
          dependencies: "Improve Phase",
          assignee,
          priority: "medium" as const,
          phase: "control" as const,
          status: "not-started" as const,
          sequence: 6
        },
        // Closure Phase
        {
          projectId,
          name: "Closure Phase",
          startDate: controlDate,
          endDate: endDate,
          progress: 0,
          dependencies: "Control Phase",
          assignee,
          priority: "medium" as const,
          phase: "closure" as const,
          status: "not-started" as const,
          sequence: 7
        }
      ];

      // Create all tasks
      const createdTasks = [];
      
      console.log("Generating DMAIC WBS with milestone dates:", {
        projectId,
        startDate,
        endDate,
        kickOffDate,
        defineDate,
        measureDate,
        analyzeDate,
        improveDate,
        controlDate
      });
      
      for (const task of tasks) {
        // Make sure all tasks have valid dates, using fallbacks if needed
        if (!task.startDate) {
          task.startDate = startDate;
        }
        if (!task.endDate) {
          task.endDate = endDate;
        }
        
        try {
          const newTask = await storageToUse.createGanttTask(task);
          createdTasks.push(newTask);
          console.log(`Created task: ${task.name}, Phase: ${task.phase}, Dates: ${task.startDate} - ${task.endDate}, Sequence: ${task.sequence}`);
        } catch (err) {
          console.error(`Error creating task ${task.name}:`, err);
        }
      }
      
      return res.status(201).json({ 
        message: `Created ${createdTasks.length} default DMAIC WBS tasks`, 
        tasks: createdTasks 
      });
    } catch (error) {
      console.error("Error generating DMAIC WBS tasks:", error);
      return res.status(500).json({ error: "Failed to generate DMAIC WBS tasks" });
    }
  });

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