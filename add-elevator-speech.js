/**
 * Script to add elevator_speech column to projects table
 * 
 * This will add the necessary column to the projects table in the database
 * Run with: node add-elevator-speech.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pgOptions = {
  connectionString: process.env.DATABASE_URL
};

async function addElevatorSpeechColumn() {
  const pool = new Pool(pgOptions);
  
  try {
    console.log('Beginning database migration - adding elevator_speech column to projects table');
    
    // Check if the column already exists
    const checkColumnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'elevator_speech'
    `);
    
    if (checkColumnExists.rows.length === 0) {
      // Column doesn't exist, add it
      await pool.query(`
        ALTER TABLE projects 
        ADD COLUMN elevator_speech TEXT
      `);
      console.log('Successfully added elevator_speech column to projects table');
    } else {
      console.log('Column elevator_speech already exists in projects table');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addElevatorSpeechColumn();