import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";

// Configure neon to use websockets (required for serverless environments)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool specifically for Neon PostgreSQL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL database error:', err);
  console.error('Connection details:', {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    port: process.env.PGPORT
  });
});

// Use the Neon-specific Drizzle client
export const db = drizzle(pool, { schema });