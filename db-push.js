/**
 * Script to push schema directly to the database
 * 
 * This will use Drizzle's push method to directly create tables from our schema
 * Run with: node db-push.js
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from "./shared/schema.js";

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;
neonConfig.pipelinedConnections = false;

async function pushSchema() {
  console.log('Pushing schema to database...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Available (hidden)' : 'Not available');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  try {
    // Create a connection pool with limited size and retry logic
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 10000
    });

    console.log('Database pool created');
    
    // Create Drizzle instance
    const db = drizzle(pool, { schema });
    
    console.log('Running push operation to create tables...');
    
    // First check if we can connect
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Connected to database, current time:', result.rows[0].current_time);
    
    // Use drizzle-kit programmatically to push the schema
    await migrate(db, {
      migrationsFolder: './drizzle',
    });
    
    console.log('Schema successfully pushed to database');
    
    // Close the pool
    await pool.end();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  }
}

pushSchema().catch(console.error);