#!/usr/bin/env node

/**
 * Test summary script that extracts and displays test results clearly
 * Usage: node scripts/test-summary.js <jest-output>
 */

const fs = require('fs');
const { spawn } = require('child_process');

function parseJestOutput(output) {
  // Find test summary line - handles multiple formats
  // Format 1: "Test Suites: X failed, Y passed, Z total"
  // Format 2: "Test Suites: Y passed, Z total" (all passed)
  let summaryMatch = output.match(/Test Suites:\s+(\d+)\s+failed,?\s*(\d+)\s+passed,?\s*(\d+)\s+total/i);
  
  let testSuitesFailed = 0;
  let testSuitesPassed = 0;
  let testSuitesTotal = 0;
  
  if (summaryMatch) {
    testSuitesFailed = parseInt(summaryMatch[1]) || 0;
    testSuitesPassed = parseInt(summaryMatch[2]) || 0;
    testSuitesTotal = parseInt(summaryMatch[3]) || 0;
  } else {
    // Try format without failures
    summaryMatch = output.match(/Test Suites:\s+(\d+)\s+passed,?\s*(\d+)\s+total/i);
    if (summaryMatch) {
      testSuitesPassed = parseInt(summaryMatch[1]) || 0;
      testSuitesTotal = parseInt(summaryMatch[2]) || 0;
      testSuitesFailed = 0;
    }
  }
  
  // Find tests summary - handles multiple formats
  // Format 1: "Tests: X failed, Y passed, Z total"
  // Format 2: "Tests: Y passed, Z total" (all passed)
  let testsMatch = output.match(/Tests:\s+(\d+)\s+failed,?\s*(\d+)\s+passed,?\s*(\d+)\s+total/i);
  
  let testsFailed = 0;
  let testsPassed = 0;
  let testsTotal = 0;
  
  if (testsMatch) {
    testsFailed = parseInt(testsMatch[1]) || 0;
    testsPassed = parseInt(testsMatch[2]) || 0;
    testsTotal = parseInt(testsMatch[3]) || 0;
  } else {
    // Try format without failures
    testsMatch = output.match(/Tests:\s+(\d+)\s+passed,?\s*(\d+)\s+total/i);
    if (testsMatch) {
      testsPassed = parseInt(testsMatch[1]) || 0;
      testsTotal = parseInt(testsMatch[2]) || 0;
      testsFailed = 0;
    }
  }
  
  return {
    testSuites: {
      failed: testSuitesFailed,
      passed: testSuitesPassed,
      total: testSuitesTotal,
    },
    tests: {
      failed: testsFailed,
      passed: testsPassed,
      total: testsTotal,
    },
  };
}

function printSummary(stats, suiteName = '') {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TEST SUMMARY${suiteName ? ` - ${suiteName}` : ''}`);
  console.log('='.repeat(60));
  
  console.log('\n📦 Test Suites:');
  console.log(`   ✅ Passed:  ${stats.testSuites.passed}`);
  console.log(`   ❌ Failed:  ${stats.testSuites.failed}`);
  console.log(`   📊 Total:   ${stats.testSuites.total}`);
  
  console.log('\n🧪 Tests:');
  console.log(`   ✅ Passed:  ${stats.tests.passed}`);
  console.log(`   ❌ Failed:  ${stats.tests.failed}`);
  console.log(`   📊 Total:   ${stats.tests.total}`);
  
  if (stats.tests.total > 0) {
    const passRate = ((stats.tests.passed / stats.tests.total) * 100).toFixed(1);
    console.log(`   📈 Pass Rate: ${passRate}%`);
  }
  
  console.log('='.repeat(60) + '\n');
}

// If running directly, execute jest and parse output
if (require.main === module) {
  const args = process.argv.slice(2);
  const testPath = args[0] || 'tests';
  
  // Run E2E and integration tests sequentially to avoid race conditions
  const jestArgs = [testPath, '--no-coverage'];
  if (testPath.includes('e2e') || testPath.includes('integration')) {
    jestArgs.push('--runInBand');
  }
  
  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'pipe',
    shell: true,
  });
  
  let output = '';
  let errorOutput = '';
  
  jest.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    output += text;
  });
  
  jest.stderr.on('data', (data) => {
    const text = data.toString();
    process.stderr.write(text);
    errorOutput += text;
  });
  
  jest.on('close', (code) => {
    const stats = parseJestOutput(output + errorOutput);
    printSummary(stats, testPath);
    process.exit(code);
  });
}

module.exports = { parseJestOutput, printSummary };

