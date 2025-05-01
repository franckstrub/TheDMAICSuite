import fetch from 'node-fetch';

// The three projects from the previous dashboard
const projectsToAdd = [
  {
    title: "Order Processing Optimization",
    description: "Improving order processing efficiency and reducing cycle time by 30%",
    currentPhase: "improve",
    status: "Active",
    progress: 75,
    startDate: "2025-03-01",
    targetEndDate: "2025-06-30",
    createdBy: 1
  },
  {
    title: "Quality Inspection Process",
    description: "Reducing defect rates by implementing improved inspection protocols",
    currentPhase: "analyze",
    status: "At Risk",
    progress: 45,
    startDate: "2025-02-15",
    targetEndDate: "2025-07-15",
    createdBy: 1
  },
  {
    title: "Inventory Management",
    description: "Optimizing inventory levels and reducing carrying costs",
    currentPhase: "measure",
    status: "On Track",
    progress: 30,
    startDate: "2025-04-01",
    targetEndDate: "2025-08-31",
    createdBy: 1
  }
];

// Function to add projects
async function addProjects() {
  console.log("Adding projects...");
  
  for (const project of projectsToAdd) {
    try {
      const response = await fetch('http://0.0.0.0:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✓ Added project: ${project.title}`);
      } else {
        console.error(`✗ Failed to add project: ${project.title}`, data);
      }
    } catch (error) {
      console.error(`✗ Error adding project: ${project.title}`, error);
    }
  }
  
  console.log("Finished adding projects.");
}

// Run the function
addProjects();