
import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { insertGateReviewDeliverableSchema, insertGateReviewValidatorSchema } from '@shared/schema';
import multer from 'multer';
import { Client } from '@replit/object-storage';

export function registerGateReviewRoutes(app: Express, storage: any) {
  let objectStorage: Client | null = null;
  try {
    objectStorage = new Client();
  } catch (error) {
    console.warn("Failed to initialize object storage client:", error);
  }
  // Gate Review Deliverables Routes
  app.get("/api/projects/:projectId/gate-review-deliverables", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.query.phase as string || 'define'; // Default to define phase if not specified
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const deliverables = await storage.getGateReviewDeliverables(projectId, phase);
      res.json({ deliverables });
    } catch (error) {
      console.error("Error getting gate review deliverables:", error);
      res.status(500).json({ error: "Failed to get gate review deliverables" });
    }
  });

  app.post("/api/projects/:projectId/gate-review-deliverables", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const validatedData = insertGateReviewDeliverableSchema.parse({
        ...req.body,
        projectId
      });
      
      const deliverable = await storage.createGateReviewDeliverable(validatedData);
      res.status(201).json({ deliverable });
    } catch (error) {
      console.error("Error creating gate review deliverable:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create gate review deliverable" });
    }
  });

  app.put("/api/gate-review-deliverables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deliverable ID" });
      }
      
      const deliverable = await storage.getGateReviewDeliverable(id);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      
      const updatedDeliverable = await storage.updateGateReviewDeliverable(id, req.body);
      res.json({ deliverable: updatedDeliverable });
    } catch (error) {
      console.error("Error updating gate review deliverable:", error);
      res.status(500).json({ error: "Failed to update gate review deliverable" });
    }
  });

  app.delete("/api/gate-review-deliverables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid deliverable ID" });
      }
      
      const deliverable = await storage.getGateReviewDeliverable(id);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      
      const success = await storage.deleteGateReviewDeliverable(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete gate review deliverable" });
      }
    } catch (error) {
      console.error("Error deleting gate review deliverable:", error);
      res.status(500).json({ error: "Failed to delete gate review deliverable" });
    }
  });

  // Gate Review Validators Routes
  app.get("/api/projects/:projectId/gate-review-validators", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.query.phase as string || 'define'; // Default to define phase if not specified
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const validators = await storage.getGateReviewValidators(projectId, phase);
      res.json({ validators });
    } catch (error) {
      console.error("Error getting gate review validators:", error);
      res.status(500).json({ error: "Failed to get gate review validators" });
    }
  });

  app.post("/api/projects/:projectId/gate-review-validators", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const validatedData = insertGateReviewValidatorSchema.parse({
        ...req.body,
        projectId
      });
      
      const validator = await storage.createGateReviewValidator(validatedData);
      res.status(201).json({ validator });
    } catch (error) {
      console.error("Error creating gate review validator:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create gate review validator" });
    }
  });

  app.put("/api/gate-review-validators/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid validator ID" });
      }
      
      const validator = await storage.getGateReviewValidator(id);
      if (!validator) {
        return res.status(404).json({ error: "Validator not found" });
      }
      
      const updatedValidator = await storage.updateGateReviewValidator(id, req.body);
      res.json({ validator: updatedValidator });
    } catch (error) {
      console.error("Error updating gate review validator:", error);
      res.status(500).json({ error: "Failed to update gate review validator" });
    }
  });

  app.delete("/api/gate-review-validators/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid validator ID" });
      }
      
      const validator = await storage.getGateReviewValidator(id);
      if (!validator) {
        return res.status(404).json({ error: "Validator not found" });
      }
      
      const success = await storage.deleteGateReviewValidator(id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete gate review validator" });
      }
    } catch (error) {
      console.error("Error deleting gate review validator:", error);
      res.status(500).json({ error: "Failed to delete gate review validator" });
    }
  });

  // Add this route to handle file uploads
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/projects/:projectId/gate-review-attachments", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      if (!objectStorage) {
        return res.status(503).json({ error: "Object storage is not available" });
      }

      const fileName = `gate-review-attachments/${projectId}/${Date.now()}-${req.file.originalname}`;
      
      try {
        await objectStorage.put(fileName, req.file.buffer);
        const url = await objectStorage.getUrl(fileName);
        res.json({ url });
      } catch (error) {
        console.error("Error interacting with object storage:", error);
        res.status(503).json({ error: "Failed to store file" });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
}
