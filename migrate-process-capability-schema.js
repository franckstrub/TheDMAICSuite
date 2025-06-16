/**
 * Script to migrate process_capability table to support new CTQ analysis types
 * 
 * This will add all the new columns needed for both Continuous and Attribute CTQ analysis
 * Run with: node migrate-process-capability-schema.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateProcessCapabilitySchema() {
  const client = await pool.connect();
  
  try {
    console.log('Migrating process_capability table schema...');
    
    // First, check existing columns
    const existingColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'process_capability' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Existing columns:');
    existingColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Add new columns for enhanced process capability analysis
    const newColumns = [
      'ctq_type TEXT NOT NULL DEFAULT \'Continuous\'',
      'z_shift REAL DEFAULT 1.5',
      'data_set_term TEXT DEFAULT \'Long Term\'',
      'attribute_calculation_type TEXT',
      'total_units INTEGER',
      'defective_units INTEGER',
      'total_defects INTEGER',
      'opportunities INTEGER',
      'availability REAL',
      'performance REAL',
      'quality REAL',
      'oee_value REAL',
      'yield_step_1 REAL',
      'yield_step_2 REAL',
      'yield_step_3 REAL',
      'yield_step_4 REAL',
      'yield_step_5 REAL',
      'rolled_throughput_yield REAL'
    ];
    
    // Add each column if it doesn't exist
    for (const columnDef of newColumns) {
      const columnName = columnDef.split(' ')[0];
      
      const columnExists = existingColumns.rows.some(row => row.column_name === columnName);
      
      if (!columnExists) {
        console.log(`Adding column: ${columnName}`);
        await client.query(`ALTER TABLE process_capability ADD COLUMN ${columnDef};`);
      } else {
        console.log(`Column ${columnName} already exists, skipping`);
      }
    }
    
    // Update data types for existing columns to match new schema
    console.log('Updating existing column data types...');
    
    const dataTypeUpdates = [
      'ALTER TABLE process_capability ALTER COLUMN mean TYPE REAL USING mean::REAL',
      'ALTER TABLE process_capability ALTER COLUMN standard_deviation TYPE REAL USING standard_deviation::REAL',
      'ALTER TABLE process_capability ALTER COLUMN target TYPE REAL USING target::REAL',
      'ALTER TABLE process_capability ALTER COLUMN cp TYPE REAL USING cp::REAL',
      'ALTER TABLE process_capability ALTER COLUMN cpk TYPE REAL USING cpk::REAL',
      'ALTER TABLE process_capability ALTER COLUMN pp TYPE REAL USING pp::REAL',
      'ALTER TABLE process_capability ALTER COLUMN ppk TYPE REAL USING ppk::REAL',
      'ALTER TABLE process_capability ALTER COLUMN sigma TYPE REAL USING sigma::REAL',
      'ALTER TABLE process_capability ALTER COLUMN dpmo TYPE INTEGER USING dpmo::INTEGER',
      'ALTER TABLE process_capability ALTER COLUMN yield TYPE REAL USING yield::REAL'
    ];
    
    for (const updateQuery of dataTypeUpdates) {
      try {
        await client.query(updateQuery);
        console.log(`Updated: ${updateQuery.split(' ')[4]}`);
      } catch (error) {
        // Column might not exist or already be the correct type
        console.log(`Skipped update for ${updateQuery.split(' ')[4]}: ${error.message}`);
      }
    }
    
    // Rename 'yield' to 'process_yield' to avoid reserved word conflicts
    try {
      await client.query('ALTER TABLE process_capability RENAME COLUMN yield TO process_yield;');
      console.log('Renamed yield column to process_yield');
    } catch (error) {
      console.log('Column yield rename skipped:', error.message);
    }
    
    // Remove old unused columns
    const columnsToRemove = ['conclusion', 'action_plan'];
    for (const columnName of columnsToRemove) {
      try {
        await client.query(`ALTER TABLE process_capability DROP COLUMN IF EXISTS ${columnName};`);
        console.log(`Removed column: ${columnName}`);
      } catch (error) {
        console.log(`Failed to remove ${columnName}:`, error.message);
      }
    }
    
    console.log('Successfully migrated process_capability table schema');
    
    // Verify the final schema
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'process_capability' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nFinal table schema:');
    finalColumns.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error migrating process capability schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateProcessCapabilitySchema();