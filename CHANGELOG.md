# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Changelog page accessible from the console page (`/console/changelog`)
- Changelog API endpoint (`/api/changelog`) that fetches git commit history
- Changelog component that displays recent changes grouped by date
- "Changelog" button in the Console component header for easy access
- "Back" button in Changelog component header for easy navigation back to Console
- Date formatting utility functions for European 24-hour format (`src/lib/utils/dateFormat.ts`)
- Comprehensive documentation on mobile camera and gallery access (`MOBILE_CAMERA_GALLERY_ACCESS.md`)
  - HTML5 file input method with accept and capture attributes
  - MediaDevices API (getUserMedia) method
  - iOS vs Android platform differences
  - Differences between image, video, and both media types
  - Best practices, common issues, and solutions

### Fixed
- Camera input now explicitly accepts both images and videos (`accept="image/*,video/*"`) to allow mode switching in mobile camera apps
- Previously, the camera would default to photo-only mode on some mobile devices
- **Swapped button handlers on Android to match actual behavior**
  - "Take Photo/Video" button now uses gallery input (gives choice between camera/video/gallery on Android)
  - "Choose from Gallery" button now uses camera input (opens gallery directly on Android)
  - Buttons now match their actual behavior on Android devices

### Changed
- Updated camera input in StrandCreate component to use explicit accept attribute for better mobile browser compatibility
- **All timestamps now display in European 24-hour format (DD/MM/YYYY HH:mm)**
  - Updated Changelog component to use European date/time format
  - Updated Console component to use 24-hour time format
  - Updated StrandViewer component to use European date/time format
  - Updated ImageViewer component to use European date/time format
  - Updated ShareGroupModal component to use European date/time format
- **Split camera button into separate photo and video buttons**
  - "Take Photo" button opens camera in photo mode (`accept="image/*"` with `capture="environment"`)
  - "Record Video" button opens camera in video mode (`accept="video/*"` with `capture="environment"`)
  - "Choose from Gallery" button remains unchanged
  - Updated UI to show three buttons in a grid layout (photo, video, gallery)
- **Fixed video thumbnail display in strands feed**
  - Videos now generate thumbnails client-side during upload
  - Thumbnail is extracted from video at 0.1 seconds using canvas API
  - Thumbnail is uploaded to Supabase Storage alongside the video
  - Thumbnail URL is stored in database and displayed in feed
  - Feed now shows thumbnail image for videos (not video element)
  - Falls back to video element with frame extraction if thumbnail missing
  - Play button overlay and duration indicator remain visible on video thumbnails
- **Moved user name above strand content in feed**
  - User name and profile picture now appear above the strand content
  - Footer now only contains fire button and edit indicator
  - Improved visual hierarchy in strand cards
- **Added comments preview to strand feed**
  - First three comments are now displayed under strand content
  - Shows commenter profile picture and name
  - Displays comment text with link support
  - Clear indicator when there are more than 3 comments ("View X more comments")
  - Clicking "View more comments" opens the full strand view
- **Reorganized strand card layout**
  - First row: Username and fire emoji button side by side
  - Second row: Strand image/video
  - Third row: Strand text content
  - Comments appear below content
  - Edit indicator moved to footer (only shown if strand was edited)
- **Added comment notifications for strand authors and commenters**
  - Strand authors receive notifications when someone comments on their strand
  - Users who have previously commented on a strand receive notifications for new comments
  - Notifications include commenter name and link to the strand
  - Prevents duplicate notifications by excluding already-notified users from group notifications
  - Added `notifyUsers` function to send notifications to specific user IDs
- **Added zoom functionality for strand images**
  - Created `ZoomableImage` component with comprehensive zoom and pan support
  - Pinch-to-zoom on mobile devices (two-finger gesture)
  - Double-tap/click to zoom in/out
  - Mouse wheel zoom (Ctrl/Cmd + scroll) on desktop
  - Drag/pan when zoomed in
  - Zoom controls (zoom in, zoom out, reset buttons)
  - Zoom percentage indicator
  - Maximum zoom of 4x, default double-tap zoom of 2.5x
- **Automatic notification enabling on login**
  - Notifications are now automatically enabled when users log in or sign up
  - Notifications are also enabled when users are already authenticated on page load
  - Permission is requested automatically if not already granted
  - Subscription is created and sent to server automatically
  - Fails silently if notifications are not supported or permission is denied
  - Users can still manually enable/disable notifications from the profile page
- **Unified fullscreen and zoom image viewer**
  - Created `FullscreenZoomableImage` component combining fullscreen and zoom functionality
  - Replaced separate zoom and fullscreen implementations with unified solution
  - Fullscreen mode: Double-click image or click fullscreen button to enter fullscreen
  - Zoom in fullscreen: Pinch-to-zoom (mobile), Ctrl/Cmd+scroll (desktop), or double-click
  - Pan when zoomed: Drag to move around zoomed image
  - Zoom controls: Zoom in/out/reset buttons appear in fullscreen mode
  - Exit fullscreen: Click exit button, press ESC, or double-click again
  - Used in both ImageViewer and StrandViewer for consistent experience
  - Cross-browser fullscreen support (Chrome, Firefox, Safari, Edge)

## [Previous Changes]

### Video Support
- Added support for uploading and playing videos from user phones
- Implemented direct uploads to Supabase Storage to bypass 4MB request limit
- Added video metadata extraction (duration, width, height)
- Created VideoPlayer component for video playback
- Updated database schema to support video media types
- Modified "Take Photo" button to support both photo and video capture

### Share Target Feature
- Added Web Share Target API support for native phone share functionality
- Users can now share images/videos from their phone's native share menu
- Shared media is automatically loaded into the strand creation page

