# Creating Monochrome Notification Badge Icon

## Problem
On Android, notification icons in the status bar must be **monochrome** (white/transparent only). Using a full-color icon results in a white square appearing in the status bar.

## Solution
Create a monochrome badge icon that will be used specifically for Android status bar notifications.

## Requirements
- **File**: `icon-badge-96x96.png`
- **Size**: 96x96 pixels (or 48x48px minimum)
- **Format**: PNG with transparency
- **Colors**: White only on transparent background (monochrome)
- **Design**: Simple, recognizable shape that represents your app

## How to Create

### Option 1: Using Image Editor
1. Open your app icon (`icon-192x192.png`) in an image editor
2. Convert to grayscale
3. Create a high-contrast version (white shape on transparent)
4. Resize to 96x96 pixels
5. Save as `icon-badge-96x96.png` in the `public/` directory

### Option 2: Using Online Tools
1. Use [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) with monochrome option
2. Or use [RealFaviconGenerator](https://realfavicongenerator.net/) and select monochrome badge

### Option 3: Simple SVG to PNG
Create a simple white shape SVG, then convert to PNG:
```svg
<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" fill="none"/>
  <!-- Add your white shape here -->
  <circle cx="48" cy="48" r="30" fill="white"/>
</svg>
```

## Design Guidelines
- Keep it simple - complex designs don't work well at small sizes
- Use white (#FFFFFF) for the shape
- Use transparent for background
- Ensure good contrast
- Test at 24x24px size to see how it looks in the status bar

## Quick Start
I've created a starter SVG file (`icon-badge.svg`) that you can convert to PNG:

1. Open `public/icon-badge.svg` in an image editor or online converter
2. Convert to PNG format
3. Save as `icon-badge-96x96.png` in the `public/` directory
4. Ensure it's 96x96 pixels (or at least 48x48px)

### Online Converters
- [CloudConvert](https://cloudconvert.com/svg-to-png) - SVG to PNG converter
- [Convertio](https://convertio.co/svg-png/) - Another converter option

## Testing
After creating the icon:
1. Clear app cache
2. Uninstall and reinstall the PWA (or clear service worker cache)
3. Send a test notification
4. Check the status bar icon appears correctly (not as a white square)

## Important Notes
- The badge icon MUST be monochrome (white/transparent only)
- Android only displays the alpha channel, so any color will appear as white
- The icon in the notification drawer can be full-color (uses the `icon` property)
- The status bar icon uses the `badge` property and must be monochrome

