import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertProjectSchema, insertCharterSchema, 
  insertSipocSchema, insertRequirementSchema, insertBusinessRequirementSchema, insertDatasetSchema,
  insertPlanSchema, insertConfigSchema, insertLogSchema, insertProcessDataSchema,
  insertRiskSchema, insertRaciSchema, insertGanttTaskSchema,
  insertStakeholderAnalysisItemSchema, insertMsaAnalysisSchema, insertProcessCapabilitySchema
} from "@shared/schema";
import { 
  CustomerRequirement, BusinessRequirement, DataCollectionPlan, Dataset, InsertCharter, 
  InsertConfig, InsertLog, InsertPlan, InsertProcessData, 
  InsertProject, InsertRequirement, InsertBusinessRequirement, InsertSipoc, InsertRisk,
  InsertRaciMatrix, Project, ProjectBenefits, ProjectCosts, StorageConfig, ProjectCharter, ProjectRisk,
  projects, projectCharters, projectRisks, InsertGanttTask, GanttTask, stakeholderAnalysisItems,
  processMaps, ctsCharacteristics, insertCtsCharacteristicsSchema,
  customerRequirements, businessRequirements, msaAnalysis, processCapability
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, ne, and, or, ilike, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
// Using Google AI for mitigation plan, elevator speech, and engagement strategy generation
import { generateMitigationPlan, generateElevatorSpeech, generateEngagementStrategy } from "./googleai";
import { registerGateReviewRoutes } from "./routes-gate-review";
import { registerGanttRoutes } from "./routes-gantt";
import { permanentlyDeleteProject, cleanupOrphanedProjectData } from "./cascade-project-delete";

// Fallback engagement strategy generator
function generateFallbackEngagementStrategy(
  interestLevel: string,
  influenceLevel: string,
  supportLevel: string,
  resistanceType?: string
): string {
  const strategies = [];
  
  // Strategy based on influence and interest
  if (influenceLevel === 'High' && interestLevel === 'High') {
    strategies.push("• Schedule regular one-on-one meetings");
    strategies.push("• Involve in key decision-making processes");
    strategies.push("• Provide detailed progress updates");
  } else if (influenceLevel === 'High' && interestLevel === 'Medium') {
    strategies.push("• Keep informed with executive summaries");
    strategies.push("• Schedule periodic check-ins");
  } else if (influenceLevel === 'High' && interestLevel === 'Low') {
    strategies.push("• Provide high-level status updates");
    strategies.push("• Monitor for any concerns");
  } else if (influenceLevel === 'Medium') {
    strategies.push("• Include in team communications");
    strategies.push("• Seek input on relevant decisions");
  } else {
    strategies.push("• Keep informed through regular updates");
    strategies.push("• Monitor satisfaction levels");
  }
  
  // Additional strategy based on support level
  if (supportLevel === 'Supportive') {
    strategies.push("• Leverage as project champion");
    strategies.push("• Use for stakeholder advocacy");
  } else if (supportLevel === 'Resistant') {
    strategies.push(`• Address ${resistanceType?.toLowerCase() || 'resistance'} concerns directly`);
    strategies.push("• Provide clear benefit explanations");
    strategies.push("• Schedule focused discussion sessions");
  }
  
  return strategies.join('\n');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/profile-pictures';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const userId = (req as any).user?.claims?.sub || 'user';
      const ext = path.extname(file.originalname);
      cb(null, `profile-${userId}-${Date.now()}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

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
  // Set up authentication middleware
  await setupAuth(app);

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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = req.body;
      
      console.log("Profile update request:", { userId, updateData });
      
      // Validate the update data
      const allowedFields = ['firstName', 'lastName', 'phone', 'phoneCountryCode', 'companyName', 'billingAddress'];
      const filteredData: any = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }
      
      console.log("Filtered data for update:", filteredData);
      
      const updatedUser = await storage.updateUser(userId, filteredData);
      console.log("Update result:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/auth/upload-profile-image', isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Generate the URL for the uploaded file without timestamp to avoid caching issues
      const imageUrl = `/uploads/profile-pictures/${req.file.filename}`;
      
      // Update user's profile image URL in the database
      const updatedUser = await storage.updateUser(userId, { 
        profileImageUrl: imageUrl 
      });
      
      console.log(`Profile image updated for user ${userId}: ${imageUrl}`);
      res.json({ 
        message: "Profile image updated successfully",
        profileImageUrl: imageUrl,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log(`Login attempt for username: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`User not found: ${username}`);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      if (user.password !== password) {
        console.log(`Password mismatch for user: ${username}`);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      console.log(`Successful login for user: ${username}`);
      await storage.updateUserLastLogin(user.id);
      
      // For simplicity, just return the user (in a real app, you'd use JWT tokens)
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({ user: userWithoutPassword });
    } catch (err) {
      console.error("Login error:", err);
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
  app.get("/api/projects", isAuthenticated, async (req: any, res: Response) => {
    try {
      const authenticatedUserId = req.user.claims.sub;
      const projects = await storage.getProjectsByCreatedBy(authenticatedUserId);
        
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
      
      // First use cascade deletion to remove all project-related data
      console.log(`Starting cascade deletion for project ${id}: ${project.title}`);
      const tablesAffected = await permanentlyDeleteProject(id);
      console.log(`Cascade deletion completed. Affected ${tablesAffected} tables.`);
      
      // Then delete the project itself
      await storage.deleteProject(id);
      console.log(`Project ${id} successfully deleted from the projects table.`);
      
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
          details: `Created data collection plan for: ${plan.ctq}`
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
          details: `Updated data collection plan for: ${plan.ctq}`
        });
      }
      
      return res.status(200).json({ plan });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/projects/:projectId/data-collection-plans", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      await storage.deleteAllDataCollectionPlans(projectId);
      
      return res.status(200).json({ success: true });
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
      
      if (risk) {
        // Ensure all text fields are properly returned as empty strings if null
        // This helps with frontend display and prevents issues with optional chaining
        const sanitizedRisk = {
          ...risk,
          mitigationPlan: risk.mitigationPlan || '',
          mitigationPlan2: risk.mitigationPlan2 || '',
          mitigationPlan3: risk.mitigationPlan3 || '',
          mitigationPlan4: risk.mitigationPlan4 || '',
          mitigationPlan5: risk.mitigationPlan5 || '',
          mitigationPlan6: risk.mitigationPlan6 || '',
          riskName: risk.riskName || '',
          riskName2: risk.riskName2 || '',
          riskName3: risk.riskName3 || '',
          riskName4: risk.riskName4 || '',
          riskName5: risk.riskName5 || '',
          riskName6: risk.riskName6 || '',
          riskOwner: risk.riskOwner || '',
          riskOwner2: risk.riskOwner2 || '',
          riskOwner3: risk.riskOwner3 || '',
          riskOwner4: risk.riskOwner4 || '',
          riskOwner5: risk.riskOwner5 || '',
          riskOwner6: risk.riskOwner6 || '',
          probability: risk.probability || 'Low',
          probability2: risk.probability2 || 'Low',
          probability3: risk.probability3 || 'Low',
          probability4: risk.probability4 || 'Low',
          probability5: risk.probability5 || 'Low',
          probability6: risk.probability6 || 'Low',
          impact: risk.impact || 'Low',
          impact2: risk.impact2 || 'Low',
          impact3: risk.impact3 || 'Low',
          impact4: risk.impact4 || 'Low',
          impact5: risk.impact5 || 'Low',
          impact6: risk.impact6 || 'Low',
          riskCriticality: risk.riskCriticality || 1,
          riskCriticality2: risk.riskCriticality2 || 1,
          riskCriticality3: risk.riskCriticality3 || 1,
          riskCriticality4: risk.riskCriticality4 || 1,
          riskCriticality5: risk.riskCriticality5 || 1,
          riskCriticality6: risk.riskCriticality6 || 1,
        };
        
        // NEW: Calculate exactly how many rows have actual content
        let rowsWithContent = 0;
        const nonEmptyFields = [
          // Row 1
          sanitizedRisk.riskName?.trim().length > 0,
          sanitizedRisk.mitigationPlan?.trim().length > 0,
          sanitizedRisk.riskOwner?.trim().length > 0,
          // Row 2
          sanitizedRisk.riskName2?.trim().length > 0,
          sanitizedRisk.mitigationPlan2?.trim().length > 0,
          sanitizedRisk.riskOwner2?.trim().length > 0,
          // Row 3
          sanitizedRisk.riskName3?.trim().length > 0,
          sanitizedRisk.mitigationPlan3?.trim().length > 0,
          sanitizedRisk.riskOwner3?.trim().length > 0,
          // Row 4
          sanitizedRisk.riskName4?.trim().length > 0,
          sanitizedRisk.mitigationPlan4?.trim().length > 0,
          sanitizedRisk.riskOwner4?.trim().length > 0,
          // Row 5
          sanitizedRisk.riskName5?.trim().length > 0,
          sanitizedRisk.mitigationPlan5?.trim().length > 0,
          sanitizedRisk.riskOwner5?.trim().length > 0,
          // Row 6
          sanitizedRisk.riskName6?.trim().length > 0,
          sanitizedRisk.mitigationPlan6?.trim().length > 0,
          sanitizedRisk.riskOwner6?.trim().length > 0,
        ];
        
        // Group non-empty fields by row
        if (nonEmptyFields[0] || nonEmptyFields[1] || nonEmptyFields[2]) rowsWithContent = Math.max(rowsWithContent, 1);
        if (nonEmptyFields[3] || nonEmptyFields[4] || nonEmptyFields[5]) rowsWithContent = Math.max(rowsWithContent, 2);
        if (nonEmptyFields[6] || nonEmptyFields[7] || nonEmptyFields[8]) rowsWithContent = Math.max(rowsWithContent, 3);
        if (nonEmptyFields[9] || nonEmptyFields[10] || nonEmptyFields[11]) rowsWithContent = Math.max(rowsWithContent, 4);
        if (nonEmptyFields[12] || nonEmptyFields[13] || nonEmptyFields[14]) rowsWithContent = Math.max(rowsWithContent, 5);
        if (nonEmptyFields[15] || nonEmptyFields[16] || nonEmptyFields[17]) rowsWithContent = Math.max(rowsWithContent, 6);
        
        console.log(`Server detected ${rowsWithContent} rows with actual content`);
        console.log('Sanitized risk data being returned:', {
          mitigationPlan: sanitizedRisk.mitigationPlan.substring(0, 30) + '...',
          mitigationPlan2: sanitizedRisk.mitigationPlan2.substring(0, 30) + '...',
        });
        
        return res.status(200).json({ 
          risk: sanitizedRisk, 
          rowsWithContent: rowsWithContent 
        });
      } else {
        return res.status(200).json({ risk: null, rowsWithContent: 0 });
      }
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/risks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Extract and sanitize fields that we want to save
      const sanitizedRiskData = {
        projectId,
        // Ensure all text fields are defined with empty strings if null or undefined
        mitigationPlan: req.body.mitigationPlan || '',
        mitigationPlan2: req.body.mitigationPlan2 || '',
        mitigationPlan3: req.body.mitigationPlan3 || '',
        mitigationPlan4: req.body.mitigationPlan4 || '',
        mitigationPlan5: req.body.mitigationPlan5 || '',
        mitigationPlan6: req.body.mitigationPlan6 || '',
        riskName: req.body.riskName || '',
        riskName2: req.body.riskName2 || '',
        riskName3: req.body.riskName3 || '',
        riskName4: req.body.riskName4 || '',
        riskName5: req.body.riskName5 || '',
        riskName6: req.body.riskName6 || '',
        riskOwner: req.body.riskOwner || '',
        riskOwner2: req.body.riskOwner2 || '',
        riskOwner3: req.body.riskOwner3 || '',
        riskOwner4: req.body.riskOwner4 || '',
        riskOwner5: req.body.riskOwner5 || '',
        riskOwner6: req.body.riskOwner6 || '',
        probability: req.body.probability || 'Low',
        probability2: req.body.probability2 || 'Low',
        probability3: req.body.probability3 || 'Low',
        probability4: req.body.probability4 || 'Low',
        probability5: req.body.probability5 || 'Low',
        probability6: req.body.probability6 || 'Low',
        impact: req.body.impact || 'Low',
        impact2: req.body.impact2 || 'Low',
        impact3: req.body.impact3 || 'Low',
        impact4: req.body.impact4 || 'Low',
        impact5: req.body.impact5 || 'Low',
        impact6: req.body.impact6 || 'Low',
        riskCriticality: req.body.riskCriticality || 1,
        riskCriticality2: req.body.riskCriticality2 || 1,
        riskCriticality3: req.body.riskCriticality3 || 1,
        riskCriticality4: req.body.riskCriticality4 || 1,
        riskCriticality5: req.body.riskCriticality5 || 1,
        riskCriticality6: req.body.riskCriticality6 || 1,
        // Always use the current date for lastUpdated
        lastUpdated: new Date(),
      };
      
      console.log('Sanitized risk creation data:', {
        mitigationPlan: sanitizedRiskData.mitigationPlan.substring(0, 30) + '...',
        mitigationPlan2: sanitizedRiskData.mitigationPlan2 ? sanitizedRiskData.mitigationPlan2.substring(0, 30) + '...' : 'empty',
      });
      
      // Validate the risk data
      const validatedData = insertRiskSchema.parse(sanitizedRiskData);
      
      // Insert risk data
      const [risk] = await db.insert(projectRisks).values(validatedData).returning();
      
      // Further sanitize the response for consistent handling on the client side
      const sanitizedRisk = {
        ...risk,
        mitigationPlan: risk.mitigationPlan || '',
        mitigationPlan2: risk.mitigationPlan2 || '',
        mitigationPlan3: risk.mitigationPlan3 || '',
        mitigationPlan4: risk.mitigationPlan4 || '',
        mitigationPlan5: risk.mitigationPlan5 || '',
        mitigationPlan6: risk.mitigationPlan6 || '',
        riskName: risk.riskName || '',
        riskName2: risk.riskName2 || '',
        riskName3: risk.riskName3 || '',
        riskName4: risk.riskName4 || '',
        riskName5: risk.riskName5 || '',
        riskName6: risk.riskName6 || '',
        riskOwner: risk.riskOwner || '',
        riskOwner2: risk.riskOwner2 || '',
        riskOwner3: risk.riskOwner3 || '',
        riskOwner4: risk.riskOwner4 || '',
        riskOwner5: risk.riskOwner5 || '',
        riskOwner6: risk.riskOwner6 || '',
        probability: risk.probability || 'Low',
        probability2: risk.probability2 || 'Low',
        probability3: risk.probability3 || 'Low',
        probability4: risk.probability4 || 'Low',
        probability5: risk.probability5 || 'Low',
        probability6: risk.probability6 || 'Low',
        impact: risk.impact || 'Low',
        impact2: risk.impact2 || 'Low',
        impact3: risk.impact3 || 'Low',
        impact4: risk.impact4 || 'Low',
        impact5: risk.impact5 || 'Low',
        impact6: risk.impact6 || 'Low',
        riskCriticality: risk.riskCriticality || 1,
        riskCriticality2: risk.riskCriticality2 || 1,
        riskCriticality3: risk.riskCriticality3 || 1,
        riskCriticality4: risk.riskCriticality4 || 1,
        riskCriticality5: risk.riskCriticality5 || 1,
        riskCriticality6: risk.riskCriticality6 || 1,
      };
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId,
          action: "create_risk_assessment",
          details: "Created project risk assessment"
        });
      }
      
      return res.status(201).json({ risk: sanitizedRisk });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/risks/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Pre-sanitize risk update data to ensure all string fields are properly defined
      // This prevents issues with NULL values in text fields
      // Extract fields we want to update and ensure they have default values
      const riskUpdate = {
        mitigationPlan: req.body.mitigationPlan || '',
        mitigationPlan2: req.body.mitigationPlan2 || '',
        mitigationPlan3: req.body.mitigationPlan3 || '',
        mitigationPlan4: req.body.mitigationPlan4 || '',
        mitigationPlan5: req.body.mitigationPlan5 || '',
        mitigationPlan6: req.body.mitigationPlan6 || '',
        riskName: req.body.riskName || '',
        riskName2: req.body.riskName2 || '',
        riskName3: req.body.riskName3 || '', 
        riskName4: req.body.riskName4 || '',
        riskName5: req.body.riskName5 || '',
        riskName6: req.body.riskName6 || '',
        riskOwner: req.body.riskOwner || '',
        riskOwner2: req.body.riskOwner2 || '',
        riskOwner3: req.body.riskOwner3 || '',
        riskOwner4: req.body.riskOwner4 || '',
        riskOwner5: req.body.riskOwner5 || '',
        riskOwner6: req.body.riskOwner6 || '',
        projectId: req.body.projectId,
        probability: req.body.probability || 'Low',
        probability2: req.body.probability2 || 'Low',
        probability3: req.body.probability3 || 'Low',
        probability4: req.body.probability4 || 'Low',
        probability5: req.body.probability5 || 'Low',
        probability6: req.body.probability6 || 'Low',
        impact: req.body.impact || 'Low',
        impact2: req.body.impact2 || 'Low',
        impact3: req.body.impact3 || 'Low',
        impact4: req.body.impact4 || 'Low',
        impact5: req.body.impact5 || 'Low',
        impact6: req.body.impact6 || 'Low',
        riskCriticality: req.body.riskCriticality || 1,
        riskCriticality2: req.body.riskCriticality2 || 1,
        riskCriticality3: req.body.riskCriticality3 || 1,
        riskCriticality4: req.body.riskCriticality4 || 1,
        riskCriticality5: req.body.riskCriticality5 || 1,
        riskCriticality6: req.body.riskCriticality6 || 1,
        // Use current timestamp for lastUpdated instead of client-sent value
        lastUpdated: new Date(),
      };
      
      console.log('Sanitized risk update data:', {
        mitigationPlan: riskUpdate.mitigationPlan.substring(0, 30) + '...',
        mitigationPlan2: riskUpdate.mitigationPlan2.substring(0, 30) + '...',
      });
      
      // Update risk data
      const [risk] = await db
        .update(projectRisks)
        .set(riskUpdate)
        .where(eq(projectRisks.id, id))
        .returning();
      
      if (!risk) {
        return res.status(404).json({ message: "Risk assessment not found" });
      }
      
      // Further sanitize the response to ensure consistency
      const sanitizedRisk = {
        ...risk,
        mitigationPlan: risk.mitigationPlan || '',
        mitigationPlan2: risk.mitigationPlan2 || '',
        mitigationPlan3: risk.mitigationPlan3 || '',
        mitigationPlan4: risk.mitigationPlan4 || '',
        mitigationPlan5: risk.mitigationPlan5 || '',
        mitigationPlan6: risk.mitigationPlan6 || '',
        riskName: risk.riskName || '',
        riskName2: risk.riskName2 || '',
        riskName3: risk.riskName3 || '',
        riskName4: risk.riskName4 || '',
        riskName5: risk.riskName5 || '',
        riskName6: risk.riskName6 || '',
        riskOwner: risk.riskOwner || '',
        riskOwner2: risk.riskOwner2 || '',
        riskOwner3: risk.riskOwner3 || '',
        riskOwner4: risk.riskOwner4 || '',
        riskOwner5: risk.riskOwner5 || '',
        riskOwner6: risk.riskOwner6 || '',
        probability: risk.probability || 'Low',
        probability2: risk.probability2 || 'Low',
        probability3: risk.probability3 || 'Low',
        probability4: risk.probability4 || 'Low',
        probability5: risk.probability5 || 'Low',
        probability6: risk.probability6 || 'Low',
        impact: risk.impact || 'Low',
        impact2: risk.impact2 || 'Low',
        impact3: risk.impact3 || 'Low',
        impact4: risk.impact4 || 'Low',
        impact5: risk.impact5 || 'Low',
        impact6: risk.impact6 || 'Low',
        riskCriticality: risk.riskCriticality || 1,
        riskCriticality2: risk.riskCriticality2 || 1,
        riskCriticality3: risk.riskCriticality3 || 1,
        riskCriticality4: risk.riskCriticality4 || 1,
        riskCriticality5: risk.riskCriticality5 || 1,
        riskCriticality6: risk.riskCriticality6 || 1,
      };
      
      // Log activity
      if (req.body.userId) {
        await storage.createActivityLog({
          userId: req.body.userId,
          projectId: risk.projectId,
          action: "update_risk_assessment",
          details: "Updated project risk assessment"
        });
      }
      
      return res.status(200).json({ risk: sanitizedRisk });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Risk Mitigation Plan Generation with Claude AI
  app.post("/api/generate-mitigation-plan", async (req: Request, res: Response) => {
    try {
      const { riskName, probability, impact } = req.body;
      
      if (!riskName) {
        return res.status(400).json({ 
          message: "Risk name is required to generate a mitigation plan" 
        });
      }
      
      // Default values for probability and impact if not provided
      const probValue = probability || 'Low';
      const impactValue = impact || 'Low';
      
      // Generate the mitigation plan using Google AI
      try {
        const mitigationPlan = await generateMitigationPlan(
          riskName,
          probValue,
          impactValue
        );
        
        return res.status(200).json({ mitigationPlan });
      } catch (apiError: any) {
        console.error("Google AI API error:", apiError);
        return res.status(500).json({ 
          error: true,
          message: `Google AI error: ${apiError.message || 'Unknown error'}`,
          details: "Make sure you have a valid GOOGLE_API_KEY set in your environment"
        });
      }
    } catch (err) {
      console.error("Error generating mitigation plan:", err);
      return handleErrors(err, res);
    }
  });
  
  // Elevator Speech Generation with Claude AI
  app.post("/api/generate-elevator-speech", async (req: Request, res: Response) => {
    try {
      const { projectId, userId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ 
          message: "Project ID is required to generate an elevator speech" 
        });
      }
      
      console.log(`Generating elevator speech for project ID: ${projectId}`);
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Retrieve project charter data for context
      const charter = await storage.getCharter(projectId);
      if (!charter) {
        return res.status(404).json({ 
          message: "Project charter not found. Please complete the project charter first." 
        });
      }
      
      // Generate the elevator speech using Google AI
      try {
        const elevatorSpeech = await generateElevatorSpeech(
          charter.projectTitle || project.title,
          charter.problemStatement || "No problem statement provided",
          charter.goals || "No goals provided", 
          charter.businessCase || "No business case provided"
        );
        
        // Save the elevator speech to the project (not charter)
        await storage.updateProject(projectId, {
          elevatorSpeech
        });
        
        // Log activity if userId provided
        if (userId) {
          await storage.createActivityLog({
            userId,
            projectId,
            action: "generate_elevator_speech",
            details: "Generated elevator speech using AI"
          });
        }
        
        return res.status(200).json({ elevatorSpeech });
      } catch (apiError: any) {
        console.error("Google AI API error:", apiError);
        return res.status(500).json({ 
          error: true,
          message: `Google AI error: ${apiError.message || 'Unknown error'}`,
          details: "Make sure you have a valid GOOGLE_AI_API_KEY set in your environment"
        });
      }
    } catch (err) {
      console.error("Error generating elevator speech:", err);
      return handleErrors(err, res);
    }
  });
  
  // Save Elevator Speech
  app.post("/api/projects/:projectId/elevator-speech", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { elevatorSpeech, userId } = req.body;
      
      // Allow empty elevator speech (just passing through)
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Update the project with the elevator speech
      await storage.updateProject(projectId, {
        elevatorSpeech
      });
      
      // Log activity if userId provided
      if (userId) {
        await storage.createActivityLog({
          userId,
          projectId,
          action: "save_elevator_speech",
          details: "Saved elevator speech in Define phase"
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: "Elevator speech saved successfully" 
      });
    } catch (err) {
      console.error("Error saving elevator speech:", err);
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
      
      // Check if a RACI matrix already exists for this project
      const existingMatrix = await storage.getRaciMatrix(projectId);
      let raciMatrix;
      let isUpdate = false;
      
      if (existingMatrix) {
        // Update existing matrix
        isUpdate = true;
        raciMatrix = await storage.updateRaciMatrix(existingMatrix.id, {
          raciData: validatedData.raciData
        });
        
        // Log activity
        if (req.body.userId) {
          await storage.createActivityLog({
            userId: req.body.userId,
            projectId,
            action: "update_raci_matrix",
            details: "Updated RACI matrix"
          });
        }
      } else {
        // Create new matrix
        raciMatrix = await storage.createRaciMatrix(validatedData);
        
        // Log activity
        if (req.body.userId) {
          await storage.createActivityLog({
            userId: req.body.userId,
            projectId,
            action: "create_raci_matrix",
            details: "Created RACI matrix"
          });
        }
      }
      
      return res.status(201).json({ raciMatrix, isUpdate });
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

  // Stakeholder Analysis Matrix routes
  app.get("/api/projects/:projectId/stakeholder-analysis", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const items = await db.select().from(stakeholderAnalysisItems).where(eq(stakeholderAnalysisItems.projectId, projectId));
      
      return res.status(200).json({ items });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/stakeholder-analysis", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const analysisData = {
        ...req.body,
        projectId,
      };
      
      // Validate the stakeholder analysis data
      const validatedData = insertStakeholderAnalysisItemSchema.parse(analysisData);
      
      // Insert the item
      const [newItem] = await db
        .insert(stakeholderAnalysisItems)
        .values([validatedData])
        .returning();
      
      return res.status(201).json({ item: newItem });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/stakeholder-analysis/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Check if the item exists
      const [existingItem] = await db
        .select()
        .from(stakeholderAnalysisItems)
        .where(eq(stakeholderAnalysisItems.id, id));
      
      if (!existingItem) {
        return res.status(404).json({ message: "Stakeholder analysis item not found" });
      }
      
      // Update the item
      const [updatedItem] = await db
        .update(stakeholderAnalysisItems)
        .set({
          ...updateData,
          lastUpdated: new Date(),
        })
        .where(eq(stakeholderAnalysisItems.id, id))
        .returning();
      
      return res.status(200).json({ item: updatedItem });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.delete("/api/stakeholder-analysis/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if the item exists
      const [existingItem] = await db
        .select()
        .from(stakeholderAnalysisItems)
        .where(eq(stakeholderAnalysisItems.id, id));
      
      if (!existingItem) {
        return res.status(404).json({ message: "Stakeholder analysis item not found" });
      }
      
      // Delete the item
      await db
        .delete(stakeholderAnalysisItems)
        .where(eq(stakeholderAnalysisItems.id, id));
      
      return res.status(200).json({ message: "Stakeholder analysis item deleted successfully" });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Generate engagement strategy for stakeholder analysis
  app.post("/api/generate-engagement-strategy", async (req: Request, res: Response) => {
    try {
      const { stakeholderName, stakeholderRole, interestLevel, influenceLevel, supportLevel, resistanceType, userId } = req.body;
      
      // Validate required fields
      if (!stakeholderName || !stakeholderRole || !interestLevel || !influenceLevel || !supportLevel) {
        return res.status(400).json({ 
          message: "Missing required fields: stakeholderName, stakeholderRole, interestLevel, influenceLevel, supportLevel" 
        });
      }
      
      console.log(`Generating engagement strategy for stakeholder: ${stakeholderName}`);
      
      // Generate the engagement strategy using Google AI
      try {
        const engagementStrategy = await generateEngagementStrategy(
          stakeholderName,
          stakeholderRole,
          interestLevel,
          influenceLevel,
          supportLevel,
          resistanceType
        );
        
        // Log activity if userId provided
        if (userId) {
          await storage.createActivityLog({
            userId,
            projectId: null,
            action: "generate_engagement_strategy",
            details: `Generated engagement strategy for stakeholder: ${stakeholderName}`
          });
        }
        
        return res.status(200).json({ engagementStrategy });
      } catch (apiError: any) {
        console.error("Google AI API error:", apiError);
        
        // Provide fallback strategy based on stakeholder attributes
        const fallbackStrategy = generateFallbackEngagementStrategy(
          interestLevel, 
          influenceLevel, 
          supportLevel, 
          resistanceType
        );
        
        return res.status(200).json({ 
          engagementStrategy: fallbackStrategy,
          isGenerated: false,
          message: "Used fallback strategy due to AI service unavailability"
        });
      }
    } catch (err) {
      console.error("Error generating engagement strategy:", err);
      return handleErrors(err, res);
    }
  });
  
  // Database cleanup and maintenance routes
  app.post("/api/admin/cleanup-orphaned-data", async (req: Request, res: Response) => {
    try {
      console.log("Starting database cleanup of orphaned project data...");
      const results = await cleanupOrphanedProjectData();
      
      return res.status(200).json({ 
        success: true, 
        message: "Orphaned data cleanup completed successfully",
        results 
      });
    } catch (err) {
      console.error("Error during orphaned data cleanup:", err);
      return handleErrors(err, res);
    }
  });

  // CTS Characteristics routes for DMAIC Measure Phase
  app.get("/api/projects/:projectId/cts-characteristics", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      const characteristics = await db
        .select()
        .from(ctsCharacteristics)
        .where(eq(ctsCharacteristics.projectId, projectId))
        .orderBy(asc(ctsCharacteristics.id));
      
      return res.status(200).json({ characteristics });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/cts-characteristics", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const characteristicsData = req.body.characteristics;
      
      // Clear existing characteristics for this project
      await db
        .delete(ctsCharacteristics)
        .where(eq(ctsCharacteristics.projectId, projectId));
      
      // Insert new characteristics
      if (characteristicsData && characteristicsData.length > 0) {
        const validatedCharacteristics = characteristicsData.map((char: any) => 
          insertCtsCharacteristicsSchema.parse({
            ...char,
            projectId,
            // Convert string values to numeric types for database storage
            targetPercentDefects: char.targetPercentDefects === "" || char.targetPercentDefects === null 
              ? null 
              : parseFloat(char.targetPercentDefects),
            target: char.target === "" || char.target === null 
              ? null 
              : parseFloat(char.target),
            lsl: char.lsl === "" || char.lsl === null 
              ? null 
              : parseFloat(char.lsl),
            usl: char.usl === "" || char.usl === null 
              ? null 
              : parseFloat(char.usl),
          })
        );
        
        const newCharacteristics = await db
          .insert(ctsCharacteristics)
          .values(validatedCharacteristics)
          .returning();
        
        return res.status(201).json({ characteristics: newCharacteristics });
      }
      
      return res.status(200).json({ characteristics: [] });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Get CTQs from customer requirements and business requirements for populating CTS table
  app.get("/api/projects/:projectId/ctqs", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Get CTQs from customer requirements table (check both ctq and CTS fields)
      const customerCtqs = await db.execute(sql`
        SELECT 
          CASE 
            WHEN ctq IS NOT NULL AND ctq != '' THEN ctq
            WHEN "CTS" IS NOT NULL AND "CTS" != '' THEN "CTS"
            ELSE NULL
          END as ctq,
          'customer_requirements' as source 
        FROM customer_requirements 
        WHERE project_id = ${projectId} 
        AND (
          (ctq IS NOT NULL AND ctq != '') OR 
          ("CTS" IS NOT NULL AND "CTS" != '')
        )
      `);
      
      // Get CTQs from business requirements table
      const businessCtqs = await db.execute(sql`
        SELECT ctq, 'business_requirements' as source 
        FROM business_requirements 
        WHERE project_id = ${projectId} 
        AND ctq IS NOT NULL 
        AND ctq != ''
      `);
      
      // Combine and deduplicate CTQs
      const allCtqs = [...customerCtqs.rows, ...businessCtqs.rows];
      const uniqueCtqs = Array.from(
        new Map(allCtqs.map(item => [item.ctq, item])).values()
      ).filter(item => item.ctq && item.ctq.trim() !== '');
      
      return res.status(200).json({ ctqs: uniqueCtqs });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Process Map routes for DMAIC Measure Phase
  app.get("/api/projects/:projectId/process-map", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      const [processMap] = await db
        .select()
        .from(processMaps)
        .where(eq(processMaps.projectId, projectId));
      
      if (!processMap) {
        return res.status(404).json({ message: "Process map not found" });
      }
      
      return res.status(200).json(processMap);
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/process-map", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { diagramData } = req.body;
      
      // Check if process map already exists
      const [existingMap] = await db
        .select()
        .from(processMaps)
        .where(eq(processMaps.projectId, projectId));
      
      if (existingMap) {
        // Update existing process map
        const [updatedMap] = await db
          .update(processMaps)
          .set({
            diagramData,
            lastUpdated: new Date(),
          })
          .where(eq(processMaps.projectId, projectId))
          .returning();
        
        return res.status(200).json(updatedMap);
      } else {
        // Create new process map
        const [newMap] = await db
          .insert(processMaps)
          .values({
            projectId,
            diagramData,
          })
          .returning();
        
        return res.status(201).json(newMap);
      }
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // MSA Analysis routes - using existing table structure temporarily
  app.get("/api/projects/:projectId/msa-analysis", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Use existing MSA table structure with Drizzle ORM
      const msaAnalysisData = await db
        .select()
        .from(msaAnalysis)
        .where(eq(msaAnalysis.projectId, projectId));
      
      return res.status(200).json({ 
        attributeMsa: msaAnalysisData,
        continuousMsa: msaAnalysisData
      });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/attribute-msa", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Clean and validate the payload
      const cleanPayload = {
        projectId,
        ctq: req.body.ctq,
        msaType: req.body.msaType || "Attribute Agreement",
        unitAppraisedType: req.body.unitAppraisedType || "Part",
        unitAppraisedTypeOther: req.body.unitAppraisedTypeOther || null,
        appraiser1Name: req.body.appraiser1Name || null,
        appraiser2Name: req.body.appraiser2Name || null,
        appraiser3Name: req.body.appraiser3Name || null,
        agreementAnalysisData: req.body.agreementAnalysisData || null,
        studyDateTime: req.body.studyDateTime ? new Date(req.body.studyDateTime) : new Date(),
      };

      // Check if MSA record already exists for this CTQ and project
      const existingMsa = await db
        .select()
        .from(msaAnalysis)
        .where(and(
          eq(msaAnalysis.projectId, projectId),
          eq(msaAnalysis.ctq, cleanPayload.ctq)
        ))
        .limit(1);

      if (existingMsa.length > 0) {
        // Update existing record
        const [updatedMsa] = await db
          .update(msaAnalysis)
          .set({
            ...cleanPayload,
            lastUpdated: new Date(),
          })
          .where(and(
            eq(msaAnalysis.projectId, projectId),
            eq(msaAnalysis.ctq, cleanPayload.ctq)
          ))
          .returning();

        return res.status(200).json({ msa: updatedMsa });
      } else {
        // Create new record
        const [newMsa] = await db
          .insert(msaAnalysis)
          .values(cleanPayload)
          .returning();

        return res.status(201).json({ msa: newMsa });
      }
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/continuous-msa", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Clean and validate the payload for continuous MSA
      const cleanPayload = {
        projectId,
        ctq: req.body.ctq,
        msaType: req.body.msaType || "Gage R&R",
        appraiser1Name: req.body.appraiser1Name || null,
        appraiser2Name: req.body.appraiser2Name || null,
        appraiser3Name: req.body.appraiser3Name || null,
        measurements: req.body.measurements || null, // For continuous data
        studyDateTime: req.body.studyDateTime ? new Date(req.body.studyDateTime) : new Date(),
      };

      // Check if MSA record already exists for this CTQ and project
      const existingMsa = await db
        .select()
        .from(msaAnalysis)
        .where(and(
          eq(msaAnalysis.projectId, projectId),
          eq(msaAnalysis.ctq, cleanPayload.ctq)
        ))
        .limit(1);

      if (existingMsa.length > 0) {
        // Update existing record
        const [updatedMsa] = await db
          .update(msaAnalysis)
          .set({
            ...cleanPayload,
            lastUpdated: new Date(),
          })
          .where(and(
            eq(msaAnalysis.projectId, projectId),
            eq(msaAnalysis.ctq, cleanPayload.ctq)
          ))
          .returning();

        return res.status(200).json({ msa: updatedMsa });
      } else {
        // Create new record
        const [newMsa] = await db
          .insert(msaAnalysis)
          .values(cleanPayload)
          .returning();

        return res.status(201).json({ msa: newMsa });
      }
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/projects/:projectId/attribute-msa/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      
      // Clean and validate the payload for attribute MSA update
      const cleanPayload = {
        projectId,
        ctq: req.body.ctq,
        msaType: req.body.msaType || "Attribute Agreement",
        unitAppraisedType: req.body.unitAppraisedType || "Part",
        unitAppraisedTypeOther: req.body.unitAppraisedTypeOther || null,
        appraiser1Name: req.body.appraiser1Name || null,
        appraiser2Name: req.body.appraiser2Name || null,
        appraiser3Name: req.body.appraiser3Name || null,
        agreementAnalysisData: req.body.agreementAnalysisData || null,
        studyDateTime: req.body.studyDateTime ? new Date(req.body.studyDateTime) : new Date(),
        lastUpdated: new Date(),
      };

      const [updatedMsa] = await db
        .update(msaAnalysis)
        .set(cleanPayload)
        .where(and(eq(msaAnalysis.id, id), eq(msaAnalysis.projectId, projectId)))
        .returning();

      return res.status(200).json({ msa: updatedMsa });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/projects/:projectId/continuous-msa/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      
      // Clean and validate the payload for continuous MSA update
      const cleanPayload = {
        projectId,
        ctq: req.body.ctq,
        msaType: req.body.msaType || "Gage R&R",
        appraiser1Name: req.body.appraiser1Name || null,
        appraiser2Name: req.body.appraiser2Name || null,
        appraiser3Name: req.body.appraiser3Name || null,
        measurements: req.body.measurements || null,
        studyDateTime: req.body.studyDateTime ? new Date(req.body.studyDateTime) : new Date(),
        lastUpdated: new Date(),
      };

      const [updatedMsa] = await db
        .update(msaAnalysis)
        .set(cleanPayload)
        .where(and(eq(msaAnalysis.id, id), eq(msaAnalysis.projectId, projectId)))
        .returning();

      return res.status(200).json({ msa: updatedMsa });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Process Capability routes
  app.get("/api/projects/:projectId/process-capability", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const processCapabilityData = await db
        .select()
        .from(processCapability)
        .where(eq(processCapability.projectId, projectId));
      
      return res.status(200).json({ processCapability: processCapabilityData });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.post("/api/projects/:projectId/process-capability", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const payload = insertProcessCapabilitySchema.parse({
        ...req.body,
        projectId,
      });

      const [newCapability] = await db
        .insert(processCapability)
        .values(payload)
        .returning();

      return res.status(201).json({ capability: newCapability });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  app.put("/api/projects/:projectId/process-capability/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const id = parseInt(req.params.id);
      
      const payload = insertProcessCapabilitySchema.parse({
        ...req.body,
        projectId,
      });

      const [updatedCapability] = await db
        .update(processCapability)
        .set({
          ...payload,
          lastUpdated: new Date(),
        })
        .where(and(eq(processCapability.id, id), eq(processCapability.projectId, projectId)))
        .returning();

      return res.status(200).json({ capability: updatedCapability });
    } catch (err) {
      return handleErrors(err, res);
    }
  });

  // Create http server
  // Register the Gate Review routes
  registerGateReviewRoutes(app, storage);
  registerGanttRoutes(app, storage);
  
  const httpServer = createServer(app);
  return httpServer;
}
