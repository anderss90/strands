# Testing Rules and Guidelines

## Overview
This document outlines the testing requirements and guidelines for the Strands project.

## Core Rules

### 1. Test Coverage Requirement
- **All components and modules MUST have tests that check their basic functions**
- Tests must be written before or alongside the implementation
- Tests should cover:
  - Component rendering
  - User interactions
  - API endpoints
  - Utility functions
  - Error handling
  - Edge cases

### 2. Test Execution
- Tests run automatically on every build
- Tests must pass before a successful build
- Tests are also run in CI/CD pipeline
- Run tests manually with: `npm test`
- Run tests in watch mode: `npm test:watch`
- Run tests with coverage: `npm test:coverage`

### 3. Test Structure
- Tests should be placed next to the files they test:
  - Component: `Component.tsx` → `Component.test.tsx`
  - Utility: `utils.ts` → `utils.test.ts`
  - API Route: `route.ts` → `route.test.ts`
- Or in a `__tests__` directory adjacent to the source file

### 4. Test Naming
- Test files must end with `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx`
- Test descriptions should be clear and descriptive
- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases

### 5. Test Quality Standards
- Tests should be:
  - **Fast**: Tests should run quickly
  - **Independent**: Tests should not depend on each other
  - **Repeatable**: Tests should produce the same results every time
  - **Self-validating**: Tests should clearly pass or fail
  - **Timely**: Tests should be written at the right time (TDD or alongside code)

## Testing Tools

### Framework
- **Jest**: JavaScript testing framework
- **React Testing Library**: For testing React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM testing

### API Testing
- Use Jest for API route testing
- Mock database calls when testing API routes
- Test authentication and authorization

### Component Testing
- Use React Testing Library for component testing
- Focus on testing user interactions, not implementation details
- Test accessibility and user experience

### Utility Function Testing
- Test all utility functions with various inputs
- Test edge cases and error conditions
- Test return values and side effects

## Example Test Structure

### Component Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(<Component />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Updated Text')).toBeInTheDocument();
  });
});
```

### API Route Test Example
```typescript
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/endpoint', () => {
  it('returns success response', async () => {
    const request = new NextRequest('http://localhost/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
  });
});
```

### Utility Function Test Example
```typescript
import { utilityFunction } from './utils';

describe('utilityFunction', () => {
  it('returns expected value', () => {
    const result = utilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('handles edge cases', () => {
    const result = utilityFunction('');
    expect(result).toBe('');
  });
});
```

## Testing Best Practices

### 1. Arrange-Act-Assert Pattern
```typescript
it('should do something', () => {
  // Arrange: Set up test data and conditions
  const input = 'test';
  
  // Act: Execute the function being tested
  const result = functionToTest(input);
  
  // Assert: Verify the results
  expect(result).toBe('expected');
});
```

### 2. Use Descriptive Test Names
- Bad: `it('works', () => { ... })`
- Good: `it('should return user data when valid ID is provided', () => { ... })`

### 3. Test One Thing at a Time
- Each test should verify one specific behavior
- If a test fails, it should be clear what went wrong

### 4. Mock External Dependencies
- Mock API calls
- Mock database queries
- Mock external services
- Use Jest mocks for functions and modules

### 5. Clean Up After Tests
- Reset mocks between tests
- Clean up DOM elements
- Clear timers and intervals

## Coverage Goals

### Minimum Coverage Requirements
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports
- Generate coverage reports with: `npm test:coverage`
- Coverage reports are generated in `coverage/` directory
- Review coverage reports before committing code

## Integration with Build Process

### Pre-build Testing
- Tests run automatically before build
- Build fails if tests fail
- Configured in `package.json` scripts

### CI/CD Integration
- Tests run in CI/CD pipeline
- Tests must pass before deployment
- Coverage reports are generated in CI/CD

## Maintenance

### Updating Tests
- Update tests when code changes
- Remove obsolete tests
- Refactor tests when necessary
- Keep tests in sync with code

### Test Documentation
- Document complex test scenarios
- Explain why certain tests exist
- Document test setup and teardown
- Keep test documentation up to date

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Documentation](https://nextjs.org/docs/app/building-your-application/testing)


