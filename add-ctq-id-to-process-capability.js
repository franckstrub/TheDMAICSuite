/**
 * Script to add ctq_id column to process_capability table
 * 
 * This will add a foreign key reference to the cts_characteristics table
 * to properly link process capability records with their corresponding CTQs
 * Run with: node add-ctq-id-to-process-capability.js
 */

import { Client } from 'pg';

async function addCtqIdColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Check if the column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'process_capability' 
      AND column_name = 'ctq_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Column ctq_id already exists in process_capability table');
      return;
    }

    // Add the ctq_id column
    await client.query(`
      ALTER TABLE process_capability 
      ADD COLUMN ctq_id INTEGER REFERENCES cts_characteristics(id)
    `);

    console.log('Successfully added ctq_id column to process_capability table');

    // Update existing records to link them with their corresponding CTQs
    const updateResult = await client.query(`
      UPDATE process_capability 
      SET ctq_id = cts_characteristics.id
      FROM cts_characteristics
      WHERE process_capability.ctq = cts_characteristics.ctq 
      AND process_capability.project_id = cts_characteristics.project_id
      AND process_capability.ctq_id IS NULL
    `);

    console.log(`Updated ${updateResult.rowCount} existing process capability records with CTQ IDs`);

  } catch (error) {
    console.error('Error adding ctq_id column:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
addCtqIdColumn()
  .then(() => {
    console.log('CTQ ID column migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });