import { db, pool } from "./db";
import { projectRaciMatrix } from "@shared/schema";
import { eq } from "drizzle-orm";

async function migrateRaciRolesToFunction() {
  try {
    // Check if the table exists first by trying to access a small subset of data
    try {
      // Get all RACI matrices from the database (limit to 5 to reduce load)
      const raciMatrices = await db.select().from(projectRaciMatrix).limit(5);

      // If we reach here, the table exists and we can continue with the migration
      // Process each RACI matrix
      for (const raciMatrix of raciMatrices) {
        let raciData: any;
        let hasChanges = false;

        // Parse the RACI data (handling both string and object formats)
        if (typeof raciMatrix.raciData === "string") {
          raciData = JSON.parse(raciMatrix.raciData);
        } else {
          raciData = raciMatrix.raciData;
        }

        // Check if the roles array exists
        if (raciData && raciData.roles && Array.isArray(raciData.roles)) {
          // Process each role
          for (const role of raciData.roles) {
            // If it has function but not role, migrate the value to role
            if (role.function && !role.role) {
              role.role = role.function;
              hasChanges = true;
              //console.log(
              //  `Migrated function to role for ${role.name}: ${role.function}`,
              //);
            }

            // Now remove the function field regardless of whether it was used
            if ("function" in role) {
              delete role.function;
              hasChanges = true;
              //console.log(`Removed function field for ${role.name}`);
            }
          }

          // If changes were made, update the database
          if (hasChanges) {
            //console.log(
            //  `Updating RACI matrix ${raciMatrix.id} for project ${raciMatrix.projectId}`,
            //);

            await db
              .update(projectRaciMatrix)
              .set({
                raciData: JSON.stringify(raciData),
                lastUpdated: new Date(),
              })
              .where(eq(projectRaciMatrix.id, raciMatrix.id));
          } else {
          }
        }
      }
    } catch (tableError) {
      // If we get here, the table might not exist yet, so we'll skip migration
    }
  } catch (error) {
    // Instead of throwing, just log the error and continue application startup
  }
}

// Export the migration function
export default migrateRaciRolesToFunction;

// For ESM modules, we can't check require.main === module
// We'll remove this check and just rely on the import from index.ts
