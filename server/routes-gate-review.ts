import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { insertGateReviewDeliverableSchema, insertGateReviewValidatorSchema } from '@shared/schema';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

// Create upload middleware with size limit of 10MB
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function registerGateReviewRoutes(app: Express, dbStorage: any) {
  // Gate Review Deliverables Routes
  app.get("/api/projects/:projectId/gate-review-deliverables", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const phase = req.query.phase as string || 'define'; // Default to define phase if not specified
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const deliverables = await dbStorage.getGateReviewDeliverables(projectId, phase);
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
      
      // Get user's organization ID
      const user = req.user as any;
      const organizationId = user?.organizationId || 1; // Fallback to default org
      
      const validatedData = insertGateReviewDeliverableSchema.parse({
        ...req.body,
        projectId,
        organizationId
      });
      
      const deliverable = await dbStorage.createGateReviewDeliverable(validatedData);
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
      
      const deliverable = await dbStorage.getGateReviewDeliverable(id);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      
      const updatedDeliverable = await dbStorage.updateGateReviewDeliverable(id, req.body);
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
      
      const deliverable = await dbStorage.getGateReviewDeliverable(id);
      if (!deliverable) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      
      const success = await dbStorage.deleteGateReviewDeliverable(id);
      
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
      
      const validators = await dbStorage.getGateReviewValidators(projectId, phase);
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
      
      // Get user's organization ID
      const user = req.user as any;
      const organizationId = user?.organizationId || 1; // Fallback to default org
      
      const validatedData = insertGateReviewValidatorSchema.parse({
        ...req.body,
        projectId,
        organizationId
      });
      
      const validator = await dbStorage.createGateReviewValidator(validatedData);
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
      
      const validator = await dbStorage.getGateReviewValidator(id);
      if (!validator) {
        return res.status(404).json({ error: "Validator not found" });
      }
      
      const updatedValidator = await dbStorage.updateGateReviewValidator(id, req.body);
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
      
      const validator = await dbStorage.getGateReviewValidator(id);
      if (!validator) {
        return res.status(404).json({ error: "Validator not found" });
      }
      
      const success = await dbStorage.deleteGateReviewValidator(id);
      
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

  // File upload endpoint for gate review deliverables
  app.post("/api/projects/:projectId/deliverable-file-upload", upload.single('file'), async (req: Request, res: Response) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded" });
      }
      
      const projectId = parseInt(req.params.projectId);
      const deliverableId = req.body.deliverableId ? parseInt(req.body.deliverableId) : null;
      
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      // If deliverableId is provided, this is an update to an existing deliverable
      if (deliverableId && !isNaN(deliverableId)) {
        const deliverable = await dbStorage.getGateReviewDeliverable(deliverableId);
        
        if (!deliverable) {
          return res.status(404).json({ error: "Deliverable not found" });
        }
        
        // Update the deliverable with file information
        const updatedDeliverable = await dbStorage.updateGateReviewDeliverable(deliverableId, {
          fileAttachment: req.file.path,
          fileOriginalName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype
        });
        
        res.json({ 
          success: true, 
          deliverable: updatedDeliverable,
          file: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      } else {
        // This is just uploading a file without attaching to a deliverable yet
        res.json({ 
          success: true, 
          file: {
            path: req.file.path,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // File download endpoint
  app.get("/api/deliverable-file/:deliverableId", async (req: Request, res: Response) => {
    try {
      const deliverableId = parseInt(req.params.deliverableId);
      
      if (isNaN(deliverableId)) {
        return res.status(400).json({ error: "Invalid deliverable ID" });
      }
      
      const deliverable = await dbStorage.getGateReviewDeliverable(deliverableId);
      
      if (!deliverable || !deliverable.fileAttachment) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Send the file
      res.download(deliverable.fileAttachment, deliverable.fileOriginalName || 'download');
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });
}