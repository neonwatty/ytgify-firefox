import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Global setup for Selenium real E2E tests
 * Ensures extension is built before tests run
 *
 * NOTE: With Selenium WebDriver, extension loads automatically!
 * No manual about:debugging setup required.
 */
async function globalSetup() {
  console.log('\n🔧 [Selenium] Running real E2E global setup...\n');

  const distPath = path.join(process.cwd(), 'dist');

  // Check if dist folder exists
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building extension (dist folder not found)...');
    try {
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Extension built successfully\n');
    } catch (error) {
      console.error('❌ Failed to build extension:', error);
      throw error;
    }
  } else {
    // Check if manifest exists
    const manifestPath = path.join(distPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.log('📦 Building extension (manifest.json not found)...');
      try {
        execSync('npm run build', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Extension built successfully\n');
      } catch (error) {
        console.error('❌ Failed to build extension:', error);
        throw error;
      }
    } else {
      console.log('✅ Extension already built\n');
    }
  }

  console.log('✅ Extension will be auto-loaded by Selenium WebDriver');
  console.log('   No manual about:debugging setup required!\n');

  // Create test results directories
  const dirs = [
    path.join(process.cwd(), 'test-results'),
    path.join(process.cwd(), 'test-results', 'selenium-real'),
    path.join(process.cwd(), 'test-results', 'artifacts-selenium-real'),
    path.join(process.cwd(), 'test-results', 'screenshots-selenium-real'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log('✅ [Selenium] Real E2E global setup complete!\n');
  console.log('═══════════════════════════════════════');
  console.log('  Extension:  ', distPath);
  console.log('  Framework:   Selenium WebDriver');
  console.log('  Auto-load:   Enabled');
  console.log('═══════════════════════════════════════\n');
}

export default globalSetup;
