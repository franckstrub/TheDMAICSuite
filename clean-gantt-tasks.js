/**
 * Script to clean up Gantt tasks for a specific project
 * 
 * This will delete all Gantt tasks for the specified project to test auto-generation
 * Run with: node clean-gantt-tasks.js <projectId>
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function cleanGanttTasks() {
  const client = await pool.connect();
  try {
    // Get the project ID from command line args
    const projectId = process.argv[2];
    
    if (!projectId || isNaN(parseInt(projectId))) {
      console.error('Please provide a valid project ID as argument');
      process.exit(1);
    }

    // Delete all Gantt tasks for the project
    const result = await client.query(
      'DELETE FROM gantt_tasks WHERE project_id = $1 RETURNING id',
      [projectId]
    );

    console.log(`Deleted ${result.rows.length} Gantt tasks for project ${projectId}`);
    
    // Verify no tasks remain
    const verifyResult = await client.query(
      'SELECT COUNT(*) FROM gantt_tasks WHERE project_id = $1',
      [projectId]
    );
    
    console.log(`Project ${projectId} now has ${verifyResult.rows[0].count} Gantt tasks`);
  } catch (error) {
    console.error('Error cleaning Gantt tasks:', error);
  } finally {
    client.release();
    pool.end();
  }
}

cleanGanttTasks().catch(console.error);