import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";

// Configure WebSocket for Neon Serverless
neonConfig.webSocketConstructor = ws;

// Use the DATABASE_URL from environment variables or use the provided one if needed
const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_1OteSyUrukD9@ep-jolly-union-a4anqqse.us-east-1.aws.neon.tech/neondb?sslmode=require";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection pool
export const pool = new Pool({ connectionString: DATABASE_URL });

// Create a Drizzle ORM instance with our schema
export const db = drizzle(pool, { schema });