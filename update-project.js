// Script to directly update project benefits
const { storage } = require('./server/storage');

async function updateProjectBenefits() {
  try {
    const projectId = 1; // Replace with actual project ID
    
    // Get existing project first
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return;
    }
    
    console.log('Current project benefits:', project.benefits);
    
    // Create or update benefits object
    const benefits = project.benefits || {};
    benefits.qualityCostSavings = 10000; // Set to the value from the charter
    
    // Update the project
    const updatedProject = await storage.updateProject(projectId, {
      benefits
    });
    
    console.log('Updated project benefits:', updatedProject?.benefits);
    console.log('Update successful');
  } catch (error) {
    console.error('Error updating project benefits:', error);
  }
}

// Run the function
updateProjectBenefits();