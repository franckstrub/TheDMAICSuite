/**
 * Script to add DPU (Defects per Unit) fields to process_capability table
 * 
 * This will add the necessary columns to the process_capability table in the database
 * Run with: node add-dpu-fields.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

async function addDpuFields() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Adding DPU fields to process_capability table...');
    
    // Add enable_dpu column
    await pool.query(`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS enable_dpu BOOLEAN DEFAULT false
    `);
    
    // Add dpu_defects column
    await pool.query(`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS dpu_defects INTEGER
    `);
    
    // Add dpu_units column
    await pool.query(`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS dpu_units INTEGER
    `);
    
    console.log('✅ Successfully added DPU fields to process_capability table');
    
  } catch (error) {
    console.error('❌ Error adding DPU fields:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addDpuFields()
  .then(() => {
    console.log('DPU fields migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('DPU fields migration failed:', error);
    process.exit(1);
  });