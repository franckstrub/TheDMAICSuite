import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  json,
  index,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// RACI role types
export const raciRoleTypes = ["R", "A", "C", "I"] as const;
export type RaciRole = (typeof raciRoleTypes)[number];

// Stakeholder Analysis Interest Level
export const interestLevels = ["High", "Medium", "Low"] as const;
export type InterestLevel = (typeof interestLevels)[number];

// Stakeholder Analysis Resistance Type
export const resistanceTypes = [
  "Technical",
  "Political",
  "Cultural",
  "Personal",
] as const;
export type ResistanceType = (typeof resistanceTypes)[number];

// Stakeholder Analysis Influence Level
export const influenceLevels = ["High", "Medium", "Low"] as const;
export type InfluenceLevel = (typeof influenceLevels)[number];

// Stakeholder Analysis Support Level
export const supportLevels = ["Supporter", "Neutral", "Resistant"] as const;
export type SupportLevel = (typeof supportLevels)[number];

// Unit appraised type options for MSA
export const unitAppraisedTypes = [
  "Part",
  "Unit",
  "File",
  "Document",
  "Other",
] as const;
export type UnitAppraisedType = (typeof unitAppraisedTypes)[number];

// Gate Review Validation Status
export const validationStatusTypes = [
  "Pending",
  "Approved",
  "Rejected",
] as const;
export type ValidationStatus = (typeof validationStatusTypes)[number];

export const deliverableRequirementTypes = [
  "Required",
  "Optional",
  "Added by User",
] as const;
export type DeliverableRequirementType =
  (typeof deliverableRequirementTypes)[number];

// User Roles
export const userRoles = ["super_admin", "admin", "manager", "member"] as const;
export type UserRole = (typeof userRoles)[number];

// Organizations table for multi-tenant support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: [
      "enterprise_small",
      "enterprise_medium",
      "solo_entrepreneur",
      "individual",
    ],
  }).notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  subscriptionTier: text("subscription_tier"),
  isActive: boolean("is_active").default(true),
});

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  }),
);

