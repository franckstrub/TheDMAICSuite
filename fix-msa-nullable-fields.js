/**
 * Script to make MSA fields nullable that were removed from the interface
 * 
 * This will update the msa_analysis table to allow null values for fields
 * that are no longer used in the simplified MSA interface
 * Run with: node fix-msa-nullable-fields.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixMsaNullableFields() {
  const client = await pool.connect();
  
  try {
    console.log('Making MSA fields nullable that were removed from interface...');
    
    // Make the removed fields nullable
    await client.query(`
      ALTER TABLE msa_analysis 
      ALTER COLUMN study_description DROP NOT NULL,
      ALTER COLUMN operators DROP NOT NULL,
      ALTER COLUMN parts DROP NOT NULL,
      ALTER COLUMN measurements DROP NOT NULL,
      ALTER COLUMN repeatability DROP NOT NULL,
      ALTER COLUMN reproducibility DROP NOT NULL,
      ALTER COLUMN part_to_part_variation DROP NOT NULL,
      ALTER COLUMN total_gage_rr DROP NOT NULL,
      ALTER COLUMN number_distinct_categories DROP NOT NULL,
      ALTER COLUMN acceptable_criteria DROP NOT NULL,
      ALTER COLUMN conclusion DROP NOT NULL,
      ALTER COLUMN action_plan DROP NOT NULL;
    `);
    
    console.log('Successfully made MSA fields nullable');
    
    // Verify the changes
    const result = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      AND column_name IN (
        'study_description', 
        'operators', 
        'parts', 
        'measurements',
        'repeatability',
        'reproducibility',
        'part_to_part_variation',
        'total_gage_rr',
        'number_distinct_categories',
        'acceptable_criteria',
        'conclusion',
        'action_plan'
      )
      ORDER BY column_name;
    `);
    
    console.log('Updated columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: nullable = ${row.is_nullable}`);
    });

  } catch (error) {
    console.error('Error making MSA fields nullable:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMsaNullableFields();