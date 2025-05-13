/**
 * Script to add file attachment columns to gate_review_deliverables table
 * 
 * This will add the necessary columns to the gate_review_deliverables table in the database
 * Run with: node add-file-attachment-fields.js
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Create a connection pool to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function addFileAttachmentColumns() {
  console.log("Starting migration to add file attachment columns to gate_review_deliverables table...");
  
  try {
    // Execute raw SQL to add the new columns
    await db.execute(`
      ALTER TABLE gate_review_deliverables
      ADD COLUMN IF NOT EXISTS file_attachment TEXT,
      ADD COLUMN IF NOT EXISTS file_original_name TEXT,
      ADD COLUMN IF NOT EXISTS file_size INTEGER,
      ADD COLUMN IF NOT EXISTS file_type TEXT;
    `);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addFileAttachmentColumns();