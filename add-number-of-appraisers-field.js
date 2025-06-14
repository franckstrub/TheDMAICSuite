/**
 * Script to add numberOfAppraisers column to msa_analysis table
 * 
 * This will add the necessary column to the msa_analysis table in the database
 * Run with: node add-number-of-appraisers-field.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addNumberOfAppraisersColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding numberOfAppraisers column to msa_analysis table...');
    
    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' AND column_name = 'number_of_appraisers';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('NumberOfAppraisers column already exists');
      return;
    }
    
    // Add the numberOfAppraisers column with default value of 2
    await client.query(`
      ALTER TABLE msa_analysis 
      ADD COLUMN number_of_appraisers INTEGER DEFAULT 2;
    `);
    
    console.log('Successfully added numberOfAppraisers column to msa_analysis table');
    
    // Update existing records to have default value of 2
    await client.query(`
      UPDATE msa_analysis 
      SET number_of_appraisers = 2 
      WHERE number_of_appraisers IS NULL;
    `);
    
    console.log('Updated existing records with default numberOfAppraisers value');
    
  } catch (error) {
    console.error('Error adding numberOfAppraisers column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addNumberOfAppraisersColumn();