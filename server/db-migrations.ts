import { db } from "./db";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  console.log("Running database migrations...");
  
  try {
    // Check if sessions table exists
    const sessionsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      );
    `);
    
    if (!sessionsTableExists.rows[0].exists) {
      console.log("Creating sessions table...");
      await db.execute(sql`
        CREATE TABLE sessions (
          sid VARCHAR(255) PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX IDX_session_expire ON sessions (expire);
      `);
      console.log("Sessions table created successfully");
    } else {
      console.log("Sessions table already exists");
    }
    
    // Check if users table needs migration
    const emailColumnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
      );
    `);
    
    if (!emailColumnExists.rows[0].exists) {
      console.log("Migrating users table...");
      
      // Add new columns needed for Replit Auth
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      
      // Convert id column from serial to text
      // This is a bit tricky and requires preserving existing data
      console.log("Converting user IDs from serial to text for Replit Auth...");
      
      // First create a temporary id column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN temp_id TEXT;
      `);
      
      // Copy existing IDs as text into temp_id
      await db.execute(sql`
        UPDATE users
        SET temp_id = id::TEXT;
      `);
      
      // Create new projects table with string createdBy reference
      console.log("Creating temporary projects table with string ID references...");
      await db.execute(sql`
        CREATE TABLE temp_projects AS
        SELECT * FROM projects;
        
        ALTER TABLE temp_projects
        ADD COLUMN creator_id TEXT;
        
        UPDATE temp_projects
        SET creator_id = created_by::TEXT;
      `);
      
      // Create new users table with text primary key
      console.log("Creating new users table with text primary key...");
      await db.execute(sql`
        CREATE TABLE new_users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          password TEXT,
          full_name TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          last_login TIMESTAMP,
          email TEXT UNIQUE,
          first_name TEXT,
          last_name TEXT,
          profile_image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Copy data to new users table
      await db.execute(sql`
        INSERT INTO new_users (id, username, password, full_name, role, last_login)
        SELECT temp_id, username, password, full_name, role, last_login
        FROM users;
      `);
      
      // Update references in tables
      console.log("Updating references to user IDs in related tables...");
      
      // Backup projects table
      await db.execute(sql`
        DROP TABLE IF EXISTS projects_backup;
        CREATE TABLE projects_backup AS SELECT * FROM projects;
      `);
      
      // Drop projects table
      await db.execute(sql`
        DROP TABLE projects;
      `);
      
      // Create new projects table with TEXT created_by
      await db.execute(sql`
        CREATE TABLE projects (
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
          created_by TEXT NOT NULL,
          last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          benefits JSONB,
          costs JSONB,
          soft_benefits JSONB,
          elevator_speech TEXT,
          gantt_view_mode TEXT DEFAULT 'months'
        );
      `);
      
      // Copy data to new projects table
      await db.execute(sql`
        INSERT INTO projects (
          id, title, description, project_type, project_category, 
          current_phase, status, progress, start_date, target_end_date,
          actual_end_date, created_by, last_updated, benefits, costs,
          soft_benefits, elevator_speech, gantt_view_mode
        )
        SELECT 
          id, title, description, project_type, project_category,
          current_phase, status, progress, start_date, target_end_date,
          actual_end_date, creator_id, last_updated, benefits, costs,
          soft_benefits, elevator_speech, gantt_view_mode
        FROM temp_projects;
      `);
      
      // Drop temp tables
      await db.execute(sql`
        DROP TABLE users;
        ALTER TABLE new_users RENAME TO users;
        DROP TABLE temp_projects;
      `);
      
      console.log("Users table migration completed successfully");
    } else {
      console.log("Users table already has the necessary columns for Replit Auth");
    }
    
    console.log("All migrations completed successfully!");
  } catch (error) {
    console.error("Error during migrations:", error);
    throw error;
  }
}