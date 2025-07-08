/**
 * Script to create cause_effect_matrix table
 * 
 * This will create the table for storing cause & effect matrix data for each CTQ
 * Run with: node create-cause-effect-matrix-table.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function createCauseEffectMatrixTable() {
  try {
    console.log("Creating cause_effect_matrix table...");
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cause_effect_matrix (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id) NOT NULL,
        project_id INTEGER NOT NULL,
        ctq_id INTEGER REFERENCES cts_characteristics(id) ON DELETE CASCADE NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT false,
        root_causes JSON,
        ctqs JSON,
        importance_scores JSON,
        matrix JSON,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("✓ cause_effect_matrix table created successfully");
    
    // Create index for better performance
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_cause_effect_matrix_project_ctq 
      ON cause_effect_matrix(project_id, ctq_id);
    `);
    
    console.log("✓ Index created successfully");
    
  } catch (error) {
    console.error("❌ Error creating cause_effect_matrix table:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createCauseEffectMatrixTable();