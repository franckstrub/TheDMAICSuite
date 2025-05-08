/**
 * Script to create the project_risk_items table for unlimited risk assessments
 * 
 * This allows storing an unlimited number of risks per project
 * Run with: npx tsx create-risk-items-table.js
 */

import { pool } from "./server/db";

async function createRiskItemsTable() {
  try {
    console.log("Creating project_risk_items table...");

    // Create the project_risk_items table using raw SQL
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS project_risk_items (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        risk_name TEXT NOT NULL,
        probability TEXT NOT NULL DEFAULT 'Low',
        impact TEXT NOT NULL DEFAULT 'Low',
        risk_criticality INTEGER NOT NULL DEFAULT 1,
        mitigation_plan TEXT,
        risk_owner TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `;

    await pool.query(createTableQuery);
    console.log("Successfully created project_risk_items table");
  } catch (error) {
    console.error("Error creating project_risk_items table:", error);
  } finally {
    // Close the connection
    console.log("Closing database connection...");
    await pool.end();
  }
}

// Execute the function
createRiskItemsTable();