// Users (for Replit authentication)
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  phone: text("phone"),
  phoneCountryCode: text("phone_country_code"),
  companyName: text("company_name"),
  role: text("role", {
    enum: ["super_admin", "admin", "manager", "member"],
  }).default("admin"),
  billingAddress: jsonb("billing_address").$type<{
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const updateUserProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  phone: true,
  phoneCountryCode: true,
  companyName: true,
  billingAddress: true,
  profileImageUrl: true,
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  projectType: text("project_type").default("Green Belt"),
  projectCategory: text("project_category").default("Process Improvement"),
  projectTypology: text("project_typology").default("Project"),
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
  softBenefits: jsonb("soft_benefits"),
  elevatorSpeech: text("elevator_speech"),
  ganttViewMode: text("gantt_view_mode").default("months"),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  organizationId: true,
  title: true,
  description: true,
  projectType: true,
  projectCategory: true,
  projectTypology: true,
  currentPhase: true,
  status: true,
  progress: true,
  startDate: true,
  targetEndDate: true,
  createdBy: true,
  elevatorSpeech: true,
  ganttViewMode: true,
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
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  projectTitle: text("project_title"), // Add projectTitle field to store the title
  projectReferenceNumber: text("project_reference_number"),
  projectLeader: text("project_leader"),
  sponsor: text("sponsor"),
  sponsorFunction: text("sponsor_function"),
  // Replace single stakeholder with array
  stakeholders: jsonb("stakeholders").$type<Stakeholder[]>(),
  // Team members array
  teamMembers: jsonb("team_members").$type<Stakeholder[]>(),
  // Keep old fields for backwards compatibility
  stakeholder: text("stakeholder"),
  stakeholderFunction: text("stakeholder_function"),
  financialController: text("financial_controller"),
  projectCoach: text("project_coach"),
  beltLevel: text("belt_level"),
  coachBeltLevel: text("coach_belt_level"),
  projectType: text("project_type"),
  projectCategory: text("project_category"),
  projectTypology: text("project_typology"),
  businessCase: text("business_case"),
  problemStatement: text("problem_statement"),
  goals: text("goals"),
  scope: text("scope"),
  projectImage: text("project_image"),
  // Project dates
  startDate: text("start_date"),
  targetEndDate: text("target_end_date"),
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
  softBenefits: text("soft_benefits"),
  // Milestone dates
  kick_off_date: text("kick_off_date"),
  define_phase_date: text("define_phase_date"),
  measure_phase_date: text("measure_phase_date"),
  analyze_phase_date: text("analyze_phase_date"),
  improve_phase_date: text("improve_phase_date"),
  control_phase_date: text("control_phase_date"),

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
    // Set default empty array for team members
    teamMembers: z.array(stakeholderSchema).default([]),
  })
  .pick({
    organizationId: true,
    projectId: true,
    projectTitle: true, // Add projectTitle to the schema
    projectReferenceNumber: true,
    projectLeader: true,
    sponsor: true,
    sponsorFunction: true,
    stakeholders: true,
    teamMembers: true,
    // Keep old fields for backwards compatibility
    stakeholder: true,
    stakeholderFunction: true,
    financialController: true,
    projectCoach: true,
    beltLevel: true,
    coachBeltLevel: true,
    projectType: true,
    projectCategory: true,
    projectTypology: true,
    businessCase: true,
    problemStatement: true,
    goals: true,
    scope: true,
    projectImage: true,
    // Project dates
    startDate: true,
    targetEndDate: true,
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
    // Milestone dates
    kick_off_date: true,
    define_phase_date: true,
    measure_phase_date: true,
    analyze_phase_date: true,
    improve_phase_date: true,
    control_phase_date: true,
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
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  processName: text("process_name"),
  suppliers: text("suppliers"),
  inputs: text("inputs"),
  process: text("process"),
  outputs: text("outputs"),
  customers: text("customers"),
  // Additional rows for SIPOC (2-3)
  suppliers2: text("suppliers2"),
  inputs2: text("inputs2"),
  process2: text("process2"),
  outputs2: text("outputs2"),
  customers2: text("customers2"),
  suppliers3: text("suppliers3"),
  inputs3: text("inputs3"),
  process3: text("process3"),
  outputs3: text("outputs3"),
  customers3: text("customers3"),
  // Additional rows for SIPOC (4-7)
  suppliers4: text("suppliers4"),
  inputs4: text("inputs4"),
  process4: text("process4"),
  outputs4: text("outputs4"),
  customers4: text("customers4"),
  suppliers5: text("suppliers5"),
  inputs5: text("inputs5"),
  process5: text("process5"),
  outputs5: text("outputs5"),
  customers5: text("customers5"),
  suppliers6: text("suppliers6"),
  inputs6: text("inputs6"),
  process6: text("process6"),
  outputs6: text("outputs6"),
  customers6: text("customers6"),
  suppliers7: text("suppliers7"),
  inputs7: text("inputs7"),
  process7: text("process7"),
  outputs7: text("outputs7"),
  customers7: text("customers7"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertSipocSchema = createInsertSchema(sipocDiagrams).pick({
  organizationId: true,
  projectId: true,
  processName: true,
  suppliers: true,
  inputs: true,
  process: true,
  outputs: true,
  customers: true,
  suppliers2: true,
  inputs2: true,
  process2: true,
  outputs2: true,
  customers2: true,
  suppliers3: true,
  inputs3: true,
  process3: true,
  outputs3: true,
  customers3: true,
  suppliers4: true,
  inputs4: true,
  process4: true,
  outputs4: true,
  customers4: true,
  suppliers5: true,
  inputs5: true,
  process5: true,
  outputs5: true,
  customers5: true,
  suppliers6: true,
  inputs6: true,
  process6: true,
  outputs6: true,
  customers6: true,
  suppliers7: true,
  inputs7: true,
  process7: true,
  outputs7: true,
  customers7: true,
});

// Customer Requirements
export const customerRequirements = pgTable("customer_requirements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement").notNull(),
  customerRequirement: text("customer_requirement"),
  importance: integer("importance").notNull(),
  CTS: text("CTS").notNull().default(""), // Changed from integer to text for CTS
  ctq: text("ctq").default(""), // Critical to Quality field
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRequirementSchema = createInsertSchema(
  customerRequirements,
).pick({
  organizationId: true,
  projectId: true,
  requirement: true,
  customerRequirement: true,
  importance: true,
  CTS: true,
  ctq: true,
});

// Business Requirements
export const businessRequirements = pgTable("business_requirements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement").notNull(),
  businessNeed: text("business_need"),
  importance: integer("importance").notNull(),
  ctq: text("ctq").notNull().default(""), // Critical to Quality field for business requirements
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertBusinessRequirementSchema = createInsertSchema(
  businessRequirements,
).pick({
  organizationId: true,
  projectId: true,
  requirement: true,
  businessNeed: true,
  importance: true,
  ctq: true,
});

// Datasets
export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
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

// Point of Measure types
export const pointOfMeasureTypes = ["Input", "Process", "Output"] as const;
export type PointOfMeasureType = (typeof pointOfMeasureTypes)[number];

// Collection Method types
export const collectionMethodTypes = [
  "Random",
  "Stratified",
  "Systematic",
  "Time-based",
  "Rationale Subgrouping",
  "100% inspection",
  "Other",
] as const;
export type CollectionMethodType = (typeof collectionMethodTypes)[number];

// Data Collection Plans
export const dataCollectionPlans = pgTable("data_collection_plans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctq: text("ctq").notNull(),
  operationalDefinition: text("operational_definition"),
  dataType: text("data_type"),
  pointOfMeasure: text("point_of_measure").default("Output"),
  collectionMethod: text("collection_method").default("Random"),
  collectionMethodComment: text("collection_method_comment"), // For "Other" option
  sampleSize: integer("sample_size"),
  datesTimeFrequency: text("dates_time_frequency"),
  measurementSystem: text("measurement_system"),
  dataSource: text("data_source"),
  responsible: text("responsible"),
  displayOrder: integer("display_order").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(dataCollectionPlans).pick({
  projectId: true,
  organizationId: true,
  ctq: true,
  operationalDefinition: true,
  dataType: true,
  pointOfMeasure: true,
  collectionMethod: true,
  collectionMethodComment: true,
  sampleSize: true,
  datesTimeFrequency: true,
  measurementSystem: true,
  dataSource: true,
  responsible: true,
  displayOrder: true,
});

// Storage Configuration
export const storageConfigs = pgTable("storage_configs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
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
  organizationId: true,
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

// Project RACI Matrix
export const projectRaciMatrix = pgTable("project_raci_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  // Store the matrix as structured JSON with role assignments
  // Each row represents a team member/stakeholder
  // Each column represents a DMAIC phase
  raciData: jsonb("raci_data").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRaciSchema = createInsertSchema(projectRaciMatrix).pick({
  organizationId: true,
  projectId: true,
  raciData: true,
});

// Process RACI Matrix for Improve Phase (TO BE Process) - Solution-Specific
export const processRaciMatrix = pgTable("process_raci_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  // Store the matrix as structured JSON with role assignments for TO BE process
  // Each row represents a team member/stakeholder
  // Columns represent activities or process steps in the TO BE process
  raciData: jsonb("raci_data").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertProcessRaciSchema = createInsertSchema(processRaciMatrix).pick({
  organizationId: true,
  projectId: true,
  solutionId: true,
  raciData: true,
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertLogSchema = createInsertSchema(activityLogs).pick({
  organizationId: true,
  userId: true,
  projectId: true,
  action: true,
  details: true,
});

// Process Data (for statistical analysis)
export const processData = pgTable("process_data", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
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

// Project Risk Assessment
export const projectRisks = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),

  // First risk row (mandatory)
  riskName: text("risk_name").notNull(),
  probability: text("probability").notNull(),
  impact: text("impact").notNull(),
  riskCriticality: integer("risk_criticality").notNull(),
  mitigationPlan: text("mitigation_plan"),
  riskOwner: text("risk_owner"),

  // Optional additional risks (rows 2-6)
  riskName2: text("risk_name2"),
  probability2: text("probability2"),
  impact2: text("impact2"),
  riskCriticality2: integer("risk_criticality2"),
  mitigationPlan2: text("mitigation_plan2"),
  riskOwner2: text("risk_owner2"),

  riskName3: text("risk_name3"),
  probability3: text("probability3"),
  impact3: text("impact3"),
  riskCriticality3: integer("risk_criticality3"),
  mitigationPlan3: text("mitigation_plan3"),
  riskOwner3: text("risk_owner3"),

  riskName4: text("risk_name4"),
  probability4: text("probability4"),
  impact4: text("impact4"),
  riskCriticality4: integer("risk_criticality4"),
  mitigationPlan4: text("mitigation_plan4"),
  riskOwner4: text("risk_owner4"),

  riskName5: text("risk_name5"),
  probability5: text("probability5"),
  impact5: text("impact5"),
  riskCriticality5: integer("risk_criticality5"),
  mitigationPlan5: text("mitigation_plan5"),
  riskOwner5: text("risk_owner5"),

  riskName6: text("risk_name6"),
  probability6: text("probability6"),
  impact6: text("impact6"),
  riskCriticality6: integer("risk_criticality6"),
  mitigationPlan6: text("mitigation_plan6"),
  riskOwner6: text("risk_owner6"),

  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRiskSchema = createInsertSchema(projectRisks).pick({
  organizationId: true,
  projectId: true,

  riskName: true,
  probability: true,
  impact: true,
  riskCriticality: true,
  mitigationPlan: true,
  riskOwner: true,

  riskName2: true,
  probability2: true,
  impact2: true,
  riskCriticality2: true,
  mitigationPlan2: true,
  riskOwner2: true,

  riskName3: true,
  probability3: true,
  impact3: true,
  riskCriticality3: true,
  mitigationPlan3: true,
  riskOwner3: true,

  riskName4: true,
  probability4: true,
  impact4: true,
  riskCriticality4: true,
  mitigationPlan4: true,
  riskOwner4: true,

  riskName5: true,
  probability5: true,
  impact5: true,
  riskCriticality5: true,
  mitigationPlan5: true,
  riskOwner5: true,

  riskName6: true,
  probability6: true,
  impact6: true,
  riskCriticality6: true,
  mitigationPlan6: true,
  riskOwner6: true,
});

// User insert schema
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

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

export type BusinessRequirement = typeof businessRequirements.$inferSelect;
export type InsertBusinessRequirement = z.infer<
  typeof insertBusinessRequirementSchema
>;

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

export type ProjectRisk = typeof projectRisks.$inferSelect;
export type InsertRisk = z.infer<typeof insertRiskSchema>;

export type ProjectRaciMatrix = typeof projectRaciMatrix.$inferSelect;
export type InsertRaciMatrix = z.infer<typeof insertRaciSchema>;

export type ProcessRaciMatrix = typeof processRaciMatrix.$inferSelect;
export type InsertProcessRaciMatrix = z.infer<typeof insertProcessRaciSchema>;

// RACI matrix data structure
export type RaciMatrixData = {
  roles: {
    name: string;
    role: string; // The role field is now required
    phases: {
      define: RaciRole | null;
      measure: RaciRole | null;
      analyze: RaciRole | null;
      improve: RaciRole | null;
      control: RaciRole | null;
    };
  }[];
};

// Process RACI matrix data structure for TO BE Process
export type ProcessRaciMatrixData = {
  activities: string[]; // Array of activity/step names in the TO BE process
  roles: {
    name: string;
    role: string;
    responsibilities: {
      [activityIndex: number]: RaciRole | null; // Key is activity index, value is RACI role
    };
  }[];
};

// Define a SoftBenefit type for TypeScript usage
export type SoftBenefit = {
  text: string;
  category: "employee" | "customer" | "process" | "growth";
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

// Stakeholder Analysis Matrix
export const stakeholderAnalysisItems = pgTable("stakeholder_analysis_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  stakeholderName: text("stakeholder_name").notNull(),
  stakeholderRole: text("stakeholder_role"),
  interestLevel: text("interest_level")
    .$type<InterestLevel>()
    .notNull()
    .default("Medium"),
  resistanceType: text("resistance_type").$type<ResistanceType | null>(),
  influenceLevel: text("influence_level")
    .$type<InfluenceLevel>()
    .notNull()
    .default("Medium"),
  supportLevel: text("support_level")
    .$type<SupportLevel>()
    .notNull()
    .default("Neutral"),
  engagementStrategy: text("engagement_strategy"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Schema for inserting a stakeholder analysis item
export const insertStakeholderAnalysisItemSchema = createInsertSchema(
  stakeholderAnalysisItems,
).omit({
  id: true,
  lastUpdated: true,
});

// Type for insert operations
export type InsertStakeholderAnalysisItem = z.infer<
  typeof insertStakeholderAnalysisItemSchema
>;

// Type for select operations
export type StakeholderAnalysisItem =
  typeof stakeholderAnalysisItems.$inferSelect;

// Gate Review Deliverables
export const gateReviewDeliverables = pgTable("gate_review_deliverables", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  phase: text("phase").notNull(), // define, measure, analyze, improve, control
  name: text("name").notNull(),
  description: text("description"),
  isRequired: text("is_required")
    .$type<DeliverableRequirementType>()
    .notNull()
    .default("Required"),
  isCompleted: boolean("is_completed").notNull().default(false),
  fileAttachment: text("file_attachment"), // Path/filename for the attached document
  fileOriginalName: text("file_original_name"), // Original filename before upload
  fileSize: integer("file_size"), // File size in bytes
  fileType: text("file_type"), // MIME type of the file
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGateReviewDeliverableSchema = createInsertSchema(
  gateReviewDeliverables,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertGateReviewDeliverable = z.infer<
  typeof insertGateReviewDeliverableSchema
>;
export type GateReviewDeliverable = typeof gateReviewDeliverables.$inferSelect;

// Gate Review Validators
export const gateReviewValidators = pgTable("gate_review_validators", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  phase: text("phase").notNull(), // define, measure, analyze, improve, control
  validatorName: text("validator_name").notNull(),
  validatorRole: text("validator_role").notNull(), // sponsor, project_leader, financial_controller, coach, other
  status: text("status").$type<ValidationStatus>().notNull().default("Pending"),
  comments: text("comments"),
  validatedDate: timestamp("validated_date"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGateReviewValidatorSchema = createInsertSchema(
  gateReviewValidators,
).omit({
  id: true,
  validatedDate: true,
  lastUpdated: true,
});

export type InsertGateReviewValidator = z.infer<
  typeof insertGateReviewValidatorSchema
>;
export type GateReviewValidator = typeof gateReviewValidators.$inferSelect;

// Gantt Tasks for Work Breakdown Structure
export const ganttTasks = pgTable("gantt_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  progress: integer("progress").notNull().default(0),
  dependencies: text("dependencies"),
  assignee: text("assignee"),
  priority: text("priority").default("medium"),
  phase: text("phase").notNull(),
  status: text("status").default("not-started"),
  parentId: integer("parent_id"),
  sequence: integer("sequence").default(0),
  comments: text("comments"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGanttTaskSchema = createInsertSchema(ganttTasks).omit({
  id: true,
  lastUpdated: true,
});

export type InsertGanttTask = z.infer<typeof insertGanttTaskSchema>;
export type GanttTask = typeof ganttTasks.$inferSelect;

// Process Maps for DMAIC Measure Phase
export const processMaps = pgTable("process_maps", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  asIsDiagramData: text("as_is_diagram_data"), // Store draw.io XML data for AS-IS process
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Solution Process Maps for DMAIC Improve Phase - TO BE Process Maps per Solution
export const solutionProcessMaps = pgTable("solution_process_maps", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  diagramData: text("diagram_data"), // Store draw.io XML data for TO-BE process
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Fishbone Diagrams for DMAIC Analyze Phase
export const fishboneDiagrams = pgTable("fishbone_diagrams", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id")
    .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
    .notNull(),
  diagramData: text("diagram_data"), // Store draw.io XML data
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertFishboneDiagramSchema = createInsertSchema(
  fishboneDiagrams,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertFishboneDiagram = z.infer<typeof insertFishboneDiagramSchema>;
export type FishboneDiagram = typeof fishboneDiagrams.$inferSelect;

export const insertProcessMapSchema = createInsertSchema(processMaps).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProcessMap = z.infer<typeof insertProcessMapSchema>;
export type ProcessMap = typeof processMaps.$inferSelect;

export const insertSolutionProcessMapSchema = createInsertSchema(solutionProcessMaps).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSolutionProcessMap = z.infer<typeof insertSolutionProcessMapSchema>;
export type SolutionProcessMap = typeof solutionProcessMaps.$inferSelect;

// CTQ Type for CTS Characteristics
export const ctqTypes = ["Attribute", "Continuous"] as const;
export type CtqType = (typeof ctqTypes)[number];

// CTS Characteristics for DMAIC Measure Phase
export const ctsCharacteristics = pgTable("cts_characteristics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctq: text("ctq").notNull(),
  operationalDefinition: text("operational_definition"),
  ctqType: text("ctq_type").notNull().default("Continuous"), // "Attribute" or "Continuous"
  unit: text("unit"), // Unit of measurement - Only for Continuous
  targetPercentDefects: real("target_percent_defects"),
  target: real("target"), // Only for Continuous
  lsl: real("lsl"), // Lower Specification Limit - Only for Continuous
  usl: real("usl"), // Upper Specification Limit - Only for Continuous
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCtsCharacteristicsSchema = createInsertSchema(
  ctsCharacteristics,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCtsCharacteristics = z.infer<
  typeof insertCtsCharacteristicsSchema
>;
export type CtsCharacteristics = typeof ctsCharacteristics.$inferSelect;

// Root Cause Prioritization for DMAIC Analyze Phase
export const rootCausePrioritization = pgTable("root_cause_prioritization", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id")
    .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
    .notNull(),
  rootcause: text("rootcause").notNull(),
  multivotescore: real("multivotescore").notNull().default(0),
  criticalrootcause: boolean("criticalrootcause").notNull().default(false),
  firstwhy: text("firstwhy").default(""),
  secondwhy: text("secondwhy").default(""),
  thirdwhy: text("thirdwhy").default(""),
  fourthwhy: text("fourthwhy").default(""),
  fifthwhy: text("fifthwhy").default(""),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRootCausePrioritizationSchema = createInsertSchema(
  rootCausePrioritization,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertRootCausePrioritization = z.infer<
  typeof insertRootCausePrioritizationSchema
>;
export type RootCausePrioritization =
  typeof rootCausePrioritization.$inferSelect;

// Cause & Effect Matrix for DMAIC Analyze Phase
export const causeEffectMatrix = pgTable("cause_effect_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  rootCauses: json("root_causes").$type<string[]>(),
  ctqs: json("ctqs").$type<
    Array<{ ctq: string; ctqType: string; ctqId: number }>
  >(),
  importanceScores: json("importance_scores").$type<number[]>(),
  matrix: json("matrix").$type<string[][]>(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCauseEffectMatrixSchema = createInsertSchema(
  causeEffectMatrix,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCauseEffectMatrix = z.infer<
  typeof insertCauseEffectMatrixSchema
>;
export type CauseEffectMatrix = typeof causeEffectMatrix.$inferSelect;

// MSA (Measurement System Analysis) for each CTQ
export const msaAnalysis = pgTable("msa_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id), // Foreign key to CTS characteristics
  ctq: text("ctq").notNull(), // Links to CTQ from CTS characteristics (kept for backward compatibility)
  msaType: text("msa_type").notNull().default("Gage R&R"), // "Gage R&R", "Attribute Agreement", "Bias Study"

  // Attribute Agreement Analysis fields
  unitAppraisedType: text("unit_appraised_type")
    .$type<UnitAppraisedType>()
    .default("Part"),
  unitAppraisedTypeOther: text("unit_appraised_type_other"), // Comment for "Other" selection
  appraiser1Name: text("appraiser1_name"),
  appraiser2Name: text("appraiser2_name"),
  appraiser3Name: text("appraiser3_name"),
  agreementAnalysisData: text("agreement_analysis_data"), // JSON array of measurement data with structure: [{unitNumber: 1, reference: "OK", app1_rep1: "OK", app1_rep2: "KO", ...}]
  gageRRData: text("gage_rr_data"), // JSON array of continuous measurement data for Gage R&R analysis
  sigmaMultiplier: real("sigma_multiplier").default(6), // Number of sigma used in Gage R&R study (6 or 5.15)
  tolerance: real("tolerance"), // Tolerance field for Gage R&R calculations
  repetitions: integer("repetitions").default(2), // Number of repetitions per part (2 or 3)
  numberOfAppraisers: integer("number_of_appraisers").default(2), // Number of appraisers (2 or 3)
  showStatistics: boolean("show_statistics").default(false), // Show/hide statistics section
  studyDateTime: timestamp("study_date_time"),
  justification: text("justification"), // Measurement System Precision & Accuracy justification

  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertMsaAnalysisSchema = createInsertSchema(msaAnalysis).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMsaAnalysis = z.infer<typeof insertMsaAnalysisSchema>;
export type MsaAnalysis = typeof msaAnalysis.$inferSelect;

// Data set term types for process capability
export const dataSetTermTypes = ["Long Term", "Short Term"] as const;
export type DataSetTermType = (typeof dataSetTermTypes)[number];

// Capability Index Type
export const capabilityIndexType = z.enum(["Z", "Cp/Cpk"]);
export type CapabilityIndexType = z.infer<typeof capabilityIndexType>;

// Process Capability for each CTQ
export const processCapability = pgTable("process_capability", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id), // Foreign key to CTS characteristics
  ctq: text("ctq").notNull(), // Links to CTQ from CTS characteristics (kept for backward compatibility)
  lsl: text("lsl"), // Lower Specification Limit (optional for attribute CTQs)
  usl: text("usl"), // Upper Specification Limit (optional for attribute CTQs)
  target: text("target"), // Target value (optional for attribute CTQs)
  zShift: real("z_shift").default(1.5), // Z-shift value (default 1.5)
  dataSetTerm: text("data_set_term")
    .$type<DataSetTermType>()
    .default("Long Term"), // Data set term (Long Term or Short Term)
  capabilityIndex: text("capability_index")
    .$type<CapabilityIndexType>()
    .default("Cp/Cpk"), // Z or Cp/Cpk
  showPercentage: boolean("show_percentage").default(false), // Show percentage display
  showZ: boolean("show_z").default(false), // Show Z for attribute CTQs
  showStatistics: boolean("show_statistics").default(false), // Show/hide statistics section
  dataPoints: jsonb("data_points").$type<number[]>().default([]), // JSON array of numeric data points

  // Attribute CTQ analysis type enablers (boolean fields)
  enableNonConformity: boolean("enable_non_conformity").default(false),
  enableDpmo: boolean("enable_dpmo").default(false),
  enableRty: boolean("enable_rty").default(false),
  enableOee: boolean("enable_oee").default(false),
  enablePareto: boolean("enable_pareto").default(false),
  enableDpu: boolean("enable_dpu").default(false),

  // Non-Conformity Analysis fields
  nonConformityUnits: integer("non_conformity_units"),
  totalUnits: integer("total_units"),
  // DPMO Analysis fields
  dpmoDefects: integer("dpmo_defects"),
  dpmoUnits: integer("dpmo_units"),
  dpmoOpportunitiesPerUnit: integer("dpmo_opportunities_per_unit"),
  // RTY Analysis fields
  rtyProcessSteps:
    json("rty_process_steps").$type<
      Array<{ stepName: string; passed: number | null; total: number }>
    >(),
  // OEE Analysis fields - Input fields
  oeeScheduledTime: real("oee_scheduled_time"), // Scheduled production time in hours
  oeeAvailableTime: real("oee_available_time"), // Available time in hours
  oeeNominalCapacity: integer("oee_nominal_capacity"), // Nominal production capacity parts/hour
  oeePartsManufactured: integer("oee_parts_manufactured"), // Number of parts manufactured
  oeeBadParts: integer("oee_bad_parts"), // Number of bad/defective parts
  // Pareto Analysis fields
  paretoDefectCategories: json("pareto_defect_categories").$type<
    Array<{ category: string; count: number | null }>
  >(),
  // DPU Analysis fields
  dpuDefects: integer("dpu_defects"),
  dpuUnits: integer("dpu_units"),

  capabilityAssessment: text("capability_assessment"), // AI-generated capability assessment
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertProcessCapabilitySchema = createInsertSchema(
  processCapability,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProcessCapability = z.infer<
  typeof insertProcessCapabilitySchema
>;
export type ProcessCapability = typeof processCapability.$inferSelect;

// Process Capability Data is now stored as JSON array in the processCapability table

// Continuous CTQ Analysis Configuration - stores user choices for analysis types
export const continuousCtqAnalysisConfig = pgTable(
  "continuous_ctq_analysis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Analysis type enablers
    enableContYHypothesisTest: boolean("enable_cont_y_hypothesis_test").default(
      true,
    ),
    enableContYMultiVariChart: boolean(
      "enable_cont_y_multi_vari_chart",
    ).default(false),
    enablePareto: boolean("enable_pareto").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertContinuousCtqAnalysisConfigSchema = createInsertSchema(
  continuousCtqAnalysisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertContinuousCtqAnalysisConfig = z.infer<
  typeof insertContinuousCtqAnalysisConfigSchema
>;
export type ContinuousCtqAnalysisConfig =
  typeof continuousCtqAnalysisConfig.$inferSelect;

// Attribute CTQ Analysis Configuration - stores user choices for attribute analysis types
export const attributeCtqAnalysisConfig = pgTable(
  "attribute_ctq_analysis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Analysis type enablers
    enableAttrYHypothesisTest: boolean("enable_attr_y_hypothesis_test").default(
      false,
    ),
    enablePareto: boolean("enable_pareto").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertAttributeCtqAnalysisConfigSchema = createInsertSchema(
  attributeCtqAnalysisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAttributeCtqAnalysisConfig = z.infer<
  typeof insertAttributeCtqAnalysisConfigSchema
>;
export type AttributeCtqAnalysisConfig =
  typeof attributeCtqAnalysisConfig.$inferSelect;

// Attribute Hypothesis Testing Configuration - stores user choices for attribute hypothesis tests
export const attributeHypothesisTestingConfig = pgTable(
  "attribute_hypothesis_testing_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test type
    testType: text("test_type").default("Attribute Hyp-Test"),

    // Test enablers
    enableTwoProportionTest: boolean("enable_two_proportion_test").default(true),
    enableChiSquareTest: boolean("enable_chi_square_test").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertAttributeHypothesisTestingConfigSchema = createInsertSchema(
  attributeHypothesisTestingConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAttributeHypothesisTestingConfig = z.infer<
  typeof insertAttributeHypothesisTestingConfigSchema
>;
export type AttributeHypothesisTestingConfig =
  typeof attributeHypothesisTestingConfig.$inferSelect;

// Two-Proportion Hypothesis Testing Configuration - stores user data and settings for two-proportion tests
export const twoProportionHypothesisConfig = pgTable(
  "two_proportion_hypothesis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Test configuration
    testType: text("test_type").default("Two-Proportion Test"),
    hypothesizedDifference: real("hypothesized_difference").default(0),
    significanceLevel: text("significance_level").default("0.05"),
    alternative: text("alternative").default("Different"),

    // Sample 1 data
    sample1Size: integer("sample_1_size"),
    sample1Events: integer("sample_1_events"),
    sample1Description: text("sample_1_description"),

    // Sample 2 data
    sample2Size: integer("sample_2_size"),
    sample2Events: integer("sample_2_events"),
    sample2Description: text("sample_2_description"),

    // Power analysis fields
    enablePowerAnalysis: boolean("enable_power_analysis").default(false),
    powerTargetPower: real("power_target_power"),
    powerAlpha: real("power_alpha"),
    powerHa: text("power_ha"),
    powerP1: real("power_p1"),
    powerP2: real("power_p2"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertTwoProportionHypothesisConfigSchema = createInsertSchema(
  twoProportionHypothesisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertTwoProportionHypothesisConfig = z.infer<
  typeof insertTwoProportionHypothesisConfigSchema
>;
export type TwoProportionHypothesisConfig =
  typeof twoProportionHypothesisConfig.$inferSelect;

// Chi-Square Test of Independence Configuration - stores data for chi-square independence tests
export const chiSquareIndependenceConfig = pgTable(
  "chi_square_independence_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Test configuration
    testType: text("test_type").default("Chi-Square Independence Test"),
    significanceLevel: text("significance_level").default("0.05"),

    // Variable 1 configuration
    variable1Name: text("variable_1_name"),
    variable1Categories: text("variable_1_categories").array(), // Array of category names (up to 13)

    // Variable 2 configuration
    variable2Name: text("variable_2_name"),
    variable2Categories: text("variable_2_categories").array(), // Array of category names (up to 13)

    // Contingency table data (observed frequencies)
    // Stored as JSON: { "row_col": frequency } e.g., { "0_0": 10, "0_1": 15, ... }
    observedFrequencies: text("observed_frequencies"), // JSON string

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertChiSquareIndependenceConfigSchema = createInsertSchema(
  chiSquareIndependenceConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertChiSquareIndependenceConfig = z.infer<
  typeof insertChiSquareIndependenceConfigSchema
>;
export type ChiSquareIndependenceConfig =
  typeof chiSquareIndependenceConfig.$inferSelect;

// One Sample Hypothesis Testing Configuration - stores user data and settings for one-sample tests
export const oneSampleHypothesisConfig = pgTable(
  "one_sample_hypothesis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test configuration
    testType: text("test_type").default("One Sample Hyp-Test"),

    // Statistical parameter enablers
    enableMeanTest: boolean("enable_mean_test").default(true),
    enableVarianceTest: boolean("enable_variance_test").default(false),
    enableMedianTest: boolean("enable_median_test").default(false),

    // Target values
    targetMean: real("target_mean"),
    targetstdev: real("target_stdev"),
    targetMedian: real("target_median"),

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternativemean: text("alternativemean").default("Less than"),
    alternativevariance: text("alternativevariance").default("Less than"),
    alternativemedian: text("alternativemedian").default("Less than"),

    // Data points
    dataPoints: jsonb("data_points")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),

    // Dataset description
    datasetDescription: text("dataset_description"),

    // Power analysis fields for Mean Test
    enableMean1SPower: boolean("enable_mean_1s_power").default(false),
    power1SMeanPower: text("power_1s_mean_power"),
    power1SMeanHa: text("power_1s_mean_ha"),
    power1SMeanMean: real("power_1s_mean_mean"),
    power1SMeanH0: real("power_1s_mean_h0"),
    power1SMeanStdev: real("power_1s_mean_stdev"),
    power1SMeanAlpha: text("power_1s_mean_alpha"),

    // Power analysis fields for Variance Test
    enableVariance1SPower: boolean("enable_variance_1s_power").default(false),
    power1SVariancePower: text("power_1s_variance_power"),
    power1SVarianceHa: text("power_1s_variance_ha"),
    power1SVarianceStdev: real("power_1s_variance_stdev"),
    power1SVarianceH0: real("power_1s_variance_h0"),
    power1SVarianceAlpha: text("power_1s_variance_alpha"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertOneSampleHypothesisConfigSchema = createInsertSchema(
  oneSampleHypothesisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertOneSampleHypothesisConfig = z.infer<
  typeof insertOneSampleHypothesisConfigSchema
>;
export type OneSampleHypothesisConfig =
  typeof oneSampleHypothesisConfig.$inferSelect;

// Two Sample Hypothesis Testing Configuration - stores user data and settings for two-sample tests
export const twoSampleHypothesisConfig = pgTable(
  "two_sample_hypothesis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test configuration
    testType: text("test_type").default("Two Sample Hyp-Test"),

    // Statistical parameter enablers
    enableMeanTest: boolean("enable_mean_test").default(true),
    enableVarianceTest: boolean("enable_variance_test").default(false),
    enableMedianTest: boolean("enable_median_test").default(false),

    // Target values for hypothesis tests
    deltaMean0: real("delta_mean_0").default(0), // H0: μ1 - μ2 = deltaMean0
    ratioVariance0: real("ratio_variance_0").default(1), // H0: σ1²/σ2² = ratioVariance0

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternativemean: text("alternativemean").default("Less than"),
    alternativevariance: text("alternativevariance").default("Less than"),
    alternativemedian: text("alternativemedian").default("Less than"),

    // Data points for both datasets
    dataSet1: jsonb("data_set_1")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),
    dataSet2: jsonb("data_set_2")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),

    // Dataset descriptions
    dataset1Description: text("dataset_1_description"),
    dataset2Description: text("dataset_2_description"),

    // Power analysis fields for Mean Test
    enableMean2SPower: boolean("enable_mean_2s_power").default(false),
    power2SMeanPower: text("power_2s_mean_power"),
    power2SMeanHa: text("power_2s_mean_ha"),
    power2SMeanMean1: real("power_2s_mean_mean_1"),
    power2SMeanMean2: real("power_2s_mean_mean_2"),
    power2SMeanStdev: real("power_2s_mean_stdev"),
    power2SMeanAlpha: text("power_2s_mean_alpha"),

    // Power analysis fields for Variance Test
    enableVariance2SPower: boolean("enable_variance_2s_power").default(false),
    power2SVariancePower: text("power_2s_variance_power"),
    power2SVarianceHa: text("power_2s_variance_ha"),
    power2SVarianceStdev1: real("power_2s_variance_stdev_1"),
    power2SVarianceStdev2: real("power_2s_variance_stdev_2"),
    power2SVarianceAlpha: text("power_2s_variance_alpha"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertTwoSampleHypothesisConfigSchema = createInsertSchema(
  twoSampleHypothesisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertTwoSampleHypothesisConfig = z.infer<
  typeof insertTwoSampleHypothesisConfigSchema
>;
export type TwoSampleHypothesisConfig =
  typeof twoSampleHypothesisConfig.$inferSelect;

// Paired Sample Hypothesis Testing Configuration - stores user data and settings for paired-sample tests
export const pairedSampleHypothesisConfig = pgTable(
  "paired_sample_hypothesis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test configuration
    testType: text("test_type").default("Paired Sample Hyp-Test"),

    // Statistical parameter enablers
    enableMeanTest: boolean("enable_mean_test").default(true),

    // Target values for hypothesis tests
    h0Difference: real("h0_difference").default(0), // H0: μd = h0Difference

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternativemean: text("alternativemean").default("Less than"),

    // Data points for both datasets (paired observations)
    dataSet1: jsonb("data_set_1")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),
    dataSet2: jsonb("data_set_2")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),

    // Dataset descriptions
    dataset1Description: text("dataset_1_description"),
    dataset2Description: text("dataset_2_description"),

    // Power analysis fields for Mean Test
    enableMean1SPower: boolean("enable_mean_1s_power").default(false),
    power1SMeanPower: text("power_1s_mean_power"),
    power1SMeanHa: text("power_1s_mean_ha"),
    power1SMeanMean: real("power_1s_mean_mean"),
    power1SMeanH0: real("power_1s_mean_h0"),
    power1SMeanStdev: real("power_1s_mean_stdev"),
    power1SMeanAlpha: text("power_1s_mean_alpha"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertPairedSampleHypothesisConfigSchema = createInsertSchema(
  pairedSampleHypothesisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertPairedSampleHypothesisConfig = z.infer<
  typeof insertPairedSampleHypothesisConfigSchema
>;
export type PairedSampleHypothesisConfig =
  typeof pairedSampleHypothesisConfig.$inferSelect;

// Multiple Sample Hypothesis Testing Configuration - stores user data and settings for multiple-sample tests
export const multipleSampleHypothesisConfig = pgTable(
  "multiple_sample_hypothesis_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test configuration
    testType: text("test_type").default("Multiple-Sample Hyp test"),
    factorOfClassification: text("factor_of_classification"),

    // Statistical parameter enablers
    enableMeanTest: boolean("enable_mean_test").default(true),
    enableVarianceTest: boolean("enable_variance_test").default(false),
    enableMedianTest: boolean("enable_median_test").default(false),

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternateMean: text("alternate_mean").default("Less than"),
    alternateVariance: text("alternate_variance").default("Less than"),
    alternateMedian: text("alternate_median").default("Less than"),

    // Multiple datasets - array of arrays of data points
    datasets: jsonb("datasets")
      .$type<Array<Array<{ indexNumber: number; dataValue: number }>>>()
      .default([]),

    // Dataset descriptions - array of strings
    datasetDescriptions: jsonb("dataset_descriptions")
      .$type<Array<string>>()
      .default([]),

    // Power analysis fields for Multiple Sample Mean Test
    enableMeanMultipleSPower: boolean("enable_mean_multiple_s_power").default(false),
    powerPower: text("power_power"),
    powerAlpha: text("power_alpha"),
    powerNbrDistri: integer("power_nbr_distri"),
    powerDifference: real("power_difference"),
    powerStdev: real("power_stdev"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertMultipleSampleHypothesisConfigSchema = createInsertSchema(
  multipleSampleHypothesisConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMultipleSampleHypothesisConfig = z.infer<
  typeof insertMultipleSampleHypothesisConfigSchema
>;
export type MultipleSampleHypothesisConfig =
  typeof multipleSampleHypothesisConfig.$inferSelect;

// Main Hypothesis Testing Configuration - stores which types of hypothesis tests are enabled
export const hypothesisTestingConfig = pgTable(
  "hypothesis_testing_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(), // CTQ name for reference

    // Test type enablers
    enableOneSampleTest: boolean("enable_one_sample_test").default(true),
    enableTwoSampleTest: boolean("enable_two_sample_test").default(false),
    enablePairedSampleTest: boolean("enable_paired_sample_test").default(false),
    enableMultipleSampleTest: boolean("enable_multiple_sample_test").default(
      false,
    ),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint to ensure one config per CTQ
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertHypothesisTestingConfigSchema = createInsertSchema(
  hypothesisTestingConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertHypothesisTestingConfig = z.infer<
  typeof insertHypothesisTestingConfigSchema
>;
export type HypothesisTestingConfig =
  typeof hypothesisTestingConfig.$inferSelect;

// Multi-Vari Chart Configuration - stores multi-vari chart analysis data
export const multiVariChartConfig = pgTable(
  "multi_vari_chart_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Factor definitions
    factor1Name: text("factor1_name").default("Factor 1"),
    factor2Name: text("factor2_name").default("Factor 2"),
    factor3Name: text("factor3_name").default("Factor 3"),

    // Data storage as JSON: array of measurements with factor levels
    // Structure: [{ factor1: string, factor2: string, factor3: string, response: number }]
    data: jsonb("data")
      .$type<Array<{ 
        factor1: string; 
        factor2: string; 
        factor3: string | null; 
        response: number 
      }>>()
      .default([]),

    // Chart configuration
    showMean: boolean("show_mean").default(true),
    useFactor3: boolean("use_factor3").default(false),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertMultiVariChartConfigSchema = createInsertSchema(
  multiVariChartConfig,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMultiVariChartConfig = z.infer<
  typeof insertMultiVariChartConfigSchema
>;
export type MultiVariChartConfig =
  typeof multiVariChartConfig.$inferSelect;

// Pareto Analysis for DMAIC Analyze Phase
export const paretoAnalysis = pgTable(
  "pareto_analysis",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Category type selection
    categoryType: text("category_type").notNull().default("Defects"), // "Defects", "Complaints", "Causes", "Others"
    categoryTypeCustom: text("category_type_custom"), // Custom text if "Others" is selected
    
    // Frequency type selection
    frequencyType: text("frequency_type").notNull().default("Count"), // "Count", "Costs", "Others"
    frequencyTypeCustom: text("frequency_type_custom"), // Custom text if "Others" is selected
    
    // Variable selection (optional)
    selectedVariable: text("selected_variable"),
    
    // Pareto data storage as JSON: array of categories with frequencies
    // Structure: [{ category: string, frequency: number }]
    paretoData: jsonb("pareto_data")
      .$type<Array<{ category: string; frequency: number }>>()
      .default([]),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqPareto: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertParetoAnalysisSchema = createInsertSchema(
  paretoAnalysis,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertParetoAnalysis = z.infer<typeof insertParetoAnalysisSchema>;
export type ParetoAnalysis = typeof paretoAnalysis.$inferSelect;

// Value & Time Analysis for DMAIC Analyze/Improve Phase
export const valueTimeAnalysis = pgTable(
  "value_time_analysis",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    
    // User's analysis selection
    showValueAnalysis: boolean("show_value_analysis").default(false),
    showTimeAnalysis: boolean("show_time_analysis").default(false),
    
    // Process Value Analysis fields
    vaTime: real("va_time"), // Value Added time
    bvaTime: real("bva_time"), // Business Value Added time
    nvaTime: real("nva_time"), // Non Value Added time
    
    // Process Time Analysis fields
    customerDemand: real("customer_demand"), // Units demanded
    demandPeriodicity: text("demand_periodicity", { enum: ["week", "month", "year"] }).default("year"), // Periodicity of customer demand
    workingDaysPerPeriod: real("working_days_per_period"), // Number of working days per period
    effectiveWorkingTime: real("effective_working_time"), // Hours per shift
    numberOfShifts: integer("number_of_shifts").default(1),
    wip: real("wip"), // Work In Process
    
    // Task data for percent loading chart
    taskData: jsonb("task_data")
      .$type<Array<{ taskName: string; cycleTime: number }>>()
      .default([]),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueProjectAnalysis: unique().on(table.projectId),
  }),
);

export const insertValueTimeAnalysisSchema = createInsertSchema(
  valueTimeAnalysis,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertValueTimeAnalysis = z.infer<typeof insertValueTimeAnalysisSchema>;
export type ValueTimeAnalysis = typeof valueTimeAnalysis.$inferSelect;

// FMEA (Failure Mode and Effect Analysis) for DMAIC Analyze Phase
export const fmeaAnalysis = pgTable(
  "fmea_analysis",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    
    // FMEA rows stored as JSONB array
    // Each row contains: processStep, failureMode, effects, severity, causes, occurrence, currentControls, detection, rpn, recommendedActions, responsibility, targetDate, actionsTaken, newSeverity, newOccurrence, newDetection, newRpn
    fmeaRows: jsonb("fmea_rows")
      .$type<Array<{
        id: string;
        processStep: string;
        failureMode: string;
        effects: string;
        severity: number;
        causes: string;
        occurrence: number;
        currentControls: string;
        detection: number;
        rpn: number;
        recommendedActions: string;
        responsibility: string;
        targetDate: string;
        actionsTaken: string;
        newSeverity: number | null;
        newOccurrence: number | null;
        newDetection: number | null;
        newRpn: number | null;
      }>>()
      .default([]),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueProjectFmea: unique().on(table.projectId),
  }),
);

export const insertFmeaAnalysisSchema = createInsertSchema(
  fmeaAnalysis,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertFmeaAnalysis = z.infer<typeof insertFmeaAnalysisSchema>;
export type FmeaAnalysis = typeof fmeaAnalysis.$inferSelect;

// Solution categories for Improve phase
export const solutionCategories = [
  "Technology",
  "Process",
  "People",
  "Organization",
] as const;
export type SolutionCategory = (typeof solutionCategories)[number];

// Benefit and Effort levels for Green Belt and Black Belt projects
export const benefitEffortLevels = ["Low", "Medium", "High"] as const;
export type BenefitEffortLevel = (typeof benefitEffortLevels)[number];

// Solutions for DMAIC Improve Phase
export const solutions = pgTable(
  "solutions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    
    // Solution fields
    solutionId: text("solution_id").notNull(), // S1, S2, S3, etc.
    solution: text("solution").notNull(),
    category: text("category", { enum: solutionCategories }).notNull(),
    criticalRootCauses: text("critical_root_causes").notNull(),
    
    // For Green Belt and Black Belt only
    benefit: text("benefit", { enum: benefitEffortLevels }),
    effort: text("effort", { enum: benefitEffortLevels }),
    
    comments: text("comments"),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
);

export const insertSolutionSchema = createInsertSchema(solutions).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSolution = z.infer<typeof insertSolutionSchema>;
export type Solution = typeof solutions.$inferSelect;

// Task status for Implementation Plan
export const taskStatuses = [
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
  "Cancelled",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

// Implementation Plan Tasks for DMAIC Improve Phase
export const implementationPlanTasks = pgTable(
  "implementation_plan_tasks",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    
    // Task fields
    taskName: text("task_name").notNull(),
    description: text("description"),
    solutionId: text("solution_id"), // e.g., S1, S2, S3
    owner: text("owner").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: text("status", { enum: taskStatuses }).notNull().default("Not Started"),
    isPilotTask: boolean("is_pilot_task").default(false), // Differentiate pilot tasks from implementation tasks
    
    // Progress tracking
    progressPercentage: integer("progress_percentage").default(0),
    notes: text("notes"),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
);

export const insertImplementationPlanTaskSchema = createInsertSchema(implementationPlanTasks).omit({
  id: true,
  lastUpdated: true,
});

export type InsertImplementationPlanTask = z.infer<typeof insertImplementationPlanTaskSchema>;
export type ImplementationPlanTask = typeof implementationPlanTasks.$inferSelect;

// Solution Design Tracking - tracks implementation aspects for each solution
export const solutionDesignTracking = pgTable(
  "solution_design_tracking",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(), // e.g., S1, S2, S3
    
    // Design and implementation tracking checkboxes
    toBeProcessMap: boolean("to_be_process_map").default(false),
    toBeProcessRaci: boolean("to_be_process_raci").default(false),
    transferFunction: boolean("transfer_function").default(false),
    otherDesign: boolean("other_design").default(false),
    otherDesignExplanation: text("other_design_explanation"),
    otherDesignFile: text("other_design_file"),
    solutionNotPursued: boolean("solution_not_pursued").default(false),
    
    // Transfer Function Configuration
    tfSimpleRegression: boolean("tf_simple_regression").default(false),
    tfAnovaTwoWay: boolean("tf_anova_two_way").default(false),
    tfMultipleRegression: boolean("tf_multiple_regression").default(false),
    tfDoe: boolean("tf_doe").default(false),
    tfDoeFullFactorial: boolean("tf_doe_full_factorial").default(false),
    tfDoeFractionalFactorial: boolean("tf_doe_fractional_factorial").default(false),
    tfLogisticRegression: boolean("tf_logistic_regression").default(false),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionDesign: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertSolutionDesignTrackingSchema = createInsertSchema(solutionDesignTracking).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSolutionDesignTracking = z.infer<typeof insertSolutionDesignTrackingSchema>;
export type SolutionDesignTracking = typeof solutionDesignTracking.$inferSelect;

// Proof of Improvement - Before/After Continuous CTQ Two-Sample Test
export const beforeAfterContCTQTwoSampleTest = pgTable(
  "before_after_cont_ctq_two_sample_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Test configuration
    testType: text("test_type").default("Before-After Two Sample Test"),

    // Statistical parameter enablers
    enableMeanTest: boolean("enable_mean_test").default(true),
    enableVarianceTest: boolean("enable_variance_test").default(false),
    enableMedianTest: boolean("enable_median_test").default(false),

    // Target values for hypothesis tests
    deltaMean0: real("delta_mean_0").default(0),
    ratioVariance0: real("ratio_variance_0").default(1),

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternativemean: text("alternativemean").default("Less than"),
    alternativevariance: text("alternativevariance").default("Less than"),
    alternativemedian: text("alternativemedian").default("Less than"),

    // Data points - Before (dataSet1) and After (dataSet2)
    dataSet1: jsonb("data_set_1")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),
    dataSet2: jsonb("data_set_2")
      .$type<Array<{ indexNumber: number; dataValue: number }>>()
      .default([]),

    // Dataset descriptions
    dataset1Description: text("dataset_1_description").default("Before"),
    dataset2Description: text("dataset_2_description").default("After"),

    // Power analysis fields for Mean Test
    enableMean2SPower: boolean("enable_mean_2s_power").default(false),
    power2SMeanPower: text("power_2s_mean_power"),
    power2SMeanHa: text("power_2s_mean_ha"),
    power2SMeanMean1: real("power_2s_mean_mean_1"),
    power2SMeanMean2: real("power_2s_mean_mean_2"),
    power2SMeanStdev: real("power_2s_mean_stdev"),
    power2SMeanAlpha: text("power_2s_mean_alpha"),

    // Power analysis fields for Variance Test
    enableVariance2SPower: boolean("enable_variance_2s_power").default(false),
    power2SVariancePower: text("power_2s_variance_power"),
    power2SVarianceHa: text("power_2s_variance_ha"),
    power2SVarianceStdev1: real("power_2s_variance_stdev_1"),
    power2SVarianceStdev2: real("power_2s_variance_stdev_2"),
    power2SVarianceAlpha: text("power_2s_variance_alpha"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertBeforeAfterContCTQTwoSampleTestSchema = createInsertSchema(
  beforeAfterContCTQTwoSampleTest,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertBeforeAfterContCTQTwoSampleTest = z.infer<
  typeof insertBeforeAfterContCTQTwoSampleTestSchema
>;
export type BeforeAfterContCTQTwoSampleTest =
  typeof beforeAfterContCTQTwoSampleTest.$inferSelect;

// Proof of Improvement - Before/After Two Proportion Test
export const beforeAfterTwoProportionTest = pgTable(
  "before_after_two_proportion_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Test configuration
    testType: text("test_type").default("Before-After Two Proportion Test"),
    hypothesizedDifference: real("hypothesized_difference").default(0),

    // Sample data - Before (sample1) and After (sample2)
    sample1Size: integer("sample1_size"),
    sample1Events: integer("sample1_events"),
    sample2Size: integer("sample2_size"),
    sample2Events: integer("sample2_events"),

    // Sample descriptions
    sample1Description: text("sample1_description").default("Before"),
    sample2Description: text("sample2_description").default("After"),

    // Test parameters
    significanceLevel: text("significance_level").default("0.05"),
    alternative: text("alternative").default("Different"),

    // Power analysis fields
    enablePowerAnalysis: boolean("enable_power_analysis").default(false),
    powerTargetPower: real("power_target_power"),
    powerAlpha: real("power_alpha"),
    powerHa: text("power_ha"),
    powerP1: real("power_p1"),
    powerP2: real("power_p2"),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertBeforeAfterTwoProportionTestSchema = createInsertSchema(
  beforeAfterTwoProportionTest,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertBeforeAfterTwoProportionTest = z.infer<
  typeof insertBeforeAfterTwoProportionTestSchema
>;
export type BeforeAfterTwoProportionTest =
  typeof beforeAfterTwoProportionTest.$inferSelect;

// Proof of Improvement - Before/After Chi-Square Test
export const beforeAfterChiSquareTest = pgTable(
  "before_after_chi_square_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    ctq: text("ctq").notNull(),

    // Test configuration
    significanceLevel: text("significance_level").default("0.05"),
    
    // Variable names
    variable1Name: text("variable1_name").default("Time Period"),
    variable2Name: text("variable2_name").default("Outcome"),
    
    // Categories
    variable1Categories: jsonb("variable1_categories")
      .$type<string[]>()
      .default(["Before", "After"]),
    variable2Categories: jsonb("variable2_categories")
      .$type<string[]>()
      .default(["Category 1", "Category 2"]),
    
    // Observed frequencies as string (for compatibility with existing component)
    observedFrequencies: text("observed_frequencies").default(""),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqConfig: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertBeforeAfterChiSquareTestSchema = createInsertSchema(
  beforeAfterChiSquareTest,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertBeforeAfterChiSquareTest = z.infer<
  typeof insertBeforeAfterChiSquareTestSchema
>;
export type BeforeAfterChiSquareTest =
  typeof beforeAfterChiSquareTest.$inferSelect;

// Proof of Improvement - Test Preferences (which tests to display)
export const proofOfImprovementPreferences = pgTable(
  "proof_of_improvement_preferences",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    ctqId: integer("ctq_id")
      .references(() => ctsCharacteristics.id, { onDelete: "cascade" })
      .notNull(),
    
    // Test preferences for Attribute CTQs
    enableTwoProportionTest: boolean("enable_two_proportion_test").default(true),
    enableChiSquareTest: boolean("enable_chi_square_test").default(true),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCtqPreferences: unique().on(table.projectId, table.ctqId),
  }),
);

export const insertProofOfImprovementPreferencesSchema = createInsertSchema(
  proofOfImprovementPreferences,
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProofOfImprovementPreferences = z.infer<
  typeof insertProofOfImprovementPreferencesSchema
>;
export type ProofOfImprovementPreferences =
  typeof proofOfImprovementPreferences.$inferSelect;

// Simple Regression Configuration for Transfer Function Analysis
export const simpleRegressionConfig = pgTable(
  "simple_regression_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Regression type selection
    enableLinear: boolean("enable_linear").default(false),
    enableQuadratic: boolean("enable_quadratic").default(false),
    enableCubic: boolean("enable_cubic").default(false),
    
    // Dataset descriptions
    datasetYDescription: text("dataset_y_description").default("Y Variable"),
    datasetXDescription: text("dataset_x_description").default("X Variable"),
    
    // Data arrays (stored as jsonb arrays of numbers)
    dataY: jsonb("data_y").$type<number[]>().default([]),
    dataX: jsonb("data_x").$type<number[]>().default([]),
    
    // Target Y value for solving equations (coefficients and solutions calculated on render)
    targetY: real("target_y"),
    
    // Significance level for statistical tests (default 0.05 for 95% confidence)
    significanceLevel: real("significance_level").default(0.05),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionRegression: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertSimpleRegressionConfigSchema = createInsertSchema(simpleRegressionConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSimpleRegressionConfig = z.infer<typeof insertSimpleRegressionConfigSchema>;
export type SimpleRegressionConfig = typeof simpleRegressionConfig.$inferSelect;

// ANOVA Two-Way Configuration for Transfer Function Analysis
export const anovaTwoWayConfig = pgTable(
  "anova_two_way_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Factor and response variable names
    factorAName: text("factor_a_name").default("Factor A"),
    factorBName: text("factor_b_name").default("Factor B"),
    responseVariableName: text("response_variable_name").default("Response"),
    
    // Factor levels (stored as arrays of strings)
    factorALevels: jsonb("factor_a_levels").$type<string[]>().default([]),
    factorBLevels: jsonb("factor_b_levels").$type<string[]>().default([]),
    
    // Data organized by cell (Factor A level, Factor B level, replications)
    // Structure: { "A1-B1": [val1, val2, ...], "A1-B2": [...], ... }
    cellData: jsonb("cell_data").$type<Record<string, number[]>>().default({}),
    
    // Analysis options
    includeInteraction: boolean("include_interaction").default(true),
    significanceLevel: real("significance_level").default(0.05),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionAnovaTwoWay: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertAnovaTwoWayConfigSchema = createInsertSchema(anovaTwoWayConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAnovaTwoWayConfig = z.infer<typeof insertAnovaTwoWayConfigSchema>;
export type AnovaTwoWayConfig = typeof anovaTwoWayConfig.$inferSelect;

// Multiple Regression Configuration for Transfer Function Analysis
export const multipleRegressionConfig = pgTable(
  "multiple_regression_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Variable descriptions (Y and multiple X variables)
    responseVariableName: text("response_variable_name").default("Y"),
    predictorNames: jsonb("predictor_names").$type<string[]>().default(["X1", "X2", "X3"]),
    
    // Data arrays - Y and multiple X columns
    dataY: jsonb("data_y").$type<number[]>().default([]),
    dataX: jsonb("data_x").$type<number[][]>().default([]), // Array of arrays: [[x1_1, x1_2, ...], [x2_1, x2_2, ...], ...]
    
    // Selected predictors for model (allows model reduction)
    selectedPredictors: jsonb("selected_predictors").$type<number[]>().default([]), // Array of indices (0, 1, 2, ...) indicating which predictors are included
    
    // Analysis options
    significanceLevel: real("significance_level").default(0.05),
    
    // Solve for X settings
    targetY: real("target_y"),
    solveForPredictorIdx: integer("solve_for_predictor_idx"),
    constraintValues: jsonb("constraint_values").$type<Record<number, number | null>>().default({}),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionMultipleRegression: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertMultipleRegressionConfigSchema = createInsertSchema(multipleRegressionConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMultipleRegressionConfig = z.infer<typeof insertMultipleRegressionConfigSchema>;
export type MultipleRegressionConfig = typeof multipleRegressionConfig.$inferSelect;

// DOE Fractional Factorial Configuration (2^(k-p) designs)
export const doeFractionalFactorialConfig = pgTable(
  "doe_fractional_factorial_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Response variable name
    responseVariableName: text("response_variable_name").default("Y Response"),
    
    // Factors configuration
    // For continuous: { name: "Temperature", type: "continuous", lowValue: 100, highValue: 200 }
    // For categorical: { name: "Material", type: "categorical", levels: ["Plastic", "Metal"] }
    factors: jsonb("factors").$type<Array<{
      name: string;
      type: "continuous" | "categorical";
      lowValue?: number;  // For continuous: actual low value (e.g., 100°C)
      highValue?: number; // For continuous: actual high value (e.g., 200°C)
      levels?: string[];  // For categorical: level names (e.g., ["Low", "High"])
    }>>().default([]),
    
    // Generated plan (persisted to ensure consistency on reload)
    // Contains complete experimental design with metadata and run responses
    // Each run in the plan includes a runResponse field for storing the response value
    generatedPlan: jsonb("generated_plan"),
    
    // Design options
    numberOfReplicates: integer("number_of_replicates").default(1),
    randomizeRuns: boolean("randomize_runs").default(false),
    includeCenterPoints: boolean("include_center_points").default(false),
    numberOfCenterPoints: integer("number_of_center_points").default(3),
    
    // Analysis options
    significanceLevel: real("significance_level").default(0.05),
    
    // Selected factors for model (allows model reduction)
    selectedFactorsForModel: jsonb("selected_factors_for_model").$type<Record<number | string, boolean>>().default({}),
    
    // Solver settings (for solving for optimal factor values given target Y)
    targetY: real("target_y"),
    solveFactorIdx: integer("solve_factor_idx"),
    constraintValues: jsonb("constraint_values").$type<Record<number, number | null>>().default({}),
    
    // 3D Solver visualization options
    show3DScatter: boolean("show_3d_scatter").default(false),
    showContour: boolean("show_contour").default(false),
    show3DSpinningRSM: boolean("show_3d_spinning_rsm").default(false),
    plot3DFactorX: integer("plot_3d_factor_x").default(0),
    plot3DFactorY: integer("plot_3d_factor_y").default(1),
    
    // Display options
    showUncoded: boolean("show_uncoded").default(false),
    showParetoOfEffects: boolean("show_pareto_of_effects").default(false),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionDOEFractional: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertDoeFractionalFactorialConfigSchema = createInsertSchema(doeFractionalFactorialConfig).omit({
  id: true,
  lastUpdated: true,
});

export const updateDoeFractionalFactorialConfigSchema = z.object({
  selectedFactorsForModel: z.record(z.union([z.number(), z.string()]), z.boolean()).optional(),
  significanceLevel: z.number().min(0).max(1).optional(),
  targetY: z.number().optional(),
  solveFactorIdx: z.number().optional(),
  constraintValues: z.record(z.number(), z.number().nullable()).optional(),
  show3DScatter: z.boolean().optional(),
  showContour: z.boolean().optional(),
  show3DSpinningRSM: z.boolean().optional(),
  plot3DFactorX: z.number().optional(),
  plot3DFactorY: z.number().optional(),
  showParetoOfEffects: z.boolean().optional(),
  showUncoded: z.boolean().optional(),
});

export type InsertDoeFractionalFactorialConfig = z.infer<typeof insertDoeFractionalFactorialConfigSchema>;
export type UpdateDoeFractionalFactorialConfig = z.infer<typeof updateDoeFractionalFactorialConfigSchema>;
export type DoeFractionalFactorialConfig = typeof doeFractionalFactorialConfig.$inferSelect;

// DOE Full Factorial Configuration (2^k designs or follow-up from fractional)
export const doeFullFactorialConfig = pgTable(
  "doe_full_factorial_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Response variable name
    responseVariableName: text("response_variable_name").default("Y Response"),
    
    // Factors configuration (same structure as fractional)
    // For continuous: { name: "Temperature", type: "continuous", lowValue: 100, highValue: 200 }
    // For categorical: { name: "Material", type: "categorical", levels: ["Plastic", "Metal"] }
    factors: jsonb("factors").$type<Array<{
      name: string;
      type: "continuous" | "categorical";
      lowValue?: number;
      highValue?: number;
      levels?: string[];
    }>>().default([]),
    
    // Generated plan (persisted to ensure consistency on reload)
    // Contains complete experimental design with metadata and run responses
    // Each run in the plan includes a runResponse field for storing the response value
    generatedPlan: jsonb("generated_plan"),
    
    // Design options
    numberOfReplicates: integer("number_of_replicates").default(1),
    randomizeRuns: boolean("randomize_runs").default(false),
    includeCenterPoints: boolean("include_center_points").default(false),
    numberOfCenterPoints: integer("number_of_center_points").default(3),
    
    // Analysis options
    significanceLevel: real("significance_level").default(0.05),
    
    // Selected factors for model (allows model reduction)
    selectedFactorsForModel: jsonb("selected_factors_for_model").$type<Record<number | string, boolean>>().default({}),
    
    // Solver settings (for solving for optimal factor values given target Y)
    targetY: real("target_y"),
    solveFactorIdx: integer("solve_factor_idx"),
    constraintValues: jsonb("constraint_values").$type<Record<number, number | null>>().default({}),
    
    // 3D Solver visualization options
    show3DScatter: boolean("show_3d_scatter").default(false),
    showContour: boolean("show_contour").default(false),
    show3DSpinningRSM: boolean("show_3d_spinning_rsm").default(false),
    plot3DFactorX: integer("plot_3d_factor_x").default(0),
    plot3DFactorY: integer("plot_3d_factor_y").default(1),
    
    // Display options
    showUncoded: boolean("show_uncoded").default(false),
    showParetoOfEffects: boolean("show_pareto_of_effects").default(false),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionDOEFull: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertDoeFullFactorialConfigSchema = createInsertSchema(doeFullFactorialConfig).omit({
  id: true,
  lastUpdated: true,
});

export const updateDoeFullFactorialConfigSchema = z.object({
  selectedFactorsForModel: z.record(z.union([z.number(), z.string()]), z.boolean()).optional(),
  significanceLevel: z.number().min(0).max(1).optional(),
  targetY: z.number().optional(),
  solveFactorIdx: z.number().optional(),
  constraintValues: z.record(z.number(), z.number().nullable()).optional(),
  show3DScatter: z.boolean().optional(),
  showContour: z.boolean().optional(),
  show3DSpinningRSM: z.boolean().optional(),
  plot3DFactorX: z.number().optional(),
  plot3DFactorY: z.number().optional(),
  showParetoOfEffects: z.boolean().optional(),
  showUncoded: z.boolean().optional(),
});

export type InsertDoeFullFactorialConfig = z.infer<typeof insertDoeFullFactorialConfigSchema>;
export type UpdateDoeFullFactorialConfig = z.infer<typeof updateDoeFullFactorialConfigSchema>;
export type DoeFullFactorialConfig = typeof doeFullFactorialConfig.$inferSelect;

// User Settings Table
export const userSettings = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    
    // Notification preferences
    emailNotifications: boolean("email_notifications").default(true),
    projectUpdates: boolean("project_updates").default(true),
    phaseReminders: boolean("phase_reminders").default(false),
    weeklyReports: boolean("weekly_reports").default(true),
    
    // General preferences
    theme: text("theme").default("light"),
    language: text("language").default("en"),
    timezone: text("timezone").default("UTC"),
    currency: text("currency").default("USD"),
    dateFormat: text("date_format").default("MM/DD/YYYY"),
    
    // Privacy settings
    profileVisibility: text("profile_visibility").default("team"),
    dataSharing: boolean("data_sharing").default(false),
    analyticsOptIn: boolean("analytics_opt_in").default(true),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserSettings: unique().on(table.userId),
  }),
);

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// Logistic Regression Configuration Table
export const logisticRegressionConfig = pgTable(
  "logistic_regression_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    
    // Variable descriptions
    datasetYDescription: text("dataset_y_description").default("Y Binary Response (0/1)"),
    datasetXDescription: text("dataset_x_description").default("X Predictor"),
    zeroValueLabel: text("zero_value_label").default(""),
    oneValueLabel: text("one_value_label").default(""),
    
    // Significance level for hypothesis testing
    significanceLevel: real("significance_level").default(0.05),
    
    // Data arrays
    dataX: jsonb("data_x").$type<number[]>().default([]),
    dataY: jsonb("data_y").$type<number[]>().default([]),
    
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionLogistic: unique().on(table.projectId, table.solutionId),
  }),
);

export const insertLogisticRegressionConfigSchema = createInsertSchema(logisticRegressionConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertLogisticRegressionConfig = z.infer<typeof insertLogisticRegressionConfigSchema>;
export type LogisticRegressionConfig = typeof logisticRegressionConfig.$inferSelect;
