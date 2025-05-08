/**
 * Script to clean up risk assessment data for a specific project
 * 
 * This script will clear out all risk assessment rows except for the first one,
 * which is required by the schema.
 * 
 * Usage: node clean-risk-rows.js <projectId>
 */

const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq } = require('drizzle-orm');
const ws = require('ws');

// We need these imports for Neon serverless
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

// Import schema
const { projectRisks } = require('./shared/schema');

async function cleanRiskRows() {
  // Get the project ID from command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a project ID');
    process.exit(1);
  }
  
  const projectId = parseInt(args[0]);
  
  try {
    console.log(`Cleaning risk assessment rows for project ${projectId}...`);
    
    // First, get the existing risk assessment
    const [risk] = await db.select().from(projectRisks).where(eq(projectRisks.projectId, projectId));
    
    if (!risk) {
      console.log(`No risk assessment found for project ${projectId}`);
      process.exit(0);
    }
    
    console.log(`Found risk assessment with ID ${risk.id}`);
    
    // Create update object that keeps the first row intact but clears all other rows
    const updateData = {
      // Keep the first row as is
      riskName: risk.riskName,
      probability: risk.probability,
      impact: risk.impact,
      riskCriticality: risk.riskCriticality,
      mitigationPlan: risk.mitigationPlan,
      riskOwner: risk.riskOwner,
      
      // Clear all data from rows 2-6
      riskName2: '',
      probability2: 'Low',
      impact2: 'Low',
      riskCriticality2: 1,
      mitigationPlan2: '',
      riskOwner2: '',
      
      riskName3: '',
      probability3: 'Low',
      impact3: 'Low',
      riskCriticality3: 1, 
      mitigationPlan3: '',
      riskOwner3: '',
      
      riskName4: '',
      probability4: 'Low',
      impact4: 'Low',
      riskCriticality4: 1,
      mitigationPlan4: '',
      riskOwner4: '',
      
      riskName5: '',
      probability5: 'Low',
      impact5: 'Low',
      riskCriticality5: 1,
      mitigationPlan5: '',
      riskOwner5: '',
      
      riskName6: '',
      probability6: 'Low',
      impact6: 'Low',
      riskCriticality6: 1,
      mitigationPlan6: '',
      riskOwner6: '',
      
      // Update the timestamp
      lastUpdated: new Date()
    };
    
    // Update the risk assessment
    const result = await db
      .update(projectRisks)
      .set(updateData)
      .where(eq(projectRisks.id, risk.id))
      .returning();
    
    console.log('Risk assessment successfully cleaned. Updated record:', result[0].id);
    
    console.log('\nAll risk rows except the first one have been cleared.');
    console.log('You can now add new risk rows in the application.');
    
  } catch (error) {
    console.error('Error cleaning risk assessment:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

cleanRiskRows();