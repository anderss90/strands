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

### Fixed
- Camera input now explicitly accepts both images and videos (`accept="image/*,video/*"`) to allow mode switching in mobile camera apps
- Previously, the camera would default to photo-only mode on some mobile devices

### Changed
- Updated camera input in StrandCreate component to use explicit accept attribute for better mobile browser compatibility

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

