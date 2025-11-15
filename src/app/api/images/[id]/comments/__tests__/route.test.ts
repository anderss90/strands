import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';

// Mock the middleware and db
jest.mock('@/lib/middleware', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('GET /api/images/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns comments list when authenticated and has access', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        image_id: 'image-1',
        user_id: 'user-1',
        content: 'First comment',
        created_at: '2024-01-01T00:00:00Z',
        username: 'user1',
        display_name: 'User One',
        profile_picture_url: null,
      },
      {
        id: 'comment-2',
        image_id: 'image-1',
        user_id: 'user-2',
        content: 'Second comment',
        created_at: '2024-01-02T00:00:00Z',
        username: 'user2',
        display_name: 'User Two',
        profile_picture_url: null,
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // Access check
      .mockResolvedValueOnce({ rows: mockComments }); // Get comments

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('comments');
    expect(Array.isArray(data.comments)).toBe(true);
    expect(data.comments.length).toBe(2);
    expect(data.comments[0]).toHaveProperty('id', 'comment-1');
    expect(data.comments[0]).toHaveProperty('content', 'First comment');
    expect(data.comments[0]).toHaveProperty('user');
    expect(data.comments[0].user).toHaveProperty('username', 'user1');
    expect(data.comments[0].user).toHaveProperty('displayName', 'User One');
    // Comments should be ordered by created_at ASC (oldest first)
    expect(data.comments[0].createdAt).toBe('2024-01-01T00:00:00Z');
    expect(data.comments[1].createdAt).toBe('2024-01-02T00:00:00Z');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'image-1' } });

    expect(response.status).toBe(401);
  });

  it('returns 404 when image not found or access denied', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Access check fails

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('message', 'Image not found or access denied');
  });

  it('returns empty comments array when no comments exist', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // Access check
      .mockResolvedValueOnce({ rows: [] }); // No comments

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'GET',
    });

    const response = await GET(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('comments');
    expect(Array.isArray(data.comments)).toBe(true);
    expect(data.comments.length).toBe(0);
  });
});

describe('POST /api/images/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a comment when authenticated and has access', async () => {
    const mockComment = {
      id: 'comment-1',
      image_id: 'image-1',
      user_id: 'user-1',
      content: 'Test comment',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // Access check
      .mockResolvedValueOnce({ rows: [mockComment] }) // Create comment
      .mockResolvedValueOnce({ rows: [mockUser] }); // Get user

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test comment' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id', 'comment-1');
    expect(data).toHaveProperty('content', 'Test comment');
    expect(data).toHaveProperty('imageId', 'image-1');
    expect(data).toHaveProperty('userId', 'user-1');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('username', 'testuser');
    expect(data.user).toHaveProperty('displayName', 'Test User');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test comment' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });

    expect(response.status).toBe(401);
  });

  it('returns 404 when image not found or access denied', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Access check fails

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test comment' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('message', 'Image not found or access denied');
  });

  it('returns 400 when content is missing', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // Access check

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('message', 'Comment content is required');
  });

  it('returns 400 when content is empty', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // Access check

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('message', 'Comment content cannot be empty');
  });

  it('returns 400 when content exceeds 1000 characters', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // Access check

    const longContent = 'a'.repeat(1001);
    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: longContent }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('message', 'Comment content must be 1000 characters or less');
  });

  it('returns 400 when request body is invalid JSON', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // Access check

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('message', 'Invalid request body');
  });

  it('trims whitespace from comment content', async () => {
    const mockComment = {
      id: 'comment-1',
      image_id: 'image-1',
      user_id: 'user-1',
      content: 'Test comment',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      display_name: 'Test User',
      profile_picture_url: null,
    };

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ 1: 1 }] }) // Access check
      .mockResolvedValueOnce({ rows: [mockComment] }) // Create comment
      .mockResolvedValueOnce({ rows: [mockUser] }); // Get user

    const request = new NextRequest('http://localhost/api/images/image-1/comments', {
      method: 'POST',
      body: JSON.stringify({ content: '  Test comment  ' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, { params: { id: 'image-1' } });

    expect(response.status).toBe(201);
    // Verify that the trimmed content was saved
    expect((query as jest.Mock).mock.calls[1][1][2]).toBe('Test comment');
  });
});

