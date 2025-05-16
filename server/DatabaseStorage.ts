import { 
  users, projects, projectCharters, sipocDiagrams, customerRequirements, businessRequirements,
  datasets, dataCollectionPlans, storageConfigs, activityLogs, processData, projectRaciMatrix,
  gateReviewDeliverables, gateReviewValidators, ganttTasks,
  type User, type InsertUser, type UpsertUser,
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
  type ProjectRaciMatrix, type InsertRaciMatrix,
  type GateReviewDeliverable, type InsertGateReviewDeliverable,
  type GateReviewValidator, type InsertGateReviewValidator,
  type GanttTask, type InsertGanttTask
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, isNull, asc } from "drizzle-orm";

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string | number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id.toString()));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastLogin(id: string | number): Promise<void> {
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id.toString()));
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

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.createdBy, userId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...projectUpdate, lastUpdated: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Project Charter operations
  async getCharter(projectId: number): Promise<ProjectCharter | undefined> {
    const [charter] = await db
      .select()
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId));
    return charter;
  }
  
  // Alias for getCharter
  async getProjectCharter(projectId: number): Promise<ProjectCharter | undefined> {
    return this.getCharter(projectId);
  }

  async createCharter(insertCharter: InsertCharter): Promise<ProjectCharter> {
    const [charter] = await db
      .insert(projectCharters)
      .values(insertCharter)
      .returning();
    return charter;
  }

  async updateCharter(id: number, charterUpdate: Partial<ProjectCharter>): Promise<ProjectCharter | undefined> {
    const [charter] = await db
      .update(projectCharters)
      .set({ ...charterUpdate, lastUpdated: new Date() })
      .where(eq(projectCharters.id, id))
      .returning();
    return charter;
  }

  // Other storage operations would follow the same pattern...
  // The rest of your existing MemStorage methods translated to database operations
  
  // SIPOC operations
  async getSipoc(projectId: number): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db
      .select()
      .from(sipocDiagrams)
      .where(eq(sipocDiagrams.projectId, projectId));
    return sipoc;
  }

  async createSipoc(insertSipoc: InsertSipoc): Promise<SipocDiagram> {
    const [sipoc] = await db
      .insert(sipocDiagrams)
      .values(insertSipoc)
      .returning();
    return sipoc;
  }

  async updateSipoc(id: number, sipocUpdate: Partial<SipocDiagram>): Promise<SipocDiagram | undefined> {
    const [sipoc] = await db
      .update(sipocDiagrams)
      .set({ ...sipocUpdate, lastUpdated: new Date() })
      .where(eq(sipocDiagrams.id, id))
      .returning();
    return sipoc;
  }

  // Customer Requirements operations
  async getRequirements(projectId: number): Promise<CustomerRequirement[]> {
    return await db
      .select()
      .from(customerRequirements)
      .where(eq(customerRequirements.projectId, projectId));
  }
  
  // Alias for getRequirements
  async getRequirementsByProjectId(projectId: number): Promise<CustomerRequirement[]> {
    return this.getRequirements(projectId);
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<CustomerRequirement> {
    const [requirement] = await db
      .insert(customerRequirements)
      .values(insertRequirement)
      .returning();
    return requirement;
  }

  async updateRequirement(id: number, requirementUpdate: Partial<CustomerRequirement>): Promise<CustomerRequirement | undefined> {
    const [requirement] = await db
      .update(customerRequirements)
      .set({ ...requirementUpdate, lastUpdated: new Date() })
      .where(eq(customerRequirements.id, id))
      .returning();
    return requirement;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    await db.delete(customerRequirements).where(eq(customerRequirements.id, id));
    return true;
  }

  // Business Requirements operations
  async getBusinessRequirements(projectId: number): Promise<BusinessRequirement[]> {
    return await db
      .select()
      .from(businessRequirements)
      .where(eq(businessRequirements.projectId, projectId));
  }
  
  // Alias for getBusinessRequirements
  async getBusinessRequirementsByProjectId(projectId: number): Promise<BusinessRequirement[]> {
    return this.getBusinessRequirements(projectId);
  }

  async createBusinessRequirement(insertBusinessRequirement: InsertBusinessRequirement): Promise<BusinessRequirement> {
    const [businessRequirement] = await db
      .insert(businessRequirements)
      .values(insertBusinessRequirement)
      .returning();
    return businessRequirement;
  }

  async updateBusinessRequirement(id: number, businessRequirementUpdate: Partial<BusinessRequirement>): Promise<BusinessRequirement | undefined> {
    const [businessRequirement] = await db
      .update(businessRequirements)
      .set({ ...businessRequirementUpdate, lastUpdated: new Date() })
      .where(eq(businessRequirements.id, id))
      .returning();
    return businessRequirement;
  }

  async deleteBusinessRequirement(id: number): Promise<boolean> {
    await db.delete(businessRequirements).where(eq(businessRequirements.id, id));
    return true;
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
    const [dataset] = await db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id));
    return dataset;
  }
  
  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const [dataset] = await db
      .insert(datasets)
      .values(insertDataset)
      .returning();
    return dataset;
  }
  
  async updateDataset(id: number, datasetUpdate: Partial<Dataset>): Promise<Dataset | undefined> {
    const [dataset] = await db
      .update(datasets)
      .set({ ...datasetUpdate, lastUpdated: new Date() })
      .where(eq(datasets.id, id))
      .returning();
    return dataset;
  }
  
  async deleteDataset(id: number): Promise<boolean> {
    await db.delete(datasets).where(eq(datasets.id, id));
    return true;
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
      .values(insertPlan)
      .returning();
    return plan;
  }
  
  async updateDataCollectionPlan(id: number, planUpdate: Partial<DataCollectionPlan>): Promise<DataCollectionPlan | undefined> {
    const [plan] = await db
      .update(dataCollectionPlans)
      .set({ ...planUpdate, lastUpdated: new Date() })
      .where(eq(dataCollectionPlans.id, id))
      .returning();
    return plan;
  }
  
  async deleteDataCollectionPlan(id: number): Promise<boolean> {
    await db.delete(dataCollectionPlans).where(eq(dataCollectionPlans.id, id));
    return true;
  }
  
  // Storage Configuration operations
  async getStorageConfig(userId: number): Promise<StorageConfig | undefined> {
    const [config] = await db
      .select()
      .from(storageConfigs)
      .where(eq(storageConfigs.userId, userId));
    return config;
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
      .set({ ...configUpdate, lastUpdated: new Date() })
      .where(eq(storageConfigs.id, id))
      .returning();
    return config;
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
    return data;
  }
  
  async createProcessData(insertProcessData: InsertProcessData): Promise<ProcessData> {
    const [data] = await db
      .insert(processData)
      .values(insertProcessData)
      .returning();
    return data;
  }
  
  async updateProcessData(id: number, dataUpdate: Partial<ProcessData>): Promise<ProcessData | undefined> {
    const [data] = await db
      .update(processData)
      .set(dataUpdate)
      .where(eq(processData.id, id))
      .returning();
    return data;
  }
  
  // RACI Matrix operations
  async getRaciMatrix(projectId: number): Promise<ProjectRaciMatrix | undefined> {
    const [raciMatrix] = await db
      .select()
      .from(projectRaciMatrix)
      .where(eq(projectRaciMatrix.projectId, projectId));
    return raciMatrix;
  }
  
  async createRaciMatrix(insertRaciMatrix: InsertRaciMatrix): Promise<ProjectRaciMatrix> {
    const [raciMatrix] = await db
      .insert(projectRaciMatrix)
      .values(insertRaciMatrix)
      .returning();
    return raciMatrix;
  }
  
  async updateRaciMatrix(id: number, raciMatrixUpdate: Partial<ProjectRaciMatrix>): Promise<ProjectRaciMatrix | undefined> {
    const [raciMatrix] = await db
      .update(projectRaciMatrix)
      .set({ ...raciMatrixUpdate, lastUpdated: new Date() })
      .where(eq(projectRaciMatrix.id, id))
      .returning();
    return raciMatrix;
  }
  
  // Gate Review Deliverables operations
  async getGateReviewDeliverables(projectId: number, phase: string): Promise<GateReviewDeliverable[]> {
    return await db
      .select()
      .from(gateReviewDeliverables)
      .where(and(
        eq(gateReviewDeliverables.projectId, projectId),
        eq(gateReviewDeliverables.phase, phase)
      ))
      .orderBy(asc(gateReviewDeliverables.id));
  }
  
  async getGateReviewDeliverable(id: number): Promise<GateReviewDeliverable | undefined> {
    const [deliverable] = await db
      .select()
      .from(gateReviewDeliverables)
      .where(eq(gateReviewDeliverables.id, id));
    return deliverable;
  }
  
  async createGateReviewDeliverable(insertDeliverable: InsertGateReviewDeliverable): Promise<GateReviewDeliverable> {
    const [deliverable] = await db
      .insert(gateReviewDeliverables)
      .values(insertDeliverable)
      .returning();
    return deliverable;
  }
  
  async updateGateReviewDeliverable(id: number, deliverableUpdate: Partial<GateReviewDeliverable>): Promise<GateReviewDeliverable | undefined> {
    const [deliverable] = await db
      .update(gateReviewDeliverables)
      .set(deliverableUpdate)
      .where(eq(gateReviewDeliverables.id, id))
      .returning();
    return deliverable;
  }
  
  async deleteGateReviewDeliverable(id: number): Promise<boolean> {
    await db.delete(gateReviewDeliverables).where(eq(gateReviewDeliverables.id, id));
    return true;
  }
  
  // Gate Review Validators operations
  async getGateReviewValidators(projectId: number, phase: string): Promise<GateReviewValidator[]> {
    return await db
      .select()
      .from(gateReviewValidators)
      .where(and(
        eq(gateReviewValidators.projectId, projectId),
        eq(gateReviewValidators.phase, phase)
      ));
  }
  
  async getGateReviewValidator(id: number): Promise<GateReviewValidator | undefined> {
    const [validator] = await db
      .select()
      .from(gateReviewValidators)
      .where(eq(gateReviewValidators.id, id));
    return validator;
  }
  
  async createGateReviewValidator(insertValidator: InsertGateReviewValidator): Promise<GateReviewValidator> {
    const [validator] = await db
      .insert(gateReviewValidators)
      .values(insertValidator)
      .returning();
    return validator;
  }
  
  async updateGateReviewValidator(id: number, validatorUpdate: Partial<GateReviewValidator>): Promise<GateReviewValidator | undefined> {
    const [validator] = await db
      .update(gateReviewValidators)
      .set(validatorUpdate)
      .where(eq(gateReviewValidators.id, id))
      .returning();
    return validator;
  }
  
  async deleteGateReviewValidator(id: number): Promise<boolean> {
    await db.delete(gateReviewValidators).where(eq(gateReviewValidators.id, id));
    return true;
  }
  
  // Gantt Task operations
  async getGanttTasks(projectId: number): Promise<GanttTask[]> {
    return await db
      .select()
      .from(ganttTasks)
      .where(eq(ganttTasks.projectId, projectId))
      .orderBy(asc(ganttTasks.displayOrder));
  }
  
  async getGanttTask(id: number): Promise<GanttTask | undefined> {
    const [task] = await db
      .select()
      .from(ganttTasks)
      .where(eq(ganttTasks.id, id));
    return task;
  }
  
  async createGanttTask(insertTask: InsertGanttTask): Promise<GanttTask> {
    // Find the maximum display order and add 1 for new task
    const maxOrderResult = await db
      .select({ maxOrder: sql`MAX(display_order)` })
      .from(ganttTasks)
      .where(eq(ganttTasks.projectId, insertTask.projectId));
    
    const maxOrder = maxOrderResult[0]?.maxOrder || 0;
    const taskWithOrder = { ...insertTask, displayOrder: maxOrder + 1 };
    
    const [task] = await db
      .insert(ganttTasks)
      .values(taskWithOrder)
      .returning();
    return task;
  }
  
  async updateGanttTask(id: number, taskUpdate: Partial<GanttTask>): Promise<GanttTask | undefined> {
    const [task] = await db
      .update(ganttTasks)
      .set(taskUpdate)
      .where(eq(ganttTasks.id, id))
      .returning();
    return task;
  }
  
  async deleteGanttTask(id: number): Promise<boolean> {
    await db.delete(ganttTasks).where(eq(ganttTasks.id, id));
    return true;
  }
  
  async updateGanttTaskSequence(projectId: number, taskIds: number[]): Promise<boolean> {
    // Update display order for each task based on its position in the taskIds array
    for (let i = 0; i < taskIds.length; i++) {
      await db
        .update(ganttTasks)
        .set({ displayOrder: i + 1 })
        .where(eq(ganttTasks.id, taskIds[i]));
    }
    return true;
  }
}