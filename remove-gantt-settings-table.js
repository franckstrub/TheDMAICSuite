/**
 * Script to remove gantt_settings table from the database
 * 
 * This table is unused and should be removed
 * Run with: node remove-gantt-settings-table.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();

const { Pool } = pg;

async function removeGanttSettingsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Removing gantt_settings table...');
    
    // Drop the table if it exists
    await pool.query(`DROP TABLE IF EXISTS gantt_settings`);

    console.log('gantt_settings table removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing gantt_settings table:', error);
    return false;
  } finally {
    await pool.end();
  }
}

removeGanttSettingsTable().then(success => {
  if (success) {
    console.log('Table removal completed successfully');
    process.exit(0);
  } else {
    console.error('Table removal failed');
    process.exit(1);
  }
});