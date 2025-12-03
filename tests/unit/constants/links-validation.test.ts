import { describe, it, expect, jest } from '@jest/globals';
import https from 'https';
import { LINKS } from '@/constants/links';
import { EXTERNAL_SURVEY_URL } from '@/constants/features';

// Skip link validation tests when SKIP_LINK_VALIDATION env var is set
// Useful for CI environments where network access may be restricted
const describeOrSkip = process.env.SKIP_LINK_VALIDATION
  ? describe.skip
  : describe;

/**
 * Check if a URL is reachable using Node's native https module
 * Returns the final status code after following redirects (up to 5)
 */
function checkUrl(url: string, maxRedirects = 5): Promise<number> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string, redirectCount: number) => {
      const req = https.get(
        currentUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; YTgify-LinkChecker/1.0; +https://github.com/neonwatty/ytgify)',
          },
        },
        (res) => {
          // Consume the response to prevent open handles
          res.resume();

          // Follow redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            if (redirectCount >= maxRedirects) {
              resolve(res.statusCode);
              return;
            }
            // Handle relative redirects
            const redirectUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, currentUrl).toString();
            makeRequest(redirectUrl, redirectCount + 1);
            return;
          }
          resolve(res.statusCode || 0);
        }
      );
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    };
    makeRequest(url, 0);
  });
}

describeOrSkip('External Links Validation', () => {
  // 30 second timeout for network requests
  jest.setTimeout(30000);

  it.each([
    ['ADDON_LISTING', LINKS.ADDON_LISTING],
    ['ADDON_REVIEWS', LINKS.ADDON_REVIEWS],
    ['GITHUB_REPO', LINKS.GITHUB_REPO],
    ['GITHUB_STARS', LINKS.GITHUB_STARS],
    ['GITHUB_ISSUES', LINKS.GITHUB_ISSUES],
    ['TWITTER_PROFILE', LINKS.TWITTER_PROFILE],
    ['DISCORD_INVITE', LINKS.DISCORD_INVITE],
    ['DOCS_USER_GUIDE', LINKS.DOCS_USER_GUIDE],
    ['EXTERNAL_SURVEY_URL', EXTERNAL_SURVEY_URL],
  ])('%s is reachable', async (_name, url) => {
    const statusCode = await checkUrl(url);
    // Accept 2xx and 3xx status codes
    expect(statusCode).toBeGreaterThanOrEqual(200);
    expect(statusCode).toBeLessThan(400);
  });
});
