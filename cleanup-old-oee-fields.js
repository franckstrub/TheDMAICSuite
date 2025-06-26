/**
 * Script to remove old unused OEE fields and add oee_bad_counts field
 * 
 * This will:
 * 1. Remove old OEE fields: oee_availability, oee_performance, oee_quality
 * 2. Add new oee_bad_counts field
 * 
 * Run with: node cleanup-old-oee-fields.js
 */

import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

async function cleanupOeeFields() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('Removing old unused OEE fields from process_capability table...');
    
    // Remove old OEE fields and add bad counts field
    const cleanupQuery = `
      ALTER TABLE process_capability 
      DROP COLUMN IF EXISTS oee_availability,
      DROP COLUMN IF EXISTS oee_performance,
      DROP COLUMN IF EXISTS oee_quality,
      ADD COLUMN IF NOT EXISTS oee_bad_counts INTEGER;
    `;
    
    await client.query(cleanupQuery);
    console.log('Successfully removed old OEE fields and added oee_bad_counts field');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error cleaning up OEE fields:', error);
    process.exit(1);
  }
}

cleanupOeeFields();