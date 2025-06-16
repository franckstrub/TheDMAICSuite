/**
 * Script to remove control_chart_type and action_plan columns from process_capability table
 * 
 * This will remove the unnecessary columns from the process_capability table in the database
 * Run with: node remove-control-chart-action-plan.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function removeColumns() {
  try {
    console.log('Removing control_chart_type and action_plan columns from process_capability table...');
    
    // Drop the columns
    await sql`
      ALTER TABLE process_capability 
      DROP COLUMN IF EXISTS control_chart_type,
      DROP COLUMN IF EXISTS action_plan;
    `;
    
    console.log('✓ Successfully removed control_chart_type and action_plan columns');
    
  } catch (error) {
    console.error('Error removing columns:', error);
    process.exit(1);
  }
}

removeColumns();