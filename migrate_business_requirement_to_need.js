/**
 * Script to rename business_requirement column to business_need for business_requirements table
 * 
 * This will rename the column and handle all data migration
 * Run with: node migrate_business_requirement_to_need.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function migrateBusinessRequirementToNeed() {
  console.log('Starting migration of business_requirement column to business_need...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if 'business_requirement' column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_requirements' AND column_name = 'business_requirement';
    `);

    if (checkResult.rows.length === 0) {
      console.log('business_requirement column does not exist, checking if business_need column exists...');
      
      // Check if 'business_need' column already exists
      const checkNeedResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'business_requirements' AND column_name = 'business_need';
      `);

      if (checkNeedResult.rows.length === 0) {
        console.log('Both business_requirement and business_need columns do not exist. Creating business_need column...');
        
        // Add 'business_need' column
        await pool.query(`
          ALTER TABLE business_requirements ADD COLUMN business_need text;
        `);
        console.log('Added business_need column to business_requirements table.');
      } else {
        console.log('business_need column already exists, no migration needed.');
      }
    } else {
      console.log('business_requirement column exists, starting migration...');
      
      // Begin transaction
      await pool.query('BEGIN');

      // Check if 'business_need' column already exists
      const checkNeedResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'business_requirements' AND column_name = 'business_need';
      `);

      if (checkNeedResult.rows.length === 0) {
        // Add 'business_need' column
        await pool.query(`
          ALTER TABLE business_requirements ADD COLUMN business_need text;
        `);
        console.log('Added business_need column to business_requirements table.');
        
        // Copy data from 'business_requirement' to 'business_need'
        await pool.query(`
          UPDATE business_requirements SET business_need = business_requirement;
        `);
        console.log('Copied data from business_requirement to business_need.');
      } else {
        console.log('business_need column already exists, only copying data if needed...');
        
        // Copy data from 'business_requirement' to 'business_need' where business_need is NULL or empty
        await pool.query(`
          UPDATE business_requirements 
          SET business_need = business_requirement 
          WHERE business_requirement IS NOT NULL AND (business_need IS NULL OR business_need = '');
        `);
        console.log('Copied data from business_requirement to business_need where needed.');
      }
      
      // Drop 'business_requirement' column
      await pool.query(`
        ALTER TABLE business_requirements DROP COLUMN business_requirement;
      `);
      console.log('Dropped business_requirement column.');
      
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
migrateBusinessRequirementToNeed()
  .then(() => console.log('Migration completed.'))
  .catch(err => console.error('Migration failed:', err));