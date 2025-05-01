import { projectCharters } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function debugGetCharter(projectId: number) {
  try {
    // Get all columns from the project charter
    const [result] = await db
      .select({
        id: projectCharters.id,
        projectId: projectCharters.projectId,
        businessCase: projectCharters.businessCase,
        problemStatement: projectCharters.problemStatement,
        goals: projectCharters.goals,
        scope: projectCharters.scope,
        
        // Project benefits
        savingsPerYear: projectCharters.savingsPerYear,
        workingCapitalGains: projectCharters.workingCapitalGains,  
        waccPercentage: projectCharters.waccPercentage,
        financialSavings: projectCharters.financialSavings,
        fteBenefits: projectCharters.fteBenefits,
        
        // FTE parameters
        fteWorkingDaysPerYear: projectCharters.fteWorkingDaysPerYear,
        fteWorkingHoursPerDay: projectCharters.fteWorkingHoursPerDay,
        fteTimeUnit: projectCharters.fteTimeUnit,
        fteSavedHours: projectCharters.fteSavedHours,
        fteCostPerYear: projectCharters.fteCostPerYear,
        fteCalculatedValue: projectCharters.fteCalculatedValue,
        
        // Project costs - adding these was missing!
        oneOffPeopleCost: projectCharters.oneOffPeopleCost,
        oneOffTechnologyCost: projectCharters.oneOffTechnologyCost,
        oneOffOtherCost: projectCharters.oneOffOtherCost,
        oneOffOtherExplanation: projectCharters.oneOffOtherExplanation,
        capexCost: projectCharters.capexCost,
        capexExplanation: projectCharters.capexExplanation,
        
        // Other charter fields
        softBenefits: projectCharters.softBenefits,
        totalFinancialSavings: projectCharters.totalFinancialSavings,
        totalProjectCosts: projectCharters.totalProjectCosts,
        projectNetValue: projectCharters.projectNetValue,
        roi: projectCharters.roi,
        breakeven: projectCharters.breakeven,
        lastUpdated: projectCharters.lastUpdated
      })
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId));
    
    console.log("Charter data retrieved:", result);
    return result;
  } catch (err) {
    console.error("Debug charter error:", err);
    return null;
  }
}