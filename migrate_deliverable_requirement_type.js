/**
 * Script to migrate is_required from boolean to text type for gate_review_deliverables table
 * 
 * This script updates the is_required column to use the new DeliverableRequirementType enum
 * Run with: node migrate_deliverable_requirement_type.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function migrateDeliverableRequirementType() {
  console.log('Starting migration of deliverable requirement type...');
  
  // Create a PostgreSQL client from DATABASE_URL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // First verify if column exists and is a boolean
    const checkColumnQuery = `
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gate_review_deliverables' 
        AND column_name = 'is_required'
    `;
    
    const checkResult = await client.query(checkColumnQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('Column is_required does not exist in gate_review_deliverables table.');
      return;
    }
    
    const dataType = checkResult.rows[0].data_type;
    
    if (dataType !== 'boolean') {
      console.log(`Column is_required is already of type ${dataType}, not boolean. No migration needed.`);
      return;
    }
    
    console.log('Creating temporary column...');
    
    // Add a temporary column to hold the new text values
    await client.query(`
      ALTER TABLE gate_review_deliverables 
      ADD COLUMN is_required_text TEXT
    `);
    
    // Migrate data from boolean to text
    console.log('Migrating data from boolean to text...');
    await client.query(`
      UPDATE gate_review_deliverables 
      SET is_required_text = 
        CASE 
          WHEN is_required = TRUE THEN 'Required'
          ELSE 'Optional'
        END
    `);
    
    // Drop the old column
    console.log('Dropping old boolean column...');
    await client.query(`
      ALTER TABLE gate_review_deliverables 
      DROP COLUMN is_required
    `);
    
    // Rename the new column to the original name
    console.log('Renaming new column to original name...');
    await client.query(`
      ALTER TABLE gate_review_deliverables 
      RENAME COLUMN is_required_text TO is_required
    `);
    
    // Set not null constraint and default value
    console.log('Setting constraints on new column...');
    await client.query(`
      ALTER TABLE gate_review_deliverables 
      ALTER COLUMN is_required SET NOT NULL,
      ALTER COLUMN is_required SET DEFAULT 'Required'
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
  } finally {
    // Release the client
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateDeliverableRequirementType()
  .then(() => console.log('Migration completed.'))
  .catch(err => console.error('Migration failed:', err));