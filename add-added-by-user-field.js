/**
 * Script to add added_by_user column to gate_review_deliverables table
 * 
 * This will add a boolean column "added_by_user" to the gate_review_deliverables table,
 * defaulting to false, to track whether deliverables were added by users or from defaults.
 * 
 * Run with: node add-added-by-user-field.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function addAddedByUserColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding added_by_user column to gate_review_deliverables table...');
    
    // Add the column to the table, defaulting to false
    await pool.query(`
      ALTER TABLE gate_review_deliverables 
      ADD COLUMN IF NOT EXISTS added_by_user BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    
    console.log('Column added successfully!');
  } catch (error) {
    console.error('Error adding added_by_user column:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
addAddedByUserColumn();