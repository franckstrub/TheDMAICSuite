/**
 * Script to add sample risk data back to the database
 * 
 * This will add a sample risk entry to get you started again
 * Run with: node fix-risk-data.js <projectId>
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';

// We need these imports for Neon serverless
neonConfig.webSocketConstructor = ws;

// Import schema
import { projectRisks } from './shared/schema.js';

async function fixRiskData() {
  // Get the project ID from command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a project ID');
    process.exit(1);
  }
  
  const projectId = parseInt(args[0]);
  
  try {
    console.log(`Adding sample risk data for project ${projectId}...`);
    
    // Connect to database
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema: { projectRisks } });
    
    // First, get the existing risk assessment if any
    const [risk] = await db.select().from(projectRisks).where(eq(projectRisks.projectId, projectId));
    
    // New sample risk data
    const riskData = {
      projectId: projectId,
      userId: 1,
      riskName: "Technology risk: New system integration may fail",
      probability: "Medium",
      impact: "High",
      riskCriticality: 6,
      mitigationPlan: "1. Create detailed integration test plan\n2. Perform early proof of concept\n3. Establish rollback procedures\n4. Ensure vendor support is available during integration",
      riskOwner: "IT Manager",
      
      riskName2: "Process risk: Staff may resist new procedures",
      probability2: "High",
      impact2: "Medium", 
      riskCriticality2: 6,
      mitigationPlan2: "1. Involve staff in process design\n2. Provide comprehensive training\n3. Implement change management plan\n4. Create feedback mechanism",
      riskOwner2: "Change Manager",
      
      // Keep other rows empty
      riskName3: "",
      probability3: "Low",
      impact3: "Low",
      riskCriticality3: 1,
      mitigationPlan3: "",
      riskOwner3: "",
      
      riskName4: "",
      probability4: "Low",
      impact4: "Low",
      riskCriticality4: 1,
      mitigationPlan4: "",
      riskOwner4: "",
      
      riskName5: "",
      probability5: "Low",
      impact5: "Low",
      riskCriticality5: 1,
      mitigationPlan5: "",
      riskOwner5: "",
      
      riskName6: "",
      probability6: "Low",
      impact6: "Low", 
      riskCriticality6: 1,
      mitigationPlan6: "",
      riskOwner6: "",
      
      lastUpdated: new Date()
    };
    
    let result;
    
    if (risk) {
      // Update existing record
      console.log(`Updating existing risk assessment with ID ${risk.id}`);
      result = await db
        .update(projectRisks)
        .set(riskData)
        .where(eq(projectRisks.id, risk.id))
        .returning();
    } else {
      // Insert new record
      console.log('Creating new risk assessment');
      result = await db
        .insert(projectRisks)
        .values(riskData)
        .returning();
    }
    
    console.log('Sample risk data successfully added:', result[0].id);
    console.log('\nYou now have 2 sample risk entries that you can modify or delete.');
    
  } catch (error) {
    console.error('Error adding risk data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixRiskData();