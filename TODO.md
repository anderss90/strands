# Todo List

## Setup & Configuration
- [x] **setup-project** - Initialize Next.js project with TypeScript and Tailwind CSS, configure for Vercel deployment
- [x] **setup-testing** - Set up Jest and React Testing Library, configure tests to run on build, create testing rules and example tests
- [ ] **setup-vercel** - Set up Vercel project, connect GitHub repository, and configure environment variables
- [ ] **setup-database** - Set up Supabase project and PostgreSQL database, create database schema with tables for users, friends, groups, group_members, images, and image_group_shares
- [ ] **setup-storage** - Configure Supabase Storage bucket for images (or Vercel Blob/external storage), set up Supabase Storage RLS policies

## Authentication & User Management
- [x] **auth-system** - Implement authentication system with JWT tokens, sign up/login flows, and password hashing using Next.js API routes
- [ ] **user-profiles** - Build user profile management and user search functionality
- [ ] **auth-ui** - Create login and signup pages with forms

## Friend System
- [ ] **friend-system** - Implement friend requests, friends list, and friend management (add/remove)

## Group Management
- [ ] **group-management** - Build group creation, adding members to groups, viewing members, and leaving groups

## Image Sharing
- [ ] **image-upload** - Implement image upload from phone (camera/gallery) with file validation using Next.js API routes
- [ ] **image-sharing** - Build image sharing to groups and image feed functionality
- [ ] **image-viewing** - Implement image feed display and full-screen image viewer optimized for phone screens

## UI & Mobile Optimization
- [ ] **mobile-ui** - Create mobile-first UI with bottom navigation, responsive layouts, touch-optimized components, and phone screen optimization
