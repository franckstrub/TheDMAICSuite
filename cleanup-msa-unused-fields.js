/**
 * Script to remove unused fields from msa_analysis table
 * 
 * This will drop the following unused columns:
 * - study_description
 * - operators
 * - parts
 * - measurements
 * - repeatability
 * - reproducibility
 * - part_to_part_variation
 * - total_gage_rr
 * - number_distinct_categories
 * - acceptable_criteria
 * - conclusion
 * - action_plan
 * 
 * Run with: node cleanup-msa-unused-fields.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanupMsaUnusedFields() {
  const client = await pool.connect();
  
  try {
    console.log('Cleaning up unused fields from msa_analysis table...');
    
    // List of fields to remove
    const fieldsToRemove = [
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
    ];
    
    // Check which columns exist before attempting to drop them
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      AND column_name = ANY($1::text[]);
    `, [fieldsToRemove]);
    
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    console.log('Found existing columns to remove:', existingColumnNames);
    
    if (existingColumnNames.length === 0) {
      console.log('No unused columns found to remove.');
      return;
    }
    
    // Drop the existing unused columns
    for (const columnName of existingColumnNames) {
      console.log(`Dropping column: ${columnName}`);
      await client.query(`ALTER TABLE msa_analysis DROP COLUMN IF EXISTS ${columnName};`);
    }
    
    console.log(`Successfully removed ${existingColumnNames.length} unused columns from msa_analysis table`);
    
    // Verify the cleanup by showing remaining columns
    const remainingColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nRemaining columns in msa_analysis table:');
    remainingColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error cleaning up MSA unused fields:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupMsaUnusedFields();