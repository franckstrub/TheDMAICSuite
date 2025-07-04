/**
 * Script to create root_cause_prioritization table
 * 
 * This will create the table for storing root cause prioritization data for each CTQ
 * Run with: node create-root-cause-prioritization-table.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

async function createRootCausePrioritizationTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Creating root_cause_prioritization table...');

    // Check if the table already exists
    const checkTableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'root_cause_prioritization'
    `);

    if (checkTableResult.rows.length > 0) {
      console.log('Table root_cause_prioritization already exists');
      return;
    }

    // Create the root_cause_prioritization table
    await pool.query(`
      CREATE TABLE root_cause_prioritization (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        project_id INTEGER NOT NULL,
        ctq_id INTEGER NOT NULL REFERENCES cts_characteristics(id) ON DELETE CASCADE,
        rootcause TEXT NOT NULL,
        multivotescore REAL NOT NULL DEFAULT 0,
        criticalrootcause BOOLEAN NOT NULL DEFAULT false,
        firstwhy TEXT DEFAULT '',
        secondwhy TEXT DEFAULT '',
        thirdwhy TEXT DEFAULT '',
        fourthwhy TEXT DEFAULT '',
        fifthwhy TEXT DEFAULT '',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('Successfully created root_cause_prioritization table');

    // Create index for performance
    await pool.query(`
      CREATE INDEX idx_root_cause_prioritization_project_ctq ON root_cause_prioritization(project_id, ctq_id)
    `);

    console.log('Successfully created index for root_cause_prioritization table');

  } catch (error) {
    console.error('Error creating root_cause_prioritization table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
createRootCausePrioritizationTable().catch(console.error);