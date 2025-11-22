/**
 * Duplicate Frames / Freeze Frame Test with Screenshots
 * Captures screenshots at each step for documentation
 */

import { WebDriver } from 'selenium-webdriver';
import { createFirefoxDriver } from '../firefox-driver';
import { YouTubePage, QuickCapturePage, TextOverlayPage, ProcessingPage, SuccessPage } from '../page-objects';
import * as fs from 'fs';
import * as path from 'path';

const screenshotDir = path.join(process.cwd(), 'tests/test-results/selenium-screenshots');

async function takeScreenshot(driver: WebDriver, name: string): Promise<void> {
  const screenshot = await driver.takeScreenshot();
  const filepath = path.join(screenshotDir, `${name}.png`);
  fs.writeFileSync(filepath, screenshot, 'base64');
  console.log(`[Screenshot] Saved: ${name}.png`);
}

describe('Selenium E2E: Duplicate Frames with Screenshots', () => {
  let driver: WebDriver;
  const testTimeout = 180000;

  beforeAll(() => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

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
    'Create GIF with freeze frames - 15 fps with screenshots',
    async () => {
      const youtube = new YouTubePage(driver);
      const quickCapture = new QuickCapturePage(driver);
      const textOverlay = new TextOverlayPage(driver);
      const processing = new ProcessingPage(driver);
      const success = new SuccessPage(driver);

      console.log('[Test] Starting test with screenshots...');

      // Step 1: Navigate to YouTube
      console.log('[Test] Step 1: Navigate to YouTube video');
      const startTime = 529;
      const testUrl = `https://www.youtube.com/watch?v=NBZv0_MImIY&t=${startTime}s`;
      await youtube.navigateToVideo(testUrl);
      await takeScreenshot(driver, '01-youtube-loaded');

      // Step 2: Seek and pause
      console.log('[Test] Step 2: Seek to 8:49 and pause');
      await youtube.seekToTime(startTime);
      await youtube.pauseVideo();
      await driver.sleep(1000);
      await takeScreenshot(driver, '02-video-seeked');

      // Step 3: Open wizard
      console.log('[Test] Step 3: Open GIF wizard');
      await youtube.openGifWizard();
      await quickCapture.waitForScreen();
      await driver.sleep(500);
      await takeScreenshot(driver, '03-wizard-opened');

      // Step 4: Set time range
      console.log('[Test] Step 4: Set time range');
      const endTime = 533.8;
      await quickCapture.setTimeRange(startTime, endTime, true);
      await driver.sleep(500);
      await takeScreenshot(driver, '04-time-range-set');

      // Step 5: Select 15 fps
      console.log('[Test] Step 5: Select 15 fps');
      await quickCapture.selectFps('15');
      await driver.sleep(500);
      await takeScreenshot(driver, '05-fps-selected');

      // Step 6: Click Next
      console.log('[Test] Step 6: Proceed to text overlay');
      await quickCapture.clickNext();
      await textOverlay.waitForScreen();
      await driver.sleep(500);
      await takeScreenshot(driver, '06-text-overlay-screen');

      // Step 7: Skip text overlay
      console.log('[Test] Step 7: Skip text overlay');
      await textOverlay.clickSkip();
      await driver.sleep(1000);
      await takeScreenshot(driver, '07-processing-started');

      // Step 8: Wait for processing (take screenshots during)
      console.log('[Test] Step 8: Processing GIF...');
      await driver.sleep(5000);
      await takeScreenshot(driver, '08-processing-progress');

      await processing.waitForCompletion(120000);
      await driver.sleep(500);
      await takeScreenshot(driver, '09-processing-complete');

      // Step 9: Verify success
      console.log('[Test] Step 9: Verify GIF created');
      await success.waitForScreen();
      await driver.sleep(1000);
      await takeScreenshot(driver, '10-success-screen');

      const gifUrl = await success.getGifUrl();
      expect(gifUrl).toBeTruthy();
      expect(gifUrl!.startsWith('data:image/gif') || gifUrl!.startsWith('blob:')).toBe(true);

      // Save the GIF file
      console.log('[Test] Step 10: Saving GIF output...');
      if (gifUrl!.startsWith('data:image/gif')) {
        const base64Data = gifUrl!.split(',')[1];
        const gifPath = path.join(screenshotDir, 'output.gif');
        fs.writeFileSync(gifPath, base64Data, 'base64');
        console.log(`[GIF] Saved: output.gif`);
      }

      console.log('[Test] ✅ Test complete - all screenshots and GIF saved to:');
      console.log(`[Test] ${screenshotDir}`);
    },
    testTimeout
  );
});
