/**
 * Script to create process_capability_data table
 * 
 * This will create the table for storing numeric data points for continuous CTQs
 * Run with: node create-process-capability-data-table.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function createProcessCapabilityDataTable() {
  try {
    console.log('Creating process_capability_data table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS process_capability_data (
        id SERIAL PRIMARY KEY,
        process_capability_id INTEGER NOT NULL REFERENCES process_capability(id) ON DELETE CASCADE,
        index_number INTEGER NOT NULL,
        data_value REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('✓ Successfully created process_capability_data table');
    
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createProcessCapabilityDataTable();