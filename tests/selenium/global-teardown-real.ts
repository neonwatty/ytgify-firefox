/**
 * Global teardown for Selenium real E2E tests
 * Cleanup test artifacts
 */
async function globalTeardown() {
  console.log('\n🧹 [Selenium] Running real E2E global teardown...\n');

  try {
    // Cleanup could go here if needed
    // For now, just log completion
    console.log('✅ [Selenium] Real E2E global teardown complete\n');
  } catch (error) {
    console.error('⚠️  Error during teardown:', error);
    // Don't fail the build if teardown has issues
  }
}

export default globalTeardown;
