# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, split by concern: `background/` for event-page orchestration, `content/` for YouTube DOM hooks, `popup/` for the UI shell, and shared logic in `lib/`, `shared/`, `utils/`, and `types/`. Reusable React pieces sit in `components/`, while theme tokens are in `themes/`. Keep assets in `icons/` and style sheets beside their owners (`popup/styles*.css`). Webpack outputs to `dist/`; treat it as disposable (`npm run clean`) and never edit it directly. Automated tests, fixtures, and configs reside under `tests/`, including Selenium suites (`tests/selenium`) and Playwright mocks (`tests/playwright*`, `tests/e2e-mock/`).

## Build, Test, and Development Commands
- `npm run dev` – Runs webpack in watch mode and updates `dist/` continuously.
- `npm run dev:firefox` – Launches `web-ext run` with the `ytgify-dev` profile for live reloading.
- `npm run build` – Produces a production bundle in `dist/`.
- `npm run lint:code` / `npm run typecheck` – ESLint + TypeScript gates for incremental checks.
- `npm test` / `npm run test:coverage` – Executes Jest suites with optional coverage reporting.
- `npm run test:selenium:real` – Mandatory full-browser regression before merging.
- `npm run package` – Builds a distributable `.xpi`; pair with `npm run sign` when shipping.

## Coding Style & Naming Conventions
We use TypeScript + React function components with hooks. Prettier drives formatting (`npm run format` / `npm run format:check`), enforcing two-space indentation, single quotes, and trailing semicolons. ESLint (`eslint.config.js`) flags unsafe patterns; document any intentional `any`. Prefer the `@/` path aliases defined in `tsconfig.json` over deep relative imports. Name React files in kebab-case (`timeline-overlay.tsx`), collocate styles, and keep Tailwind utility strings readable by grouping related classes per line.

## Testing Guidelines
Co-locate Jest specs under `tests/`, mirroring the `src/` tree and suffixing with `.test.ts` or `.test.tsx`. Maintain ≥60% line coverage and verify with `npm run test:coverage`. Use `npm run test:selenium:mock` for rapid smoke checks, then `npm run test:selenium:real` (headed variant optional) against live YouTube before any PR. Playwright flows (`npm run test:e2e` or `:mock`) backstop complex UI stories, and fixtures can be regenerated via `npm run generate:test-videos`.

## Commit & Pull Request Guidelines
Write imperative, concise commit subjects that mirror existing history (`Fix encoder priority`, `Add Stay Connected button`). Reference issues in bodies (`Refs #123`) and explain behavioral impact. Before opening a PR, sync with `main`, run `npm run validate` plus the real Selenium suite, and attach screenshots or GIFs for UI changes. PR descriptions should outline testing performed, highlight risky areas (e.g., `manifest.json` permission updates), and call out any manual follow-up steps for reviewers.

## Firefox & Configuration Tips
Use Firefox Developer Edition for development; if hot reload stalls, rebuild with `npm run clean && npm run build` before re-launching `npm run dev:firefox`. Keep AMO API keys out of source control—use environment variables when running `npm run sign`. Any manifest permission change must be justified in the PR and validated with `npm run lint` to satisfy Mozilla review.
