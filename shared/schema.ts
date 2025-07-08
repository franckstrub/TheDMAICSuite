import { pgTable, text, serial, integer, boolean, date, timestamp, jsonb, json, index, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// RACI role types
export const raciRoleTypes = ["R", "A", "C", "I"] as const;
export type RaciRole = typeof raciRoleTypes[number];

// Stakeholder Analysis Interest Level
export const interestLevels = ["High", "Medium", "Low"] as const;
export type InterestLevel = typeof interestLevels[number];

// Stakeholder Analysis Resistance Type
export const resistanceTypes = ["Technical", "Political", "Cultural", "Personal"] as const; 
export type ResistanceType = typeof resistanceTypes[number];

// Stakeholder Analysis Influence Level
export const influenceLevels = ["High", "Medium", "Low"] as const;
export type InfluenceLevel = typeof influenceLevels[number];

// Stakeholder Analysis Support Level
export const supportLevels = ["Supporter", "Neutral", "Resistant"] as const;
export type SupportLevel = typeof supportLevels[number];

// Unit appraised type options for MSA
export const unitAppraisedTypes = ["Part", "Unit", "File", "Document", "Other"] as const;
export type UnitAppraisedType = typeof unitAppraisedTypes[number];

// Gate Review Validation Status
export const validationStatusTypes = ["Pending", "Approved", "Rejected"] as const;
export type ValidationStatus = typeof validationStatusTypes[number];

export const deliverableRequirementTypes = ["Required", "Optional", "Added by User"] as const;
export type DeliverableRequirementType = typeof deliverableRequirementTypes[number];

// User Roles
export const userRoles = ["super_admin", "admin", "manager", "member"] as const;
export type UserRole = typeof userRoles[number];

// Organizations table for multi-tenant support
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["enterprise_small", "enterprise_medium", "solo_entrepreneur", "individual"] }).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  phone: text("phone"),
  phoneCountryCode: text("phone_country_code"),
  companyName: text("company_name"),
  role: text("role", { enum: ["super_admin", "admin", "manager", "member"] }).default("admin"),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement").notNull(),
  customerRequirement: text("customer_requirement"),
  importance: integer("importance").notNull(),
  CTS: text("CTS").notNull().default(""), // Changed from integer to text for CTS
  ctq: text("ctq").default(""),  // Critical to Quality field
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertRequirementSchema = createInsertSchema(customerRequirements).pick({
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  requirement: text("requirement").notNull(),
  businessNeed: text("business_need"),
  importance: integer("importance").notNull(),
  ctq: text("ctq").notNull().default(""), // Critical to Quality field for business requirements
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertBusinessRequirementSchema = createInsertSchema(businessRequirements).pick({
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
export type PointOfMeasureType = typeof pointOfMeasureTypes[number];

// Collection Method types
export const collectionMethodTypes = ["Random", "Stratified", "Systematic", "Time-based", "Rationale Subgrouping", "100% inspection", "Other"] as const;
export type CollectionMethodType = typeof collectionMethodTypes[number];

// Data Collection Plans
export const dataCollectionPlans = pgTable("data_collection_plans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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

// Project RACI Matrix
export const projectRaciMatrix = pgTable("project_raci_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
export type InsertBusinessRequirement = z.infer<typeof insertBusinessRequirementSchema>;

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

// RACI matrix data structure
export type RaciMatrixData = {
  roles: {
    name: string;
    role: string;        // The role field is now required
    phases: {
      define: RaciRole | null;
      measure: RaciRole | null;
      analyze: RaciRole | null;
      improve: RaciRole | null;
      control: RaciRole | null;
    };
  }[];
};

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

// Stakeholder Analysis Matrix
export const stakeholderAnalysisItems = pgTable("stakeholder_analysis_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  stakeholderName: text("stakeholder_name").notNull(),
  stakeholderRole: text("stakeholder_role"),
  interestLevel: text("interest_level").$type<InterestLevel>().notNull().default("Medium"),
  resistanceType: text("resistance_type").$type<ResistanceType | null>(),
  influenceLevel: text("influence_level").$type<InfluenceLevel>().notNull().default("Medium"),
  supportLevel: text("support_level").$type<SupportLevel>().notNull().default("Neutral"),
  engagementStrategy: text("engagement_strategy"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Schema for inserting a stakeholder analysis item
export const insertStakeholderAnalysisItemSchema = createInsertSchema(stakeholderAnalysisItems).omit({
  id: true,
  lastUpdated: true,
});

// Type for insert operations
export type InsertStakeholderAnalysisItem = z.infer<typeof insertStakeholderAnalysisItemSchema>;

// Type for select operations
export type StakeholderAnalysisItem = typeof stakeholderAnalysisItems.$inferSelect;

// Gate Review Deliverables
export const gateReviewDeliverables = pgTable("gate_review_deliverables", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  phase: text("phase").notNull(), // define, measure, analyze, improve, control
  name: text("name").notNull(),
  description: text("description"),
  isRequired: text("is_required").$type<DeliverableRequirementType>().notNull().default("Required"),
  isCompleted: boolean("is_completed").notNull().default(false),
  fileAttachment: text("file_attachment"), // Path/filename for the attached document
  fileOriginalName: text("file_original_name"), // Original filename before upload
  fileSize: integer("file_size"), // File size in bytes
  fileType: text("file_type"), // MIME type of the file
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGateReviewDeliverableSchema = createInsertSchema(gateReviewDeliverables).omit({
  id: true,
  lastUpdated: true,
});

export type InsertGateReviewDeliverable = z.infer<typeof insertGateReviewDeliverableSchema>;
export type GateReviewDeliverable = typeof gateReviewDeliverables.$inferSelect;

// Gate Review Validators
export const gateReviewValidators = pgTable("gate_review_validators", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  phase: text("phase").notNull(), // define, measure, analyze, improve, control
  validatorName: text("validator_name").notNull(),
  validatorRole: text("validator_role").notNull(), // sponsor, project_leader, financial_controller, coach, other
  status: text("status").$type<ValidationStatus>().notNull().default("Pending"),
  comments: text("comments"),
  validatedDate: timestamp("validated_date"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertGateReviewValidatorSchema = createInsertSchema(gateReviewValidators).omit({
  id: true,
  validatedDate: true,
  lastUpdated: true,
});

export type InsertGateReviewValidator = z.infer<typeof insertGateReviewValidatorSchema>;
export type GateReviewValidator = typeof gateReviewValidators.$inferSelect;

// Gantt Tasks for Work Breakdown Structure
export const ganttTasks = pgTable("gantt_tasks", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  diagramData: text("diagram_data"), // Store draw.io XML data
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Fishbone Diagrams for DMAIC Analyze Phase
export const fishboneDiagrams = pgTable("fishbone_diagrams", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id, { onDelete: 'cascade' }).notNull(),
  diagramData: text("diagram_data"), // Store draw.io XML data
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertFishboneDiagramSchema = createInsertSchema(fishboneDiagrams).omit({
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

// CTQ Type for CTS Characteristics
export const ctqTypes = ["Attribute", "Continuous"] as const;
export type CtqType = typeof ctqTypes[number];

// CTS Characteristics for DMAIC Measure Phase
export const ctsCharacteristics = pgTable("cts_characteristics", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
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

export const insertCtsCharacteristicsSchema = createInsertSchema(ctsCharacteristics).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCtsCharacteristics = z.infer<typeof insertCtsCharacteristicsSchema>;
export type CtsCharacteristics = typeof ctsCharacteristics.$inferSelect;

// Root Cause Prioritization for DMAIC Analyze Phase
export const rootCausePrioritization = pgTable("root_cause_prioritization", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id, { onDelete: 'cascade' }).notNull(),
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

export const insertRootCausePrioritizationSchema = createInsertSchema(rootCausePrioritization).omit({
  id: true,
  lastUpdated: true,
});

export type InsertRootCausePrioritization = z.infer<typeof insertRootCausePrioritizationSchema>;
export type RootCausePrioritization = typeof rootCausePrioritization.$inferSelect;

// Cause & Effect Matrix for DMAIC Analyze Phase
export const causeEffectMatrix = pgTable("cause_effect_matrix", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id, { onDelete: 'cascade' }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  rootCauses: json("root_causes").$type<string[]>(),
  ctqs: json("ctqs").$type<Array<{ctq: string, ctqType: string, ctqId: number}>>(),
  importanceScores: json("importance_scores").$type<number[]>(),
  matrix: json("matrix").$type<string[][]>(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertCauseEffectMatrixSchema = createInsertSchema(causeEffectMatrix).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCauseEffectMatrix = z.infer<typeof insertCauseEffectMatrixSchema>;
export type CauseEffectMatrix = typeof causeEffectMatrix.$inferSelect;

// MSA (Measurement System Analysis) for each CTQ
export const msaAnalysis = pgTable("msa_analysis", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id), // Foreign key to CTS characteristics
  ctq: text("ctq").notNull(), // Links to CTQ from CTS characteristics (kept for backward compatibility)
  msaType: text("msa_type").notNull().default("Gage R&R"), // "Gage R&R", "Attribute Agreement", "Bias Study"
  
  // Attribute Agreement Analysis fields
  unitAppraisedType: text("unit_appraised_type").$type<UnitAppraisedType>().default("Part"),
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
export type DataSetTermType = typeof dataSetTermTypes[number];

// Capability Index Type
export const capabilityIndexType = z.enum(["Z", "Cp/Cpk"]);
export type CapabilityIndexType = z.infer<typeof capabilityIndexType>;

// Process Capability for each CTQ
export const processCapability = pgTable("process_capability", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").notNull(),
  ctqId: integer("ctq_id").references(() => ctsCharacteristics.id), // Foreign key to CTS characteristics
  ctq: text("ctq").notNull(), // Links to CTQ from CTS characteristics (kept for backward compatibility)
  lsl: text("lsl"), // Lower Specification Limit (optional for attribute CTQs)
  usl: text("usl"), // Upper Specification Limit (optional for attribute CTQs)
  target: text("target"), // Target value (optional for attribute CTQs)
  zShift: real("z_shift").default(1.5), // Z-shift value (default 1.5)
  dataSetTerm: text("data_set_term").$type<DataSetTermType>().default("Long Term"), // Data set term (Long Term or Short Term)
  capabilityIndex: text("capability_index").$type<CapabilityIndexType>().default("Cp/Cpk"), // Z or Cp/Cpk
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
  rtyProcessSteps: json("rty_process_steps").$type<Array<{stepName: string; passed: number | null; total: number}>>(),
  // OEE Analysis fields - Input fields
  oeeScheduledTime: real("oee_scheduled_time"), // Scheduled production time in hours
  oeeAvailableTime: real("oee_available_time"), // Available time in hours
  oeeNominalCapacity: integer("oee_nominal_capacity"), // Nominal production capacity parts/hour
  oeePartsManufactured: integer("oee_parts_manufactured"), // Number of parts manufactured
  oeeBadParts: integer("oee_bad_parts"), // Number of bad/defective parts
  // Pareto Analysis fields
  paretoDefectCategories: json("pareto_defect_categories").$type<Array<{category: string; count: number | null}>>(),
  // DPU Analysis fields
  dpuDefects: integer("dpu_defects"),
  dpuUnits: integer("dpu_units"),

  capabilityAssessment: text("capability_assessment"), // AI-generated capability assessment
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertProcessCapabilitySchema = createInsertSchema(processCapability).omit({
  id: true,
  lastUpdated: true,
});

export type InsertProcessCapability = z.infer<typeof insertProcessCapabilitySchema>;
export type ProcessCapability = typeof processCapability.$inferSelect;

// Process Capability Data is now stored as JSON array in the processCapability table
