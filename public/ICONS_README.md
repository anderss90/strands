# App Icons Required

To complete the PWA setup, you need to create the following icon files in the `public/` directory:

## Required Icons

1. **icon-192x192.png** - 192x192 pixels
   - Used for: App icon on Android, notification badge, shortcut icons
   - Format: PNG with transparency support

2. **icon-512x512.png** - 512x512 pixels
   - Used for: App icon on Android, splash screen, high-resolution displays
   - Format: PNG with transparency support

## Icon Guidelines

- **Design**: Should represent the Strands app brand
- **Background**: Can be transparent or use the app's theme color (#1f2937)
- **Shape**: Square with rounded corners (browsers will apply maskable icon support)
- **Content**: Should be recognizable at small sizes (192px)

## Tools for Creating Icons

You can use:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
- Any image editor (Photoshop, GIMP, Figma, etc.)

## Testing

Once icons are added:
1. The app will be installable on mobile devices
2. Desktop browsers (Chrome/Edge) will show an install button
3. Icons will appear in app launchers and home screens

