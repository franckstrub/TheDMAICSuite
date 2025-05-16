import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';
import * as schema from "@shared/schema";

// Configure Neon to use websockets in a serverless environment
neonConfig.webSocketConstructor = ws;

// Use the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a Neon SQL client
const sql = neon(DATABASE_URL);

// Create a Drizzle ORM instance with our schema
export const db = drizzle(sql, { schema });

// For backward compatibility with code that expects pool
export const pool = {
  query: async (text, params) => {
    const result = await sql(text, params);
    return { rows: result, rowCount: result.length };
  }
};