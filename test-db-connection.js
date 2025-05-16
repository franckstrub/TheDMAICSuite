/**
 * Simple script to test the PostgreSQL database connection and create tables
 */

import pg from 'pg';
const { Client } = pg;

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Available (hidden)' : 'Not available');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Successfully connected to the database!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Current database time:', result.rows[0].current_time);
    
    // Try to create a simple test table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Created test table successfully');
    
    // Insert a test record
    await client.query(`
      INSERT INTO test_table (name) VALUES ('Test record')
    `);
    
    console.log('Inserted test record successfully');
    
    // Verify the record was inserted
    const testResult = await client.query('SELECT * FROM test_table');
    console.log('Test records:', testResult.rows);
    
    console.log('Database connection and basic operations test completed successfully!');
  } catch (error) {
    console.error('Database connection test failed:', error);
  } finally {
    await client.end();
  }
}

testConnection().catch(err => {
  console.error('Unexpected error:', err);
});