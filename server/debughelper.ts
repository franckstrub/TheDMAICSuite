import { projectCharters } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function debugGetCharter(projectId: number) {
  try {
    // First try a simple query with specific columns
    const [result] = await db
      .select({
        id: projectCharters.id,
        projectId: projectCharters.projectId,
        businessCase: projectCharters.businessCase,
        problemStatement: projectCharters.problemStatement,
        goals: projectCharters.goals,
        scope: projectCharters.scope,
        savingsPerYear: projectCharters.savingsPerYear,
        workingCapitalGains: projectCharters.workingCapitalGains,  
        waccPercentage: projectCharters.waccPercentage,
        financialSavings: projectCharters.financialSavings,
        fteBenefits: projectCharters.fteBenefits,
        softBenefits: projectCharters.softBenefits
      })
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId));
    
    return result;
  } catch (err) {
    console.error("Debug charter error:", err);
    return null;
  }
}