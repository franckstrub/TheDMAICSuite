/**
 * Comprehensive audit script to check all database operations for organization_id
 * This will identify patterns where organization_id might be missing
 */

const fs = require('fs');
const path = require('path');

// Read the routes file
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Patterns to search for database operations that might be missing organization_id
const patterns = [
  /storage\.create\w*\(/g,
  /storage\.update\w*\(/g,
  /\.insert\(/g,
  /\.update\(/g,
  /db\.insert\(/g,
  /db\.update\(/g,
];

console.log('=== AUDIT: Database Operations Missing Organization ID ===\n');

// Find all matches
patterns.forEach((pattern, index) => {
  const matches = [...routesContent.matchAll(pattern)];
  if (matches.length > 0) {
    console.log(`Pattern ${index + 1}: ${pattern.source}`);
    matches.forEach(match => {
      const lineNumber = routesContent.substring(0, match.index).split('\n').length;
      const line = routesContent.split('\n')[lineNumber - 1].trim();
      console.log(`  Line ${lineNumber}: ${line}`);
    });
    console.log('');
  }
});

// Check for specific endpoints that commonly miss organization_id
const criticalEndpoints = [
  'POST.*requirements',
  'POST.*business-requirements', 
  'POST.*sipoc',
  'POST.*risks',
  'POST.*stakeholder-analysis',
  'POST.*raci-matrix',
  'POST.*process-capability',
  'POST.*msa-analysis',
  'POST.*gantt-tasks',
  'POST.*gate-review',
];

console.log('=== CRITICAL ENDPOINTS TO CHECK ===\n');

criticalEndpoints.forEach(endpoint => {
  const regex = new RegExp(`app\\.post\\(["'].*${endpoint}`, 'gi');
  const matches = [...routesContent.matchAll(regex)];
  matches.forEach(match => {
    const lineNumber = routesContent.substring(0, match.index).split('\n').length;
    console.log(`${endpoint} - Line ${lineNumber}`);
  });
});