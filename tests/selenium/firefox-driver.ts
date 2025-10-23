import { Builder, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/firefox';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Firefox WebDriver factory for E2E tests
 * Automatically loads the extension using installAddon()
 */
export async function createFirefoxDriver(
  extensionPath?: string,
  headless = false
): Promise<WebDriver> {
  // Default to dist folder if no path provided
  // Use process.cwd() as fallback since __dirname may not be available in all contexts
  const extPath = extensionPath || path.join(process.cwd(), 'dist');

  // Firefox options
  const options = new Options()
    .setPreference('xpinstall.signatures.required', false)
    .setPreference('extensions.webextensions.restrictedDomains', '')
    .setPreference('extensions.install.requireBuiltInCerts', false)
    .setPreference('extensions.update.enabled', false)
    .setPreference('extensions.update.notifyUser', false);

  if (headless) {
    options.addArguments('-headless');
  }

  // Build driver
  const driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();

  // Set timeouts
  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: 45000,
    script: 30000,
  });

  // Install extension as temporary addon (required for unsigned extensions)
  try {
    console.log(`[Selenium] Installing extension from: ${extPath}`);
    await driver.installAddon(extPath, true); // true = temporary
    console.log('[Selenium] Extension installed successfully');

    // Wait for extension to initialize
    // Note: Extension automatically shows button on localhost for E2E tests
    await driver.sleep(1000);
  } catch (error) {
    console.error('[Selenium] Failed to install extension:', error);
    await driver.quit();
    throw error;
  }

  return driver;
}

/**
 * Get extension ID from Firefox
 * Firefox uses the ID from manifest browser_specific_settings
 */
export function getExtensionId(): string {
  return 'ytgify@firefox.extension';
}
