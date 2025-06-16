/**
 * Script to add show_z column to process_capability table
 * 
 * This will add the necessary column to the process_capability table in the database
 * Run with: node add-show-z-column.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function addShowZColumn() {
  try {
    console.log('Adding show_z column to process_capability table...');
    
    // Add the column
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS show_z BOOLEAN DEFAULT FALSE;
    `;
    
    console.log('✓ Successfully added show_z column');
    
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  }
}

addShowZColumn();