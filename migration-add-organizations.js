/**
 * Migration script to add multi-tenant organization support
 * 
 * This migration:
 * 1. Creates organizations table
 * 2. Adds organization_id to users table
 * 3. Adds organization_id to all tenant-specific tables
 * 4. Creates default organization for existing data
 * 
 * Run with: node migration-add-organizations.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Configure WebSocket for Neon Serverless
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_1OteSyUrukD9@ep-jolly-union-a4anqqse.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  console.log('Starting multi-tenant organization migration...');
  
  try {
    // 1. Create organizations table
    console.log('Creating organizations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('enterprise_small', 'enterprise_medium', 'solo_entrepreneur', 'individual')),
        is_system_generated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        subscription_tier TEXT,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // 2. Create default organization for existing data
    console.log('Creating default organization...');
    const defaultOrgResult = await pool.query(`
      INSERT INTO organizations (name, type, is_system_generated, subscription_tier)
      VALUES ('Default Organization', 'enterprise_small', true, 'premium')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    const defaultOrgId = defaultOrgResult.rows[0]?.id || 1;
    console.log(`Default organization ID: ${defaultOrgId}`);

    // 3. Add organization_id to users table
    console.log('Adding organization_id to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
    `);

    // 4. Update existing users with default organization
    await pool.query(`
      UPDATE users 
      SET organization_id = $1 
      WHERE organization_id IS NULL;
    `, [defaultOrgId]);

    // 5. Make organization_id NOT NULL after setting defaults
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN organization_id SET NOT NULL;
    `);

    // 6. Add role column to users if it doesn't exist
    console.log('Adding role column to users...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' 
      CHECK (role IN ('admin', 'member', 'viewer'));
    `);

    // 7. List of tables that need organization_id
    const tenantTables = [
      'projects',
      'project_charters', 
      'sipoc_diagrams',
      'customer_requirements',
      'business_requirements',
      'datasets',
      'data_collection_plans',
      'storage_configs',
      'project_raci_matrix',
      'activity_logs',
      'process_data',
      'project_risks',
      'stakeholder_analysis_items',
      'gate_review_deliverables',
      'gate_review_validators',
      'gantt_tasks',
      'gantt_settings',
      'process_maps',
      'cts_characteristics',
      'msa_analysis',
      'process_capability'
    ];

    // 8. Add organization_id to all tenant tables
    for (const tableName of tenantTables) {
      console.log(`Adding organization_id to ${tableName} table...`);
      
      try {
        // Add the column
        await pool.query(`
          ALTER TABLE ${tableName} 
          ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);
        `);

        // Set default value for existing records
        await pool.query(`
          UPDATE ${tableName} 
          SET organization_id = $1 
          WHERE organization_id IS NULL;
        `, [defaultOrgId]);

        // Make it NOT NULL
        await pool.query(`
          ALTER TABLE ${tableName} 
          ALTER COLUMN organization_id SET NOT NULL;
        `);

        console.log(`✓ Successfully updated ${tableName}`);
      } catch (error) {
        console.error(`Error updating ${tableName}:`, error.message);
      }
    }

    console.log('✓ Multi-tenant organization migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);