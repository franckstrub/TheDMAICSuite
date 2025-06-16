/**
 * Script to add z_shift and data_set_term columns to process_capability table
 * 
 * This will add the necessary columns to the process_capability table in the database
 * Run with: node add-process-capability-fields.js
 */

import { neon } from '@neondatabase/serverless';

async function addProcessCapabilityFields() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Adding z_shift and data_set_term columns to process_capability table...');
    
    // Add z_shift column with default value of 1.5
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS z_shift REAL DEFAULT 1.5
    `;
    
    // Add data_set_term column with default value of 'Long Term'
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS data_set_term TEXT DEFAULT 'Long Term'
    `;
    
    console.log('Successfully added z_shift and data_set_term columns to process_capability table');
  } catch (error) {
    console.error('Error adding columns to process_capability table:', error);
    throw error;
  }
}

addProcessCapabilityFields()
  .then(() => {
    console.log('Process capability fields migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });