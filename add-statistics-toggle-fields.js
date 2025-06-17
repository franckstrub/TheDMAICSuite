/**
 * Script to add show_statistics columns to process_capability and msa_analysis tables
 * 
 * This will add the necessary columns to save the statistics toggle states
 * Run with: node add-statistics-toggle-fields.js
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function addStatisticsToggleFields() {
  try {
    console.log('Adding show_statistics columns to process_capability and msa_analysis tables...');
    
    // Add show_statistics column to process_capability table
    await sql`
      ALTER TABLE process_capability 
      ADD COLUMN IF NOT EXISTS show_statistics BOOLEAN DEFAULT FALSE;
    `;
    console.log('✓ Added show_statistics column to process_capability table');
    
    // Add show_statistics column to msa_analysis table
    await sql`
      ALTER TABLE msa_analysis 
      ADD COLUMN IF NOT EXISTS show_statistics BOOLEAN DEFAULT FALSE;
    `;
    console.log('✓ Added show_statistics column to msa_analysis table');
    
    console.log('✓ Successfully added statistics toggle fields to both tables');
    
  } catch (error) {
    console.error('Error adding statistics toggle fields:', error);
    process.exit(1);
  }
}

addStatisticsToggleFields()
  .then(() => {
    console.log('Statistics toggle fields migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });