/**
 * Script to add Attribute Agreement Analysis fields to msa_analysis table
 * 
 * This will add the necessary columns for MSA Attribute CTQ analysis
 * Run with: node add-msa-attribute-fields.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addMsaAttributeFields() {
  const client = await pool.connect();
  
  try {
    console.log('Adding Attribute Agreement Analysis fields to msa_analysis table...');
    
    // Add new columns for Attribute Agreement Analysis
    await client.query(`
      ALTER TABLE msa_analysis 
      ADD COLUMN IF NOT EXISTS unit_appraised_type TEXT DEFAULT 'Parts',
      ADD COLUMN IF NOT EXISTS unit_appraised_type_other TEXT,
      ADD COLUMN IF NOT EXISTS appraiser1_name TEXT,
      ADD COLUMN IF NOT EXISTS appraiser2_name TEXT,
      ADD COLUMN IF NOT EXISTS appraiser3_name TEXT,
      ADD COLUMN IF NOT EXISTS agreement_analysis_data TEXT,
      ADD COLUMN IF NOT EXISTS study_date_time TIMESTAMP;
    `);
    
    console.log('Successfully added Attribute Agreement Analysis fields to msa_analysis table');
    
    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      AND column_name IN (
        'unit_appraised_type', 
        'unit_appraised_type_other', 
        'appraiser1_name', 
        'appraiser2_name', 
        'appraiser3_name', 
        'agreement_analysis_data',
        'study_date_time'
      )
      ORDER BY column_name;
    `);
    
    console.log('New columns added:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}${row.is_nullable === 'YES' ? ' (nullable)' : ''}`);
    });
    
  } catch (error) {
    console.error('Error adding MSA attribute fields:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMsaAttributeFields().catch(console.error);