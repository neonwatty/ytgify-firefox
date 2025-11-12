# YTgify Firefox Extension

A Firefox extension that enables users to create GIFs directly from YouTube videos with an intuitive visual interface integrated into the YouTube player.

https://github.com/user-attachments/assets/6b9e72b6-032a-430d-9e4c-1d637f9aec20

## Features

- **Integrated GIF button** in YouTube's video player control bar
- **Visual segment selection** with draggable start/end markers on the timeline
- **Live preview** of the GIF loop
- **Text overlay tools** with customizable positioning and styling
- **Instant downloads** directly to your browser's downloads folder
- **Privacy-focused** - no data collection, everything processed locally

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Firefox Developer Edition (recommended) or Firefox browser

### Installation

1. Install Firefox Developer Edition (recommended):

```bash
# On macOS with Homebrew
brew install --cask firefox-developer-edition
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

For development with hot reload:

```bash
npm run dev
```

For development with automatic Firefox loading:

```bash
npm run dev:firefox
```

### Loading the Extension in Firefox

#### Method 1: Using web-ext (Recommended for Development)

```bash
npm run dev:firefox
```

This will:
- Open Firefox Developer Edition
- Load the extension from the `dist` folder
- Navigate to YouTube automatically
- Hot-reload on changes

#### Method 2: Manual Installation

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Navigate to the `dist/` directory
6. Select `manifest.json`

## Project Structure

```
├── src/
│   ├── background/     # Firefox event page
│   ├── content/        # Content script for YouTube integration
│   ├── popup/          # Extension popup UI
│   ├── components/     # Reusable React components
│   ├── lib/           # Core libraries and utilities
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── icons/             # Extension icons
├── tests/             # Test files (Selenium-based)
└── dist/              # Built extension (generated)
```

## Scripts

### Development
- `npm run dev` - Build in development mode with watch
- `npm run dev:firefox` - Build and open Firefox Developer Edition
- `npm run build` - Build for production
- `npm run lint:code` - Run ESLint
- `npm run lint` - Validate extension with web-ext
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm test` - Run unit tests
- `npm run test:selenium:mock` - Run mock E2E tests with localhost videos
- `npm run test:selenium:mock:headed` - Run mock E2E tests with visible browser
- `npm run test:selenium:real` - Run real E2E tests against actual YouTube
- `npm run test:selenium:real:headed` - Run real E2E tests with visible browser
- `npm run validate` - Run full validation suite (typecheck, lint, unit tests)

### Packaging
- `npm run package` - Create .xpi file for distribution
- `npm run sign` - Sign extension for Firefox Add-ons (requires API credentials)

## Firefox-Specific Features

### Advantages Over Chrome
- Native Promise support in all APIs
- Better privacy controls
- Superior developer tools for extensions
- More flexible content script injection
- Event pages instead of service workers (better for extension lifecycle)

### API Differences
- Uses `browser.*` API instead of `chrome.*`
- All APIs return Promises (no callbacks)
- Different background script architecture (event page vs service worker)

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Webpack** - Module bundler
- **Firefox WebExtensions Manifest V3** - Extension platform
- **Selenium WebDriver** - E2E testing (Firefox-compatible)

## Troubleshooting

### Extension Not Loading
- Ensure Firefox Developer Edition is installed
- Check that `npm run build` completed successfully
- Verify manifest.json is valid with `npm run lint`

### GIF Creation Issues
- Check browser console for errors (Ctrl+Shift+J)
- Ensure YouTube video is fully loaded
- Try refreshing the YouTube page
- Check storage permissions in Firefox settings

### Development Issues
- Clear Firefox cache if changes aren't reflected
- Use `web-ext run --verbose` for detailed logs
- Check for TypeScript errors with `npm run typecheck`

## Publishing to Firefox Add-ons

1. Create Mozilla developer account
2. Package the extension: `npm run package`
3. Sign the extension: `npm run sign` (requires API credentials)
4. Submit to Firefox Add-ons store

## License

MIT
