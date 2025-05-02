import { pgTable, text, serial, integer, boolean, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectType: text("project_type").default("Green Belt"),
  projectCategory: text("project_category").default("Process Improvement"),
  currentPhase: text("current_phase").notNull().default("define"),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  actualEndDate: date("actual_end_date"),
  createdBy: integer("created_by").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  benefits: jsonb("benefits"),
  costs: jsonb("costs"),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  projectType: true,
  projectCategory: true,
  currentPhase: true,
  status: true,
  progress: true,
  startDate: true,
  targetEndDate: true,
  createdBy: true,
});

// Stakeholder schema
export const stakeholderSchema = z.object({
  name: z.string(),
  function: z.string().optional(),
});

export type Stakeholder = z.infer<typeof stakeholderSchema>;

// Project Charter
export const projectCharters = pgTable("project_charters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  projectLeader: text("project_leader"),
  sponsor: text("sponsor"),
  sponsorFunction: text("sponsor_function"),
  // Replace single stakeholder with array
  stakeholders: jsonb("stakeholders").$type<Stakeholder[]>(),
  // Keep old fields for backwards compatibility
  stakeholder: text("stakeholder"),
  stakeholderFunction: text("stakeholder_function"),
  financialController: text("financial_controller"),
  projectCoach: text("project_coach"),
  beltLevel: text("belt_level"),
  coachBeltLevel: text("coach_belt_level"),
  projectType: text("project_type"),
  projectCategory: text("project_category"),
  businessCase: text("business_case"),
  problemStatement: text("problem_statement"),
  goals: text("goals"),
  scope: text("scope"),
  projectImage: text("project_image"),
  savingsPerYear: text("savings_per_year"),
  workingCapitalGains: text("working_capital_gains"),
  waccPercentage: text("wacc_percentage"),
  financialSavings: text("financial_savings"),
  fteBenefits: text("fte_benefits"),
  // FTE calculation parameters
  fteWorkingDaysPerYear: text("fte_working_days_per_year"),
  fteWorkingHoursPerDay: text("fte_working_hours_per_day"),
  fteTimeUnit: text("fte_time_unit"),
  fteSavedHours: text("fte_saved_hours"),
  fteCostPerYear: text("fte_cost_per_year"),
  fteCalculatedValue: text("fte_calculated_value"),
  softBenefits: jsonb("soft_benefits").$type<Array<{
    text: string;
    category: 'employee' | 'customer' | 'process' | 'growth';
  }>>(),
  // Project cost fields
  oneOffPeopleCost: text("one_off_people_cost"),
  oneOffTechnologyCost: text("one_off_technology_cost"),
  oneOffOtherCost: text("one_off_other_cost"),
  oneOffOtherExplanation: text("one_off_other_explanation"),
  opexPeopleCost: text("opex_people_cost"),
  opexTechnologyCost: text("opex_technology_cost"),
  opexOtherCost: text("opex_other_cost"),
  opexOtherExplanation: text("opex_other_explanation"),
  opexPeriod: text("opex_period"),
  capexCost: text("capex_cost"),
  capexExplanation: text("capex_explanation"),
  // Financial summary fields (calculated values)
  totalFinancialSavings: text("total_financial_savings"),
  totalProjectCosts: text("total_project_costs"),
  projectNetValue: text("project_net_value"),
  roi: text("roi"),
  breakeven: text("breakeven"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCharterSchema = createInsertSchema(projectCharters)
  .extend({
    // Set default empty array for stakeholders
    stakeholders: z.array(stakeholderSchema).default([]),
  })
  .pick({
  projectId: true,
  projectLeader: true,
  sponsor: true,
  sponsorFunction: true,
  stakeholders: true,
  // Keep old fields for backwards compatibility
  stakeholder: true,
  stakeholderFunction: true,
  financialController: true,
  projectCoach: true,
  beltLevel: true,
  coachBeltLevel: true,
  projectType: true,
  projectCategory: true,
  businessCase: true,
  problemStatement: true,
  goals: true,
  scope: true,
  projectImage: true,
  savingsPerYear: true,
  workingCapitalGains: true,
  waccPercentage: true,
  financialSavings: true,
  fteBenefits: true,
  // FTE calculation parameters
  fteWorkingDaysPerYear: true,
  fteWorkingHoursPerDay: true,
  fteTimeUnit: true,
  fteSavedHours: true,
  fteCostPerYear: true,
  fteCalculatedValue: true,
  softBenefits: true,
  // Project cost fields
  oneOffPeopleCost: true,
  oneOffTechnologyCost: true,
  oneOffOtherCost: true,
  oneOffOtherExplanation: true,
  opexPeopleCost: true,
  opexTechnologyCost: true,
  opexOtherCost: true,
  opexOtherExplanation: true,
  opexPeriod: true,
  capexCost: true,
  capexExplanation: true,
  // Financial summary fields
  totalFinancialSavings: true,
  totalProjectCosts: true,
  projectNetValue: true,
  roi: true,
  breakeven: true,
});

// SIPOC Diagrams
export const sipocDiagrams = pgTable("sipoc_diagrams", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  suppliers: text("suppliers"),
  inputs: text("inputs"),
  process: text("process"),
  outputs: text("outputs"),
  customers: text("customers"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertSipocSchema = createInsertSchema(sipocDiagrams).pick({
  projectId: true,
  suppliers: true,
  inputs: true,
  process: true,
  outputs: true,
  customers: true,
});

// Customer Requirements
export const customerRequirements = pgTable("customer_requirements", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement").notNull(),
  importance: integer("importance").notNull(),
  satisfaction: integer("satisfaction").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRequirementSchema = createInsertSchema(customerRequirements).pick({
  projectId: true,
  requirement: true,
  importance: true,
  satisfaction: true,
});

// Datasets
export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id"),
  records: integer("records").notNull().default(0),
  variables: integer("variables").notNull().default(0),
  storageType: text("storage_type").notNull(),
  storageLocation: text("storage_location"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
});

export const insertDatasetSchema = createInsertSchema(datasets).pick({
  name: true,
  description: true,
  projectId: true,
  records: true,
  variables: true,
  storageType: true,
  storageLocation: true,
  createdBy: true,
});

// Data Collection Plans
export const dataCollectionPlans = pgTable("data_collection_plans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  metric: text("metric").notNull(),
  operationalDefinition: text("operational_definition"),
  dataType: text("data_type"),
  collectionMethod: text("collection_method"),
  sampleSize: text("sample_size"),
  responsible: text("responsible"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(dataCollectionPlans).pick({
  projectId: true,
  metric: true,
  operationalDefinition: true,
  dataType: true,
  collectionMethod: true,
  sampleSize: true,
  responsible: true,
});

// Storage Configuration
export const storageConfigs = pgTable("storage_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cloudEnabled: boolean("cloud_enabled").notNull().default(true),
  cloudRegion: text("cloud_region"),
  cloudRetention: text("cloud_retention"),
  cloudEncryption: boolean("cloud_encryption"),
  serverEnabled: boolean("server_enabled").notNull().default(false),
  serverAddress: text("server_address"),
  serverPort: text("server_port"),
  serverDbType: text("server_db_type"),
  serverAuthType: text("server_auth_type"),
  localEnabled: boolean("local_enabled").notNull().default(false),
  localDirectory: text("local_directory"),
  localFormat: text("local_format"),
  localBackups: boolean("local_backups"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertConfigSchema = createInsertSchema(storageConfigs).pick({
  userId: true,
  cloudEnabled: true,
  cloudRegion: true,
  cloudRetention: true,
  cloudEncryption: true,
  serverEnabled: true,
  serverAddress: true,
  serverPort: true,
  serverDbType: true,
  serverAuthType: true,
  localEnabled: true,
  localDirectory: true,
  localFormat: true,
  localBackups: true,
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertLogSchema = createInsertSchema(activityLogs).pick({
  userId: true,
  projectId: true,
  action: true,
  details: true,
});

// Process Data (for statistical analysis)
export const processData = pgTable("process_data", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  projectId: integer("project_id").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProcessDataSchema = createInsertSchema(processData).pick({
  datasetId: true,
  projectId: true,
  data: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect & {
  // Additional fields that are added at runtime but not stored in DB directly
  benefits?: ProjectBenefits;
  costs?: ProjectCosts;
  softBenefits?: SoftBenefit[];
  phases?: {
    define?: { status: string };
    measure?: { status: string };
    analyze?: { status: string };
    improve?: { status: string };
    control?: { status: string };
  };
};
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectCharter = typeof projectCharters.$inferSelect;
export type InsertCharter = z.infer<typeof insertCharterSchema>;

export type SipocDiagram = typeof sipocDiagrams.$inferSelect;
export type InsertSipoc = z.infer<typeof insertSipocSchema>;

export type CustomerRequirement = typeof customerRequirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;

export type DataCollectionPlan = typeof dataCollectionPlans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type StorageConfig = typeof storageConfigs.$inferSelect;
export type InsertConfig = z.infer<typeof insertConfigSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type ProcessData = typeof processData.$inferSelect;
export type InsertProcessData = z.infer<typeof insertProcessDataSchema>;

// Define a SoftBenefit type for TypeScript usage
export type SoftBenefit = {
  text: string;
  category: 'employee' | 'customer' | 'process' | 'growth';
};

// Benefits type definition
export type ProjectBenefits = {
  qualityCostSavings: number;
  workingCapitalGains: number;
  wacc: number;
  fteBenefits: number;
  avgFTECost: number;
};

// Costs type definition
export type ProjectCosts = {
  oneOffPeopleCost: number;
  oneOffTechnologyCost: number;
  oneOffOtherCost: number;
  capexCost: number;
  // Add any other cost types as needed
};
