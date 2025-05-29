/**
 * Script to add phone_country_code column to users table
 * 
 * This will add the necessary column to the users table in the database
 * Run with: node add-phone-country-code.js
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function addPhoneCountryCodeColumn() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);
  const db = drizzle(sql);

  try {
    console.log("Adding phone_country_code column to users table...");
    
    // Add the column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
    `;
    
    console.log("Successfully added phone_country_code column to users table");
    
    // Set default country code for existing users with phone numbers
    console.log("Setting default country code for existing users...");
    
    await sql`
      UPDATE users 
      SET phone_country_code = '+33'
      WHERE phone IS NOT NULL 
      AND phone != '' 
      AND phone_country_code IS NULL;
    `;
    
    console.log("Migration completed successfully!");
    
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addPhoneCountryCodeColumn();