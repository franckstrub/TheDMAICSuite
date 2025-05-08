/**
 * Script to clean up risk assessment data for a specific project
 * 
 * This will delete old risk assessment records and create a fresh start
 * Run with: node clean-risk-assessment.js <projectId>
 */

import { Pool } from '@neondatabase/serverless';
import { createRequire } from 'module';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config?.();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanRiskAssessment() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a project ID');
    console.error('Usage: node clean-risk-assessment.js <projectId>');
    process.exit(1);
  }

  const projectId = parseInt(args[0], 10);
  if (isNaN(projectId)) {
    console.error('Project ID must be a number');
    process.exit(1);
  }

  try {
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if the project exists
      const projectCheck = await client.query(
        'SELECT id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (projectCheck.rows.length === 0) {
        console.error(`Project with ID ${projectId} doesn't exist`);
        await client.query('ROLLBACK');
        process.exit(1);
      }

      // Delete all risk assessments for this project
      const deleteResult = await client.query(
        'DELETE FROM project_risks WHERE project_id = $1 RETURNING id',
        [projectId]
      );
      
      const deletedCount = deleteResult.rows.length;
      console.log(`Deleted ${deletedCount} risk assessment record(s) for project ${projectId}`);
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Database cleanup completed successfully.');
      console.log('You can now create a new risk assessment with clean data.');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cleaning risk assessment data:', error);
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup function
cleanRiskAssessment().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});