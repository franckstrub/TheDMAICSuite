/**
 * Script to add comments column to gantt_tasks table
 * 
 * This will add the necessary column to the gantt_tasks table in the database
 * Run with: node add-comments-to-gantt-tasks.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function addCommentsColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Adding comments column to gantt_tasks table...');
    
    // Add the comments column
    await pool.query(`
      ALTER TABLE gantt_tasks 
      ADD COLUMN IF NOT EXISTS comments TEXT;
    `);

    console.log('Comments column added successfully to gantt_tasks table');
    return true;
  } catch (error) {
    console.error('Error adding comments column:', error);
    return false;
  } finally {
    await pool.end();
  }
}

addCommentsColumn().then(success => {
  if (success) {
    console.log('Migration completed successfully');
    process.exit(0);
  } else {
    console.error('Migration failed');
    process.exit(1);
  }
});