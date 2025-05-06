import {
  users, projects, projectCharters, sipocDiagrams, customerRequirements, businessRequirements,
  datasets, dataCollectionPlans, storageConfigs, activityLogs, processData, projectRaciMatrix,
  type User, type InsertUser,
  type Project, type InsertProject,
  type ProjectCharter, type InsertCharter,
  type SipocDiagram, type InsertSipoc,
  type CustomerRequirement, type InsertRequirement,
  type BusinessRequirement, type InsertBusinessRequirement,
  type Dataset, type InsertDataset,
  type DataCollectionPlan, type InsertPlan,
  type StorageConfig, type InsertConfig,
  type ActivityLog, type InsertLog,
  type ProcessData, type InsertProcessData,
  type ProjectRaciMatrix, type InsertRaciMatrix, type RaciMatrixData
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Project Charter operations
  getCharter(projectId: number): Promise<ProjectCharter | undefined>;
  createCharter(charter: InsertCharter): Promise<ProjectCharter>;
  updateCharter(id: number, charter: Partial<ProjectCharter>): Promise<ProjectCharter | undefined>;

  // SIPOC operations
  getSipoc(projectId: number): Promise<SipocDiagram | undefined>;
  createSipoc(sipoc: InsertSipoc): Promise<SipocDiagram>;
  updateSipoc(id: number, sipoc: Partial<SipocDiagram>): Promise<SipocDiagram | undefined>;

  // Customer Requirements operations
  getRequirements(projectId: number): Promise<CustomerRequirement[]>;
  createRequirement(requirement: InsertRequirement): Promise<CustomerRequirement>;
  updateRequirement(id: number, requirement: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined>;
  deleteRequirement(id: number): Promise<boolean>;
  
  // Business Requirements operations
  getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]>;
  createBusinessRequirement(requirement: InsertBusinessRequirement): Promise<BusinessRequirement>;
  updateBusinessRequirement(id: number, requirement: Partial<BusinessRequirement>): Promise<BusinessRequirement | undefined>;
  deleteBusinessRequirement(id: number): Promise<boolean>;

  // Dataset operations
  getDatasets(): Promise<Dataset[]>;
  getDatasetsByProject(projectId: number): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: number, dataset: Partial<Dataset>): Promise<Dataset | undefined>;
  deleteDataset(id: number): Promise<boolean>;

  // Data Collection Plan operations
  getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]>;
  createDataCollectionPlan(plan: InsertPlan): Promise<DataCollectionPlan>;
  updateDataCollectionPlan(id: number, plan: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined>;
  deleteDataCollectionPlan(id: number): Promise<boolean>;

  // Storage Configuration operations
  getStorageConfig(userId: number): Promise<StorageConfig | undefined>;
  createStorageConfig(config: InsertConfig): Promise<StorageConfig>;
  updateStorageConfig(id: number, config: Partial<StorageConfig>): Promise<StorageConfig | undefined>;

  // Activity Log operations
  getActivityLogs(projectId?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertLog): Promise<ActivityLog>;

  // Process Data operations
  getProcessData(datasetId: number): Promise<ProcessData | undefined>;
  createProcessData(data: InsertProcessData): Promise<ProcessData>;
  updateProcessData(id: number, data: Partial<ProcessData>): Promise<ProcessData | undefined>;
  
  // RACI Matrix operations
  getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined>;
  createRaciMatrix(raciMatrix: InsertRaciMatrix): Promise<ProjectRaciMatrix>;
  updateRaciMatrix(id: number, raciMatrix: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private projectCharters: Map<number, ProjectCharter>;
  private sipocDiagrams: Map<number, SipocDiagram>;
  private customerRequirements: Map<number, CustomerRequirement>;
  private businessRequirements: Map<number, BusinessRequirement>;
  private datasets: Map<number, Dataset>;
  private dataCollectionPlans: Map<number, DataCollectionPlan>;
  private storageConfigs: Map<number, StorageConfig>;
  private activityLogs: Map<number, ActivityLog>;
  private processData: Map<number, ProcessData>;
  private raciMatrices: Map<number, ProjectRaciMatrix>;
  
  private currentUserId: number;
  private currentProjectId: number;
  private currentCharterId: number;
  private currentSipocId: number;
  private currentRequirementId: number;
  private currentBusinessRequirementId: number;
  private currentDatasetId: number;
  private currentPlanId: number;
  private currentConfigId: number;
  private currentLogId: number;
  private currentProcessDataId: number;
  private currentRaciMatrixId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.projectCharters = new Map();
    this.sipocDiagrams = new Map();
    this.customerRequirements = new Map();
    this.businessRequirements = new Map();
    this.datasets = new Map();
    this.dataCollectionPlans = new Map();
    this.storageConfigs = new Map();
    this.activityLogs = new Map();
    this.processData = new Map();
    this.raciMatrices = new Map();
    
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentCharterId = 1;
    this.currentSipocId = 1;
    this.currentRequirementId = 1;
    this.currentBusinessRequirementId = 1;
    this.currentDatasetId = 1;
    this.currentPlanId = 1;
    this.currentConfigId = 1;
    this.currentLogId = 1;
    this.currentProcessDataId = 1;
    this.currentRaciMatrixId = 1;
    
    // Create a default admin user
    this.createUser({
      username: 'admin',
      password: 'admin123',
      fullName: 'John Doe',
      role: 'admin'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, lastLogin: null };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.createdBy === userId,
    );
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date();
    const project: Project = { 
      ...insertProject, 
      id, 
      actualEndDate: null, 
      lastUpdated: now 
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = await this.getProject(id);
    if (project) {
      const updatedProject = { 
        ...project, 
        ...projectUpdate, 
        lastUpdated: new Date() 
      };
      this.projects.set(id, updatedProject);
      return updatedProject;
    }
    return undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Project Charter operations
  async getCharter(projectId: number): Promise<ProjectCharter | undefined> {
    return Array.from(this.projectCharters.values()).find(
      (charter) => charter.projectId === projectId,
    );
  }

  async createCharter(insertCharter: InsertCharter): Promise<ProjectCharter> {
    const id = this.currentCharterId++;
    const charter: ProjectCharter = { 
      ...insertCharter, 
      id, 
      lastUpdated: new Date() 
    };
    this.projectCharters.set(id, charter);
    return charter;
  }

  async updateCharter(id: number, charterUpdate: Partial<ProjectCharter>): Promise<ProjectCharter | undefined> {
    const charter = this.projectCharters.get(id);
    if (charter) {
      const updatedCharter = { 
        ...charter, 
        ...charterUpdate, 
        lastUpdated: new Date() 
      };
      this.projectCharters.set(id, updatedCharter);
      return updatedCharter;
    }
    return undefined;
  }

  // SIPOC operations
  async getSipoc(projectId: number): Promise<SipocDiagram | undefined> {
    return Array.from(this.sipocDiagrams.values()).find(
      (sipoc) => sipoc.projectId === projectId,
    );
  }

  async createSipoc(insertSipoc: InsertSipoc): Promise<SipocDiagram> {
    const id = this.currentSipocId++;
    const sipoc: SipocDiagram = { 
      ...insertSipoc, 
      id, 
      lastUpdated: new Date() 
    };
    this.sipocDiagrams.set(id, sipoc);
    return sipoc;
  }

  async updateSipoc(id: number, sipocUpdate: Partial<SipocDiagram>): Promise<SipocDiagram | undefined> {
    const sipoc = this.sipocDiagrams.get(id);
    if (sipoc) {
      const updatedSipoc = { 
        ...sipoc, 
        ...sipocUpdate, 
        lastUpdated: new Date() 
      };
      this.sipocDiagrams.set(id, updatedSipoc);
      return updatedSipoc;
    }
    return undefined;
  }

  // Customer Requirements operations
  async getRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return Array.from(this.customerRequirements.values()).filter(
      (req) => req.projectId === projectId,
    );
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<CustomerRequirement> {
    const id = this.currentRequirementId++;
    const requirement: CustomerRequirement = { 
      ...insertRequirement, 
      id, 
      lastUpdated: new Date() 
    };
    this.customerRequirements.set(id, requirement);
    return requirement;
  }

  async updateRequirement(id: number, requirementUpdate: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined> {
    const requirement = this.customerRequirements.get(id);
    if (requirement) {
      const updatedRequirement = { 
        ...requirement, 
        ...requirementUpdate, 
        lastUpdated: new Date() 
      };
      this.customerRequirements.set(id, updatedRequirement);
      return updatedRequirement;
    }
    return undefined;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    return this.customerRequirements.delete(id);
  }

  // Business Requirements operations
  async getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]> {
    return Array.from(this.businessRequirements.values()).filter(
      (req) => req.projectId === projectId,
    );
  }

  async createBusinessRequirement(insertBusinessRequirement: InsertBusinessRequirement): Promise<BusinessRequirement> {
    const id = this.currentBusinessRequirementId++;
    const businessRequirement: BusinessRequirement = { 
      ...insertBusinessRequirement, 
      id, 
      lastUpdated: new Date() 
    };
    this.businessRequirements.set(id, businessRequirement);
    return businessRequirement;
  }

  async updateBusinessRequirement(id: number, businessRequirementUpdate: Partial<BusinessRequirement>): Promise<BusinessRequirement | undefined> {
    const businessRequirement = this.businessRequirements.get(id);
    if (businessRequirement) {
      const updatedBusinessRequirement = { 
        ...businessRequirement, 
        ...businessRequirementUpdate, 
        lastUpdated: new Date() 
      };
      this.businessRequirements.set(id, updatedBusinessRequirement);
      return updatedBusinessRequirement;
    }
    return undefined;
  }

  async deleteBusinessRequirement(id: number): Promise<boolean> {
    return this.businessRequirements.delete(id);
  }

  // Dataset operations
  async getDatasets(): Promise<Dataset[]> {
    return Array.from(this.datasets.values());
  }

  async getDatasetsByProject(projectId: number): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter(
      (dataset) => dataset.projectId === projectId,
    );
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const id = this.currentDatasetId++;
    const dataset: Dataset = { 
      ...insertDataset, 
      id, 
      lastUpdated: new Date() 
    };
    this.datasets.set(id, dataset);
    return dataset;
  }

  async updateDataset(id: number, datasetUpdate: Partial<Dataset>): Promise<Dataset | undefined> {
    const dataset = this.datasets.get(id);
    if (dataset) {
      const updatedDataset = { 
        ...dataset, 
        ...datasetUpdate, 
        lastUpdated: new Date() 
      };
      this.datasets.set(id, updatedDataset);
      return updatedDataset;
    }
    return undefined;
  }

  async deleteDataset(id: number): Promise<boolean> {
    return this.datasets.delete(id);
  }

  // Data Collection Plan operations
  async getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]> {
    return Array.from(this.dataCollectionPlans.values()).filter(
      (plan) => plan.projectId === projectId,
    );
  }

  async createDataCollectionPlan(insertPlan: InsertPlan): Promise<DataCollectionPlan> {
    const id = this.currentPlanId++;
    const plan: DataCollectionPlan = { 
      ...insertPlan, 
      id, 
      lastUpdated: new Date() 
    };
    this.dataCollectionPlans.set(id, plan);
    return plan;
  }

  async updateDataCollectionPlan(id: number, planUpdate: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined> {
    const plan = this.dataCollectionPlans.get(id);
    if (plan) {
      const updatedPlan = { 
        ...plan, 
        ...planUpdate, 
        lastUpdated: new Date() 
      };
      this.dataCollectionPlans.set(id, updatedPlan);
      return updatedPlan;
    }
    return undefined;
  }

  async deleteDataCollectionPlan(id: number): Promise<boolean> {
    return this.dataCollectionPlans.delete(id);
  }

  // Storage Configuration operations
  async getStorageConfig(userId: number): Promise<StorageConfig | undefined> {
    return Array.from(this.storageConfigs.values()).find(
      (config) => config.userId === userId,
    );
  }

  async createStorageConfig(insertConfig: InsertConfig): Promise<StorageConfig> {
    const id = this.currentConfigId++;
    const config: StorageConfig = { 
      ...insertConfig, 
      id, 
      lastUpdated: new Date() 
    };
    this.storageConfigs.set(id, config);
    return config;
  }

  async updateStorageConfig(id: number, configUpdate: Partial<StorageConfig>): Promise<StorageConfig | undefined> {
    const config = this.storageConfigs.get(id);
    if (config) {
      const updatedConfig = { 
        ...config, 
        ...configUpdate, 
        lastUpdated: new Date() 
      };
      this.storageConfigs.set(id, updatedConfig);
      return updatedConfig;
    }
    return undefined;
  }

  // Activity Log operations
  async getActivityLogs(projectId?: number): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values());
    if (projectId) {
      return logs.filter((log) => log.projectId === projectId);
    }
    return logs;
  }

  async createActivityLog(insertLog: InsertLog): Promise<ActivityLog> {
    const id = this.currentLogId++;
    const log: ActivityLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date() 
    };
    this.activityLogs.set(id, log);
    return log;
  }

  // Process Data operations
  async getProcessData(datasetId: number): Promise<ProcessData | undefined> {
    return Array.from(this.processData.values()).find(
      (data) => data.datasetId === datasetId,
    );
  }

  async createProcessData(insertData: InsertProcessData): Promise<ProcessData> {
    const id = this.currentProcessDataId++;
    const data: ProcessData = { 
      ...insertData, 
      id, 
      createdAt: new Date() 
    };
    this.processData.set(id, data);
    return data;
  }

  async updateProcessData(id: number, dataUpdate: Partial<ProcessData>): Promise<ProcessData | undefined> {
    const data = this.processData.get(id);
    if (data) {
      const updatedData = { 
        ...data, 
        ...dataUpdate, 
      };
      this.processData.set(id, updatedData);
      return updatedData;
    }
    return undefined;
  }
  
  // RACI Matrix operations
  async getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined> {
    return Array.from(this.raciMatrices.values()).find(
      (matrix) => matrix.projectId === projectId,
    );
  }

  async createRaciMatrix(insertRaciMatrix: InsertRaciMatrix): Promise<ProjectRaciMatrix> {
    const id = this.currentRaciMatrixId++;
    const raciMatrix: ProjectRaciMatrix = { 
      ...insertRaciMatrix, 
      id, 
      lastUpdated: new Date() 
    };
    this.raciMatrices.set(id, raciMatrix);
    return raciMatrix;
  }

  async updateRaciMatrix(id: number, raciMatrixUpdate: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined> {
    const raciMatrix = this.raciMatrices.get(id);
    if (raciMatrix) {
      const updatedRaciMatrix = { 
        ...raciMatrix, 
        ...raciMatrixUpdate, 
        lastUpdated: new Date() 
      };
      this.raciMatrices.set(id, updatedRaciMatrix);
      return updatedRaciMatrix;
    }
    return undefined;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.createdBy, userId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values({
        ...insertProject,
        actualEndDate: null,
        lastUpdated: new Date()
      })
      .returning();
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    // SUPER VERBOSE DEBUG for project title updates
    console.log("--------------------------------------------------------------------------------");
    console.log(`TITLE UPDATE DEBUG - Updating project ${id}`);
    console.log(`TITLE UPDATE DEBUG - projectUpdate object keys: ${Object.keys(projectUpdate)}`);
    if (projectUpdate.title) {
      console.log(`TITLE UPDATE DEBUG - New project title: "${projectUpdate.title}"`);
    } else {
      console.log(`TITLE UPDATE DEBUG - NO TITLE provided in projectUpdate object!`);
    }
    console.log(`TITLE UPDATE DEBUG - Full update data:`, projectUpdate);
    console.log("--------------------------------------------------------------------------------");
    
    const [project] = await db
      .update(projects)
      .set({
        ...projectUpdate,
        lastUpdated: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
      
    if (project) {
      console.log(`DatabaseStorage: Project ${id} updated successfully. New title: "${project.title}"`);
    } else {
      console.log(`DatabaseStorage: Failed to update project ${id}`);
    }
    
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  // Project Charter operations
  async getCharter(projectId: number): Promise<ProjectCharter | undefined> {
    const [charter] = await db
      .select()
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId));
    return charter || undefined;
  }

  async createCharter(insertCharter: InsertCharter): Promise<ProjectCharter> {
    const [charter] = await db
      .insert(projectCharters)
      .values({
        ...insertCharter,
        lastUpdated: new Date()
      })
      .returning();
    return charter;
  }

  async updateCharter(id: number, charterUpdate: Partial<ProjectCharter>): Promise<ProjectCharter | undefined> {
    // SUPER VERBOSE DEBUG for projectTitle updating
    console.log("--------------------------------------------------------------------------------");
    console.log(`CHARTER DEBUG - Updating charter ${id}`);
    console.log(`CHARTER DEBUG - charterUpdate object keys: ${Object.keys(charterUpdate)}`);
    if (charterUpdate.projectTitle) {
      console.log(`CHARTER DEBUG - Incoming projectTitle: "${charterUpdate.projectTitle}"`);
    } else {
      console.log(`CHARTER DEBUG - NO projectTitle provided in charterUpdate object!`);
    }
    
    // Get the existing charter to compare values
    const [existingCharter] = await db
      .select()
      .from(projectCharters)
      .where(eq(projectCharters.id, id));
      
    if (existingCharter) {
      console.log(`CHARTER DEBUG - Existing charter found with projectTitle: "${existingCharter.projectTitle}"`);
    } else {
      console.log(`CHARTER DEBUG - No existing charter found with ID ${id}`);
    }
    console.log("--------------------------------------------------------------------------------");
    
    const [charter] = await db
      .update(projectCharters)
      .set({
        ...charterUpdate,
        lastUpdated: new Date()
      })
      .where(eq(projectCharters.id, id))
      .returning();
      
    if (charter) {
      console.log(`CHARTER DEBUG - Charter ${id} updated successfully.`);
      console.log(`CHARTER DEBUG - Updated charter projectTitle: "${charter.projectTitle}"`);
      console.log(`CHARTER DEBUG - Was projectTitle changed: ${existingCharter && existingCharter.projectTitle !== charter.projectTitle}`);
    } else {
      console.log(`CHARTER DEBUG - Failed to update charter ${id}`);
    }
    console.log("--------------------------------------------------------------------------------");
    
    return charter || undefined;
  }

  // SIPOC operations
  async getSipoc(projectId: number): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db
      .select()
      .from(sipocDiagrams)
      .where(eq(sipocDiagrams.projectId, projectId));
    return sipoc || undefined;
  }

  async createSipoc(insertSipoc: InsertSipoc): Promise<SipocDiagram> {
    const [sipoc] = await db
      .insert(sipocDiagrams)
      .values({
        ...insertSipoc,
        lastUpdated: new Date()
      })
      .returning();
    return sipoc;
  }

  async updateSipoc(id: number, sipocUpdate: Partial<SipocDiagram>): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db
      .update(sipocDiagrams)
      .set({
        ...sipocUpdate,
        lastUpdated: new Date()
      })
      .where(eq(sipocDiagrams.id, id))
      .returning();
    return sipoc || undefined;
  }

  // Customer Requirements operations
  async getRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return await db
      .select()
      .from(customerRequirements)
      .where(eq(customerRequirements.projectId, projectId));
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<CustomerRequirement> {
    const [requirement] = await db
      .insert(customerRequirements)
      .values({
        ...insertRequirement,
        lastUpdated: new Date()
      })
      .returning();
    return requirement;
  }

  async updateRequirement(id: number, requirementUpdate: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined> {
    const [requirement] = await db
      .update(customerRequirements)
      .set({
        ...requirementUpdate,
        lastUpdated: new Date()
      })
      .where(eq(customerRequirements.id, id))
      .returning();
    return requirement || undefined;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    const result = await db.delete(customerRequirements).where(eq(customerRequirements.id, id));
    return result.rowCount > 0;
  }

  // Business Requirements operations
  async getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]> {
    return await db
      .select()
      .from(businessRequirements)
      .where(eq(businessRequirements.projectId, projectId));
  }

  async createBusinessRequirement(insertBusinessRequirement: InsertBusinessRequirement): Promise<BusinessRequirement> {
    const [businessRequirement] = await db
      .insert(businessRequirements)
      .values({
        ...insertBusinessRequirement,
        lastUpdated: new Date()
      })
      .returning();
    return businessRequirement;
  }

  async updateBusinessRequirement(id: number, businessRequirementUpdate: Partial<BusinessRequirement>): Promise<BusinessRequirement | undefined> {
    const [businessRequirement] = await db
      .update(businessRequirements)
      .set({
        ...businessRequirementUpdate,
        lastUpdated: new Date()
      })
      .where(eq(businessRequirements.id, id))
      .returning();
    return businessRequirement || undefined;
  }

  async deleteBusinessRequirement(id: number): Promise<boolean> {
    const result = await db.delete(businessRequirements).where(eq(businessRequirements.id, id));
    return result.rowCount > 0;
  }

  // Dataset operations
  async getDatasets(): Promise<Dataset[]> {
    return await db.select().from(datasets);
  }

  async getDatasetsByProject(projectId: number): Promise<Dataset[]> {
    return await db
      .select()
      .from(datasets)
      .where(eq(datasets.projectId, projectId));
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values({
        ...insertDataset,
        lastUpdated: new Date()
      })
      .returning();
    return dataset;
  }

  async updateDataset(id: number, datasetUpdate: Partial<Dataset>): Promise<Dataset | undefined> {
    const [dataset] = await db
      .update(datasets)
      .set({
        ...datasetUpdate,
        lastUpdated: new Date()
      })
      .where(eq(datasets.id, id))
      .returning();
    return dataset || undefined;
  }

  async deleteDataset(id: number): Promise<boolean> {
    const result = await db.delete(datasets).where(eq(datasets.id, id));
    return result.rowCount > 0;
  }

  // Data Collection Plan operations
  async getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]> {
    return await db
      .select()
      .from(dataCollectionPlans)
      .where(eq(dataCollectionPlans.projectId, projectId));
  }

  async createDataCollectionPlan(insertPlan: InsertPlan): Promise<DataCollectionPlan> {
    const [plan] = await db
      .insert(dataCollectionPlans)
      .values({
        ...insertPlan,
        lastUpdated: new Date()
      })
      .returning();
    return plan;
  }

  async updateDataCollectionPlan(id: number, planUpdate: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined> {
    const [plan] = await db
      .update(dataCollectionPlans)
      .set({
        ...planUpdate,
        lastUpdated: new Date()
      })
      .where(eq(dataCollectionPlans.id, id))
      .returning();
    return plan || undefined;
  }

  async deleteDataCollectionPlan(id: number): Promise<boolean> {
    const result = await db.delete(dataCollectionPlans).where(eq(dataCollectionPlans.id, id));
    return result.rowCount > 0;
  }

  // Storage Configuration operations
  async getStorageConfig(userId: number): Promise<StorageConfig | undefined> {
    const [config] = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.userId, userId));
    return config || undefined;
  }

  async createStorageConfig(insertConfig: InsertConfig): Promise<StorageConfig> {
    const [config] = await db
      .insert(storageConfigs)
      .values(insertConfig)
      .returning();
    return config;
  }

  async updateStorageConfig(id: number, configUpdate: Partial<StorageConfig>): Promise<StorageConfig | undefined> {
    const [config] = await db
      .update(storageConfigs)
      .set(configUpdate)
      .where(eq(storageConfigs.id, id))
      .returning();
    return config || undefined;
  }

  // Activity Log operations
  async getActivityLogs(projectId?: number): Promise<ActivityLog[]> {
    if (projectId) {
      return await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.projectId, projectId))
        .orderBy(desc(activityLogs.timestamp));
    }
    
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp));
  }

  async createActivityLog(insertLog: InsertLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  // Process Data operations
  async getProcessData(datasetId: number): Promise<ProcessData | undefined> {
    const [data] = await db
      .select()
      .from(processData)
      .where(eq(processData.datasetId, datasetId));
    return data || undefined;
  }

  async createProcessData(insertData: InsertProcessData): Promise<ProcessData> {
    const [data] = await db
      .insert(processData)
      .values(insertData)
      .returning();
    return data;
  }

  async updateProcessData(id: number, dataUpdate: Partial<ProcessData>): Promise<ProcessData | undefined> {
    const [data] = await db
      .update(processData)
      .set(dataUpdate)
      .where(eq(processData.id, id))
      .returning();
    return data || undefined;
  }
  
  // RACI Matrix operations
  async getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined> {
    const [raciMatrix] = await db
      .select()
      .from(projectRaciMatrix)
      .where(eq(projectRaciMatrix.projectId, projectId));
    return raciMatrix || undefined;
  }

  async createRaciMatrix(insertRaciMatrix: InsertRaciMatrix): Promise<ProjectRaciMatrix> {
    const [raciMatrix] = await db
      .insert(projectRaciMatrix)
      .values({
        ...insertRaciMatrix,
        lastUpdated: new Date()
      })
      .returning();
    return raciMatrix;
  }

  async updateRaciMatrix(id: number, raciMatrixUpdate: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined> {
    const [raciMatrix] = await db
      .update(projectRaciMatrix)
      .set({
        ...raciMatrixUpdate,
        lastUpdated: new Date()
      })
      .where(eq(projectRaciMatrix.id, id))
      .returning();
    return raciMatrix || undefined;
  }
}

// Using DatabaseStorage for persistent database storage
export const storage = new DatabaseStorage();
