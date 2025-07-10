/**
 * Script to create one_sample_hypothesis_config table
 * 
 * This will create the table for storing one-sample hypothesis testing data for each CTQ
 * Run with: node create-one-sample-hypothesis-table.js
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

async function createOneSampleHypothesisTable() {
  try {
    console.log('Creating one_sample_hypothesis_config table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS one_sample_hypothesis_config (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        project_id INTEGER NOT NULL,
        ctq_id INTEGER NOT NULL REFERENCES cts_characteristics(id) ON DELETE CASCADE,
        ctq TEXT NOT NULL,
        
        test_type TEXT DEFAULT 'One Sample Hyp-Test',
        
        enable_mean_test BOOLEAN DEFAULT true,
        enable_variance_test BOOLEAN DEFAULT false,
        enable_median_test BOOLEAN DEFAULT false,
        
        target_mean REAL,
        target_variance REAL,
        target_median REAL,
        
        significance_level TEXT DEFAULT '0.05',
        alternative TEXT DEFAULT 'Less than',
        
        data_points JSONB DEFAULT '[]',
        dataset_description TEXT,
        
        last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
        
        UNIQUE(project_id, ctq_id)
      );
    `);
    
    console.log('✅ Table one_sample_hypothesis_config created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Import sql from drizzle-orm
import { sql } from 'drizzle-orm';

createOneSampleHypothesisTable().catch(console.error);