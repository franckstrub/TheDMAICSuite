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

// Create a simple query throttling system
const QUERY_LIMIT = 10; // Maximum queries per window
const QUERY_WINDOW = 5000; // Window size in ms
let queryCount = 0;
let queryResetTimeout: NodeJS.Timeout | null = null;

// Function to reset the query count after the window expires
function resetQueryCount() {
  queryCount = 0;
  queryResetTimeout = null;
}

// Create a throttled SQL executor for Neon
const rawSql = neon(DATABASE_URL);
const throttledSql = async (query: string, params?: any[]) => {
  // Start query count timer if not already running
  if (!queryResetTimeout) {
    queryResetTimeout = setTimeout(resetQueryCount, QUERY_WINDOW);
  }
  
  // If we've hit our query limit, wait a bit
  if (queryCount >= QUERY_LIMIT) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return throttledSql(query, params); // Try again after waiting
  }
  
  // Increment the query count
  queryCount++;
  
  try {
    // Execute the query
    return await rawSql(query, params);
  } catch (error: any) {
    // If we hit a rate limit, wait longer and retry
    if (error.message && error.message.includes('rate limit')) {
      console.log('Rate limit hit, waiting to retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return throttledSql(query, params);
    }
    throw error;
  }
};

// Create a Drizzle ORM instance with our schema and throttled executor
export const db = drizzle(throttledSql, { schema });

// For backward compatibility with code that expects pool
export const pool = {
  query: async (text: string, params?: any[]) => {
    const result = await throttledSql(text, params);
    return { rows: result, rowCount: result.length };
  }
};