/**
 * Script to fix duplicate sequence numbers in gantt_tasks table
 * 
 * This will reassign proper sequential numbers to all tasks in each project
 * Run with: node fix-gantt-sequences.js
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { ganttTasks } from './shared/schema.js';
import { eq, asc } from 'drizzle-orm';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixGanttSequences() {
  try {
    console.log('Starting Gantt sequences fix...');
    
    // Get all projects with tasks
    const projectsWithTasks = await db
      .selectDistinct({ projectId: ganttTasks.projectId })
      .from(ganttTasks)
      .orderBy(asc(ganttTasks.projectId));
    
    console.log(`Found ${projectsWithTasks.length} projects with tasks`);
    
    for (const { projectId } of projectsWithTasks) {
      console.log(`\nFixing sequences for project ${projectId}...`);
      
      // Get all tasks for this project ordered by current sequence and id
      const tasks = await db
        .select()
        .from(ganttTasks)
        .where(eq(ganttTasks.projectId, projectId))
        .orderBy(asc(ganttTasks.sequence), asc(ganttTasks.id));
      
      console.log(`Found ${tasks.length} tasks for project ${projectId}`);
      
      // Update each task with proper sequential numbering
      for (let i = 0; i < tasks.length; i++) {
        const newSequence = i + 1;
        if (tasks[i].sequence !== newSequence) {
          await db
            .update(ganttTasks)
            .set({ 
              sequence: newSequence,
              lastUpdated: new Date()
            })
            .where(eq(ganttTasks.id, tasks[i].id));
          
          console.log(`Updated task ${tasks[i].id} (${tasks[i].name}) from sequence ${tasks[i].sequence} to ${newSequence}`);
        }
      }
    }
    
    console.log('\nGantt sequences fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing Gantt sequences:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script if called directly
fixGanttSequences().catch(console.error);