/**
 * Script to create the new MSA analysis tables
 * 
 * This will create the attribute_msa_analysis and continuous_msa_analysis tables
 * Run with: node create-msa-tables.js
 */

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function createMsaTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Creating MSA analysis tables...');

    // Create attribute_msa_analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attribute_msa_analysis (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        ctq TEXT NOT NULL,
        unit_appraised_type TEXT DEFAULT 'Parts',
        unit_appraised_type_other TEXT,
        appraiser1_name TEXT,
        appraiser2_name TEXT,
        appraiser3_name TEXT,
        agreement_analysis_data TEXT,
        study_date_time TIMESTAMP NOT NULL DEFAULT NOW(),
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create continuous_msa_analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS continuous_msa_analysis (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        ctq TEXT NOT NULL,
        appraiser1_name TEXT,
        appraiser2_name TEXT,
        appraiser3_name TEXT,
        gage_rr_data TEXT,
        study_date_time TIMESTAMP NOT NULL DEFAULT NOW(),
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('MSA analysis tables created successfully!');

  } catch (error) {
    console.error('Error creating MSA tables:', error);
  } finally {
    await pool.end();
  }
}

createMsaTables();