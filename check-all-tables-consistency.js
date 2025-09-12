
/**
 * Comprehensive Database Consistency Checker
 * Checks all tables for data integrity, foreign key constraints, and orphaned records
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAllTablesConsistency() {
  console.log('🔍 Comprehensive Database Consistency Check\n');
  
  const issues = [];
  let totalIssues = 0;

  try {
    // Get list of all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Found ${tablesResult.rows.length} tables to check:\n`);
    tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
    console.log('\n' + '='.repeat(80) + '\n');

    // 1. Check Organizations
    console.log('📊 Checking Organizations...');
    const orgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
    const orgCount = parseInt(orgsResult.rows[0].count);
    console.log(`   Found ${orgCount} organizations`);

    const activeOrgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations WHERE is_active = true');
    const activeOrgCount = parseInt(activeOrgsResult.rows[0].count);
    console.log(`   ${activeOrgCount} active, ${orgCount - activeOrgCount} inactive`);

    // 2. Check Users
    console.log('\n👥 Checking Users...');
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`   Found ${userCount} users`);

    // Check users with invalid organization_id
    const invalidOrgUsersResult = await pool.query(`
      SELECT u.id, u.email, u.organization_id 
      FROM users u 
      LEFT JOIN organizations o ON u.organization_id = o.id 
      WHERE u.organization_id IS NOT NULL AND o.id IS NULL
    `);
    if (invalidOrgUsersResult.rows.length > 0) {
      issues.push(`❌ ${invalidOrgUsersResult.rows.length} users reference non-existent organizations`);
      console.log('   Invalid organization references:');
      invalidOrgUsersResult.rows.forEach(user => {
        console.log(`     User ${user.id} (${user.email}) -> org_id ${user.organization_id}`);
      });
      totalIssues += invalidOrgUsersResult.rows.length;
    }

    // 3. Check Projects
    console.log('\n📋 Checking Projects...');
    const projectsResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    const projectCount = parseInt(projectsResult.rows[0].count);
    console.log(`   Found ${projectCount} projects`);

    // Check projects with invalid organization_id
    const invalidOrgProjectsResult = await pool.query(`
      SELECT p.id, p.title, p.organization_id 
      FROM projects p 
      LEFT JOIN organizations o ON p.organization_id = o.id 
      WHERE p.organization_id IS NOT NULL AND o.id IS NULL
    `);
    if (invalidOrgProjectsResult.rows.length > 0) {
      issues.push(`❌ ${invalidOrgProjectsResult.rows.length} projects reference non-existent organizations`);
      totalIssues += invalidOrgProjectsResult.rows.length;
    }

    // Check projects with invalid created_by user_id
    const invalidCreatedByResult = await pool.query(`
      SELECT p.id, p.title, p.created_by 
      FROM projects p 
      LEFT JOIN users u ON p.created_by::text = u.id 
      WHERE u.id IS NULL
    `);
    if (invalidCreatedByResult.rows.length > 0) {
      issues.push(`❌ ${invalidCreatedByResult.rows.length} projects reference non-existent users in created_by`);
      totalIssues += invalidCreatedByResult.rows.length;
    }

    // 4. Check Project Charters
    console.log('\n📄 Checking Project Charters...');
    const chartersResult = await pool.query('SELECT COUNT(*) as count FROM project_charters');
    const charterCount = parseInt(chartersResult.rows[0].count);
    console.log(`   Found ${charterCount} project charters`);

    // Check charters with invalid project_id
    const invalidProjectChartersResult = await pool.query(`
      SELECT pc.id, pc.project_id, pc.project_title 
      FROM project_charters pc 
      LEFT JOIN projects p ON pc.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidProjectChartersResult.rows.length > 0) {
      issues.push(`❌ ${invalidProjectChartersResult.rows.length} project charters reference non-existent projects`);
      totalIssues += invalidProjectChartersResult.rows.length;
    }

    // 5. Check CTS Characteristics
    console.log('\n🎯 Checking CTS Characteristics...');
    const ctsResult = await pool.query('SELECT COUNT(*) as count FROM cts_characteristics');
    const ctsCount = parseInt(ctsResult.rows[0].count);
    console.log(`   Found ${ctsCount} CTS characteristics`);

    // Check CTS with invalid project_id
    const invalidCtsResult = await pool.query(`
      SELECT c.id, c.ctq, c.project_id 
      FROM cts_characteristics c 
      LEFT JOIN projects p ON c.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidCtsResult.rows.length > 0) {
      issues.push(`❌ ${invalidCtsResult.rows.length} CTS characteristics reference non-existent projects`);
      totalIssues += invalidCtsResult.rows.length;
    }

    // 6. Check MSA Analysis
    console.log('\n🔬 Checking MSA Analysis...');
    const msaResult = await pool.query('SELECT COUNT(*) as count FROM msa_analysis');
    const msaCount = parseInt(msaResult.rows[0].count);
    console.log(`   Found ${msaCount} MSA analyses`);

    // Check MSA with invalid project_id
    const invalidMsaResult = await pool.query(`
      SELECT m.id, m.ctq, m.project_id 
      FROM msa_analysis m 
      LEFT JOIN projects p ON m.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidMsaResult.rows.length > 0) {
      issues.push(`❌ ${invalidMsaResult.rows.length} MSA analyses reference non-existent projects`);
      totalIssues += invalidMsaResult.rows.length;
    }

    // Check MSA with invalid ctq_id
    const invalidMsaCtqResult = await pool.query(`
      SELECT m.id, m.ctq, m.ctq_id 
      FROM msa_analysis m 
      LEFT JOIN cts_characteristics c ON m.ctq_id = c.id 
      WHERE m.ctq_id IS NOT NULL AND c.id IS NULL
    `);
    if (invalidMsaCtqResult.rows.length > 0) {
      issues.push(`❌ ${invalidMsaCtqResult.rows.length} MSA analyses reference non-existent CTS characteristics`);
      totalIssues += invalidMsaCtqResult.rows.length;
    }

    // 7. Check Process Capability
    console.log('\n📈 Checking Process Capability...');
    const capabilityResult = await pool.query('SELECT COUNT(*) as count FROM process_capability');
    const capabilityCount = parseInt(capabilityResult.rows[0].count);
    console.log(`   Found ${capabilityCount} process capability analyses`);

    // Check capability with invalid project_id
    const invalidCapabilityResult = await pool.query(`
      SELECT pc.id, pc.ctq, pc.project_id 
      FROM process_capability pc 
      LEFT JOIN projects p ON pc.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidCapabilityResult.rows.length > 0) {
      issues.push(`❌ ${invalidCapabilityResult.rows.length} process capability analyses reference non-existent projects`);
      totalIssues += invalidCapabilityResult.rows.length;
    }

    // 8. Check Root Cause Prioritization
    console.log('\n🔍 Checking Root Cause Prioritization...');
    const rootCauseResult = await pool.query('SELECT COUNT(*) as count FROM root_cause_prioritization');
    const rootCauseCount = parseInt(rootCauseResult.rows[0].count);
    console.log(`   Found ${rootCauseCount} root cause prioritization entries`);

    // Check root cause with invalid ctq_id
    const invalidRootCauseResult = await pool.query(`
      SELECT r.id, r.rootcause, r.ctq_id 
      FROM root_cause_prioritization r 
      LEFT JOIN cts_characteristics c ON r.ctq_id = c.id 
      WHERE c.id IS NULL
    `);
    if (invalidRootCauseResult.rows.length > 0) {
      issues.push(`❌ ${invalidRootCauseResult.rows.length} root cause prioritization entries reference non-existent CTS characteristics`);
      totalIssues += invalidRootCauseResult.rows.length;
    }

    // 9. Check Fishbone Diagrams
    console.log('\n🐟 Checking Fishbone Diagrams...');
    const fishboneResult = await pool.query('SELECT COUNT(*) as count FROM fishbone_diagrams');
    const fishboneCount = parseInt(fishboneResult.rows[0].count);
    console.log(`   Found ${fishboneCount} fishbone diagrams`);

    // Check fishbone with invalid ctq_id
    const invalidFishboneResult = await pool.query(`
      SELECT f.id, f.ctq_id 
      FROM fishbone_diagrams f 
      LEFT JOIN cts_characteristics c ON f.ctq_id = c.id 
      WHERE c.id IS NULL
    `);
    if (invalidFishboneResult.rows.length > 0) {
      issues.push(`❌ ${invalidFishboneResult.rows.length} fishbone diagrams reference non-existent CTS characteristics`);
      totalIssues += invalidFishboneResult.rows.length;
    }

    // 10. Check Gate Review Deliverables
    console.log('\n📋 Checking Gate Review Deliverables...');
    const deliverablesResult = await pool.query('SELECT COUNT(*) as count FROM gate_review_deliverables');
    const deliverablesCount = parseInt(deliverablesResult.rows[0].count);
    console.log(`   Found ${deliverablesCount} gate review deliverables`);

    // Check deliverables with invalid project_id
    const invalidDeliverablesResult = await pool.query(`
      SELECT g.id, g.name, g.project_id 
      FROM gate_review_deliverables g 
      LEFT JOIN projects p ON g.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidDeliverablesResult.rows.length > 0) {
      issues.push(`❌ ${invalidDeliverablesResult.rows.length} gate review deliverables reference non-existent projects`);
      totalIssues += invalidDeliverablesResult.rows.length;
    }

    // 11. Check Gate Review Validators
    console.log('\n✅ Checking Gate Review Validators...');
    const validatorsResult = await pool.query('SELECT COUNT(*) as count FROM gate_review_validators');
    const validatorsCount = parseInt(validatorsResult.rows[0].count);
    console.log(`   Found ${validatorsCount} gate review validators`);

    // 12. Check Gantt Tasks
    console.log('\n📅 Checking Gantt Tasks...');
    const ganttResult = await pool.query('SELECT COUNT(*) as count FROM gantt_tasks');
    const ganttCount = parseInt(ganttResult.rows[0].count);
    console.log(`   Found ${ganttCount} gantt tasks`);

    // Check gantt tasks with invalid project_id
    const invalidGanttResult = await pool.query(`
      SELECT g.id, g.name, g.project_id 
      FROM gantt_tasks g 
      LEFT JOIN projects p ON g.project_id = p.id 
      WHERE p.id IS NULL
    `);
    if (invalidGanttResult.rows.length > 0) {
      issues.push(`❌ ${invalidGanttResult.rows.length} gantt tasks reference non-existent projects`);
      totalIssues += invalidGanttResult.rows.length;
    }

    // 13. Check Data Collection Plans
    console.log('\n📊 Checking Data Collection Plans...');
    const dataPlansResult = await pool.query('SELECT COUNT(*) as count FROM data_collection_plans');
    const dataPlansCount = parseInt(dataPlansResult.rows[0].count);
    console.log(`   Found ${dataPlansCount} data collection plans`);

    // 14. Check Customer Requirements
    console.log('\n👤 Checking Customer Requirements...');
    const customerReqResult = await pool.query('SELECT COUNT(*) as count FROM customer_requirements');
    const customerReqCount = parseInt(customerReqResult.rows[0].count);
    console.log(`   Found ${customerReqCount} customer requirements`);

    // 15. Check Business Requirements
    console.log('\n🏢 Checking Business Requirements...');
    const businessReqResult = await pool.query('SELECT COUNT(*) as count FROM business_requirements');
    const businessReqCount = parseInt(businessReqResult.rows[0].count);
    console.log(`   Found ${businessReqCount} business requirements`);

    // 16. Check SIPOC Diagrams
    console.log('\n🔄 Checking SIPOC Diagrams...');
    const sipocResult = await pool.query('SELECT COUNT(*) as count FROM sipoc_diagrams');
    const sipocCount = parseInt(sipocResult.rows[0].count);
    console.log(`   Found ${sipocCount} SIPOC diagrams`);

    // 17. Check Project Risks
    console.log('\n⚠️  Checking Project Risks...');
    const risksResult = await pool.query('SELECT COUNT(*) as count FROM project_risks');
    const risksCount = parseInt(risksResult.rows[0].count);
    console.log(`   Found ${risksCount} project risk assessments`);

    // 18. Check Project RACI Matrix
    console.log('\n👨‍💼 Checking Project RACI Matrix...');
    const raciResult = await pool.query('SELECT COUNT(*) as count FROM project_raci_matrix');
    const raciCount = parseInt(raciResult.rows[0].count);
    console.log(`   Found ${raciCount} RACI matrices`);

    // 19. Check Stakeholder Analysis Items
    console.log('\n🤝 Checking Stakeholder Analysis Items...');
    const stakeholderResult = await pool.query('SELECT COUNT(*) as count FROM stakeholder_analysis_items');
    const stakeholderCount = parseInt(stakeholderResult.rows[0].count);
    console.log(`   Found ${stakeholderCount} stakeholder analysis items`);

    // 20. Check Activity Logs
    console.log('\n📝 Checking Activity Logs...');
    const logsResult = await pool.query('SELECT COUNT(*) as count FROM activity_logs');
    const logsCount = parseInt(logsResult.rows[0].count);
    console.log(`   Found ${logsCount} activity log entries`);

    // 21. Check for orphaned records across all tables
    console.log('\n🔍 Checking for Cross-Table Consistency...');
    
    // Check for projects without any related data
    const projectsWithoutDataResult = await pool.query(`
      SELECT p.id, p.title 
      FROM projects p 
      LEFT JOIN project_charters pc ON p.id = pc.project_id 
      LEFT JOIN cts_characteristics c ON p.id = c.project_id 
      LEFT JOIN data_collection_plans dcp ON p.id = dcp.project_id 
      WHERE pc.id IS NULL AND c.id IS NULL AND dcp.id IS NULL
    `);
    if (projectsWithoutDataResult.rows.length > 0) {
      console.log(`   ⚠️  ${projectsWithoutDataResult.rows.length} projects have no related data (charters, CTQs, or data plans)`);
    }

    // 22. Check for duplicate CTQs within projects
    const duplicateCtqsResult = await pool.query(`
      SELECT project_id, ctq, COUNT(*) as count 
      FROM cts_characteristics 
      GROUP BY project_id, ctq 
      HAVING COUNT(*) > 1
    `);
    if (duplicateCtqsResult.rows.length > 0) {
      issues.push(`❌ ${duplicateCtqsResult.rows.length} duplicate CTQs found within projects`);
      console.log('   Duplicate CTQs:');
      duplicateCtqsResult.rows.forEach(dup => {
        console.log(`     Project ${dup.project_id}: "${dup.ctq}" appears ${dup.count} times`);
      });
      totalIssues += duplicateCtqsResult.rows.length;
    }

    // 23. Check Hypothesis Testing Tables
    console.log('\n🧪 Checking Hypothesis Testing Tables...');
    
    // Check hypothesis_testing_config
    const htConfigResult = await pool.query('SELECT COUNT(*) as count FROM hypothesis_testing_config');
    console.log(`   Found ${parseInt(htConfigResult.rows[0].count)} hypothesis testing configs`);

    // Check one_sample_hypothesis_config
    const oneSampleResult = await pool.query('SELECT COUNT(*) as count FROM one_sample_hypothesis_config');
    console.log(`   Found ${parseInt(oneSampleResult.rows[0].count)} one-sample hypothesis configs`);

    // Check two_sample_hypothesis_config
    const twoSampleResult = await pool.query('SELECT COUNT(*) as count FROM two_sample_hypothesis_config');
    console.log(`   Found ${parseInt(twoSampleResult.rows[0].count)} two-sample hypothesis configs`);

    // Check paired_sample_hypothesis_config
    const pairedSampleResult = await pool.query('SELECT COUNT(*) as count FROM paired_sample_hypothesis_config');
    console.log(`   Found ${parseInt(pairedSampleResult.rows[0].count)} paired-sample hypothesis configs`);

    // Check multiple_sample_hypothesis_config
    const multipleSampleResult = await pool.query('SELECT COUNT(*) as count FROM multiple_sample_hypothesis_config');
    console.log(`   Found ${parseInt(multipleSampleResult.rows[0].count)} multiple-sample hypothesis configs`);

    // 24. Check Continuous CTQ Analysis Config
    console.log('\n📊 Checking Continuous CTQ Analysis Config...');
    const contCtqResult = await pool.query('SELECT COUNT(*) as count FROM continuous_ctq_analysis_config');
    console.log(`   Found ${parseInt(contCtqResult.rows[0].count)} continuous CTQ analysis configs`);

    // 25. Check Cause Effect Matrix
    console.log('\n🔄 Checking Cause Effect Matrix...');
    const causeEffectResult = await pool.query('SELECT COUNT(*) as count FROM cause_effect_matrix');
    console.log(`   Found ${parseInt(causeEffectResult.rows[0].count)} cause effect matrices`);

    // Final Report
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE CONSISTENCY CHECK RESULTS');
    console.log('='.repeat(80));
    
    if (issues.length === 0) {
      console.log('✅ All consistency checks passed! Your database is in excellent shape.');
    } else {
      console.log(`❌ Found ${totalIssues} consistency issues across ${issues.length} categories:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 Consider running data cleanup scripts to fix these issues.');
    }

    console.log(`\n📊 Database Summary:`);
    console.log(`   • ${orgCount} organizations (${activeOrgCount} active)`);
    console.log(`   • ${userCount} users`);
    console.log(`   • ${projectCount} projects`);
    console.log(`   • ${charterCount} project charters`);
    console.log(`   • ${ctsCount} CTS characteristics`);
    console.log(`   • ${msaCount} MSA analyses`);
    console.log(`   • ${capabilityCount} process capability analyses`);
    console.log(`   • ${rootCauseCount} root cause prioritization entries`);
    console.log(`   • ${fishboneCount} fishbone diagrams`);
    console.log(`   • ${deliverablesCount} gate review deliverables`);
    console.log(`   • ${validatorsCount} gate review validators`);
    console.log(`   • ${ganttCount} gantt tasks`);
    console.log(`   • ${dataPlansCount} data collection plans`);
    console.log(`   • ${customerReqCount} customer requirements`);
    console.log(`   • ${businessReqCount} business requirements`);
    console.log(`   • ${sipocCount} SIPOC diagrams`);
    console.log(`   • ${risksCount} project risk assessments`);
    console.log(`   • ${raciCount} RACI matrices`);
    console.log(`   • ${stakeholderCount} stakeholder analysis items`);
    console.log(`   • ${logsCount} activity log entries`);

  } catch (error) {
    console.error('❌ Error during comprehensive consistency check:', error);
  } finally {
    await pool.end();
  }
}

checkAllTablesConsistency();
