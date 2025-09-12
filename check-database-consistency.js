
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Configure WebSocket for Neon Serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDatabaseConsistency() {
  console.log('🔍 Checking database consistency for organizations, users, and projects...\n');
  
  const issues = [];
  let totalIssues = 0;

  try {
    // 1. Check Organizations table
    console.log('📊 Checking Organizations table...');
    const orgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
    const orgCount = parseInt(orgsResult.rows[0].count);
    console.log(`   Found ${orgCount} organizations`);

    const activeOrgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations WHERE is_active = true');
    const activeOrgCount = parseInt(activeOrgsResult.rows[0].count);
    console.log(`   ${activeOrgCount} are active, ${orgCount - activeOrgCount} are inactive`);

    // 2. Check Users table
    console.log('\n👥 Checking Users table...');
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`   Found ${userCount} users`);

    // Check users without organization_id
    const usersNoOrgResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE organization_id IS NULL');
    const usersNoOrgCount = parseInt(usersNoOrgResult.rows[0].count);
    if (usersNoOrgCount > 0) {
      issues.push(`❌ ${usersNoOrgCount} users have NULL organization_id`);
      totalIssues += usersNoOrgCount;
    }

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

    // 3. Check Projects table
    console.log('\n📋 Checking Projects table...');
    const projectsResult = await pool.query('SELECT COUNT(*) as count FROM projects');
    const projectCount = parseInt(projectsResult.rows[0].count);
    console.log(`   Found ${projectCount} projects`);

    // Check projects without organization_id
    const projectsNoOrgResult = await pool.query('SELECT COUNT(*) as count FROM projects WHERE organization_id IS NULL');
    const projectsNoOrgCount = parseInt(projectsNoOrgResult.rows[0].count);
    if (projectsNoOrgCount > 0) {
      issues.push(`❌ ${projectsNoOrgCount} projects have NULL organization_id`);
      totalIssues += projectsNoOrgCount;
    }

    // Check projects with invalid organization_id
    const invalidOrgProjectsResult = await pool.query(`
      SELECT p.id, p.title, p.organization_id 
      FROM projects p 
      LEFT JOIN organizations o ON p.organization_id = o.id 
      WHERE p.organization_id IS NOT NULL AND o.id IS NULL
    `);
    if (invalidOrgProjectsResult.rows.length > 0) {
      issues.push(`❌ ${invalidOrgProjectsResult.rows.length} projects reference non-existent organizations`);
      console.log('   Invalid organization references:');
      invalidOrgProjectsResult.rows.forEach(project => {
        console.log(`     Project ${project.id} (${project.title}) -> org_id ${project.organization_id}`);
      });
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
      console.log('   Invalid user references:');
      invalidCreatedByResult.rows.forEach(project => {
        console.log(`     Project ${project.id} (${project.title}) -> created_by ${project.created_by}`);
      });
      totalIssues += invalidCreatedByResult.rows.length;
    }

    // 4. Cross-reference checks
    console.log('\n🔗 Cross-reference checks...');
    
    // Check organization usage
    const unusedOrgsResult = await pool.query(`
      SELECT o.id, o.name, o.type 
      FROM organizations o 
      LEFT JOIN users u ON o.id = u.organization_id 
      LEFT JOIN projects p ON o.id = p.organization_id 
      WHERE u.id IS NULL AND p.id IS NULL AND o.is_active = true
    `);
    if (unusedOrgsResult.rows.length > 0) {
      console.log(`   ⚠️  ${unusedOrgsResult.rows.length} active organizations have no users or projects:`);
      unusedOrgsResult.rows.forEach(org => {
        console.log(`     Org ${org.id}: ${org.name} (${org.type})`);
      });
    }

    // Check for orphaned projects (organization exists but is inactive)
    const inactiveOrgProjectsResult = await pool.query(`
      SELECT p.id, p.title, o.name as org_name, o.is_active 
      FROM projects p 
      JOIN organizations o ON p.organization_id = o.id 
      WHERE o.is_active = false
    `);
    if (inactiveOrgProjectsResult.rows.length > 0) {
      console.log(`   ⚠️  ${inactiveOrgProjectsResult.rows.length} projects belong to inactive organizations:`);
      inactiveOrgProjectsResult.rows.forEach(project => {
        console.log(`     Project ${project.id} (${project.title}) -> ${project.org_name}`);
      });
    }

    // 5. Summary statistics
    console.log('\n📈 Summary Statistics:');
    
    // Users per organization
    const usersByOrgResult = await pool.query(`
      SELECT o.name, o.type, COUNT(u.id) as user_count 
      FROM organizations o 
      LEFT JOIN users u ON o.id = u.organization_id 
      WHERE o.is_active = true 
      GROUP BY o.id, o.name, o.type 
      ORDER BY user_count DESC
    `);
    console.log('   Users per organization:');
    usersByOrgResult.rows.forEach(row => {
      console.log(`     ${row.name} (${row.type}): ${row.user_count} users`);
    });

    // Projects per organization
    const projectsByOrgResult = await pool.query(`
      SELECT o.name, o.type, COUNT(p.id) as project_count 
      FROM organizations o 
      LEFT JOIN projects p ON o.id = p.organization_id 
      WHERE o.is_active = true 
      GROUP BY o.id, o.name, o.type 
      ORDER BY project_count DESC
    `);
    console.log('   Projects per organization:');
    projectsByOrgResult.rows.forEach(row => {
      console.log(`     ${row.name} (${row.type}): ${row.project_count} projects`);
    });

    // 6. Final Report
    console.log('\n' + '='.repeat(50));
    console.log('🎯 CONSISTENCY CHECK RESULTS');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
      console.log('✅ All consistency checks passed! Your database is in good shape.');
    } else {
      console.log(`❌ Found ${totalIssues} consistency issues:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('\n💡 Consider running data cleanup scripts to fix these issues.');
    }

    console.log(`\n📊 Database Overview:`);
    console.log(`   • ${orgCount} organizations (${activeOrgCount} active)`);
    console.log(`   • ${userCount} users`);
    console.log(`   • ${projectCount} projects`);

  } catch (error) {
    console.error('❌ Error during consistency check:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseConsistency();
