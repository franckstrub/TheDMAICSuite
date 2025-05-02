// This is a mockup of the schema updates needed for multiple stakeholders
import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the Stakeholder schema
export const stakeholderSchema = z.object({
  name: z.string(),
  function: z.string(),
});

// Define the type for a stakeholder
export type Stakeholder = z.infer<typeof stakeholderSchema>;

// Example of how the Project Charter table would be updated
export const projectCharters = pgTable("project_charters", {
  id: integer("id").primaryKey().notNull(),
  projectId: integer("project_id").notNull(),
  
  // Project team fields
  sponsor: text("sponsor"),
  projectLeader: text("project_leader"),
  
  // Change: Instead of individual stakeholder fields, store an array
  stakeholders: jsonb("stakeholders").$type<Stakeholder[]>(), // Store as JSON array
  
  financialController: text("financial_controller"),
  projectCoach: text("project_coach"),
  coachBeltLevel: text("coach_belt_level"),
  
  // Other fields would remain the same...
  businessCase: text("business_case"),
  problemStatement: text("problem_statement"),
  // ...
  
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Create the insert schema
export const insertCharterSchema = createInsertSchema(projectCharters)
  .extend({
    stakeholders: z.array(stakeholderSchema).default([]),
  })
  .omit({ id: true });

// Create the insert type
export type InsertCharter = z.infer<typeof insertCharterSchema>;

// Example of how the API would handle stakeholder data
/*
In the routes.ts file:

app.post("/api/projects/:projectId/charter", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Parse stakeholders from the request body
    const stakeholders = req.body.stakeholders 
      ? JSON.parse(req.body.stakeholders) 
      : [];
    
    const charterData: InsertCharter = {
      projectId,
      sponsor: req.body.sponsor,
      projectLeader: req.body.projectLeader,
      stakeholders, // Store the array of stakeholders
      financialController: req.body.financialController,
      projectCoach: req.body.projectCoach,
      // ...other fields
    };
    
    // Create the charter in the database
    const charter = await storage.createCharter(charterData);
    
    res.status(201).json({ charter });
  } catch (error) {
    // Handle errors
  }
});
*/