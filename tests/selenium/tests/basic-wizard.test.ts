/**
 * Basic Wizard Test - Selenium E2E
 * Validates complete GIF creation workflow with Selenium WebDriver
 */

import { WebDriver } from 'selenium-webdriver';
import { createFirefoxDriver } from '../firefox-driver';
import { YouTubePage, QuickCapturePage, TextOverlayPage, ProcessingPage, SuccessPage } from '../page-objects';

describe('Selenium E2E: Basic Wizard', () => {
  let driver: WebDriver;
  const testTimeout = 120000; // 2 minutes

  beforeEach(async () => {
    const headless = process.env.HEADLESS !== 'false';
    driver = await createFirefoxDriver(undefined, headless);
  }, 30000);

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it(
    'should load extension and show GIF button on YouTube',
    async () => {
      const youtube = new YouTubePage(driver);

      // Navigate to YouTube
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      console.log('[Test] Navigating to YouTube...');
      await youtube.navigateToVideo(testUrl);
      console.log('[Test] YouTube loaded');

      // Wait extra time for extension to inject (important for Selenium)
      console.log('[Test] Waiting for extension to inject button...');
      await youtube.waitForExtensionLoad(30000);

      // Verify GIF button is visible
      console.log('[Test] Checking if GIF button is visible...');
      const isVisible = await youtube.isGifButtonVisible();
      console.log(`[Test] GIF button visible: ${isVisible}`);

      expect(isVisible).toBe(true);

      console.log('✅ Extension loaded and GIF button visible');
    },
    testTimeout
  );

  it(
    'should open wizard when clicking GIF button',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);

      // Navigate to YouTube
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await youtube.navigateToVideo(testUrl);

      // Click GIF button
      await youtube.openGifWizard();

      // Verify wizard opened
      await quickCapture.waitForScreen(10000);

      console.log('✅ Wizard opened successfully');
    },
    testTimeout
  );

  it(
    'should create a simple GIF (complete workflow)',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      console.log('[Test] Starting complete GIF creation workflow...');

      // Step 1: Navigate to YouTube
      console.log('[Test] [1/6] Navigating to YouTube...');
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await youtube.navigateToVideo(testUrl);
      console.log('[Test] ✅ YouTube loaded');

      // Step 2: Open wizard
      console.log('[Test] [2/6] Opening wizard...');
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();
      console.log('[Test] ✅ Wizard opened');

      // Step 3: Configure GIF settings (use defaults, just click Next)
      console.log('[Test] [3/6] Configuring GIF settings...');
      await quickCapture.clickNext();
      console.log('[Test] ✅ Settings configured');

      // Step 4: Skip text overlay
      console.log('[Test] [4/6] Skipping text overlay...');
      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();
      console.log('[Test] ✅ Text overlay skipped');

      // Step 5: Wait for processing
      console.log('[Test] [5/6] Processing GIF (this may take 30-60 seconds)...');
      await processing.waitForCompletion(90000); // 90 seconds max
      console.log('[Test] ✅ Processing complete');

      // Step 6: Verify success
      console.log('[Test] [6/6] Verifying GIF created...');
      await success.waitForScreen();

      const gifUrl = await success.getGifUrl();
      expect(gifUrl).toBeTruthy();

      const isValid = gifUrl!.startsWith('data:image/gif') || gifUrl!.startsWith('blob:');
      expect(isValid).toBe(true);

      console.log('[Test] ✅ GIF created successfully!');
      console.log(`[Test] GIF URL type: ${gifUrl!.substring(0, 20)}...`);
    },
    testTimeout
  );
});
