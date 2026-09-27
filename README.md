
# FastTube

A lightweight Chrome extension that speeds up YouTube by stripping heavy CSS effects, blocking telemetry, and prefetching playlist data.

## Features

- **CSS Effect Stripping** - Removes animations, transitions, filters, backdrop blurs, box shadows, and other GPU-heavy effects from YouTube's UI while preserving background colors and layout.
- **Inline Style Cleanup** - Actively clears heavy inline styles from elements as YouTube renders them, including on dynamically added nodes.
- **Web Animation Cancellation** - Cancels running Web Animations after page load to free up the compositor.
- **Ambient Video Pausing** - Automatically pauses non-player background/ambient videos (e.g. decorative previews) without touching the main player.
- **Smooth Scroll Disable** - Forces instant scrolling for SPA navigations by patching `window.scrollTo`.
- **Playlist Prefetching** - Warms the HTTP cache for upcoming videos in a playlist (2 ahead, 1 behind) and prefetches playlist browse data on link hover.
- **Network Request Blocking** - Blocks YouTube telemetry endpoints (`/api/stats/`, `/ptracking`, `/generate_204`) via `declarativeNetRequest`.

## Installation

### From Source (Developer Mode)

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the extension folder.
5. Navigate to YouTube - the extension activates automatically.

### Icons

Make sure the following icon files exist in the `icons/` directory:

```
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
```

## Project Structure

```
.
├── manifest.json     # Extension manifest (MV3)
├── perf.js           # CSS/rendering performance optimizations
├── prefetch.js       # Playlist and video prefetching logic
├── rules.json        # declarativeNetRequest blocking rules
└── icons/            # Extension icons
```

## How It Works

### `perf.js`
Injected at `document_start` in the `MAIN` world so it runs before YouTube's own scripts. It:

1. Injects a global stylesheet that disables animations, transitions, filters, backdrop-filters, box-shadows, and text-shadows via `!important`.
2. Re-injects the stylesheet if YouTube wipes `<head>` during SPA navigation.
3. Scans all DOM nodes (existing and newly added) and resets heavy inline style properties.
4. Cancels all active Web Animations after `DOMContentLoaded`.
5. Pauses ambient `<video>` elements outside `#movie_player`.
6. Overrides `window.scrollTo` to convert `behavior: 'smooth'` to `'auto'`.

### `prefetch.js`
Injected at `document_start` in the `MAIN` world. It:

1. Hooks YouTube's SPA navigation events (`yt-navigate-finish`, `yt-page-data-updated`, `popstate`).
2. Reads the current playlist ID from the URL (`?list=...`).
3. Inserts `<link rel="prefetch">` tags for neighbouring videos in the playlist and the `youtubei/v1/player` API endpoint.
4. On hover over any `a[href*="list="]` link, fires a background `POST` to `/youtubei/v1/browse` to warm the cache for the playlist's sidebar data.

### `rules.json`
Uses Manifest V3's `declarativeNetRequest` API to block:

| Rule | Target | Purpose |
|------|--------|---------|
| 1 | `youtube.com/api/stats/` | Block playback telemetry |
| 2 | `youtube.com/ptracking` | Block playback tracking beacons |
| 3 | `youtube.com/generate_204` | Block connectivity pings |

## Permissions

| Permission | Reason |
|------------|--------|
| `declarativeNetRequest` | Block telemetry endpoints via static rules |
| `*://*.youtube.com/*` (host) | Inject scripts and apply rules on YouTube only |

No remote code is loaded. No data leaves your browser. The extension does not read, store, or transmit any personal information.

## Known Limitations

- **Ambient video pausing** may occasionally pause a video inside a hover-preview if YouTube changes its DOM structure.
- **Prefetch effectiveness** depends on YouTube's internal URL formats; if the `youtubei/v1/browse` request schema changes, prefetching may silently no-op.
- The stylesheet uses `* { ... !important }`, which is aggressive. If a site feature relies on a filter, transition, or shadow for correctness (e.g. a loading spinner), it will be visually disabled.

## Development

No build step is required. Edit the source files and reload the extension from `chrome://extensions/`.

To debug:
- Content scripts run in the `MAIN` world, so logs appear in the page console (F12 on YouTube), not the extension's service worker console.
- `rules.json` changes require a full extension reload.

## Compatibility

- Chrome / Edge / Brave / other Chromium-based browsers supporting **Manifest V3**.
- Firefox support is not currently provided (MV3 `declarativeNetRequest` static rules and `world: "MAIN"` content scripts have differing support).

## License

MIT - see `LICENSE` for details.

## Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by YouTube or Google. Use at your own discretion; blocking telemetry may affect YouTube's recommendations or analytics.