import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Stakeholder Analysis Matrix Item
export const stakeholderAnalysisItems = pgTable("stakeholder_analysis_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stakeholderName: text("stakeholder_name").notNull(),
  stakeholderRole: text("stakeholder_role"),
  interestLevel: text("interest_level").$type<InterestLevel>().notNull().default("Medium"),
  resistanceType: text("resistance_type").$type<ResistanceType>().default("Technical"),
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