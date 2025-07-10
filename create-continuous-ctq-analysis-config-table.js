/**
 * Script to create continuous_ctq_analysis_config table
 * 
 * This will create the table for storing user choices for continuous CTQ analysis types
 * Run with: node create-continuous-ctq-analysis-config-table.js
 */

import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

async function createContinuousCtqAnalysisConfigTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Creating continuous_ctq_analysis_config table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS continuous_ctq_analysis_config (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        project_id INTEGER NOT NULL,
        ctq_id INTEGER NOT NULL REFERENCES cts_characteristics(id) ON DELETE CASCADE,
        ctq TEXT NOT NULL,
        enable_cont_y_hypothesis_test BOOLEAN DEFAULT true,
        enable_cont_y_simple_regression BOOLEAN DEFAULT false,
        enable_cont_y_multi_vari_chart BOOLEAN DEFAULT false,
        enable_cont_y_anova_2way BOOLEAN DEFAULT false,
        enable_cont_y_multiple_regression BOOLEAN DEFAULT false,
        enable_cont_y_doe BOOLEAN DEFAULT false,
        enable_pareto BOOLEAN DEFAULT false,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_ctq_config UNIQUE (project_id, ctq_id)
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✓ continuous_ctq_analysis_config table created successfully');
    
  } catch (error) {
    console.error('Error creating continuous_ctq_analysis_config table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createContinuousCtqAnalysisConfigTable()
  .then(() => {
    console.log('Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });

export { createContinuousCtqAnalysisConfigTable };