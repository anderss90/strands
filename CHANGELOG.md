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
  - Videos now display directly using video element (not hidden)
  - Video element uses `preload="metadata"` and seeks to 0.1s on load
  - Automatically pauses after seeking to show first frame as thumbnail
  - Uses `poster` attribute if thumbnailUrl is available from database
  - Play button overlay and duration indicator remain visible on video thumbnails
  - Simplified approach avoids CORS issues with canvas extraction

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

