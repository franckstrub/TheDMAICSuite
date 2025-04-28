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
  currentPhase: text("current_phase").notNull().default("define"),
  status: text("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  actualEndDate: date("actual_end_date"),
  createdBy: integer("created_by").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  currentPhase: true,
  status: true,
  progress: true,
  startDate: true,
  targetEndDate: true,
  createdBy: true,
});

// Project Charter
export const projectCharters = pgTable("project_charters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  businessCase: text("business_case"),
  problemStatement: text("problem_statement"),
  goals: text("goals"),
  scope: text("scope"),
  savingsPerYear: text("savings_per_year"),
  cashBenefits: text("cash_benefits"),
  fteBenefits: text("fte_benefits"),
  softBenefits: text("soft_benefits"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCharterSchema = createInsertSchema(projectCharters).pick({
  projectId: true,
  businessCase: true,
  problemStatement: true,
  goals: true,
  scope: true,
  savingsPerYear: true,
  cashBenefits: true,
  fteBenefits: true,
  softBenefits: true,
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

export type Project = typeof projects.$inferSelect;
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
