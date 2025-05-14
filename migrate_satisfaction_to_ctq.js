/**
 * Script to rename satisfaction column to ctq for customer_requirements table
 * 
 * This will rename the satisfaction column to ctq and handle all data migration
 * Run with: node migrate_satisfaction_to_ctq.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function migrateSatisfactionToCtq() {
  console.log('Starting migration of satisfaction column to ctq...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if 'satisfaction' column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customer_requirements' AND column_name = 'satisfaction';
    `);

    if (checkResult.rows.length === 0) {
      console.log('Satisfaction column does not exist, checking if ctq column exists...');
      
      // Check if 'ctq' column already exists
      const checkCtqResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'customer_requirements' AND column_name = 'ctq';
      `);

      if (checkCtqResult.rows.length === 0) {
        console.log('Both satisfaction and ctq columns do not exist. Creating ctq column...');
        
        // Add 'ctq' column
        await pool.query(`
          ALTER TABLE customer_requirements ADD COLUMN ctq text DEFAULT '';
        `);
        console.log('Added ctq column to customer_requirements table.');
      } else {
        console.log('CTQ column already exists, no migration needed.');
      }
    } else {
      console.log('Satisfaction column exists, starting migration...');
      
      // Begin transaction
      await pool.query('BEGIN');

      // Check if 'ctq' column already exists
      const checkCtqResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'customer_requirements' AND column_name = 'ctq';
      `);

      if (checkCtqResult.rows.length === 0) {
        // Add 'ctq' column
        await pool.query(`
          ALTER TABLE customer_requirements ADD COLUMN ctq text DEFAULT '';
        `);
        console.log('Added ctq column to customer_requirements table.');
        
        // Copy data from 'satisfaction' to 'ctq'
        await pool.query(`
          UPDATE customer_requirements SET ctq = satisfaction::text WHERE satisfaction IS NOT NULL;
        `);
        console.log('Copied data from satisfaction to ctq.');
      } else {
        console.log('CTQ column already exists, only copying data if needed...');
        
        // Copy data from 'satisfaction' to 'ctq' where ctq is NULL or empty
        await pool.query(`
          UPDATE customer_requirements 
          SET ctq = satisfaction::text 
          WHERE satisfaction IS NOT NULL AND (ctq IS NULL OR ctq = '');
        `);
        console.log('Copied data from satisfaction to ctq where needed.');
      }
      
      // Drop 'satisfaction' column
      await pool.query(`
        ALTER TABLE customer_requirements DROP COLUMN satisfaction;
      `);
      console.log('Dropped satisfaction column.');
      
      // Commit transaction
      await pool.query('COMMIT');
      console.log('Migration transaction committed successfully.');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    // Rollback transaction in case of error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateSatisfactionToCtq()
  .then(() => console.log('Migration completed.'))
  .catch(err => console.error('Migration failed:', err));