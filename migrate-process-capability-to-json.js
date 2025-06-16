/**
 * Script to migrate process capability data from separate table to JSON column
 * 
 * This will:
 * 1. Add data_points JSON column to process_capability table
 * 2. Migrate existing data from process_capability_data table
 * 3. Drop the old process_capability_data table
 * 
 * Run with: node migrate-process-capability-to-json.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrateProcessCapabilityToJson() {
  try {
    console.log('Starting migration of process capability data to JSON...');
    
    // Step 1: Add data_points JSON column to process_capability table
    console.log('Adding data_points column...');
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS data_points JSON DEFAULT '[]'::json
    `;
    
    // Step 2: Migrate existing data from process_capability_data table
    console.log('Migrating existing data points...');
    
    // Get all process capability records
    const processCapabilities = await sql`
      SELECT id FROM process_capability
    `;
    
    for (const pc of processCapabilities) {
      // Get all data points for this process capability
      const dataPoints = await sql`
        SELECT data_value 
        FROM process_capability_data 
        WHERE process_capability_id = ${pc.id}
        ORDER BY index_number
      `;
      
      // Extract just the numeric values
      const values = dataPoints.map(dp => dp.data_value);
      
      if (values.length > 0) {
        // Update the process capability record with the JSON array
        await sql`
          UPDATE process_capability 
          SET data_points = ${JSON.stringify(values)}::json
          WHERE id = ${pc.id}
        `;
        console.log(`Migrated ${values.length} data points for process capability ${pc.id}`);
      }
    }
    
    // Step 3: Drop the old process_capability_data table
    console.log('Dropping old process_capability_data table...');
    await sql`DROP TABLE IF EXISTS process_capability_data`;
    
    console.log('✓ Successfully migrated process capability data to JSON format');
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateProcessCapabilityToJson()
  .then(() => {
    console.log('Process capability data migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });