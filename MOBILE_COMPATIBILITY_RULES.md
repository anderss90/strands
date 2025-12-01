# Mobile Compatibility Rules and Guidelines

## Overview
This document outlines the mobile compatibility requirements and guidelines for the Strands project. **All features MUST be compatible with both iOS and Android devices.**

## Core Rule

### 1. Cross-Platform Compatibility Requirement
- **ALL features MUST work on both iOS and Android devices**
- Features must be tested on both platforms before being considered complete
- Platform-specific workarounds are acceptable, but the feature must work on both platforms
- When implementing new features, consider iOS Safari and Android Chrome limitations

## Platform-Specific Considerations

### iOS Safari Limitations
- **Fullscreen API**: iOS Safari does NOT support the Fullscreen API for non-video elements (images, divs, etc.)
  - Use CSS-based fullscreen overlays (`position: fixed`, `z-index`, viewport units) instead
  - Example: See `FullscreenZoomableImage.tsx` for iOS fullscreen implementation
- **Viewport Units**: Use `100vh` with `minHeight: '-webkit-fill-available'` for proper iOS Safari viewport handling
- **Touch Events**: iOS Safari handles touch events differently - ensure both `touch` and `click` events are handled
- **File Input**: iOS Safari requires user interaction to trigger file inputs (cannot be programmatically triggered)
- **LocalStorage**: May be restricted in private browsing mode - always wrap in try-catch
- **Orientation Lock**: Limited support - may not work in all cases

### Android Chrome Limitations
- **Permissions API**: Android handles camera/gallery permissions differently than iOS
- **File Input**: More permissive than iOS - can access gallery without explicit camera permission
- **Fullscreen API**: Better support than iOS, but still check for vendor prefixes
- **Viewport Units**: Generally better support than iOS Safari

## Implementation Guidelines

### 1. Feature Development Checklist
When implementing a new feature, ensure:
- [ ] Feature works on iOS Safari (iPhone)
- [ ] Feature works on Android Chrome
- [ ] Touch interactions work correctly on both platforms
- [ ] File uploads work on both platforms
- [ ] Fullscreen/overlay features use platform-appropriate methods
- [ ] Viewport sizing works correctly on both platforms
- [ ] Error handling accounts for platform-specific limitations

### 2. Platform Detection
When platform-specific code is needed:
```typescript
// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect Android
const isAndroid = /Android/i.test(navigator.userAgent);

// Use platform-specific implementations
if (isIOS) {
  // iOS-specific code (e.g., CSS-based fullscreen)
} else {
  // Standard code (e.g., Fullscreen API)
}
```

### 3. Testing Requirements
- **Manual Testing**: Test on real devices or emulators for both iOS and Android
- **Browser Testing**: Test in Safari (iOS) and Chrome (Android)
- **Feature Testing**: Verify all user interactions work on both platforms
- **Error Scenarios**: Test error handling on both platforms

### 4. Common Patterns

#### Fullscreen Implementation
```typescript
// iOS: Use CSS overlay
if (isIOS) {
  setIsFullscreen(true);
  document.body.style.overflow = 'hidden';
  // Render fixed overlay with z-index
} else {
  // Use native Fullscreen API
  await element.requestFullscreen();
}
```

#### Viewport Sizing
```typescript
// iOS Safari viewport fix
style={{
  height: '100vh',
  minHeight: '-webkit-fill-available', // iOS Safari support
}}
```

#### Touch Event Handling
```typescript
// Handle both touch and click events
onTouchStart={handleTouchStart}
onTouchMove={handleTouchMove}
onTouchEnd={handleTouchEnd}
onClick={handleClick} // Fallback for non-touch devices
```

#### File Input Handling
```typescript
// Always require user interaction
<button onClick={() => fileInputRef.current?.click()}>
  Choose File
</button>
<input ref={fileInputRef} type="file" className="hidden" />
```

#### Safe Storage Access
```typescript
// Always wrap localStorage/sessionStorage in try-catch
try {
  const value = typeof window !== 'undefined' 
    ? localStorage.getItem('key') 
    : null;
} catch (error) {
  console.error('Storage access failed:', error);
  // Handle gracefully (e.g., private browsing mode)
}
```

## Known Platform Differences

### Fullscreen API
- **iOS Safari**: ❌ Not supported for images/divs (use CSS overlay)
- **Android Chrome**: ✅ Supported with vendor prefixes

### Viewport Units
- **iOS Safari**: Requires `-webkit-fill-available` for proper height
- **Android Chrome**: Standard `100vh` works correctly

### Touch Events
- **iOS Safari**: Touch events fire before click events
- **Android Chrome**: Similar behavior, but may have slight differences

### File Input
- **iOS Safari**: Requires explicit user interaction
- **Android Chrome**: More permissive, but still requires user interaction

### Permissions API
- **iOS Safari**: Limited support, may not work for camera/gallery
- **Android Chrome**: Better support, but varies by Android version

## Testing Tools

### Recommended Testing Methods
1. **Real Devices**: Test on actual iPhone and Android devices
2. **Browser DevTools**: Use device emulation in Chrome DevTools
3. **Safari Web Inspector**: Use for iOS Safari debugging
4. **BrowserStack/Sauce Labs**: For automated cross-platform testing (optional)

### Testing Checklist
- [ ] Test on iOS Safari (iPhone)
- [ ] Test on Android Chrome
- [ ] Test touch interactions (tap, swipe, pinch)
- [ ] Test file uploads (camera, gallery)
- [ ] Test fullscreen/overlay features
- [ ] Test viewport sizing and scrolling
- [ ] Test error scenarios
- [ ] Test in both portrait and landscape orientations

## Error Handling

### Platform-Specific Errors
Always handle platform-specific errors gracefully:
```typescript
try {
  // Platform-specific API call
  if (isIOS) {
    // iOS implementation
  } else {
    // Standard implementation
  }
} catch (error) {
  // Log error for debugging
  console.error('Platform-specific error:', error);
  // Provide fallback or user-friendly error message
  setError('Feature not available on this device');
}
```

## Documentation

### Code Comments
When implementing platform-specific code:
```typescript
// iOS Safari doesn't support Fullscreen API for images
// Use CSS-based overlay instead
if (isIOS) {
  // iOS-specific implementation
}
```

### Feature Documentation
Document any platform-specific behavior in:
- Component/function docstrings
- README.md
- This file (MOBILE_COMPATIBILITY_RULES.md)

## Maintenance

### Regular Review
- Review new features for cross-platform compatibility
- Update this document when new platform differences are discovered
- Keep platform detection code up to date
- Test on latest iOS and Android versions

### Breaking Changes
If a feature cannot be made compatible with both platforms:
1. Document the limitation clearly
2. Provide alternative functionality for the unsupported platform
3. Consider if the feature should be implemented at all

## Resources

- [iOS Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/)
- [Android WebView Documentation](https://developer.android.com/reference/android/webkit/WebView)
- [Can I Use - Browser Compatibility](https://caniuse.com/)
- [MDN Web Docs - Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
- [MDN Web Docs - Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

## Examples

### Example 1: Fullscreen Image Viewer
See `src/components/media/FullscreenZoomableImage.tsx` for a complete example of:
- iOS detection
- CSS-based fullscreen for iOS
- Native Fullscreen API for other platforms
- Touch event handling
- Viewport sizing fixes

### Example 2: Media Permissions
See `src/hooks/useMediaPermissions.ts` for:
- Platform detection (iOS vs Android)
- Platform-specific permission handling
- Graceful fallbacks

## Enforcement

This rule is enforced through:
- Code review process
- Testing requirements
- Build process (where applicable)
- Documentation requirements

**Remember: If a feature doesn't work on both iOS and Android, it's not complete!**

