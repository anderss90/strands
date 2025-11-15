# Group Photo Sharing Application - Technology & Features Plan

## Technology Stack

### Frontend
- **Framework**: Next.js (with TypeScript) - optimized for Vercel deployment
- **UI Library**: Tailwind CSS for responsive mobile-first design
- **State Management**: Redux Toolkit or Zustand for global state
- **Real-time Communication**: Socket.io-client for live notifications (optional for future)
- **Media Handling**: 
  - File input with camera access for mobile
  - Image preview before upload
  - Image compression (browser-side or server-side)
- **Routing**: Next.js App Router or Pages Router
- **Form Handling**: React Hook Form with validation
- **Animations**: Framer Motion for smooth transitions (optional)
- **PWA Support**: Service Workers for offline capability and app-like experience

### Backend
- **Runtime**: Node.js with Next.js API Routes (serverless functions on Vercel)
- **Database**: 
  - Supabase PostgreSQL for relational data (users, friends, groups, group_members, images)
  - Supabase connection pooling for serverless functions
  - Redis for caching (optional, for session management) - Vercel KV or Upstash
  - Supabase Realtime (optional) for live updates
- **Authentication**: JWT tokens with refresh token rotation
- **File Storage**: Supabase Storage (recommended) or Vercel Blob Storage or external storage (S3/Cloudinary)
- **Real-time**: Socket.io server for WebSocket connections (optional - may require separate server)
- **Email Service**: Resend (Vercel-friendly) or SendGrid for notifications (optional)

### DevOps & Infrastructure
- **Hosting**: Vercel (primary platform for deployment and hosting)
- **CDN**: Vercel Edge Network (automatic CDN for all deployments)
- **Database Hosting**: Supabase PostgreSQL (managed database)
- **File Storage**: Supabase Storage (recommended) or Vercel Blob Storage or external storage (S3/Cloudinary)
- **CI/CD**: Vercel Git Integration (automatic deployments on push to main branch)
- **Environment Variables**: Vercel Environment Variables for secrets management
- **Monitoring**: Vercel Analytics (built-in) and Sentry for error tracking (optional)
- **Edge Functions**: Vercel Edge Functions for low-latency API routes (optional)

### Media Processing
- **Image Processing**: Sharp (Node.js) for resizing and optimization
- **Image Compression**: Client-side compression before upload (optional)

## Core Features

### 1. User Authentication & Creation
- **Sign Up**: Email and password registration
- **Login**: Email and password authentication
- **Profile Management**: Display name, username, profile picture (optional)
- **Session Management**: JWT token-based authentication with refresh tokens

### 2. Friend System
- **Add Friends**: Search users by username/email and send friend requests
- **Friend Requests**: Accept or decline friend requests
- **Friends List**: View all friends
- **Remove Friends**: Unfriend functionality

### 3. Group Management
- **Create Groups**: Create new groups with a group name
- **Add Friends to Groups**: Add friends from friends list to groups
- **Group Members**: View all members in a group
- **Remove Members**: Remove members from groups (group admin/creator only)
- **Leave Group**: Users can leave groups they're in
- **Group List**: View all groups user is a member of

### 4. Image Sharing
- **Upload Images**: Upload images from phone (camera or gallery)
- **Share to Groups**: Share uploaded images to one or more groups
- **Image Feed**: View all images shared in groups user is a member of
- **Image Viewing**: Full-screen image viewing
- **Image Metadata**: Display uploader, timestamp, group name
- **Image Storage**: Store images in cloud storage (Supabase Storage recommended, or Vercel Blob/S3/Cloudinary)

### 5. Notifications (Optional)
- **Push Notifications**: Notify group members when new images are shared
- **In-app Notifications**: Notification center for friend requests and new images

## Architecture Overview

