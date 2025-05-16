/**
 * Database setup script to create all tables defined in the schema
 * This script will initialize the database with the necessary tables
 * Run with: node setup-database.js
 */

import { db, pool } from './server/db.js';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'migrations', 'meta', '_journal.json');
    
    // Check if migrations directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'migrations'))) {
      console.log('Migrations directory not found, creating it...');
      fs.mkdirSync(path.join(process.cwd(), 'migrations'));
      fs.mkdirSync(path.join(process.cwd(), 'migrations', 'meta'));
    }

    // Generate the schema SQL
    console.log('Generating schema SQL...');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    
    // Run the migrations
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

// Run the setup function
setupDatabase();