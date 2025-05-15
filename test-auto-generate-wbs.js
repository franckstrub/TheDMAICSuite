/**
 * Script to test automatic DMAIC WBS generation
 * 
 * This script will:
 * 1. Clean up any existing Gantt tasks for project 2
 * 2. Request the Gantt tasks for project 2, which should trigger auto-generation
 * 3. Verify that tasks were created
 * 
 * Run with: node test-auto-generate-wbs.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const { Pool } = pg;
dotenv.config();

// Define the test project ID
const TEST_PROJECT_ID = 2;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const testAutoGenerateWbs = async () => {
  const client = await pool.connect();
  try {
    console.log(`\n--- Starting auto-generate WBS test for project ID ${TEST_PROJECT_ID} ---\n`);
    
    // Step 1: Clean up existing tasks
    console.log('Step 1: Cleaning up existing tasks...');
    const deleteResult = await client.query(
      'DELETE FROM gantt_tasks WHERE project_id = $1 RETURNING id',
      [TEST_PROJECT_ID]
    );
    console.log(`Deleted ${deleteResult.rows.length} existing Gantt tasks`);
    
    // Verify no tasks remain
    const verifyEmptyResult = await client.query(
      'SELECT COUNT(*) FROM gantt_tasks WHERE project_id = $1',
      [TEST_PROJECT_ID]
    );
    console.log(`Project now has ${verifyEmptyResult.rows[0].count} Gantt tasks`);
    
    if (verifyEmptyResult.rows[0].count !== '0') {
      console.error(`ERROR: Failed to clean up tasks`);
      return;
    }
    
    // Step 2: Request tasks from API to trigger auto-generation
    console.log('\nStep 2: Requesting Gantt tasks to trigger auto-generation...');
    const response = await fetch(`http://localhost:5000/api/projects/${TEST_PROJECT_ID}/gantt-tasks`);
    const data = await response.json();
    
    console.log(`API response status: ${response.status}`);
    console.log(`Number of tasks returned: ${data.tasks ? data.tasks.length : 0}`);
    
    // Step 3: Verify tasks were created in the database
    console.log('\nStep 3: Verifying tasks were created in the database...');
    const verifyResult = await client.query(
      'SELECT id, name, phase, dependencies FROM gantt_tasks WHERE project_id = $1 ORDER BY sequence',
      [TEST_PROJECT_ID]
    );
    
    console.log(`Database now has ${verifyResult.rows.length} Gantt tasks for project ${TEST_PROJECT_ID}`);
    
    if (verifyResult.rows.length > 0) {
      console.log('\nGenerated tasks:');
      verifyResult.rows.forEach(task => {
        console.log(`- ${task.name} (Phase: ${task.phase}, Dependencies: ${task.dependencies || 'None'})`);
      });
      console.log('\n✅ TEST PASSED: Auto-generation of DMAIC WBS tasks successful!');
    } else {
      console.log('\n❌ TEST FAILED: No tasks were generated');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    client.release();
    pool.end();
  }
};

// Execute the test
testAutoGenerateWbs().catch(console.error);