### Frontend Structure (Next.js App Router)
```
/src
  /app
    /(auth)
      /login
        - page.tsx
      /signup
        - page.tsx
    /(main)
      /home
        - page.tsx (image feed)
      /friends
        - page.tsx
        /add
          - page.tsx
      /groups
        - page.tsx
        /create
          - page.tsx
        /[id]
          - page.tsx (group detail)
      /upload
        - page.tsx
    /api
      /auth
        /signup
          - route.ts
        /login
          - route.ts
        /refresh
          - route.ts
      /users
        /profile
          - route.ts
        /search
          - route.ts
      /friends
        /route.ts
        /requests
          - route.ts
      /groups
        /route.ts
        /[id]
          - route.ts
        /[id]/members
          - route.ts
      /images
        /upload
          - route.ts
        /feed
          - route.ts
        /[id]
          - route.ts
  /components
    /auth
      - LoginForm.tsx
      - SignUpForm.tsx
    /friends
      - FriendList.tsx
      - FriendRequest.tsx
      - AddFriend.tsx
    /groups
      - GroupList.tsx
      - CreateGroup.tsx
      - GroupMembers.tsx
      - AddMembersToGroup.tsx
    /images
      - ImageUpload.tsx
      - ImageFeed.tsx
      - ImageViewer.tsx
      - ImageCard.tsx
    /layout
      - Navbar.tsx
      - BottomNav.tsx
  /hooks
    - useAuth.ts
    - useFriends.ts
    - useGroups.ts
    - useImages.ts
  /store
    - authSlice.ts
    - friendsSlice.ts
    - groupsSlice.ts
    - imagesSlice.ts
  /lib
    - api.ts
    - validation.ts
    - supabase.ts (Supabase client setup)
    - db.ts (database connection utilities)
  /types
    - user.ts
    - friend.ts
    - group.ts
    - image.ts
```

### Backend Structure (Next.js API Routes)
- API routes located in `/app/api` directory
- Serverless functions automatically deployed on Vercel
- Database connection via Supabase PostgreSQL with connection pooling
- File upload handling with Supabase Storage

## Supabase Setup

### Supabase Project Configuration
- Create new Supabase project
- Configure PostgreSQL database
- Set up connection pooler (Transaction mode recommended for serverless)
- Configure Row Level Security (RLS) policies
- Set up Supabase Storage buckets

### Supabase Features to Leverage
- **PostgreSQL Database**: Managed PostgreSQL database
- **Storage**: File storage with CDN
- **Realtime**: Real-time subscriptions (optional for live updates)
- **Auth**: Supabase Auth (optional, can use custom JWT auth)
- **Dashboard**: Database management and monitoring
- **SQL Editor**: Run migrations and queries

### Connection Pooling
- Use Supabase connection pooler for serverless functions
- Transaction mode for better compatibility
- Direct connection for migrations and admin tasks
- Connection string format: `postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres`

## Database Schema (Key Tables)

**Users**
- id (UUID, primary key)
- email (string, unique)
- username (string, unique)
- password_hash (string)
- display_name (string)
- profile_picture_url (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)

**Friends**
- id (UUID, primary key)
- user_id (UUID, foreign key to Users)
- friend_id (UUID, foreign key to Users)
- status (enum: 'pending', 'accepted', 'blocked')
- created_at (timestamp)
- updated_at (timestamp)
- Unique constraint on (user_id, friend_id)

**Groups**
- id (UUID, primary key)
- name (string)
- created_by (UUID, foreign key to Users)
- created_at (timestamp)
- updated_at (timestamp)

**Group_Members**
- id (UUID, primary key)
- group_id (UUID, foreign key to Groups)
- user_id (UUID, foreign key to Users)
- role (enum: 'admin', 'member') - admin is the creator
- joined_at (timestamp)
- Unique constraint on (group_id, user_id)

**Images**
- id (UUID, primary key)
- user_id (UUID, foreign key to Users)
- image_url (string)
- thumbnail_url (string, nullable)
- file_name (string)
- file_size (integer)
- mime_type (string)
- created_at (timestamp)

**Image_Group_Shares**
- id (UUID, primary key)
- image_id (UUID, foreign key to Images)
- group_id (UUID, foreign key to Groups)
- created_at (timestamp)
- Unique constraint on (image_id, group_id)

## API Endpoints

### Authentication
- POST /api/auth/signup - Create new user
- POST /api/auth/login - Login user
- POST /api/auth/refresh - Refresh JWT token
- POST /api/auth/logout - Logout user

### Users
- GET /api/users/profile - Get current user profile
- PUT /api/users/profile - Update user profile
- GET /api/users/search?q= - Search users by username/email

### Friends
- GET /api/friends - Get friends list
- GET /api/friends/requests - Get friend requests (sent and received)
- POST /api/friends/requests - Send friend request
- PUT /api/friends/requests/:id - Accept/decline friend request
- DELETE /api/friends/:id - Remove friend

### Groups
- GET /api/groups - Get user's groups
- POST /api/groups - Create new group
- GET /api/groups/:id - Get group details
- GET /api/groups/:id/members - Get group members
- POST /api/groups/:id/members - Add members to group
- DELETE /api/groups/:id/members/:userId - Remove member from group
- DELETE /api/groups/:id - Delete group (admin only)
- POST /api/groups/:id/leave - Leave group

