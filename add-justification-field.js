/**
 * Script to add justification column to msa_analysis table
 * 
 * This will add the necessary column to the msa_analysis table in the database
 * Run with: node add-justification-field.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addJustificationColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding justification column to msa_analysis table...');
    
    await client.query(`
      ALTER TABLE msa_analysis 
      ADD COLUMN IF NOT EXISTS justification TEXT;
    `);
    
    console.log('Successfully added justification column to msa_analysis table');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      AND column_name = 'justification';
    `);
    
    if (result.rows.length > 0) {
      console.log('Column verification:');
      console.log(`- ${result.rows[0].column_name}: ${result.rows[0].data_type} (nullable: ${result.rows[0].is_nullable})`);
    } else {
      console.log('Warning: justification column not found after creation');
    }
    
  } catch (error) {
    console.error('Error adding justification column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addJustificationColumn();