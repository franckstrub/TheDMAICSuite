/**
 * Script to add gantt_view_mode column to projects table
 * 
 * This will add the necessary column to the projects table in the database
 * Run with: node add-gantt-view-mode.js
 */

import pkg from 'pg';
const { Pool } = pkg;

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addGanttViewModeColumn() {
  console.log("Starting migration to add gantt_view_mode column to projects table...");
  
  try {
    // Check if the column already exists
    const checkColumnSql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'gantt_view_mode';
    `;
    
    const checkResult = await pool.query(checkColumnSql);
    
    if (checkResult.rows.length > 0) {
      console.log("Column 'gantt_view_mode' already exists in projects table. No changes needed.");
      return;
    }
    
    // Add the gantt_view_mode column
    const addColumnSql = `
      ALTER TABLE projects 
      ADD COLUMN gantt_view_mode TEXT DEFAULT 'months';
    `;
    
    await pool.query(addColumnSql);
    console.log("Successfully added 'gantt_view_mode' column to projects table");
    
  } catch (error) {
    console.error("Error adding gantt_view_mode column:", error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the function
addGanttViewModeColumn()
  .then(() => console.log("Migration completed successfully"))
  .catch(error => {
    console.error("Migration failed:", error);
    process.exit(1);
  });