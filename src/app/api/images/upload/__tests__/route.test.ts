// All mocks must be declared before any imports to ensure proper hoisting
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

// Mock fs operations - ensure they never actually access the file system
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

// Mock path to return predictable paths that won't cause file system access
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/').replace(/\/+/g, '/')),
}));

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Suppress console.error for test runs to avoid noise from expected errors in CI
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Helper to create a mock File with arrayBuffer
function createMockFile(name: string, type: string, size: number = 1024): File {
  const content = new Array(size).fill('a').join('');
  const file = new File([content], name, { type });
  // Add arrayBuffer method if not available
  if (!file.arrayBuffer) {
    (file as any).arrayBuffer = async () => {
      const buffer = Buffer.from(content);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    };
  }
  return file;
}

describe('POST /api/images/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure existsSync always returns true to prevent directory creation attempts
    (existsSync as jest.Mock).mockReturnValue(true);
    // Note: writeFile and mkdir are already mocked at the module level
    // so they won't actually access the file system
  });

  it('uploads image successfully', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    const mockImage = {
      id: 'image-1',
      user_id: 'user-1',
      image_url: '/uploads/test-uuid.jpg',
      thumbnail_url: '/uploads/test-uuid.jpg',
      file_name: 'test.jpg',
      file_size: mockFile.size,
      mime_type: 'image/jpeg',
      created_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ group_id: '00000000-0000-0000-0000-000000000001' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [mockImage] }) // Insert image
      .mockResolvedValueOnce({ rowCount: 1 }); // Insert share

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id', 'image-1');
    expect(data).toHaveProperty('imageUrl', '/uploads/test-uuid.jpg');
    expect(data).toHaveProperty('fileName', 'test.jpg');
  });

  it('rejects when no file provided', async () => {
    const formData = new FormData();
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('File is required');
  });

  it('rejects invalid file type', async () => {
    const mockFile = createMockFile('test.pdf', 'application/pdf', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain('Invalid file type');
  });

  it('rejects file exceeding size limit', async () => {
    // Create a file larger than 10MB
    const mockFile = createMockFile('large.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain('File size exceeds maximum');
  });

  it('rejects when user is not a member of group', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Not a member

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('not a member');
  });

  it('rejects invalid group IDs format', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', 'invalid-json');

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid group IDs format');
  });

  it('creates uploads directory if it does not exist', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    const mockImage = {
      id: 'image-1',
      user_id: 'user-1',
      image_url: '/uploads/test-uuid.jpg',
      thumbnail_url: '/uploads/test-uuid.jpg',
      file_name: 'test.jpg',
      file_size: mockFile.size,
      mime_type: 'image/jpeg',
      created_at: '2024-01-01',
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (existsSync as jest.Mock).mockReturnValue(false); // Directory doesn't exist
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ group_id: '00000000-0000-0000-0000-000000000001' }] }) // Check membership
      .mockResolvedValueOnce({ rows: [mockImage] }) // Insert image
      .mockResolvedValueOnce({ rowCount: 1 }); // Insert share

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id', 'image-1');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
    const formData = new FormData();
    formData.append('file', mockFile);

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
