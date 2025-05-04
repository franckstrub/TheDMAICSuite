/**
 * Script to synchronize project progress with their phases
 * 
 * This script calls the API endpoint we created to update project progress 
 * based on the DMAIC phases indicated in their charter milestone dates.
 */

import fetch from 'node-fetch';

async function syncAllProjectsProgress() {
  try {
    console.log('Starting synchronization of all projects progress...');
    
    const response = await fetch('http://localhost:5000/api/sync-project-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('Synchronization complete:');
    console.log(`Message: ${data.message}`);
    
    if (data.results && data.results.length > 0) {
      console.log('\nProjects updated:');
      data.results.forEach(project => {
        console.log(`- ${project.title}: Phase = ${project.phase}, Progress = ${project.progress}%`);
      });
    } else {
      console.log('No projects were updated');
    }
  } catch (error) {
    console.error('Error synchronizing project progress:', error);
  }
}

// Run the synchronization
syncAllProjectsProgress();