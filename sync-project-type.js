// Script to directly sync project type from charter to project
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';

async function syncProjectType() {
  // Get the project ID from command line argument
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]);
  
  if (!projectId || isNaN(projectId)) {
    console.error('Please provide a valid project ID as an argument');
    process.exit(1);
  }
  
  console.log(`Syncing project type for project ID: ${projectId}`);
  
  try {
    // Create a connection to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Get the project charter
    const charterResult = await pool.query(
      'SELECT project_type FROM project_charters WHERE project_id = $1 ORDER BY id DESC LIMIT 1',
      [projectId]
    );
    
    if (charterResult.rows.length === 0) {
      console.error(`No charter found for project ID ${projectId}`);
      process.exit(1);
    }
    
    const projectType = charterResult.rows[0].project_type;
    console.log(`Charter project type: ${projectType}`);
    
    // Get current project type
    const projectResult = await pool.query(
      'SELECT project_type FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      console.error(`No project found with ID ${projectId}`);
      process.exit(1);
    }
    
    const currentProjectType = projectResult.rows[0].project_type;
    console.log(`Current project type: ${currentProjectType}`);
    
    // Update the project type
    if (projectType) {
      await pool.query(
        'UPDATE projects SET project_type = $1, last_updated = NOW() WHERE id = $2',
        [projectType, projectId]
      );
      
      console.log(`Project type updated from "${currentProjectType}" to "${projectType}"`);
    } else {
      console.log('No project type found in charter, no update needed');
    }
    
    // Verify the update
    const verifyResult = await pool.query(
      'SELECT project_type FROM projects WHERE id = $1',
      [projectId]
    );
    
    console.log(`Verified project type is now: ${verifyResult.rows[0].project_type}`);
    
    await pool.end();
    
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Error syncing project type:', error);
    process.exit(1);
  }
}

// Run the function
syncProjectType();