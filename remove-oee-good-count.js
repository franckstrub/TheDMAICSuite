/**
 * Script to remove oee_good_count column from process_capability table
 * 
 * This will only remove the oee_good_count column since oee_bad_parts already exists
 * 
 * Run with: node remove-oee-good-count.js
 */

const { neonConfig, Pool } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateOeeFields() {
  try {
    console.log('Starting OEE fields update...');

    // Check if oee_good_count column exists
    const checkGoodCount = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'process_capability' 
      AND column_name = 'oee_good_count'
    `);

    if (checkGoodCount.rows.length > 0) {
      console.log('Removing oee_good_count column...');
      await pool.query(`
        ALTER TABLE process_capability 
        DROP COLUMN IF EXISTS oee_good_count
      `);
      console.log('✓ oee_good_count column removed');
    } else {
      console.log('oee_good_count column does not exist, skipping removal');
    }

    console.log('OEE fields update completed successfully');
  } catch (error) {
    console.error('Error updating OEE fields:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateOeeFields().catch(console.error);