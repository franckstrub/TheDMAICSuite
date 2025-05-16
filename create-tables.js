/**
 * Script to create essential database tables
 */

import { Pool } from 'pg';

async function createTables() {
  console.log('Creating essential tables...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
  
  try {
    // Create users table
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
    
    // Create admin user
    await pool.query(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('admin', 'password123', 'Admin User', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('Created admin user');
    
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
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createTables().catch(console.error);