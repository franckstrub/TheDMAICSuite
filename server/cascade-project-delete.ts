import { db } from './db';
import { eq } from 'drizzle-orm';
import { 
  projects,
  projectCharters,
  sipocDiagrams,
  customerRequirements,
  businessRequirements,
  dataCollectionPlans,
  projectRaciMatrix,
  activityLogs,
  processData,
  projectRisks,
  stakeholderAnalysisItems,
  gateReviewDeliverables,
  gateReviewValidators,
  ganttTasks,
  causeEffectMatrix,
  rootCausePrioritization,
  msaAnalysis,
  processCapability,
  ctsCharacteristics,
  fishboneDiagrams,
  processMaps
} from '@shared/schema';

/**
 * Permanently removes a project and all its associated data from the database.
 * This function performs cascade deletion across all related tables.
 *
 * @param projectId The ID of the project to permanently delete
 * @returns Promise that resolves to the number of tables from which data was deleted
 */
export async function permanentlyDeleteProject(projectId: number): Promise<number> {
  let deletionCount = 0;
  const results: Record<string, number> = {};

  try {
    console.log(`Starting permanent deletion of project ID ${projectId} and all associated data...`);

    // Delete gate review validators
    const validatorsResult = await db.delete(gateReviewValidators)
      .where(eq(gateReviewValidators.projectId, projectId))
      .returning();
    results['gateReviewValidators'] = validatorsResult.length;
    deletionCount += validatorsResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${validatorsResult.length} gate review validators`);

    // Delete gate review deliverables
    const deliverablesResult = await db.delete(gateReviewDeliverables)
      .where(eq(gateReviewDeliverables.projectId, projectId))
      .returning();
    results['gateReviewDeliverables'] = deliverablesResult.length;
    deletionCount += deliverablesResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${deliverablesResult.length} gate review deliverables`);

    // Delete stakeholder analysis items
    const stakeholderResult = await db.delete(stakeholderAnalysisItems)
      .where(eq(stakeholderAnalysisItems.projectId, projectId))
      .returning();
    results['stakeholderAnalysisItems'] = stakeholderResult.length;
    deletionCount += stakeholderResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${stakeholderResult.length} stakeholder analysis items`);

    // Delete project risks
    const risksResult = await db.delete(projectRisks)
      .where(eq(projectRisks.projectId, projectId))
      .returning();
    results['projectRisks'] = risksResult.length;
    deletionCount += risksResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${risksResult.length} project risks`);

    // Delete process data
    const processDataResult = await db.delete(processData)
      .where(eq(processData.projectId, projectId))
      .returning();
    results['processData'] = processDataResult.length;
    deletionCount += processDataResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${processDataResult.length} process data entries`);

    // Delete activity logs
    const logsResult = await db.delete(activityLogs)
      .where(eq(activityLogs.projectId, projectId))
      .returning();
    results['activityLogs'] = logsResult.length;
    deletionCount += logsResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${logsResult.length} activity logs`);

    // Delete RACI matrix
    const raciResult = await db.delete(projectRaciMatrix)
      .where(eq(projectRaciMatrix.projectId, projectId))
      .returning();
    results['projectRaciMatrix'] = raciResult.length;
    deletionCount += raciResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${raciResult.length} RACI matrix entries`);

    // Delete data collection plans
    const plansResult = await db.delete(dataCollectionPlans)
      .where(eq(dataCollectionPlans.projectId, projectId))
      .returning();
    results['dataCollectionPlans'] = plansResult.length;
    deletionCount += plansResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${plansResult.length} data collection plans`);

    // Delete business requirements
    const businessReqResult = await db.delete(businessRequirements)
      .where(eq(businessRequirements.projectId, projectId))
      .returning();
    results['businessRequirements'] = businessReqResult.length;
    deletionCount += businessReqResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${businessReqResult.length} business requirements`);

    // Delete customer requirements
    const customerReqResult = await db.delete(customerRequirements)
      .where(eq(customerRequirements.projectId, projectId))
      .returning();
    results['customerRequirements'] = customerReqResult.length;
    deletionCount += customerReqResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${customerReqResult.length} customer requirements`);

    // Delete SIPOC diagrams
    const sipocResult = await db.delete(sipocDiagrams)
      .where(eq(sipocDiagrams.projectId, projectId))
      .returning();
    results['sipocDiagrams'] = sipocResult.length;
    deletionCount += sipocResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${sipocResult.length} SIPOC diagrams`);

    // Delete Gantt tasks
    const ganttTasksResult = await db.delete(ganttTasks)
      .where(eq(ganttTasks.projectId, projectId))
      .returning();
    results['ganttTasks'] = ganttTasksResult.length;
    deletionCount += ganttTasksResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${ganttTasksResult.length} Gantt tasks`);

    // Delete cause-effect matrix
    const causeEffectMatrixResult = await db.delete(causeEffectMatrix)
      .where(eq(causeEffectMatrix.projectId, projectId))
      .returning();
    results['causeEffectMatrix'] = causeEffectMatrixResult.length;
    deletionCount += causeEffectMatrixResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${causeEffectMatrixResult.length} cause-effect matrix records`);

    // Delete root cause prioritization
    const rootCauseResult = await db.delete(rootCausePrioritization)
      .where(eq(rootCausePrioritization.projectId, projectId))
      .returning();
    results['rootCausePrioritization'] = rootCauseResult.length;
    deletionCount += rootCauseResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${rootCauseResult.length} root cause prioritization records`);

    // Delete MSA analysis
    const msaResult = await db.delete(msaAnalysis)
      .where(eq(msaAnalysis.projectId, projectId))
      .returning();
    results['msaAnalysis'] = msaResult.length;
    deletionCount += msaResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${msaResult.length} MSA analysis records`);

    // Delete process capability
    const processCapabilityResult = await db.delete(processCapability)
      .where(eq(processCapability.projectId, projectId))
      .returning();
    results['processCapability'] = processCapabilityResult.length;
    deletionCount += processCapabilityResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${processCapabilityResult.length} process capability records`);

    // Delete fishbone diagrams
    const fishboneResult = await db.delete(fishboneDiagrams)
      .where(eq(fishboneDiagrams.projectId, projectId))
      .returning();
    results['fishboneDiagrams'] = fishboneResult.length;
    deletionCount += fishboneResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${fishboneResult.length} fishbone diagrams`);

    // Delete process maps
    const processMapsResult = await db.delete(processMaps)
      .where(eq(processMaps.projectId, projectId))
      .returning();
    results['processMaps'] = processMapsResult.length;
    deletionCount += processMapsResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${processMapsResult.length} process maps`);

    // Delete CTS characteristics
    const ctsResult = await db.delete(ctsCharacteristics)
      .where(eq(ctsCharacteristics.projectId, projectId))
      .returning();
    results['ctsCharacteristics'] = ctsResult.length;
    deletionCount += ctsResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${ctsResult.length} CTS characteristics`);

    // Delete project charter
    const charterResult = await db.delete(projectCharters)
      .where(eq(projectCharters.projectId, projectId))
      .returning();
    results['projectCharters'] = charterResult.length;
    deletionCount += charterResult.length > 0 ? 1 : 0;
    console.log(`Deleted ${charterResult.length} project charters`);

    console.log(`Successfully purged data from ${deletionCount} tables for project ID ${projectId}`);
    console.log('Deletion summary:', results);
    
    return deletionCount;
  } catch (error: any) {
    console.error(`Error during cascade deletion of project ${projectId}:`, error);
    throw new Error(`Failed to permanently delete project: ${error.message}`);
  }
}

/**
 * Clean up the database by removing all orphaned project-related data.
 * This function deletes all records that reference project IDs that no longer exist.
 * 
 * @returns Promise that resolves to the number of tables from which data was deleted
 */
export async function cleanupOrphanedProjectData(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  try {
    console.log("Running database cleanup for orphaned project data...");
    
    // Get all valid project IDs
    const validProjects = await db.select().from(projects);
    const validProjectIds = validProjects.map(p => p.id);
    
    console.log(`Found ${validProjectIds.length} valid projects. Cleaning up orphaned data...`);
    
    // Clean up each table with foreign keys to projects
    const tables = [
      { name: 'gateReviewValidators', table: gateReviewValidators },
      { name: 'gateReviewDeliverables', table: gateReviewDeliverables },
      { name: 'stakeholderAnalysisItems', table: stakeholderAnalysisItems },
      { name: 'projectRisks', table: projectRisks },
      { name: 'processData', table: processData },
      { name: 'activityLogs', table: activityLogs },
      { name: 'projectRaciMatrix', table: projectRaciMatrix },
      { name: 'dataCollectionPlans', table: dataCollectionPlans },
      { name: 'businessRequirements', table: businessRequirements },
      { name: 'customerRequirements', table: customerRequirements },
      { name: 'sipocDiagrams', table: sipocDiagrams },
      { name: 'ganttTasks', table: ganttTasks },
      { name: 'causeEffectMatrix', table: causeEffectMatrix },
      { name: 'rootCausePrioritization', table: rootCausePrioritization },
      { name: 'msaAnalysis', table: msaAnalysis },
      { name: 'processCapability', table: processCapability },
      { name: 'fishboneDiagrams', table: fishboneDiagrams },
      { name: 'processMaps', table: processMaps },
      { name: 'ctsCharacteristics', table: ctsCharacteristics },
      { name: 'projectCharters', table: projectCharters }
    ];
    
    for (const { name, table } of tables) {
      try {
        // Get all records from this table
        const records = await db.select().from(table);
        
        // Find orphaned records (those with project_id not in validProjectIds)
        const orphaned = records.filter(record => 
          record.projectId !== null && 
          record.projectId !== undefined && 
          !validProjectIds.includes(record.projectId)
        );
        
        if (orphaned.length > 0) {
          console.log(`Found ${orphaned.length} orphaned records in ${name}`);
          
          // Delete each orphaned record individually
          let deleteCount = 0;
          for (const record of orphaned) {
            const deleteResult = await db.delete(table)
              .where(eq(table.id, record.id))
              .returning();
              
            deleteCount += deleteResult.length;
          }
          
          results[name] = deleteCount;
          console.log(`Deleted ${deleteCount} orphaned records from ${name}`);
        } else {
          results[name] = 0;
          console.log(`No orphaned records found in ${name}`);
        }
      } catch (cleanupError: any) {
        console.error(`Error cleaning up ${name}:`, cleanupError);
        results[name] = 0;
      }
    }
    
    return results;
  } catch (error: any) {
    console.error("Error during orphaned data cleanup:", error);
    throw new Error(`Failed to clean up orphaned project data: ${error.message}`);
  }
}