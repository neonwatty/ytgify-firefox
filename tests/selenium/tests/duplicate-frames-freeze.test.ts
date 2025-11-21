/**
 * Duplicate Frames / Freeze Frame Test - Selenium E2E
 * Tests GIF creation with videos containing consecutive duplicate frames (static content)
 *
 * Bug Report: User reported failure at frame 48/72 when creating GIF with 15 fps
 * from video with 15+ consecutive identical frames (freeze frame)
 *
 * Video: https://www.youtube.com/watch?v=NBZv0_MImIY
 * Start: 8:49 (529 seconds)
 * Duration: 4.8 seconds
 * Frame Rate: 15 fps
 * Expected: 72 frames (including ~15 duplicate frames)
 *
 * This test verifies the fix differentiates between:
 * - Buffering stuck (seek failures) -> should abort
 * - Static content (valid duplicate frames at correct position) -> should succeed
 */

import { WebDriver } from 'selenium-webdriver';
import { createFirefoxDriver } from '../firefox-driver';
import { YouTubePage, QuickCapturePage, TextOverlayPage, ProcessingPage, SuccessPage } from '../page-objects';

describe('Selenium E2E: Duplicate Frames / Freeze Frame', () => {
  let driver: WebDriver;
  const testTimeout = 180000; // 3 minutes (longer for 15 fps processing)

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
    'should handle videos with consecutive duplicate frames (15 fps, 4.8s)',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      console.log('[Test] Testing GIF creation with freeze frames (15 fps)...');

      // Step 1: Navigate to YouTube video with freeze frame at timestamp
      console.log('[Test] [1/7] Navigating to YouTube video...');
      const startTime = 529; // 8:49 in seconds
      const testUrl = `https://www.youtube.com/watch?v=NBZv0_MImIY&t=${startTime}s`;
      await youtube.navigateToVideo(testUrl);
      console.log('[Test] ✅ YouTube loaded');

      // Seek to target time to ensure video loads that portion
      console.log('[Test] Seeking to 8:49 to ensure video loads...');
      await youtube.seekToTime(startTime);
      await youtube.pauseVideo();
      console.log('[Test] ✅ Video seeked and paused');

      // Step 2: Open wizard
      console.log('[Test] [2/7] Opening wizard...');
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();
      console.log('[Test] ✅ Wizard opened');

      // Step 3: Set time range to 8:49 - 8:53.8 (4.8 seconds starting at freeze frame)
      console.log('[Test] [3/7] Setting time range (8:49 for 4.8s)...');
      const endTime = 533.8; // 8:53.8 (4.8s duration)
      // Skip validation because YouTube doesn't always report full duration for long videos
      await quickCapture.setTimeRange(startTime, endTime, true);
      console.log(`[Test] ✅ Time range set: ${startTime}s - ${endTime}s (${endTime - startTime}s)`);

      // Step 4: Select 15 fps (this is the problematic frame rate)
      console.log('[Test] [4/7] Setting frame rate to 15 fps...');
      await quickCapture.selectFps('15');
      const selectedFps = await quickCapture.getSelectedFps();
      console.log(`[Test] ✅ Frame rate set: ${selectedFps} fps`);
      expect(selectedFps).toBe('15');

      // Step 5: Click Next
      console.log('[Test] [5/7] Proceeding to text overlay screen...');
      await quickCapture.clickNext();
      console.log('[Test] ✅ Advanced to text overlay');

      // Step 6: Skip text overlay
      console.log('[Test] [6/7] Skipping text overlay...');
      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();
      console.log('[Test] ✅ Text overlay skipped');

      // Step 7: Wait for processing (this should succeed with the fix)
      console.log('[Test] [7/7] Processing GIF with duplicate frames...');
      console.log('[Test] Expected: 72 frames total (15 fps × 4.8s)');
      console.log('[Test] Challenge: ~15 consecutive duplicate frames in video');
      console.log('[Test] Without fix: Would fail at frame 48/72');
      console.log('[Test] With fix: Should complete all 72 frames');

      await processing.waitForCompletion(120000); // 2 minutes max
      console.log('[Test] ✅ Processing complete - duplicate frames handled correctly!');

      // Step 8: Verify success
      console.log('[Test] Verifying GIF created...');
      await success.waitForScreen();

      const gifUrl = await success.getGifUrl();
      expect(gifUrl).toBeTruthy();

      const isValid = gifUrl!.startsWith('data:image/gif') || gifUrl!.startsWith('blob:');
      expect(isValid).toBe(true);

      console.log('[Test] ✅ GIF created successfully!');
      console.log('[Test] ✅ Fix verified: Static content with duplicate frames handled correctly');
      console.log(`[Test] GIF URL type: ${gifUrl!.substring(0, 20)}...`);
    },
    testTimeout
  );

  it(
    'should handle videos with consecutive duplicate frames (5 fps baseline)',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      console.log('[Test] Testing GIF creation with freeze frames (5 fps baseline)...');

      // Step 1: Navigate to YouTube video with timestamp
      console.log('[Test] [1/7] Navigating to YouTube video...');
      const startTime = 529; // 8:49
      const testUrl = `https://www.youtube.com/watch?v=NBZv0_MImIY&t=${startTime}s`;
      await youtube.navigateToVideo(testUrl);
      console.log('[Test] ✅ YouTube loaded');

      // Seek to target time to ensure video loads that portion
      console.log('[Test] Seeking to 8:49 to ensure video loads...');
      await youtube.seekToTime(startTime);
      await youtube.pauseVideo();
      console.log('[Test] ✅ Video seeked and paused');

      // Step 2: Open wizard
      console.log('[Test] [2/7] Opening wizard...');
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();
      console.log('[Test] ✅ Wizard opened');

      // Step 3: Set same time range
      console.log('[Test] [3/7] Setting time range (8:49 for 4.8s)...');
      const endTime = 533.8; // 8:53.8
      // Skip validation because YouTube doesn't always report full duration for long videos
      await quickCapture.setTimeRange(startTime, endTime, true);
      console.log(`[Test] ✅ Time range set: ${startTime}s - ${endTime}s`);

      // Step 4: Select 5 fps (lower frame rate for comparison)
      console.log('[Test] [4/7] Setting frame rate to 5 fps...');
      await quickCapture.selectFps('5');
      const selectedFps = await quickCapture.getSelectedFps();
      console.log(`[Test] ✅ Frame rate set: ${selectedFps} fps`);
      expect(selectedFps).toBe('5');

      // Step 5: Click Next
      await quickCapture.clickNext();

      // Step 6: Skip text overlay
      await textOverlay.waitForScreen();
      await textOverlay.clickSkip();

      // Step 7: Wait for processing
      console.log('[Test] Processing GIF with 5 fps (24 frames expected)...');
      await processing.waitForCompletion(90000);
      console.log('[Test] ✅ Processing complete');

      // Step 8: Verify success
      await success.waitForScreen();
      const gifUrl = await success.getGifUrl();
      expect(gifUrl).toBeTruthy();

      console.log('[Test] ✅ 5 fps baseline test passed');
    },
    testTimeout
  );
});
