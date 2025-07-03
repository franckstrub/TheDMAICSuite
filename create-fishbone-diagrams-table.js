/**
 * Script to create fishbone_diagrams table
 * 
 * This will create the table for storing fishbone diagram data for each CTQ
 * Run with: node create-fishbone-diagrams-table.js
 */

import { neon } from '@neondatabase/serverless';

async function createFishboneDiagramsTable() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Creating fishbone_diagrams table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS fishbone_diagrams (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        project_id INTEGER NOT NULL,
        ctq_id INTEGER NOT NULL REFERENCES cts_characteristics(id) ON DELETE CASCADE,
        diagram_data TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    console.log('fishbone_diagrams table created successfully');
    
    // Add index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_fishbone_diagrams_project_ctq 
      ON fishbone_diagrams(project_id, ctq_id)
    `;
    
    console.log('Added index for fishbone_diagrams table');
    
  } catch (error) {
    console.error('Error creating fishbone_diagrams table:', error);
    throw error;
  }
}

createFishboneDiagramsTable()
  .then(() => {
    console.log('Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });