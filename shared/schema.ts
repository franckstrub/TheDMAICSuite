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
  projectScope: text("project_scope"),
  projectGoals: text("project_goals"),
  measurableObjectives: text("measurable_objectives"),
  supportedBy: text("supported_by"),
  successCriteria: jsonb("success_criteria").$type<string[]>(),
  deliverables: jsonb("deliverables").$type<string[]>(),
  constraintsAndAssumptions: text("constraints_and_assumptions"),
  createdBy: integer("created_by"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertCharterSchema = createInsertSchema(projectCharters).pick({
  organizationId: true,
  projectId: true,
  projectTitle: true,
  projectReferenceNumber: true,
  projectLeader: true,
  sponsor: true,
  sponsorFunction: true,
  stakeholders: true,
  teamMembers: true,
  beltLevel: true,
  coachBeltLevel: true,
  projectType: true,
  projectCategory: true,
  projectTypology: true,
  businessCase: true,
  problemStatement: true,
  projectScope: true,
  projectGoals: true,
  measurableObjectives: true,
  supportedBy: true,
  successCriteria: true,
  deliverables: true,
  constraintsAndAssumptions: true,
  createdBy: true,
});

export type InsertCharter = z.infer<typeof insertCharterSchema>;

// SIPOC table
export const sipocs = pgTable("sipocs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  supplier: text("supplier"),
  input: text("input"),
  process: text("process"),
  output: text("output"),
  customer: text("customer"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertSipocSchema = createInsertSchema(sipocs).pick({
  organizationId: true,
  projectId: true,
  supplier: true,
  input: true,
  process: true,
  output: true,
  customer: true,
});

export type InsertSipoc = z.infer<typeof insertSipocSchema>;

// Requirements
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name"),
  description: text("description"),
  type: text("type"),
  status: text("status").default("active"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertRequirementSchema = createInsertSchema(requirements).pick({
  organizationId: true,
  projectId: true,
  name: true,
  description: true,
  type: true,
  status: true,
});

export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

// Business Requirements
export const businessRequirements = pgTable("business_requirements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  expectedBenefit: text("expected_benefit"),
  metricsAndMeasurements: text("metrics_and_measurements"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertBusinessRequirementSchema = createInsertSchema(
  businessRequirements
).pick({
  organizationId: true,
  projectId: true,
  name: true,
  description: true,
  expectedBenefit: true,
  metricsAndMeasurements: true,
});

export type InsertBusinessRequirement = z.infer<
  typeof insertBusinessRequirementSchema
>;

// Process Data
export const processData = pgTable("process_data", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name"),
  description: text("description"),
  value: text("value"),
  unit: text("unit"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertProcessDataSchema = createInsertSchema(processData).pick({
  organizationId: true,
  projectId: true,
  name: true,
  description: true,
  value: true,
  unit: true,
});

export type InsertProcessData = z.infer<typeof insertProcessDataSchema>;

// Data Collection Plan
export const dataCollectionPlan = pgTable("data_collection_plan", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  what: text("what"),
  where: text("where"),
  when: text("when"),
  who: text("who"),
  why: text("why"),
  how: text("how"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertPlanSchema = createInsertSchema(dataCollectionPlan).pick({
  organizationId: true,
  projectId: true,
  what: true,
  where: true,
  when: true,
  who: true,
  why: true,
  how: true,
});

export type InsertPlan = z.infer<typeof insertPlanSchema>;

// Data Collectiion Dataset / View
export interface Dataset {
  id: number;
  organizationId: number;
  projectId: number;
  name: string;
  datasetColumns: string[];
  datasetRows: (string | number)[][];
}

export interface StorageConfig {
  storageType: string;
}

// Storage config for project (session storage)
export const configs = pgTable(
  "config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    config: jsonb("config").$type<StorageConfig>(),
  },
  (t) => ({
    uniqueProjectIdConfig: unique().on(t.projectId),
  })
);

export const insertConfigSchema = createInsertSchema(configs).pick({
  organizationId: true,
  projectId: true,
  config: true,
});

export type InsertConfig = z.infer<typeof insertConfigSchema>;

// Logs
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  description: text("description"),
});

export const insertLogSchema = createInsertSchema(logs).pick({
  organizationId: true,
  projectId: true,
  description: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;

// Project Risk
export const projectRisks = pgTable("project_risks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  riskDescription: text("risk_description"),
  probability: text("probability"),
  impact: text("impact"),
  mitigation: text("mitigation"),
  contingency: text("contingency"),
  owner: text("owner"),
  dueDate: date("due_date"),
  status: text("status").default("active"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertRiskSchema = createInsertSchema(projectRisks).pick({
  organizationId: true,
  projectId: true,
  riskDescription: true,
  probability: true,
  impact: true,
  mitigation: true,
  contingency: true,
  owner: true,
  dueDate: true,
  status: true,
});

export type ProjectRisk = typeof projectRisks.$inferSelect;

// RACI Matrix
export const raciMatrix = pgTable(
  "raci_matrix",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    activity: text("activity"),
    responsible: text("responsible"),
    accountable: text("accountable"),
    consulted: text("consulted"),
    informed: text("informed"),
    lastUpdated: timestamp("last_updated").defaultNow(),
  },
  (t) => ({
    uniqueProjectIdRaci: unique().on(t.projectId),
  })
);

export const insertRaciSchema = createInsertSchema(raciMatrix).pick({
  organizationId: true,
  projectId: true,
  activity: true,
  responsible: true,
  accountable: true,
  consulted: true,
  informed: true,
});

export type InsertRaciMatrix = z.infer<typeof insertRaciSchema>;

// Process RACI Matrix
export const processRaciMatrix = pgTable("process_raci_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  step: text("step"),
  responsible: text("responsible"),
  accountable: text("accountable"),
  consulted: text("consulted"),
  informed: text("informed"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertProcessRaciSchema = createInsertSchema(processRaciMatrix).pick(
  {
    organizationId: true,
    projectId: true,
    step: true,
    responsible: true,
    accountable: true,
    consulted: true,
    informed: true,
  }
);

export type InsertProcessRaciMatrix = z.infer<typeof insertProcessRaciSchema>;

// Gantt Task
export const ganttTasks = pgTable("gantt_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  taskName: text("task_name"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  duration: integer("duration"),
  progress: integer("progress").default(0),
  responsible: text("responsible"),
  predecessor: text("predecessor"),
  resourceRequired: text("resource_required"),
  status: text("status").default("Not Started"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertGanttTaskSchema = createInsertSchema(ganttTasks).pick({
  organizationId: true,
  projectId: true,
  taskName: true,
  startDate: true,
  endDate: true,
  duration: true,
  progress: true,
  responsible: true,
  predecessor: true,
  resourceRequired: true,
  status: true,
});

export type InsertGanttTask = z.infer<typeof insertGanttTaskSchema>;
export type GanttTask = typeof ganttTasks.$inferSelect;

// Stakeholder Analysis
export const stakeholderAnalysisItems = pgTable("stakeholder_analysis_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name"),
  interestLevel: text("interest_level", {
    enum: ["High", "Medium", "Low"],
  }),
  resistanceType: text("resistance_type", {
    enum: ["Technical", "Political", "Cultural", "Personal"],
  }),
  influenceLevel: text("influence_level", {
    enum: ["High", "Medium", "Low"],
  }),
  supportLevel: text("support_level", {
    enum: ["Supporter", "Neutral", "Resistant"],
  }),
  engagementStrategy: text("engagement_strategy"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertStakeholderAnalysisItemSchema = createInsertSchema(
  stakeholderAnalysisItems
).pick({
  organizationId: true,
  projectId: true,
  name: true,
  interestLevel: true,
  resistanceType: true,
  influenceLevel: true,
  supportLevel: true,
  engagementStrategy: true,
});

export type InsertStakeholderAnalysisItem = z.infer<
  typeof insertStakeholderAnalysisItemSchema
>;

// Process Maps
export const processMaps = pgTable("process_maps", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  name: text("name"),
  description: text("description"),
  mapType: text("map_type"),
  content: text("content"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Solution Process Maps
export const solutionProcessMaps = pgTable("solution_process_maps", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  asIsMapContent: text("as_is_map_content"),
  toBeMapContent: text("to_be_map_content"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// CTS Characteristics
export const ctsCharacteristics = pgTable("cts_characteristics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  processMapId: integer("process_map_id"),
  ctsCharacteristic: text("cts_characteristic"),
  requirementFromCustomer: text("requirement_from_customer"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertCtsCharacteristicsSchema = createInsertSchema(
  ctsCharacteristics
).pick({
  organizationId: true,
  projectId: true,
  processMapId: true,
  ctsCharacteristic: true,
  requirementFromCustomer: true,
});

// VOC / CTQ / CTS Analysis
export const customerRequirements = pgTable("customer_requirements", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  voc: text("voc"),
  ctq: text("ctq"),
  spec: text("spec"),
  importance: integer("importance"),
  targetValue: text("target_value"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const businessRequirementsTable = pgTable("business_requirements_table", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement"),
  description: text("description"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// MSA Analysis Table
export const msaAnalysis = pgTable("msa_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),

  systemType: text("system_type"), // "Continuous" or "Attribute"
  gageTitle: text("gage_title"),
  unitAppraised: text("unit_appraised"),

  // Continuous data (Gage R&R)
  numAppraisers: integer("num_appraisers"),
  numParts: integer("num_parts"),
  numReplicates: integer("num_replicates"),
  continuousData: jsonb("continuous_data").$type<number[][][]>(), // [appraiser][part][replicate]

  // Attribute data (Agreement & Probability)
  attributeData: jsonb("attribute_data").$type<
    Array<{ appraiser: string; correct: number; total: number }>
  >(),

  // Settings
  confidenceLevel: real("confidence_level").default(0.95),
  tolerance: real("tolerance"),

  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertMsaAnalysisSchema = createInsertSchema(msaAnalysis).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMsaAnalysis = z.infer<typeof insertMsaAnalysisSchema>;
export type MsaAnalysis = typeof msaAnalysis.$inferSelect;

// Process Capability Table
export const processCapability = pgTable("process_capability", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  processName: text("process_name"),
  lowerSpecLimit: real("lower_spec_limit"),
  upperSpecLimit: real("upper_spec_limit"),
  targetValue: real("target_value"),
  subgroupSize: integer("subgroup_size"),
  controlChartType: text("control_chart_type"),
  readings: jsonb("readings").$type<number[]>(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertProcessCapabilitySchema = createInsertSchema(
  processCapability
).pick({
  organizationId: true,
  projectId: true,
  processName: true,
  lowerSpecLimit: true,
  upperSpecLimit: true,
  targetValue: true,
  subgroupSize: true,
  controlChartType: true,
  readings: true,
});

export type InsertProcessCapability = z.infer<
  typeof insertProcessCapabilitySchema
>;

// Fishbone Diagram
export const fishboneDiagrams = pgTable("fishbone_diagrams", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  problemStatement: text("problem_statement"),
  people: jsonb("people").$type<string[]>(),
  process: jsonb("process").$type<string[]>(),
  plant: jsonb("plant").$type<string[]>(),
  material: jsonb("material").$type<string[]>(),
  measurement: jsonb("measurement").$type<string[]>(),
  environment: jsonb("environment").$type<string[]>(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertFishboneDiagramSchema = createInsertSchema(
  fishboneDiagrams
).pick({
  organizationId: true,
  projectId: true,
  problemStatement: true,
  people: true,
  process: true,
  plant: true,
  material: true,
  measurement: true,
  environment: true,
});

// Root Cause Prioritization
export const rootCausePrioritization = pgTable("root_cause_prioritization", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  rootCause: text("root_cause"),
  frequency: integer("frequency"),
  impact: integer("impact"),
  detectionDifficulty: integer("detection_difficulty"),
  rpn: integer("rpn"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertRootCausePrioritizationSchema = createInsertSchema(
  rootCausePrioritization
).pick({
  organizationId: true,
  projectId: true,
  solutionId: true,
  rootCause: true,
  frequency: true,
  impact: true,
  detectionDifficulty: true,
  rpn: true,
});

// Cause & Effect Matrix
export const causeEffectMatrix = pgTable("cause_effect_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  primaryInput: text("primary_input"),
  secondaryInput: text("secondary_input"),
  effect: text("effect"),
  relationshipScore: integer("relationship_score"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertCauseEffectMatrixSchema = createInsertSchema(
  causeEffectMatrix
).pick({
  organizationId: true,
  projectId: true,
  solutionId: true,
  primaryInput: true,
  secondaryInput: true,
  effect: true,
  relationshipScore: true,
});

// Continuous CTQ Analysis Configuration
export const continuousCtqAnalysisConfig = pgTable("continuous_ctq_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  ctqVariableName: text("ctq_variable_name").default("CTQ"),
  data: jsonb("data").$type<number[]>().default([]),
  lowerSpecLimit: real("lower_spec_limit"),
  upperSpecLimit: real("upper_spec_limit"),
  targetValue: real("target_value"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertContinuousCtqAnalysisConfigSchema = createInsertSchema(
  continuousCtqAnalysisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertContinuousCtqAnalysisConfig = z.infer<
  typeof insertContinuousCtqAnalysisConfigSchema
>;
export type ContinuousCtqAnalysisConfig =
  typeof continuousCtqAnalysisConfig.$inferSelect;

// Attribute CTQ Analysis Configuration
export const attributeCtqAnalysisConfig = pgTable("attribute_ctq_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  ctqVariableName: text("ctq_variable_name").default("CTQ"),
  defectiveCount: integer("defective_count"),
  sampleSize: integer("sample_size"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertAttributeCtqAnalysisConfigSchema = createInsertSchema(
  attributeCtqAnalysisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAttributeCtqAnalysisConfig = z.infer<
  typeof insertAttributeCtqAnalysisConfigSchema
>;
export type AttributeCtqAnalysisConfig =
  typeof attributeCtqAnalysisConfig.$inferSelect;

// Hypothesis Testing Configuration (Attribute)
export const attributeHypothesisTestingConfig = pgTable(
  "attribute_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    defectiveCount: integer("defective_count"),
    sampleSize: integer("sample_size"),
    significanceLevel: real("significance_level").default(0.05),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertAttributeHypothesisTestingConfigSchema = createInsertSchema(
  attributeHypothesisTestingConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertAttributeHypothesisTestingConfig = z.infer<
  typeof insertAttributeHypothesisTestingConfigSchema
>;

// One-Sample Hypothesis Testing Configuration
export const oneSampleHypothesisConfig = pgTable(
  "one_sample_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    data: jsonb("data").$type<number[]>().default([]),
    nullHypothesisValue: real("null_hypothesis_value"),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type"), // "Lower Tail", "Upper Tail", "Two Tail"
    powerAnalysisEnabled: boolean("power_analysis_enabled").default(false),
    desiredPower: real("desired_power"),
    significanceForPower: real("significance_for_power"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertOneSampleHypothesisConfigSchema = createInsertSchema(
  oneSampleHypothesisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertOneSampleHypothesisConfig = z.infer<
  typeof insertOneSampleHypothesisConfigSchema
>;

// Two-Sample Hypothesis Testing Configuration
export const twoSampleHypothesisConfig = pgTable(
  "two_sample_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    data1: jsonb("data1").$type<number[]>().default([]),
    data2: jsonb("data2").$type<number[]>().default([]),
    sample1Name: text("sample1_name"),
    sample2Name: text("sample2_name"),
    nullHypothesisDifference: real("null_hypothesis_difference").default(0),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type"), // "Lower Tail", "Upper Tail", "Two Tail"
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertTwoSampleHypothesisConfigSchema = createInsertSchema(
  twoSampleHypothesisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertTwoSampleHypothesisConfig = z.infer<
  typeof insertTwoSampleHypothesisConfigSchema
>;

// Paired-Sample Hypothesis Testing Configuration
export const pairedSampleHypothesisConfig = pgTable(
  "paired_sample_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    dataBefore: jsonb("data_before").$type<number[]>().default([]),
    dataAfter: jsonb("data_after").$type<number[]>().default([]),
    nullHypothesisDifference: real("null_hypothesis_difference").default(0),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type"), // "Lower Tail", "Upper Tail", "Two Tail"
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertPairedSampleHypothesisConfigSchema = createInsertSchema(
  pairedSampleHypothesisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertPairedSampleHypothesisConfig = z.infer<
  typeof insertPairedSampleHypothesisConfigSchema
>;

// Multiple-Sample (ANOVA) Hypothesis Testing Configuration
export const multipleSampleHypothesisConfig = pgTable(
  "multiple_sample_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    samples: jsonb("samples")
      .$type<Array<{ name: string; data: number[] }>>()
      .default([]),
    significanceLevel: real("significance_level").default(0.05),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertMultipleSampleHypothesisConfigSchema = createInsertSchema(
  multipleSampleHypothesisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMultipleSampleHypothesisConfig = z.infer<
  typeof insertMultipleSampleHypothesisConfigSchema
>;

// Chi-Square (Two Proportion) Hypothesis Testing Configuration
export const twoProportionHypothesisConfig = pgTable(
  "two_proportion_hypothesis_testing",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"),
    ctqVariableName: text("ctq_variable_name"),
    sample1Successes: integer("sample1_successes"),
    sample1Size: integer("sample1_size"),
    sample2Successes: integer("sample2_successes"),
    sample2Size: integer("sample2_size"),
    nullHypothesisDifference: real("null_hypothesis_difference").default(0),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type"), // "Lower Tail", "Upper Tail", "Two Tail"
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertTwoProportionHypothesisConfigSchema = createInsertSchema(
  twoProportionHypothesisConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertTwoProportionHypothesisConfig = z.infer<
  typeof insertTwoProportionHypothesisConfigSchema
>;

// General Hypothesis Testing Configuration (covers all types)
export const hypothesisTestingConfig = pgTable(
  "hypothesis_testing_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    hypothesisType: text("hypothesis_type"), // "attribute", "one-sample", "two-sample", "paired-sample", "multiple-sample"
    ctqVariableName: text("ctq_variable_name"),
    config: jsonb("config").$type<Record<string, unknown>>(), // Flexible config for different hypothesis types
    significanceLevel: real("significance_level").default(0.05),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertHypothesisTestingConfigSchema = createInsertSchema(
  hypothesisTestingConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertHypothesisTestingConfig = z.infer<
  typeof insertHypothesisTestingConfigSchema
>;

// MultiVariate Chart Configuration
export const multiVariChartConfig = pgTable("multivari_chart_config", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  ctqVariableName: text("ctq_variable_name"),
  withinGroupVariableName: text("within_group_variable_name"),
  betweenGroupVariableName: text("between_group_variable_name"),
  data: jsonb("data").$type<
    Array<{ withinGroup: string; betweenGroup: string; value: number }>
  >(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertMultiVariChartConfigSchema = createInsertSchema(
  multiVariChartConfig
).omit({
  id: true,
  lastUpdated: true,
});

// Pareto Analysis
export const paretoAnalysis = pgTable(
  "pareto_analysis",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    defectName: text("defect_name"),
    frequency: integer("frequency"),
    costPerDefect: real("cost_per_defect"),
    totalCost: real("total_cost"),
    activeTab: text("active_tab").default("setup"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionPareto: unique().on(table.projectId, table.solutionId),
  })
);

export const insertParetoAnalysisSchema = createInsertSchema(paretoAnalysis).omit(
  {
    id: true,
    lastUpdated: true,
  }
);

export type InsertParetoAnalysis = z.infer<typeof insertParetoAnalysisSchema>;
export type ParetoAnalysis = typeof paretoAnalysis.$inferSelect;

// Chi-Square Independence Configuration
export const chiSquareIndependenceConfig = pgTable(
  "chi_square_independence_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    var1Name: text("var1_name"),
    var2Name: text("var2_name"),
    contingencyTable: jsonb("contingency_table")
      .$type<Record<string, Record<string, number>>>()
      .default({}),
    significanceLevel: real("significance_level").default(0.05),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertChiSquareIndependenceConfigSchema = createInsertSchema(
  chiSquareIndependenceConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertChiSquareIndependenceConfig = z.infer<
  typeof insertChiSquareIndependenceConfigSchema
>;

// Value & Time Analysis
export const valueTimeAnalysis = pgTable("value_time_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  stepName: text("step_name"),
  timeSeconds: integer("time_seconds"),
  valueType: text("value_type"), // "Value Added", "Business Necessary", "Non-Value Added"
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertValueTimeAnalysisSchema = createInsertSchema(
  valueTimeAnalysis
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertValueTimeAnalysis = z.infer<
  typeof insertValueTimeAnalysisSchema
>;

// FMEA Analysis
export const fmeaAnalysis = pgTable("fmea_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  processStep: text("process_step"),
  potentialFailureMode: text("potential_failure_mode"),
  potentialEffect: text("potential_effect"),
  severity: integer("severity"),
  occurrence: integer("occurrence"),
  detection: integer("detection"),
  rpn: integer("rpn"),
  actionTaken: text("action_taken"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertFmeaAnalysisSchema = createInsertSchema(fmeaAnalysis).omit({
  id: true,
  lastUpdated: true,
});

export type InsertFmeaAnalysis = z.infer<typeof insertFmeaAnalysisSchema>;

// Solutions
export const solutions = pgTable("solutions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull().unique(),
  solutionName: text("solution_name"),
  description: text("description"),
  type: text("type"), // "Design", "Optimization", etc.
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSolutionSchema = createInsertSchema(solutions).pick({
  organizationId: true,
  projectId: true,
  solutionId: true,
  solutionName: true,
  description: true,
  type: true,
  status: true,
});

// Solution Design Tracking
export const solutionDesignTracking = pgTable(
  "solution_design_tracking",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    designElement: text("design_element"),
    status: text("status").default("Not Started"),
    dueDate: date("due_date"),
    completionDate: date("completion_date"),
    owner: text("owner"),
    notes: text("notes"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionTracking: unique().on(table.projectId, table.solutionId),
  })
);

export const insertSolutionDesignTrackingSchema = createInsertSchema(
  solutionDesignTracking
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSolutionDesignTracking = z.infer<
  typeof insertSolutionDesignTrackingSchema
>;

// Solution Process Map
export const insertSolutionProcessMapSchema = createInsertSchema(
  solutionProcessMaps
).pick({
  organizationId: true,
  projectId: true,
  solutionId: true,
  asIsMapContent: true,
  toBeMapContent: true,
});

// Implementation Plan Tasks
export const implementationPlanTasks = pgTable("implementation_plan_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  projectId: integer("project_id").notNull(),
  solutionId: text("solution_id").notNull(),
  taskName: text("task_name"),
  description: text("description"),
  owner: text("owner"),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  status: text("status").default("Not Started"),
  priority: text("priority"),
  resourceRequired: text("resource_required"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertImplementationPlanTaskSchema = createInsertSchema(
  implementationPlanTasks
).omit({
  id: true,
  lastUpdated: true,
});

// Before & After Analysis (Continuous CTQ, Two-Sample Test)
export const beforeAfterContCTQTwoSampleTest = pgTable(
  "before_after_cont_ctq_two_sample_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    ctqVariableName: text("ctq_variable_name"),
    beforeData: jsonb("before_data").$type<number[]>().default([]),
    afterData: jsonb("after_data").$type<number[]>().default([]),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type").default("Two Tail"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertBeforeAfterContCTQTwoSampleTestSchema = createInsertSchema(
  beforeAfterContCTQTwoSampleTest
).omit({
  id: true,
  lastUpdated: true,
});

// Before & After Analysis (Two Proportions Test)
export const beforeAfterTwoProportionTest = pgTable(
  "before_after_two_proportion_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    ctqVariableName: text("ctq_variable_name"),
    beforeSuccesses: integer("before_successes"),
    beforeSize: integer("before_size"),
    afterSuccesses: integer("after_successes"),
    afterSize: integer("after_size"),
    significanceLevel: real("significance_level").default(0.05),
    testType: text("test_type").default("Two Tail"),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertBeforeAfterTwoProportionTestSchema = createInsertSchema(
  beforeAfterTwoProportionTest
).omit({
  id: true,
  lastUpdated: true,
});

// Before & After Analysis (Chi-Square Test)
export const beforeAfterChiSquareTest = pgTable(
  "before_after_chi_square_test",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    var1Name: text("var1_name"),
    var2Name: text("var2_name"),
    beforeContingencyTable: jsonb("before_contingency_table")
      .$type<Record<string, Record<string, number>>>()
      .default({}),
    afterContingencyTable: jsonb("after_contingency_table")
      .$type<Record<string, Record<string, number>>>()
      .default({}),
    significanceLevel: real("significance_level").default(0.05),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertBeforeAfterChiSquareTestSchema = createInsertSchema(
  beforeAfterChiSquareTest
).omit({
  id: true,
  lastUpdated: true,
});

// Proof of Improvement Preferences
export const proofOfImprovementPreferences = pgTable(
  "proof_of_improvement_preferences",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),
    controlChartType: text("control_chart_type"),
    timeSeriesData: jsonb("time_series_data").$type<number[]>().default([]),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolution: unique().on(table.projectId, table.solutionId),
  })
);

export const insertProofOfImprovementPreferencesSchema = createInsertSchema(
  proofOfImprovementPreferences
).omit({
  id: true,
  lastUpdated: true,
});

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

    // Variable descriptions
    responseVariableName: text("response_variable_name").default("Y"),
    predictorVariableName: text("predictor_variable_name").default("X"),

    // Data arrays
    dataY: jsonb("data_y").$type<number[]>().default([]),
    dataX: jsonb("data_x").$type<number[]>().default([]),

    // Analysis options
    significanceLevel: real("significance_level").default(0.05),

    // Solve for X settings
    targetY: real("target_y"),
    solveForX: boolean("solve_for_x").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionSimpleRegression: unique().on(table.projectId, table.solutionId),
  })
);

export const insertSimpleRegressionConfigSchema = createInsertSchema(
  simpleRegressionConfig
).omit({
  id: true,
  lastUpdated: true,
});

export type InsertSimpleRegressionConfig = z.infer<
  typeof insertSimpleRegressionConfigSchema
>;
export type SimpleRegressionConfig = typeof simpleRegressionConfig.$inferSelect;

// ANOVA 2-Way Configuration
export const anovaTwoWayConfig = pgTable(
  "anova_two_way_config",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: integer("project_id").notNull(),
    solutionId: text("solution_id").notNull(),

    // Response variable name
    responseVariableName: text("response_variable_name").default("Y Response"),

    // Factor names (usually two factors)
    factorAName: text("factor_a_name").default("Factor A"),
    factorBName: text("factor_b_name").default("Factor B"),

    // Factor levels
    // For Factor A: { "A1": "Low", "A2": "High" }
    // For Factor B: { "B1": "Low", "B2": "High" }
    factorALevels: jsonb("factor_a_levels").$type<Record<string, string>>().default({}),
    factorBLevels: jsonb("factor_b_levels").$type<Record<string, string>>().default({}),

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
  })
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
  })
);

export const insertMultipleRegressionConfigSchema = createInsertSchema(multipleRegressionConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertMultipleRegressionConfig = z.infer<typeof insertMultipleRegressionConfigSchema>;
export type MultipleRegressionConfig = typeof multipleRegressionConfig.$inferSelect;

// Logistic Regression Configuration
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
    responseVariableName: text("response_variable_name").default("Success"),
    predictorNames: jsonb("predictor_names").$type<string[]>().default(["X1", "X2"]),

    // Data arrays - binary Y (0/1) and multiple X columns
    dataY: jsonb("data_y").$type<number[]>().default([]), // Binary: 0 or 1
    dataX: jsonb("data_x").$type<number[][]>().default([]),

    // Selected predictors for model
    selectedPredictors: jsonb("selected_predictors").$type<number[]>().default([]),

    // Analysis options
    significanceLevel: real("significance_level").default(0.05),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionLogisticRegression: unique().on(table.projectId, table.solutionId),
  })
);

export const insertLogisticRegressionConfigSchema = createInsertSchema(logisticRegressionConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertLogisticRegressionConfig = z.infer<typeof insertLogisticRegressionConfigSchema>;
export type LogisticRegressionConfig = typeof logisticRegressionConfig.$inferSelect;

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

    // Design type selection
    enableFullFactorial: boolean("enable_full_factorial").default(false),
    enableFractionalFactorial: boolean("enable_fractional_factorial").default(false),

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
      units?: string;
    }>>().default([]),

    // Experimental run data
    // Structure: [{ run: 1, factors: [-1, 1, -1, ...], response: 45.2 }, ...]
    runData: jsonb("run_data").$type<Array<{
      run: number;
      factors: number[];
      response: number | null;
    }>>().default([]),

    // Design parameters
    numberOfReplicates: integer("number_of_replicates").default(1),
    randomizeRuns: boolean("randomize_runs").default(true),
    includeCenterPoints: boolean("include_center_points").default(false),
    numberOfCenterPoints: integer("number_of_center_points").default(3),

    // Fractional factorial specific
    fractionalResolution: integer("fractional_resolution").default(1),

    // Analysis options
    significanceLevel: real("significance_level").default(0.05),

    // Coded/Uncoded display preference
    showUncoded: boolean("show_uncoded").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionDoeFractionalFactorial: unique().on(table.projectId, table.solutionId),
  })
);

export const insertDoeFractionalFactorialConfigSchema = createInsertSchema(doeFractionalFactorialConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertDoeFractionalFactorialConfig = z.infer<typeof insertDoeFractionalFactorialConfigSchema>;
export type DoeFractionalFactorialConfig = typeof doeFractionalFactorialConfig.$inferSelect;

// DOE Full Factorial Configuration (2^k designs)
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

    // Factors configuration
    factors: jsonb("factors").$type<Array<{
      name: string;
      type: "continuous" | "categorical";
      lowValue?: number;
      highValue?: number;
      levels?: string[];
      units?: string;
    }>>().default([]),

    // Experimental run data
    runData: jsonb("run_data").$type<Array<{
      run: number;
      factors: number[];
      response: number | null;
    }>>().default([]),

    // Design parameters
    numberOfReplicates: integer("number_of_replicates").default(1),
    randomizeRuns: boolean("randomize_runs").default(true),
    includeCenterPoints: boolean("include_center_points").default(false),
    numberOfCenterPoints: integer("number_of_center_points").default(3),

    // Analysis options
    significanceLevel: real("significance_level").default(0.05),

    // Coded/Uncoded display preference
    showUncoded: boolean("show_uncoded").default(false),

    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSolutionDoeFullFactorial: unique().on(table.projectId, table.solutionId),
  })
);

export const insertDoeFullFactorialConfigSchema = createInsertSchema(doeFullFactorialConfig).omit({
  id: true,
  lastUpdated: true,
});

export type InsertDoeFullFactorialConfig = z.infer<typeof insertDoeFullFactorialConfigSchema>;
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

// Aliases for backward compatibility with storage.ts
export const activityLogs = logs;
export const sipocDiagrams = sipocs;
export const dataCollectionPlans = dataCollectionPlan;
export type ActivityLog = typeof logs.$inferSelect;
export type SipocDiagram = typeof sipocs.$inferSelect;
export type InsertSipoc = z.infer<typeof insertSipocSchema>;
