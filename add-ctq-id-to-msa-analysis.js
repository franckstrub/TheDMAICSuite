/**
 * Script to add ctq_id column to msa_analysis table
 * 
 * This will add a foreign key reference to the cts_characteristics table
 * to properly link MSA analysis records with their corresponding CTQs
 * Run with: node add-ctq-id-to-msa-analysis.js
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addCtqIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding ctq_id column to msa_analysis table...');
    
    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'msa_analysis' AND column_name = 'ctq_id';
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('ctq_id column already exists');
    } else {
      // Add the ctq_id column with foreign key reference
      await client.query(`
        ALTER TABLE msa_analysis 
        ADD COLUMN ctq_id INTEGER REFERENCES cts_characteristics(id);
      `);
      
      console.log('Successfully added ctq_id column to msa_analysis table');
    }
    
    // Check existing MSA records and update ctq_id based on matching CTQ names
    console.log('Checking existing MSA records...');
    
    const existingMsaRecords = await client.query(`
      SELECT id, project_id, ctq, ctq_id
      FROM msa_analysis 
      ORDER BY project_id, id;
    `);
    
    console.log(`Found ${existingMsaRecords.rows.length} existing MSA records`);
    
    let updatedCount = 0;
    for (const msaRecord of existingMsaRecords.rows) {
      if (!msaRecord.ctq_id && msaRecord.ctq) {
        // Find matching CTQ in cts_characteristics table
        const ctsRecord = await client.query(`
          SELECT id 
          FROM cts_characteristics 
          WHERE project_id = $1 AND ctq = $2
          LIMIT 1;
        `, [msaRecord.project_id, msaRecord.ctq]);
        
        if (ctsRecord.rows.length > 0) {
          const ctqId = ctsRecord.rows[0].id;
          
          // Update MSA record with CTQ ID
          await client.query(`
            UPDATE msa_analysis 
            SET ctq_id = $1 
            WHERE id = $2;
          `, [ctqId, msaRecord.id]);
          
          console.log(`Updated MSA record ${msaRecord.id} with CTQ ID ${ctqId} for CTQ "${msaRecord.ctq}"`);
          updatedCount++;
        } else {
          console.log(`Warning: No matching CTQ found for MSA record ${msaRecord.id} with CTQ "${msaRecord.ctq}"`);
        }
      }
    }
    
    console.log(`Migration completed successfully. Updated ${updatedCount} MSA records with CTQ IDs.`);
    
    // Verify the migration
    const verificationQuery = await client.query(`
      SELECT 
        ma.id,
        ma.project_id,
        ma.ctq,
        ma.ctq_id,
        cts.ctq as cts_ctq_name
      FROM msa_analysis ma
      LEFT JOIN cts_characteristics cts ON ma.ctq_id = cts.id
      ORDER BY ma.project_id, ma.id;
    `);
    
    console.log('\nVerification - MSA records with CTQ relationships:');
    verificationQuery.rows.forEach(row => {
      const status = row.ctq_id ? '✓' : '✗';
      console.log(`${status} MSA ${row.id}: "${row.ctq}" -> CTQ ID ${row.ctq_id || 'NULL'} (${row.cts_ctq_name || 'No match'})`);
    });
    
  } catch (error) {
    console.error('Error adding ctq_id column:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addCtqIdColumn();