### Images
- POST /api/images/upload - Upload image
- GET /api/images/feed - Get image feed (images from user's groups)
- GET /api/images/:id - Get image details
- POST /api/images/:id/share - Share image to groups
- DELETE /api/images/:id - Delete image

## Vercel Deployment Configuration

### Vercel Project Setup
- Connect GitHub repository to Vercel
- Configure build settings (Next.js auto-detected)
- Set environment variables in Vercel dashboard
- Configure custom domain (optional)

### Environment Variables (Vercel)
- SUPABASE_URL - Supabase project URL
- SUPABASE_ANON_KEY - Supabase anonymous key (public)
- SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side only)
- DATABASE_URL - Supabase PostgreSQL connection string (direct connection)
- DATABASE_POOLER_URL - Supabase PostgreSQL connection pooler URL (recommended for serverless)
- JWT_SECRET - Secret for JWT token signing
- JWT_REFRESH_SECRET - Secret for refresh tokens
- SUPABASE_STORAGE_BUCKET - Supabase Storage bucket name (if using Supabase Storage)
- OR BLOB_READ_WRITE_TOKEN - Vercel Blob Storage token (if using Vercel Blob)
- OR AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET (if using S3)
- OR CLOUDINARY_URL (if using Cloudinary)
- NEXTAUTH_URL - Application URL for authentication

### Vercel-Specific Features
- **Serverless Functions**: All API routes run as serverless functions
- **Edge Network**: Automatic global CDN for all static assets and API routes
- **Automatic HTTPS**: SSL certificates automatically provisioned
- **Preview Deployments**: Automatic preview deployments for pull requests
- **Analytics**: Built-in web analytics and performance monitoring
- **Image Optimization**: Next.js Image component with Vercel Image Optimization

### Database Connection (Supabase PostgreSQL)
- Use Supabase PostgreSQL hosted database
- Connection string from Supabase dashboard
- Connection pooling via Supabase connection pooler (recommended for serverless)
- Use @supabase/supabase-js client library for database queries
- Or use pg (node-postgres) with connection pooling for direct SQL queries
- Migrations via Supabase SQL Editor or migration tools (Prisma, Drizzle, etc.)
- Supabase Dashboard for database management and monitoring
- Connection pooler URL format: `postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres`

### File Storage (Supabase Storage)
- Use Supabase Storage for image storage (recommended)
- Automatic CDN distribution via Supabase CDN
- Direct upload from client using Supabase client
- Row Level Security (RLS) policies for access control
- Image transformations via Supabase Storage API
- Or use Vercel Blob Storage or external storage (S3/Cloudinary) if preferred

## Security Considerations
- Secure password hashing (bcrypt)
- JWT token expiration and refresh
- Secure file upload validation (file type, size limits)
- Rate limiting on API endpoints (Vercel Edge Config or Upstash Rate Limit)
- CSRF protection
- XSS prevention
- Input validation and sanitization
- Authorization checks (users can only access their own data/groups)
- Image file type validation (only allow images)
- File size limits (e.g., max 10MB per image)
- Environment variables secured in Vercel dashboard
- CORS configuration for API routes
- Supabase RLS policies for database security

## Performance Optimizations
- Image compression before upload
- Generate thumbnails for faster loading
- Lazy loading for image feed
- Pagination for image feed and lists
- Vercel Edge Network for global CDN
- Next.js Image Optimization for automatic image optimization
- Database indexing on frequently queried fields (user_id, group_id, created_at)
- Caching strategies for user data and friend lists (Vercel KV)
- Serverless function optimization (keep functions lightweight)
- Supabase connection pooling for efficient database connections

## Mobile-First Design Principles (Phone Screen Optimization)

### Viewport & Layout
- **Viewport Meta Tag**: Configured for mobile devices with proper scaling
- **Portrait Orientation**: Optimized for portrait mode (primary use case)
- **Single Column Layout**: All content in single column for phone screens
- **Full-Width Components**: Components take full viewport width
- **No Horizontal Scrolling**: Prevent horizontal overflow

