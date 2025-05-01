import { projectCharters } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function debugGetCharter(projectId: number) {
  try {
    console.log(`Retrieving charter for project ID: ${projectId}`);
    
    // First, let's check if there are multiple charters for this project
    const charters = await db
      .select()
      .from(projectCharters)
      .where(eq(projectCharters.projectId, projectId));
      
    const charterCount = charters.length;
      
    console.log(`Found ${charterCount} charters for project ID ${projectId}`);
    
    if (charterCount === 0) {
      console.log(`No charter found for project ID ${projectId}`);
      return null;
    }
    
    // Get all columns from the project charter
    // Find the latest charter (with highest ID) manually
    let latestCharter = charters[0];
    
    // Find the charter with the highest ID
    for (const charter of charters) {
      if (charter.id > latestCharter.id) {
        latestCharter = charter;
      }
    }
    
    console.log(`Using latest charter with ID ${latestCharter.id} for project ${projectId}`);
    
    const result = latestCharter;
    
    console.log(`Charter data retrieved for project ID ${projectId}:`, result);
    return result;
  } catch (err) {
    console.error("Debug charter error:", err);
    return null;
  }
}