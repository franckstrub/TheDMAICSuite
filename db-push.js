/**
 * Script to push schema directly to the database
 * 
 * This will use Drizzle's push method to directly create tables from our schema
 * Run with: node db-push.js
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './shared/schema.js';

async function pushSchema() {
  console.log('Connecting to database...');
  
  try {
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
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
    
    // Create customer_requirements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        requirement TEXT NOT NULL,
        customer_requirement TEXT,
        importance INTEGER NOT NULL,
        "CTS" TEXT NOT NULL DEFAULT '',
        ctq TEXT DEFAULT '',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create sipoc_diagrams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sipoc_diagrams (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        process_name TEXT,
        suppliers TEXT,
        inputs TEXT,
        process TEXT,
        outputs TEXT,
        customers TEXT,
        suppliers2 TEXT,
        inputs2 TEXT,
        process2 TEXT,
        outputs2 TEXT,
        customers2 TEXT,
        suppliers3 TEXT,
        inputs3 TEXT,
        process3 TEXT,
        outputs3 TEXT,
        customers3 TEXT,
        suppliers4 TEXT,
        inputs4 TEXT,
        process4 TEXT,
        outputs4 TEXT,
        customers4 TEXT,
        suppliers5 TEXT,
        inputs5 TEXT,
        process5 TEXT,
        outputs5 TEXT,
        customers5 TEXT,
        suppliers6 TEXT,
        inputs6 TEXT,
        process6 TEXT,
        outputs6 TEXT,
        customers6 TEXT,
        suppliers7 TEXT,
        inputs7 TEXT,
        process7 TEXT,
        outputs7 TEXT,
        customers7 TEXT,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create business_requirements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_requirements (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        requirement TEXT NOT NULL,
        business_need TEXT,
        importance INTEGER NOT NULL,
        impact TEXT NOT NULL DEFAULT '',
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create datasets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_id INTEGER,
        records INTEGER NOT NULL DEFAULT 0,
        variables INTEGER NOT NULL DEFAULT 0,
        storage_type TEXT NOT NULL,
        storage_location TEXT,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by INTEGER NOT NULL
      )
    `);
    
    // Create data_collection_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_collection_plans (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        metric TEXT NOT NULL,
        operational_definition TEXT,
        data_type TEXT,
        collection_method TEXT,
        sample_size TEXT,
        responsible TEXT,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create storage_configs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storage_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        cloud_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        cloud_region TEXT,
        cloud_retention TEXT,
        cloud_encryption BOOLEAN,
        server_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        server_address TEXT,
        server_port TEXT,
        server_db_type TEXT,
        server_auth_type TEXT,
        local_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        local_directory TEXT,
        local_format TEXT,
        local_backups BOOLEAN,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create project_raci_matrix table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_raci_matrix (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        raci_data JSONB NOT NULL,
        last_updated TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create activity_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        project_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create process_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS process_data (
        id SERIAL PRIMARY KEY,
        dataset_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create more tables as needed...
    
    console.log('All tables created successfully!');
    
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

// Run the schema push
pushSchema();