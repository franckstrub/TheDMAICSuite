import { db, pool } from './db';
import { projectRaciMatrix } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function migrateRaciRolesToFunction() {
  console.log('Starting RACI matrix roles migration - removing function field...');
  
  try {
    // Get all RACI matrices from the database
    const raciMatrices = await db.select().from(projectRaciMatrix);
    
    // Process each RACI matrix
    for (const raciMatrix of raciMatrices) {
      let raciData: any;
      let hasChanges = false;
      
      // Parse the RACI data (handling both string and object formats)
      if (typeof raciMatrix.raciData === 'string') {
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
            console.log(`Migrated function to role for ${role.name}: ${role.function}`);
          }
          
          // Now remove the function field regardless of whether it was used
          if ('function' in role) {
            delete role.function;
            hasChanges = true;
            console.log(`Removed function field for ${role.name}`);
          }
        }
        
        // If changes were made, update the database
        if (hasChanges) {
          console.log(`Updating RACI matrix ${raciMatrix.id} for project ${raciMatrix.projectId}`);
          
          await db.update(projectRaciMatrix)
            .set({
              raciData: JSON.stringify(raciData),
              lastUpdated: new Date()
            })
            .where(eq(projectRaciMatrix.id, raciMatrix.id));
            
          console.log(`Updated RACI matrix ${raciMatrix.id}`);
        } else {
          console.log(`No changes needed for RACI matrix ${raciMatrix.id}`);
        }
      }
    }
    
    console.log('RACI matrix roles migration completed successfully');
  } catch (error) {
    console.error('Error during RACI matrix roles migration:', error);
    throw error;
  }
}

// Export the migration function
export default migrateRaciRolesToFunction;

// For ESM modules, we can't check require.main === module
// We'll remove this check and just rely on the import from index.ts