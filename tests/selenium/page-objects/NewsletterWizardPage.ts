/**
 * Page object for the Newsletter Wizard overlay
 */
import { WebDriver, By, until, WebElement } from 'selenium-webdriver';

export class NewsletterWizardPage {
  constructor(private driver: WebDriver) {}

  /**
   * Wait for newsletter wizard overlay to appear
   */
  async waitForWizard(timeout = 5000): Promise<boolean> {
    try {
      await this.driver.wait(
        until.elementLocated(By.id('ytgif-newsletter-wizard-root')),
        timeout
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if newsletter wizard is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      const overlay = await this.driver.findElement(By.id('ytgif-newsletter-wizard-root'));
      return await overlay.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the wizard title
   */
  async getTitle(): Promise<string> {
    const titleElement = await this.driver.findElement(By.css('.ytgif-wizard-title'));
    return await titleElement.getText();
  }

  /**
   * Check if GitHub link is present
   */
  async hasGitHubLink(): Promise<boolean> {
    try {
      const links = await this.driver.findElements(
        By.css('.ytgif-feedback-link[href*="github.com"]')
      );
      return links.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if X/Twitter link is present
   */
  async hasTwitterLink(): Promise<boolean> {
    try {
      const links = await this.driver.findElements(
        By.css('.ytgif-feedback-link[href*="x.com"]')
      );
      return links.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if newsletter subscription link is present
   */
  async hasNewsletterLink(): Promise<boolean> {
    try {
      const links = await this.driver.findElements(
        By.css('.ytgif-feedback-link[href*="beehiiv.com"]')
      );
      return links.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if review button is present
   */
  async hasReviewButton(): Promise<boolean> {
    try {
      const button = await this.driver.findElement(By.css('.ytgif-support-btn'));
      const text = await button.getText();
      return text.includes('review');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Back button is visible (should be hidden in standalone mode)
   */
  async hasBackButton(): Promise<boolean> {
    try {
      const buttons = await this.driver.findElements(
        By.xpath("//button[contains(text(), 'Back')]")
      );
      if (buttons.length === 0) {
        return false;
      }
      return await buttons[0].isDisplayed();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the Close button
   */
  async getCloseButton(): Promise<WebElement> {
    // Try both the primary button and the X close button
    try {
      return await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Close')]")
      );
    } catch (error) {
      return await this.driver.findElement(By.css('.ytgif-wizard-close'));
    }
  }

  /**
   * Click the Close button
   */
  async clickClose(): Promise<void> {
    const closeButton = await this.getCloseButton();
    await closeButton.click();
  }

  /**
   * Wait for wizard to close
   */
  async waitForClose(timeout = 3000): Promise<boolean> {
    try {
      // Wait for the element to no longer be present in the DOM
      await this.driver.wait(
        async () => {
          const elements = await this.driver.findElements(By.id('ytgif-newsletter-wizard-root'));
          return elements.length === 0;
        },
        timeout
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify newsletter wizard is in standalone mode
   * (no Back button, Close button instead of Done)
   */
  async isStandaloneMode(): Promise<boolean> {
    const hasBack = await this.hasBackButton();

    try {
      const closeButton = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Close')]")
      );
      const hasClose = await closeButton.isDisplayed();
      return !hasBack && hasClose;
    } catch (error) {
      return false;
    }
  }
}
