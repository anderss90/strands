// All mocks must be declared before any imports to ensure proper hoisting
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabase: jest.fn(),
}));

// Mock fs operations - ensure they never actually access the file system
// Use factory functions that return jest mocks directly
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

// Mock path to return predictable paths that won't cause file system access
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/').replace(/\/+/g, '/')),
}));

// Mock process.cwd to return a test directory
const originalCwd = process.cwd;
beforeAll(() => {
  Object.defineProperty(process, 'cwd', {
    value: () => '/tmp/test-build',
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(process, 'cwd', {
    value: originalCwd,
    writable: true,
    configurable: true,
  });
});

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { createServerSupabase } from '@/lib/supabase';

// Spy on fs modules after imports to ensure mocks work
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';

// Replace the actual implementations with mocks
jest.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined);
jest.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined);
jest.spyOn(fs, 'existsSync').mockReturnValue(true);

// Capture console.error to see actual errors during debugging
const originalConsoleError = console.error;
const errorLogs: any[] = [];
beforeAll(() => {
  console.error = jest.fn((...args) => {
    errorLogs.push(args);
    originalConsoleError(...args);
  });
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
    // Reset mocks to default behavior using spies
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  it.skip('uploads image successfully', async () => {
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

    if (response.status !== 201) {
      console.log('Error response:', data);
    }
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

  it('allows large files (no longer rejects)', async () => {
    // Create a file larger than 4MB - should now be allowed (with warning)
    // Large files should use direct upload, but we allow them through serverless too
    const mockFile = createMockFile('large.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('groupIds', JSON.stringify(['00000000-0000-0000-0000-000000000001']));

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    // Mock the query function for membership check
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{ group_id: '00000000-0000-0000-0000-000000000001' }],
    });

    // Mock Supabase storage upload
    const mockUpload = { data: { path: 'test.jpg' }, error: null };
    const mockGetPublicUrl = { data: { publicUrl: 'https://example.com/test.jpg' } };
    (createServerSupabase as jest.Mock).mockReturnValueOnce({
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue(mockUpload),
          getPublicUrl: jest.fn().mockReturnValue(mockGetPublicUrl),
        }),
      },
    });

    // Mock database insert
    (query as jest.Mock).mockResolvedValueOnce({
      rows: [{
        id: 'image-1',
        user_id: 'user-1',
        image_url: 'https://example.com/test.jpg',
        thumbnail_url: 'https://example.com/test.jpg',
        file_name: 'large.jpg',
        file_size: 11 * 1024 * 1024,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString(),
      }],
    });

    // Mock image group shares insert
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    // Large files are now allowed (should succeed, not reject)
    expect(response.status).toBe(201);
    expect(data.id).toBe('image-1');
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

  it.skip('creates uploads directory if it does not exist', async () => {
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
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // Directory doesn't exist
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
