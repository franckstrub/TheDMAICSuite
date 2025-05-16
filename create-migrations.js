/**
 * Script to generate database migrations for our schema
 * 
 * This script will create the migrations necessary for Drizzle to set up all database tables
 * Run with: node create-migrations.js
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function generateMigrations() {
  try {
    console.log('Generating database migrations...');
    
    // First, generate the migration SQL files
    await execPromise('npx drizzle-kit generate:pg');
    console.log('Migration files generated successfully');
    
    // Then, apply the migrations to the database
    console.log('Applying migrations to database...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations applied successfully!');
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error during migration process:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('Database connection closed');
  }
}

// Run the migration generator
generateMigrations();