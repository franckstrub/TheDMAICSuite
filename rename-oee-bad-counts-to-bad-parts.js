/**
 * Script to rename oee_bad_counts column to oee_bad_parts in process_capability table
 * 
 * This will rename the column to match the updated schema
 * Run with: node rename-oee-bad-counts-to-bad-parts.js
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function renameOeeBadCountsColumn() {
  try {
    console.log('Starting OEE bad counts column rename...');

    // Check if oee_bad_counts column exists
    const checkBadCounts = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'process_capability' 
      AND column_name = 'oee_bad_counts'
    `);

    if (checkBadCounts.rows.length > 0) {
      console.log('Renaming oee_bad_counts column to oee_bad_parts...');
      await pool.query(`
        ALTER TABLE process_capability 
        RENAME COLUMN oee_bad_counts TO oee_bad_parts
      `);
      console.log('✓ oee_bad_counts column renamed to oee_bad_parts');
    } else {
      // Check if oee_bad_parts already exists
      const checkBadParts = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'process_capability' 
        AND column_name = 'oee_bad_parts'
      `);

      if (checkBadParts.rows.length === 0) {
        console.log('Neither oee_bad_counts nor oee_bad_parts exists, adding oee_bad_parts...');
        await pool.query(`
          ALTER TABLE process_capability 
          ADD COLUMN oee_bad_parts INTEGER
        `);
        console.log('✓ oee_bad_parts column added');
      } else {
        console.log('oee_bad_parts column already exists');
      }
    }

    console.log('OEE bad counts column rename completed successfully');
  } catch (error) {
    console.error('Error renaming OEE bad counts column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

renameOeeBadCountsColumn().catch(console.error);