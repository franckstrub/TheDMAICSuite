/**
 * Script to create hypothesis_testing_config table
 * 
 * This will create the table for storing main hypothesis testing configuration for each CTQ
 * Run with: node create-hypothesis-testing-config-table.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function createHypothesisTestingConfigTable() {
  try {
    console.log('Creating hypothesis_testing_config table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hypothesis_testing_config (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        project_id INTEGER NOT NULL,
        ctq_id INTEGER NOT NULL REFERENCES cts_characteristics(id) ON DELETE CASCADE,
        ctq TEXT NOT NULL,
        
        enable_one_sample_test BOOLEAN DEFAULT true,
        enable_two_sample_test BOOLEAN DEFAULT false,
        enable_paired_sample_test BOOLEAN DEFAULT false,
        enable_multiple_sample_test BOOLEAN DEFAULT false,
        
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        
        UNIQUE(project_id, ctq_id)
      );
    `);
    
    console.log('✅ Table hypothesis_testing_config created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createHypothesisTestingConfigTable().catch(console.error);