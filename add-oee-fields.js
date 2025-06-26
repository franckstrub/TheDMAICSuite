/**
 * Script to add new OEE fields to process_capability table
 * 
 * This will add the necessary columns for the new OEE input structure
 * Run with: node add-oee-fields.js
 */

import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function addOeeFields() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('Adding new OEE fields to process_capability table...');
    
    // Add new OEE input fields
    const addFieldsQuery = `
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS oee_scheduled_time REAL,
      ADD COLUMN IF NOT EXISTS oee_available_time REAL,
      ADD COLUMN IF NOT EXISTS oee_good_count INTEGER,
      ADD COLUMN IF NOT EXISTS oee_nominal_capacity INTEGER,
      ADD COLUMN IF NOT EXISTS oee_parts_manufactured INTEGER;
    `;
    
    await client.query(addFieldsQuery);
    console.log('Successfully added new OEE fields to process_capability table');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error adding OEE fields:', error);
    process.exit(1);
  }
}

addOeeFields();