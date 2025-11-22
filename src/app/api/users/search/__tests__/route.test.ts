import { GET } from '../route';
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

describe('GET /api/users/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns search results when authenticated', async () => {
    const mockUsers = [
      {
        id: 'user-2',
        email: 'user2@example.com',
        username: 'user2',
        display_name: 'User Two',
        profile_picture_url: null,
        created_at: '2024-01-01',
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

    const url = new URL('http://localhost/api/users/search');
    url.searchParams.set('q', 'user2');
    const request = new NextRequest(url.toString(), {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('id', 'user-2');
    expect(data[0]).toHaveProperty('username', 'user2');
  });

  it('excludes current user from results', async () => {
    const mockUsers = [
      {
        id: 'user-2',
        email: 'user2@example.com',
        username: 'user2',
        display_name: 'User Two',
        profile_picture_url: null,
        created_at: '2024-01-01',
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: mockUsers });

    const url = new URL('http://localhost/api/users/search');
    url.searchParams.set('q', 'user');
    const request = new NextRequest(url.toString(), {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Verify query was called with user-1 excluded
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('id !='),
      expect.arrayContaining([expect.stringContaining('user'), 'user-1'])
    );
  });

  it('returns 400 when search query is missing', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });

    const request = new NextRequest('http://localhost/api/users/search', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Search query is required');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const url = new URL('http://localhost/api/users/search');
    url.searchParams.set('q', 'user');
    const request = new NextRequest(url.toString(), {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns empty array when no results', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const url = new URL('http://localhost/api/users/search');
    url.searchParams.set('q', 'nonexistent');
    const request = new NextRequest(url.toString(), {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