### Touch Interactions
- **Touch-Optimized UI**: Minimum 44px tap targets for all interactive elements
- **Swipe Gestures**: Swipe navigation for images and feeds
- **Large Buttons**: Prominent, easy-to-tap buttons (min 48px height)
- **Touch Feedback**: Visual feedback on touch (ripple effects, button states)
- **Pinch-to-Zoom**: Full-screen image viewing with pinch-to-zoom support
- **Pull-to-Refresh**: Pull-to-refresh for feeds and lists

### Navigation
- **Bottom Navigation Bar**: Fixed bottom navigation for main sections (Home, Friends, Groups, Upload, Profile)
- **Thumb-Friendly Zones**: Place important actions in bottom half of screen
- **Swipe Between Tabs**: Allow swiping between main sections
- **Back Button**: Clear back navigation with browser back or custom back button

### Image Display
- **Full-Screen Images**: Images fill viewport width
- **Lazy Loading**: Load images as user scrolls (Next.js Image component)
- **Optimized Image Sizes**: Serve appropriately sized images for phone screens
- **Image Grid**: Responsive grid (1-2 columns max) for image feeds
- **Full-Screen Viewer**: Tap image to view full-screen with swipe navigation

### Form Inputs
- **Large Input Fields**: Minimum 44px height for input fields
- **Native Mobile Inputs**: Use native file input for camera/gallery access
- **Keyboard Optimization**: Optimize for mobile keyboards (email, text types)
- **Input Focus**: Large focus states for better visibility

### Performance
- **Fast Loading**: Target <3s initial load time
- **Optimized Assets**: Compressed images and minimized JavaScript
- **Progressive Loading**: Show content as it loads
- **Offline Support**: PWA capabilities for offline access

### Screen Sizes
- **Target Devices**: iPhone SE (375px) to iPhone Pro Max (428px) and similar Android devices
- **Breakpoints**: Primary breakpoint at 768px (tablet) with mobile-first approach
- **Responsive Typography**: Font sizes scale appropriately (16px base, readable without zoom)
- **Safe Areas**: Account for notches and safe areas on modern phones

### User Experience
- **Thumb Navigation**: All primary actions within thumb reach zone
- **Minimal Scrolling**: Organize content to minimize vertical scrolling
- **Clear Hierarchy**: Large headings, clear visual hierarchy
- **Loading States**: Show loading indicators for async operations
- **Error Handling**: Clear error messages optimized for small screens
- **Empty States**: Helpful empty states when no content exists

## User Flow

### Registration Flow
1. User visits signup page
2. User enters email, username, password
3. User account is created
4. User is automatically logged in
5. Redirect to home page (image feed)

### Adding Friends Flow
1. User navigates to Friends page
2. User searches for other users by username/email
3. User sends friend request
4. Recipient receives notification
5. Recipient accepts/declines request
6. If accepted, both users are now friends

### Creating Group Flow
1. User navigates to Groups page
2. User clicks "Create Group"
3. User enters group name
4. User selects friends to add to group
5. Group is created with user as admin
6. Selected friends are added as members

### Sharing Image Flow
1. User navigates to Upload page
2. User selects image from phone (camera or gallery)
3. User previews image
4. User selects one or more groups to share to
5. Image is uploaded and shared to selected groups
6. All group members can see the image in their feed

## Implementation Priorities

### Phase 1: Core Authentication & User Management
- User registration and login
- JWT authentication
- User profile management
- Basic UI structure
- Vercel deployment setup

### Phase 2: Friend System
- Add friends functionality
- Friend requests
- Friends list
- Remove friends

### Phase 3: Group Management
- Create groups
- Add members to groups
- View group members
- Leave group
- Remove members (admin only)

### Phase 4: Image Sharing
- Image upload from phone
- Image storage (Supabase Storage or Vercel Blob/S3/Cloudinary)
- Share images to groups
- Image feed
- Image viewing

### Phase 5: Polish & Optimization
- Notifications (optional)
- Performance optimizations
- PWA support
- Error handling improvements
- UI/UX refinements
- Vercel Analytics integration

## Vercel Deployment Checklist
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Vercel project and connect GitHub repository
- [ ] Configure environment variables in Vercel dashboard
- [ ] Create Supabase project and configure PostgreSQL database
- [ ] Set up Supabase connection pooler for serverless functions
- [ ] Create database schema and run migrations in Supabase
- [ ] Configure Supabase Storage bucket for images
- [ ] Set up Supabase Storage RLS policies for access control
- [ ] Configure custom domain (optional)
- [ ] Set up preview deployments for PRs
- [ ] Configure Vercel Analytics
- [ ] Test production deployment
- [ ] Set up error monitoring (Sentry, optional)

