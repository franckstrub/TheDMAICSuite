/**
 * Script to add profile fields to users table
 * 
 * This will add the necessary columns to the users table in the database
 * Run with: node add-user-profile-fields.js
 */

import { neon } from '@neondatabase/serverless';

async function addUserProfileFields() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding profile fields to users table...');

    // Add phone column
    try {
      await sql`ALTER TABLE users ADD COLUMN phone text`;
      console.log('Added phone column');
    } catch (error) {
      if (error.code === '42701') {
        console.log('Phone column already exists');
      } else {
        throw error;
      }
    }

    // Add company_name column
    try {
      await sql`ALTER TABLE users ADD COLUMN company_name text`;
      console.log('Added company_name column');
    } catch (error) {
      if (error.code === '42701') {
        console.log('Company_name column already exists');
      } else {
        throw error;
      }
    }

    // Add billing_address column
    try {
      await sql`ALTER TABLE users ADD COLUMN billing_address jsonb`;
      console.log('Added billing_address column');
    } catch (error) {
      if (error.code === '42701') {
        console.log('Billing_address column already exists');
      } else {
        throw error;
      }
    }

    console.log('User profile fields migration completed successfully');
  } catch (error) {
    console.error('Error adding profile fields:', error);
    process.exit(1);
  }
}

addUserProfileFields();