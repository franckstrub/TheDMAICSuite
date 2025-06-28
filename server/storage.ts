import {
  users, projects, projectCharters, sipocDiagrams, customerRequirements, businessRequirements,
  datasets, dataCollectionPlans, storageConfigs, activityLogs, processData, projectRaciMatrix,
  gateReviewDeliverables, gateReviewValidators, ganttTasks,
  type InsertUser,
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
  type ProjectRaciMatrix, type InsertRaciMatrix, type RaciMatrixData,
  type GateReviewDeliverable, type InsertGateReviewDeliverable,
  type GateReviewValidator, type InsertGateReviewValidator,
  type GanttTask, type InsertGanttTask
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { organizationService } from "./organizationService";

// Type for User select operations
type User = typeof users.$inferSelect;

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: any): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  getProjectsByCreatedBy(createdBy: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Project Charter operations
  getCharter(projectId: number): Promise<ProjectCharter | undefined>;
  getProjectCharter(projectId: number): Promise<ProjectCharter | undefined>; // Alias for getCharter
  createCharter(charter: InsertCharter): Promise<ProjectCharter>;
  updateCharter(id: number, charter: Partial<ProjectCharter>): Promise<ProjectCharter | undefined>;

  // SIPOC operations
  getSipoc(projectId: number): Promise<SipocDiagram | undefined>;
  createSipoc(sipoc: InsertSipoc): Promise<SipocDiagram>;
  updateSipoc(id: number, sipoc: Partial<SipocDiagram>): Promise<SipocDiagram | undefined>;

  // Customer Requirements operations
  getCustomerRequirements(projectId: number): Promise<CustomerRequirement[]>;
  createCustomerRequirement(requirement: InsertRequirement): Promise<CustomerRequirement>;
  updateCustomerRequirement(id: number, requirement: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined>;
  deleteCustomerRequirement(id: number): Promise<boolean>;
  
  // Legacy Customer Requirements methods (for compatibility)
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
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: number, dataset: Partial<Dataset>): Promise<Dataset | undefined>;
  deleteDataset(id: number): Promise<boolean>;

  // Data Collection Plan operations
  getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]>;
  createDataCollectionPlan(plan: InsertPlan): Promise<DataCollectionPlan>;
  updateDataCollectionPlan(id: number, plan: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined>;
  deleteDataCollectionPlan(id: number): Promise<boolean>;

  // Storage Config operations
  getStorageConfigs(userId: number): Promise<StorageConfig[]>;
  createStorageConfig(config: InsertConfig): Promise<StorageConfig>;
  updateStorageConfig(id: number, config: Partial<StorageConfig>): Promise<StorageConfig | undefined>;

  // Activity Log operations
  getActivityLogs(userId?: number, projectId?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertLog): Promise<ActivityLog>;

  // Process Data operations
  getProcessData(projectId: number, datasetId: number): Promise<ProcessData[]>;
  createProcessData(data: InsertProcessData): Promise<ProcessData>;

  // RACI Matrix operations
  getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined>;
  createRaciMatrix(matrix: InsertRaciMatrix): Promise<ProjectRaciMatrix>;
  updateRaciMatrix(id: number, matrix: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined>;

  // Gate Review operations
  getGateReviewDeliverables(projectId: number, phase?: string): Promise<GateReviewDeliverable[]>;
  createGateReviewDeliverable(deliverable: InsertGateReviewDeliverable): Promise<GateReviewDeliverable>;
  updateGateReviewDeliverable(id: number, deliverable: Partial<GateReviewDeliverable>): Promise<GateReviewDeliverable | undefined>;
  deleteGateReviewDeliverable(id: number): Promise<boolean>;

  getGateReviewValidators(projectId: number, phase?: string): Promise<GateReviewValidator[]>;
  getGateReviewValidator(id: number): Promise<GateReviewValidator | undefined>;
  createGateReviewValidator(validator: InsertGateReviewValidator): Promise<GateReviewValidator>;
  updateGateReviewValidator(id: number, validator: Partial<GateReviewValidator>): Promise<GateReviewValidator | undefined>;
  deleteGateReviewValidator(id: number): Promise<boolean>;

  // Gantt Task operations
  getGanttTasks(projectId: number): Promise<GanttTask[]>;
  createGanttTask(task: InsertGanttTask): Promise<GanttTask>;
  updateGanttTask(id: number, task: Partial<GanttTask>): Promise<GanttTask | undefined>;
  deleteGanttTask(id: number): Promise<boolean>;
}

// DatabaseStorage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([insertUser])
      .returning();
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // If user exists but has no organization, create one
      if (!existingUser.organizationId) {
        const userType = userData.userType || 'individual';
        const organization = await organizationService.getOrCreateUserOrganization(userData.id, userType, userData);
        userData.organizationId = organization.id;
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          organizationId: userData.organizationId || existingUser.organizationId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          phone: userData.phone,
          phoneCountryCode: userData.phoneCountryCode,
          billingAddress: userData.billingAddress,
          updatedAt: new Date()
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updatedUser;
    } else {
      // For new users, ensure they have an organization
      if (!userData.organizationId) {
        const userType = userData.userType || 'individual';
        const organization = await organizationService.getOrCreateUserOrganization(userData.id, userType, userData);
        userData.organizationId = organization.id;
      }
      return await this.createUser(userData);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.lastUpdated));
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.createdBy, userId)).orderBy(desc(projects.lastUpdated));
  }

  async getProjectsByCreatedBy(createdBy: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.createdBy, parseInt(createdBy))).orderBy(desc(projects.lastUpdated));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, lastUpdated: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getCharter(projectId: number): Promise<ProjectCharter | undefined> {
    const [charter] = await db.select().from(projectCharters).where(eq(projectCharters.projectId, projectId));
    return charter || undefined;
  }

  async getProjectCharter(projectId: number): Promise<ProjectCharter | undefined> {
    return this.getCharter(projectId);
  }

  async createCharter(charter: InsertCharter): Promise<ProjectCharter> {
    const [newCharter] = await db
      .insert(projectCharters)
      .values(charter)
      .returning();
    return newCharter;
  }

  async updateCharter(id: number, charter: Partial<ProjectCharter>): Promise<ProjectCharter | undefined> {
    const [updatedCharter] = await db
      .update(projectCharters)
      .set({ ...charter, lastUpdated: new Date() })
      .where(eq(projectCharters.id, id))
      .returning();
    return updatedCharter || undefined;
  }

  async getSipoc(projectId: number): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db.select().from(sipocDiagrams).where(eq(sipocDiagrams.projectId, projectId));
    return sipoc || undefined;
  }

  async createSipoc(sipoc: InsertSipoc): Promise<SipocDiagram> {
    const [newSipoc] = await db
      .insert(sipocDiagrams)
      .values(sipoc)
      .returning();
    return newSipoc;
  }

  async updateSipoc(id: number, sipoc: Partial<SipocDiagram>): Promise<SipocDiagram | undefined> {
    const [updatedSipoc] = await db
      .update(sipocDiagrams)
      .set({ ...sipoc, lastUpdated: new Date() })
      .where(eq(sipocDiagrams.id, id))
      .returning();
    return updatedSipoc || undefined;
  }

  async getCustomerRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return await db.select().from(customerRequirements).where(eq(customerRequirements.projectId, projectId));
  }

  async getRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return await db.select().from(customerRequirements).where(eq(customerRequirements.projectId, projectId));
  }

  async createCustomerRequirement(requirement: InsertRequirement): Promise<CustomerRequirement> {
    const [newRequirement] = await db
      .insert(customerRequirements)
      .values(requirement)
      .returning();
    return newRequirement;
  }

  async updateCustomerRequirement(id: number, requirement: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined> {
    const [updatedRequirement] = await db
      .update(customerRequirements)
      .set({ ...requirement, lastUpdated: new Date() })
      .where(eq(customerRequirements.id, id))
      .returning();
    return updatedRequirement || undefined;
  }

  async deleteCustomerRequirement(id: number): Promise<boolean> {
    const result = await db.delete(customerRequirements).where(eq(customerRequirements.id, id));
    return result.rowCount > 0;
  }

  // Legacy methods for compatibility
  async createRequirement(requirement: InsertRequirement): Promise<CustomerRequirement> {
    return this.createCustomerRequirement(requirement);
  }

  async updateRequirement(id: number, requirement: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined> {
    return this.updateCustomerRequirement(id, requirement);
  }

  async deleteRequirement(id: number): Promise<boolean> {
    return this.deleteCustomerRequirement(id);
  }

  async getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]> {
    return await db.select().from(businessRequirements).where(eq(businessRequirements.projectId, projectId));
  }

  async createBusinessRequirement(requirement: InsertBusinessRequirement): Promise<BusinessRequirement> {
    const [newRequirement] = await db
      .insert(businessRequirements)
      .values(requirement)
      .returning();
    return newRequirement;
  }

  async updateBusinessRequirement(id: number, requirement: Partial<BusinessRequirement>): Promise<BusinessRequirement | undefined> {
    const [updatedRequirement] = await db
      .update(businessRequirements)
      .set({ ...requirement, lastUpdated: new Date() })
      .where(eq(businessRequirements.id, id))
      .returning();
    return updatedRequirement || undefined;
  }

  async deleteBusinessRequirement(id: number): Promise<boolean> {
    const result = await db.delete(businessRequirements).where(eq(businessRequirements.id, id));
    return result.rowCount > 0;
  }

  async getDatasets(): Promise<Dataset[]> {
    return await db.select().from(datasets).orderBy(desc(datasets.lastUpdated));
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }

  async createDataset(dataset: InsertDataset): Promise<Dataset> {
    const [newDataset] = await db
      .insert(datasets)
      .values(dataset)
      .returning();
    return newDataset;
  }

  async updateDataset(id: number, dataset: Partial<Dataset>): Promise<Dataset | undefined> {
    const [updatedDataset] = await db
      .update(datasets)
      .set({ ...dataset, lastUpdated: new Date() })
      .where(eq(datasets.id, id))
      .returning();
    return updatedDataset || undefined;
  }

  async deleteDataset(id: number): Promise<boolean> {
    const result = await db.delete(datasets).where(eq(datasets.id, id));
    return result.rowCount > 0;
  }

  async getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]> {
    return await db.select().from(dataCollectionPlans).where(eq(dataCollectionPlans.projectId, projectId));
  }

  async createDataCollectionPlan(plan: InsertPlan): Promise<DataCollectionPlan> {
    const [newPlan] = await db
      .insert(dataCollectionPlans)
      .values(plan)
      .returning();
    return newPlan;
  }

  async updateDataCollectionPlan(id: number, plan: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined> {
    const [updatedPlan] = await db
      .update(dataCollectionPlans)
      .set({ ...plan, lastUpdated: new Date() })
      .where(eq(dataCollectionPlans.id, id))
      .returning();
    return updatedPlan || undefined;
  }

  async deleteDataCollectionPlan(id: number): Promise<boolean> {
    const result = await db.delete(dataCollectionPlans).where(eq(dataCollectionPlans.id, id));
    return result.rowCount > 0;
  }

  async getStorageConfigs(userId: number): Promise<StorageConfig[]> {
    return await db.select().from(storageConfigs).where(eq(storageConfigs.userId, userId));
  }

  async createStorageConfig(config: InsertConfig): Promise<StorageConfig> {
    const [newConfig] = await db
      .insert(storageConfigs)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateStorageConfig(id: number, config: Partial<StorageConfig>): Promise<StorageConfig | undefined> {
    const [updatedConfig] = await db
      .update(storageConfigs)
      .set({ ...config, lastUpdated: new Date() })
      .where(eq(storageConfigs.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async getActivityLogs(userId?: number, projectId?: number): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs);
    
    if (userId && projectId) {
      query = query.where(and(eq(activityLogs.userId, userId), eq(activityLogs.projectId, projectId)));
    } else if (userId) {
      query = query.where(eq(activityLogs.userId, userId));
    } else if (projectId) {
      query = query.where(eq(activityLogs.projectId, projectId));
    }
    
    return await query.orderBy(desc(activityLogs.timestamp));
  }

  async createActivityLog(log: InsertLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getProcessData(projectId: number, datasetId: number): Promise<ProcessData[]> {
    return await db.select().from(processData)
      .where(and(eq(processData.projectId, projectId), eq(processData.datasetId, datasetId)))
      .orderBy(desc(processData.createdAt));
  }

  async createProcessData(data: InsertProcessData): Promise<ProcessData> {
    const [newData] = await db
      .insert(processData)
      .values(data)
      .returning();
    return newData;
  }

  async getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined> {
    const [matrix] = await db.select().from(projectRaciMatrix).where(eq(projectRaciMatrix.projectId, projectId));
    return matrix || undefined;
  }

  async createRaciMatrix(matrix: InsertRaciMatrix): Promise<ProjectRaciMatrix> {
    const [newMatrix] = await db
      .insert(projectRaciMatrix)
      .values(matrix)
      .returning();
    return newMatrix;
  }

  async updateRaciMatrix(id: number, matrix: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined> {
    const [updatedMatrix] = await db
      .update(projectRaciMatrix)
      .set({ ...matrix, lastUpdated: new Date() })
      .where(eq(projectRaciMatrix.id, id))
      .returning();
    return updatedMatrix || undefined;
  }

  async getGateReviewDeliverables(projectId: number, phase?: string): Promise<GateReviewDeliverable[]> {
    let whereConditions = [eq(gateReviewDeliverables.projectId, projectId)];
    
    if (phase) {
      whereConditions.push(eq(gateReviewDeliverables.phase, phase));
    }
    
    return await db
      .select()
      .from(gateReviewDeliverables)
      .where(and(...whereConditions))
      .orderBy(asc(gateReviewDeliverables.id));
  }

  async getGateReviewDeliverable(id: number): Promise<GateReviewDeliverable | undefined> {
    const [deliverable] = await db.select().from(gateReviewDeliverables).where(eq(gateReviewDeliverables.id, id));
    return deliverable || undefined;
  }

  async createGateReviewDeliverable(deliverable: InsertGateReviewDeliverable): Promise<GateReviewDeliverable> {
    const [newDeliverable] = await db
      .insert(gateReviewDeliverables)
      .values(deliverable)
      .returning();
    return newDeliverable;
  }

  async updateGateReviewDeliverable(id: number, deliverable: Partial<GateReviewDeliverable>): Promise<GateReviewDeliverable | undefined> {
    const [updatedDeliverable] = await db
      .update(gateReviewDeliverables)
      .set({ ...deliverable, lastUpdated: new Date() })
      .where(eq(gateReviewDeliverables.id, id))
      .returning();
    return updatedDeliverable || undefined;
  }

  async deleteGateReviewDeliverable(id: number): Promise<boolean> {
    const result = await db.delete(gateReviewDeliverables).where(eq(gateReviewDeliverables.id, id));
    return result.rowCount > 0;
  }

  async getGateReviewValidators(projectId: number, phase?: string): Promise<GateReviewValidator[]> {
    let query = db.select().from(gateReviewValidators).where(eq(gateReviewValidators.projectId, projectId));
    
    if (phase) {
      query = query.where(and(eq(gateReviewValidators.projectId, projectId), eq(gateReviewValidators.phase, phase)));
    }
    
    return await query;
  }

  async getGateReviewValidator(id: number): Promise<GateReviewValidator | undefined> {
    const [validator] = await db.select().from(gateReviewValidators).where(eq(gateReviewValidators.id, id));
    return validator || undefined;
  }

  async createGateReviewValidator(validator: InsertGateReviewValidator): Promise<GateReviewValidator> {
    const [newValidator] = await db
      .insert(gateReviewValidators)
      .values(validator)
      .returning();
    return newValidator;
  }

  async updateGateReviewValidator(id: number, validator: Partial<GateReviewValidator>): Promise<GateReviewValidator | undefined> {
    const [updatedValidator] = await db
      .update(gateReviewValidators)
      .set({ ...validator, lastUpdated: new Date() })
      .where(eq(gateReviewValidators.id, id))
      .returning();
    return updatedValidator || undefined;
  }

  async deleteGateReviewValidator(id: number): Promise<boolean> {
    const result = await db.delete(gateReviewValidators).where(eq(gateReviewValidators.id, id));
    return result.rowCount > 0;
  }

  async getGanttTasks(projectId: number): Promise<GanttTask[]> {
    return await db.select().from(ganttTasks).where(eq(ganttTasks.projectId, projectId));
  }

  async createGanttTask(task: InsertGanttTask): Promise<GanttTask> {
    const [newTask] = await db
      .insert(ganttTasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateGanttTask(id: number, task: Partial<GanttTask>): Promise<GanttTask | undefined> {
    const [updatedTask] = await db
      .update(ganttTasks)
      .set(task)
      .where(eq(ganttTasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async deleteGanttTask(id: number): Promise<boolean> {
    const result = await db.delete(ganttTasks).where(eq(ganttTasks.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();