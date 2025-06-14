/**
 * Script to add repetitions column to msa_analysis table
 * 
 * This will add the necessary column to the msa_analysis table in the database
 * Run with: node add-repetitions-field.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addRepetitionsColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding repetitions column to msa_analysis table...');
    
    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' AND column_name = 'repetitions';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('Repetitions column already exists');
      return;
    }
    
    // Add the repetitions column with default value of 2
    await client.query(`
      ALTER TABLE msa_analysis 
      ADD COLUMN repetitions INTEGER DEFAULT 2;
    `);
    
    console.log('Successfully added repetitions column to msa_analysis table');
    
    // Update existing records to have default value of 2
    await client.query(`
      UPDATE msa_analysis 
      SET repetitions = 2 
      WHERE repetitions IS NULL;
    `);
    
    console.log('Updated existing records with default repetitions value');
    
  } catch (error) {
    console.error('Error adding repetitions column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addRepetitionsColumn();