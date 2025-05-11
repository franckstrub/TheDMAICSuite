
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

async function reindexGateReviewDeliverables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Beginning reindex of gate_review_deliverables table');
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Reindex the table
      await client.query('REINDEX TABLE gate_review_deliverables');
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Successfully reindexed gate_review_deliverables table');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during reindex:', error);
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the reindex
reindexGateReviewDeliverables();
