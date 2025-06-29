import { users, projects, projectCharters, sipocDiagrams, customerRequirements, businessRequirements, datasets, dataCollectionPlans, storageConfigs, projectRaciMatrix, activityLogs, processData, projectRisks, stakeholderAnalysisItems, gateReviewDeliverables, gateReviewValidators, ganttTasks, type User, type UpsertUser, type Project, type Charter, type SipocDiagram, type CustomerRequirement, type BusinessRequirement, type Dataset, type DataCollectionPlan, type StorageConfig, type RaciMatrix, type ActivityLog, type ProcessData, type Risk, type StakeholderAnalysisItem, type GateReviewDeliverable, type GateReviewValidator, type GanttTask } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gt, sql } from "drizzle-orm";
import type { Request, Response } from "express";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // All other operations remain the same
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: any): Promise<Project>;
  updateProject(id: number, project: any): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Charter operations
  getCharter(projectId: number): Promise<Charter | undefined>;
  createCharter(charter: any): Promise<Charter>;
  updateCharter(projectId: number, charter: any): Promise<Charter>;
  deleteCharter(projectId: number): Promise<void>;
  
  // SIPOC operations
  getSipoc(projectId: number): Promise<SipocDiagram | undefined>;
  createSipoc(sipoc: any): Promise<SipocDiagram>;
  updateSipoc(projectId: number, sipoc: any): Promise<SipocDiagram>;
  deleteSipoc(projectId: number): Promise<void>;
  
  // Requirements operations
  getRequirements(projectId: number): Promise<CustomerRequirement[]>;
  createRequirement(requirement: any): Promise<CustomerRequirement>;
  updateRequirement(id: number, requirement: any): Promise<CustomerRequirement>;
  deleteRequirement(id: number): Promise<void>;
  
  // Business Requirements operations
  getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]>;
  createBusinessRequirement(requirement: any): Promise<BusinessRequirement>;
  updateBusinessRequirement(id: number, requirement: any): Promise<BusinessRequirement>;
  deleteBusinessRequirement(id: number): Promise<void>;
  
  // Dataset operations
  getDatasets(): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: any): Promise<Dataset>;
  updateDataset(id: number, dataset: any): Promise<Dataset>;
  deleteDataset(id: number): Promise<void>;
  
  // Data collection plan operations
  getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]>;
  createDataCollectionPlan(plan: any): Promise<DataCollectionPlan>;
  updateDataCollectionPlan(id: number, plan: any): Promise<DataCollectionPlan>;
  deleteDataCollectionPlan(id: number): Promise<void>;
  deleteAllDataCollectionPlans(projectId: number): Promise<void>;
  
  // Storage config operations
  getStorageConfigs(userId: number): Promise<StorageConfig[]>;
  createStorageConfig(config: any): Promise<StorageConfig>;
  updateStorageConfig(id: number, config: any): Promise<StorageConfig>;
  deleteStorageConfig(id: number): Promise<void>;
  
  // RACI matrix operations
  getRaciMatrix(projectId: number): Promise<RaciMatrix | undefined>;
  createRaciMatrix(raci: any): Promise<RaciMatrix>;
  updateRaciMatrix(projectId: number, raci: any): Promise<RaciMatrix>;
  deleteRaciMatrix(projectId: number): Promise<void>;
  
  // Activity log operations
  getActivityLogs(userId?: number, projectId?: number): Promise<ActivityLog[]>;
  createActivityLog(log: any): Promise<ActivityLog>;
  
  // Process data operations
  getProcessData(projectId: number): Promise<ProcessData[]>;
  createProcessData(data: any): Promise<ProcessData>;
  
  // Risk operations
  getRisk(projectId: number): Promise<Risk | undefined>;
  createRisk(risk: any): Promise<Risk>;
  updateRisk(projectId: number, risk: any): Promise<Risk>;
  deleteRisk(projectId: number): Promise<void>;
  
  // Stakeholder analysis operations
  getStakeholderAnalysis(projectId: number): Promise<StakeholderAnalysisItem[]>;
  createStakeholderAnalysisItem(item: any): Promise<StakeholderAnalysisItem>;
  updateStakeholderAnalysisItem(id: number, item: any): Promise<StakeholderAnalysisItem>;
  deleteStakeholderAnalysisItem(id: number): Promise<void>;
  
  // Gate review operations
  getGateReviewDeliverables(projectId: number, phase?: string): Promise<GateReviewDeliverable[]>;
  getGateReviewDeliverable(id: number): Promise<GateReviewDeliverable | undefined>;
  createGateReviewDeliverable(deliverable: any): Promise<GateReviewDeliverable>;
  updateGateReviewDeliverable(id: number, deliverable: any): Promise<GateReviewDeliverable>;
  deleteGateReviewDeliverable(id: number): Promise<void>;
  
  getGateReviewValidators(projectId: number, phase?: string): Promise<GateReviewValidator[]>;
  getGateReviewValidator(id: number): Promise<GateReviewValidator | undefined>;
  createGateReviewValidator(validator: any): Promise<GateReviewValidator>;
  updateGateReviewValidator(id: number, validator: any): Promise<GateReviewValidator>;
  deleteGateReviewValidator(id: number): Promise<void>;
  
  // Gantt task operations
  getGanttTasks(projectId: number): Promise<GanttTask[]>;
  getGanttTask(id: number): Promise<GanttTask | undefined>;
  createGanttTask(task: any): Promise<GanttTask>;
  updateGanttTask(id: number, task: any): Promise<GanttTask>;
  deleteGanttTask(id: number): Promise<void>;
  reorderGanttTasks(projectId: number, taskUpdates: any[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, String(id)));
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.lastUpdated));
  }

  async getProjectsByCreatedBy(createdBy: string): Promise<Project[]> {
    return await db.select().from(projects)
      .where(eq(projects.createdBy, createdBy))
      .orderBy(desc(projects.lastUpdated));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: any): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: any): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, lastUpdated: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Charter operations
  async getCharter(projectId: number): Promise<Charter | undefined> {
    const [charter] = await db
      .select()
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId))
      .orderBy(desc(projectCharters.lastUpdated));
    return charter;
  }

  async createCharter(charter: any): Promise<Charter> {
    const [newCharter] = await db.insert(projectCharters).values(charter).returning();
    return newCharter;
  }

  async updateCharter(projectId: number, charter: any): Promise<Charter> {
    const [updatedCharter] = await db
      .update(projectCharters)
      .set({ ...charter, lastUpdated: new Date() })
      .where(eq(projectCharters.projectId, projectId))
      .returning();
    return updatedCharter;
  }

  async deleteCharter(projectId: number): Promise<void> {
    await db.delete(projectCharters).where(eq(projectCharters.projectId, projectId));
  }

  // SIPOC operations
  async getSipoc(projectId: number): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db
      .select()
      .from(sipocDiagrams)
      .where(eq(sipocDiagrams.projectId, projectId));
    return sipoc;
  }

  async createSipoc(sipoc: any): Promise<SipocDiagram> {
    const [newSipoc] = await db.insert(sipocDiagrams).values(sipoc).returning();
    return newSipoc;
  }

  async updateSipoc(projectId: number, sipoc: any): Promise<SipocDiagram> {
    const [updatedSipoc] = await db
      .update(sipocDiagrams)
      .set({ ...sipoc, lastUpdated: new Date() })
      .where(eq(sipocDiagrams.projectId, projectId))
      .returning();
    return updatedSipoc;
  }

  async deleteSipoc(projectId: number): Promise<void> {
    await db.delete(sipocDiagrams).where(eq(sipocDiagrams.projectId, projectId));
  }

  // Requirements operations
  async getRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return await db
      .select()
      .from(customerRequirements)
      .where(eq(customerRequirements.projectId, projectId))
      .orderBy(asc(customerRequirements.id));
  }

  async createRequirement(requirement: any): Promise<CustomerRequirement> {
    const [newRequirement] = await db.insert(customerRequirements).values(requirement).returning();
    return newRequirement;
  }

  async updateRequirement(id: number, requirement: any): Promise<CustomerRequirement> {
    const [updatedRequirement] = await db
      .update(customerRequirements)
      .set({ ...requirement, lastUpdated: new Date() })
      .where(eq(customerRequirements.id, id))
      .returning();
    return updatedRequirement;
  }

  async deleteRequirement(id: number): Promise<void> {
    await db.delete(customerRequirements).where(eq(customerRequirements.id, id));
  }

  // Business Requirements operations
  async getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]> {
    return await db
      .select()
      .from(businessRequirements)
      .where(eq(businessRequirements.projectId, projectId))
      .orderBy(asc(businessRequirements.id));
  }

  async createBusinessRequirement(requirement: any): Promise<BusinessRequirement> {
    const [newRequirement] = await db.insert(businessRequirements).values(requirement).returning();
    return newRequirement;
  }

  async updateBusinessRequirement(id: number, requirement: any): Promise<BusinessRequirement> {
    const [updatedRequirement] = await db
      .update(businessRequirements)
      .set({ ...requirement, lastUpdated: new Date() })
      .where(eq(businessRequirements.id, id))
      .returning();
    return updatedRequirement;
  }

  async deleteBusinessRequirement(id: number): Promise<void> {
    await db.delete(businessRequirements).where(eq(businessRequirements.id, id));
  }

  // Dataset operations
  async getDatasets(): Promise<Dataset[]> {
    return await db.select().from(datasets).orderBy(desc(datasets.lastUpdated));
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset;
  }

  async createDataset(dataset: any): Promise<Dataset> {
    const [newDataset] = await db.insert(datasets).values(dataset).returning();
    return newDataset;
  }

  async updateDataset(id: number, dataset: any): Promise<Dataset> {
    const [updatedDataset] = await db
      .update(datasets)
      .set({ ...dataset, lastUpdated: new Date() })
      .where(eq(datasets.id, id))
      .returning();
    return updatedDataset;
  }

  async deleteDataset(id: number): Promise<void> {
    await db.delete(datasets).where(eq(datasets.id, id));
  }

  // Data collection plan operations
  async getDataCollectionPlans(projectId: number): Promise<DataCollectionPlan[]> {
    return await db
      .select()
      .from(dataCollectionPlans)
      .where(eq(dataCollectionPlans.projectId, projectId))
      .orderBy(asc(dataCollectionPlans.displayOrder), asc(dataCollectionPlans.id));
  }

  async createDataCollectionPlan(plan: any): Promise<DataCollectionPlan> {
    const [newPlan] = await db.insert(dataCollectionPlans).values(plan).returning();
    return newPlan;
  }

  async updateDataCollectionPlan(id: number, plan: any): Promise<DataCollectionPlan> {
    const [updatedPlan] = await db
      .update(dataCollectionPlans)
      .set({ ...plan, lastUpdated: new Date() })
      .where(eq(dataCollectionPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteDataCollectionPlan(id: number): Promise<void> {
    await db.delete(dataCollectionPlans).where(eq(dataCollectionPlans.id, id));
  }

  async deleteAllDataCollectionPlans(projectId: number): Promise<void> {
    await db.delete(dataCollectionPlans).where(eq(dataCollectionPlans.projectId, projectId));
  }

  // Storage config operations
  async getStorageConfigs(userId: number): Promise<StorageConfig[]> {
    return await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.userId, userId))
      .orderBy(desc(storageConfigs.lastUpdated));
  }

  async createStorageConfig(config: any): Promise<StorageConfig> {
    const [newConfig] = await db.insert(storageConfigs).values(config).returning();
    return newConfig;
  }

  async updateStorageConfig(id: number, config: any): Promise<StorageConfig> {
    const [updatedConfig] = await db
      .update(storageConfigs)
      .set({ ...config, lastUpdated: new Date() })
      .where(eq(storageConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async deleteStorageConfig(id: number): Promise<void> {
    await db.delete(storageConfigs).where(eq(storageConfigs.id, id));
  }

  // RACI matrix operations
  async getRaciMatrix(projectId: number): Promise<RaciMatrix | undefined> {
    const [raci] = await db
      .select()
      .from(projectRaciMatrix)
      .where(eq(projectRaciMatrix.projectId, projectId));
    return raci;
  }

  async createRaciMatrix(raci: any): Promise<RaciMatrix> {
    const [newRaci] = await db.insert(projectRaciMatrix).values(raci).returning();
    return newRaci;
  }

  async updateRaciMatrix(projectId: number, raci: any): Promise<RaciMatrix> {
    const [updatedRaci] = await db
      .update(projectRaciMatrix)
      .set({ ...raci, lastUpdated: new Date() })
      .where(eq(projectRaciMatrix.projectId, projectId))
      .returning();
    return updatedRaci;
  }

  async deleteRaciMatrix(projectId: number): Promise<void> {
    await db.delete(projectRaciMatrix).where(eq(projectRaciMatrix.projectId, projectId));
  }

  // Activity log operations
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

  async createActivityLog(log: any): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Process data operations
  async getProcessData(projectId: number): Promise<ProcessData[]> {
    return await db
      .select()
      .from(processData)
      .where(eq(processData.projectId, projectId))
      .orderBy(desc(processData.createdAt));
  }

  async createProcessData(data: any): Promise<ProcessData> {
    const [newData] = await db.insert(processData).values(data).returning();
    return newData;
  }

  // Risk operations
  async getRisk(projectId: number): Promise<Risk | undefined> {
    const [risk] = await db
      .select()
      .from(projectRisks)
      .where(eq(projectRisks.projectId, projectId));
    return risk;
  }

  async createRisk(risk: any): Promise<Risk> {
    const [newRisk] = await db.insert(projectRisks).values(risk).returning();
    return newRisk;
  }

  async updateRisk(projectId: number, risk: any): Promise<Risk> {
    const [updatedRisk] = await db
      .update(projectRisks)
      .set({ ...risk, lastUpdated: new Date() })
      .where(eq(projectRisks.projectId, projectId))
      .returning();
    return updatedRisk;
  }

  async deleteRisk(projectId: number): Promise<void> {
    await db.delete(projectRisks).where(eq(projectRisks.projectId, projectId));
  }

  // Stakeholder analysis operations
  async getStakeholderAnalysis(projectId: number): Promise<StakeholderAnalysisItem[]> {
    return await db
      .select()
      .from(stakeholderAnalysisItems)
      .where(eq(stakeholderAnalysisItems.projectId, projectId))
      .orderBy(asc(stakeholderAnalysisItems.id));
  }

  async createStakeholderAnalysisItem(item: any): Promise<StakeholderAnalysisItem> {
    const [newItem] = await db.insert(stakeholderAnalysisItems).values(item).returning();
    return newItem;
  }

  async updateStakeholderAnalysisItem(id: number, item: any): Promise<StakeholderAnalysisItem> {
    const [updatedItem] = await db
      .update(stakeholderAnalysisItems)
      .set({ ...item, lastUpdated: new Date() })
      .where(eq(stakeholderAnalysisItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteStakeholderAnalysisItem(id: number): Promise<void> {
    await db.delete(stakeholderAnalysisItems).where(eq(stakeholderAnalysisItems.id, id));
  }

  // Gate review operations
  async getGateReviewDeliverables(projectId: number, phase?: string): Promise<GateReviewDeliverable[]> {
    try {
      if (phase) {
        return await db
          .select()
          .from(gateReviewDeliverables)
          .where(and(
            eq(gateReviewDeliverables.projectId, projectId),
            eq(gateReviewDeliverables.phase, phase)
          ))
          .orderBy(asc(gateReviewDeliverables.id));
      } else {
        return await db
          .select()
          .from(gateReviewDeliverables)
          .where(eq(gateReviewDeliverables.projectId, projectId))
          .orderBy(asc(gateReviewDeliverables.id));
      }
    } catch (error) {
      console.error('Error in getGateReviewDeliverables:', error);
      throw error;
    }
  }

  async getGateReviewDeliverable(id: number): Promise<GateReviewDeliverable | undefined> {
    const [deliverable] = await db.select().from(gateReviewDeliverables).where(eq(gateReviewDeliverables.id, id));
    return deliverable;
  }

  async createGateReviewDeliverable(deliverable: any): Promise<GateReviewDeliverable> {
    const [newDeliverable] = await db.insert(gateReviewDeliverables).values(deliverable).returning();
    return newDeliverable;
  }

  async updateGateReviewDeliverable(id: number, deliverable: any): Promise<GateReviewDeliverable> {
    const [updatedDeliverable] = await db
      .update(gateReviewDeliverables)
      .set({ ...deliverable, lastUpdated: new Date() })
      .where(eq(gateReviewDeliverables.id, id))
      .returning();
    return updatedDeliverable;
  }

  async deleteGateReviewDeliverable(id: number): Promise<void> {
    await db.delete(gateReviewDeliverables).where(eq(gateReviewDeliverables.id, id));
  }

  async getGateReviewValidators(projectId: number, phase?: string): Promise<GateReviewValidator[]> {
    let query = db.select().from(gateReviewValidators).where(eq(gateReviewValidators.projectId, projectId));
    
    if (phase) {
      query = query.where(and(eq(gateReviewValidators.projectId, projectId), eq(gateReviewValidators.phase, phase)));
    }
    
    return await query.orderBy(asc(gateReviewValidators.id));
  }

  async getGateReviewValidator(id: number): Promise<GateReviewValidator | undefined> {
    const [validator] = await db.select().from(gateReviewValidators).where(eq(gateReviewValidators.id, id));
    return validator;
  }

  async createGateReviewValidator(validator: any): Promise<GateReviewValidator> {
    const [newValidator] = await db.insert(gateReviewValidators).values(validator).returning();
    return newValidator;
  }

  async updateGateReviewValidator(id: number, validator: any): Promise<GateReviewValidator> {
    const [updatedValidator] = await db
      .update(gateReviewValidators)
      .set({ ...validator, lastUpdated: new Date() })
      .where(eq(gateReviewValidators.id, id))
      .returning();
    return updatedValidator;
  }

  async deleteGateReviewValidator(id: number): Promise<void> {
    await db.delete(gateReviewValidators).where(eq(gateReviewValidators.id, id));
  }

  // Gantt task operations
  async getGanttTasks(projectId: number): Promise<GanttTask[]> {
    return await db
      .select()
      .from(ganttTasks)
      .where(eq(ganttTasks.projectId, projectId))
      .orderBy(asc(ganttTasks.sequence));
  }

  async getGanttTask(id: number): Promise<GanttTask | undefined> {
    const [task] = await db.select().from(ganttTasks).where(eq(ganttTasks.id, id));
    return task;
  }

  async createGanttTask(task: any): Promise<GanttTask> {
    const [newTask] = await db.insert(ganttTasks).values(task).returning();
    return newTask;
  }

  async updateGanttTask(id: number, task: any): Promise<GanttTask> {
    const [updatedTask] = await db
      .update(ganttTasks)
      .set({ ...task, lastUpdated: new Date() })
      .where(eq(ganttTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteGanttTask(id: number): Promise<void> {
    // First, get the task to know its sequence and project
    const [taskToDelete] = await db.select().from(ganttTasks).where(eq(ganttTasks.id, id));
    
    if (!taskToDelete) {
      return;
    }

    // Delete the task
    await db.delete(ganttTasks).where(eq(ganttTasks.id, id));
    
    // Decrement sequence for all tasks with sequence greater than the deleted task
    await db
      .update(ganttTasks)
      .set({ 
        sequence: sql`${ganttTasks.sequence} - 1`,
        lastUpdated: new Date()
      })
      .where(
        and(
          eq(ganttTasks.projectId, taskToDelete.projectId),
          gt(ganttTasks.sequence, taskToDelete.sequence)
        )
      );
  }

  async reorderGanttTasks(projectId: number, taskUpdates: any[]): Promise<void> {
    for (const update of taskUpdates) {
      await db
        .update(ganttTasks)
        .set({ sequence: update.sequence, lastUpdated: new Date() })
        .where(eq(ganttTasks.id, update.id));
    }
  }
}

export const storage = new DatabaseStorage();