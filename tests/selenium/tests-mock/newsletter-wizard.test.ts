/**
 * Newsletter Wizard tests using mock YouTube
 * Tests the Stay Connected button and newsletter wizard functionality
 * Selenium E2E Mock Test
 */

import { WebDriver, By, until } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs';
import { createFirefoxDriver } from '../firefox-driver';
import {
  YouTubePage,
  SuccessPage,
  QuickCapturePage,
  TextOverlayPage,
  ProcessingPage,
  NewsletterWizardPage,
} from '../page-objects';
import { getMockVideoUrl } from '../helpers';

describe('Mock E2E: Newsletter Wizard Tests (Selenium)', () => {
  let driver: WebDriver;
  let mockServerUrl: string;

  beforeEach(async () => {
    const stateFile = path.join(process.cwd(), 'test-results', 'selenium-mock-state.json');
    if (!fs.existsSync(stateFile)) {
      throw new Error('Mock server state file not found. Did global setup run?');
    }

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    mockServerUrl = state.serverUrl;

    const headless = process.env.HEADLESS !== 'false';
    driver = await createFirefoxDriver(undefined, headless);
  }, 30000);

  afterEach(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // ========== Success Screen Newsletter Wizard Tests ==========

  it('Opens newsletter wizard from Stay Connected button on success screen', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);
    const newsletter = new NewsletterWizardPage(driver);

    // Navigate to video
    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));

    // Open wizard
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();

    // Create GIF through wizard
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickNext();
    await processing.waitForScreen();
    await processing.waitForCompletion(30000);
    await success.waitForScreen();

    console.log('[Newsletter Test] Success screen displayed');

    // Click Stay Connected button
    const hasStayConnected = await success.hasStayConnectedButton();
    expect(hasStayConnected).toBe(true);

    await success.clickStayConnected();

    // Wait for newsletter wizard
    const wizardOpened = await newsletter.waitForWizard();
    expect(wizardOpened).toBe(true);

    console.log('[Newsletter Test] Newsletter wizard opened');

    // Verify wizard is visible
    const isVisible = await newsletter.isVisible();
    expect(isVisible).toBe(true);

    // Verify wizard title
    const title = await newsletter.getTitle();
    expect(title).toContain('Help Us Improve');

    // Verify wizard content
    const hasGitHub = await newsletter.hasGitHubLink();
    const hasNewsletter = await newsletter.hasNewsletterLink();
    const hasReview = await newsletter.hasReviewButton();

    expect(hasGitHub).toBe(true);
    expect(hasNewsletter).toBe(true);
    expect(hasReview).toBe(true);

    console.log('[Newsletter Test] All newsletter links verified');

    // Verify standalone mode (no Back button, Close button present)
    const isStandalone = await newsletter.isStandaloneMode();
    expect(isStandalone).toBe(true);

    console.log('[Newsletter Test] Verified standalone mode');

    // Close wizard
    await newsletter.clickClose();
    const wizardClosed = await newsletter.waitForClose();
    expect(wizardClosed).toBe(true);

    console.log('✅ [Newsletter Test] Newsletter wizard flow from success screen complete!');
  }, 60000);

  it('Newsletter wizard closes when clicking Close button', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);
    const newsletter = new NewsletterWizardPage(driver);

    // Navigate and create GIF
    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickNext();
    await processing.waitForScreen();
    await processing.waitForCompletion(30000);
    await success.waitForScreen();

    // Open newsletter wizard
    await success.clickStayConnected();
    await newsletter.waitForWizard();

    // Verify wizard is open
    const isVisibleBefore = await newsletter.isVisible();
    expect(isVisibleBefore).toBe(true);

    // Close wizard
    await newsletter.clickClose();

    // Verify wizard is closed
    const wizardClosed = await newsletter.waitForClose();
    expect(wizardClosed).toBe(true);

    const isVisibleAfter = await newsletter.isVisible();
    expect(isVisibleAfter).toBe(false);

    console.log('✅ [Newsletter Test] Newsletter wizard closes correctly!');
  }, 60000);

  it('Newsletter wizard has no Back button in standalone mode', async () => {
    const youtube = new YouTubePage(driver);
    const quickCapture = new QuickCapturePage(driver);
    const textOverlay = new TextOverlayPage(driver);
    const processing = new ProcessingPage(driver);
    const success = new SuccessPage(driver);
    const newsletter = new NewsletterWizardPage(driver);

    // Navigate and create GIF
    await youtube.navigateToVideo(getMockVideoUrl('veryShort', mockServerUrl));
    await youtube.openGifWizard();
    await quickCapture.waitForScreen();
    await quickCapture.clickNext();
    await textOverlay.waitForScreen();
    await textOverlay.clickNext();
    await processing.waitForScreen();
    await processing.waitForCompletion(30000);
    await success.waitForScreen();

    // Open newsletter wizard
    await success.clickStayConnected();
    await newsletter.waitForWizard();

    // Verify no Back button (standalone mode)
    const hasBack = await newsletter.hasBackButton();
    expect(hasBack).toBe(false);

    console.log('✅ [Newsletter Test] No Back button in standalone mode!');
  }, 60000);
});
