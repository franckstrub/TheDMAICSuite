import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-pool';
import * as schema from "@shared/schema";

// Direct connection string for Neon PostgreSQL
const DATABASE_URL = 'postgresql://neondb_owner:npg_1OteSyUrukD9@ep-jolly-union-a4anqqse.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Create a more reliable connection pool with better error handling
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 2, // Keep connection pool small
  idleTimeoutMillis: 5000, // Release idle connections quicker
  connectionTimeoutMillis: 10000, // Longer connection timeout
  // Add request logging to help debug issues
  query_timeout: 10000 // Set query timeout to avoid hanging 
});

// Add error handler to the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Export Drizzle instance for database operations
export const db = drizzle(pool, { schema });