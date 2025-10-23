import { WebDriver, By } from 'selenium-webdriver';
import {
  waitForElementVisible,
  executeScript,
  clickElement,
  fillInput,
  getAttribute,
  findElement,
  findElements,
  sleep,
  getBoundingBox,
  clickAtCoordinates,
} from '../test-utils';

/**
 * Page Object Model for Quick Capture screen
 */
export class QuickCapturePage {
  constructor(private driver: WebDriver) {}

  async waitForScreen(timeout: number = 10000): Promise<void> {
    await waitForElementVisible(this.driver, '.ytgif-quick-capture-screen', timeout);
  }

  async selectResolution(resolution: '144p' | '240p' | '360p' | '480p'): Promise<void> {
    const selector = `.ytgif-resolution-btn:has-text("${resolution}")`;
    // Selenium doesn't have :has-text, so use XPath instead
    const xpath = `//button[contains(@class, 'ytgif-resolution-btn') and contains(text(), '${resolution}')]`;
    const element = await this.driver.findElement(By.xpath(xpath));
    // Use JavaScript click to avoid obstruction issues
    await this.driver.executeScript('arguments[0].click();', element);
    await sleep(this.driver, 300);
  }

  async getSelectedResolution(): Promise<string | null> {
    const resolutions = ['144p', '240p', '360p', '480p'];

    for (const resolution of resolutions) {
      const xpath = `//button[contains(@class, 'ytgif-resolution-btn') and contains(text(), '${resolution}')]`;
      try {
        const element = await this.driver.findElement(By.xpath(xpath));
        const classes = await element.getAttribute('class');
        if (classes.includes('ytgif-resolution-btn--active') || classes.includes('active')) {
          return resolution;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  async selectFps(fps: '5' | '10' | '15'): Promise<void> {
    // Use XPath to find button with exact text match for fps
    const xpath = `//button[starts-with(normalize-space(text()), '${fps} fps')]`;
    const element = await this.driver.findElement(By.xpath(xpath));
    // Use JavaScript click to avoid obstruction issues
    await this.driver.executeScript('arguments[0].click();', element);
    await sleep(this.driver, 300);
  }

  async getSelectedFps(): Promise<string | null> {
    const fpsOptions = ['5', '10', '15'];

    for (const fps of fpsOptions) {
      const xpath = `//button[starts-with(normalize-space(text()), '${fps} fps')]`;
      try {
        const element = await this.driver.findElement(By.xpath(xpath));
        const classes = await element.getAttribute('class');
        if (classes.includes('ytgif-frame-rate-btn--active') || classes.includes('active')) {
          return fps;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  async setTimeRange(startSeconds: number, endSeconds: number): Promise<void> {
    const videoDuration = await this.getVideoDuration();
    const targetDuration = endSeconds - startSeconds;

    // Validate inputs
    if (startSeconds < 0 || endSeconds > videoDuration || startSeconds >= endSeconds) {
      console.warn(`[Test] Invalid time range: ${startSeconds}-${endSeconds}s (video duration: ${videoDuration}s)`);
      throw new Error(`Invalid time range: ${startSeconds}-${endSeconds}s`);
    }

    // Step 1: Click on timeline to set start position
    const timelineBox = await getBoundingBox(this.driver, '.ytgif-timeline-track');
    if (!timelineBox) {
      throw new Error('Timeline not visible');
    }

    const startPercent = startSeconds / videoDuration;
    const clickX = timelineBox.x + (startPercent * timelineBox.width);
    const clickY = timelineBox.y + (timelineBox.height / 2);

    await clickAtCoordinates(this.driver, clickX, clickY);
    await sleep(this.driver, 300);

    // Step 2: Adjust duration using slider
    await waitForElementVisible(this.driver, '.ytgif-slider-input', 5000);

    // Get slider constraints
    const sliderMax = await getAttribute(this.driver, '.ytgif-slider-input', 'max');
    const maxDuration = sliderMax ? parseFloat(sliderMax) : 20;

    // Clamp duration to slider limits
    const clampedDuration = Math.min(Math.max(targetDuration, 1), maxDuration);

    // Set slider value via JavaScript and trigger change event
    await executeScript(
      this.driver,
      `
        const slider = document.querySelector('.ytgif-slider-input');
        if (slider) {
          slider.value = arguments[0];
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `,
      clampedDuration
    );
    await sleep(this.driver, 300);

    // Step 3: Verify the change took effect
    const actualDuration = await this.getSelectionDuration();
    const tolerance = 0.5;

    if (Math.abs(actualDuration - clampedDuration) > tolerance) {
      console.error(`[Test] Timeline update failed: expected ${clampedDuration}s, got ${actualDuration}s`);
      throw new Error(`Timeline duration mismatch: expected ${clampedDuration}s, got ${actualDuration}s`);
    }

    console.log(`[Test] ✅ Timeline set to ${startSeconds}s - ${endSeconds}s (${actualDuration}s duration)`);
  }

  async playPreview(): Promise<void> {
    await clickElement(this.driver, '.ytgif-preview-play');
    await sleep(this.driver, 500);
  }

  async getSelectionDuration(): Promise<number> {
    // Try to read from duration slider value display
    try {
      const text = await executeScript<string>(
        this.driver,
        'return document.querySelector(".ytgif-slider-value")?.textContent || ""'
      );
      if (text) {
        const match = text.match(/(\d+\.?\d*)\s*s/);
        if (match) return parseFloat(match[1]);
      }
    } catch {
      // Fallback
    }

    // Fallback: Try duration display
    const text = await executeScript<string>(
      this.driver,
      'return document.querySelector(".ytgif-duration-display")?.textContent || ""'
    );

    const match = text.match(/(\d+\.?\d*)\s*s/);
    return match ? parseFloat(match[1]) : 0;
  }

  async clickNext(): Promise<void> {
    // Try primary button first, then fallback to button with "Next" text
    const selectors = ['.ytgif-button-primary', 'button'];

    for (const selector of selectors) {
      try {
        if (selector === 'button') {
          const xpath = '//button[contains(text(), "Next")]';
          const element = await this.driver.findElement(By.xpath(xpath));
          await element.click();
        } else {
          await clickElement(this.driver, selector);
        }
        await sleep(this.driver, 500);
        return;
      } catch {
        continue;
      }
    }
    throw new Error('Next button not found');
  }

  async clickBack(): Promise<void> {
    const xpath = '//button[contains(@class, "ytgif-back-button") or contains(text(), "Back")]';
    const element = await this.driver.findElement(By.xpath(xpath));
    await element.click();
    await sleep(this.driver, 500);
  }

  async isNextButtonEnabled(): Promise<boolean> {
    try {
      const element = await findElement(this.driver, '.ytgif-button-primary');
      if (!element) return false;
      return element.isEnabled();
    } catch {
      return false;
    }
  }

  private async getVideoDuration(): Promise<number> {
    return executeScript<number>(this.driver, () => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && !isNaN(video.duration) ? video.duration : 30;
    });
  }

  async getTimeRangeValues(): Promise<{ start: number; end: number }> {
    const timeText = await executeScript<string>(
      this.driver,
      'return document.querySelector(".ytgif-time-display")?.textContent || ""'
    );

    // Parse text like "0:05 - 0:15"
    const match = timeText.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
    if (match) {
      const start = parseInt(match[1]) * 60 + parseInt(match[2]);
      const end = parseInt(match[3]) * 60 + parseInt(match[4]);
      return { start, end };
    }

    return { start: 0, end: 10 };
  }

  async waitForReady(): Promise<void> {
    await this.waitForScreen();
    await sleep(this.driver, 1000);
  }
}
