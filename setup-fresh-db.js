/**
 * Script to create a fresh database with the same structure
 * 
 * This script will create all the tables defined in the schema
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

// Database connection string for Neon PostgreSQL
const DATABASE_URL = 'postgresql://neondb_owner:npg_1OteSyUrukD9@ep-jolly-union-a4anqqse.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Create a SQL client for Neon
const sql = neon(DATABASE_URL);

// Delay between queries to avoid rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function setupFreshDatabase() {
  console.log('Setting up fresh database...');
  
  try {
    // First check if we can connect to the database
    console.log('Checking database connection...');
    const result = await sql`SELECT NOW() as current_time`;
    console.log(`Database connection successful! Current time: ${result[0].current_time}`);
    
    // Core tables needed for the application
    const tables = [
      // Users table
      {
        name: 'users',
        query: `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          last_login TIMESTAMP
        )`
      },
      // Projects table
      {
        name: 'projects',
        query: `CREATE TABLE IF NOT EXISTS projects (
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
        )`
      },
      // Project charters table
      {
        name: 'project_charters',
        query: `CREATE TABLE IF NOT EXISTS project_charters (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL UNIQUE,
          project_type TEXT,
          project_category TEXT,
          start_date DATE,
          target_end_date DATE,
          last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
          problem_statement TEXT,
          goal_statement TEXT,
          business_case TEXT,
          scope TEXT,
          stakeholders JSONB DEFAULT '[]',
          team_members JSONB DEFAULT '[]',
          financial_benefits JSONB,
          operational_benefits JSONB,
          quality_benefits JSONB,
          customer_benefits JSONB,
          soft_benefits JSONB
        )`
      },
      // SIPOC diagrams table
      {
        name: 'sipoc_diagrams',
        query: `CREATE TABLE IF NOT EXISTS sipoc_diagrams (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL UNIQUE,
          last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
          process_name TEXT,
          suppliers TEXT,
          inputs TEXT,
          process TEXT,
          outputs TEXT,
          customers TEXT
        )`
      },
      // Customer requirements table
      {
        name: 'customer_requirements',
        query: `CREATE TABLE IF NOT EXISTS customer_requirements (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          requirement TEXT NOT NULL,
          customer_requirement TEXT,
          importance INTEGER NOT NULL,
          cts TEXT NOT NULL,
          ctq TEXT,
          last_updated TIMESTAMP NOT NULL DEFAULT NOW()
        )`
      },
      // Business requirements table
      {
        name: 'business_requirements',
        query: `CREATE TABLE IF NOT EXISTS business_requirements (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL,
          requirement TEXT NOT NULL,
          importance INTEGER NOT NULL,
          business_need TEXT,
          impact TEXT NOT NULL,
          last_updated TIMESTAMP NOT NULL DEFAULT NOW()
        )`
      },
      // Activity logs table
      {
        name: 'activity_logs',
        query: `CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          project_id INTEGER,
          details TEXT,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )`
      },
      // Default admin user
      {
        name: 'default_admin',
        query: `INSERT INTO users (username, password, full_name, role) 
                VALUES ('admin', 'admin123', 'Admin User', 'admin')
                ON CONFLICT (username) DO NOTHING`
      }
    ];
    
    // Create all tables with delay between each to avoid rate limiting
    for (const table of tables) {
      try {
        console.log(`Creating ${table.name}...`);
        await sql.raw(table.query);
        console.log(`${table.name} created successfully`);
        
        // Wait a bit between table creations to avoid rate limiting
        await delay(1000);
      } catch (error) {
        console.error(`Error creating ${table.name}:`, error);
      }
    }
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupFreshDatabase().catch(console.error);