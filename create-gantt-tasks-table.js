/**
 * Script to create gantt_tasks table in the database
 * 
 * This will add the gantt_tasks table to the database
 * Run with: node create-gantt-tasks-table.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();

const { Pool } = pg;

async function createGanttTasksTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Creating gantt_tasks table...');
    
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gantt_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL, 
        progress INTEGER NOT NULL DEFAULT 0,
        dependencies TEXT,
        assignee TEXT,
        priority TEXT DEFAULT 'medium',
        phase TEXT NOT NULL,
        status TEXT DEFAULT 'not-started',
        parent_id INTEGER,
        sequence INTEGER DEFAULT 0,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('gantt_tasks table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating gantt_tasks table:', error);
    return false;
  } finally {
    await pool.end();
  }
}

createGanttTasksTable().then(success => {
  if (success) {
    console.log('Migration completed successfully');
    process.exit(0);
  } else {
    console.error('Migration failed');
    process.exit(1);
  }
});