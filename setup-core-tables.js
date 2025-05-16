/**
 * Script to create the core database tables needed to run the application
 */

import { Pool } from 'pg';

async function setupCoreTables() {
  console.log('Connecting to database...');
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('Creating core database tables...');
    
    // Create the users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        last_login TIMESTAMP
      )
    `);
    console.log('Created users table');
    
    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        project_type TEXT DEFAULT 'Green Belt',
        project_category TEXT DEFAULT 'Process Improvement',
        current_phase TEXT NOT NULL DEFAULT 'define',
        status TEXT NOT NULL DEFAULT 'active',
        progress INTEGER NOT NULL DEFAULT 0,
        start_date DATE,
        target_end_date DATE,
        actual_end_date DATE,
        created_by INTEGER NOT NULL,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
        benefits JSONB,
        costs JSONB,
        soft_benefits JSONB,
        elevator_speech TEXT,
        gantt_view_mode TEXT DEFAULT 'months'
      )
    `);
    console.log('Created projects table');
    
    // Create a sample user
    await pool.query(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('admin', 'password123', 'Admin User', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('Created sample admin user');
    
    console.log('Core database tables created successfully');
    await pool.end();
  } catch (error) {
    console.error('Error setting up core tables:', error);
  }
}

// Run the setup function
setupCoreTables();