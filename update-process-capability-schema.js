/**
 * Script to update process_capability table schema
 * 
 * This will:
 * 1. Remove calculated fields: sample_size, mean, standard_deviation, cp, cpk, pp, ppk, sigma, dpmo, yield, data_points
 * 2. Add user selection fields: capability_index, show_percentage
 * 
 * Run with: node update-process-capability-schema.js
 */

import { neon } from '@neondatabase/serverless';

async function updateProcessCapabilitySchema() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Updating process_capability table schema...');
    
    // Remove calculated fields that will no longer be stored
    const fieldsToRemove = [
      'sample_size',
      'mean', 
      'standard_deviation',
      'cp',
      'cpk', 
      'pp',
      'ppk',
      'sigma',
      'dpmo',
      'yield',
      'data_points'
    ];
    
    for (const field of fieldsToRemove) {
      try {
        await sql`ALTER TABLE process_capability DROP COLUMN IF EXISTS ${sql(field)}`;
        console.log(`Removed column: ${field}`);
      } catch (error) {
        console.log(`Column ${field} may not exist or already removed`);
      }
    }
    
    // Add new user selection fields
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS capability_index TEXT DEFAULT 'Cp/Cpk'
    `;
    console.log('Added capability_index column');
    
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS show_percentage BOOLEAN DEFAULT false
    `;
    console.log('Added show_percentage column');
    
    // Add check constraint for capability_index
    await sql`
      ALTER TABLE process_capability 
      DROP CONSTRAINT IF EXISTS process_capability_capability_index_check
    `;
    
    await sql`
      ALTER TABLE process_capability 
      ADD CONSTRAINT process_capability_capability_index_check 
      CHECK (capability_index IN ('Z', 'Cp/Cpk'))
    `;
    console.log('Added constraint for capability_index values');
    
    console.log('Successfully updated process_capability table schema');
  } catch (error) {
    console.error('Error updating process_capability table schema:', error);
    throw error;
  }
}

updateProcessCapabilitySchema()
  .then(() => {
    console.log('Process capability schema update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });