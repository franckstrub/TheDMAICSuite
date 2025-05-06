import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertProjectSchema, insertCharterSchema, 
  insertSipocSchema, insertRequirementSchema, insertBusinessRequirementSchema, insertDatasetSchema,
  insertPlanSchema, insertConfigSchema, insertLogSchema, insertProcessDataSchema,
  insertRiskSchema
} from "@shared/schema";
import { 
  CustomerRequirement, BusinessRequirement, DataCollectionPlan, Dataset, InsertCharter, 
  InsertConfig, InsertLog, InsertPlan, InsertProcessData, 
  InsertProject, InsertRequirement, InsertBusinessRequirement, InsertSipoc, InsertUser, InsertRisk,
  Project, ProjectBenefits, ProjectCosts, StorageConfig, ProjectCharter, ProjectRisk,
  projects, projectCharters, projectRisks
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, ne, and, or, ilike, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";

// Utility function to sync project benefits and costs from charter data
async function syncProjectBenefitsFromCharter(charter: ProjectCharter, project: Project): Promise<void> {
  try {
    // SUPER VERBOSE debugging for title synchronization issue
    console.log("--------------------------------------------------------------------------------");
    console.log("TITLE SYNC DEBUG - Charter data being processed for title sync:");
    console.log(`TITLE SYNC DEBUG - Charter ID: ${charter.id}`);
    console.log(`TITLE SYNC DEBUG - Charter projectId: ${charter.projectId}`);
    console.log(`TITLE SYNC DEBUG - Charter projectTitle: "${charter.projectTitle}"`);
    console.log(`TITLE SYNC DEBUG - Current project title: "${project.title}"`);
    console.log(`TITLE SYNC DEBUG - Charter object type: ${typeof charter}`);
    console.log(`TITLE SYNC DEBUG - Charter keys: ${Object.keys(charter)}`);
    console.log("--------------------------------------------------------------------------------");
    
    // Create or update the benefits object with the charter values
    const benefits: ProjectBenefits = project.benefits || {
      qualityCostSavings: 0,
      workingCapitalGains: 0,
      wacc: 0.1,
      fteBenefits: 0,
      avgFTECost: 100000
    };
    
    // Update the quality cost savings from savingsPerYear
    if (charter.savingsPerYear) {
      benefits.qualityCostSavings = parseFloat(charter.savingsPerYear) || 0;
    }
    
    // Update working capital gains
    if (charter.workingCapitalGains) {
      benefits.workingCapitalGains = parseFloat(charter.workingCapitalGains) || 0;
    }
    
    // Update WACC percentage
    if (charter.waccPercentage) {
      benefits.wacc = parseFloat(charter.waccPercentage) / 100 || 0.1;
    }
    
    // Update FTE benefits - handle formatted string like "0.13 FTE (€12,500)"
    if (charter.fteBenefits) {
      // Try to extract the numeric value at the beginning
      const fteMatch = charter.fteBenefits.match(/^(\d+\.?\d*)/);
      if (fteMatch && fteMatch[1]) {
        benefits.fteBenefits = parseFloat(fteMatch[1]) || 0;
        console.log(`Parsed FTE benefits from '${charter.fteBenefits}' as ${benefits.fteBenefits}`);
      } else {
        benefits.fteBenefits = 0;
        console.log(`Could not parse FTE benefits from '${charter.fteBenefits}', using 0`);
      }
    }
    
    // Update avg FTE cost
    if (charter.fteCostPerYear) {
      benefits.avgFTECost = parseFloat(charter.fteCostPerYear) || 100000;
    }
    
    // Update costs
    const costs: ProjectCosts = project.costs || {
      oneOffPeopleCost: 0,
      oneOffTechnologyCost: 0,
      oneOffOtherCost: 0,
      capexCost: 0
    };
    
    // Update one-off costs
    if (charter.oneOffPeopleCost) {
      costs.oneOffPeopleCost = parseFloat(charter.oneOffPeopleCost) || 0;
    }
    if (charter.oneOffTechnologyCost) {
      costs.oneOffTechnologyCost = parseFloat(charter.oneOffTechnologyCost) || 0;
    }
    if (charter.oneOffOtherCost) {
      costs.oneOffOtherCost = parseFloat(charter.oneOffOtherCost) || 0;
    }
    
    // Update capex costs
    if (charter.capexCost) {
      costs.capexCost = parseFloat(charter.capexCost) || 0;
    }
    
    // Get soft benefits from charter
    let softBenefits = [];
    
    // Try to get softBenefits from charter
    if (charter.softBenefits) {
      // Handle string or array type for softBenefits
      if (typeof charter.softBenefits === 'string') {
        try {
          softBenefits = JSON.parse(charter.softBenefits);
          console.log("Parsed softBenefits from string:", softBenefits);
        } catch (e) {
          console.error("Error parsing softBenefits string:", e);
          softBenefits = [];
        }
      } else if (Array.isArray(charter.softBenefits)) {
        softBenefits = charter.softBenefits;
        console.log("Using array softBenefits directly:", softBenefits);
      }
    }
    
    // No more hardcoded benefits
    if (softBenefits.length === 0) {
      console.log("No soft benefits found in charter");
    }
    
    console.log("Synchronized project soft benefits:", softBenefits);
    
    // Create project update object with benefits and costs
    const projectUpdate: Partial<Project> = {
      benefits,
      costs,
      softBenefits
    };
    
    // Also sync important fields from charter to project
    // Sync project title if provided in charter
    if (charter.projectTitle) {
      projectUpdate.title = charter.projectTitle;
      console.log("Synchronizing project title from charter to project:", charter.projectTitle);
    }
    
    // Sync project type if provided in charter
    if (charter.projectType) {
      projectUpdate.projectType = charter.projectType;
      console.log("Synchronizing project type from charter to project:", charter.projectType);
    }
    
    // Sync dates
    if (charter.startDate) {
      projectUpdate.startDate = charter.startDate;
      console.log("Synchronizing start date from charter to project:", charter.startDate);
    }
    
    if (charter.targetEndDate) {
      projectUpdate.targetEndDate = charter.targetEndDate;
      console.log("Synchronizing target end date from charter to project:", charter.targetEndDate);
    }
    
    // Update the project with all synchronized data
    await storage.updateProject(charter.projectId, projectUpdate);
    
    console.log("Synchronized project benefits:", benefits);
    console.log("Synchronized project costs:", costs);
    console.log("Synchronized project dates - startDate:", charter.startDate, "targetEndDate:", charter.targetEndDate);
  } catch (error) {
    console.error("Error synchronizing project benefits from charter:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware
  const handleErrors = (err: any, res: Response) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors
      });
    }
    
    console.error("API Error:", err);
    return res.status(500).json({
      message: "An unexpected error occurred"
    });
  };

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      await storage.updateUserLastLogin(user.id);
      
      // For simplicity, just return the user (in a real app, you'd use JWT tokens)
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({ user: userWithoutPassword });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(201).json({ user: userWithoutPassword });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      const projects = userId 
        ? await storage.getProjectsByUserId(userId) 
        : await storage.getProjects();
        
      return res.status(200).json({ projects });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      return res.status(200).json({ project });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      
      // Log activity
      await storage.createActivityLog({
        userId: projectData.createdBy,
        projectId: project.id,
        action: "create_project",
        details: `Created project: ${project.title}`
      });
      
      return res.status(201).json({ project });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const projectData = req.body as Partial<Project>;
      
      const project = await storage.updateProject(id, projectData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: project.id,
          action: "update_project",
          details: `Updated project: ${project.title}`
        });
      }
      
      return res.status(200).json({ project });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.body.userId;
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.deleteProject(id);
      
      // Log activity
      if (userId) {
        await storage.createActivityLog({
          userId,
          projectId: null,
          action: "delete_project",
          details: `Deleted project: ${project.title}`
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Project Charter routes
  app.get("/api/projects/:projectId/charter", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      // Import and use the debug helper
      const { debugGetCharter } = await import('./debughelper');
      const charter = await debugGetCharter(projectId);
      
      if (!charter) {
        return res.status(404).json({ message: "Charter not found" });
      }
      
      return res.status(200).json({ charter });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/charter", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log("Creating charter for project ID:", projectId);
      console.log("Charter request body:", req.body);
      
      // Fix cashBenefits to workingCapitalGains migration
      const requestBody = {...req.body};
      if (requestBody.cashBenefits !== undefined && requestBody.workingCapitalGains === undefined) {
        console.log("Migrating cashBenefits to workingCapitalGains");
        requestBody.workingCapitalGains = requestBody.cashBenefits;
        delete requestBody.cashBenefits;
      }
      
      // Handle WACC calculation if needed
      if (requestBody.workingCapitalGains && requestBody.waccPercentage && !requestBody.financialSavings) {
        const wcg = parseFloat(requestBody.workingCapitalGains);
        const wacc = parseFloat(requestBody.waccPercentage) / 100;
        requestBody.financialSavings = (wcg * wacc).toFixed(2);
        console.log("Calculated financialSavings:", requestBody.financialSavings);
      }
      
      const charterData: InsertCharter = {
        ...requestBody,
        projectId
      };
      
      console.log("Validating charter data structure...");
      try {
        const validatedData = insertCharterSchema.parse(charterData);
        console.log("Charter validation successful", validatedData);
        const charter = await storage.createCharter(validatedData);
        console.log("Charter created successfully:", charter);
        
        // Sync project benefits and costs from charter data
        const project = await storage.getProject(charter.projectId);
        if (project) {
          await syncProjectBenefitsFromCharter(charter, project);
        }
        
        // Log activity
        if (req.body.userId) {
          await storage.createActivityLog({
            userId: req.body.userId,
            projectId,
            action: "create_charter",
            details: "Created project charter"
          });
          console.log("Activity log created for user:", req.body.userId);
        }
        
        return res.status(201).json({ charter });
      } catch (validationError) {
        console.error("Charter validation error:", validationError);
        if (validationError instanceof ZodError) {
          return res.status(400).json({
            message: "Charter validation error",
            errors: validationError.errors
          });
        }
        throw validationError; // Re-throw if not a validation error
      }
    } catch (err) {
      console.error("Error creating charter:", err);
      return handleErrors(err, res);
    }
  });

  app.put("/api/charters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Updating charter with ID:", id);
      console.log("Charter update request body:", req.body);
      
      // DEBUG: Verbose logging for project title synchronization
      console.log("DEBUG: Project Title in update request:", req.body.projectTitle);
      console.log("DEBUG: Full request body keys:", Object.keys(req.body));
      console.log("DEBUG: Request body projectId:", req.body.projectId);
      
      // Fix cashBenefits to workingCapitalGains migration
      const requestBody = {...req.body};
      if (requestBody.cashBenefits !== undefined && requestBody.workingCapitalGains === undefined) {
        console.log("Migrating cashBenefits to workingCapitalGains");
        requestBody.workingCapitalGains = requestBody.cashBenefits;
        delete requestBody.cashBenefits;
      }
      
      // Handle WACC calculation if needed
      if (requestBody.workingCapitalGains && requestBody.waccPercentage && !requestBody.financialSavings) {
        const wcg = parseFloat(requestBody.workingCapitalGains);
        const wacc = parseFloat(requestBody.waccPercentage) / 100;
        requestBody.financialSavings = (wcg * wacc).toFixed(2);
        console.log("Calculated financialSavings:", requestBody.financialSavings);
      }
      
      // DEBUG: Ensure projectTitle is present in the request body before updating
      console.log("DEBUG: projectTitle before update:", requestBody.projectTitle);
      
      console.log("Calling storage.updateCharter...");
      const charter = await storage.updateCharter(id, requestBody);
      if (!charter) {
        console.log("Charter not found with ID:", id);
        return res.status(404).json({ message: "Charter not found" });
      }
      console.log("Charter updated successfully. Charter projectTitle:", charter.projectTitle);
      
      // Sync project benefits and costs from charter data
      const project = await storage.getProject(charter.projectId);
      if (project) {
        console.log("DEBUG: Retrieved project for sync. Current title:", project.title);
        await syncProjectBenefitsFromCharter(charter, project);
        
        // DEBUG: Verify title was updated in the project
        const updatedProject = await storage.getProject(charter.projectId);
        console.log("DEBUG: Project title after sync:", updatedProject?.title);
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: charter.projectId,
          action: "update_charter",
          details: "Updated project charter"
        });
        console.log("Activity log created for user:", req.body.userId);
      }
      
      return res.status(200).json({ charter });
    } catch (err) {
      console.error("Error updating charter:", err);
      return handleErrors(err, res);
    }
  });

  // SIPOC routes
  app.get("/api/projects/:projectId/sipoc", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const sipoc = await storage.getSipoc(projectId);
      
      if (!sipoc) {
        return res.status(404).json({ message: "SIPOC diagram not found" });
      }
      
      return res.status(200).json({ sipoc });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/sipoc", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const sipocData: InsertSipoc = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertSipocSchema.parse(sipocData);
      const sipoc = await storage.createSipoc(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_sipoc",
          details: "Created SIPOC diagram"
        });
      }
      
      return res.status(201).json({ sipoc });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/sipocs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const sipocData = req.body;
      
      // Log SIPOC update payload with explicit process name check
      console.log("SIPOC Update API - ID:", id);
      console.log("SIPOC Update API - Process Name:", sipocData.processName);
      console.log("SIPOC Update API - Has processName property:", Object.prototype.hasOwnProperty.call(sipocData, 'processName'));
      console.log("SIPOC Update API - processName type:", typeof sipocData.processName);
      console.log("SIPOC Update API - Full Payload:", JSON.stringify(sipocData, null, 2));
      
      // Ensure processName is included
      if (sipocData.processName === undefined || sipocData.processName === null) {
        console.log("⚠️ WARNING: processName is missing in SIPOC update request");
      }
      
      const sipoc = await storage.updateSipoc(id, sipocData);
      if (!sipoc) {
        return res.status(404).json({ message: "SIPOC diagram not found" });
      }
      
      // Log the updated SIPOC data
      console.log("SIPOC Update API - Updated sipoc:", sipoc);
      console.log("SIPOC Update API - Updated process name:", sipoc.processName);
      console.log("SIPOC Update API - Updated has processName property:", Object.prototype.hasOwnProperty.call(sipoc, 'processName'));
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: sipoc.projectId,
          action: "update_sipoc",
          details: "Updated SIPOC diagram"
        });
      }
      
      return res.status(200).json({ sipoc });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Customer Requirements routes
  app.get("/api/projects/:projectId/requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirements = await storage.getRequirements(projectId);
      
      return res.status(200).json({ requirements });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementData: InsertRequirement = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertRequirementSchema.parse(requirementData);
      const requirement = await storage.createRequirement(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_requirement",
          details: `Added requirement: ${requirement.requirement}`
        });
      }
      
      return res.status(201).json({ requirement });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const requirementData = req.body as Partial<CustomerRequirement>;
      
      const requirement = await storage.updateRequirement(id, requirementData);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: requirement.projectId,
          action: "update_requirement",
          details: `Updated requirement: ${requirement.requirement}`
        });
      }
      
      return res.status(200).json({ requirement });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.body.userId;
      const projectId = req.body.projectId;
      
      await storage.deleteRequirement(id);
      
      // Log activity
      if (userId && projectId) {
        await storage.createActivityLog({
          userId,
          projectId,
          action: "delete_requirement",
          details: "Deleted a requirement"
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return handleErrors(err, res);
    }
  });
  
  // Business Requirements routes
  app.get("/api/projects/:projectId/business-requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const businessRequirements = await storage.getBusinessRequirements(projectId);
      
      return res.status(200).json({ businessRequirements });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/business-requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const businessRequirementData: InsertBusinessRequirement = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertBusinessRequirementSchema.parse(businessRequirementData);
      const businessRequirement = await storage.createBusinessRequirement(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_business_requirement",
          details: `Added business requirement: ${businessRequirement.requirement}`
        });
      }
      
      return res.status(201).json({ businessRequirement });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/business-requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const businessRequirementData = req.body as Partial<BusinessRequirement>;
      
      const businessRequirement = await storage.updateBusinessRequirement(id, businessRequirementData);
      if (!businessRequirement) {
        return res.status(404).json({ message: "Business requirement not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: businessRequirement.projectId,
          action: "update_business_requirement",
          details: `Updated business requirement: ${businessRequirement.requirement}`
        });
      }
      
      return res.status(200).json({ businessRequirement });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/business-requirements/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.body.userId;
      const projectId = req.body.projectId;
      
      await storage.deleteBusinessRequirement(id);
      
      // Log activity
      if (userId && projectId) {
        await storage.createActivityLog({
          userId,
          projectId,
          action: "delete_business_requirement",
          details: "Deleted a business requirement"
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Datasets routes
  app.get("/api/datasets", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      const datasets = projectId 
        ? await storage.getDatasetsByProject(projectId) 
        : await storage.getDatasets();
        
      return res.status(200).json({ datasets });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.get("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      return res.status(200).json({ dataset });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/datasets", async (req: Request, res: Response) => {
    try {
      const datasetData = insertDatasetSchema.parse(req.body);
      const dataset = await storage.createDataset(datasetData);
      
      // Log activity
      await storage.createActivityLog({
        userId: datasetData.createdBy,
        projectId: datasetData.projectId,
        action: "create_dataset",
        details: `Created dataset: ${dataset.name}`
      });
      
      return res.status(201).json({ dataset });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const datasetData = req.body as Partial<Dataset>;
      
      const dataset = await storage.updateDataset(id, datasetData);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: dataset.projectId,
          action: "update_dataset",
          details: `Updated dataset: ${dataset.name}`
        });
      }
      
      return res.status(200).json({ dataset });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.body.userId;
      
      const dataset = await storage.getDataset(id);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      await storage.deleteDataset(id);
      
      // Log activity
      if (userId) {
        await storage.createActivityLog({
          userId,
          projectId: dataset.projectId,
          action: "delete_dataset",
          details: `Deleted dataset: ${dataset.name}`
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Data Collection Plan routes
  app.get("/api/projects/:projectId/data-collection-plans", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const plans = await storage.getDataCollectionPlans(projectId);
      
      return res.status(200).json({ plans });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/data-collection-plans", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const planData: InsertPlan = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertPlanSchema.parse(planData);
      const plan = await storage.createDataCollectionPlan(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_data_plan",
          details: `Created data collection plan for: ${plan.metric}`
        });
      }
      
      return res.status(201).json({ plan });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/data-collection-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const planData = req.body as Partial<DataCollectionPlan>;
      
      const plan = await storage.updateDataCollectionPlan(id, planData);
      if (!plan) {
        return res.status(404).json({ message: "Data collection plan not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: plan.projectId,
          action: "update_data_plan",
          details: `Updated data collection plan for: ${plan.metric}`
        });
      }
      
      return res.status(200).json({ plan });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/data-collection-plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.body.userId;
      const projectId = req.body.projectId;
      
      await storage.deleteDataCollectionPlan(id);
      
      // Log activity
      if (userId && projectId) {
        await storage.createActivityLog({
          userId,
          projectId,
          action: "delete_data_plan",
          details: "Deleted a data collection plan"
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Storage Configuration routes
  app.get("/api/users/:userId/storage-config", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const config = await storage.getStorageConfig(userId);
      
      if (!config) {
        // Return default config if none exists
        return res.status(200).json({ 
          config: {
            userId,
            cloudEnabled: true,
            cloudRegion: "US East (N. Virginia)",
            cloudRetention: "6 months",
            cloudEncryption: true,
            serverEnabled: false,
            localEnabled: false
          } 
        });
      }
      
      return res.status(200).json({ config });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/users/:userId/storage-config", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const configData: InsertConfig = {
        ...req.body,
        userId
      };
      
      const validatedData = insertConfigSchema.parse(configData);
      
      // Check if config already exists
      const existingConfig = await storage.getStorageConfig(userId);
      if (existingConfig) {
        const config = await storage.updateStorageConfig(existingConfig.id, validatedData);
        return res.status(200).json({ config });
      }
      
      const config = await storage.createStorageConfig(validatedData);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        projectId: null,
        action: "update_storage_config",
        details: "Updated storage configuration"
      });
      
      return res.status(201).json({ config });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Activity Log routes
  app.get("/api/activity-logs", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const logs = await storage.getActivityLogs(projectId);
      
      return res.status(200).json({ logs });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/activity-logs", async (req: Request, res: Response) => {
    try {
      const logData = insertLogSchema.parse(req.body);
      const log = await storage.createActivityLog(logData);
      
      return res.status(201).json({ log });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Project Risk Assessment routes
  app.get("/api/projects/:projectId/risks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const [risk] = await db.select().from(projectRisks).where(eq(projectRisks.projectId, projectId));
      
      return res.status(200).json({ risk });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/risks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const riskData = {
        ...req.body,
        projectId,
      };
      
      // Validate the risk data
      const validatedData = insertRiskSchema.parse(riskData);
      
      // Insert risk data
      const [risk] = await db.insert(projectRisks).values(validatedData).returning();
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_risk_assessment",
          details: "Created project risk assessment"
        });
      }
      
      return res.status(201).json({ risk });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/risks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const riskUpdate = req.body;
      
      // Update risk data
      const [risk] = await db
        .update(projectRisks)
        .set(riskUpdate)
        .where(eq(projectRisks.id, id))
        .returning();
      
      if (!risk) {
        return res.status(404).json({ message: "Risk assessment not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: risk.projectId,
          action: "update_risk_assessment",
          details: "Updated project risk assessment"
        });
      }
      
      return res.status(200).json({ risk });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Process Data routes
  app.get("/api/datasets/:datasetId/process-data", async (req: Request, res: Response) => {
    try {
      const datasetId = parseInt(req.params.datasetId);
      const processData = await storage.getProcessData(datasetId);
      
      if (!processData) {
        return res.status(404).json({ message: "Process data not found" });
      }
      
      return res.status(200).json({ processData });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/datasets/:datasetId/process-data", async (req: Request, res: Response) => {
    try {
      const datasetId = parseInt(req.params.datasetId);
      const processDataInput: InsertProcessData = {
        ...req.body,
        datasetId
      };
      
      const validatedData = insertProcessDataSchema.parse(processDataInput);
      const processData = await storage.createProcessData(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: processData.projectId,
          action: "upload_process_data",
          details: "Uploaded process data"
        });
      }
      
      return res.status(201).json({ processData });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/process-data/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const processDataUpdate = req.body;
      
      const processData = await storage.updateProcessData(id, processDataUpdate);
      if (!processData) {
        return res.status(404).json({ message: "Process data not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: processData.projectId,
          action: "update_process_data",
          details: "Updated process data"
        });
      }
      
      return res.status(200).json({ processData });
    } catch (err) {
      return handleErrors(err, res);
    }
  });
  
  // RACI Matrix routes
  app.get("/api/projects/:projectId/raci-matrix", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const raciMatrix = await storage.getRaciMatrix(projectId);
      
      if (!raciMatrix) {
        return res.status(404).json({ message: "RACI matrix not found" });
      }
      
      return res.status(200).json({ raciMatrix });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/raci-matrix", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const raciMatrixInput: InsertRaciMatrix = {
        ...req.body,
        projectId
      };
      
      const validatedData = insertRaciSchema.parse(raciMatrixInput);
      const raciMatrix = await storage.createRaciMatrix(validatedData);
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_raci_matrix",
          details: "Created RACI matrix"
        });
      }
      
      return res.status(201).json({ raciMatrix });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/raci-matrix/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const raciMatrixUpdate = req.body;
      
      const raciMatrix = await storage.updateRaciMatrix(id, raciMatrixUpdate);
      if (!raciMatrix) {
        return res.status(404).json({ message: "RACI matrix not found" });
      }
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: raciMatrix.projectId,
          action: "update_raci_matrix",
          details: "Updated RACI matrix"
        });
      }
      
      return res.status(200).json({ raciMatrix });
    } catch (err) {
      return handleErrors(err, res);
    }
  });
  
  // Debug route for project data
  app.get("/api/debug/project/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      const charter = await storage.getCharter(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      return res.status(200).json({ 
        project,
        charter,
        softBenefitsInProject: project.softBenefits,
        softBenefitsInCharter: charter?.softBenefits
      });
    } catch (err) {
      return handleErrors(err, res);
    }
  });
  
  // Fix soft benefits route
  app.post("/api/fix-soft-benefits/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log("Fixing soft benefits for project:", projectId);
      
      const project = await storage.getProject(projectId);
      const charter = await storage.getCharter(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (!charter) {
        return res.status(404).json({ message: "Charter not found" });
      }
      
      // Manually set the softBenefits for this project
      let softBenefits = [
        {
          category: "employee",
          text: "Less rework which is a toughh manual jobb"
        }
      ];
      
      // Update the project with the soft benefits
      console.log("Updating project with soft benefits:", softBenefits);
      const updatedProject = await storage.updateProject(projectId, {
        softBenefits
      });
      
      return res.status(200).json({ 
        message: "Soft benefits fixed successfully",
        project: updatedProject
      });
    } catch (err) {
      console.error("Error fixing soft benefits:", err);
      return handleErrors(err, res);
    }
  });
  
  // Endpoint to force sync project benefits and costs from charter
  app.post("/api/sync-project-benefits/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log("Syncing project benefits for project:", projectId);
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the charter
      const charter = await storage.getCharter(projectId);
      if (!charter) {
        return res.status(404).json({ message: "Charter not found" });
      }
      
      console.log("Charter fteBenefits:", charter.fteBenefits);
      
      // Sync project benefits and costs from charter data
      await syncProjectBenefitsFromCharter(charter, project);
      
      // Get the updated project to return
      const updatedProject = await storage.getProject(projectId);
      
      return res.status(200).json({ 
        message: "Successfully synchronized project benefits and costs from charter",
        project: updatedProject
      });
    } catch (err) {
      console.error("Error syncing project benefits:", err);
      return handleErrors(err, res);
    }
  });

  // Add a new route to sync project type from charter
  app.post("/api/sync-project-type/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      console.log(`Syncing project type for project ${projectId}`);
      
      // Get the project directly from the database
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log(`Current project type: ${project.projectType}`);
      
      // Get the charter directly from the database
      const [charter] = await db
        .select()
        .from(projectCharters)
        .where(eq(projectCharters.projectId, projectId))
        .orderBy(desc(projectCharters.id))
        .limit(1);
        
      if (!charter) {
        return res.status(404).json({ message: "Project charter not found" });
      }
      
      console.log(`Charter project type: ${charter.projectType}`);
      
      // Update project type in the database
      if (charter.projectType) {
        const [updatedProject] = await db
          .update(projects)
          .set({
            projectType: charter.projectType,
            lastUpdated: new Date()
          })
          .where(eq(projects.id, projectId))
          .returning();
          
        console.log(`Project type updated to ${updatedProject.projectType}`);
        
        return res.status(200).json({
          message: "Project type synchronized successfully",
          project: updatedProject
        });
      } else {
        return res.status(400).json({
          message: "No project type found in charter"
        });
      }
    } catch (err) {
      console.error("Error syncing project type:", err);
      return handleErrors(err, res);
    }
  });

  // Create http server
  const httpServer = createServer(app);
  return httpServer;
}
