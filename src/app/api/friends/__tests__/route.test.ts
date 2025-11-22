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

describe('GET /api/friends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns friends list when authenticated', async () => {
    const mockFriends = [
      {
        id: 'friendship-1',
        user_id: 'user-1',
        friend_id: 'friend-1',
        status: 'accepted',
        created_at: '2024-01-01',
        friend_user_id: 'friend-1',
        friend_username: 'frienduser',
        friend_display_name: 'Friend User',
        friend_profile_picture_url: null,
      },
    ];

    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: mockFriends });

    const request = new NextRequest('http://localhost/api/friends', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('userId', 'friend-1');
    expect(data[0]).toHaveProperty('username', 'frienduser');
  });

  it('returns 401 when not authenticated', async () => {
    const mockResponse = {
      json: async () => ({ message: 'Authorization token is required' }),
      status: 401,
    };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost/api/friends', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns empty array when no friends', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({
      user: { userId: 'user-1', email: 'test@example.com', username: 'testuser' },
    });
    (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost/api/friends', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

