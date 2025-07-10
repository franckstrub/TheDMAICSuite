/**
 * Script to update one_sample_hypothesis_config table schema
 * 
 * This will:
 * 1. Rename 'alternative' column to 'alternativemean'
 * 2. Add 'alternativevariance' column
 * 3. Add 'alternativemedian' column
 * 
 * Run with: node update-one-sample-hypothesis-schema.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function updateOneSampleHypothesisSchema() {
  try {
    console.log('Updating one_sample_hypothesis_config table schema...');
    
    // Check if the old 'alternative' column exists
    const checkOldColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'one_sample_hypothesis_config' 
      AND column_name = 'alternative'
    `);
    
    if (checkOldColumn.length > 0) {
      console.log('Renaming alternative column to alternativemean...');
      await db.execute(sql`
        ALTER TABLE one_sample_hypothesis_config 
        RENAME COLUMN alternative TO alternativemean
      `);
      console.log('✅ Column renamed successfully');
    }
    
    // Check if alternativevariance column exists
    const checkVarianceColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'one_sample_hypothesis_config' 
      AND column_name = 'alternativevariance'
    `);
    
    if (checkVarianceColumn.length === 0) {
      console.log('Adding alternativevariance column...');
      await db.execute(sql`
        ALTER TABLE one_sample_hypothesis_config 
        ADD COLUMN alternativevariance TEXT DEFAULT 'Less than'
      `);
      console.log('✅ alternativevariance column added successfully');
    }
    
    // Check if alternativemedian column exists
    const checkMedianColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'one_sample_hypothesis_config' 
      AND column_name = 'alternativemedian'
    `);
    
    if (checkMedianColumn.length === 0) {
      console.log('Adding alternativemedian column...');
      await db.execute(sql`
        ALTER TABLE one_sample_hypothesis_config 
        ADD COLUMN alternativemedian TEXT DEFAULT 'Less than'
      `);
      console.log('✅ alternativemedian column added successfully');
    }
    
    console.log('✅ Schema update completed successfully');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

updateOneSampleHypothesisSchema().catch(console.error);