/**
 * Script to check MSA table structure and identify duplicate project fields
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMsaStructure() {
  const client = await pool.connect();
  
  try {
    console.log('Checking MSA table structure...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' 
      ORDER BY ordinal_position;
    `);
    
    console.log('MSA Analysis table structure:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check for project-related columns
    const projectColumns = result.rows.filter(row => 
      row.column_name.toLowerCase().includes('project')
    );
    
    console.log('\nProject-related columns:');
    projectColumns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('Error checking MSA structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMsaStructure();