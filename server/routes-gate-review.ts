// This is a temporary file to show the route implementation for the Gate Review feature
// These routes would need to be integrated into the main routes.ts file

import { Express, Request, Response } from "express";
import { 
  insertGateReviewDeliverableSchema, 
  insertGateReviewValidatorSchema 
} from "@shared/schema";

export function registerGateReviewRoutes(app: Express, storage: any) {
  // Gate Review Deliverables routes
  app.get("/api/projects/:projectId/gate-review-deliverables", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.query.phase as string || "define";
      
      const deliverables = await storage.getGateReviewDeliverables(projectId, phase);
      
      return res.status(200).json({ deliverables });
    } catch (err) {
      console.error("Error fetching gate review deliverables:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to fetch gate review deliverables" 
      });
    }
  });

  app.post("/api/projects/:projectId/gate-review-deliverables", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.body.phase || "define";
      
      const deliverableData = {
        ...req.body,
        projectId,
        phase
      };
      
      const validatedData = insertGateReviewDeliverableSchema.parse(deliverableData);
      const deliverable = await storage.createGateReviewDeliverable(validatedData);
      
      // Log activity if userId provided
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_gate_review_deliverable",
          details: `Created ${phase} phase gate review deliverable: ${deliverable.name}`
        });
      }
      
      return res.status(201).json({ deliverable });
    } catch (err) {
      console.error("Error creating gate review deliverable:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to create gate review deliverable" 
      });
    }
  });

  app.put("/api/gate-review-deliverables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deliverableUpdate = req.body;
      
      const deliverable = await storage.updateGateReviewDeliverable(id, deliverableUpdate);
      if (!deliverable) {
        return res.status(404).json({ message: "Gate review deliverable not found" });
      }
      
      // Log activity if userId provided
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: deliverable.projectId,
          action: "update_gate_review_deliverable",
          details: `Updated ${deliverable.phase} phase gate review deliverable: ${deliverable.name}`
        });
      }
      
      return res.status(200).json({ deliverable });
    } catch (err) {
      console.error("Error updating gate review deliverable:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to update gate review deliverable" 
      });
    }
  });

  app.delete("/api/gate-review-deliverables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the deliverable to log details before deletion
      const deliverable = await storage.getGateReviewDeliverable(id);
      if (!deliverable) {
        return res.status(404).json({ message: "Gate review deliverable not found" });
      }
      
      const deleted = await storage.deleteGateReviewDeliverable(id);
      if (!deleted) {
        return res.status(404).json({ message: "Gate review deliverable not found" });
      }
      
      // Log activity if userId provided
      if (req.query.userId) {
        await storage.createActivityLog({
          userId: parseInt(req.query.userId as string),
          projectId: deliverable.projectId,
          action: "delete_gate_review_deliverable",
          details: `Deleted ${deliverable.phase} phase gate review deliverable: ${deliverable.name}`
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error deleting gate review deliverable:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to delete gate review deliverable" 
      });
    }
  });

  // Gate Review Validators routes
  app.get("/api/projects/:projectId/gate-review-validators", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.query.phase as string || "define";
      
      const validators = await storage.getGateReviewValidators(projectId, phase);
      
      return res.status(200).json({ validators });
    } catch (err) {
      console.error("Error fetching gate review validators:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to fetch gate review validators" 
      });
    }
  });

  app.post("/api/projects/:projectId/gate-review-validators", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.body.phase || "define";
      
      const validatorData = {
        ...req.body,
        projectId,
        phase
      };
      
      const validatedData = insertGateReviewValidatorSchema.parse(validatorData);
      const validator = await storage.createGateReviewValidator(validatedData);
      
      // Log activity if userId provided
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_gate_review_validator",
          details: `Added ${phase} phase gate review validator: ${validator.validatorName} (${validator.validatorRole})`
        });
      }
      
      return res.status(201).json({ validator });
    } catch (err) {
      console.error("Error creating gate review validator:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to create gate review validator" 
      });
    }
  });

  app.put("/api/gate-review-validators/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatorUpdate = req.body;
      
      const validator = await storage.updateGateReviewValidator(id, validatorUpdate);
      if (!validator) {
        return res.status(404).json({ message: "Gate review validator not found" });
      }
      
      // Log activity if userId provided
      if (req.body.userId) {
        const statusText = validatorUpdate.status 
          ? ` with status '${validatorUpdate.status}'` 
          : '';
        
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: validator.projectId,
          action: "update_gate_review_validator",
          details: `Updated ${validator.phase} phase gate review validator: ${validator.validatorName}${statusText}`
        });
      }
      
      return res.status(200).json({ validator });
    } catch (err) {
      console.error("Error updating gate review validator:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to update gate review validator" 
      });
    }
  });

  app.delete("/api/gate-review-validators/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the validator to log details before deletion
      const validator = await storage.getGateReviewValidator(id);
      if (!validator) {
        return res.status(404).json({ message: "Gate review validator not found" });
      }
      
      const deleted = await storage.deleteGateReviewValidator(id);
      if (!deleted) {
        return res.status(404).json({ message: "Gate review validator not found" });
      }
      
      // Log activity if userId provided
      if (req.query.userId) {
        await storage.createActivityLog({
          userId: parseInt(req.query.userId as string),
          projectId: validator.projectId,
          action: "delete_gate_review_validator",
          details: `Removed ${validator.phase} phase gate review validator: ${validator.validatorName} (${validator.validatorRole})`
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error deleting gate review validator:", err);
      return res.status(500).json({ 
        error: true, 
        message: "Failed to delete gate review validator" 
      });
    }
  });
}