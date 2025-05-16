/**
 * Script to create database tables
 * 
 * This script uses direct SQL queries to create the tables needed for the application
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  console.log('Connecting to database...');
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('Creating database tables...');
    
    // First, try to create the users table
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
    
    // Create project_charters table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_charters (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        project_title TEXT,
        project_reference_number TEXT,
        project_leader TEXT,
        sponsor TEXT,
        sponsor_function TEXT,
        stakeholders JSONB,
        team_members JSONB,
        stakeholder TEXT,
        stakeholder_function TEXT,
        financial_controller TEXT,
        project_coach TEXT,
        belt_level TEXT,
        coach_belt_level TEXT,
        project_type TEXT,
        project_category TEXT,
        business_case TEXT,
        problem_statement TEXT,
        goals TEXT,
        scope TEXT,
        project_image TEXT,
        start_date TEXT,
        target_end_date TEXT,
        savings_per_year TEXT,
        working_capital_gains TEXT,
        wacc_percentage TEXT,
        financial_savings TEXT,
        fte_benefits TEXT,
        fte_working_days_per_year TEXT,
        fte_working_hours_per_day TEXT,
        fte_time_unit TEXT,
        fte_saved_hours TEXT,
        fte_cost_per_year TEXT,
        fte_calculated_value TEXT,
        soft_benefits TEXT,
        kick_off_date TEXT,
        define_phase_date TEXT,
        measure_phase_date TEXT,
        analyze_phase_date TEXT,
        improve_phase_date TEXT,
        control_phase_date TEXT,
        one_off_people_cost TEXT,
        one_off_technology_cost TEXT,
        one_off_other_cost TEXT,
        one_off_other_explanation TEXT,
        opex_people_cost TEXT,
        opex_technology_cost TEXT,
        opex_other_cost TEXT,
        opex_other_explanation TEXT,
        opex_period TEXT,
        capex_cost TEXT,
        capex_explanation TEXT,
        total_financial_savings TEXT,
        total_project_costs TEXT,
        project_net_value TEXT,
        roi TEXT,
        breakeven TEXT,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Add a default user for testing
    await pool.query(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('admin', 'password123', 'Admin User', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);
    
    console.log('Database setup completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Run the setup function
setupDatabase();