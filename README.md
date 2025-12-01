# Strands - Group Photo Sharing Application

A mobile-first group photo sharing web application built with Next.js, TypeScript, Tailwind CSS, Supabase, and deployed on Vercel.

## Features

- User authentication and profiles
- Friend system with friend requests
- Group creation and management
- Image sharing to groups
- Mobile-optimized UI for phone screens

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# See ENV_TEMPLATE.md for required variables
cp ENV_TEMPLATE.md .env.local
# Edit .env.local with your actual values
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Mobile Compatibility

This project follows a strict mobile compatibility policy: **All features MUST be compatible with both iOS and Android devices.** Features must be tested on both platforms before being considered complete.

See `MOBILE_COMPATIBILITY_RULES.md` for detailed mobile compatibility guidelines, platform-specific considerations, and implementation patterns.

## Testing

This project follows a strict testing policy: **All components and modules must have tests that check their basic functions. Tests run automatically on every build.**

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run tests for CI/CD
npm test:ci
```

### Test Coverage
- Minimum coverage requirement: 80% for statements, branches, functions, and lines
- Tests must pass before a successful build
- See `TESTING_RULES.md` for detailed testing guidelines

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components
- `/src/lib` - Utility functions and configurations
- `/src/types` - TypeScript type definitions
- `/src/__tests__` - Test files (co-located with source files)
- `/supabase` - Database schema and setup scripts

## Deployment

The application is configured for deployment on Vercel. See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a complete deployment guide.

### Quick Deployment Steps

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add all required environment variables (see `DEPLOYMENT.md`)
4. Deploy!

### Build Process
The build process automatically runs tests before building:
```bash
npm run build
# This runs: npm test && next build
```

If tests fail, the build will fail, ensuring only tested code is deployed.

