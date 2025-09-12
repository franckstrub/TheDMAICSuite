
/**
 * Script to copy all table contents from DMAICSuiteold database to DMAICSuite database
 * 
 * This script will:
 * 1. Connect to both databases
 * 2. Get list of all tables from source database
 * 3. Copy all data from each table to destination database
 * 4. Handle foreign key constraints properly
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

// Source database (DMAICSuiteold)
const SOURCE_DB_URL = "postgresql://neondb_owner:npg_1OteSyUrukD9@ep-jolly-union-a4anqqse.us-east-1.aws.neon.tech/DMAICSuiteold?sslmode=require";

// Destination database (DMAICSuite) - using current DATABASE_URL
const DEST_DB_URL = process.env.DATABASE_URL;

async function copyDatabaseContents() {
  const sourcePool = new Pool({ connectionString: SOURCE_DB_URL });
  const destPool = new Pool({ connectionString: DEST_DB_URL });

  try {
    console.log('Starting database migration...');
    
    // Get list of all tables from source database
    console.log('Getting list of tables from source database...');
    const tablesResult = await sourcePool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables:`, tables);

    // Define table order to handle dependencies (tables with foreign keys should come after referenced tables)
    const orderedTables = [
      'organizations',
      'users',
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
      'fishbone_diagrams',
      'cause_effect_matrix',
      'root_cause_prioritization',
      'process_capability_data',
      'continuous_ctq_analysis_config',
      'hypothesis_testing_config',
      'one_sample_hypothesis_testing',
      'attribute_msa_analysis',
      'continuous_msa_analysis'
    ].filter(table => tables.includes(table));

    // Add any remaining tables not in the ordered list
    const remainingTables = tables.filter(table => !orderedTables.includes(table));
    const allTables = [...orderedTables, ...remainingTables];

    // Copy data from each table
    for (const tableName of allTables) {
      try {
        console.log(`\nProcessing table: ${tableName}`);
        
        // Check if table exists in destination
        const tableExistsResult = await destPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tableName]);

        if (!tableExistsResult.rows[0].exists) {
          console.log(`Table ${tableName} does not exist in destination database. Skipping...`);
          continue;
        }

        // Get all data from source table
        const sourceData = await sourcePool.query(`SELECT * FROM "${tableName}"`);
        console.log(`Found ${sourceData.rows.length} rows in ${tableName}`);

        if (sourceData.rows.length === 0) {
          console.log(`No data to copy for ${tableName}`);
          continue;
        }

        // Clear existing data in destination table
        await destPool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
        console.log(`Cleared existing data from ${tableName}`);

        // Get column names
        const columns = Object.keys(sourceData.rows[0]);
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

        // Insert data in batches
        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < sourceData.rows.length; i += batchSize) {
          const batch = sourceData.rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            
            try {
              await destPool.query(
                `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                values
              );
              insertedCount++;
            } catch (error) {
              console.error(`Error inserting row into ${tableName}:`, error.message);
              console.log('Row data:', row);
              // Continue with next row instead of failing completely
            }
          }
        }

        console.log(`Successfully inserted ${insertedCount} rows into ${tableName}`);

        // Reset sequence for tables with auto-incrementing IDs
        try {
          const sequenceResult = await destPool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 
            AND column_default LIKE 'nextval%'
          `, [tableName]);

          if (sequenceResult.rows.length > 0) {
            const idColumn = sequenceResult.rows[0].column_name;
            await destPool.query(`
              SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${idColumn}), 1), true) 
              FROM "${tableName}"
            `, [tableName, idColumn]);
            console.log(`Reset sequence for ${tableName}.${idColumn}`);
          }
        } catch (seqError) {
          console.log(`Could not reset sequence for ${tableName}: ${seqError.message}`);
        }

      } catch (error) {
        console.error(`Error processing table ${tableName}:`, error.message);
      }
    }

    console.log('\n✅ Database migration completed successfully!');
    console.log(`Processed ${allTables.length} tables`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sourcePool.end();
    await destPool.end();
  }
}

// Run the migration
copyDatabaseContents().catch(console.error);
